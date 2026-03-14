# Codex CLI local invocation report

This report summarizes local ways to invoke Codex CLI and adjacent SDK/API options, and links to the full documentation set saved in this folder.

## Full documentation links
- https://openai.com/codex/
- https://openai.com/codex/get-started/
- https://openai.com/index/introducing-codex/
- https://openai.com/index/codex-now-generally-available/
- https://openai.com/index/introducing-the-codex-app/
- https://openai.com/index/introducing-gpt-5-3-codex/
- https://openai.com/index/o3-o4-mini-codex-system-card-addendum/
- https://platform.openai.com/docs/codex
- https://platform.openai.com/docs/codex/overview
- https://platform.openai.com/docs/codex/agent-network
- https://platform.openai.com/docs/docs-mcp
- https://platform.openai.com/docs/guides/code-generation
- https://platform.openai.com/docs/models/gpt-5-codex
- https://platform.openai.com/docs/models/gpt-5.1-codex
- https://platform.openai.com/docs/models/gpt-5.2-codex
- https://platform.openai.com/docs/pricing/
- https://help.openai.com/en/articles/11096431-openai-codex-ligetting-started
- https://help.openai.com/en/articles/11369540-using-codex-with-your-chatgpt-plan/

## End-to-end ways to invoke Codex locally

1) Direct CLI (interactive)
- Install CLI: npm i -g @openai/codex
- Set OPENAI_API_KEY and run: codex
- Use /mode to switch between suggest, auto-edit, and full-auto

2) Direct CLI (non-interactive / automation)
- Use command flags for tasks and mode control (same modes as above)
- Use shell scripts to orchestrate multiple codex runs
- Use codex --upgrade to update the CLI

3) CLI invoked from code (local process)
- Spawn the codex CLI from your app (Python subprocess, Node child_process, PowerShell Start-Process)
- Capture stdout/stderr and exit codes for automation

4) Codex SDK (officially announced)
- Codex GA announcement references a Codex SDK for embedding agent workflows
- Consult the linked docs for availability and API surface

5) OpenAI API (Responses API + Codex models)
- Use Codex models via the Responses API for code generation and tool-using flows
- Build your own wrapper or service that replicates CLI behavior

6) Codex app / web / IDE delegation (adjacent but not CLI)
- Web and app experiences can delegate tasks to Codex in cloud sandboxes
- IDE and chat-based entry points delegate tasks to cloud sandboxes

7) Docs MCP (adjacent, for local doc lookup)
- Codex CLI can connect to OpenAI Docs MCP for read-only documentation search

## Notes
- Items (3) are general OS process patterns; consult your runtime documentation.
- The official SDK entry is referenced in the Codex GA announcement; check docs for concrete APIs.
