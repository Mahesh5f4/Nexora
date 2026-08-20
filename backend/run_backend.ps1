Get-Content .env | Where-Object { $_ -match '^([^#=]+)=(.*)$' } | ForEach-Object {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
}
[Environment]::SetEnvironmentVariable("SPRING_DATASOURCE_URL", "jdbc:postgresql://localhost:5432/nexora", "Process")
[Environment]::SetEnvironmentVariable("SPRING_REDIS_URL", "redis://localhost:6379", "Process")
[Environment]::SetEnvironmentVariable("AI_SERVICE_URL", "http://127.0.0.1:8002", "Process")
[Environment]::SetEnvironmentVariable("AI_INTERNAL_TOKEN", "super-secret-dev-token", "Process")


.\mvnw.cmd spring-boot:run -pl auth-service
