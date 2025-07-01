'use client';

import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Button,
  Avatar,
  Tooltip,
  TextField,
  InputAdornment,
  Fade,
  CircularProgress,
  Alert,
  TablePagination,
  Stack,
  Grid,
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
} from '@mui/material';
import {
  Search as SearchIcon,
  Person as PersonIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  AccountCircle as UserIcon,
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Block as BlockIcon,
  Warning as WarningIcon,
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
  const getRoleIcon = (role: string) => {
    return role === 'admin' ? <AdminIcon /> : <UserIcon />;
  };

  const getRoleColor = (role: string) => {
    return role === 'admin' ? 'primary' : 'default';
  };

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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckIcon />;
      case 'pending_admin_approval': return <ScheduleIcon />;
      case 'pending_email_confirmation': return <EmailIcon />;
      case 'rejected': return <CloseIcon />;
      case 'suspended': return <BlockIcon />;
      default: return <WarningIcon />;
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
    <Box sx={{ py: 2, px: 3 }}>
      {/* En-tête */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>
          Gestion des utilisateurs
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Administrez les comptes utilisateurs et gérez les permissions
        </Typography>
      </Box>

      {/* Statistiques principales */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.primary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            borderRadius: 3,
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                }}>
                  <PeopleIcon />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.total}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total utilisateurs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.secondary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.secondary.main, 0.2)}`,
            borderRadius: 3,
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.secondary.main, 0.1),
                  color: theme.palette.secondary.main,
                }}>
                  <AdminIcon />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.admins}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Administrateurs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.1)} 0%, ${alpha(theme.palette.success.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
            borderRadius: 3,
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.1),
                  color: theme.palette.success.main,
                }}>
                  <TrendingUpIcon />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.active}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Comptes actifs
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 3 }}>
          <Card sx={{
            background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
            border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
            borderRadius: 3,
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.warning.main, 0.1),
                  color: theme.palette.warning.main,
                }}>
                  <ScheduleIcon />
                </Box>
                <Box>
                  <Typography variant="h4" fontWeight="bold">
                    {stats.pendingApproval}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    En attente d'approbation
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

      </Grid>

      {/* Barre d'actions et filtres */}
      <Card sx={{ 
        mb: 4,
        background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        borderRadius: 3,
      }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            gap: 3, 
            alignItems: 'center',
            flexWrap: 'wrap',
          }}>
            {/* Recherche */}
            <TextField
              placeholder="Rechercher par email, nom d'utilisateur ou nom complet..."
              value={searchTerm}
              onChange={handleSearch}
              sx={{ 
                flexGrow: 1,
                minWidth: 300,
                '& .MuiOutlinedInput-root': {
                  background: theme.palette.background.paper,
                }
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
            />
            
            {/* Filtres de rôle */}
            <Stack direction="row" spacing={1}>
              <Chip
                label="Tous"
                variant={roleFilter === 'all' ? 'filled' : 'outlined'}
                color={roleFilter === 'all' ? 'primary' : 'default'}
                onClick={() => handleRoleFilterChange('all')}
                icon={<FilterIcon />}
              />
              <Chip
                label="Administrateurs"
                variant={roleFilter === 'admin' ? 'filled' : 'outlined'}
                color={roleFilter === 'admin' ? 'primary' : 'default'}
                onClick={() => handleRoleFilterChange('admin')}
                icon={<AdminIcon />}
              />
              <Chip
                label="Utilisateurs"
                variant={roleFilter === 'user' ? 'filled' : 'outlined'}
                color={roleFilter === 'user' ? 'primary' : 'default'}
                onClick={() => handleRoleFilterChange('user')}
                icon={<UserIcon />}
              />
            </Stack>

            {/* Filtres de statut */}
            <Stack direction="row" spacing={1}>
              <Chip
                label="Tous"
                variant={statusFilter === 'all' ? 'filled' : 'outlined'}
                color={statusFilter === 'all' ? 'secondary' : 'default'}
                onClick={() => handleStatusFilterChange('all')}
              />
              <Chip
                label="Actifs"
                variant={statusFilter === 'active' ? 'filled' : 'outlined'}
                color={statusFilter === 'active' ? 'secondary' : 'default'}
                onClick={() => handleStatusFilterChange('active')}
              />
              <Chip
                label="En attente admin"
                variant={statusFilter === 'pending_admin_approval' ? 'filled' : 'outlined'}
                color={statusFilter === 'pending_admin_approval' ? 'secondary' : 'default'}
                onClick={() => handleStatusFilterChange('pending_admin_approval')}
              />

            </Stack>

            {/* Bouton de rafraîchissement */}
            <Tooltip title="Actualiser">
              <IconButton
                onClick={refreshUsers}
                sx={{
                  background: alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    background: alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </CardContent>
      </Card>

      {/* Table des utilisateurs */}
      <Fade in={!loading} timeout={300}>
        <Card sx={{ 
          background: theme.palette.background.paper,
          borderRadius: 3,
          boxShadow: `0 4px 20px 0 ${alpha(theme.palette.common.black, 0.05)}`,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}>
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
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center',
              py: 8,
            }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ 
                      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                    }}>
                      <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        Utilisateur
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        Rôle
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        Statut de validation
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        Activation
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        Dernière connexion
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
                        Créé le
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 600, color: theme.palette.text.primary }}>
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
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar 
                              sx={{ 
                                width: 40, 
                                height: 40,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                              }}
                            >
                              <PersonIcon />
                            </Avatar>
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {user.fullName || user.username}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {user.email}
                              </Typography>
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <FormControl size="small" sx={{ minWidth: 130 }}>
                            <Select
                              value={user.role}
                              onChange={(e: any) => handleRoleChange(user.id, e.target.value as 'admin' | 'user')}
                              disabled={isUserActionLoading(user.id)}
                              sx={{
                                '& .MuiSelect-select': {
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 1,
                                  fontSize: '0.875rem',
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                  borderColor: alpha(theme.palette.divider, 0.3),
                                },
                                '&:hover .MuiOutlinedInput-notchedOutline': {
                                  borderColor: alpha(theme.palette.primary.main, 0.5),
                                },
                              }}
                            >
                              <MenuItem value="user">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <UserIcon fontSize="small" />
                                  <Typography variant="body2">Utilisateur</Typography>
                                </Box>
                              </MenuItem>
                              <MenuItem value="admin">
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <AdminIcon fontSize="small" />
                                  <Typography variant="body2">Administrateur</Typography>
                                </Box>
                              </MenuItem>
                            </Select>
                          </FormControl>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={getStatusIcon(user.status)}
                            label={getStatusLabel(user.status)}
                            color={getStatusColor(user.status) as any}
                            variant="filled"
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="center">
                          <FormControlLabel
                            control={
                              <Switch
                                checked={user.status === 'active'}
                                onChange={() => handleToggleUserStatus(user.id, user.status)}
                                size="small"
                                color="success"
                                disabled={isUserActionLoading(user.id)}
                              />
                            }
                            label=""
                            sx={{ m: 0 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(user.lastLogin)}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {formatDate(user.createdAt)}
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Supprimer">
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteClick(user)}
                              sx={{
                                background: alpha(theme.palette.error.main, 0.1),
                                color: theme.palette.error.main,
                                '&:hover': {
                                  background: alpha(theme.palette.error.main, 0.2),
                                }
                              }}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}

                    {/* Ligne vide si aucun utilisateur */}
                    {paginatedUsers.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                          <Typography color="text.secondary">
                            {filteredUsers.length === 0 && searchTerm 
                              ? 'Aucun utilisateur trouvé pour votre recherche'
                              : 'Aucun utilisateur disponible'
                            }
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
                  borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  background: alpha(theme.palette.background.default, 0.3),
                }}
              />
            </>
          )}
        </Card>
      </Fade>

      {/* Dialog de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Confirmer la suppression
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l&apos;utilisateur{' '}
            <strong>{userToDelete?.fullName || userToDelete?.email}</strong> ?
          </DialogContentText>
          <DialogContentText sx={{ mt: 2, color: 'error.main' }}>
            Cette action est irréversible et supprimera définitivement le compte utilisateur.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={handleDeleteCancel}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {isDeleting ? 'Suppression...' : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 