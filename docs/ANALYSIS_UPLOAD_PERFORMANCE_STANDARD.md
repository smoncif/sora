# Standard Upload Performance (Analysis)

Ce document définit le standard à appliquer pour les uploads volumineux sur les modules `analysis` (rôles métier et utilisateurs), sans impacter SoD.

## Scope

- Inclus:
  - `app/dashboard/analysis/roles`
  - `app/dashboard/analysis/users`
  - `lib/hooks/analysis/*`
  - `lib/components/analysis/*`
- Exclu:
  - `app/dashboard/analysis/sod/*`
  - `lib/hooks/sod/*`
  - `lib/components/sod/*`

## Règles techniques obligatoires

1. **Limite stricte fichier**
   - Refuser tout fichier Excel `> 50MB`.
   - Afficher un message explicite côté UI et côté parsing.

2. **Parsing hors thread UI**
   - Parsing Excel exécuté dans un Web Worker.
   - Contrat minimal worker:
     - `PROGRESS`
     - `COMPLETE`
     - `ERROR`
     - `CANCELLED`

3. **État d’ingestion standardisé**
   - Utiliser une mutation TanStack Query pour l’ingestion/parsing.
   - Garder une progression utilisateur continue (`0 -> 100`).

4. **Parité métier stricte**
   - Aucune modification de règles fonctionnelles (validations, warnings, erreurs métier).
   - Le worker doit reproduire le comportement attendu de l’existant.

5. **Pagination**
   - Pagination obligatoire sur les écrans résultats volumineux.
   - Convention: stocker la page en interne en `0-based`; adapter le composant UI au format attendu.

## Checklist non-régression (manuelle)

### Upload rôles métier

- Import d’un fichier valide `< 50MB`:
  - Progression visible pendant tout le traitement.
  - Résultats affichés correctement.
  - Pagination fonctionnelle (navigation page suivante/précédente).
- Import d’un fichier `> 50MB`:
  - Upload refusé avec message clair.
- Fichier invalide (colonnes/feuilles manquantes):
  - Erreur métier cohérente avec l’existant.

### Upload utilisateurs

- Import d’un fichier valide `< 50MB`:
  - Progression visible.
  - Mapping utilisateur/transactions conforme.
  - Pagination fonctionnelle.
- Import d’un fichier `> 50MB`:
  - Upload refusé avec message clair.
- Fichier invalide:
  - Erreurs métier cohérentes avec l’existant.

### Régression transverse

- Aucune régression sur SoD (aucun fichier SoD modifié).
- Lint sans erreurs sur fichiers modifiés.
- Le workflow `saved` / `resume` reste opérationnel.

## Fichiers de référence implémentés

- `lib/workers/analysisParsing.worker.ts`
- `lib/hooks/analysis/useAnalysisExcelParserWorker.ts`
- `lib/hooks/analysis/useAnalysisFileManager.ts`
- `lib/components/analysis/ParsingProgress/AnalysisParsingProgress.tsx`
- `lib/components/analysis/ResultsSection/ResultsSection.tsx`
