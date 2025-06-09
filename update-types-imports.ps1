# Script de mise à jour des imports types vers lib/types
# PHASE 2 - ÉTAPE 1

Write-Host "🔄 Mise à jour des imports @/types vers lib/types" -ForegroundColor Yellow

# Fonction pour remplacer les imports dans un fichier
function Update-ImportsInFile {
    param($FilePath)
    
    $content = Get-Content $FilePath -Raw -Encoding UTF8
    if ($content -match "@/types") {
        $newContent = $content -replace "@/types", "lib/types"
        Set-Content $FilePath -Value $newContent -Encoding UTF8
        Write-Host "✅ Mis à jour: $FilePath" -ForegroundColor Green
        return $true
    }
    return $false
}

# Rechercher tous les fichiers TypeScript et React
$files = Get-ChildItem -Path "app" -Include "*.ts", "*.tsx" -Recurse

$updatedCount = 0
foreach ($file in $files) {
    if (Update-ImportsInFile -FilePath $file.FullName) {
        $updatedCount++
    }
}

Write-Host "📊 Résumé: $updatedCount fichiers mis à jour" -ForegroundColor Cyan
Write-Host "🎯 Tous les imports @/types ont été remplacés par lib/types" -ForegroundColor Green 