# Gestion des Utilisateurs avec Supabase

## Vue d'ensemble

Cette fonctionnalité permet aux administrateurs de gérer les comptes utilisateur dans l'application avec des capacités complètes d'activation/désactivation intégrées à Supabase Auth.

## Fonctionnalités

### 1. Listing des Utilisateurs
- **Page :** `/settings/users-management`
- **Permissions :** Administrateur uniquement
- **Fonctionnalités :**
  - Affichage de tous les utilisateurs avec pagination
  - Filtrage par statut (actif, inactif, suspendu)
  - Filtrage par rôle (admin, utilisateur)
  - Recherche par email, nom d'utilisateur ou nom complet
  - Indicateurs visuels pour le statut et la confirmation d'email
  - Changement de rôle en temps réel
  - Suppression d'utilisateurs avec confirmation

### 2. Actions sur les Comptes

#### Activation d'un Compte
- **Action :** `activate`
- **Description :** Active un compte inactif ou suspendu
- **API :** `PATCH /api/admin/users` avec `action: 'activate'`
- **Effet :** Met le statut à `active` et supprime les restrictions

#### Désactivation d'un Compte
- **Action :** `deactivate`
- **Description :** Désactive un compte actif
- **API :** `PATCH /api/admin/users` avec `action: 'deactivate'`
- **Effet :** Met le statut à `inactive`

#### Suspension d'un Compte
- **Action :** `suspend`
- **Description :** Suspend un compte pour 30 jours
- **API :** `PATCH /api/admin/users` avec `action: 'suspend'`
- **Effet :** Met le statut à `suspended` avec date d'expiration

#### Confirmation d'Email
- **Action :** `confirm_email`
- **Description :** Confirme manuellement l'email d'un utilisateur
- **API :** `PATCH /api/admin/users` avec `action: 'confirm_email'`
- **Effet :** Marque l'email comme confirmé

#### Changement de Rôle
- **Action :** `change_role`
- **Description :** Change le rôle d'un utilisateur (admin ↔ user)
- **API :** `PATCH /api/admin/users` avec `action: 'change_role'`
- **Effet :** Met à jour le rôle dans la table `profiles`

### 3. Gestion des Utilisateurs

#### ❌ Création d'Utilisateur (Supprimée)
- Les utilisateurs s'inscrivent maintenant uniquement via `/register`
- Aucune création manuelle d'utilisateurs par les admins

#### ❌ Modification d'Utilisateur (Supprimée)  
- La modification des profils se fait via `/settings/profile`
- Les admins peuvent seulement changer les rôles et statuts

#### Suppression d'Utilisateur
- **Action :** Suppression permanente via l'API Supabase
- **Confirmation :** Dialog de confirmation obligatoire
- **Interface :** Bouton rouge avec icône poubelle dans le tableau

## Structure des Données

### Types TypeScript

```typescript
interface AdminUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  emailConfirmed: boolean;
  createdAt?: string;
  updatedAt?: string;
  emailConfirmationSentAt?: string;
}
```

### Statuts des Utilisateurs

- **`active`** : Compte actif, utilisateur peut se connecter
- **`inactive`** : Compte désactivé, connexion bloquée
- **`suspended`** : Compte suspendu temporairement

## API Endpoints

### GET /api/admin/users
Récupère la liste de tous les utilisateurs.

**Response :**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "fullName": "Nom Complet",
      "role": "user",
      "status": "active",
      "lastLogin": "2023-10-15T14:30:45Z",
      "emailConfirmed": true,
      "createdAt": "2023-10-01T10:00:00Z"
    }
  ]
}
```

### PATCH /api/admin/users
Met à jour un utilisateur ou exécute une action.

**Request Body (action) :**
```json
{
  "id": "uuid",
  "action": "activate"
}
```

**Request Body (changement de rôle) :**
```json
{
  "id": "uuid",
  "action": "change_role",
  "role": "admin"
}
```

### DELETE /api/admin/users?id=uuid
Supprime un utilisateur de façon permanente.

## Hook React - useUserManagement

### Usage

```typescript
import { useUserManagement } from 'lib/hooks/admin/useUserManagement';

const {
  users,                // Liste des utilisateurs
  loading,              // État de chargement
  error,                // Message d'erreur
  refreshUsers,         // Recharger les utilisateurs
  performUserAction,    // Exécuter une action
  changeUserRole,       // Changer le rôle d'un utilisateur
  deleteUser,           // Supprimer un utilisateur
  isUserActionLoading   // Vérifier si une action est en cours
} = useUserManagement();
```

### Exemples d'utilisation

```typescript
// Activer un utilisateur
await performUserAction(userId, 'activate');

// Désactiver un utilisateur
await performUserAction(userId, 'deactivate');

// Suspendre un utilisateur
await performUserAction(userId, 'suspend');

// Confirmer l'email d'un utilisateur
await performUserAction(userId, 'confirm_email');

// Changer le rôle d'un utilisateur
await changeUserRole(userId, 'admin');

// Supprimer un utilisateur
await deleteUser(userId);
```

## Sécurité et Permissions

### Contrôle d'Accès
- Toutes les routes `/api/admin/users` nécessitent une authentification
- L'utilisateur doit avoir le rôle `ADMIN`
- Vérification côté serveur avec Supabase Auth

### Validation des Données
- Validation côté client avec React Hook Form et Zod
- Validation côté serveur dans les API routes
- Sanitisation des entrées utilisateur

## Interface Utilisateur

### Composants Principaux

1. **Page de gestion** (`/settings/users-management/page.tsx`)
   - Tableau avec pagination et filtres
   - Recherche par email, nom ou username  
   - Switch d'activation/désactivation en temps réel
   - Select pour changement de rôle instantané
   - Bouton de suppression avec confirmation
   - Statistiques des utilisateurs (total, admins, actifs, en attente)

### Indicateurs Visuels

- **Puces de statut** avec couleurs et icônes appropriées
- **Select de rôle** avec icônes admin/utilisateur
- **Switch d'activation** avec feedback visuel
- **Loading individuel** par utilisateur lors des actions
- **Messages de feedback** avec toasts/alerts

## Intégration Supabase

### Configuration requise

1. **Variables d'environnement :**
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (pour l'admin API)

2. **Permissions Supabase :**
   - L'utilisateur admin doit avoir accès à `auth.admin.listUsers()`
   - Permissions pour `auth.admin.createUser()`, `updateUserById()`, `deleteUser()`

### Sécurité Supabase

- Utilisation de l'API Admin pour la gestion des utilisateurs
- Token de service role sécurisé côté serveur uniquement
- Validation des permissions à chaque requête

## Installation et Configuration

### 1. Dépendances
Les dépendances nécessaires sont déjà incluses dans le projet :
- `@supabase/supabase-js`
- `@mui/material`
- `react-hook-form`
- `@hookform/resolvers/zod`

### 2. Configuration
1. Configurer les variables d'environnement Supabase
2. S'assurer que l'utilisateur admin a les bonnes permissions
3. Tester les API endpoints avec un compte administrateur

### 3. Utilisation
1. Se connecter avec un compte administrateur
2. Naviguer vers `/settings/users-management`
3. Commencer à gérer les utilisateurs (activation, rôles, suppression)

## Dépannage

### Erreurs communes

1. **"Unauthorized: Authentication required"**
   - Vérifier que l'utilisateur est bien connecté
   - Vérifier le token d'authentification

2. **"Forbidden: Admin permission required"**
   - Vérifier que l'utilisateur a le rôle `ADMIN`
   - Vérifier les métadonnées utilisateur dans Supabase

3. **"User not found"**
   - Vérifier que l'ID utilisateur existe
   - Vérifier les permissions de lecture

### Logs et debugging

- Les erreurs sont loggées côté serveur
- Utiliser les outils de développement du navigateur pour les erreurs côté client
- Vérifier les logs Supabase pour les erreurs d'authentification 