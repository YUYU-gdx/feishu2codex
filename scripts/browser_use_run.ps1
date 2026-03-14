$env:PYTHONIOENCODING = "utf-8"

Write-Host "[browser-use] Ensuring port patch is applied..."
python "$PSScriptRoot\\browser_use_patch.py" | Write-Host

Write-Host "[browser-use] Starting chromium session..."
browser-use --browser chromium @args
