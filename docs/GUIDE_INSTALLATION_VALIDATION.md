# 🚀 Guide d'Installation - Système de Validation de Rôles

**Date** : 2 Novembre 2025  
**Version** : 1.1 (Multi-rôles métier)

---

## ✅ Fichiers Créés

### 📁 Migrations SQL (supabase/migrations/)
- ✅ `001_create_validation_tables.sql` - Tables principales
- ✅ `002_create_validation_indexes.sql` - Indexes de performance  
- ✅ `003_create_validation_rls.sql` - Row Level Security policies
- ✅ `004_create_validation_functions.sql` - Fonctions PostgreSQL

### 📁 Services Backend (lib/services/)
- ✅ `validation/validationLinkService.ts` - Gestion des liens
- ✅ `validation/index.ts` - Exports centralisés
- ✅ `email/emailValidationService.ts` - Envoi d'emails
- ✅ `email/index.ts` - Exports centralisés

### 📁 API Routes (app/api/)
- ✅ `validation/create/route.ts` - POST pour créer un lien
- ✅ `validation/[token]/route.ts` - GET pour récupérer données
- ✅ `validation/submit/route.ts` - POST pour soumettre validation
- ✅ `email/send-validation/route.ts` - POST pour envoyer email

### 📁 Components Frontend (lib/components/validation/)
- ✅ `RoleValidationShareModal/RoleValidationShareModal.tsx` - Modal de partage
- ✅ `RoleValidationContent/RoleValidationContent.tsx` - Contenu page validation
- ✅ `RoleValidationTable/RoleValidationTable.tsx` - Tableau de validation
- ✅ `ApprovalSwitch/ApprovalSwitch.tsx` - Switch tri-state
- ✅ `index.ts` - Exports centralisés

### 📁 Pages (app/)
- ✅ `validation/[token]/page.tsx` - Page publique de validation
- ✅ `validation/[token]/not-found.tsx` - Page d'erreur 404

### 📁 Intégration
- ✅ `lib/components/analysis/ActionsSection/ActionsSection.tsx` - Bouton ajouté
- ✅ `app/dashboard/analysis/roles/page.tsx` - Modal intégré

---

## 📦 Étape 1 : Installer les Dépendances NPM

```bash
npm install uuid date-fns resend @mui/x-date-pickers zod

# Types TypeScript
npm install -D @types/uuid
```

**Temps estimé** : 2 minutes

---

## 🗄️ Étape 2 : Créer les Tables Supabase

### Option A : Via Supabase Dashboard (Recommandé)

1. Aller sur https://app.supabase.com/project/[votre-projet]/sql
2. Exécuter les migrations dans l'ordre :

#### Migration 1 : Tables
```bash
# Copier le contenu de supabase/migrations/001_create_validation_tables.sql
# Coller dans l'éditeur SQL
# Cliquer sur "Run"
```

#### Migration 2 : Indexes
```bash
# Copier le contenu de supabase/migrations/002_create_validation_indexes.sql
# Coller dans l'éditeur SQL
# Cliquer sur "Run"
```

#### Migration 3 : RLS Policies
```bash
# Copier le contenu de supabase/migrations/003_create_validation_rls.sql
# Coller dans l'éditeur SQL
# Cliquer sur "Run"
```

#### Migration 4 : Fonctions
```bash
# Copier le contenu de supabase/migrations/004_create_validation_functions.sql
# Coller dans l'éditeur SQL
# Cliquer sur "Run"
```

**Temps estimé** : 10 minutes

### Option B : Via Supabase CLI

```bash
# Installer Supabase CLI (si pas déjà fait)
npm install -g supabase

# Se connecter
supabase login

# Appliquer les migrations
supabase db push
```

**Temps estimé** : 5 minutes

---

## 📧 Étape 3 : Configurer le Service Email (Resend)

### 3.1 Créer un Compte Resend

1. Aller sur https://resend.com
2. Créer un compte gratuit
3. Aller dans "API Keys"
4. Créer une nouvelle API key

### 3.2 Ajouter les Variables d'Environnement

Créer/Modifier `.env.local` :

```bash
# Service Email (Resend)
EMAIL_API_KEY=re_votre_api_key_ici
RESEND_API_KEY=re_votre_api_key_ici  # Fallback
EMAIL_FROM=noreply@votre-domaine.com
EMAIL_FROM_NAME=Sora - Analyse de Rôles

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Sora
```

### 3.3 Configurer le Domaine (Production)

1. Dans Resend Dashboard, aller dans "Domains"
2. Ajouter votre domaine (ex: `votre-domaine.com`)
3. Configurer les DNS records (SPF, DKIM, DMARC)
4. Vérifier le domaine

**Note** : En développement, vous pouvez utiliser `onboarding@resend.dev` qui fonctionne sans configuration de domaine.

**Temps estimé** : 15 minutes (dev) / 30 minutes (prod avec DNS)

---

## 🔧 Étape 4 : Configurer Vercel (pour Cron Job)

### 4.1 Ajouter les Variables d'Environnement sur Vercel

1. Aller sur https://vercel.com/[votre-projet]/settings/environment-variables
2. Ajouter les mêmes variables que `.env.local`
3. Redéployer l'application

### 4.2 Configurer le Cron Job

Le fichier `vercel.json` existe déjà, mais il faut ajouter le cron :

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-validations",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Note** : Pour tester localement, vous pouvez appeler manuellement `/api/cron/cleanup-validations`.

**Temps estimé** : 10 minutes

---

## ✅ Étape 5 : Tester l'Installation

### Test 1 : Créer un Lien de Validation

1. Ouvrir http://localhost:3000/dashboard/analysis/roles
2. Uploader un fichier d'analyse
3. Sélectionner des rôles simples pour au moins un rôle métier
4. Cliquer sur le bouton **"Partager pour validation"** (violet, à côté de "Exporter Spéc")
5. Configurer la date d'expiration
6. Activer/désactiver la vue technique
7. Cliquer sur **"Générer le lien"**
8. Vérifier que le lien s'affiche

**Résultat attendu** : Lien généré avec succès, format `http://localhost:3000/validation/[uuid]`

### Test 2 : Accéder à la Page de Validation

1. Copier le lien généré
2. Ouvrir le lien dans un nouvel onglet (ou mode navigation privée)
3. Vérifier l'affichage du tableau
4. Tester les switches de validation (✅/❓/❌)
5. Ajouter des commentaires
6. Soumettre la validation

**Résultat attendu** : Page de validation affichée, soumission réussie

### Test 3 : Envoyer par Email (si configuré)

1. Dans le modal, entrer un email de test
2. Cliquer sur **"Envoyer par email"**
3. Vérifier la réception de l'email

**Résultat attendu** : Email reçu avec le lien cliquable

---

## 🐛 Dépannage

### Erreur : "Non authentifié" lors de la création de lien

**Cause** : L'utilisateur n'est pas connecté  
**Solution** : Se connecter à l'application avant de créer un lien

### Erreur : "Configuration email manquante"

**Cause** : Variables d'environnement EMAIL_API_KEY ou RESEND_API_KEY non définies  
**Solution** : Ajouter les variables dans `.env.local` et redémarrer le serveur

### Erreur : "Lien expiré ou invalide"

**Cause** : Le lien a expiré ou le token est incorrect  
**Solution** : Générer un nouveau lien avec une date d'expiration plus longue

### Erreur : Tables "role_validation_links" n'existe pas

**Cause** : Migrations SQL non exécutées  
**Solution** : Exécuter les migrations Supabase (Étape 2)

### Erreur : "CORS" lors de l'envoi d'email

**Cause** : Configuration Resend incorrecte  
**Solution** : Vérifier l'API key et le domaine dans Resend Dashboard

---

## 📊 Vérification Post-Installation

### Checklist Complète

- [ ] Dépendances NPM installées
- [ ] Migrations SQL exécutées (4/4)
- [ ] Variables d'environnement configurées (.env.local)
- [ ] Service email Resend configuré
- [ ] Bouton "Partager pour validation" visible dans ActionsSection
- [ ] Génération de lien fonctionnelle
- [ ] Page de validation accessible
- [ ] Soumission de validation fonctionnelle
- [ ] (Optionnel) Envoi d'email fonctionnel

### Vérifier les Tables Supabase

Dans Supabase Dashboard → Table Editor, vous devriez voir :
- ✅ `role_validation_links` (vide au départ)
- ✅ `role_validation_results` (vide au départ)

### Vérifier les Permissions RLS

Dans Supabase Dashboard → Authentication → Policies :
- ✅ 5 policies sur `role_validation_links`
- ✅ 3 policies sur `role_validation_results`

---

## 🎯 Prochaines Étapes

Après l'installation, vous pouvez :

1. **Tester en mode développement** (localhost:3000)
2. **Déployer sur Vercel** (production)
3. **Configurer le monitoring** (Sentry, LogRocket, etc.)
4. **Former les utilisateurs** (voir docs/README_VALIDATION_ROLES.md)

---

## 📚 Documentation Additionnelle

- [README_VALIDATION_ROLES.md](./README_VALIDATION_ROLES.md) - Documentation complète
- [RESUME_EXECUTIF_VALIDATION_ROLES.md](./RESUME_EXECUTIF_VALIDATION_ROLES.md) - Vue d'ensemble
- [ANALYSE_VALIDATION_ROLES.md](./ANALYSE_VALIDATION_ROLES.md) - Architecture détaillée
- [FLUX_VALIDATION_ROLES.md](./FLUX_VALIDATION_ROLES.md) - Diagrammes et exemples
- [SCRIPTS_VALIDATION_ROLES.md](./SCRIPTS_VALIDATION_ROLES.md) - Scripts SQL complets
- [CHANGELOG_V1.1.md](./CHANGELOG_V1.1.md) - Changelog version 1.1

---

**Installation créée le** : 2 Novembre 2025  
**Testé avec** : Node.js 18+, Next.js 14, Supabase  
**Statut** : ✅ Prêt pour Installation




