/**
 * Service de contrôle d'accès basé sur les rôles (RBAC)
 * 
 * Ce service fournit des fonctions pour vérifier si un utilisateur
 * a les rôles ou permissions nécessaires pour accéder à certaines
 * fonctionnalités de l'application.
 * 
 * Le système RBAC implémente une hiérarchie de rôles où les rôles
 * supérieurs héritent des permissions des rôles inférieurs, ainsi
 * qu'un mécanisme de vérification granulaire des permissions individuelles.
 * 
 * @module RBACService
 */

import { UserRole, Permission, PermissionCheck, RoleCheck } from '@/types/auth';

/**
 * Hiérarchie des rôles (ordre croissant de privilèges)
 * USER est le niveau le plus bas, ADMIN le plus élevé
 * Cette hiérarchie est utilisée pour déterminer si un rôle
 * possède les privilèges d'un autre rôle.
 */
const ROLE_HIERARCHY = [UserRole.USER, UserRole.EDITOR, UserRole.ADMIN];

/**
 * Vérifie si un utilisateur a un rôle spécifique ou supérieur
 * 
 * Cette fonction implémente un système de hiérarchie de rôles, où les rôles
 * supérieurs dans la hiérarchie ont automatiquement accès aux fonctionnalités
 * des rôles inférieurs. Par exemple, un ADMIN a aussi les privilèges d'un EDITOR.
 * 
 * @param {UserRole | UserRole[] | null} requiredRoles - Le ou les rôles requis pour accéder à une fonctionnalité
 * @param {UserRole} [userRole=UserRole.USER] - Le rôle actuel de l'utilisateur
 * @returns {boolean} true si l'utilisateur a l'un des rôles requis ou un rôle supérieur
 * 
 * @example
 * // Vérifier si un utilisateur avec le rôle EDITOR peut accéder à une fonctionnalité réservée aux EDITOR
 * if (hasRole(UserRole.EDITOR, userRole)) {
 *   // L'utilisateur peut accéder
 * }
 * 
 * @example
 * // Vérifier si un utilisateur peut accéder à une fonctionnalité réservée aux ADMIN ou EDITOR
 * if (hasRole([UserRole.ADMIN, UserRole.EDITOR], userRole)) {
 *   // L'utilisateur peut accéder
 * }
 * 
 * @example
 * // Utilisation dans un composant protégé
 * const ProtectedComponent = () => {
 *   const { user } = useAuth();
 *   
 *   if (!hasRole(UserRole.ADMIN, user?.role)) {
 *     return <AccessDenied />;
 *   }
 *   
 *   return <AdminDashboard />;
 * }
 */
export const hasRole: RoleCheck = (requiredRoles, userRole = UserRole.USER) => {
  // Si aucun rôle n'est requis, autoriser l'accès
  if (!requiredRoles) return true;
  
  // Convertir en tableau si c'est une valeur unique
  const requiredRolesArray = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];
  
  // Obtenir l'indice du rôle de l'utilisateur dans la hiérarchie
  const userRoleIndex = ROLE_HIERARCHY.indexOf(userRole);
  
  // Vérifier si l'utilisateur a l'un des rôles requis ou un rôle supérieur
  return requiredRolesArray.some(role => {
    const requiredRoleIndex = ROLE_HIERARCHY.indexOf(role);
    return userRoleIndex >= requiredRoleIndex && requiredRoleIndex !== -1;
  });
};

/**
 * Vérifie si un utilisateur a toutes les permissions requises
 * 
 * Contrairement à la vérification des rôles qui utilise une hiérarchie,
 * cette fonction vérifie que l'utilisateur possède explicitement toutes
 * les permissions spécifiées dans sa liste de permissions.
 * 
 * @param {Permission | Permission[] | null} requiredPermissions - La ou les permissions requises
 * @param {Permission[]} [userPermissions=[]] - Les permissions actuelles de l'utilisateur
 * @returns {boolean} true si l'utilisateur a toutes les permissions requises
 * 
 * @example
 * // Vérifier si un utilisateur peut accéder à une fonctionnalité nécessitant des permissions spécifiques
 * if (hasPermissions(
 *   [Permission.READ_USERS, Permission.EXPORT_REPORTS], 
 *   userPermissions
 * )) {
 *   // L'utilisateur a toutes les permissions requises
 * }
 * 
 * @example
 * // Utilisation dans un composant protégé par permission
 * const ExportButton = () => {
 *   const { user } = useAuth();
 *   
 *   if (!hasPermissions(Permission.EXPORT_REPORTS, user?.permissions || [])) {
 *     return null; // Ne pas afficher le bouton
 *   }
 *   
 *   return <Button onClick={handleExport}>Exporter</Button>;
 * }
 */
export const hasPermissions: PermissionCheck = (requiredPermissions, userPermissions = []) => {
  // Si aucune permission n'est requise, autoriser l'accès
  if (!requiredPermissions) return true;
  
  // Convertir en tableau si c'est une valeur unique
  const requiredPermissionsArray = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];
  
  // Vérifier si l'utilisateur a toutes les permissions requises
  return requiredPermissionsArray.every(permission => 
    userPermissions.includes(permission)
  );
};

/**
 * Vérifie si un utilisateur a au moins une des permissions requises
 * 
 * Cette fonction est utile pour les cas où plusieurs permissions peuvent
 * donner accès à une même fonctionnalité (par exemple, un utilisateur peut
 * soit modifier ses propres données, soit avoir un accès administrateur).
 * 
 * @param {Permission | Permission[] | null} requiredPermissions - La ou les permissions requises
 * @param {Permission[]} [userPermissions=[]] - Les permissions actuelles de l'utilisateur
 * @returns {boolean} true si l'utilisateur a au moins une des permissions requises
 * 
 * @example
 * // Vérifier si un utilisateur peut accéder à une fonctionnalité accessible avec l'une des permissions
 * if (hasAnyPermission(
 *   [Permission.UPDATE_USERS, Permission.UPDATE_OWN_PROFILE], 
 *   userPermissions
 * )) {
 *   // L'utilisateur a au moins une des permissions requises
 * }
 * 
 * @example
 * // Utilisation pour l'accès à un formulaire d'édition
 * const ProfileForm = ({ userId }) => {
 *   const { user } = useAuth();
 *   const isOwnProfile = user?.id === userId;
 *   const requiredPermission = isOwnProfile 
 *     ? Permission.UPDATE_OWN_PROFILE 
 *     : Permission.UPDATE_USERS;
 *   
 *   if (!hasAnyPermission(requiredPermission, user?.permissions || [])) {
 *     return <AccessDenied />;
 *   }
 *   
 *   return <EditProfileForm userId={userId} />;
 * }
 */
export const hasAnyPermission: PermissionCheck = (requiredPermissions, userPermissions = []) => {
  // Si aucune permission n'est requise, autoriser l'accès
  if (!requiredPermissions) return true;
  
  // Convertir en tableau si c'est une valeur unique
  const requiredPermissionsArray = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions];
  
  // Vérifier si l'utilisateur a au moins une des permissions requises
  return requiredPermissionsArray.some(permission => 
    userPermissions.includes(permission)
  );
};

/**
 * Vérifie si un rôle possède certaines permissions par défaut
 * 
 * Cette fonction permet de déterminer si un rôle spécifique a
 * intrinsèquement accès à une permission donnée, selon la matrice
 * de permissions prédéfinie pour chaque rôle.
 * 
 * Note: Les administrateurs (ADMIN) ont automatiquement toutes les permissions.
 * 
 * @param {UserRole} role - Le rôle à vérifier
 * @param {Permission} permission - La permission à vérifier
 * @returns {boolean} true si le rôle possède la permission par défaut
 * 
 * @example
 * // Vérifier si les éditeurs peuvent exporter des rapports par défaut
 * if (roleHasPermission(UserRole.EDITOR, Permission.EXPORT_REPORTS)) {
 *   * }
 * 
 * @example
 * // Utilisation pour déterminer les permissions disponibles pour un rôle
 * const getAvailableFeatures = (role) => {
 *   const features = [];
 *   
 *   if (roleHasPermission(role, Permission.ACCESS_ROLE_ANALYSIS)) {
 *     features.push('role-analysis');
 *   }
 *   
 *   if (roleHasPermission(role, Permission.EXPORT_REPORTS)) {
 *     features.push('export-reports');
 *   }
 *   
 *   return features;
 * };
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  // L'administrateur a toutes les permissions
  if (role === UserRole.ADMIN) return true;
  
  // Définir les permissions par défaut pour chaque rôle
  const rolePermissions: Record<UserRole, Permission[]> = {
    [UserRole.ADMIN]: Object.values(Permission), // Toutes les permissions
    [UserRole.EDITOR]: [
      Permission.READ_OWN_PROFILE,
      Permission.UPDATE_OWN_PROFILE,
      Permission.READ_USERS,
      Permission.READ_ROLES,
      Permission.ACCESS_ROLE_ANALYSIS,
      Permission.EXPORT_REPORTS,
      // Ajouter d'autres permissions pour l'éditeur
    ],
    [UserRole.USER]: [
      Permission.READ_OWN_PROFILE,
      Permission.UPDATE_OWN_PROFILE,
      // Permissions de base pour l'utilisateur
    ],
  };
  
  // Vérifier si le rôle a la permission spécifiée
  return rolePermissions[role]?.includes(permission) || false;
} 
