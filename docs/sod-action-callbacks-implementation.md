# Implémentation des Callbacks pour les Actions SoD

## ✅ État actuel

### Composants mis à jour :
1. **`SodActionItem.tsx`** ✅ 
   - Accepte `onDelete` et `onRestrict` callbacks
   - Affiche les états visuels (rouge/orange)
   - Propage les états aux ressources

2. **`SodResourceItem.tsx`** ✅
   - Affiche les états visuels selon `isDeleted`/`isRestricted`

3. **`lib/types/sodAnalysis.ts`** ✅
   - Types `SodAction` et `SodResource` incluent `isDeleted` et `isRestricted`

4. **`useSodActionState.ts`** ✅
   - Hook pour gérer l'état des actions
   - Fonctions `handleDeleteAction` et `handleRestrictAction`

## 🔧 Ce qu'il reste à faire

### 1. Propager les callbacks dans la hiérarchie

#### A. `SodFunctionGrid.tsx`
```typescript
export interface SodFunctionGridProps {
  functions: SodSimpleRoleFunction[];
  defaultExpanded?: boolean;
  roleName?: string;  // AJOUTER
  riskId?: string;    // AJOUTER
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string) => void;  // AJOUTER
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string) => void; // AJOUTER
}

// Dans le render, passer aux actions :
<SodActionItem
  action={action}
  onDelete={(code) => onDeleteAction?.(roleName, riskId, code)}
  onRestrict={(code) => onRestrictAction?.(roleName, riskId, code)}
/>
```

#### B. `SodRiskSection.tsx`
```typescript
// Props déjà ajoutées ✅
// Dans le render, passer à SodFunctionGrid :
<SodFunctionGrid
  functions={functions}
  roleName={roleName}
  riskId={riskId}
  onDeleteAction={onDeleteAction}
  onRestrictAction={onRestrictAction}
/>
```

#### C. `SodSimpleRoleCard.tsx`
```typescript
// Props déjà ajoutées ✅
// Dans le render, passer à SodRiskSection :
<SodRiskSection
  risk={risk}
  roleName={roleName}
  onDeleteAction={onDeleteAction}
  onRestrictAction={onRestrictAction}
/>
```

### 2. Utiliser le hook dans la page

#### `app/dashboard/analysis/sod/page.tsx`
```typescript
import { useSodActionState } from 'lib/hooks/sod/useSodActionState';

// Dans le composant :
const { 
  roles: simpleRolesWithState, 
  handleDeleteAction, 
  handleRestrictAction 
} = useSodActionState(session?.simpleRoles?.roles || []);

// Passer aux cartes :
<SodSimpleRoleCard
  role={role}
  onDeleteAction={handleDeleteAction}
  onRestrictAction={handleRestrictAction}
/>
```

### 3. Faire pareil pour les rôles composites

#### Composants à mettre à jour :
- `SodCompositeFunctionGrid.tsx`
- `SodSimpleRoleInCompositeItem.tsx`
- `SodCompositeRiskSection.tsx`
- `SodCompositeRoleCard.tsx`

## 🎨 Résultat attendu

Une fois implémenté, cliquer sur les boutons 🗑️ et 🚫 changera visuellement :
- **Action supprimée** → Fond rouge + Badge Action gris
- **Action restreinte** → Fond orange + Badge Permission gris (si toutes ressources non-S_TCODE restreintes)
- **Ressources** → Héritent de l'état de l'action

## 📝 Notes

- L'état est géré localement dans chaque étape (Step 1, Step 2)
- Les changements ne sont PAS sauvegardés automatiquement
- Pour sauvegarder, il faudra implémenter un bouton "Sauvegarder" qui exporte les données modifiées

