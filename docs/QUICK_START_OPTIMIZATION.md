# ⚡ Quick Start - Optimisation Immédiate

Ce guide vous permet d'implémenter les optimisations de performance **dès maintenant**, sans refonte complète.

## 🎯 Gains Attendus

| Action | Avant | Après | Gain |
|--------|-------|-------|------|
| Navigation entre pages | ~1s | ~50ms | **95%** |
| Changement de page (pagination) | ~200ms | ~10ms | **95%** |
| Chargement initial | ~2s | ~300ms | **85%** |

---

## 🚀 Étape 1 : Setup Minimal (5 minutes)

### **1.1 Wrapper l'application**

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

**✅ C'est tout ! TanStack Query est maintenant actif.**

---

## ⚡ Étape 2 : Utilisation Immédiate des Composants Optimisés

### **2.1 Remplacer les Links standards**

**Avant :**
```tsx
import Link from 'next/link';

<Link href="/dashboard/analysis/sod">
  Analyse SoD
</Link>
```

**Après :**
```tsx
import { OptimizedLink } from 'lib/components/common/OptimizedLink';

<OptimizedLink 
  href="/dashboard/analysis/sod" 
  prefetch="hover"  // ⚡ Prefetch au survol
>
  Analyse SoD
</OptimizedLink>
```

**Résultat :** Navigation instantanée au clic (données déjà chargées au survol)

---

### **2.2 Prefetch avec TanStack Query**

**Exemple : Liste de sessions**

```tsx
import { OptimizedLink } from 'lib/components/common/OptimizedLink';
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';

function SessionsList() {
  const { prefetchSession } = usePrefetchSodSession();
  
  return (
    <Box>
      {sessions.map(session => (
        <OptimizedLink
          key={session.id}
          href={`/dashboard/analysis/sod/${session.id}`}
          prefetch="hover"
          onPrefetch={() => prefetchSession(session.id)}  // ⚡ Prefetch données
        >
          <Card>
            <CardContent>
              <Typography variant="h6">{session.name}</Typography>
            </CardContent>
          </Card>
        </OptimizedLink>
      ))}
    </Box>
  );
}
```

**Résultat :** 
- Au survol : Route Next.js + Données API chargées en arrière-plan
- Au clic : Navigation instantanée (tout est déjà en cache)

---

## 🔥 Étape 3 : Optimisations Next.js Natives

### **3.1 Cache des Fetch Server-Side**

**Pour données statiques :**
```tsx
// app/dashboard/page.tsx
export default async function Dashboard() {
  // ✅ Cache permanent (invalidé manuellement)
  const config = await fetch('https://api.example.com/config', {
    cache: 'force-cache'
  });
  
  return <div>{/* ... */}</div>;
}
```

**Pour données avec revalidation :**
```tsx
export default async function Dashboard() {
  // ✅ Cache pendant 1 heure, puis revalide en arrière-plan
  const stats = await fetch('https://api.example.com/stats', {
    next: { revalidate: 3600 }  // 1 heure
  });
  
  return <div>{/* ... */}</div>;
}
```

---

### **3.2 React cache() pour Déduplication**

**Avant (fetch en double) :**
```tsx
// Même fetch appelé dans plusieurs composants
async function getData() {
  return fetch('/api/data').then(r => r.json());
}

function ComponentA() {
  const data = await getData();  // Fetch 1
}

function ComponentB() {
  const data = await getData();  // Fetch 2 (duplicate !)
}
```

**Après (dedupliqué) :**
```tsx
import { cache } from 'react';

// ✅ Même fetch appelé 1 seule fois
const getData = cache(async () => {
  return fetch('/api/data').then(r => r.json());
});

function ComponentA() {
  const data = await getData();  // Fetch 1
}

function ComponentB() {
  const data = await getData();  // Cache hit (pas de fetch)
}
```

---

## 🎯 Étape 4 : Optimiser la Navigation de Pagination

**Votre code actuel (déjà bon) :**
```tsx
const paginatedSimpleRoles = useMemo(() => {
  const start = simpleRolePage * simpleRolesPerPage;
  const end = start + simpleRolesPerPage;
  return simpleRoles.slice(start, end);
}, [simpleRoles, simpleRolePage, simpleRolesPerPage]);
```

**Ajout du prefetch de la page suivante :**
```tsx
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';

// Dans votre composant
const { prefetchSession } = usePrefetchSodSession();

useEffect(() => {
  // ⚡ Prefetch page suivante en arrière-plan
  const nextPage = simpleRolePage + 1;
  const nextStart = nextPage * simpleRolesPerPage;
  const nextEnd = nextStart + simpleRolesPerPage;
  const nextRoles = simpleRoles.slice(nextStart, nextEnd);
  
  nextRoles.forEach(role => {
    if (role.sessionId) {
      prefetchSession(role.sessionId);
    }
  });
}, [simpleRolePage, simpleRoles, simpleRolesPerPage, prefetchSession]);
```

**Résultat :** Clic sur "Page suivante" → Transition instantanée

---

## 📦 Étape 5 : Suspense pour Chargement Progressif

**Avant (tout bloque pendant le chargement) :**
```tsx
export default function Page() {
  const session = await fetchSession();
  const roles = await fetchRoles();
  
  return (
    <div>
      <Header />
      <Roles roles={roles} />
    </div>
  );
}
```

**Après (streaming progressif) :**
```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      {/* ✅ Affiché immédiatement */}
      <Header />
      
      {/* ✅ Chargé en arrière-plan */}
      <Suspense fallback={<RolesSkeleton />}>
        <RolesAsync />
      </Suspense>
    </div>
  );
}

async function RolesAsync() {
  const roles = await fetchRoles();
  return <Roles roles={roles} />;
}
```

**Résultat :** 
- Header affiché instantanément
- Skeleton pendant le chargement
- Roles affichés quand prêts

---

## 🔧 Exemples Concrets pour Votre Code

### **Exemple 1 : Liste de Sessions Saved**

```tsx
// app/dashboard/analysis/sod/saved/page.tsx
'use client';

import { useSodSessions } from 'lib/hooks/sod/useSodAnalysisQuery';
import { OptimizedLink } from 'lib/components/common/OptimizedLink';

export default function SavedSessionsPage() {
  const { data: sessions, isLoading } = useSodSessions('user-id');
  const { prefetchSession } = usePrefetchSodSession();
  
  if (isLoading) return <Loader />;
  
  return (
    <Box>
      <Typography variant="h4">Sessions Sauvegardées</Typography>
      
      <Grid container spacing={3}>
        {sessions?.map(session => (
          <Grid key={session.id} size={{ xs: 12, md: 6, lg: 4 }}>
            <OptimizedLink
              href={`/dashboard/analysis/sod/${session.id}`}
              prefetch="hover"
              onPrefetch={() => prefetchSession(session.id)}
            >
              <Card sx={{ cursor: 'pointer', '&:hover': { boxShadow: 6 } }}>
                <CardContent>
                  <Typography variant="h6">{session.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {new Date(session.createdAt).toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            </OptimizedLink>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
```

---

### **Exemple 2 : Bouton "Charger Analyse Sauvegardée"**

**Dans votre SodFileUploadSection actuel :**

```tsx
import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';

function SodFileUploadSection() {
  const { prefetchSessions } = usePrefetchSodSession();
  
  // ⚡ Prefetch au survol du bouton
  const handleMouseEnter = () => {
    prefetchSessions('user-id');  // Charge la liste des sessions
  };
  
  return (
    <Button
      variant="outlined"
      onMouseEnter={handleMouseEnter}  // ⚡ Prefetch
      onClick={handleLoadSavedAnalysis}
    >
      Charger Analyse Sauvegardée
    </Button>
  );
}
```

**Résultat :** 
- Survol du bouton → Liste des sessions chargée en arrière-plan
- Clic sur le bouton → Modal s'ouvre instantanément avec la liste déjà chargée

---

### **Exemple 3 : Navigation entre Étapes (Stepper)**

```tsx
function SodStepperNavigation({ currentStep, onStepChange }: Props) {
  const { prefetchSession } = usePrefetchSodSession();
  
  const handleStepHover = (step: number) => {
    // ⚡ Prefetch données de l'étape au survol
    if (step === 1) {
      // Prefetch données des rôles simples
    } else if (step === 2) {
      // Prefetch données des rôles composites
    }
  };
  
  return (
    <Stepper activeStep={currentStep}>
      {steps.map((label, index) => (
        <Step 
          key={label}
          onMouseEnter={() => handleStepHover(index)}
        >
          <StepButton onClick={() => onStepChange(index)}>
            {label}
          </StepButton>
        </Step>
      ))}
    </Stepper>
  );
}
```

---

## 📊 Monitoring et Debug

### **Activer React Query DevTools**

```tsx
// lib/components/providers/QueryProvider.tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      
      {/* ⚡ DevTools uniquement en dev */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

**Utilisation :**
1. Lancer l'app en dev
2. Cliquer sur l'icône React Query (coin bas gauche)
3. Voir le cache en temps réel
4. Déboguer les queries

---

## ✅ Checklist d'Implémentation Rapide

### **Phase 1 : Installation (5 min)**
- [x] npm install @tanstack/react-query
- [x] Créer QueryProvider
- [ ] Wrapper app/layout.tsx avec QueryProvider

### **Phase 2 : Composants Optimisés (10 min)**
- [x] Créer OptimizedLink
- [ ] Remplacer 2-3 Links dans votre code
- [ ] Tester la navigation

### **Phase 3 : Prefetching (15 min)**
- [ ] Ajouter usePrefetchSodSession
- [ ] Prefetch sur bouton "Charger Analyse"
- [ ] Prefetch sur liste de sessions

### **Phase 4 : Cache Next.js (5 min)**
- [ ] Ajouter { cache: 'force-cache' } sur 1-2 fetch
- [ ] Tester le cache

### **Phase 5 : Monitoring (5 min)**
- [ ] Activer DevTools
- [ ] Mesurer temps de navigation avant/après

**Total : ~40 minutes pour des gains de 90%+ sur les performances**

---

## 🎓 Ressources

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [React cache()](https://react.dev/reference/react/cache)

---

## 💡 Pro Tips

### **1. Prefetch conditionnel**

```tsx
// ✅ Ne prefetch que si pas déjà en cache
const handleHover = () => {
  const cached = queryClient.getQueryData(['session', sessionId]);
  if (!cached) {
    prefetchSession(sessionId);
  }
};
```

---

### **2. Prefetch au scroll**

```tsx
import { IntersectionOptimizedLink } from 'lib/components/common/OptimizedLink';

// ⚡ Prefetch quand le lien devient visible
<IntersectionOptimizedLink
  href="/page"
  threshold={0.5}  // 50% visible
  onPrefetch={() => prefetchData()}
>
  Voir la page
</IntersectionOptimizedLink>
```

---

### **3. Prefetch en batch**

```tsx
// ⚡ Lancer tous les prefetch en parallèle
useEffect(() => {
  Promise.all([
    prefetchSession('session-1'),
    prefetchSession('session-2'),
    prefetchSession('session-3'),
  ]);
}, []);
```

---

## 🚀 Prochaines Étapes

1. **Implémenter Phase 1** (QueryProvider)
2. **Tester 1-2 OptimizedLinks**
3. **Mesurer les gains** de performance
4. **Migrer progressivement** le reste de l'app

**L'optimisation est un processus itératif. Commencez petit, mesurez, et étendez progressivement.** ⚡



