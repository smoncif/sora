import { useState, useCallback, useEffect } from 'react';
import { UserRole } from 'lib/types/auth';

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
}

export interface UserAction {
  id: string;
  action: 'activate' | 'deactivate' | 'suspend' | 'confirm_email' | 'approve' | 'reject' | 'resend_confirmation';
  reason?: string; // Pour les rejets
}

export const useUserManagement = () => {
  const [state, setState] = useState<UserManagementState>({
    users: [],
    loading: false,
    error: null,
    success: null,
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
    setState(prev => ({ ...prev, loading: true, error: null, success: null }));
    
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
      
      // Mettre à jour l'utilisateur dans la liste locale
      setState(prev => ({
        ...prev,
        users: prev.users.map(user => 
          user.id === userId 
            ? { ...user, status: getNewStatus(action) }
            : user
        ),
        loading: false,
        success: data.message || 'Opération réalisée avec succès',
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

  return {
    users: state.users,
    loading: state.loading,
    error: state.error,
    success: state.success,
    fetchUsers,
    refreshUsers: fetchUsers, // Alias pour la lisibilité
    performUserAction,
    createUser,
    updateUser,
    deleteUser,
    clearMessages,
  };
};

function getNewStatus(action: UserAction['action']): 'active' | 'inactive' | 'suspended' | 'pending_email_confirmation' | 'pending_admin_approval' | 'rejected' {
  switch (action) {
    case 'activate':
      return 'active';
    case 'deactivate':
      return 'inactive';
    case 'suspend':
      return 'suspended';
    case 'confirm_email':
      return 'active';
    case 'approve':
      return 'active';
    case 'reject':
      return 'rejected';
    case 'resend_confirmation':
      return 'pending_email_confirmation';
    default:
      return 'active';
  }
} 