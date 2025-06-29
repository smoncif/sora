/**
 * Types pour l'authentification
 * 
 * Ce fichier contient les définitions de types liées à l'authentification
 * utilisées dans toute l'application.
 */

/**
 * Rôles disponibles dans l'application
 */
export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  USER = 'user',
}

/**
 * Permissions disponibles dans l'application
 * Ces chaînes correspondent aux actions que les utilisateurs peuvent effectuer
 */
export enum Permission {
  READ_OWN_PROFILE = 'read:own_profile',
  UPDATE_OWN_PROFILE = 'update:own_profile',
  READ_USERS = 'read:users',
  CREATE_USERS = 'create:users',
  UPDATE_USERS = 'update:users',
  DELETE_USERS = 'delete:users',
  READ_ROLES = 'read:roles',
  UPDATE_ROLES = 'update:roles',
  MANAGE_SYSTEM = 'manage:system',
  
  // Permissions pour les modules de l'application
  ACCESS_ROLE_ANALYSIS = 'access:role_analysis',
  ACCESS_USER_MAPPING = 'access:user_mapping',
  ACCESS_RISK_REMEDIATION = 'access:risk_remediation',
  EXPORT_REPORTS = 'export:reports',
  MANAGE_LICENSES = 'manage:licenses',
}

/**
 * Type pour les fonctions de vérification de rôles
 */
export type RoleCheck = (
  requiredRoles: UserRole | UserRole[] | null,
  userRole?: UserRole
) => boolean;

/**
 * Type pour les fonctions de vérification de permissions
 */
export type PermissionCheck = (
  requiredPermissions: Permission | Permission[] | null,
  userPermissions?: Permission[]
) => boolean;

/**
 * Définition d'un profil utilisateur
 * Les profils permettent d'attribuer des ensembles de permissions prédéfinis aux utilisateurs
 */
export interface ProfileType {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

/**
 * Métadonnées utilisateur stockées dans Supabase Auth
 */
export interface UserMetadata {
  first_name?: string;
  last_name?: string;
  full_name?: string;
  role?: UserRole;
  permissions?: Permission[];
  profileId?: string;
  department?: string;
  created_by?: string;
  last_login?: string;
  avatar_url?: string;
}

/**
 * État de l'authentification pour le contexte d'authentification
 */
export interface AuthState {
  /**
   * L'utilisateur actuellement authentifié ou null s'il n'est pas connecté
   */
  user: User | null;
  
  /**
   * Les métadonnées de l'utilisateur
   */
  userMetadata: UserMetadata | null;
  
  /**
   * Indique si l'état d'authentification est en cours de chargement
   */
  loading: boolean;
  
  /**
   * Indique si l'utilisateur est authentifié
   */
  isAuthenticated: boolean;
  
  /**
   * Le rôle de l'utilisateur ou null s'il n'en a pas
   */
  userRole: UserRole | null;
  
  /**
   * Les permissions de l'utilisateur ou un tableau vide s'il n'en a pas
   */
  userPermissions: Permission[];
  
  /**
   * Indique si l'état d'authentification est en cours de chargement
   */
  isLoading: boolean;
  
  /**
   * Erreur éventuelle lors de la connexion
   */
  error: string | null;
}

/**
 * Méthodes du contexte d'authentification
 */
export interface AuthMethods {
  /**
   * Connecte un utilisateur avec son email et son mot de passe
   */
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  
  /**
   * Déconnecte l'utilisateur courant
   */
  signOut: () => Promise<void>;
  
  /**
   * Inscrit un nouvel utilisateur
   */
  signUp: (email: string, password: string, metadata?: Partial<UserMetadata>) => 
    Promise<{ success: boolean; error?: string }>;
  
  /**
   * Vérifie si l'utilisateur a le rôle requis
   */
  hasRole: (requiredRole: UserRole | UserRole[]) => boolean;
  
  /**
   * Vérifie si l'utilisateur a la permission requise
   */
  hasPermission: (requiredPermission: Permission | Permission[]) => boolean;
  
  /**
   * Force une actualisation de la session
   */
  refreshSession: () => Promise<boolean>;
  
  /**
   * Rafraîchit le profil utilisateur depuis la base de données
   * Utile pour mettre à jour le rôle sans se reconnecter
   */
  refreshUserProfile: () => Promise<void>;
  
  /**
   * Vérifie et force la récupération de la session si nécessaire
   * Utile pour résoudre les erreurs "Auth session missing"
   */
  checkSession: () => Promise<boolean>;
  
  /**
   * Demande une réinitialisation du mot de passe
   */
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  
  /**
   * Confirme une réinitialisation du mot de passe
   */
  confirmPasswordReset: (password: string) => Promise<{ success: boolean; error?: string }>;
}

/**
 * Le contexte d'authentification complet
 */
export interface AuthContextValue extends AuthState, AuthMethods {}

export interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegistrationData {
  email: string;
  username: string;
  password: string;
  fullName: string;
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordReset {
  token: string;
  newPassword: string;
  confirmPassword: string;
} 
