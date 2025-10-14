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

## ⚡ Phase 2 : Quick Wins (30 minutes)

### **2.1 Setup de base (5 min)** 🎯 PROCHAINE ÉTAPE

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

## 🎭 Phase 6 : Suspense (1 heure)

### **6.1 Ajouter Suspense pour résultats**

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



