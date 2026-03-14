import re
from pathlib import Path
import sys


def find_utils_py() -> Path:
    import browser_use

    base = Path(browser_use.__file__).resolve().parent
    return base / "skill_cli" / "utils.py"


def patch_utils(path: Path) -> bool:
    text = path.read_text(encoding="utf-8", errors="ignore")
    if "browser-use-{session}.port" in text and "_is_port_bindable" in text:
        return False

    if "import socket" not in text:
        text = text.replace("import platform\n", "import platform\nimport socket\n", 1)

    # Insert get_port_path after get_pid_path
    if "def get_port_path(session: str)" not in text:
        text = text.replace(
            "def get_pid_path(session: str) -> Path:\n\t\"\"\"Get PID file path for session.\"\"\"\n\treturn Path(tempfile.gettempdir()) / f'browser-use-{session}.pid'\n\n",
            "def get_pid_path(session: str) -> Path:\n\t\"\"\"Get PID file path for session.\"\"\"\n\treturn Path(tempfile.gettempdir()) / f'browser-use-{session}.pid'\n\n\n"
            "def get_port_path(session: str) -> Path:\n\t\"\"\"Get port file path for session (Windows TCP).\"\"\"\n\treturn Path(tempfile.gettempdir()) / f'browser-use-{session}.port'\n\n\n",
            1,
        )

    # Replace Windows port selection logic
    pattern = re.compile(
        r"if sys\.platform == 'win32':\n"
        r"\t\t# Windows: use TCP on deterministic port \(49152-65535\)\n"
        r"\t\t# Use 127\.0\.0\.1 explicitly \(not localhost\) to avoid IPv6 binding issues\n"
        r"\t\tport = 49152 \+ \(int\(hashlib\.md5\(session\.encode\(\)\)\.hexdigest\(\)\[:4\], 16\) % 16383\)\n"
        r"\t\treturn f'tcp://127\.0\.0\.1:\{port\}'",
        re.MULTILINE,
    )

    replacement = (
        "if sys.platform == 'win32':\n"
        "\t\t# Windows: use TCP on deterministic port (49152-65535)\n"
        "\t\t# Use 127.0.0.1 explicitly (not localhost) to avoid IPv6 binding issues\n"
        "\t\tport_path = get_port_path(session)\n"
        "\t\tif port_path.exists():\n"
        "\t\t\ttry:\n"
        "\t\t\t\tport = int(port_path.read_text().strip())\n"
        "\t\t\t\tif 1024 <= port <= 65535:\n"
        "\t\t\t\t\tif is_server_running(session):\n"
        "\t\t\t\t\t\treturn f'tcp://127.0.0.1:{port}'\n"
        "\t\t\t\t\tif _is_port_bindable('127.0.0.1', port):\n"
        "\t\t\t\t\t\treturn f'tcp://127.0.0.1:{port}'\n"
        "\t\t\texcept (OSError, ValueError):\n"
        "\t\t\t\tpass\n"
        "\n"
        "\t\tbase_port = 49152 + (int(hashlib.md5(session.encode()).hexdigest()[:4], 16) % 16383)\n"
        "\n"
        "\t\tif is_server_running(session):\n"
        "\t\t\treturn f'tcp://127.0.0.1:{base_port}'\n"
        "\n"
        "\t\tfor offset in range(0, 256):\n"
        "\t\t\tport = 49152 + ((base_port - 49152 + offset) % 16383)\n"
        "\t\t\tif _is_port_bindable('127.0.0.1', port):\n"
        "\t\t\t\ttry:\n"
        "\t\t\t\t\tport_path.write_text(str(port))\n"
        "\t\t\t\texcept OSError:\n"
        "\t\t\t\t\tpass\n"
        "\t\t\t\treturn f'tcp://127.0.0.1:{port}'\n"
        "\n"
        "\t\treturn f'tcp://127.0.0.1:{base_port}'"
    )

    text, count = pattern.subn(replacement, text, count=1)
    if count != 1:
        raise RuntimeError("Failed to patch get_socket_path Windows section.")

    if "_is_port_bindable" not in text:
        insert_point = text.rfind("def _pid_exists")
        if insert_point == -1:
            raise RuntimeError("Could not locate _pid_exists for insertion.")
        # Append helper near end of file
        text += (
            "\n\n"
            "def _is_port_bindable(host: str, port: int) -> bool:\n"
            "\t\"\"\"Check if a TCP port can be bound (not blocked or in use).\"\"\"\n"
            "\ttry:\n"
            "\t\twith socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:\n"
            "\t\t\tsock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)\n"
            "\t\t\tsock.bind((host, port))\n"
            "\t\t\treturn True\n"
            "\texcept OSError:\n"
            "\t\treturn False\n"
        )

    path.write_text(text, encoding="utf-8")
    return True


def main() -> int:
    utils_path = find_utils_py()
    changed = patch_utils(utils_path)
    if changed:
        print(f"Patched: {utils_path}")
    else:
        print(f"Already patched: {utils_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
