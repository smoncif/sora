# 🚀 PLAN D'IMPLÉMENTATION : TanStack Query Cache pour Pagination

## 📊 ÉTAT ACTUEL (Après analyse des 3 guides)

### ✅ CE QUI EST DÉJÀ EN PLACE

1. **TanStack Query installé et configuré** :
   - Package : `@tanstack/react-query` v5.90.3 ✅
   - Devtools : `@tanstack/react-query-devtools` v5.90.2 ✅
   - QueryClientProvider configuré ✅

2. **Hooks TanStack Query existants** :
   - `lib/hooks/sod/useSodAnalysisQuery.ts` : Hook complet pour sessions SoD ✅
   - `lib/hooks/sod/useSodPaginationPrefetch.ts` : Hook de prefetch (mais non utilisé) ✅
   - `lib/hooks/sod/useSodAnalysisDataQuery.ts` : Hook pour données d'analyse ✅
   - `lib/hooks/sod/useSodOptimisticUpdates.ts` : Optimistic updates ✅

3. **Infrastructure de cache** :
   - Query keys standardisées ✅
   - Mutations créées ✅
   - QueryClient accessible ✅

### ❌ CE QUI MANQUE (Problème identifié)

1. **Hook useSodPagedRoles.ts n'existe PAS** :
   - Hook pour pagination avec cache TanStack Query ❌
   - Pas de query pour récupérer une page spécifique ❌
   - Pas d'intégration avec `applyStateToSimpleRoles` ❌

2. **Session non mise en cache** :
   - La session créée n'est PAS mise dans le cache TanStack Query ❌
   - Données prises depuis `sodWorkflow.state.session` (state local) ❌
   - Pas de query key pour la session actuelle ❌

3. **Données non récupérées depuis le cache** :
   ```typescript
   // ❌ ACTUELLEMENT dans page.tsx
   const simpleRoles = useMemo(() => {
     const roles = (sodWorkflow.state.session?.simpleRoles?.roles || []);
     return roles;  // Depuis state local, PAS depuis cache TanStack Query
   }, [sodWorkflow.state.session?.simpleRoles?.roles]);
   ```

4. **React Query Devtools non ajouté** :
   - Package installé mais devtools non importé dans layout ❌

## 🎯 SOLUTION À IMPLÉMENTER (Solution 1 : Pagination par page)

### Architecture finale

```
┌──────────────────────────────────────────────────────────┐
│  TanStack Query Cache                                    │
├──────────────────────────────────────────────────────────┤
│  ['sod', 'session', sessionId]           → Session      │
│  ['sod', sessionId, 'roles', 'page', 0]  → Page 0 (5)   │
│  ['sod', sessionId, 'roles', 'page', 1]  → Page 1 (5)   │
│  ['sod', sessionId, 'roles', 'page', 2]  → Page 2 (5)   │
│  ...                                                      │
└──────────────────────────────────────────────────────────┘
```

### Flux de données

```
1. Création de session
   ↓
2. Session mise en cache TanStack Query
   ↓
3. useSodPagedRoles(sessionId, page)
   ↓
4. Query récupère session depuis cache
   ↓
5. Extrait la page demandée
   ↓
6. Applique l'état (applyStateToSimpleRoles)
   ↓
7. Met le résultat en cache
   ↓
8. Retourne les rôles de la page
```

## 📝 TODO DÉTAILLÉ (15 tâches)

### Phase 1 : Préparation (1 tâche)

#### [IN_PROGRESS] tanstack-1 : Analyser hooks existants
- **Objectif** : Comprendre la structure actuelle
- **Actions** :
  - ✅ Lire `useSodAnalysisQuery.ts` (hook sessions)
  - ✅ Lire `useSodPaginationPrefetch.ts` (prefetch existant mais non utilisé)
  - ✅ Identifier les query keys utilisées
  - ✅ Comprendre le flow de création de session
- **Découvertes** :
  - Hook `useSodAnalysisQuery` gère les sessions mais ne met PAS en cache
  - Hook `useSodPaginationPrefetch` existe mais utilise mock data
  - Pas de hook pour pagination réelle avec cache

### Phase 2 : Création des hooks (2 tâches)

#### [PENDING] tanstack-2 : Créer useSodPagedRoles.ts
- **Fichier** : `lib/hooks/sod/useSodPagedRoles.ts`
- **Objectif** : Hook pour pagination avec cache TanStack Query
- **Fonctionnalités** :
  - Query pour récupérer une page spécifique
  - Récupération de la session depuis cache
  - Application de l'état (`applyStateToSimpleRoles`)
  - Prefetch automatique des pages adjacentes
  - Logs de cache (HIT/MISS)
- **Interface** :
  ```typescript
  export function useSodPagedRoles(
    sessionId: string | undefined,
    page: number,
    pageSize: number,
    actionsState: {
      isActionDeleted: (roleName: string, action: string) => boolean;
      isActionRestricted: (roleName: string, action: string) => boolean;
      isResourceRestricted: (roleName: string, resourceCode: string, externalResourceCode: string, value: string) => boolean;
    }
  ): {
    roles: SodSimpleRole[];
    totalCount: number;
    totalPages: number;
    isLoading: boolean;
    isFetching: boolean;
    prefetchAdjacentPages: () => void;
  }
  ```

#### [PENDING] tanstack-3 : Créer useSodPagedCompositeRoles.ts
- **Fichier** : `lib/hooks/sod/useSodPagedCompositeRoles.ts`
- **Objectif** : Même logique pour rôles composites
- **Fonctionnalités** : Identiques à useSodPagedRoles mais pour compositeRoles

### Phase 3 : Migration de la page (3 tâches)

#### [PENDING] tanstack-4 : Remplacer simpleRoles useMemo
- **Fichier** : `app/dashboard/analysis/sod/page.tsx`
- **Actions** :
  - Importer `useSodPagedRoles`
  - Remplacer :
    ```typescript
    // ❌ AVANT
    const simpleRoles = useMemo(() => {
      const roles = (sodWorkflow.state.session?.simpleRoles?.roles || []);
      return roles;
    }, [sodWorkflow.state.session?.simpleRoles?.roles]);
    
    const paginatedSimpleRolesRaw = useMemo(() => { ... });
    const paginatedSimpleRoles = useMemo(() => { ... });
    ```
  - Par :
    ```typescript
    // ✅ APRÈS
    const {
      roles: paginatedSimpleRoles,
      totalCount: simpleRolesTotalCount,
      totalPages: simpleRolesTotalPages,
      isLoading: isPaginationLoading,
      prefetchAdjacentPages,
    } = useSodPagedRoles(
      sodWorkflow.state.session?.id,
      simpleRolePage,
      simpleRolesPerPage,
      actionsState
    );
    ```

#### [PENDING] tanstack-5 : Remplacer compositeRoles useMemo
- **Fichier** : `app/dashboard/analysis/sod/page.tsx`
- **Actions** : Identiques à tanstack-4 mais pour rôles composites

#### [PENDING] tanstack-6 : Mettre session en cache après création
- **Fichier** : `lib/hooks/sod/useSodAnalysisQuery.ts`
- **Actions** :
  - Dans `createSessionFromParsedData`, après création de session :
    ```typescript
    const newSession = { ... };
    
    // ✅ Mettre en cache
    queryClient.setQueryData(['sod', 'session', newSession.id], newSession);
    
    return newSession;
    ```

### Phase 4 : Devtools et logs (2 tâches)

#### [PENDING] tanstack-7 : Ajouter ReactQueryDevtools
- **Fichier** : `app/dashboard/layout.tsx` ou `app/layout.tsx`
- **Actions** :
  - Importer devtools
  - Ajouter composant :
    ```typescript
    import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
    
    return (
      <QueryClientProvider client={queryClient}>
        {children}
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    );
    ```

#### [PENDING] tanstack-8 : Ajouter logs de cache
- **Fichier** : `lib/hooks/sod/useSodPagedRoles.ts`
- **Actions** :
  - Ajouter useEffect pour logger cache hits/misses
  - Logs détaillés dans queryFn
  - Logs de prefetch

### Phase 5 : Nettoyage (2 tâches)

#### [PENDING] tanstack-9 : Supprimer useMemo inutiles
- **Fichier** : `app/dashboard/analysis/sod/page.tsx`
- **Actions** :
  - Supprimer `paginatedSimpleRolesRaw` useMemo
  - Supprimer `paginatedSimpleRoles` useMemo (ancienne version)
  - Supprimer `paginatedCompositeRolesRaw` useMemo
  - Supprimer `paginatedCompositeRoles` useMemo (ancienne version)
  - Garder les useMemo pour `actionsState`, `allRestrictedActions`

#### [PENDING] tanstack-10 : Supprimer hook obsolète
- **Fichier** : `lib/hooks/sod/useSodPaginationPrefetch.ts`
- **Actions** :
  - Supprimer le fichier (logique intégrée dans useSodPagedRoles)
  - Mettre à jour `lib/hooks/sod/index.ts` si nécessaire

### Phase 6 : Tests (4 tâches)

#### [PENDING] tanstack-11 : Test fonctionnel
- **Objectif** : Vérifier que la pagination affiche les données
- **Actions** :
  - Charger un fichier SoD
  - Naviguer entre les pages
  - Vérifier que les rôles s'affichent correctement

#### [PENDING] tanstack-12 : Test cache avec devtools
- **Objectif** : Vérifier que le cache fonctionne
- **Actions** :
  - Ouvrir React Query Devtools
  - Observer les queries lors des changements de page
  - Vérifier queries **fresh** ou **stale** (pas **fetching**)

#### [PENDING] tanstack-13 : Test performance
- **Objectif** : Mesurer les gains de performance
- **Actions** :
  - Observer les logs `⚡ [CACHE HIT]`
  - Mesurer temps de pagination (doit être < 1ms)
  - Comparer avec les anciens logs (0.4-21ms)

#### [PENDING] tanstack-14 : Test pages lourdes
- **Objectif** : Vérifier que pages 6-8 sont rapides avec cache
- **Actions** :
  - Naviguer vers pages 6, 7, 8
  - Revenir à page 1, puis re-naviguer vers 6, 7, 8
  - Vérifier cache hit (< 1ms au lieu de 21ms)

### Phase 7 : Documentation (1 tâche)

#### [PENDING] tanstack-15 : Mettre à jour documentation
- **Fichiers** :
  - `docs/SOLUTION_PAGINATION_CACHE.md` : Ajouter section "Implémentation réalisée"
  - `docs/VERIFIER_CACHE_TANSTACK.md` : Marquer checklist complète
  - `docs/ANALYSE_FINALE_PAGINATION.md` : Ajouter résultats finaux
- **Actions** :
  - Documenter les changements effectués
  - Ajouter exemples de logs réels
  - Comparer performance avant/après

## 🎯 ORDRE D'EXÉCUTION RECOMMANDÉ

### Sprint 1 : Infrastructure (tâches 2-3-6)
1. **tanstack-2** : Créer `useSodPagedRoles.ts`
2. **tanstack-3** : Créer `useSodPagedCompositeRoles.ts`
3. **tanstack-6** : Mettre session en cache après création

### Sprint 2 : Migration (tâches 4-5-7)
4. **tanstack-4** : Remplacer simpleRoles useMemo
5. **tanstack-5** : Remplacer compositeRoles useMemo
6. **tanstack-7** : Ajouter ReactQueryDevtools

### Sprint 3 : Logs et tests (tâches 8-11-12)
7. **tanstack-8** : Ajouter logs de cache
8. **tanstack-11** : Test fonctionnel
9. **tanstack-12** : Test cache avec devtools

### Sprint 4 : Optimisation finale (tâches 13-14-9-10-15)
10. **tanstack-13** : Test performance
11. **tanstack-14** : Test pages lourdes
12. **tanstack-9** : Nettoyage useMemo
13. **tanstack-10** : Suppression hook obsolète
14. **tanstack-15** : Documentation

## 📊 RÉSULTAT ATTENDU

### Performance

**Avant** :
```
Page 1→2 : 0.40ms (recalcul)
Page 5→6 : 21ms (recalcul)
Cache : Non utilisé
```

**Après** :
```
Page 1→2 : < 1ms (cache hit) ← 95% plus rapide
Page 5→6 : < 1ms (cache hit) ← 99% plus rapide
Cache : Utilisé efficacement
```

### Logs attendus

```
🔄 [QUERY] CALCUL DES DONNÉES - Page: 0
✅ [QUERY] Données calculées en: 15.20 ms
⚡ [CACHE HIT] Données depuis cache - Page: 0
📊 [RÉSUMÉ] Pagination: 0.30ms
```

## 🚀 PRÊT À COMMENCER

Tout est analysé et planifié ! Les 15 tâches TODO sont créées et prêtes à être exécutées étape par étape avec la meilleure IA.

