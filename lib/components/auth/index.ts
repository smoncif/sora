/**
 * Composants d'authentification
 * 
 * Ce fichier exporte tous les composants liés à l'authentification
 */

// Formulaires d'authentification
export * from './LoginForm';
export * from './RegisterForm';
export * from './RequestResetPasswordForm';
export * from './ConfirmResetPasswordForm';

// Pages d'authentification
export * from './LoginPage';
export * from './RegisterPage';
export * from './RequestResetPasswordPage';
export * from './ConfirmResetPasswordPage';

// Composants de protection
export * from './ProtectedRoute';
export * from './RoleGuard';

// Composants d'authentification
export { LoginForm } from './LoginForm';
export { LoginPage } from './LoginPage';
export { ProtectedRoute, useProtectedRoute } from './ProtectedRoute';

// Types
export type { LoginFormProps } from './LoginForm';
export type { LoginPageProps } from './LoginPage';
export type { ProtectedRouteProps } from './ProtectedRoute'; 


