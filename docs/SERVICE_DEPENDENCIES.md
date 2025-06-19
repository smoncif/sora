# 🔗 DÉPENDANCES ENTRE SERVICES

## 📊 GRAPHIQUE DES DÉPENDANCES

```
📦 SERVICES INDÉPENDANTS (Priority 1 - Peuvent être migrés en premier)
├── auth/authService.ts
├── auth/rbacService.ts ✅ (DÉJÀ FAIT)
├── user/userService.ts
├── profile/profileService.ts
├── validation/validationService.ts
└── role/simplifiedAnalysisService.ts

📦 SERVICES AVEC DÉPENDANCES (Priority 2 - Migrer après les dépendances)
├── data/importService.ts 
│   ├── 🔗 DÉPEND DE: excel/excelService.ts
│   └── 🔗 DÉPEND DE: excel/validationService.ts
│
├── data/exportService.ts
│   └── 🔗 DÉPEND DE: excel/excelService.ts
│
└── analysis/savedAnalysisService.ts (INDÉPENDANT)

📦 SERVICES CORE (Providers - Migrer en dernier)
├── excel/excelService.ts (PROVIDER pour data/*)
├── excel/validationService.ts (PROVIDER pour data/importService)
└── excel/uploadService.ts (INDÉPENDANT)
```

## 🎯 ORDRE DE MIGRATION OPTIMAL

### **PHASE 4D.1 - INDÉPENDANTS SIMPLES** ⚡
1. ✅ `user/userService.ts` (296 lignes) - AUCUNE DÉPENDANCE
2. ✅ `profile/profileService.ts` (391 lignes) - AUCUNE DÉPENDANCE  
3. ✅ `validation/validationService.ts` (535 lignes) - AUCUNE DÉPENDANCE
4. ✅ `excel/uploadService.ts` (134 lignes) - AUCUNE DÉPENDANCE

### **PHASE 4D.2 - ANALYSIS & ROLE** 🔍
5. ✅ `analysis/savedAnalysisService.ts` (589 lignes) - AUCUNE DÉPENDANCE
6. ✅ `role/simplifiedAnalysisService.ts` (473 lignes) - AUCUNE DÉPENDANCE

### **PHASE 4D.3 - PROVIDERS EXCEL** 📋
7. ✅ `excel/validationService.ts` (618 lignes) - PROVIDER
8. ✅ `excel/excelService.ts` (560 lignes) - PROVIDER

### **PHASE 4D.4 - DÉPENDANTS** 🔗
9. ✅ `data/exportService.ts` (280 lignes) - DÉPEND DE excel/excelService
10. ✅ `data/importService.ts` (250 lignes) - DÉPEND DE excel/excelService + excel/validationService

---

## ⚠️ **NOTES IMPORTANTES**

### **Services Excel = Goulots d'étranglement**
- `excel/excelService.ts` et `excel/validationService.ts` sont utilisés par les services `data/*`
- **Stratégie :** Créer ModernExcelService unifié qui remplace les 3 services Excel

### **Rétrocompatibilité requise**
- Les services `data/*` doivent continuer à fonctionner pendant la migration
- **Solution :** Adapters de migration pour transition progressive

### **ModernFileService déjà créé**
- ✅ `ModernFileService` existe déjà et combine Excel/Upload/Validation
- **Action :** Utiliser comme base pour remplacer les 3 services Excel 