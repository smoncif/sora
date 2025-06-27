# SORA - SAP Optimal Role Analyzer

Application web moderne d'analyse de rôles SAP développée avec Next.js 15, React 19, Material-UI v7 et Supabase.

## 🚀 Déploiement sur Vercel

### Méthode 1: Déploiement automatique via GitHub

1. **Connecter votre repository à Vercel:**
   - Allez sur [vercel.com](https://vercel.com) et connectez-vous
   - Cliquez "Add New Project"
   - Importez votre repository GitHub
   - Vercel détectera automatiquement Next.js

2. **Configurer les variables d'environnement:**
   Dans le dashboard Vercel > Settings > Environment Variables:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_key
   NEXTAUTH_URL=https://your-app.vercel.app
   NEXTAUTH_SECRET=your_generated_secret
   ```

3. **Déployer:**
   - Cliquez "Deploy"
   - Vercel construira et déploiera automatiquement votre application

### Méthode 2: Déploiement via CLI

1. **Installation:**
   ```bash
   npm install -g vercel
   ```

2. **Déploiement:**
   ```bash
   # Depuis la racine du projet
   npm run deploy          # Déploiement en production
   npm run deploy:preview  # Déploiement en preview
   ```

3. **Script automatisé (Windows):**
   ```powershell
   .\scripts\deploy.ps1
   ```

## 🔧 Configuration Supabase pour Vercel

### URLs autorisées
Dans votre dashboard Supabase > Authentication > URL Configuration:

**Site URL:**
```
https://your-app.vercel.app
```

**Redirect URLs:**
```
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/api/auth/callback
```

## 📋 Prérequis

- Node.js 18+ 
- NPM ou Yarn
- Compte Supabase configuré
- Compte Vercel

## 🛠 Installation locale

```bash
# Cloner le repository
git clone your-repo-url
cd sora

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp env.example .env.local
# Éditer .env.local avec vos clés

# Lancer en développement
npm run dev
```

## 🏗 Structure du projet

```
sora/
├── app/                    # Pages et API routes (App Router)
│   ├── admin/             # Interface d'administration
│   ├── api/               # API routes
│   ├── dashboard/         # Dashboard principal
│   └── ...
├── lib/                   # Bibliothèques et utilitaires
│   ├── components/        # Composants React
│   ├── hooks/            # Hooks personnalisés
│   ├── services/         # Services métier
│   └── utils/            # Utilitaires
├── public/               # Fichiers statiques
├── scripts/              # Scripts de build et déploiement
└── docs/                 # Documentation
```

## 📚 Technologies utilisées

- **Frontend:** Next.js 15, React 19, TypeScript
- **UI:** Material-UI v7, Emotion
- **Backend:** Supabase (Auth, Database, Storage)
- **Déploiement:** Vercel
- **Tests:** Jest, Testing Library

## 🔍 Fonctionnalités

- ✅ Authentification utilisateur avec Supabase
- ✅ Analyse de rôles SAP
- ✅ Upload et traitement de fichiers Excel
- ✅ Interface d'administration
- ✅ Dashboard d'analyse avancé
- ✅ Gestion des profils utilisateur
- ✅ Responsive design

## 📝 Scripts disponibles

```bash
npm run dev              # Développement avec Turbopack
npm run build            # Construction pour production
npm run start            # Serveur de production
npm run lint             # Vérification ESLint
npm run test             # Tests unitaires
npm run deploy           # Déploiement Vercel production
npm run deploy:preview   # Déploiement Vercel preview
```

## 🐛 Dépannage

### Erreurs de build
- Vérifiez que toutes les variables d'environnement sont configurées
- Assurez-vous que la version Node.js est 18+

### Erreurs d'authentification
- Vérifiez les URLs de redirection dans Supabase
- Contrôlez les clés API Supabase
- Vérifiez que `NEXTAUTH_SECRET` est défini

### Performance
- L'application utilise le cache Vercel pour optimiser les performances
- Les composants Material-UI sont optimisés via `optimizePackageImports`

## 📞 Support

Pour toute question ou problème :
1. Vérifiez les logs Vercel
2. Consultez la documentation Supabase
3. Créez une issue sur le repository

---

**Note:** Cette application utilise les dernières versions de Next.js 15 et React 19. Assurez-vous que vos dépendances sont compatibles. 