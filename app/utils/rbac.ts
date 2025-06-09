import { UserRole, PermissionCheck, RoleCheck } from '../types/auth';

// Hiérarchie des rôles (ordre croissant de privilèges)
const ROLE_HIERARCHY = [UserRole.USER, UserRole.EDITOR, UserRole.ADMIN];

/**
 * Vérifie si un utilisateur a un rôle spécifique ou supérieur
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
