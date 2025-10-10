# 🐛 Guide de Debug - Remédiation Rôles Composites

## 📋 Vue d'Ensemble

Ce document explique comment utiliser les logs de debug pour tracer la remédiation des rôles composites (ÉTAPE 2).

---

## 🔍 Structure des Logs

Les logs suivent une hiérarchie à 3 niveaux :

```
🔍 [COMPOSITE ROLE] ← Niveau Rôle
  └─ 🔍 [COMPOSITE RISK] ← Niveau Risque
      └─ 🔍 [COMPOSITE FUNCTION] ← Niveau Fonction
          └─ ✅/❌ [SIMPLE ROLE] ← Niveau Rôle Simple (Étape 1)
```

---

## 📊 Types de Logs

### 1. **Niveau Rôle Composite** 🏢

#### Log de début
```javascript
🔍 [COMPOSITE ROLE] Début calcul remédiation
{
  compositeRoleName: "Z_FULL_ADMIN",
  totalRisks: 4
}
```

#### Log par risque
```javascript
  ✅ [RISK] { riskId: "SOD-FIN-001", remediatedFunctions: 2, totalFunctions: 2, percentage: 100 }
  ❌ [RISK] { riskId: "SOD-FIN-002", remediatedFunctions: 1, totalFunctions: 2, percentage: 50 }
```

#### Log de résultat final
```javascript
✅ [COMPOSITE ROLE] Résultat final
{
  compositeRoleName: "Z_FULL_ADMIN",
  isRemediated: true,
  totalRisks: 4,
  remediatedRisks: 4,
  remediationPercentage: 100,
  details: [
    { riskId: "SOD-FIN-001", isRemediated: true, ... },
    { riskId: "SOD-FIN-002", isRemediated: true, ... }
  ]
}
```

---

### 2. **Niveau Risque Composite** ⚠️

#### Log de début
```javascript
🔍 [COMPOSITE RISK] Début calcul remédiation
{
  compositeRoleName: "Z_FULL_ADMIN",
  totalFunctions: 2
}
```

#### Log par fonction
```javascript
  ✅ [FUNCTION] { functionCode: "BAS-BS11", remediatedSimpleRoles: 2, totalSimpleRoles: 2 }
  ❌ [FUNCTION] { functionCode: "BAS-BS12", remediatedSimpleRoles: 1, totalSimpleRoles: 2 }
```

#### Log de résultat final
```javascript
✅ [COMPOSITE RISK] Résultat final
{
  isRemediated: true,
  totalFunctions: 2,
  remediatedFunctions: 1,  // AU MOINS UNE suffit !
  remediationPercentage: 50,
  details: [
    { functionCode: "BAS-BS11", isRemediated: true, ... },
    { functionCode: "BAS-BS12", isRemediated: false, ... }
  ]
}
```

---

### 3. **Niveau Fonction Composite** 📋

#### Log de début
```javascript
🔍 [COMPOSITE FUNCTION] Début calcul remédiation
{
  compositeRoleName: "Z_FULL_ADMIN",
  functionCode: "BAS-BS11",
  totalSimpleRoles: 2
}
```

#### Log rôle simple exclu
```javascript
⏭️ [COMPOSITE FUNCTION] Rôle simple exclu (ignoré)
{
  functionCode: "BAS-BS11",
  simpleRoleName: "ZFI_BASIC"
}
```

#### Log par rôle simple
```javascript
  ✅ [SIMPLE ROLE] { roleName: "ZFI_ADMIN", isRemediated: true, totalActions: 5, remediatedActions: 5 }
  ❌ [SIMPLE ROLE] { roleName: "ZFI_BASIC", isRemediated: false, totalActions: 7, remediatedActions: 3 }
```

#### Log de court-circuit
```javascript
🛑 [COMPOSITE FUNCTION] Court-circuit : fonction NON remediée
{
  functionCode: "BAS-BS11",
  totalSimpleRoles: 2,
  remediatedSimpleRoles: 1,
  blockedBy: "ZFI_BASIC"  // Ce rôle bloque la remédiation
}
```

#### Log de résultat final
```javascript
✅ [COMPOSITE FUNCTION] Résultat final
{
  functionCode: "BAS-BS11",
  isRemediated: true,
  totalSimpleRoles: 2,
  remediatedSimpleRoles: 2,
  details: [
    { roleName: "ZFI_ADMIN", isRemediated: true, ... },
    { roleName: "ZFI_BASIC", isRemediated: true, ... }
  ]
}
```

---

## 🎯 Scénarios de Debug Courants

### Scénario 1 : Rôle composite non remedié

**Problème** : Le badge affiche "0% Remedié" alors que des actions ont été supprimées.

**Vérification** :
1. Chercher le log du rôle composite :
   ```
   ❌ [COMPOSITE ROLE] Résultat final
   ```
2. Identifier quel risque bloque :
   ```
   ❌ [RISK] { riskId: "SOD-FIN-002", ... }
   ```
3. Descendre au niveau fonction :
   ```
   ❌ [FUNCTION] { functionCode: "BAS-BS12", ... }
   ```
4. Trouver le rôle simple bloquant :
   ```
   ❌ [SIMPLE ROLE] { roleName: "ZFI_BASIC", ... }
   ```

**Solution** : Remedier les actions du rôle simple `ZFI_BASIC`.

---

### Scénario 2 : Fonction composite non remediée malgré actions supprimées

**Problème** : Une fonction reste rouge même après suppression d'actions.

**Vérification** :
1. Chercher le log de la fonction :
   ```javascript
   🔍 [COMPOSITE FUNCTION] Début calcul remédiation
   { functionCode: "BAS-BS11", totalSimpleRoles: 3 }
   ```
2. Vérifier les rôles simples :
   ```javascript
   ✅ [SIMPLE ROLE] { roleName: "A", isRemediated: true }
   ✅ [SIMPLE ROLE] { roleName: "B", isRemediated: true }
   ❌ [SIMPLE ROLE] { roleName: "C", isRemediated: false }  ← Bloquant
   ```

**Causes possibles** :
- Le rôle simple "C" n'a pas toutes ses actions supprimables supprimées
- Le rôle simple "C" n'a pas toutes ses actions restrainables restreintes
- Le rôle simple "C" est peut-être exclu (vérifier `⏭️ [COMPOSITE FUNCTION] Rôle simple exclu`)

---

### Scénario 3 : Court-circuit inattendu

**Problème** : La fonction s'arrête au premier rôle simple.

**Log attendu** :
```javascript
🛑 [COMPOSITE FUNCTION] Court-circuit : fonction NON remediée
{
  functionCode: "BAS-BS11",
  blockedBy: "ZFI_BASIC"
}
```

**Vérification** :
- Le rôle simple bloquant est-il vraiment non remedié ?
- Vérifier dans les logs de l'Étape 1 (Rôles Simples) l'état de ce rôle

---

### Scénario 4 : Risque remedié trop facilement

**Problème** : Le risque est vert alors qu'une seule fonction sur 4 est remediée.

**Log attendu (NORMAL)** :
```javascript
✅ [COMPOSITE RISK] Résultat final
{
  isRemediated: true,
  totalFunctions: 4,
  remediatedFunctions: 1,  // ✅ AU MOINS UNE suffit !
  remediationPercentage: 25
}
```

**Note** : C'est le comportement attendu ! Un risque est remedié dès qu'**AU MOINS UNE** fonction est remediée.

---

## 📌 Filtrage des Logs dans la Console

### Filtrer par niveau
```javascript
// Voir uniquement les rôles composites
[COMPOSITE ROLE]

// Voir uniquement les risques
[COMPOSITE RISK]

// Voir uniquement les fonctions
[COMPOSITE FUNCTION]

// Voir uniquement les rôles simples
[SIMPLE ROLE]
```

### Filtrer par état
```javascript
// Voir uniquement les succès
✅

// Voir uniquement les échecs
❌

// Voir uniquement les exclusions
⏭️

// Voir uniquement les courts-circuits
🛑
```

### Filtrer par nom
```javascript
// Voir un rôle composite spécifique
compositeRoleName: "Z_FULL_ADMIN"

// Voir un risque spécifique
riskId: "SOD-FIN-001"

// Voir une fonction spécifique
functionCode: "BAS-BS11"

// Voir un rôle simple spécifique
roleName: "ZFI_BASIC"
```

---

## 🔧 Commandes Console Utiles

### Compter les logs par type
```javascript
// Dans la console DevTools
console.count('[COMPOSITE ROLE]')
console.count('[COMPOSITE RISK]')
console.count('[COMPOSITE FUNCTION]')
```

### Activer/Désactiver les logs
Pour désactiver temporairement les logs, ajouter au début du fichier `SodActionsContext.tsx` :

```typescript
const DEBUG_COMPOSITE_REMEDIATION = false; // ou true

// Puis dans chaque fonction
if (DEBUG_COMPOSITE_REMEDIATION) {
  console.log(...);
}
```

---

## 📊 Exemple Complet de Trace

```javascript
// DÉBUT - Calcul rôle composite
🔍 [COMPOSITE ROLE] Début calcul remédiation
{ compositeRoleName: "Z_FULL_ADMIN", totalRisks: 2 }

  // RISQUE 1
  🔍 [COMPOSITE RISK] Début calcul remédiation
  { compositeRoleName: "Z_FULL_ADMIN", totalFunctions: 2 }
  
    // FONCTION 1.1
    🔍 [COMPOSITE FUNCTION] Début calcul remédiation
    { compositeRoleName: "Z_FULL_ADMIN", functionCode: "BAS-BS11", totalSimpleRoles: 2 }
    
      ✅ [SIMPLE ROLE] { roleName: "ZFI_ADMIN", isRemediated: true, totalActions: 5, remediatedActions: 5 }
      ✅ [SIMPLE ROLE] { roleName: "ZFI_BASIC", isRemediated: true, totalActions: 7, remediatedActions: 7 }
    
    ✅ [COMPOSITE FUNCTION] Résultat final
    { functionCode: "BAS-BS11", isRemediated: true, totalSimpleRoles: 2, remediatedSimpleRoles: 2 }
    
    // FONCTION 1.2
    🔍 [COMPOSITE FUNCTION] Début calcul remédiation
    { compositeRoleName: "Z_FULL_ADMIN", functionCode: "BAS-BS12", totalSimpleRoles: 1 }
    
      ❌ [SIMPLE ROLE] { roleName: "ZFI_OTHER", isRemediated: false, totalActions: 3, remediatedActions: 1 }
    
    🛑 [COMPOSITE FUNCTION] Court-circuit : fonction NON remediée
    { functionCode: "BAS-BS12", totalSimpleRoles: 1, remediatedSimpleRoles: 0, blockedBy: "ZFI_OTHER" }
  
  ✅ [COMPOSITE RISK] Résultat final  // ✅ AU MOINS UNE fonction (BAS-BS11) remedié
  { isRemediated: true, totalFunctions: 2, remediatedFunctions: 1, remediationPercentage: 50 }

  // RISQUE 2
  🔍 [COMPOSITE RISK] Début calcul remédiation
  { compositeRoleName: "Z_FULL_ADMIN", totalFunctions: 1 }
  
    // FONCTION 2.1
    🔍 [COMPOSITE FUNCTION] Début calcul remédiation
    { compositeRoleName: "Z_FULL_ADMIN", functionCode: "FI-001", totalSimpleRoles: 1 }
    
      ✅ [SIMPLE ROLE] { roleName: "ZFI_PAYROLL", isRemediated: true, totalActions: 4, remediatedActions: 4 }
    
    ✅ [COMPOSITE FUNCTION] Résultat final
    { functionCode: "FI-001", isRemediated: true, totalSimpleRoles: 1, remediatedSimpleRoles: 1 }
  
  ✅ [COMPOSITE RISK] Résultat final
  { isRemediated: true, totalFunctions: 1, remediatedFunctions: 1, remediationPercentage: 100 }

// FIN - Résultat final
✅ [COMPOSITE ROLE] Résultat final  // ✅ TOUS les risques remediés
{
  compositeRoleName: "Z_FULL_ADMIN",
  isRemediated: true,
  totalRisks: 2,
  remediatedRisks: 2,
  remediationPercentage: 100
}
```

---

## 📝 Notes Importantes

1. **Performance** : Les logs peuvent ralentir l'application avec beaucoup de données. Désactiver en production.

2. **Ordre des logs** : Les logs sont imbriqués (rôle → risque → fonction → rôle simple).

3. **Court-circuit** : Si vous voyez `🛑`, cela signifie qu'une optimisation a stoppé le calcul prématurément (normal).

4. **AU MOINS UNE vs TOUS** :
   - Risque : AU MOINS UNE fonction remediée ✅
   - Rôle : TOUS les risques remediés ✅

5. **Exclusion** : Les rôles simples exclus (⏭️) ne sont pas comptés dans les totaux.

---

**Dernière mise à jour** : 2025-01-07  
**Version** : 1.0.0


