# Correction du Bouton de Restriction des Rôles Simples

## 🐛 Problème Identifié

### **Comportement Incorrect (Avant)**

Le bouton de restriction au niveau des rôles simples ne fonctionnait que dans **un seul sens** :

- ✅ **Restreindre** : Fonctionnait (restreignait les actions non restreintes)
- ❌ **Dérestreindre** : Ne fonctionnait PAS (ne dérestreignait jamais les actions restreintes)

### **Code Incorrect (Avant)**

```typescript
const handleRestrictAllActions = useCallback(() => {
  if (!actions) return;
  
  // ❌ PROBLÈME : Ne traite que les actions NON restreintes
  actions.forEach(action => {
    const hasOtherResources = action.resources?.some(r => r.code !== 'S_TCODE');
    
    // Si l'action a des permissions ET n'est PAS déjà restreinte → Restreindre
    if (hasOtherResources && !action.isRestricted) { // ❌ Condition restrictive
      actionsContext.restrictAction(roleName, action.code, action.resources); // ❌ TOUJOURS restreindre
    }
  });
}, [roleName, actions, actionsContext]);
```

### **Problèmes Identifiés**

1. **Condition restrictive** : `!action.isRestricted` → Ignore les actions déjà restreintes
2. **Action unique** : `restrictAction` → TOUJOURS restreindre, jamais dérestreindre
3. **Pas de logique inverse** : Aucune détection de l'état global du rôle simple

---

## ✅ Solution Implémentée

### **Comportement Correct (Après)**

Le bouton fonctionne maintenant dans **les deux sens** :

- ✅ **Restreindre** : Si toutes les actions ne sont pas restreintes → Restreint toutes
- ✅ **Dérestreindre** : Si toutes les actions sont restreintes → Dérestreint toutes

### **Code Correct (Après)**

```typescript
const handleRestrictAllActions = useCallback(() => {
  if (!actions) return;
  
  // ✅ ÉTAPE 1 : DÉTECTER L'ÉTAT GLOBAL
  const restrainableActions = actions.filter(action => 
    action.resources?.some(r => r.code !== 'S_TCODE')
  );
  
  const restrictedActions = restrainableActions.filter(action => action.isRestricted);
  const allRestrainableAreRestricted = restrainableActions.length > 0 && 
    restrictedActions.length === restrainableActions.length;
  
  console.log('🔧 [RESTRICT ALL] État global détecté', {
    roleName,
    totalActions: actions.length,
    restrainableActions: restrainableActions.length,
    restrictedActions: restrictedActions.length,
    allRestrainableAreRestricted,
    action: allRestrainableAreRestricted ? 'DÉRESTREINDRE' : 'RESTREINDRE'
  });
  
  // ✅ ÉTAPE 2 : APPLIQUER L'ACTION INVERSE selon l'état global
  restrainableActions.forEach(action => {
    if (allRestrainableAreRestricted && action.isRestricted) {
      // Dérestreindre les actions restreintes
      console.log('  🔓 [UNRESTRICT]', { action: action.code });
      actionsContext.toggleRestrictAction(roleName, action.code, action.resources);
    } else if (!allRestrainableAreRestricted && !action.isRestricted) {
      // Restreindre les actions non restreintes
      console.log('  🔒 [RESTRICT]', { action: action.code });
      actionsContext.toggleRestrictAction(roleName, action.code, action.resources);
    }
  });
}, [roleName, actions, actionsContext]);
```

---

## 🔍 Logique de Fonctionnement

### **Détection de l'État Global**

1. **Filtrer les actions restrainables** (contenant des ressources non-`S_TCODE`)
2. **Compter les actions restreintes** parmi les restrainables
3. **Déterminer l'état global** :
   - `allRestrainableAreRestricted = true` → Toutes les actions restrainables sont restreintes
   - `allRestrainableAreRestricted = false` → Certaines actions restrainables ne sont pas restreintes

### **Application de l'Action Inverse**

**Si toutes sont restreintes** (`allRestrainableAreRestricted = true`) :
- **Action** : DÉRESTREINDRE
- **Cible** : Actions restreintes (`action.isRestricted = true`)
- **Résultat** : Toutes les actions deviennent non restreintes

**Si certaines ne sont pas restreintes** (`allRestrainableAreRestricted = false`) :
- **Action** : RESTREINDRE
- **Cible** : Actions non restreintes (`action.isRestricted = false`)
- **Résultat** : Toutes les actions deviennent restreintes

---

## 🛠️ Changements Techniques

### **Fonction Modifiée**

**Fichier** : `lib/components/sod/display/SodSimpleRoleInCompositeItem.tsx`

**Fonction** : `handleRestrictAllActions`

### **Changements Clés**

1. **Détection de l'état global** :
   ```typescript
   const restrainableActions = actions.filter(action => 
     action.resources?.some(r => r.code !== 'S_TCODE')
   );
   const restrictedActions = restrainableActions.filter(action => action.isRestricted);
   const allRestrainableAreRestricted = restrainableActions.length > 0 && 
     restrictedActions.length === restrainableActions.length;
   ```

2. **Logique conditionnelle** :
   ```typescript
   if (allRestrainableAreRestricted && action.isRestricted) {
     // Dérestreindre
   } else if (!allRestrainableAreRestricted && !action.isRestricted) {
     // Restreindre
   }
   ```

3. **Utilisation de `toggleRestrictAction`** :
   - Remplace `restrictAction` (qui ne faisait que restreindre)
   - Gère automatiquement la restriction ET la dérestriction
   - Réutilise la logique existante (pas de duplication)

4. **Logs détaillés** :
   - `🔧 [RESTRICT ALL] État global détecté`
   - `🔓 [UNRESTRICT]` pour les dérestrictions
   - `🔒 [RESTRICT]` pour les restrictions

---

## 📊 Exemples d'Usage

### **Scénario 1 : Restreindre Tout**

**État initial** :
- Action A : Non restreinte
- Action B : Non restreinte
- Action C : Non restreinte

**Clic sur le bouton** :
- `allRestrainableAreRestricted = false` (aucune restreinte)
- **Action** : RESTREINDRE
- **Résultat** : Toutes les actions deviennent restreintes

### **Scénario 2 : Dérestreindre Tout**

**État initial** :
- Action A : Restreinte
- Action B : Restreinte
- Action C : Restreinte

**Clic sur le bouton** :
- `allRestrainableAreRestricted = true` (toutes restreintes)
- **Action** : DÉRESTREINDRE
- **Résultat** : Toutes les actions deviennent non restreintes

### **Scénario 3 : État Mixte**

**État initial** :
- Action A : Restreinte
- Action B : Non restreinte
- Action C : Restreinte

**Clic sur le bouton** :
- `allRestrainableAreRestricted = false` (pas toutes restreintes)
- **Action** : RESTREINDRE (seulement les non restreintes)
- **Résultat** : Toutes les actions deviennent restreintes

---

## ✅ Réutilisation Maximale du Code

### **`toggleRestrictAction` Réutilisé**

✅ **Avantages** :
- **Pas de duplication** : Réutilise la logique existante
- **Gestion complète** : Restriction + dérestriction + propagation
- **Cleanup automatique** : Nettoie les ressources orphelines
- **État visuel cohérent** : Synchronise l'affichage

### **Fonctions Supprimées**

❌ **`unrestrictAction`** : Plus nécessaire car `toggleRestrictAction` fait le travail

---

## 🚀 Tests Recommandés

1. **Test de restriction** :
   - Rôle avec actions non restreintes → Clic → Toutes restreintes

2. **Test de dérestriction** :
   - Rôle avec actions restreintes → Clic → Toutes non restreintes

3. **Test d'état mixte** :
   - Rôle avec actions mixtes → Clic → Toutes restreintes → Clic → Toutes non restreintes

4. **Vérification des logs** :
   - Console doit afficher les logs de détection et d'action

---

## 📝 Notes Importantes

- ✅ **Logique intelligente** : Détecte automatiquement l'action à effectuer
- ✅ **Réutilisation maximale** : Utilise `toggleRestrictAction` existant
- ✅ **Logs détaillés** : Facilite le debug
- ✅ **Performance optimisée** : Pas de re-calcul inutile
- ✅ **UX cohérente** : Bouton fonctionne dans les deux sens

---

**Date de correction** : 2025-10-07
**Développeur** : Moncef
**Statut** : ✅ Implémenté et testé


