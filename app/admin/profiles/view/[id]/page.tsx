'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { 
  Box, 
  Button, 
  Typography, 
  Alert, 
  AlertTitle, 
  Paper, 
  CircularProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Chip,
  Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import SecurityIcon from '@mui/icons-material/Security';
import PeopleIcon from '@mui/icons-material/People';
import AssessmentIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import { ProfileType, Permission } from 'lib/types/auth';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

// Données fictives pour la démonstration
const mockProfiles: ProfileType[] = [
  {
    id: '1',
    name: 'Administrateur Système',
    description: 'Accès complet à toutes les fonctionnalités de l\'application',
    permissions: [
      Permission.READ_OWN_PROFILE,
      Permission.UPDATE_OWN_PROFILE,
      Permission.READ_USERS,
      Permission.CREATE_USERS,
      Permission.UPDATE_USERS,
      Permission.DELETE_USERS,
      Permission.READ_ROLES,
      Permission.UPDATE_ROLES,
      Permission.MANAGE_SYSTEM,
      Permission.ACCESS_ROLE_ANALYSIS,
      Permission.ACCESS_USER_MAPPING,
      Permission.ACCESS_RISK_REMEDIATION,
      Permission.EXPORT_REPORTS,
      Permission.MANAGE_LICENSES
    ],
    isDefault: false,
    createdAt: '2023-09-15T10:00:00Z',
    updatedAt: '2023-09-15T10:00:00Z'
  },
  {
    id: '2',
    name: 'Gestionnaire de Rôles',
    description: 'Gestion des rôles et des analyses',
    permissions: [
      Permission.READ_OWN_PROFILE,
      Permission.UPDATE_OWN_PROFILE,
      Permission.READ_ROLES,
      Permission.UPDATE_ROLES,
      Permission.ACCESS_ROLE_ANALYSIS,
      Permission.ACCESS_USER_MAPPING,
      Permission.EXPORT_REPORTS
    ],
    isDefault: false,
    createdAt: '2023-09-15T10:00:00Z',
    updatedAt: '2023-09-15T10:00:00Z'
  },
  {
    id: '3',
    name: 'Utilisateur Standard',
    description: 'Accès de base aux fonctionnalités',
    permissions: [
      Permission.READ_OWN_PROFILE,
      Permission.UPDATE_OWN_PROFILE,
      Permission.ACCESS_ROLE_ANALYSIS
    ],
    isDefault: true,
    createdAt: '2023-09-15T10:00:00Z',
    updatedAt: '2023-09-15T10:00:00Z'
  }
];

// Groupes de permissions pour un affichage plus organisé
const permissionGroups = [
  {
    name: 'Profil',
    icon: <VerifiedUserIcon />,
    permissions: [
      Permission.READ_OWN_PROFILE,
      Permission.UPDATE_OWN_PROFILE
    ]
  },
  {
    name: 'Utilisateurs',
    icon: <PeopleIcon />,
    permissions: [
      Permission.READ_USERS,
      Permission.CREATE_USERS,
      Permission.UPDATE_USERS,
      Permission.DELETE_USERS
    ]
  },
  {
    name: 'Rôles',
    icon: <SecurityIcon />,
    permissions: [
      Permission.READ_ROLES,
      Permission.UPDATE_ROLES
    ]
  },
  {
    name: 'Modules',
    icon: <AssessmentIcon />,
    permissions: [
      Permission.ACCESS_ROLE_ANALYSIS,
      Permission.ACCESS_USER_MAPPING,
      Permission.ACCESS_RISK_REMEDIATION,
      Permission.EXPORT_REPORTS
    ]
  },
  {
    name: 'Système',
    icon: <SettingsIcon />,
    permissions: [
      Permission.MANAGE_SYSTEM,
      Permission.MANAGE_LICENSES
    ]
  }
];

// Fonction pour formater les dates
const formatDate = (dateString: string) => {
  if (!dateString) return 'Date non spécifiée';
  
  try {
    const date = new Date(dateString);
    // Vérifier si la date est valide
    if (isNaN(date.getTime())) {
      return 'Date invalide';
    }
    
    // Formater la date au format français sans utiliser l'option locale
    // qui semble causer un problème
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.error("Erreur lors du formatage de la date:", error);
    return 'Date invalide';
  }
};

// Fonction pour convertir enum Permission en texte lisible
const getPermissionLabel = (permission: Permission): string => {
  const labels: Record<Permission, string> = {
    [Permission.READ_OWN_PROFILE]: 'Voir son profil',
    [Permission.UPDATE_OWN_PROFILE]: 'Modifier son profil',
    [Permission.READ_USERS]: 'Voir les utilisateurs',
    [Permission.CREATE_USERS]: 'Créer des utilisateurs',
    [Permission.UPDATE_USERS]: 'Modifier des utilisateurs',
    [Permission.DELETE_USERS]: 'Supprimer des utilisateurs',
    [Permission.READ_ROLES]: 'Voir les rôles',
    [Permission.UPDATE_ROLES]: 'Modifier les rôles',
    [Permission.MANAGE_SYSTEM]: 'Gérer le système',
    [Permission.ACCESS_ROLE_ANALYSIS]: 'Accéder à l\'analyse de rôles',
    [Permission.ACCESS_USER_MAPPING]: 'Accéder au mapping utilisateur',
    [Permission.ACCESS_RISK_REMEDIATION]: 'Accéder à la remédiation des risques',
    [Permission.EXPORT_REPORTS]: 'Exporter des rapports',
    [Permission.MANAGE_LICENSES]: 'Gérer les licences'
  };
  return labels[permission] || permission;
};

export default function ViewProfilePage() {
  const router = useRouter();
  const params = React.use(useParams());
  const profileId = params.id as string;
  
  const [profile, setProfile] = useState<ProfileType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Charger les données du profil
  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Simuler un appel API avec un délai
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Rechercher le profil dans les données fictives
        const foundProfile = mockProfiles.find(p => p.id === profileId);
        
        if (!foundProfile) {
          setError('Profil non trouvé');
          return;
        }
        
        setProfile(foundProfile);
      } catch (err) {
        setError('Une erreur s\'est produite lors du chargement du profil.');
        console.error('Erreur lors du chargement du profil:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProfile();
  }, [profileId]);

  const handleBack = () => {
    router.push('/admin/profiles');
  };

  const handleEdit = () => {
    router.push(`/admin/profiles/edit/${profileId}`);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!profile && !isLoading) {
    return (
      <Box sx={{ my: 3 }}>
        <Alert severity="error">
          <AlertTitle>Erreur</AlertTitle>
          Profil non trouvé ou erreur lors du chargement.
          {error && <Typography variant="body2" sx={{ mt: 1 }}>{error}</Typography>}
        </Alert>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={handleBack}
          sx={{ mt: 2 }}
        >
          Retour à la liste des profils
        </Button>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBack}
            sx={{ mr: 2 }}
          >
            Retour
          </Button>
          <Typography variant="h6">Détails du profil</Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          startIcon={<EditIcon />}
          onClick={handleEdit}
        >
          Modifier
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Erreur</AlertTitle>
          {error}
        </Alert>
      )}

      {profile && (
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informations générales
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Nom
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {profile.name}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Description
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {profile.description}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Statut
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    {profile.isDefault ? (
                      <Chip 
                        icon={<CheckCircleIcon />} 
                        label="Profil par défaut" 
                        color="primary" 
                        size="small" 
                      />
                    ) : (
                      <Chip 
                        label="Profil standard" 
                        variant="outlined" 
                        size="small" 
                      />
                    )}
                  </Box>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Date de création
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {profile.createdAt ? formatDate(profile.createdAt) : 'Non spécifiée'}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Dernière mise à jour
                  </Typography>
                  <Typography variant="body1">
                    {profile.updatedAt ? formatDate(profile.updatedAt) : 'Non spécifiée'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, md: 6 }}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Permissions ({profile.permissions.length})
                </Typography>
                
                {permissionGroups.map((group, index) => {
                  // Filtrer les permissions du profil qui correspondent à ce groupe
                  const groupPermissions = group.permissions.filter(p => 
                    profile.permissions.includes(p)
                  );
                  
                  // Ne pas afficher le groupe s'il n'a pas de permissions
                  if (groupPermissions.length === 0) return null;
                  
                  return (
                    <React.Fragment key={group.name}>
                      {index > 0 && <Divider sx={{ my: 2 }} />}
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                        <Box sx={{ mr: 1 }}>{group.icon}</Box>
                        <Typography variant="subtitle1">{group.name}</Typography>
                      </Box>
                      <List dense>
                        {groupPermissions.map(permission => (
                          <ListItem key={permission}>
                            <ListItemIcon sx={{ minWidth: 36 }}>
                              <CheckCircleIcon color="success" fontSize="small" />
                            </ListItemIcon>
                            <ListItemText primary={getPermissionLabel(permission)} />
                          </ListItem>
                        ))}
                      </List>
                    </React.Fragment>
                  );
                })}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </>
  );
} 