Write-Host "🚀 FMAE-TMS - One-Click Docker Deployment" -ForegroundColor Cyan
Write-Host "----------------------------------------"

# Check if Docker is running
docker info >$null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error: Docker is not running. Please start Docker Desktop and try again." -ForegroundColor Red
    exit
}

# Create .env.docker for the backend
Write-Host "⚙️  Configuring environment..."
if (Test-Path "backend\.env") {
    $envContent = Get-Content "backend\.env"
    $envContent = $envContent -replace "DB_HOST=.*", "DB_HOST=db"
    $envContent = $envContent -replace "DB_PASSWORD=.*", "DB_PASSWORD=Admin@FMAE2026"
    $envContent = $envContent -replace "FRONTEND_URL=.*", "FRONTEND_URL=http://localhost"
    $envContent = $envContent -replace "SOCKET_CORS=.*", "SOCKET_CORS=http://localhost"
    $envContent | Set-Content "backend\.env.docker"
}

# Aggressive Cleanup
$clearData = Read-Host "Do you want to RESET ALL DATA and start fresh? (y/n) [Highly recommended]"
if ($clearData -eq 'y') {
    Write-Host "🧹 Performing deep cleanup..."
    docker-compose -p fmae-tms-production down -v --remove-orphans 2>$null
    docker rm -f fmae-tms-db fmae-tms-backend fmae-tms-frontend fmae_tms_backend fmae_tms_frontend fmae-tms-db-prod fmae-tms-backend-prod fmae-tms-frontend-prod 2>$null
    docker volume rm fmae-tms_fmae_postgres_data_prod fmae-tms-production_fmae_postgres_data_prod fmae-tms_postgres_data fmae_tms_postgres_data 2>$null
    Write-Host "✨ Cleanup complete."
}

Write-Host "📦 Building and starting containers..."
docker-compose -p fmae-tms-production up --build -d

Write-Host "`n⏳ Waiting for backend to initialize database (this takes a moment)..."
Start-Sleep -Seconds 15

Write-Host "`n✅ Deployment Complete!" -ForegroundColor Green
Write-Host "----------------------------------------"
Write-Host "Frontend: http://localhost"
Write-Host "Backend:  http://localhost:5000/api"
Write-Host "Docs:     http://localhost:5000/api-docs"
Write-Host "----------------------------------------"
Write-Host "Default Super Admin: admin@fmae.in"
Write-Host "Password:            Admin@FMAE2026"
Write-Host "----------------------------------------"
Write-Host "Run 'docker-compose -p fmae-tms-production logs -f backend' to see logs."
