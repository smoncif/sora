# Règle de Restriction des Ressources

## 📋 Vue d'ensemble

Cette règle définit le comportement de restriction/dé-restriction des ressources dans le système SoD (Segregation of Duties).

## 🎯 Règle Principale

**"Si au moins une valeur d'une ressource n'est plus restreinte → TOUTES les valeurs de cette ressource deviennent non restreintes"**

### Logique détaillée :

1. **Ressource entièrement restreinte** : Toutes les valeurs de la ressource sont dans le Set des restrictions
2. **Clic sur dé-restriction** : Si l'utilisateur clique pour dé-restreindre une ou plusieurs valeurs
3. **Application de la règle** : TOUTES les valeurs de cette ressource sont automatiquement dé-restreintes
4. **Propagation** : La ressource n'est plus restreinte → l'action n'est plus restreinte

## 🔧 Implémentation Technique

### Fichier : `lib/contexts/SodActionsContext.tsx`

```typescript
const toggleRestrictResource = useCallback((
  roleName: string,
  resourceCode: string,
  externalResourceCode: string,
  values: string[]
) => {
  const key = getResourceKey(roleName, resourceCode, externalResourceCode);
  const restrictedValuesSet = restrictedResourcesRef.current.get(key) || new Set<string>();
  
  // Vérifier si ces valeurs sont déjà restreintes
  const alreadyRestricted = values.every(v => restrictedValuesSet.has(v));
  
  if (alreadyRestricted) {
    // ✅ NOUVELLE RÈGLE : Retirer TOUTES les valeurs de cette ressource
    // Si au moins une valeur n'est plus restreinte → toute la ressource n'est plus restreinte
    restrictedResourcesRef.current.delete(key);
  } else {
    // ✅ RESTREINDRE : Ajouter les valeurs
    values.forEach(v => restrictedValuesSet.add(v));
    restrictedResourcesRef.current.set(key, restrictedValuesSet);
  }
  
  incrementVersion();
}, [getResourceKey, incrementVersion]);
```

## 📊 Exemple Concret

### Scénario Initial
```
Ressource S_C_FUNCT → ACTVT
├─ Valeur PADM : ✅ Restreinte
├─ Valeur ABC : ✅ Restreinte  
└─ Valeur XYZ : ✅ Restreinte

État : Ressource ENTIÈREMENT restreinte
```

### Action Utilisateur
```
Utilisateur clique sur "Dé-restreindre" pour la valeur PADM
```

### Résultat selon la Nouvelle Règle
```
Ressource S_C_FUNCT → ACTVT
├─ Valeur PADM : ❌ Non restreinte (dé-restriction demandée)
├─ Valeur ABC : ❌ Non restreinte (automatique via la règle)
└─ Valeur XYZ : ❌ Non restreinte (automatique via la règle)

État : Ressource ENTIÈREMENT non restreinte
```

### Propagation Automatique
```
Action SM51 (qui contient cette ressource)
├─ Avant : ✅ Restreinte
└─ Après : ❌ Non restreinte (propagation automatique)
```

## 🔄 Chaîne de Propagation

```
Valeur dé-restreinte
    ↓
Toutes les valeurs de la ressource dé-restreintes
    ↓
Ressource non restreinte
    ↓
Action non restreinte (via cleanupActionIfNeeded)
    ↓
Rôle non restreint (si toutes les actions sont non restreintes)
```

## ⚡ Avantages

1. **Simplicité utilisateur** : Un seul clic pour dé-restreindre toute une ressource
2. **Cohérence logique** : Une ressource ne peut pas être "partiellement" restreinte
3. **Performance** : Moins de calculs complexes pour gérer les états partiels
4. **Prévisibilité** : Comportement uniforme et prévisible

## 🔧 Fonctions Impactées

- `toggleRestrictResource` : Implémentation principale de la règle
- `cleanupActionIfNeeded` : Propagation vers les actions
- `isResourceRestricted` : Vérification de l'état des ressources
- `isActionRestricted` : Vérification de l'état des actions

## 📝 Notes de Développement

- La règle est appliquée uniquement lors de la **dé-restriction**
- La **restriction** fonctionne toujours par ajout de valeurs individuelles
- La propagation se fait automatiquement via `incrementVersion()`
- L'état est maintenu cohérent entre toutes les Maps du contexte

---

*Dernière mise à jour : 2025-01-27*
