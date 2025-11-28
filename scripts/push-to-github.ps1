# Script para subir cambios a GitHub sin usar Git CLI
# Usando GitHub API directamente

# IMPORTANTE: Necesitas tener un Personal Access Token de GitHub
# Ve a: https://github.com/settings/tokens
# Crea un token con permisos: repo, workflow
# Copia el token y reemplázalo en: $githubToken = "TU_TOKEN_AQUI"

$githubToken = "TU_TOKEN_AQUI"  # ← REEMPLAZA CON TU TOKEN
$repoOwner = "rpillasagua"
$repoName = "Analisis_Descongelado"
$branch = "main"
$commitMessage = "feat: implement Dark Glass Design System + fix mobile layout bug

- Integrate Dark Glass Design System across all pages (login, dashboard, forms)
- Fix critical mobile layout overflow issue in PhotoCapture component
- Update global theme colors (cyan #06b6d4)
- Add glass-card effects to all components
- Update all UI components styling
- Move demo files to _examples folder
- Resolve all TypeScript compilation errors

BREAKING CHANGE: Visual redesign - old gray/blue theme replaced with Dark Glass Industrial theme"

Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host "  SUBIENDO CAMBIOS A GITHUB SIN GIT CLI"
Write-Host "═══════════════════════════════════════════════════════════════"
Write-Host ""

# Función para hacer llamadas a GitHub API
function Invoke-GitHubAPI {
    param(
        [string]$Method,
        [string]$Endpoint,
        [object]$Body
    )
    
    $headers = @{
        "Authorization" = "token $githubToken"
        "Accept" = "application/vnd.github.v3+json"
    }
    
    $uri = "https://api.github.com$endpoint"
    
    if ($Body) {
        $Body = $Body | ConvertTo-Json -Depth 10
        Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers -Body $Body
    } else {
        Invoke-RestMethod -Uri $uri -Method $Method -Headers $headers
    }
}

Write-Host "PASO 1: Verificando que tienes un token válido..."
try {
    $user = Invoke-GitHubAPI -Method Get -Endpoint "/user"
    Write-Host "✅ Token válido. Usuario: $($user.login)"
} catch {
    Write-Host "❌ Token inválido. Por favor:"
    Write-Host "   1. Ve a https://github.com/settings/tokens"
    Write-Host "   2. Crea un Personal Access Token (permisos: repo, workflow)"
    Write-Host "   3. Reemplaza TU_TOKEN_AQUI en este script"
    exit 1
}

Write-Host ""
Write-Host "PASO 2: Obteniendo información del repositorio..."
$repo = Invoke-GitHubAPI -Method Get -Endpoint "/repos/$repoOwner/$repoName"
Write-Host "✅ Repositorio: $($repo.full_name)"
Write-Host "✅ URL: $($repo.html_url)"

Write-Host ""
Write-Host "NOTA: Esta es una alternativa cuando Git CLI no está disponible."
Write-Host "      Para una experiencia completa, instala Git desde:"
Write-Host "      https://git-scm.com/download/win"
Write-Host ""
Write-Host "      O usa GitHub Desktop:"
Write-Host "      https://desktop.github.com/"
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════════"
