# 📋 Plan d'Implémentation - Optimisation des Performances

## 🎯 Vue d'Ensemble

Ce document détaille le plan d'implémentation étape par étape pour optimiser les performances de Sora avec TanStack Query.

---

## ✅ Phase 1 : Préparation (COMPLÉTÉ)

### **1.1 Installation des packages** ✅
```bash
✅ npm install @tanstack/react-query
✅ npm install @tanstack/react-query-devtools
```

### **1.2 Création des composants** ✅
- ✅ `lib/components/providers/QueryProvider.tsx`
- ✅ `lib/hooks/sod/useSodAnalysisQuery.ts`
- ✅ `lib/components/common/OptimizedLink.tsx`

### **1.3 Documentation** ✅
- ✅ PERFORMANCE_OPTIMIZATION_GUIDE.md
- ✅ MIGRATION_EXAMPLE.md
- ✅ QUICK_START_OPTIMIZATION.md
- ✅ RECOMMENDATIONS_SORA.md
- ✅ INSTALLATION_SUMMARY.md

---

## ⚡ Phase 2 : Quick Wins (30 minutes) ✅ COMPLÉTÉ

### **2.1 Setup de base (5 min)** ✅ COMPLÉTÉ

---

## 🚀 Phase 3 : Pagination Instantanée avec Skeletons (NOUVEAU)

### **3.1 Créer le composant SkeletonGrid** ✅ COMPLÉTÉ

**Fichier :** `lib/components/sod/skeleton/SkeletonGrid.tsx`

**Objectif :** Composant générique pour afficher des grilles de skeletons pendant le chargement

```tsx
// lib/components/sod/skeleton/SkeletonGrid.tsx
import React from 'react';
import { Box } from '@mui/material';
import { SodSimpleRoleCardSkeleton, SodCompositeRoleCardSkeleton } from './SodRoleCardSkeleton';

interface SkeletonGridProps {
  count: number;
  type?: 'simple' | 'composite';
  spacing?: number;
}

export const SkeletonGrid: React.FC<SkeletonGridProps> = ({ 
  count, 
  type = 'simple',
  spacing = 3 
}) => {
  const SkeletonComponent = type === 'simple' 
    ? SodSimpleRoleCardSkeleton 
    : SodCompositeRoleCardSkeleton;
    
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: spacing }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonComponent key={`skeleton-${type}-${i}`} />
      ))}
    </Box>
  );
};
```

### **3.2 Modifier les callbacks de pagination** ✅ COMPLÉTÉ

**Fichier :** `app/dashboard/analysis/sod/page.tsx`

**Objectif :** Ajouter les mesures de performance et optimiser les callbacks

```tsx
// Callbacks optimisés avec métriques
const handleSimplePageChange = useCallback((_event: unknown, newPage: number) => {
  const startTime = performance.now();
  
  setSimpleRolePage(newPage); // ⚡ INSTANTANÉ
  
  const endTime = performance.now();
  console.log(`⚡ Simple page change UI: ${endTime - startTime}ms`);
}, []);

const handleCompositePageChange = useCallback((_event: unknown, newPage: number) => {
  const startTime = performance.now();
  
  setCompositeRolePage(newPage); // ⚡ INSTANTANÉ
  
  const endTime = performance.now();
  console.log(`⚡ Composite page change UI: ${endTime - startTime}ms`);
}, []);
```

### **3.3 Intégrer les skeletons dans le rendu** ✅ COMPLÉTÉ

**Fichier :** `app/dashboard/analysis/sod/page.tsx`

**Objectif :** Remplacer les conditions de chargement par des skeletons intelligents

```tsx
// Rendu avec skeletons pendant le chargement
{isSimplePaginationLoading ? (
  <SkeletonGrid 
    count={simpleRolesPerPage} 
    type="simple" 
  />
) : (
  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
    {visibleSimpleRoles.map((role) => (
      <React.Suspense 
        key={role.roleName}
        fallback={<SodSimpleRoleCardSkeleton />}
      >
        <SodSimpleRoleCardSuspense
          role={role}
          onDeleteAction={optimisticUpdates.deleteAction}
          onRestrictAction={optimisticUpdates.restrictAction}
          onRestrictResource={optimisticUpdates.restrictResource}
          onDeleteRisk={undefined}
          onNextStep={undefined}
          showNextStepButton={false}
        />
      </React.Suspense>
    ))}
    
    {/* Lazy loading skeletons */}
    {hasMoreSimple && (
      <>
        {Array.from({ length: remainingSimpleCount }).map((_, i) => (
          <SodSimpleRoleCardSkeleton key={`skeleton-simple-${i}`} />
        ))}
        <div 
          ref={simpleObserverRef} 
          style={{ height: '1px', width: '100%' }} 
          aria-hidden="true"
        />
      </>
    )}
  </Box>
)}
```

### **3.4 Nettoyer l'ancien code de pagination** ✅ COMPLÉTÉ

**Fichiers à nettoyer :**
- `lib/hooks/sod/useSodPaginationPrefetch.ts` ✅ DÉJÀ SUPPRIMÉ
- `lib/hooks/sod/useSodWorkflow.ts` ✅ DÉJÀ SUPPRIMÉ
- Anciens composants de progression ✅ DÉJÀ SUPPRIMÉS

**Actions de nettoyage :**
- Supprimer les imports inutilisés
- Supprimer les variables non utilisées
- Supprimer les commentaires obsolètes
- Vérifier les exports inutilisés

### **3.5 Optimiser les transitions** ✅ COMPLÉTÉ

**Objectif :** Ajouter des animations fluides entre les pages

```tsx
// Animation de transition
import { Fade, Slide } from '@mui/material';

<Fade in={!isSimplePaginationLoading} timeout={300}>
  <Box>
    {/* Contenu des rôles */}
  </Box>
</Fade>

{isSimplePaginationLoading && (
  <Slide direction="up" in={isSimplePaginationLoading} timeout={200}>
    <Box>
      <SkeletonGrid count={simpleRolesPerPage} type="simple" />
    </Box>
  </Slide>
)}
```

### **3.6 Tests et validation** ✅ COMPLÉTÉ

**Tests à effectuer :**
- ✅ Changement de page < 16ms
- ✅ Skeletons affichés pendant le chargement
- ✅ Transitions fluides
- ✅ Cache TanStack Query fonctionnel
- ✅ Lazy loading préservé
- ✅ Performance globale améliorée

---

## 🧹 Phase 4 : Nettoyage et Optimisation (NOUVEAU)

### **4.1 Supprimer les imports inutilisés** ✅ COMPLÉTÉ

**Fichier :** `app/dashboard/analysis/sod/page.tsx`

**Actions :**
- Supprimer les imports de composants supprimés
- Supprimer les imports de hooks obsolètes
- Nettoyer les types inutilisés

### **4.2 Supprimer les variables obsolètes** ✅ COMPLÉTÉ

**Actions :**
- Supprimer les variables de debug non utilisées
- Supprimer les états obsolètes
- Nettoyer les commentaires de debug

### **4.3 Optimiser les exports** ✅ COMPLÉTÉ

**Fichier :** `lib/components/sod/index.ts`

**Actions :**
- Supprimer les exports de composants supprimés
- Ajouter les nouveaux exports
- Organiser les exports par catégorie

### **4.4 Documentation finale** ✅ COMPLÉTÉ

**Actions :**
- Mettre à jour la documentation
- Créer un guide de migration
- Documenter les nouvelles fonctionnalités

**Fichier :** `app/layout.tsx`

**Action :** Wrapper l'application avec QueryProvider

```tsx
// app/layout.tsx
import { QueryProvider } from 'lib/components/providers/QueryProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

**Résultat :** TanStack Query actif + DevTools disponibles

---

### **2.2 Optimiser les liens (10 min)**

**Fichiers à modifier :**
- `lib/components/layout/Sidebar.tsx`
- `lib/components/layout/Header.tsx`
- Tout composant avec des `<Link>`

**Action :** Remplacer 5-10 liens par OptimizedLink

**Avant :**
```tsx
<Link href="/dashboard/analysis/sod">
  Analyse SoD
</Link>
```

**Après :**
```tsx
import { OptimizedLink } from 'lib/components/common/OptimizedLink';

<OptimizedLink href="/dashboard/analysis/sod" prefetch="hover">
  Analyse SoD
</OptimizedLink>
```

**Résultat :** Navigation instantanée sur ces liens

---

### **2.3 Test avec DevTools (10 min)**

**Actions :**
1. Lancer `npm run dev`
2. Ouvrir l'app dans le navigateur
3. Chercher l'icône TanStack Query (coin bas gauche)
4. Cliquer dessus pour voir le panneau DevTools
5. Naviguer dans l'app et observer le cache

**À vérifier :**
- ✅ Les routes sont bien prefetch au hover
- ✅ Le cache se remplit
- ✅ Les queries passent de "fetching" à "success"
- ✅ Les navigations utilisent le cache (pas de refetch)

---

## 🔧 Phase 3 : Backend & API (2-3 heures)

### **3.1 Créer API Route pour sessions**

**Fichier à créer :** `app/api/sod/sessions/[id]/route.ts`

```tsx
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // TODO: Remplacer par votre logique Supabase
    const session = await getSessionFromSupabase(params.id);
    
    return NextResponse.json(session, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    );
  }
}
```

**Fichier à créer :** `app/api/sod/sessions/active/route.ts`

```tsx
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  try {
    const activeSession = await getActiveSessionForUser(userId);
    return NextResponse.json(activeSession);
  } catch (error) {
    return NextResponse.json(null);
  }
}
```

---

### **3.2 Migrer useSodWorkflow**

**Fichier :** `lib/hooks/sod/useSodWorkflow.ts`

**Avant (état local) :**
```tsx
const [session, setSession] = useState(null);
```

**Après (TanStack Query) :**
```tsx
import { useQuery } from '@tanstack/react-query';
import { sodQueryKeys } from './useSodAnalysisQuery';

const { data: session, isLoading } = useQuery({
  queryKey: sodQueryKeys.sessions(userId),
  queryFn: async () => {
    const response = await fetch(`/api/sod/sessions/active?userId=${userId}`);
    if (!response.ok) return null;
    return response.json();
  },
  staleTime: 5 * 60 * 1000,
});
```

---

## 🚀 Phase 4 : Prefetching Avancé (1-2 heures)

### **4.1 Prefetch pagination**

**Fichier :** `app/dashboard/analysis/sod/page.tsx`

**Ajouter après la ligne 223 :**

```tsx
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';

// Dans le composant
const { prefetchSession } = usePrefetchSodSession();

// ⚡ Prefetch page suivante
useEffect(() => {
  if (sodWorkflow.state.parsing) return;
  
  const nextPage = simpleRolePage + 1;
  const nextStart = nextPage * simpleRolesPerPage;
  const nextEnd = nextStart + simpleRolesPerPage;
  const nextRoles = simpleRoles.slice(nextStart, nextEnd);
  
  nextRoles.forEach(role => {
    if (role.sessionId) {
      prefetchSession(role.sessionId);
    }
  });
}, [simpleRolePage, simpleRoles, simpleRolesPerPage, prefetchSession, sodWorkflow.state.parsing]);
```

**Résultat :** Changement de page instantané

---

### **4.2 Prefetch sur boutons**

**Fichier :** `lib/components/sod/upload/SodFileUploadSection.tsx`

**Ajouter :**

```tsx
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';

function SodFileUploadSection() {
  const { prefetchSessions } = usePrefetchSodSession();
  
  const handleMouseEnterLoadButton = () => {
    prefetchSessions(userId);
  };
  
  return (
    <Button
      onMouseEnter={handleMouseEnterLoadButton}
      onClick={handleLoadSavedAnalysis}
    >
      Charger Analyse Sauvegardée
    </Button>
  );
}
```

**Résultat :** Modal s'ouvre instantanément avec données déjà chargées

---

## 💪 Phase 5 : Optimistic Updates (2 heures)

### **5.1 Optimiser handleDeleteAction**

**Fichier :** `app/dashboard/analysis/sod/page.tsx`

**Remplacer autour de la ligne 226 :**

```tsx
import { useUpdateSodCache } from 'lib/hooks/sod/useSodAnalysisQuery';

const { updateSession } = useUpdateSodCache();

const handleDeleteAction = useCallback((
  roleName: string,
  riskId: string,
  actionCode: string
) => {
  // 1. Mettre à jour le cache immédiatement
  updateSession(sessionId, (old) => {
    if (!old) return old;
    
    return {
      ...old,
      simpleRoles: {
        ...old.simpleRoles,
        roles: old.simpleRoles.roles.map(role => {
          if (role.roleName !== roleName) return role;
          
          return {
            ...role,
            risks: role.risks.map(risk => ({
              ...risk,
              functions: risk.functions.map(func => ({
                ...func,
                actions: func.actions.filter(a => a.code !== actionCode),
              })),
            })),
          };
        }),
      },
    };
  });
  
  // 2. Envoyer à l'API en arrière-plan
  toggleDeleteAction(roleName, actionCode, []);
}, [updateSession, sessionId, toggleDeleteAction]);
```

**Résultat :** UI se met à jour instantanément (< 5ms au lieu de 150ms)

---

## 🧹 Phase 6 : Nettoyage du Code (TERMINÉ ✅)

### **6.1 Suppression des Anciens Hooks de Pagination** ✅

**État :** COMPLET  
**Fichier :** `app/dashboard/analysis/sod/page.tsx`

- ✅ Supprimé `useState` pour `simpleRolePage` et `simpleRolesPerPage`
- ✅ Supprimé `useState` pour `compositeRolePage` et `compositeRolesPerPage`
- ✅ Supprimé `handleSimplePageChange` et `handleSimpleRowsPerPageChange`
- ✅ Supprimé `handleCompositePageChange` et `handleCompositeRowsPerPageChange`
- ✅ Remplacé par `useOptimisticPagination` pour les deux types de rôles

**Résultat :** Code plus propre et maintenable

---

### **6.2 Vérification des Fichiers Supprimés** ✅

**État :** COMPLET

#### **Hooks Supprimés (Précédemment) :**
- ✅ `lib/hooks/sod/useSodPaginationPrefetch.ts`
- ✅ `lib/hooks/sod/useSodWorkflow.ts`
- ✅ `lib/hooks/sod/useSodExcelParserDetailed.ts`
- ✅ `lib/hooks/sod/useLazyFunctionRendering.ts`

#### **Composants Supprimés (Précédemment) :**
- ✅ `lib/components/sod/virtualized/*` (3 fichiers)
- ✅ `lib/components/sod/skeleton/SodFunctionSkeleton.tsx`
- ✅ `lib/components/sod/analysis/SodParsingModeSelector.tsx`
- ✅ `app/test-prefetch/page.tsx`
- ✅ `public/workers/sodParsingWorkerExcelJSDetailed.js`

**Résultat :** ~1,500 lignes de code supprimées

---

### **6.3 Mise à Jour des Commentaires** ✅

**État :** COMPLET  
**Fichier :** `app/dashboard/analysis/sod/page.tsx`

- ✅ Commentaires obsolètes mis à jour
- ✅ Références aux anciens handlers corrigées
- ✅ Documentation inline améliorée

**Résultat :** Code bien documenté et cohérent

---

### **6.4 Rapport de Nettoyage** ✅

**État :** COMPLET  
**Fichier :** `docs/NETTOYAGE_PAGINATION_OPTIMISTE.md`

- ✅ Rapport détaillé créé
- ✅ Architecture finale documentée
- ✅ Métriques de nettoyage fournies

**Résultat :** Documentation complète du nettoyage

---

## 🎭 Phase 7 : Suspense (DÉJÀ IMPLÉMENTÉ ✅)

### **7.1 Ajouter Suspense pour résultats** ✅

**État :** DÉJÀ IMPLÉMENTÉ

**Fichier :** `app/dashboard/analysis/sod/page.tsx`

**Restructurer autour de la ligne 630 :**

```tsx
import { Suspense } from 'react';

// Créer un nouveau composant
function ResultsSkeleton() {
  return (
    <Box sx={{ mt: 4 }}>
      <Skeleton variant="rectangular" height={200} />
      <Skeleton variant="text" width="60%" sx={{ mt: 2 }} />
    </Box>
  );
}

// Dans le render principal
{sodWorkflow.state.session && (
  <Suspense fallback={<ResultsSkeleton />}>
    <SodAnalysisResults
      session={sodWorkflow.state.session}
      // ... props
    />
  </Suspense>
)}
```

**Résultat :** Header affiché immédiatement, résultats en streaming

---

## 🔍 Phase 7 : Optimisations Spécifiques (1-2 heures)

### **7.1 Optimiser allRestrictedActions**

**Fichier :** `app/dashboard/analysis/sod/page.tsx`

**Modifier autour de la ligne 95 :**

```tsx
const restrictedActionsCache = useRef(new Map());

const allRestrictedActions = useMemo(() => {
  if (sodWorkflow.state.parsing) return new Map();
  
  const cacheKey = `${version}-${simpleRoles.length}-${compositeRoles.length}`;
  
  // ✅ Retourner le cache si rien n'a changé
  if (restrictedActionsCache.current.has(cacheKey)) {
    return restrictedActionsCache.current.get(cacheKey);
  }
  
  // Calcul normal
  const result = new Map();
  // ... votre code existant ...
  
  // Sauvegarder dans le cache
  restrictedActionsCache.current.set(cacheKey, result);
  
  return result;
}, [sodWorkflow.state.parsing, simpleRoles, compositeRoles, version]);
```

**Résultat :** Calcul uniquement si les données ont vraiment changé

---

### **7.2 Optimiser nonRemediatedRisksCount**

**Fichier :** `app/dashboard/analysis/sod/page.tsx`

**Modifier autour de la ligne 257 :**

```tsx
const nonRemediatedRisksCount = useMemo(() => {
  if (!sodWorkflow.state.session || sodWorkflow.state.parsing) return 0;
  
  let count = 0;
  
  // ✅ Calculer uniquement sur les rôles paginés
  paginatedSimpleRoles.forEach(role => {
    role.risks?.forEach(risk => {
      const remediation = actionsContext.calculateRiskRemediation(
        role.roleName,
        risk.functions
      );
      if (!remediation.isRemediated) count++;
    });
  });
  
  paginatedCompositeRoles.forEach(role => {
    role.risks?.forEach(risk => {
      const remediation = actionsContext.calculateCompositeRiskRemediation(
        role.roleName,
        risk.functions
      );
      if (!remediation.isRemediated) count++;
    });
  });
  
  return count;
}, [paginatedSimpleRoles, paginatedCompositeRoles, actionsContext, version]);
```

**Résultat :** Calcul sur 5-10 rôles au lieu de 1000+

---

## 📊 Phase 8 : Mesures & Ajustements (1 heure)

### **8.1 Mesurer les performances**

**Outils :**
1. **Chrome DevTools → Network**
   - Mesurer TTFB (Time to First Byte)
   - Vérifier les cache hits
   
2. **Chrome DevTools → Performance**
   - Enregistrer une session de navigation
   - Analyser les temps de render
   
3. **Lighthouse**
   ```bash
   npm run build
   npm run start
   # Puis ouvrir DevTools → Lighthouse → Generate report
   ```
   
4. **React Query DevTools**
   - Observer les queries
   - Vérifier staleTime/gcTime

---

### **8.2 Ajuster la configuration**

**Fichier :** `lib/components/providers/QueryProvider.tsx`

**Ajuster selon vos besoins :**

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Données rarement modifiées
      staleTime: 10 * 60 * 1000, // 10 minutes
      
      // Ou données fréquemment modifiées
      staleTime: 1 * 60 * 1000,  // 1 minute
      
      // Ajuster selon les résultats
      gcTime: 15 * 60 * 1000,    // 15 minutes
    },
  },
});
```

---

## ✅ Phase 9 : Tests & Validation (2 heures)

### **9.1 Tests fonctionnels**

**Scénarios à tester :**

1. **Navigation**
   - [ ] Liste → Détails (instantané ?)
   - [ ] Retour arrière (cache utilisé ?)
   - [ ] Navigation rapide (pas de flashs ?)

2. **Pagination**
   - [ ] Changement de page (< 50ms ?)
   - [ ] Page suivante prefetch (DevTools montre le cache ?)
   - [ ] Retour page précédente (instantané ?)

3. **Actions**
   - [ ] Delete action (UI instantanée ?)
   - [ ] Restrict action (< 10ms ?)
   - [ ] Rollback en cas d'erreur API ?

4. **Cache**
   - [ ] Données persistent entre navigations ?
   - [ ] Invalidation après 5 minutes ?
   - [ ] Garbage collection après 10 minutes ?

---

### **9.2 Tests de performance**

**Métriques attendues :**

| Métrique | Target | Comment mesurer |
|----------|--------|-----------------|
| **TTFB** | < 100ms | Network tab |
| **LCP** | < 2.5s | Lighthouse |
| **FID** | < 100ms | Lighthouse |
| **Navigation** | < 50ms | Performance tab |
| **Pagination** | < 10ms | Performance tab |

---

## 📝 Checklist Finale

### **Quick Wins (30 min)**
- [ ] QueryProvider ajouté à layout.tsx
- [ ] 5-10 Links remplacés par OptimizedLink
- [ ] Navigation testée avec DevTools

### **Backend (2-3h)**
- [ ] API routes créées
- [ ] useSodWorkflow migré vers useQuery
- [ ] Cache testé

### **Prefetch (1-2h)**
- [ ] Pagination prefetch implémenté
- [ ] Boutons avec prefetch
- [ ] Gains mesurés

### **Optimistic Updates (2h)**
- [ ] handleDeleteAction optimisé
- [ ] handleRestrictAction optimisé
- [ ] Rollback testé

### **Suspense (1h)**
- [ ] Skeletons créés
- [ ] Suspense ajouté
- [ ] Streaming testé

### **Optimisations (1-2h)**
- [ ] allRestrictedActions optimisé
- [ ] nonRemediatedRisksCount optimisé
- [ ] Cache incrémental testé

### **Mesures (1h)**
- [ ] Lighthouse avant/après
- [ ] DevTools analyse
- [ ] staleTime/gcTime ajusté

### **Tests (2h)**
- [ ] Tests fonctionnels OK
- [ ] Métriques cibles atteintes
- [ ] Documentation mise à jour

---

## 🎯 Temps Total Estimé

| Phase | Temps | Priorité |
|-------|-------|----------|
| **Phase 2 : Quick Wins** | 30 min | 🔥 CRITIQUE |
| **Phase 3 : Backend** | 2-3h | ⚡ HAUTE |
| **Phase 4 : Prefetch** | 1-2h | ⚡ HAUTE |
| **Phase 5 : Optimistic** | 2h | 📊 MOYENNE |
| **Phase 6 : Suspense** | 1h | 📊 MOYENNE |
| **Phase 7 : Optimisations** | 1-2h | 📊 MOYENNE |
| **Phase 8 : Mesures** | 1h | ✅ BASSE |
| **Phase 9 : Tests** | 2h | ✅ BASSE |
| **TOTAL** | **10-13h** | - |

---

## 🚀 Prochaine Étape Immédiate

➡️ **Ouvrir `app/layout.tsx` et ajouter QueryProvider (5 min)**

**Puis :**
➡️ Consulter [QUICK_START_OPTIMIZATION.md](./QUICK_START_OPTIMIZATION.md) pour les exemples

---

**Questions ? Consultez la documentation complète dans `docs/` !**



