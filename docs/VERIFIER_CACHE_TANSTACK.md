# 🔍 GUIDE : Vérifier que le Cache TanStack Query Fonctionne

## 🎯 OBJECTIF

S'assurer que les données sont bien récupérées du cache TanStack Query et non recalculées à chaque page.

## 📊 MÉTHODE 1 : REACT QUERY DEVTOOLS

### Installation

```bash
npm install @tanstack/react-query-devtools
```

### Configuration

```typescript
// app/layout.tsx ou app/dashboard/layout.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export default function Layout({ children }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* 🔍 Devtools TanStack Query */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

### Utilisation

1. **Ouvrir les devtools** : Cliquer sur l'icône React Query en bas à gauche
2. **Observer les queries** :
   - 🟢 **fresh** : Données fraîches, viennent du cache
   - 🟡 **stale** : Données périmées mais utilisables
   - 🔴 **fetching** : Données en cours de chargement
3. **Vérifier le cache** :
   - Changer de page
   - Si la query reste **fresh** ou **stale** → **Cache utilisé ✅**
   - Si la query passe en **fetching** → **Recalcul ❌**

## 📊 MÉTHODE 2 : LOGS PERSONNALISÉS

### Ajouter des logs dans le hook

```typescript
// lib/hooks/sod/useSodPagedRoles.ts
export function useSodPagedRoles(sessionId, page, pageSize) {
  const { data, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: ['sod', sessionId, 'roles', 'page', page, pageSize],
    queryFn: async () => {
      console.log('🔄 [QUERY] CALCUL DES DONNÉES - Page:', page);
      const startTime = performance.now();
      
      // ... calcul des données
      
      const duration = performance.now() - startTime;
      console.log('✅ [QUERY] Données calculées en:', duration.toFixed(2), 'ms');
      
      return result;
    },
    staleTime: 5 * 60 * 1000,
  });

  // 🔍 LOG : Source des données
  useEffect(() => {
    if (data) {
      if (isPlaceholderData) {
        console.log('📦 [CACHE] Données placeholder (cache vide)');
      } else if (!isFetching) {
        console.log('⚡ [CACHE HIT] Données depuis cache - Page:', page);
      } else {
        console.log('🔄 [CACHE MISS] Rechargement - Page:', page);
      }
    }
  }, [data, isPlaceholderData, isFetching, page]);

  return { roles: data?.roles || [], isLoading };
}
```

### Interpréter les logs

```
// ✅ CACHE FONCTIONNE
🔄 [QUERY] CALCUL DES DONNÉES - Page: 0
✅ [QUERY] Données calculées en: 15.20 ms
⚡ [CACHE HIT] Données depuis cache - Page: 0  ← Pas de recalcul !

// ❌ CACHE NE FONCTIONNE PAS
🔄 [QUERY] CALCUL DES DONNÉES - Page: 1
✅ [QUERY] Données calculées en: 18.50 ms
🔄 [CACHE MISS] Rechargement - Page: 1  ← Recalcul inutile !
```

## 📊 MÉTHODE 3 : NETWORK TAB (DEVTOOLS)

### Vérification

1. **Ouvrir DevTools** (F12)
2. **Onglet Network**
3. **Changer de page**
4. **Observer** :
   - ✅ **Aucune requête** : Cache TanStack Query utilisé
   - ❌ **Requêtes HTTP** : Données refetchées (normal si `staleTime` expiré)

## 📊 MÉTHODE 4 : QUERY CLIENT INSPECT

### Code de débogage

```typescript
// app/dashboard/analysis/sod/page.tsx
import { useQueryClient } from '@tanstack/react-query';

export default function SodAnalysisPage() {
  const queryClient = useQueryClient();

  // 🔍 Inspecter le cache
  const inspectCache = useCallback(() => {
    const cache = queryClient.getQueryCache();
    const allQueries = cache.getAll();

    console.log('📦 [CACHE INSPECT] Total queries:', allQueries.length);
    
    allQueries.forEach((query) => {
      console.log('🔍 Query:', {
        key: query.queryKey,
        state: query.state.status,
        isFetching: query.state.isFetching,
        dataUpdatedAt: new Date(query.state.dataUpdatedAt).toISOString(),
        data: query.state.data ? 'Present' : 'Empty',
      });
    });

    // Inspecter une query spécifique
    const sessionId = sodWorkflow.state.session?.id;
    if (sessionId) {
      const pageQuery = queryClient.getQueryData(['sod', sessionId, 'roles', 'page', simpleRolePage, simpleRolesPerPage]);
      console.log('📊 [CACHE] Page actuelle:', pageQuery ? 'CACHED ✅' : 'NOT CACHED ❌');
    }
  }, [queryClient, simpleRolePage, simpleRolesPerPage]);

  return (
    <Box>
      {/* Bouton de débogage */}
      <Button onClick={inspectCache}>🔍 Inspecter Cache</Button>
      
      {/* ... reste du composant */}
    </Box>
  );
}
```

## 🎯 INDICATEURS DE SUCCÈS

### ✅ Le cache fonctionne si :

1. **Devtools TanStack Query** :
   - Queries restent **fresh** ou **stale**
   - Pas de **fetching** au changement de page

2. **Logs personnalisés** :
   - `⚡ [CACHE HIT]` apparaît
   - Pas de `🔄 [QUERY] CALCUL` répété

3. **Network Tab** :
   - Aucune requête HTTP au changement de page

4. **Performance** :
   - Pagination < 1ms
   - Pas de `applyStateToSimpleRoles` recalculé

### ❌ Le cache NE fonctionne PAS si :

1. **Devtools TanStack Query** :
   - Queries passent en **fetching** à chaque page
   - Cache toujours vide

2. **Logs personnalisés** :
   - `🔄 [CACHE MISS]` à chaque page
   - `🔄 [QUERY] CALCUL` répété

3. **Network Tab** :
   - Requêtes HTTP à chaque page

4. **Performance** :
   - Pagination > 10ms
   - `applyStateToSimpleRoles` recalculé à chaque page

## 🚨 PROBLÈMES COURANTS

### Problème 1 : Query Key instable

```typescript
// ❌ MAUVAIS : Query key change à chaque render
const { data } = useQuery({
  queryKey: ['sod', { sessionId, page }], // Objet recréé !
});

// ✅ BON : Query key stable
const { data } = useQuery({
  queryKey: ['sod', sessionId, 'page', page], // Primitives stables
});
```

### Problème 2 : staleTime trop court

```typescript
// ❌ MAUVAIS : staleTime = 0 (refetch immédiat)
staleTime: 0,

// ✅ BON : staleTime suffisant
staleTime: 5 * 60 * 1000, // 5 minutes
```

### Problème 3 : Données non dans le cache

```typescript
// ❌ MAUVAIS : Données prises depuis state local
const roles = sodWorkflow.state.session?.simpleRoles?.roles;

// ✅ BON : Données prises depuis TanStack Query
const { data: roles } = useQuery({
  queryKey: ['sod', sessionId, 'roles'],
  // ...
});
```

## 🎯 CHECKLIST FINALE

- [ ] React Query Devtools installé
- [ ] Logs personnalisés ajoutés
- [ ] Query keys stables (primitives)
- [ ] staleTime configuré (5 minutes)
- [ ] gcTime configuré (10 minutes)
- [ ] Données récupérées depuis TanStack Query (pas state local)
- [ ] Prefetch des pages adjacentes
- [ ] Tests de pagination rapides (< 1ms)
- [ ] Aucun recalcul visible dans les logs
- [ ] Cache inspecté via `queryClient.getQueryData()`

## 🚀 RÉSULTAT ATTENDU

Après implémentation correcte :

```
// Page 1 → Page 2
⚡ [CACHE HIT] Données depuis cache - Page: 1
📊 [RÉSUMÉ] Pagination: 0.30ms
✅ Aucun recalcul

// Page 2 → Page 3
⚡ [CACHE HIT] Données depuis cache - Page: 2
📊 [RÉSUMÉ] Pagination: 0.20ms
✅ Aucun recalcul

// Page 6 (beaucoup de données)
⚡ [CACHE HIT] Données depuis cache - Page: 6
📊 [RÉSUMÉ] Pagination: 0.40ms
✅ Aucun recalcul (même pour pages lourdes !)
```

