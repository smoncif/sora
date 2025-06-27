# Script de déploiement automatisé pour Vercel
# Usage: .\scripts\deploy.ps1

Write-Host "🚀 Préparation du déploiement Sora sur Vercel..." -ForegroundColor Green

# Vérifier si nous sommes dans le bon répertoire
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Erreur: Ce script doit être exécuté depuis la racine du projet" -ForegroundColor Red
    exit 1
}

# 1. Vérifier les dépendances
Write-Host "📦 Vérification des dépendances..." -ForegroundColor Yellow
npm ci

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de l'installation des dépendances" -ForegroundColor Red
    exit 1
}

# 2. Construire l'application
Write-Host "🔨 Construction de l'application..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Erreur lors de la construction" -ForegroundColor Red
    exit 1
}

# 3. Vérifier si Vercel CLI est installé
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "📥 Installation de Vercel CLI..." -ForegroundColor Yellow
    npm install -g vercel
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Erreur lors de l'installation de Vercel CLI" -ForegroundColor Red
        exit 1
    }
}

# 4. Déployer sur Vercel
Write-Host "🌐 Déploiement sur Vercel..." -ForegroundColor Yellow
Write-Host "Note: Si c'est votre première fois, Vercel vous demandera de vous connecter" -ForegroundColor Cyan

vercel --prod

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Déploiement terminé avec succès!" -ForegroundColor Green
    Write-Host "🔗 Votre application est maintenant disponible sur Vercel" -ForegroundColor Green
} else {
    Write-Host "❌ Erreur lors du déploiement" -ForegroundColor Red
    Write-Host "💡 Conseils de dépannage:" -ForegroundColor Yellow
    Write-Host "  1. Vérifiez vos variables d'environnement sur vercel.com" -ForegroundColor Cyan
    Write-Host "  2. Assurez-vous que votre projet Supabase est configuré" -ForegroundColor Cyan
    Write-Host "  3. Consultez les logs avec: vercel logs" -ForegroundColor Cyan
    exit 1
} 