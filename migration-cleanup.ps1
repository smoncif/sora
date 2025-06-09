# Script de nettoyage architectural - Suppression des dossiers obsolètes
# EXPERT RECOMMANDATION - 30 ans d'expérience

Write-Host "🚀 MIGRATION ARCHITECTURALE - PHASE 1: SUPPRESSION" -ForegroundColor Green

# Vérifier qu'on est dans le bon répertoire
if (-not (Test-Path "app")) {
    Write-Host "❌ Erreur: Dossier 'app' non trouvé. Exécuter depuis la racine du projet." -ForegroundColor Red
    exit 1
}

Write-Host "📋 Dossiers à supprimer identifiés:" -ForegroundColor Yellow

# Dossiers de pages minimales (wrapper inutiles)
$foldersToRemove = @(
    "app\login",
    "app\register", 
    "app\reset-password",
    "app\unauthorized",
    "app\access-denied"
)

# Dossiers à déplacer (anti-pattern Next.js 13+)
$foldersToMove = @(
    "app\components",
    "app\services", 
    "app\types",
    "app\utils",
    "app\hooks",
    "app\contexts"
)

# Afficher ce qui sera supprimé
foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Write-Host "  ❌ $folder (page wrapper inutile)" -ForegroundColor Red
    }
}

# Afficher ce qui sera déplacé  
foreach ($folder in $foldersToMove) {
    if (Test-Path $folder) {
        Write-Host "  🔄 $folder (à déplacer vers racine)" -ForegroundColor Blue
    }
}

# Demander confirmation
$confirmation = Read-Host "`n⚠️  Confirmer la suppression/déplacement? (y/N)"
if ($confirmation -ne 'y' -and $confirmation -ne 'Y') {
    Write-Host "❌ Migration annulée." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n🗑️  Suppression des pages wrapper..." -ForegroundColor Yellow

# Supprimer les dossiers de pages wrapper
foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Remove-Item -Path $folder -Recurse -Force
        Write-Host "  ✅ Supprimé: $folder" -ForegroundColor Green
    }
}

Write-Host "`n📦 Déplacement vers structure Next.js 13+ ..." -ForegroundColor Yellow

# Créer les dossiers de destination s'ils n'existent pas
$rootFolders = @("components", "lib", "types")
foreach ($folder in $rootFolders) {
    if (-not (Test-Path $folder)) {
        New-Item -ItemType Directory -Path $folder
        Write-Host "  📁 Créé: $folder/" -ForegroundColor Green
    }
}

# Déplacer app/components vers components/
if (Test-Path "app\components") {
    Move-Item -Path "app\components\*" -Destination "components\" -Force
    Remove-Item -Path "app\components" -Recurse -Force
    Write-Host "  ✅ Déplacé: app\components → components\" -ForegroundColor Green
}

# Déplacer app/services vers lib/services/
if (Test-Path "app\services") {
    if (-not (Test-Path "lib\services")) {
        New-Item -ItemType Directory -Path "lib\services" -Force
    }
    Move-Item -Path "app\services\*" -Destination "lib\services\" -Force
    Remove-Item -Path "app\services" -Recurse -Force
    Write-Host "  ✅ Déplacé: app\services → lib\services\" -ForegroundColor Green
}

# Déplacer app/types vers lib/types/
if (Test-Path "app\types") {
    if (-not (Test-Path "lib\types")) {
        New-Item -ItemType Directory -Path "lib\types" -Force
    }
    Move-Item -Path "app\types\*" -Destination "lib\types\" -Force
    Remove-Item -Path "app\types" -Recurse -Force
    Write-Host "  ✅ Déplacé: app\types → lib\types\" -ForegroundColor Green
}

# Déplacer app/utils vers lib/utils/
if (Test-Path "app\utils") {
    if (-not (Test-Path "lib\utils")) {
        New-Item -ItemType Directory -Path "lib\utils" -Force
    }
    Move-Item -Path "app\utils\*" -Destination "lib\utils\" -Force
    Remove-Item -Path "app\utils" -Recurse -Force
    Write-Host "  ✅ Déplacé: app\utils → lib\utils\" -ForegroundColor Green
}

# Déplacer app/hooks vers lib/hooks/
if (Test-Path "app\hooks") {
    if (-not (Test-Path "lib\hooks")) {
        New-Item -ItemType Directory -Path "lib\hooks" -Force
    }
    Move-Item -Path "app\hooks\*" -Destination "lib\hooks\" -Force
    Remove-Item -Path "app\hooks" -Recurse -Force
    Write-Host "  ✅ Déplacé: app\hooks → lib\hooks\" -ForegroundColor Green
}

# Déplacer app/contexts vers lib/contexts/
if (Test-Path "app\contexts") {
    if (-not (Test-Path "lib\contexts")) {
        New-Item -ItemType Directory -Path "lib\contexts" -Force
    }
    Move-Item -Path "app\contexts\*" -Destination "lib\contexts\" -Force
    Remove-Item -Path "app\contexts" -Recurse -Force
    Write-Host "  ✅ Déplacé: app\contexts → lib\contexts\" -ForegroundColor Green
}

Write-Host "`n✅ PHASE 1 TERMINÉE - Structure Next.js 13+ appliquée!" -ForegroundColor Green
Write-Host "📋 Prochaines étapes:" -ForegroundColor Yellow
Write-Host "  1. Mettre à jour les imports dans tous les fichiers" -ForegroundColor White
Write-Host "  2. Créer (auth) route group pour login/register" -ForegroundColor White  
Write-Host "  3. Fusionner les services d'export/analysis" -ForegroundColor White
Write-Host "  4. Tester que l'application compile" -ForegroundColor White 