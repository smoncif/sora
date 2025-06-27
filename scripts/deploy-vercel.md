# Guide de Déploiement Vercel pour Sora

## Prérequis

1. **Compte Vercel**: Assure-toi d'avoir un compte sur [vercel.com](https://vercel.com)
2. **Projet Supabase**: Ton projet Supabase doit être configuré et fonctionnel
3. **Repository GitHub**: Le code doit être sur GitHub

## Variables d'Environnement Requises

### Sur Vercel Dashboard

Va dans ton projet Vercel > Settings > Environment Variables et ajoute :

```bash
# Supabase Configuration (OBLIGATOIRE)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key

# Application Configuration
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=your-generated-secret

# Optionnel - Analytics
NEXT_PUBLIC_VERCEL_ANALYTICS_ID=prj_xxx
```

### Génération du NEXTAUTH_SECRET

```bash
# Dans ton terminal
openssl rand -base64 32
```

## Étapes de Déploiement

### 1. Installation Vercel CLI (Optionnel)

```bash
npm i -g vercel
```

### 2. Déploiement depuis GitHub

1. Va sur [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique "Add New Project"
3. Importe ton repository GitHub
4. Vercel détectera automatiquement Next.js
5. Configure les variables d'environnement
6. Clique "Deploy"

### 3. Déploiement via CLI (Alternatif)

```bash
# Dans le dossier du projet
vercel

# Suivre les prompts
# Première fois : vercel --prod pour déployer en production
```

## Configuration Supabase pour Vercel

### 1. URLs Autorisées

Dans ton dashboard Supabase > Authentication > URL Configuration, ajoute :

**Site URL:**
```
https://your-app.vercel.app
```

**Redirect URLs:**
```
https://your-app.vercel.app/auth/callback
https://your-app.vercel.app/api/auth/callback
```

### 2. CORS Configuration

Dans Supabase > Settings > API, assure-toi que les CORS incluent :
```
https://your-app.vercel.app
```

## Post-Déploiement

### 1. Vérification des Fonctionnalités

- [ ] Page de connexion fonctionne
- [ ] Authentification Supabase
- [ ] Upload de fichiers
- [ ] Analyse de rôles
- [ ] Navigation entre pages

### 2. Monitoring

- Activer Vercel Analytics
- Configurer les logs d'erreur
- Surveiller les performances

## Troubleshooting

### Erreurs Communes

**Build Failed:**
- Vérifier les variables d'environnement
- Contrôler les imports/exports
- Vérifier la syntaxe TypeScript

**Runtime Errors:**
- Vérifier les URLs Supabase
- Contrôler les CORS
- Vérifier les permissions de base de données

**Authentification Fails:**
- Vérifier NEXTAUTH_SECRET
- Contrôler les redirect URLs
- Vérifier la configuration Supabase

### Commandes de Debug

```bash
# Build local pour tester
npm run build

# Vérifier les variables d'environnement
vercel env ls

# Logs en temps réel
vercel logs your-app-url.vercel.app
```

## Optimisations de Performance

### 1. Edge Functions

Vercel déploie automatiquement les API routes comme Edge Functions pour de meilleures performances.

### 2. Caching

Le projet est configuré avec du caching optimisé pour :
- Images Supabase
- Composants statiques
- API responses

### 3. Bundle Optimization

Le next.config.ts inclut :
- Tree shaking optimisé
- Compression des packages Material-UI
- Exclusion des modules server-side

## Support

En cas de problème :
1. Vérifier les logs Vercel
2. Contrôler la console browser
3. Vérifier les variables d'environnement
4. Tester l'authentification Supabase

---

**Note:** Ce déploiement utilise les dernières versions de Next.js 15 et React 19. Assure-toi que tous les packages sont compatibles. 