'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  TextField,
  Card,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  TablePagination,
  InputAdornment,
  Alert,
  AlertTitle
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { ProfileType, Permission } from '@/types/auth';

// Types pour les profils
interface Profile {
  id: string;
  name: string;
  email: string;
  role: string;
  lastActive: string;
  status: 'active' | 'inactive';
}

// Données mockées pour les profils
const mockProfiles: Profile[] = [
  { id: '1', name: 'Admin User', email: 'admin@example.com', role: 'Administrateur', lastActive: '2023-10-15', status: 'active' },
  { id: '2', name: 'Editor User', email: 'editor@example.com', role: 'Éditeur', lastActive: '2023-10-14', status: 'active' },
  { id: '3', name: 'Viewer User', email: 'viewer@example.com', role: 'Lecteur', lastActive: '2023-10-10', status: 'inactive' },
  { id: '4', name: 'Manager User', email: 'manager@example.com', role: 'Gestionnaire', lastActive: '2023-10-12', status: 'active' },
  { id: '5', name: 'Guest User', email: 'guest@example.com', role: 'Invité', lastActive: '2023-09-30', status: 'inactive' },
];

export default function ProfilesPage() {
  const router = useRouter();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [profileToDelete, setProfileToDelete] = useState<Profile | null>(null);

  useEffect(() => {
    // Simuler le chargement des données depuis l'API
    const loadProfiles = async () => {
      try {
        // Dans une implémentation réelle, ceci serait remplacé par un appel API
        // const response = await fetch('/api/profiles');
        // const data = await response.json();
        // setProfiles(data);
        
        // Utiliser les données mockées
        setTimeout(() => {
          setProfiles(mockProfiles);
          setLoading(false);
        }, 800);
      } catch (error) {

        setLoading(false);
      }
    };

    loadProfiles();
  }, []);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleCreateProfile = () => {
    router.push('/admin/profiles/new');
  };

  const handleEditProfile = (profileId: string) => {
    router.push(`/admin/profiles/edit/${profileId}`);
  };

  const handleDeleteClick = (profile: Profile) => {
    setProfileToDelete(profile);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!profileToDelete) return;
    
    try {
      // Dans une implémentation réelle, ceci serait un appel API
      // await fetch(`/api/profiles/${profileToDelete.id}`, { method: 'DELETE' });
      
      // Simuler la suppression
      setProfiles(profiles.filter(p => p.id !== profileToDelete.id));
      setDeleteDialogOpen(false);
      setProfileToDelete(null);
    } catch (error) {

    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setProfileToDelete(null);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Gestion des Profils</Typography>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<AddIcon />}
          onClick={handleCreateProfile}
        >
          Nouveau Profil
        </Button>
      </Box>

      <Card>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <TableContainer component={Paper}>
              <Table sx={{ minWidth: 650 }} aria-label="table des profils">
                <TableHead>
                  <TableRow>
                    <TableCell>Nom</TableCell>
                    <TableCell>Email</TableCell>
                    <TableCell>Rôle</TableCell>
                    <TableCell>Dernière Activité</TableCell>
                    <TableCell>Statut</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {profiles
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((profile) => (
                      <TableRow key={profile.id} hover>
                        <TableCell>{profile.name}</TableCell>
                        <TableCell>{profile.email}</TableCell>
                        <TableCell>{profile.role}</TableCell>
                        <TableCell>{profile.lastActive}</TableCell>
                        <TableCell>
                          <Box 
                            component="span" 
                            sx={{ 
                              px: 1.5, 
                              py: 0.5, 
                              borderRadius: 1, 
                              fontSize: '0.8rem',
                              bgcolor: profile.status === 'active' ? 'success.light' : 'error.light',
                              color: 'white',
                            }}
                          >
                            {profile.status === 'active' ? 'Actif' : 'Inactif'}
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton 
                            color="primary" 
                            aria-label="modifier"
                            onClick={() => handleEditProfile(profile.id)}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton 
                            color="error" 
                            aria-label="supprimer"
                            onClick={() => handleDeleteClick(profile)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  {profiles.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center">
                        <Typography variant="body1" sx={{ py: 2 }}>
                          Aucun profil trouvé
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={profiles.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
              labelRowsPerPage="Lignes par page:"
              labelDisplayedRows={({ from, to, count }) => `${from}-${to} sur ${count !== -1 ? count : `plus de ${to}`}`}
            />
          </>
        )}
      </Card>

      {/* Dialogue de confirmation de suppression */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          Confirmation de suppression
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Êtes-vous sûr de vouloir supprimer le profil de {profileToDelete?.name} ? 
            Cette action est irréversible.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Annuler
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" autoFocus>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 
