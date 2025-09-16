/**
 * Index des types et interfaces
 * 
 * Ce fichier exporte tous les types de l'application pour un import standardisé
 */

// Types d'authentification
export * from './auth';

// Types génériques pour l'analyse
export * from './analysis';

// Types pour l'analyse des utilisateurs
export * from './userAnalysis';

// Types pour les rôles et les analyses de rôle
export * from './roleAnalysis';
// Types pour les rôles de base (renommés pour éviter l'ambiguïté)
export { 
  type Role as BasicRole,
  type RoleAnalysis as BasicRoleAnalysis
} from './roles';

// Types pour la validation
export * from './validation';

// Types Supabase
export * from './supabase';

// Types pour les thèmes
export * from './theme.d'; 
