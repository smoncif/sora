'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  Tooltip,
  Typography,
  Chip,
  InputAdornment,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { UserRole } from 'lib/types/auth';

// Types
interface User {
  id: string;
  email: string;
  username: string;
  fullName: string;
  role: UserRole;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
}

// Données fictives pour la démonstration
const mockUsers: User[] = [
  {
    id: '1',
    email: 'admin@example.com',
    username: 'admin',
    fullName: 'Administrateur Système',
    role: UserRole.ADMIN,
    status: 'active',
    lastLogin: '2023-10-15T14:30:45Z',
  },
  {
    id: '2',
    email: 'editor@example.com',
    username: 'editor1',
    fullName: 'Jean Editeur',
    role: UserRole.EDITOR,
    status: 'active',
    lastLogin: '2023-10-12T09:15:22Z',
  },
  {
    id: '3',
    email: 'user1@example.com',
    username: 'user1',
    fullName: 'Marie Utilisateur',
    role: UserRole.USER,
    status: 'active',
    lastLogin: '2023-10-10T11:45:18Z',
  },
  {
    id: '4',
    email: 'user2@example.com',
    username: 'user2',
    fullName: 'Pierre Dupont',
    role: UserRole.USER,
    status: 'inactive',
    lastLogin: '2023-09-28T16:20:33Z',
  },
  {
    id: '5',
    email: 'user3@example.com',
    username: 'user3',
    fullName: 'Sophie Martin',
    role: UserRole.USER,
    status: 'suspended',
    lastLogin: '2023-09-15T10:05:12Z',
  },
];

export default function UsersPage() {
  // États
  const [users, setUsers] = useState<User[]>([]);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  
  // Chargement des données
  useEffect(() => {
    // Simuler un appel API
    const loadUsers = () => {
      setIsLoading(true);
      setTimeout(() => {
        setUsers(mockUsers);
        setIsLoading(false);
      }, 1000);
    };
    
    loadUsers();
  }, []);
  
  // Filtrer les utilisateurs en fonction du terme de recherche
  const filteredUsers = users.filter((user) => {
    const searchTermLower = searchTerm.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchTermLower) ||
      user.username.toLowerCase().includes(searchTermLower) ||
      user.fullName.toLowerCase().includes(searchTermLower)
    );
  });
  
  // Gestion de la pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };
  
  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  // Gestion de la recherche
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };
  
  // Gestion de la suppression
  const handleDeleteClick = (user: User) => {
    setUserToDelete(user);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteConfirm = () => {
    if (userToDelete) {
      // Ici, nous simulons la suppression en filtrant l'utilisateur
      setUsers(users.filter(u => u.id !== userToDelete.id));
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };
  
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setUserToDelete(null);
  };
  
  // Afficher le statut avec une puce colorée
  const renderStatusChip = (status: string) => {
    let color: 'success' | 'error' | 'warning' = 'success';
    let label = 'Actif';
    
    if (status === 'inactive') {
      color = 'warning';
      label = 'Inactif';
    } else if (status === 'suspended') {
      color = 'error';
      label = 'Suspendu';
    }
    
    return <Chip label={label} color={color} size="small" />;
  };
  
  // Formater la date de dernière connexion
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <TextField
          placeholder="Rechercher un utilisateur..."
          variant="outlined"
          size="small"
          value={searchTerm}
          onChange={handleSearchChange}
          sx={{ width: 300 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
        
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<RefreshIcon />}
            onClick={() => setUsers(mockUsers)}
            sx={{ mr: 1 }}
          >
            Actualiser
          </Button>
          <Button 
            variant="contained" 
            startIcon={<AddIcon />}
            href="/admin/users/create"
          >
            Nouvel utilisateur
          </Button>
        </Box>
      </Box>
      
      <Paper elevation={3}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nom d'utilisateur</TableCell>
                <TableCell>Nom complet</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rôle</TableCell>
                <TableCell>Statut</TableCell>
                <TableCell>Dernière connexion</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1">Chargement des utilisateurs...</Typography>
                  </TableCell>
                </TableRow>
              ) : filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography variant="body1">Aucun utilisateur trouvé</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>{user.username}</TableCell>
                      <TableCell>{user.fullName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        {user.role === UserRole.ADMIN ? 'Administrateur' : 
                         user.role === UserRole.EDITOR ? 'Éditeur' : 'Utilisateur'}
                      </TableCell>
                      <TableCell>{renderStatusChip(user.status)}</TableCell>
                      <TableCell>{formatDate(user.lastLogin)}</TableCell>
                      <TableCell align="right">
                        <Tooltip title="Modifier">
                          <IconButton 
                            size="small"
                            href={`/admin/users/edit/${user.id}`}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Supprimer">
                          <IconButton 
                            size="small" 
                            color="error"
                            onClick={() => handleDeleteClick(user)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredUsers.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
          labelRowsPerPage="Lignes par page:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count}`}
        />
      </Paper>
      
      {/* Dialogue de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
      >
        <DialogTitle>Confirmation de suppression</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Êtes-vous sûr de vouloir supprimer l'utilisateur {userToDelete?.fullName} ({userToDelete?.email}) ? 
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Annuler</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
} 



