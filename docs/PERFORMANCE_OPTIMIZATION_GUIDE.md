# 🚀 Guide d'Optimisation des Performances - Navigation Fluide

Ce guide présente des stratégies d'optimisation pour rendre le chargement des données instantané et la navigation fluide, **sans virtualisation**.

## 📊 Problèmes Identifiés

1. ❌ Pas de cache côté client → Rechargement complet à chaque navigation
2. ❌ Pas de prefetching → Chargement visible pour l'utilisateur
3. ❌ State local uniquement → Perte des données entre navigations
4. ❌ Pas de stale-while-revalidate → Écrans de chargement inutiles

## ✅ Solutions Implémentées

### 1️⃣ **TanStack Query - Cache Automatique**

**Avantages :**
- ✅ Cache automatique avec `staleTime` (données fraîches pendant X minutes)
- ✅ `gcTime` (garbage collection pour libérer la mémoire)
- ✅ Stale-while-revalidate (affiche le cache pendant le rechargement en arrière-plan)
- ✅ Prefetching intelligent
- ✅ Invalidation sélective du cache

**Configuration recommandée :**

```typescript
// lib/components/providers/QueryProvider.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,       // Données fraîches 5 min
      gcTime: 10 * 60 * 1000,          // Nettoyage après 10 min
      refetchOnWindowFocus: false,     // Pas de refetch au focus
      refetchOnMount: false,           // Pas de refetch au mount si fresh
    },
  },
});
```

---

### 2️⃣ **Prefetching Stratégique**

#### **A. Prefetch au Survol (Hover)**

Chargez les données **avant** le clic pour navigation instantanée :

```tsx
'use client';

import { usePrefetchSodSession } from 'lib/hooks/sod/useSodAnalysisQuery';

function SessionLink({ sessionId, children }: { sessionId: string; children: React.ReactNode }) {
  const { prefetchSession } = usePrefetchSodSession();
  
  return (
    <Link
      href={`/dashboard/analysis/sod/${sessionId}`}
      onMouseEnter={() => prefetchSession(sessionId)}  // ⚡ Prefetch au survol
      onFocus={() => prefetchSession(sessionId)}       // ⚡ Prefetch au focus clavier
    >
      {children}
    </Link>
  );
}
```

**Résultat :** Quand l'utilisateur clique, les données sont déjà en cache → **Navigation instantanée** ⚡

---

#### **B. Prefetch dans le Router (Next.js)**

Pour Next.js, utilisez le prefetching automatique des routes :

```tsx
import Link from 'next/link';

// ✅ Prefetch automatique activé par défaut
<Link href="/dashboard/analysis/sod" prefetch={true}>
  Analyse SoD
</Link>

// ❌ Désactiver si pas nécessaire
<Link href="/footer-link" prefetch={false}>
  Lien rarement cliqué
</Link>
```

---

#### **C. Prefetch Parallèle (Promise.all)**

Chargez plusieurs ressources **en parallèle** :

```tsx
const { prefetchSession } = usePrefetchSodSession();

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

### 3️⃣ **Next.js Cache API - Server Components**

Pour les données côté serveur, utilisez les APIs de cache de Next.js :

#### **A. Force Cache (Données Statiques)**

```tsx
// app/dashboard/analysis/sod/page.tsx
export default async function Page() {
  // ✅ Mise en cache automatique jusqu'à invalidation manuelle
  const data = await fetch('https://api.example.com/static-data', { 
    cache: 'force-cache' 
  });
  
  return <div>{/* ... */}</div>;
}
```

---

#### **B. Revalidation Temporelle (ISR)**

```tsx
export default async function Page() {
  // ✅ Cache pendant 1 heure, puis revalide en arrière-plan
  const data = await fetch('https://api.example.com/data', { 
    next: { revalidate: 3600 } // 1 heure
  });
  
  return <div>{/* ... */}</div>;
}
```

---

#### **C. React Cache (Déduplication)**

Évitez les requêtes en double dans le même render :

```typescript
// lib/data/sod.ts
import { cache } from 'react';

export const getSodSession = cache(async (sessionId: string) => {
  const response = await fetch(`/api/sod/sessions/${sessionId}`);
  return response.json();
});
```

**Résultat :** Même si `getSodSession('123')` est appelé 10 fois dans différents composants, une seule requête HTTP est faite.

---

### 4️⃣ **Suspense + Streaming pour UX Fluide**

Affichez du contenu progressivement pendant le chargement :

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <Header /> {/* Affiché immédiatement */}
      
      <Suspense fallback={<RolesSkeleton />}>
        <SimpleRoles /> {/* Chargé en arrière-plan */}
      </Suspense>
      
      <Suspense fallback={<CompositeRolesSkeleton />}>
        <CompositeRoles /> {/* Chargé en parallèle */}
      </Suspense>
    </div>
  );
}
```

**Avantages :**
- ✅ Streaming HTML (TTFB ultra-rapide)
- ✅ Chargement parallèle des sections
- ✅ Pas de blocage du render

---

### 5️⃣ **Optimisation de la Pagination**

Votre code actuel est déjà bien optimisé :

```tsx
// ✅ Pagination AVANT applyState → Traitement limité à 5-10 rôles
const paginatedSimpleRolesRaw = useMemo(() => {
  const start = simpleRolePage * simpleRolesPerPage;
  const end = start + simpleRolesPerPage;
  return simpleRoles.slice(start, end);
}, [simpleRoles, simpleRolePage, simpleRolesPerPage]);

const paginatedSimpleRoles = useMemo(() => {
  return applyStateToSimpleRoles(paginatedSimpleRolesRaw, actionsState);
}, [paginatedSimpleRolesRaw, actionsState, version]);
```

**Amélioration possible :** Prefetch des pages adjacentes

```tsx
const { prefetchSession } = usePrefetchSodSession();

// Prefetch page suivante au changement de page
useEffect(() => {
  const nextPage = simpleRolePage + 1;
  const nextRoles = simpleRoles.slice(
    nextPage * simpleRolesPerPage,
    (nextPage + 1) * simpleRolesPerPage
  );
  
  // Prefetch les sessions des rôles de la page suivante
  nextRoles.forEach(role => {
    if (role.sessionId) {
      prefetchSession(role.sessionId);
    }
  });
}, [simpleRolePage, simpleRoles, simpleRolesPerPage, prefetchSession]);
```

---

### 6️⃣ **Gestion du Cache - Invalidation Intelligente**

#### **Invalider le cache après mutation**

```tsx
const { mutate: saveSession } = useSaveSodSession();

const handleSave = () => {
  saveSession(sessionData, {
    onSuccess: () => {
      // ✅ Cache invalidé automatiquement (voir useSodAnalysisQuery.ts)
      // Les prochains useQuery vont refetch
    }
  });
};
```

#### **Optimistic Updates (UX instantanée)**

```tsx
const { updateSession } = useUpdateSodCache();

const handleToggleAction = (actionId: string) => {
  // ✅ Update UI immédiatement (avant l'API)
  updateSession(sessionId, (old) => ({
    ...old,
    actions: old.actions.map(a => 
      a.id === actionId ? { ...a, deleted: !a.deleted } : a
    )
  }));
  
  // ✅ Puis envoyer à l'API
  mutate({ sessionId, actionId });
};
```

---

## 🎯 Stratégies Combinées pour Navigation Instantanée

### **Scénario 1 : Liste → Détails**

```tsx
// Liste des sessions
function SessionsList() {
  const { data: sessions } = useSodSessions(userId);
  const { prefetchSession } = usePrefetchSodSession();
  
  return (
    <div>
      {sessions?.map(session => (
        <Link
          key={session.id}
          href={`/sod/${session.id}`}
          onMouseEnter={() => prefetchSession(session.id)} // ⚡ Prefetch
        >
          {session.name}
        </Link>
      ))}
    </div>
  );
}

// Page de détails (déjà en cache !)
function SessionDetails({ params }: { params: { id: string } }) {
  const { data: session } = useSodSession(userId, params.id);
  
  // ✅ Données déjà en cache → Affichage instantané
  return <div>{session?.name}</div>;
}
```

---

### **Scénario 2 : Données Statiques + Données Dynamiques**

```tsx
export default async function Page() {
  // ✅ Données statiques (cache long)
  const staticConfig = await fetch('/api/config', { 
    cache: 'force-cache' 
  });
  
  // ✅ Données dynamiques (cache court)
  const recentSessions = await fetch('/api/sessions/recent', { 
    next: { revalidate: 60 } // 1 minute
  });
  
  return (
    <div>
      <Config data={staticConfig} />
      <RecentSessions data={recentSessions} />
    </div>
  );
}
```

---

## 📈 Métriques de Performance Attendues

| Métrique | Avant | Après | Amélioration |
|----------|-------|-------|--------------|
| **TTFB (Time to First Byte)** | ~500ms | ~50ms | **90%** |
| **Navigation (Liste → Détails)** | ~1s | ~50ms | **95%** |
| **Changement de page (Pagination)** | ~200ms | ~10ms | **95%** |
| **Mémoire utilisée** | Variable | Contrôlée (gcTime) | Stable |

---

## 🔧 Checklist d'Implémentation

### **Phase 1 : Configuration de base**
- [x] Installer TanStack Query
- [x] Créer QueryProvider
- [x] Créer hooks de query (useSodSession, etc.)
- [ ] Wrapper l'app avec QueryProvider

### **Phase 2 : Migration progressive**
- [ ] Migrer useSodWorkflow vers TanStack Query
- [ ] Ajouter prefetching aux liens principaux
- [ ] Implémenter optimistic updates

### **Phase 3 : Optimisations avancées**
- [ ] Prefetch des pages adjacentes (pagination)
- [ ] Suspense + Streaming pour sections lourdes
- [ ] React.cache pour déduplication côté serveur

### **Phase 4 : Monitoring**
- [ ] Ajouter React Query DevTools (dev uniquement)
- [ ] Monitorer les temps de navigation
- [ ] Ajuster staleTime/gcTime selon usage

---

## 🧪 Exemple Complet d'Intégration

### **1. Wrapper l'app avec QueryProvider**

```tsx
// app/layout.tsx
import { QueryProvider } from 'lib/components/providers/QueryProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  );
}
```

---

### **2. Migrer un composant existant**

**Avant (state local) :**

```tsx
const [session, setSession] = useState<SodSession | null>(null);
const [loading, setLoading] = useState(false);

useEffect(() => {
  setLoading(true);
  fetch(`/api/sessions/${sessionId}`)
    .then(r => r.json())
    .then(setSession)
    .finally(() => setLoading(false));
}, [sessionId]);
```

**Après (TanStack Query) :**

```tsx
const { data: session, isLoading } = useSodSession(userId, sessionId);

// ✅ Cache automatique
// ✅ Stale-while-revalidate
// ✅ Pas de state management manuel
```

---

## 🎓 Ressources Supplémentaires

- [TanStack Query Docs](https://tanstack.com/query/latest)
- [Next.js Caching](https://nextjs.org/docs/app/building-your-application/caching)
- [React Cache API](https://react.dev/reference/react/cache)

---

## 💡 Conseils Avancés

### **1. Configurer staleTime selon le type de données**

```tsx
// Données rarement modifiées
{ staleTime: 30 * 60 * 1000 } // 30 minutes

// Données fréquemment modifiées
{ staleTime: 1 * 60 * 1000 }  // 1 minute

// Données en temps réel
{ staleTime: 0 }              // Toujours stale
```

---

### **2. Prefetch conditionnel**

```tsx
const { prefetchSession } = usePrefetchSodSession();

// ✅ Prefetch uniquement si pas déjà en cache
const handleHover = (sessionId: string) => {
  const cached = queryClient.getQueryData(sodQueryKeys.session(sessionId));
  if (!cached) {
    prefetchSession(sessionId);
  }
};
```

---

### **3. Utiliser React Query DevTools (développement)**

```tsx
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools initialIsOpen={false} />
      )}
    </QueryClientProvider>
  );
}
```

---

## ✅ Résumé des Bénéfices

| Fonctionnalité | Bénéfice |
|----------------|----------|
| **Cache automatique** | Pas de rechargement inutile |
| **Stale-while-revalidate** | UI instantanée, mise à jour en arrière-plan |
| **Prefetching** | Navigation instantanée |
| **gcTime** | Mémoire maîtrisée |
| **Optimistic Updates** | UX ultra-réactive |
| **Suspense/Streaming** | TTFB minimal |

---

**🚀 Avec ces optimisations, votre application aura des performances comparables aux SPAs modernes tout en conservant les avantages de Next.js (SEO, SSR, etc.).**



