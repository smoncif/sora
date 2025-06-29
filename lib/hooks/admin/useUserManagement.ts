import { useState, useCallback, useEffect } from 'react';
import { UserRole } from 'lib/types/auth';
import { useAuth } from 'lib/hooks/auth/useAuth';

export interface AdminUser {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole | string; // Permet string pour plus de flexibilité
  status: 'active' | 'inactive' | 'suspended' | 'pending_email_confirmation' | 'pending_admin_approval' | 'rejected';
  lastLogin?: string | null;
  emailConfirmed: boolean;
  adminApproved: boolean;
  adminApprovedAt?: string | null;
  adminApprovedBy?: string | null;
  rejectedAt?: string | null;
  rejectedBy?: string | null;
  rejectionReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  emailConfirmationSentAt?: string | null;
  department?: string;
}

export interface UserManagementState {
  users: AdminUser[];
  loading: boolean;
  error: string | null;
  success: string | null;
  userActionLoading: Set<string>; // IDs des utilisateurs en cours de modification
}

export interface UserAction {
  id: string;
  action: 'activate' | 'deactivate' | 'suspend' | 'confirm_email' | 'approve' | 'reject' | 'resend_confirmation';
  reason?: string; // Pour les rejets
}

export const useUserManagement = () => {
  const { user, refreshUserProfile } = useAuth();
  const [state, setState] = useState<UserManagementState>({
    users: [],
    loading: false,
    error: null,
    success: null,
    userActionLoading: new Set<string>(),
  });

  const clearMessages = useCallback(() => {
    setState(prev => ({ ...prev, error: null, success: null }));
  }, []);

  const fetchUsers = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      console.log('🔍 Fetching users from main API...');
      
      // Utiliser l'API principale corrigée
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (!response.ok) {
        console.error('❌ API error:', data);
        throw new Error(data.error || 'Erreur lors du chargement des utilisateurs');
      }
      
      console.log('✅ Users fetched successfully:', data);
      
      setState(prev => ({
        ...prev,
        users: data.users || [],
        loading: false,
      }));
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
    }
  }, []);

  const performUserAction = useCallback(async (userId: string, action: UserAction['action'], reason?: string) => {
    // Ajouter l'utilisateur aux IDs en cours de loading au lieu du loading global
    setState(prev => ({ 
      ...prev, 
      userActionLoading: new Set(Array.from(prev.userActionLoading).concat(userId)),
      error: null, 
      success: null 
    }));
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          action,
          reason,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de l\'opération');
      }
      
      // Mettre à jour l'utilisateur spécifique dans l'état local et retirer du loading
      setState(prev => ({
        ...prev,
        users: prev.users.map(user => {
          if (user.id === userId && data.updatedUser) {
            // Fusionner les données mises à jour
            return {
              ...user,
              ...data.updatedUser,
              status: data.updatedUser.status,
              adminApproved: data.updatedUser.adminApproved,
              adminApprovedAt: data.updatedUser.adminApprovedAt,
              adminApprovedBy: data.updatedUser.adminApprovedBy,
              rejectedAt: data.updatedUser.rejectedAt,
              rejectedBy: data.updatedUser.rejectedBy,
              rejectionReason: data.updatedUser.rejectionReason,
              updatedAt: data.updatedUser.updatedAt,
            };
          }
          return user;
        }),
        userActionLoading: new Set(Array.from(prev.userActionLoading).filter(id => id !== userId)),
        success: data.message || 'Opération réalisée avec succès',
      }));
      
      return data;
    } catch (error) {
      // Retirer l'utilisateur du loading en cas d'erreur
      setState(prev => ({
        ...prev,
        userActionLoading: new Set(Array.from(prev.userActionLoading).filter(id => id !== userId)),
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
      throw error;
    }
  }, []);

  const changeUserRole = useCallback(async (userId: string, newRole: 'admin' | 'user') => {
    // Ajouter l'utilisateur au loading set
    setState(prev => ({
      ...prev,
      userActionLoading: new Set([...Array.from(prev.userActionLoading), userId]),
      error: null,
      success: null,
    }));
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          action: 'change_role',
          reason: newRole, // Utiliser reason pour passer le nouveau rôle
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors du changement de rôle');
      }
      
      // Mettre à jour l'utilisateur spécifique dans l'état local et retirer du loading
      setState(prev => ({
        ...prev,
        users: prev.users.map(user => {
          if (user.id === userId && data.updatedUser) {
            // Fusionner les données mises à jour
            return {
              ...user,
              ...data.updatedUser,
              role: data.updatedUser.role,
              updatedAt: data.updatedUser.updatedAt,
            };
          }
          return user;
        }),
        userActionLoading: new Set(Array.from(prev.userActionLoading).filter(id => id !== userId)),
        success: data.message || 'Rôle modifié avec succès',
      }));
      
      // Si c'est l'utilisateur connecté qui a changé de rôle, rafraîchir son profil
      if (user && user.id === userId) {
        try {
          await refreshUserProfile();
        } catch (error) {
          console.error('Erreur lors du rafraîchissement du profil:', error);
        }
      }
      
      return data;
    } catch (error) {
      // Retirer l'utilisateur du loading en cas d'erreur
      setState(prev => ({
        ...prev,
        userActionLoading: new Set(Array.from(prev.userActionLoading).filter(id => id !== userId)),
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
      throw error;
    }
  }, [user, refreshUserProfile]);

  const createUser = useCallback(async (userData: {
    email: string;
    password?: string;
    username?: string;
    fullName: string;
    role: UserRole | string;
    status?: 'active' | 'inactive';
    department?: string;
  }) => {
    setState(prev => ({ ...prev, loading: true, error: null, success: null }));
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userData.email,
          full_name: userData.fullName,
          role: userData.role,
          department: userData.department || ''
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la création de l\'utilisateur');
      }
      
      // Rafraîchir la liste des utilisateurs
      await fetchUsers();
      
      setState(prev => ({
        ...prev,
        success: 'Utilisateur créé avec succès',
      }));
      
      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
      throw error;
    }
  }, [fetchUsers]);

  const updateUser = useCallback(async (userId: string, updates: Partial<AdminUser>) => {
    setState(prev => ({ ...prev, loading: true, error: null, success: null }));
    
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: userId,
          full_name: updates.fullName,
          role: updates.role,
          department: updates.department,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la mise à jour');
      }
      
      // Mettre à jour l'utilisateur dans la liste locale
      setState(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === userId 
            ? { ...user, ...updates }
            : user
        ),
        loading: false,
        success: 'Utilisateur mis à jour avec succès',
      }));
      
      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
      throw error;
    }
  }, []);

  const deleteUser = useCallback(async (userId: string) => {
    setState(prev => ({ ...prev, loading: true, error: null, success: null }));
    
    try {
      const response = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        const errorMessage = data.error || `Erreur ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }
      
      // Retirer l'utilisateur de la liste locale
      setState(prev => ({
        ...prev,
        users: prev.users.filter(user => user.id !== userId),
        loading: false,
        success: 'Utilisateur supprimé avec succès',
      }));
      
      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
      }));
      throw error;
    }
  }, []);

  // Charger les utilisateurs au montage du hook
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Fonction pour vérifier si un utilisateur spécifique est en cours de modification
  const isUserActionLoading = useCallback((userId: string) => {
    return state.userActionLoading.has(userId);
  }, [state.userActionLoading]);

  return {
    users: state.users,
    loading: state.loading,
    error: state.error,
    success: state.success,
    fetchUsers,
    refreshUsers: fetchUsers, // Alias pour la lisibilité
    performUserAction,
    changeUserRole, // Nouvelle fonction pour changer le rôle
    createUser,
    updateUser,
    deleteUser,
    clearMessages,
    isUserActionLoading, // Nouvelle fonction pour vérifier le loading par utilisateur
  };
};

// Fonction getNewStatus supprimée car on s'appuie maintenant sur refreshUsers() 
// pour récupérer les vraies données de la base après les modifications 