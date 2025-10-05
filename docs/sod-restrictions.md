# 🚫 Système de Restrictions SoD - Documentation Technique

## 📋 Table des Matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Logique de Restriction](#logique-de-restriction)
4. [Propagation des Restrictions](#propagation-des-restrictions)
5. [Nettoyage Automatique](#nettoyage-automatique)
6. [Debug et Monitoring](#debug-et-monitoring)
7. [Optimisations de Performance](#optimisations-de-performance)

---

## 🎯 Vue d'ensemble

Le système de restrictions SoD permet de marquer des actions et ressources comme restreintes pour l'analyse de ségrégation des tâches. Il gère :

- ✅ **Restriction directe** : Clic sur le bouton 🚫 d'une action/ressource
- ✅ **Propagation** : Restriction automatique entre actions partageant les mêmes ressources
- ✅ **Nettoyage automatique** : Cohérence entre état visuel et état du contexte
- ✅ **Support des intervalles** : Gestion des plages de valeurs (ex: `ACTVT: 01 → 06`)

---

## 🏗️ Architecture

### **Fichiers Principaux**

```
lib/
├── contexts/
│   └── SodActionsContext.tsx          # État global des restrictions
├── utils/
│   ├── sodStateApplication.ts         # Application de l'état aux données
│   └── sodResourceUtils.ts            # Utilitaires pour les ressources
└── types/
    └── sodAnalysis.ts                 # Interfaces TypeScript

app/
└── dashboard/analysis/sod/
    └── page.tsx                       # Page principale avec debug
```

### **État Global (Context)**

```typescript
// lib/contexts/SodActionsContext.tsx

interface SodActionsContextValue {
  // 📦 État (Refs pour performance)
  deletedActions: Map<string, boolean>;
  restrictedActions: Map<string, { restrictedByAction: boolean }>;
  restrictedResources: Map<string, Set<string>>;
  version: number; // ✅ Compteur pour forcer re-render
  
  // 🔧 Actions
  toggleDeleteAction: (roleName: string, actionCode: string) => void;
  toggleRestrictAction: (roleName: string, actionCode: string, resources: any[]) => void;
  toggleRestrictResource: (roleName: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[]) => void;
  resetState: () => void;
  
  // 🔍 Vérifications
  isActionDeleted: (roleName: string, actionCode: string) => boolean;
  isActionRestricted: (roleName: string, actionCode: string) => { isRestricted: boolean; restrictedByAction: boolean };
  isResourceRestricted: (roleName: string, resourceCode: string, externalResourceCode: string, values: string[]) => boolean;
}
```

### **Structure des Clés**

```typescript
// Actions et Ressources sont identifiées par des clés uniques
getActionKey(roleName, actionCode) 
  → "SAP_ABAP_CHANNELS_ADMIN|SM51"

getResourceKey(roleName, resourceCode, externalResourceCode)
  → "SAP_ABAP_CHANNELS_ADMIN|S_ADMI_FCD|S_ADMI_FCD"
```

---

## 🔄 Logique de Restriction

### **1. Restriction d'une Action**

```typescript
// lib/contexts/SodActionsContext.tsx : toggleRestrictAction

toggleRestrictAction(roleName, actionCode, resources) {
  // ✅ ÉTAPE 1 : Nettoyage préalable (si action n'a plus de ressources)
  cleanupActionIfNeeded(roleName, actionCode, resources);
  
  // ✅ ÉTAPE 2 : Vérifier l'état actuel
  const actionDirectlyRestricted = restrictedActionsRef.current.get(key);
  const hasRestrictedResource = /* Vérifier si ressources restreintes */;
  const isCurrentlyRestricted = actionDirectlyRestricted || hasRestrictedResource;
  
  if (isCurrentlyRestricted) {
    // ❌ Dé-restreindre
    restrictedActionsRef.delete(key);
    // Retirer toutes les valeurs des ressources non-S_TCODE
  } else {
    // ✅ Restreindre
    restrictedActionsRef.set(key, { restrictedByAction: true });
    deletedActionsRef.delete(key);
    // Ajouter toutes les valeurs des ressources non-S_TCODE
  }
  
  incrementVersion(); // Force re-render
}
```

### **2. Restriction d'une Ressource**

```typescript
// lib/contexts/SodActionsContext.tsx : toggleRestrictResource

toggleRestrictResource(roleName, actionCode, resourceCode, externalResourceCode, values) {
  const resKey = getResourceKey(roleName, resourceCode, externalResourceCode);
  const restrictedValuesSet = restrictedResourcesRef.current.get(resKey) || new Set();
  
  // Toggle chaque valeur
  const allRestricted = values.every(v => restrictedValuesSet.has(v));
  
  if (allRestricted) {
    // ❌ Dé-restreindre : retirer les valeurs
    values.forEach(v => restrictedValuesSet.delete(v));
  } else {
    // ✅ Restreindre : ajouter les valeurs
    values.forEach(v => restrictedValuesSet.add(v));
  }
  
  // Nettoyer si plus de valeurs
  if (restrictedValuesSet.size === 0) {
    restrictedResourcesRef.delete(resKey);
  } else {
    restrictedResourcesRef.set(resKey, restrictedValuesSet);
  }
  
  // ✅ CLEANUP : Vérifier si l'action parent doit être nettoyée
  cleanupActionIfNeeded(roleName, actionCode, allResources);
  
  incrementVersion();
}
```

### **3. État Visuel (Application)**

```typescript
// lib/utils/sodStateApplication.ts : applyStateToAction

function applyStateToAction(action, roleName, state) {
  const { isRestricted, restrictedByAction } = state.isActionRestricted(roleName, action.code);
  
  // Vérifier si au moins une ressource non-S_TCODE est restreinte
  const hasRestrictedResource = action.resources.some(r => 
    r.code !== 'S_TCODE' && r.isRestricted
  );
  
  // ✅ LOGIQUE CORRIGÉE :
  // - Si restreinte directement (restrictedByAction = true),
  //   son état visuel dépend UNIQUEMENT de ses ressources
  // - Sinon, elle peut être restreinte directement OU via ses ressources
  const finalIsRestricted = restrictedByAction 
    ? hasRestrictedResource 
    : (isRestricted || hasRestrictedResource);
  
  return {
    ...action,
    isRestricted: finalIsRestricted,
    restrictedByAction,
  };
}
```

---

## 🔗 Propagation des Restrictions

### **Scénario : Actions partageant une ressource**

```
Rôle: SAP_ABAP_CHANNELS_ADMIN

Action SM51:
  └── Ressource S_ADMI_FCD:
      └── Valeurs: PADM, ABC

Action CCC:
  └── Ressource S_ADMI_FCD:
      └── Valeurs: ABC
```

### **Cas 1 : Restriction Directe de SM51**

```typescript
// 1. Clic sur 🚫 de SM51
toggleRestrictAction("SAP_ABAP_CHANNELS_ADMIN", "SM51", [...resources])

// 2. État du contexte
restrictedActionsRef:
  "SAP_ABAP_CHANNELS_ADMIN|SM51" → { restrictedByAction: true }

restrictedResourcesRef:
  "SAP_ABAP_CHANNELS_ADMIN|S_ADMI_FCD|S_ADMI_FCD" → Set(["PADM", "ABC"])

// 3. Propagation visuelle à CCC
applyStateToAction(CCC):
  - isRestricted = false (pas dans restrictedActionsRef)
  - hasRestrictedResource = true (ABC est dans restrictedResourcesRef)
  - finalIsRestricted = false || true = true ✅
  → CCC devient jaune (restreinte par propagation)
```

### **Cas 2 : Dé-restriction de CCC**

```typescript
// 1. Clic sur 🚫 de CCC
toggleRestrictAction("SAP_ABAP_CHANNELS_ADMIN", "CCC", [...resources])

// 2. Retrait de ABC de restrictedResourcesRef
restrictedResourcesRef:
  "SAP_ABAP_CHANNELS_ADMIN|S_ADMI_FCD|S_ADMI_FCD" → Set(["PADM"]) // ABC retiré

// 3. Impact sur SM51 (nettoyage automatique)
cleanupActionIfNeeded("SAP_ABAP_CHANNELS_ADMIN", "SM51", [...resources]):
  - hasRestrictedResource = false (PADM seul ≠ PADM+ABC toutes restreintes)
  - restrictedActionsRef.delete("SAP_ABAP_CHANNELS_ADMIN|SM51") ✅

// 4. État visuel
applyStateToAction(SM51):
  - isRestricted = false (retiré de restrictedActionsRef)
  - hasRestrictedResource = false
  - finalIsRestricted = false ✅
  → SM51 devient blanche
```

---

## 🧹 Nettoyage Automatique

### **Fonction `cleanupActionIfNeeded`**

```typescript
// lib/contexts/SodActionsContext.tsx

const cleanupActionIfNeeded = useCallback((roleName, actionCode, resources) => {
  const key = getActionKey(roleName, actionCode);
  const restriction = restrictedActionsRef.current.get(key);
  
  // ✅ Ne nettoyer que si restreinte directement
  if (!restriction || !restriction.restrictedByAction) {
    return;
  }
  
  // ✅ Vérifier si au moins une ressource non-S_TCODE est encore restreinte
  const hasRestrictedResource = resources.some(resource => {
    if (resource.code === 'S_TCODE') return false;
    
    return resource.externalResources?.some(extRes => {
      const values = extractExternalResourceValues(extRes);
      const resKey = getResourceKey(roleName, resource.code, extRes.code);
      const restrictedValuesSet = restrictedResourcesRef.current.get(resKey);
      
      // Toutes les valeurs doivent être dans le set
      return values.length > 0 && values.every(v => restrictedValuesSet.has(v));
    });
  });
  
  // ✅ Si plus de ressources restreintes, nettoyer l'action
  if (!hasRestrictedResource) {
    restrictedActionsRef.current.delete(key);
  }
}, [getActionKey, getResourceKey]);
```

### **Moments de Nettoyage**

1. **Avant `toggleRestrictAction`** : Évite les états incohérents
2. **Après `toggleRestrictResource`** : Maintient la cohérence parent-enfant

---

## 🐛 Debug et Monitoring

### **Section Debug dans l'UI**

```tsx
// app/dashboard/analysis/sod/page.tsx

<Accordion>
  <AccordionSummary>
    🐛 Debug - État des Restrictions
    [X supprimées] [Y actions restreintes] [Z ressources restreintes]
  </AccordionSummary>
  
  <AccordionDetails>
    {/* 1. Actions supprimées */}
    <Paper>
      🗑️ Actions Supprimées (X)
      - ROLE → ACTION
    </Paper>
    
    {/* 2. Actions restreintes */}
    <Paper>
      🚫 Actions Restreintes (Y)
      - ROLE → ACTION
        🚫 Directe (restrictedByAction = true)
        🔗 Propagation (via ressources)
    </Paper>
    
    {/* 3. Ressources restreintes */}
    <Paper>
      🔒 Ressources Restreintes (Z)
      - ROLE → RESOURCE → EXTERNAL_RESOURCE
        [VALEUR1] [VALEUR2] ...
    </Paper>
  </AccordionDetails>
</Accordion>
```

### **Calcul des Actions Restreintes (Debug)**

```typescript
// app/dashboard/analysis/sod/page.tsx : allRestrictedActions

const allRestrictedActions = useMemo(() => {
  const result = new Map();
  
  [...simpleRoles, ...compositeRoles].forEach(role => {
    role.risks.forEach(risk => {
      risk.functions.forEach(func => {
        func.actions.forEach(action => {
          const key = `${role.roleName}|${action.code}`;
          
          // ✅ Utiliser la MÊME LOGIQUE que applyStateToAction
          const { isRestricted, restrictedByAction } = isActionRestricted(role.roleName, action.code);
          
          const hasRestrictedResource = action.resources.some(resource => {
            if (resource.code === 'S_TCODE') return false;
            
            return resource.externalResources?.some(extRes => {
              const values = extractExternalResourceValues(extRes);
              return isResourceRestricted(role.roleName, resource.code, extRes.code, values);
            });
          });
          
          // ✅ Calculer l'état visuel final
          const finalIsRestricted = restrictedByAction 
            ? hasRestrictedResource 
            : (isRestricted || hasRestrictedResource);
          
          // ✅ N'ajouter que si visuellement restreinte
          if (finalIsRestricted) {
            result.set(key, { 
              directlyRestricted: restrictedByAction, 
              viaResources: hasRestrictedResource 
            });
          }
        });
      });
    });
  });
  
  return result;
}, [simpleRoles, compositeRoles, isActionRestricted, isResourceRestricted, version]);
```

---

## ⚡ Optimisations de Performance

### **1. Réutilisation d'Objets**

```typescript
// lib/utils/sodStateApplication.ts

function applyStateToResource(resource, roleName, state) {
  // ✅ Calculer le nouvel état
  let isRestricted = false;
  for (const extRes of resource.externalResources || []) {
    const values = extractExternalResourceValues(extRes);
    if (state.isResourceRestricted(roleName, resource.code, extRes.code, values)) {
      isRestricted = true;
      break;
    }
  }
  
  // ✅ Si état inchangé, retourner l'objet original (même référence)
  if (resource.isRestricted === isRestricted && resource.isDeleted === false) {
    return resource; // ⚡ React.memo ne détectera pas de changement
  }
  
  // ❌ Sinon, créer un nouvel objet
  return {
    ...resource,
    isRestricted,
    isDeleted: false,
  };
}
```

### **2. Version Counter**

```typescript
// lib/contexts/SodActionsContext.tsx

const [version, setVersion] = useState(0);
const incrementVersion = useCallback(() => {
  setVersion(v => v + 1);
}, []);

// ✅ Chaque modification incrémente la version
toggleRestrictAction(...) {
  // ... modifications ...
  incrementVersion(); // Force re-render des useMemo
}

// ✅ useMemo dépend de la version
const paginatedSimpleRoles = useMemo(() => {
  return applyStateToSimpleRoles(paginatedSimpleRolesRaw, actionsState);
}, [paginatedSimpleRolesRaw, actionsState, version]);
```

### **3. React.memo et Stabilité des Callbacks**

```typescript
// app/dashboard/analysis/sod/page.tsx

// ✅ Destructurer pour avoir des fonctions stables
const {
  toggleDeleteAction,
  toggleRestrictAction,
  toggleRestrictResource,
  isActionDeleted,
  isActionRestricted,
  isResourceRestricted,
  version,
} = useSodActionsContext();

// ✅ Callbacks ne dépendent que de fonctions stables
const handleDeleteAction = useCallback((roleName, riskId, actionCode) => {
  toggleDeleteAction(roleName, actionCode);
}, [toggleDeleteAction]);

const handleRestrictAction = useCallback((roleName, riskId, actionCode, resources) => {
  toggleRestrictAction(roleName, actionCode, resources);
}, [toggleRestrictAction]);
```

---

## 📚 Références

### **Fichiers Importants**

- `lib/contexts/SodActionsContext.tsx` : État global
- `lib/utils/sodStateApplication.ts` : Application de l'état
- `lib/utils/sodResourceUtils.ts` : Utilitaires ressources
- `app/dashboard/analysis/sod/page.tsx` : UI et debug

### **Fonctions Clés**

- `toggleRestrictAction` : Toggle restriction action + propagation
- `toggleRestrictResource` : Toggle restriction ressource + cleanup
- `cleanupActionIfNeeded` : Nettoyage automatique actions
- `applyStateToAction` : Calcul état visuel action
- `applyStateToResource` : Calcul état visuel ressource
- `extractExternalResourceValues` : Extraction valeurs + intervalles

---

## 🎯 Règles de Cohérence

### ✅ **DO**

1. **Toujours passer `resources` à `toggleRestrictAction`** pour la propagation
2. **Appeler `cleanupActionIfNeeded` après toute modification de ressource**
3. **Utiliser `extractExternalResourceValues` pour gérer les intervalles**
4. **Retourner l'objet original si état inchangé** (performance)
5. **Incrémente `version` après chaque modification** (force re-render)

### ❌ **DON'T**

1. **Ne pas modifier `restrictedActionsRef` sans `incrementVersion`**
2. **Ne pas dupliquer la logique de `applyStateToAction`** (debug doit utiliser la même)
3. **Ne pas oublier de nettoyer les `Set` vides** dans `restrictedResourcesRef`
4. **Ne pas forcer `isRestricted` basé sur `restrictedByAction`** (laisser `applyStateToAction` décider)
5. **Ne pas comparer les objets avec `JSON.stringify`** si possible (performance)

---

**Dernière mise à jour** : 2025-10-05  
**Version** : 2.0 (Avec nettoyage automatique et cohérence contexte/visuel)

