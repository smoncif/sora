# 🚀 SOLUTION : Pagination avec Cache TanStack Query

## 🎯 OBJECTIF

Remplacer la pagination actuelle qui recalcule tout à chaque page par un système de cache intelligent avec TanStack Query.

## ❌ PROBLÈME ACTUEL

```typescript
// ❌ Données prises depuis sodWorkflow.state.session (pas de cache)
const simpleRoles = useMemo(() => {
  const roles = (sodWorkflow.state.session?.simpleRoles?.roles || []) as SodSimpleRole[];
  return roles;
}, [sodWorkflow.state.session?.simpleRoles?.roles]);

// ❌ Pagination qui recalcule tout
const paginatedSimpleRolesRaw = useMemo(() => {
  const start = simpleRolePage * simpleRolesPerPage;
  const end = start + simpleRolesPerPage;
  return simpleRoles.slice(start, end);
}, [simpleRoles, simpleRolePage, simpleRolesPerPage]);
```

**Résultat** : Chaque changement de page re-calcule `applyStateToSimpleRoles` sur les nouveaux rôles, ce qui prend 10-21ms pour les pages avec beaucoup de données.

## ✅ SOLUTION 1 : PAGINATION PAR PAGE AVEC CACHE

### Architecture

```
┌─────────────────────────────────────────────────┐
│  TanStack Query Cache                           │
├─────────────────────────────────────────────────┤
│  ['sod', sessionId, 'page', 0] → 5 rôles        │
│  ['sod', sessionId, 'page', 1] → 5 rôles        │
│  ['sod', sessionId, 'page', 2] → 5 rôles        │
│  ['sod', sessionId, 'page', 3] → 5 rôles        │
└─────────────────────────────────────────────────┘
```

### Hook personnalisé

```typescript
// lib/hooks/sod/useSodPagedRoles.ts
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

export function useSodPagedRoles(
  sessionId: string | undefined,
  page: number,
  pageSize: number = 5
) {
  const queryClient = useQueryClient();

  // 🎯 Query pour la page actuelle
  const { data, isLoading } = useQuery({
    queryKey: ['sod', sessionId, 'roles', 'page', page, pageSize],
    queryFn: async () => {
      // 1. Récupérer la session complète depuis le cache
      const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
      
      if (!session) {
        throw new Error('Session non trouvée');
      }

      // 2. Extraire la page demandée
      const allRoles = session.simpleRoles?.roles || [];
      const start = page * pageSize;
      const end = start + pageSize;
      const pageRoles = allRoles.slice(start, end);

      // 3. Appliquer l'état (une seule fois, puis mis en cache)
      const rolesWithState = applyStateToSimpleRoles(pageRoles, {
        isActionDeleted,
        isActionRestricted,
        isResourceRestricted,
      });

      return {
        roles: rolesWithState,
        totalCount: allRoles.length,
        page,
        pageSize,
        totalPages: Math.ceil(allRoles.length / pageSize),
      };
    },
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  // ⚡ Prefetch pages adjacentes
  const prefetchAdjacentPages = useMemo(() => {
    return () => {
      if (!sessionId || !data) return;

      const totalPages = data.totalPages;

      // Prefetch page suivante
      if (page + 1 < totalPages) {
        queryClient.prefetchQuery({
          queryKey: ['sod', sessionId, 'roles', 'page', page + 1, pageSize],
          queryFn: async () => {
            const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
            if (!session) return null;

            const allRoles = session.simpleRoles?.roles || [];
            const start = (page + 1) * pageSize;
            const end = start + pageSize;
            const pageRoles = allRoles.slice(start, end);

            return {
              roles: applyStateToSimpleRoles(pageRoles, {...}),
              totalCount: allRoles.length,
              page: page + 1,
              pageSize,
              totalPages: Math.ceil(allRoles.length / pageSize),
            };
          },
        });
      }

      // Prefetch page précédente
      if (page > 0) {
        queryClient.prefetchQuery({
          queryKey: ['sod', sessionId, 'roles', 'page', page - 1, pageSize],
          // ... même logique
        });
      }
    };
  }, [sessionId, page, pageSize, data, queryClient]);

  return {
    roles: data?.roles || [],
    totalCount: data?.totalCount || 0,
    totalPages: data?.totalPages || 0,
    isLoading,
    prefetchAdjacentPages,
  };
}
```

### Utilisation dans la page

```typescript
// app/dashboard/analysis/sod/page.tsx
const [simpleRolePage, setSimpleRolePage] = useState(0);
const [simpleRolesPerPage] = useState(5);

// ✅ Utiliser le hook avec cache
const {
  roles: paginatedSimpleRoles,
  totalCount: simpleRolesTotalCount,
  totalPages: simpleRolesTotalPages,
  isLoading: isPaginationLoading,
  prefetchAdjacentPages,
} = useSodPagedRoles(sodWorkflow.state.session?.id, simpleRolePage, simpleRolesPerPage);

// ⚡ Prefetch automatique au changement de page
useEffect(() => {
  prefetchAdjacentPages();
}, [simpleRolePage, prefetchAdjacentPages]);

// 📊 Pagination instantanée
const handleSimplePageChange = useCallback((event: unknown, newPage: number) => {
  console.log('🔍 [PAGINATION] Changement page:', { from: simpleRolePage, to: newPage });
  setSimpleRolePage(newPage);
  // ✅ Les données sont déjà en cache !
}, [simpleRolePage]);
```

## ✅ SOLUTION 2 : INFINITE QUERY (SCROLL TO LOAD)

Pour les pages avec beaucoup de données, utiliser `useInfiniteQuery` pour charger progressivement.

### Hook personnalisé

```typescript
// lib/hooks/sod/useSodInfiniteRoles.ts
import { useInfiniteQuery } from '@tanstack/react-query';

export function useSodInfiniteRoles(
  sessionId: string | undefined,
  pageSize: number = 10
) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ['sod', sessionId, 'roles', 'infinite'],
    queryFn: async ({ pageParam = 0 }) => {
      const session = queryClient.getQueryData<SodAnalysisSession>(['sod', 'session', sessionId]);
      
      if (!session) {
        throw new Error('Session non trouvée');
      }

      const allRoles = session.simpleRoles?.roles || [];
      const start = pageParam * pageSize;
      const end = start + pageSize;
      const pageRoles = allRoles.slice(start, end);

      // ✅ Appliquer l'état une seule fois
      const rolesWithState = applyStateToSimpleRoles(pageRoles, {...});

      return {
        roles: rolesWithState,
        nextCursor: end < allRoles.length ? pageParam + 1 : undefined,
      };
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!sessionId,
    staleTime: 5 * 60 * 1000,
  });

  // ✅ Toutes les pages chargées (aplaties)
  const allLoadedRoles = useMemo(() => {
    return data?.pages.flatMap(page => page.roles) || [];
  }, [data]);

  return {
    roles: allLoadedRoles,
    loadMore: fetchNextPage,
    hasMore: hasNextPage,
    isLoadingMore: isFetchingNextPage,
    isLoading,
  };
}
```

### Utilisation avec Intersection Observer

```typescript
// app/dashboard/analysis/sod/page.tsx
const {
  roles: allLoadedRoles,
  loadMore,
  hasMore,
  isLoadingMore,
} = useSodInfiniteRoles(sodWorkflow.state.session?.id, 10);

// ⚡ Charger plus au scroll
const observerTarget = useRef<HTMLDivElement>(null);

useEffect(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
        console.log('📥 [SCROLL] Chargement de plus de rôles...');
        loadMore();
      }
    },
    { threshold: 0.5 }
  );

  if (observerTarget.current) {
    observer.observe(observerTarget.current);
  }

  return () => observer.disconnect();
}, [hasMore, isLoadingMore, loadMore]);

// 📊 Affichage
return (
  <Box>
    {allLoadedRoles.map(role => (
      <SodSimpleRoleCard key={role.roleName} role={role} />
    ))}
    
    {/* Sentinel pour l'intersection observer */}
    <div ref={observerTarget} style={{ height: '20px' }} />
    
    {isLoadingMore && <CircularProgress />}
  </Box>
);
```

## 🎯 AVANTAGES

### Solution 1 (Pagination par page)
✅ Cache TanStack Query utilisé
✅ Prefetch automatique des pages adjacentes
✅ Pagination instantanée (0ms)
✅ Pas de recalcul d'état

### Solution 2 (Infinite Query)
✅ Chargement progressif
✅ Meilleure UX pour grandes listes
✅ Pas de pagination visible
✅ Cache TanStack Query utilisé

## 📊 PERFORMANCE ATTENDUE

**Avant** :
- Page 1→2 : 20 secondes
- Page 5→6 : 52 secondes
- Recalcul à chaque page : 10-21ms

**Après (Solution 1)** :
- Page 1→2 : < 1ms (cache)
- Page 5→6 : < 1ms (cache)
- Recalcul : 0ms (déjà en cache)

**Après (Solution 2)** :
- Scroll : chargement progressif
- Pas d'attente visible
- UX fluide

## 🚀 RECOMMANDATION

**Pour ton cas** : Utiliser **Solution 1** (Pagination par page) car :
1. Tu as déjà une pagination
2. TanStack Query est déjà configuré
3. Les utilisateurs sont habitués à la pagination
4. Plus simple à implémenter

**Option 2** (Infinite Query) si tu veux une UX plus moderne avec scroll infini.

