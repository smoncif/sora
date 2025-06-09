'use client';

import { useAuth as useAuthContext } from 'lib/contexts/AuthContext';

/**
 * Hook d'authentification
 * 
 * Un wrapper autour du contexte d'authentification pour une utilisation plus facile
 * dans les composants.
 * 
 * @example
 * ```tsx
 * const { user, signIn, signOut, isAuthenticated } = useAuth();
 * 
 * // Vérifier si l'utilisateur est authentifié
 * if (isAuthenticated) {
 *   * }
 * 
 * // Se connecter
 * const handleLogin = async () => {
 *   const { success, error } = await signIn(email, password);
 *   if (success) {
 *     *   } else {
 *     *   }
 * };
 * 
 * // Se déconnecter
 * const handleLogout = () => {
 *   signOut();
 * };
 * ```
 */
export const useAuth = useAuthContext;

/**
 * Réexportation pour maintenir la compatibilité
 */
export * from 'lib/contexts/AuthContext'; 



