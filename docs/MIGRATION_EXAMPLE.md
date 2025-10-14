# 🔄 Exemple de Migration - Optimisation de la Page SoD

Ce document montre comment migrer **progressivement** votre page SoD actuelle vers une architecture optimisée.

## 📦 Étape 1 : Installation et Configuration

### **1.1 Wrapper l'application**

```tsx
// app/layout.tsx
import { QueryProvider } from 'lib/components/providers/QueryProvider';
import { ThemeProvider } from 'lib/contexts/ThemeContext';
import { AuthProvider } from 'lib/contexts/AuthContext';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        {/* ✅ QueryProvider en haut de la hiérarchie */}
        <QueryProvider>
          <AuthProvider>
            <ThemeProvider>
              {children}
            </ThemeProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

## 🔧 Étape 2 : Migration du Hook useSodWorkflow

### **Avant (État local uniquement)**

```tsx
// lib/hooks/sod/useSodWorkflow.ts
export function useSodWorkflow({ userId }: { userId: string }) {
  const [state, setState] = useState<SodWorkflowState>({
    session: null,
    loading: false,
    error: null,
    parsing: false,
    // ...
  });
  
  const startNewAnalysis = async (file: File) => {
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const result = await parseFile(file);
      setState(prev => ({ ...prev, session: result, loading: false }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error.message, loading: false }));
    }
  };
  
  return { state, actions: { startNewAnalysis } };
}
```

### **Après (TanStack Query + Cache)**

```tsx
// lib/hooks/sod/useSodWorkflowOptimized.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sodQueryKeys } from './useSodAnalysisQuery';

export function useSodWorkflowOptimized({ userId }: { userId: string }) {
  const queryClient = useQueryClient();
  
  // ✅ Session active (avec cache automatique)
  const { 
    data: session, 
    isLoading,
    error 
  } = useQuery({
    queryKey: sodQueryKeys.sessions(userId),
    queryFn: async () => {
      const response = await fetch(`/api/sod/sessions/active?userId=${userId}`);
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // ✅ Mutation pour nouvelle analyse
  const { mutate: startNewAnalysis, isPending: isParsing } = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      
      const response = await fetch('/api/sod/parse', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) throw new Error('Parsing failed');
      return response.json();
    },
    onSuccess: (newSession) => {
      // ✅ Mettre à jour le cache immédiatement
      queryClient.setQueryData(
        sodQueryKeys.sessions(userId),
        newSession
      );
    },
  });
  
  return {
    state: {
      session,
      loading: isLoading,
      parsing: isParsing,
      error: error?.message || null,
    },
    actions: {
      startNewAnalysis,
    },
  };
}
```

---

## 🚀 Étape 3 : Optimiser le Chargement des Rôles

### **Version Optimisée avec Prefetching**

```tsx
// lib/components/sod/SodRoleListOptimized.tsx
'use client';

import { useMemo, useCallback } from 'react';
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';
import { SodSimpleRoleCard } from './display/SodSimpleRoleCard';

interface SodRoleListOptimizedProps {
  roles: SodSimpleRole[];
  page: number;
  pageSize: number;
}

export function SodRoleListOptimized({ 
  roles, 
  page, 
  pageSize 
}: SodRoleListOptimizedProps) {
  const { prefetchSession } = usePrefetchSodSession();
  
  // ✅ Pagination (déjà optimisée)
  const paginatedRoles = useMemo(() => {
    const start = page * pageSize;
    const end = start + pageSize;
    return roles.slice(start, end);
  }, [roles, page, pageSize]);
  
  // ✅ Prefetch page suivante en arrière-plan
  useEffect(() => {
    const nextPage = page + 1;
    const nextStart = nextPage * pageSize;
    const nextEnd = nextStart + pageSize;
    const nextRoles = roles.slice(nextStart, nextEnd);
    
    // Prefetch les sessions des rôles de la page suivante
    nextRoles.forEach(role => {
      if (role.sessionId) {
        prefetchSession(role.sessionId);
      }
    });
  }, [page, pageSize, roles, prefetchSession]);
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      {paginatedRoles.map((role, index) => (
        <SodSimpleRoleCard
          key={`${page}-${index}`}
          role={role}
          // ... props
        />
      ))}
    </Box>
  );
}
```

---

## ⚡ Étape 4 : Prefetch Intelligent au Hover

### **Composant de Navigation avec Prefetch**

```tsx
// lib/components/sod/SodSessionLink.tsx
'use client';

import { Link } from 'next/link';
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';

interface SodSessionLinkProps {
  sessionId: string;
  children: React.ReactNode;
  href: string;
}

export function SodSessionLink({ sessionId, children, href }: SodSessionLinkProps) {
  const { prefetchSession } = usePrefetchSodSession();
  
  return (
    <Link
      href={href}
      onMouseEnter={() => prefetchSession(sessionId)}
      onFocus={() => prefetchSession(sessionId)}
      style={{ textDecoration: 'none', color: 'inherit' }}
    >
      {children}
    </Link>
  );
}
```

**Utilisation :**

```tsx
<SodSessionLink sessionId={session.id} href={`/dashboard/analysis/sod/${session.id}`}>
  <Card>
    <CardContent>
      <Typography variant="h6">{session.name}</Typography>
      <Typography variant="body2">{session.createdAt}</Typography>
    </CardContent>
  </Card>
</SodSessionLink>
```

**Résultat :** Quand l'utilisateur survole le lien, la session commence à se charger. Au moment du clic, les données sont déjà en cache → **Navigation instantanée** ⚡

---

## 🎯 Étape 5 : Optimistic Updates pour Actions

### **Suppression d'Action avec Update Instantané**

```tsx
// lib/hooks/sod/useSodActions.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sodQueryKeys } from './useSodAnalysisQuery';

export function useSodActions(userId: string, sessionId: string) {
  const queryClient = useQueryClient();
  
  const { mutate: deleteAction } = useMutation({
    mutationFn: async ({ roleName, actionCode }: { roleName: string; actionCode: string }) => {
      const response = await fetch('/api/sod/actions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, roleName, actionCode }),
      });
      
      if (!response.ok) throw new Error('Failed to delete action');
      return response.json();
    },
    
    // ✅ Optimistic Update : UI se met à jour immédiatement
    onMutate: async ({ roleName, actionCode }) => {
      // Annuler les refetch en cours
      await queryClient.cancelQueries({ queryKey: sodQueryKeys.session(sessionId) });
      
      // Snapshot de l'état actuel (pour rollback si erreur)
      const previousSession = queryClient.getQueryData(sodQueryKeys.session(sessionId));
      
      // Mettre à jour le cache immédiatement
      queryClient.setQueryData(sodQueryKeys.session(sessionId), (old: any) => {
        if (!old) return old;
        
        return {
          ...old,
          simpleRoles: {
            ...old.simpleRoles,
            roles: old.simpleRoles.roles.map((role: any) => {
              if (role.roleName !== roleName) return role;
              
              return {
                ...role,
                risks: role.risks.map((risk: any) => ({
                  ...risk,
                  functions: risk.functions.map((func: any) => ({
                    ...func,
                    actions: func.actions.filter((action: any) => 
                      action.code !== actionCode
                    ),
                  })),
                })),
              };
            }),
          },
        };
      });
      
      // Retourner le snapshot pour rollback
      return { previousSession };
    },
    
    // ✅ Rollback en cas d'erreur
    onError: (_err, _variables, context) => {
      if (context?.previousSession) {
        queryClient.setQueryData(
          sodQueryKeys.session(sessionId),
          context.previousSession
        );
      }
    },
    
    // ✅ Revalider après succès
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: sodQueryKeys.session(sessionId) });
    },
  });
  
  return { deleteAction };
}
```

**Utilisation dans le composant :**

```tsx
const { deleteAction } = useSodActions(userId, sessionId);

const handleDelete = (roleName: string, actionCode: string) => {
  // ✅ UI se met à jour instantanément (optimistic update)
  deleteAction({ roleName, actionCode });
};
```

---

## 📊 Étape 6 : Suspense pour Chargement Progressif

### **Page avec Sections Suspendues**

```tsx
// app/dashboard/analysis/sod/page.tsx
import { Suspense } from 'react';
import { SodFileUploadSection } from 'lib/components/sod/upload/SodFileUploadSection';
import { SodSimpleRolesList } from 'lib/components/sod/SodSimpleRolesList';
import { SodCompositeRolesList } from 'lib/components/sod/SodCompositeRolesList';

export default function SodAnalysisPage() {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* ✅ Toujours affiché immédiatement */}
      <SodFileUploadSection />
      
      {/* ✅ Chargé en arrière-plan pendant que l'utilisateur voit le skeleton */}
      <Suspense fallback={<RolesSkeleton />}>
        <SodSimpleRolesList />
      </Suspense>
      
      {/* ✅ Chargé en parallèle avec les rôles simples */}
      <Suspense fallback={<CompositeRolesSkeleton />}>
        <SodCompositeRolesList />
      </Suspense>
    </Container>
  );
}
```

**Composants de Skeleton :**

```tsx
// lib/components/sod/skeletons/RolesSkeleton.tsx
import { Box, Skeleton, Paper } from '@mui/material';

export function RolesSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 3 }}>
      {[1, 2, 3].map((i) => (
        <Paper key={i} sx={{ p: 3 }}>
          <Skeleton variant="text" width="40%" height={40} />
          <Skeleton variant="rectangular" width="100%" height={200} sx={{ mt: 2 }} />
        </Paper>
      ))}
    </Box>
  );
}
```

---

## 🔄 Étape 7 : Server Components + TanStack Query

### **Approche Hybride (Recommandée)**

```tsx
// app/dashboard/analysis/sod/[sessionId]/page.tsx
import { HydrationBoundary, dehydrate, QueryClient } from '@tanstack/react-query';
import { SodSessionClient } from './SodSessionClient';
import { sodQueryKeys } from 'lib/hooks/sod/useSodAnalysisQuery';

// ✅ Server Component : Prefetch côté serveur
export default async function SessionPage({ params }: { params: { sessionId: string } }) {
  const queryClient = new QueryClient();
  
  // Prefetch côté serveur
  await queryClient.prefetchQuery({
    queryKey: sodQueryKeys.session(params.sessionId),
    queryFn: async () => {
      const response = await fetch(`${process.env.API_URL}/sod/sessions/${params.sessionId}`, {
        cache: 'no-store', // Ou 'force-cache' selon vos besoins
      });
      return response.json();
    },
  });
  
  return (
    // ✅ Hydrater le cache côté client avec les données serveur
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SodSessionClient sessionId={params.sessionId} />
    </HydrationBoundary>
  );
}
```

```tsx
// app/dashboard/analysis/sod/[sessionId]/SodSessionClient.tsx
'use client';

import { useSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';

export function SodSessionClient({ sessionId }: { sessionId: string }) {
  // ✅ Données déjà en cache grâce au prefetch serveur
  // Affichage instantané, pas de loading
  const { data: session } = useSodSession('user-id', sessionId);
  
  return (
    <div>
      <h1>{session?.name}</h1>
      {/* ... */}
    </div>
  );
}
```

**Résultat :**
- ✅ **SSR** : Données chargées côté serveur (SEO, TTFB rapide)
- ✅ **Hydration** : Cache TanStack Query pré-rempli
- ✅ **Navigation** : Prefetch pour transitions instantanées

---

## 📈 Résultats Attendus

### **Avant Optimisation**

```
┌─────────────────────────────────────┐
│ Clic sur lien                       │
├─────────────────────────────────────┤
│ ⏱️  0ms    → Navigation démarre      │
│ ⏱️  200ms  → Fetch démarre           │
│ ⏱️  700ms  → Données reçues          │
│ ⏱️  900ms  → Render final            │
└─────────────────────────────────────┘
Total: ~900ms
```

### **Après Optimisation**

```
┌─────────────────────────────────────┐
│ Survol du lien (hover)              │
├─────────────────────────────────────┤
│ ⚡ 0ms     → Prefetch démarre        │
│ ⚡ 500ms   → Données en cache        │
│                                     │
│ Clic sur lien                       │
│ ⚡ 0ms     → Navigation instantanée  │
│ ⚡ 10ms    → Render (cache hit)      │
└─────────────────────────────────────┘
Total: ~10ms (90x plus rapide !)
```

---

## ✅ Checklist de Migration

### **Phase 1 : Setup (30 min)**
- [x] Installer @tanstack/react-query
- [x] Créer QueryProvider
- [x] Wrapper l'app avec QueryProvider
- [ ] Installer React Query DevTools (dev)

### **Phase 2 : Migration Progressive (2-3h)**
- [ ] Migrer useSodWorkflow vers TanStack Query
- [ ] Créer hooks de query (useSodSession, etc.)
- [ ] Remplacer useState par useQuery dans 1-2 composants tests

### **Phase 3 : Prefetching (1-2h)**
- [ ] Ajouter prefetch au hover sur les liens principaux
- [ ] Prefetch des pages adjacentes (pagination)
- [ ] Prefetch des sessions liées

### **Phase 4 : Optimistic Updates (2h)**
- [ ] Implémenter pour deleteAction
- [ ] Implémenter pour restrictAction
- [ ] Implémenter pour toggleRestriction

### **Phase 5 : Suspense (1h)**
- [ ] Créer composants de skeleton
- [ ] Wrapper sections lourdes avec Suspense
- [ ] Tester le streaming

### **Phase 6 : Monitoring (30 min)**
- [ ] Activer DevTools
- [ ] Mesurer les temps de navigation
- [ ] Ajuster staleTime/gcTime

---

## 🎓 Tips pour une Migration Réussie

### **1. Migrer progressivement**
Ne pas tout refactoriser d'un coup. Commencer par :
1. Setup QueryProvider
2. Migrer 1 composant simple
3. Tester et valider
4. Migrer le reste progressivement

### **2. Garder la compatibilité**
Pendant la migration, vous pouvez avoir :
- Anciens composants avec useState
- Nouveaux composants avec useQuery

Les deux peuvent coexister sans problème.

### **3. Utiliser les DevTools**
```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

<ReactQueryDevtools initialIsOpen={false} />
```

Permet de :
- Voir le cache en temps réel
- Déboguer les queries
- Analyser les performances

---

## 🚀 Prochaines Étapes

1. **Wrapper l'app** avec QueryProvider
2. **Créer une API route** pour tester (`/api/sod/sessions/[id]`)
3. **Migrer 1 composant** simple (ex: liste de sessions)
4. **Tester le prefetch** sur un lien
5. **Mesurer les gains** de performance

---

**Besoin d'aide pour une étape spécifique ? Consultez le guide principal ou la documentation TanStack Query.**



