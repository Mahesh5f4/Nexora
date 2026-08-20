Get-Content .env | Where-Object { $_ -match '^([^#=]+)=(.*)$' } | ForEach-Object {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
}
[Environment]::SetEnvironmentVariable("QDRANT_URL", "http://localhost:6333", "Process")
[Environment]::SetEnvironmentVariable("SPRING_AI_GATEWAY_URL", "http://localhost:8081", "Process")
[Environment]::SetEnvironmentVariable("AI_SERVICE_INTERNAL_TOKEN", "super-secret-dev-token", "Process")

. .\venv\Scripts\Activate.ps1
.\venv\Scripts\python.exe -m uvicorn app.main:app --port 8002
