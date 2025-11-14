'use client';

import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
  Card,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Fade,
  CircularProgress,
  Alert,
  TablePagination,
  Stack,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Paper,
  IconButton,
} from '@mui/material';
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useAuth } from 'lib/hooks/auth/useAuth';
import { UserRole } from 'lib/types/auth';
import { useUserManagement } from 'lib/hooks/admin/useUserManagement';
import { format } from 'date-fns';

export default function UsersManagementPage() {
  const theme = useTheme();
  const router = useRouter();
  const { userRole, loading: authLoading } = useAuth();
  const {
    users,
    loading,
    error,
    refreshUsers,
    performUserAction,
    changeUserRole,
    isUserActionLoading,
    deleteUser,
  } = useUserManagement();
  
  // États locaux pour les filtres et la pagination
  const [searchTerm, setSearchTerm] = React.useState('');
  const [roleFilter, setRoleFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  // États pour le dialog de suppression
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [userToDelete, setUserToDelete] = React.useState<any>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  // Statistiques
  const stats = React.useMemo(() => {
    if (!users) return { total: 0, admins: 0, active: 0, pendingApproval: 0 };
    
    return {
      total: users.length,
      admins: users.filter(user => user.role === 'admin').length,
      active: users.filter(user => user.status === 'active').length,
      pendingApproval: users.filter(user => user.status === 'pending_admin_approval').length,
    };
  }, [users]);

  // Filtrage des utilisateurs
  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    
    return users.filter(user => {
      const matchesSearch = !searchTerm || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
      
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  // Pagination
  const paginatedUsers = React.useMemo(() => {
    const startIndex = page * rowsPerPage;
    return filteredUsers.slice(startIndex, startIndex + rowsPerPage);
  }, [filteredUsers, page, rowsPerPage]);

  // Formatage des dates
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Jamais';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch {
      return 'Date invalide';
    }
  };

  // Gestionnaires d'événements
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role);
    setPage(0);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setPage(0);
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Fonctions de gestion de la suppression
  const handleDeleteClick = (user: any) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;

    setIsDeleting(true);
    try {
      await deleteUser(userToDelete.id);
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  // Fonction pour changer le rôle d'un utilisateur
  const handleRoleChange = async (userId: string, newRole: 'admin' | 'user') => {
    try {
      await changeUserRole(userId, newRole);
    } catch (error) {
      console.error('Erreur lors du changement de rôle:', error);
    }
  };

  // Fonction pour activer/désactiver un utilisateur
  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    try {
      // Déterminer l'action selon le statut actuel
      let action: 'activate' | 'deactivate' | 'approve';
      
      if (currentStatus === 'pending_admin_approval' || currentStatus === 'pending_email_confirmation') {
        // Si en attente (email ou admin), on approuve directement
        action = 'approve';
      } else if (currentStatus === 'active') {
        // Si actif, on désactive
        action = 'deactivate';
      } else if (currentStatus === 'inactive' || currentStatus === 'rejected') {
        // Si inactif ou rejeté, on réactive
        action = 'activate';
      } else {
        // Fallback - activer
        action = 'activate';
      }
      

      await performUserAction(userId, action);
      // Plus besoin de refreshUsers() - la mise à jour est maintenant locale et instantanée ! 🚀
    } catch (error) {
      console.error('Erreur lors du changement de statut:', error);
    }
  };

  // Fonctions utilitaires
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'pending_admin_approval': return 'warning';
      case 'pending_email_confirmation': return 'info';
      case 'rejected': return 'error';
      case 'suspended': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'pending_admin_approval': return 'En attente';
      case 'pending_email_confirmation': return 'Email non confirmé';
      case 'rejected': return 'Rejeté';
      case 'suspended': return 'Suspendu';
      default: return status;
    }
  };

  // Vérification des permissions
  if (authLoading) {
    return (
      <Box sx={{ py: 2, px: 3, textAlign: 'center' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (userRole !== UserRole.ADMIN) {
    return (
      <Box sx={{ py: 2, px: 3 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h5" color="error" gutterBottom>
            Accès non autorisé
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cette section est réservée aux administrateurs.
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {/* En-tête moderne et épuré */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          fontWeight="bold"
          gutterBottom
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Gestion des utilisateurs
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700 }}>
          Administrez les comptes, gérez les permissions et approuvez les nouvelles inscriptions
        </Typography>
      </Box>

      {/* Statistiques compactes avec dégradés vifs */}
      <Stack direction="row" spacing={2} sx={{ mb: 4, flexWrap: 'wrap' }}>
        <Paper
          elevation={0}
          sx={{
            px: 3,
            py: 2,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none',
            minWidth: 140,
          }}
        >
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#fff' }}>
                    {stats.total}
                  </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Total
                  </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            px: 3,
            py: 2,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            border: 'none',
            minWidth: 140,
          }}
        >
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#fff' }}>
                    {stats.admins}
                  </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Admins
                  </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            px: 3,
            py: 2,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            border: 'none',
            minWidth: 140,
          }}
        >
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#fff' }}>
                    {stats.active}
                  </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            Actifs
                  </Typography>
        </Paper>

        <Paper
          elevation={0}
          sx={{
            px: 3,
            py: 2,
            borderRadius: 3,
            background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            border: 'none',
            minWidth: 140,
          }}
        >
          <Typography variant="h4" fontWeight="bold" sx={{ color: '#fff' }}>
                    {stats.pendingApproval}
                  </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.9)' }}>
            En attente
                  </Typography>
        </Paper>
      </Stack>

      {/* Barre de contrôle simplifiée */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 2.5,
          borderRadius: 3,
          background: alpha(theme.palette.background.paper, 0.6),
          backdropFilter: 'blur(10px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
        >
            {/* Recherche */}
            <TextField
            placeholder="Rechercher un utilisateur..."
              value={searchTerm}
              onChange={handleSearch}
            size="small"
              sx={{ 
                flexGrow: 1,
                minWidth: 300,
                '& .MuiOutlinedInput-root': {
                  background: theme.palette.background.paper,
                borderRadius: 2,
              },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Filtres de rôle */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label="Tous"
              size="small"
                variant={roleFilter === 'all' ? 'filled' : 'outlined'}
                color={roleFilter === 'all' ? 'primary' : 'default'}
                onClick={() => handleRoleFilterChange('all')}
              />
              <Chip
              label="Admins"
              size="small"
                variant={roleFilter === 'admin' ? 'filled' : 'outlined'}
                color={roleFilter === 'admin' ? 'primary' : 'default'}
                onClick={() => handleRoleFilterChange('admin')}
              />
              <Chip
              label="Users"
              size="small"
                variant={roleFilter === 'user' ? 'filled' : 'outlined'}
                color={roleFilter === 'user' ? 'primary' : 'default'}
                onClick={() => handleRoleFilterChange('user')}
              />
            </Stack>

            {/* Filtres de statut */}
          <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
              label="Tous statuts"
              size="small"
                variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                color={statusFilter === 'all' ? 'secondary' : 'default'}
                onClick={() => handleStatusFilterChange('all')}
              />
              <Chip
                label="Actifs"
              size="small"
                variant={statusFilter === 'active' ? 'filled' : 'outlined'}
                color={statusFilter === 'active' ? 'secondary' : 'default'}
                onClick={() => handleStatusFilterChange('active')}
              />
              <Chip
              label="Attente"
              size="small"
                variant={statusFilter === 'pending_admin_approval' ? 'filled' : 'outlined'}
                color={statusFilter === 'pending_admin_approval' ? 'secondary' : 'default'}
                onClick={() => handleStatusFilterChange('pending_admin_approval')}
              />
            </Stack>

          {/* Bouton actualiser */}
          <Button
            variant="outlined"
            size="small"
                onClick={refreshUsers}
            startIcon={<RefreshIcon fontSize="small" />}
                sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
                }}
              >
            Actualiser
          </Button>
        </Stack>
      </Paper>

      {/* Table des utilisateurs */}
      <Fade in={!loading} timeout={300}>
        <Paper
          elevation={0}
          sx={{
          borderRadius: 3,
            overflow: 'hidden',
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
          }}
        >
          {error && (
            <Alert 
              severity="error" 
              sx={{ m: 3, mb: 0 }}
              action={
                <Button color="inherit" size="small" onClick={refreshUsers}>
                  Réessayer
                </Button>
              }
            >
              {error}
            </Alert>
          )}

          {loading ? (
            <Box
              sx={{
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              py: 8,
              }}
            >
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow
                      sx={{
                        background: alpha(theme.palette.background.default, 0.5),
                      }}
                    >
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Utilisateur
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Rôle
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Statut
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Actif
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Dernière connexion
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Inscription
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedUsers.map((user) => (
                      <TableRow 
                        key={user.id}
                        sx={{
                          '&:hover': {
                            background: alpha(theme.palette.primary.main, 0.02),
                          },
                        }}
                      >
                        <TableCell>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {user.fullName || user.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.email}
                              </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 110 }}>
                            <Select
                              value={user.role}
                              onChange={(e: any) =>
                                handleRoleChange(user.id, e.target.value as 'admin' | 'user')
                              }
                              disabled={isUserActionLoading(user.id)}
                              sx={{
                                  fontSize: '0.875rem',
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: alpha(theme.palette.divider, 0.3),
                                },
                              }}
                            >
                              <MenuItem value="user">
                                <Typography variant="body2">User</Typography>
                              </MenuItem>
                              <MenuItem value="admin">
                                <Typography variant="body2">Admin</Typography>
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getStatusLabel(user.status)}
                            color={getStatusColor(user.status) as any}
                            size="small"
                            sx={{ fontSize: '0.75rem', fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell align="center">
                              <Switch
                                checked={user.status === 'active'}
                                onChange={() => handleToggleUserStatus(user.id, user.status)}
                                size="small"
                                color="success"
                                disabled={isUserActionLoading(user.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8125rem">
                            {formatDate(user.lastLogin)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="0.8125rem">
                            {formatDate(user.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(user)}
                              sx={{
                                color: theme.palette.error.main,
                                '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.1),
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Ligne vide si aucun utilisateur */}
                    {paginatedUsers.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                          <Typography variant="body2" color="text.secondary">
                            {filteredUsers.length === 0 && searchTerm 
                              ? 'Aucun utilisateur trouvé pour votre recherche'
                              : 'Aucun utilisateur disponible'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Pagination */}
              <TablePagination
                component="div"
                count={filteredUsers.length}
                page={page}
                onPageChange={handleChangePage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                rowsPerPageOptions={[5, 10, 25, 50]}
                labelRowsPerPage="Lignes par page :"
                            labelDisplayedRows={({ from, to, count }: { from: number; to: number; count: number }) =>
              `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`
                }
                sx={{
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
                  background: alpha(theme.palette.background.default, 0.3),
                }}
              />
            </>
          )}
        </Paper>
      </Fade>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
          },
        }}
      >
        <DialogTitle sx={{ pb: 2 }}>
          <Typography variant="h6" fontWeight={600}>
          Confirmer la suppression
          </Typography>
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l&apos;utilisateur{' '}
            <strong>{userToDelete?.fullName || userToDelete?.email}</strong> ?
          </DialogContentText>
          <Alert severity="error" sx={{ mt: 2 }}>
            Cette action est irréversible et supprimera définitivement le compte utilisateur.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
          <Button onClick={handleDeleteCancel} disabled={isDeleting} sx={{ textTransform: 'none' }}>
            Annuler
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
            sx={{ textTransform: 'none' }}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 