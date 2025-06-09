'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Checkbox,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Grid,
  Switch,
  TextField,
  Typography,
  Tooltip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Paper,
  Chip
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ProfileType, Permission } from '@/types/auth';
import HelpIcon from '@mui/icons-material/Help';
import SecurityIcon from '@mui/icons-material/Security';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import SettingsIcon from '@mui/icons-material/Settings';
import BarChartIcon from '@mui/icons-material/BarChart';
import LockIcon from '@mui/icons-material/Lock';

// Schéma de validation pour le profil
const profileSchema = z.object({
  name: z.string().min(3, 'Le nom doit contenir au moins 3 caractères'),
  description: z.string().min(10, 'La description doit contenir au moins 10 caractères'),
  permissions: z.array(z.nativeEnum(Permission)).min(1, 'Sélectionnez au moins une permission'),
  isDefault: z.boolean().optional()
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileFormProps {
  initialData?: ProfileType;
  onSubmit: (data: ProfileFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

// Groupe les permissions par catégorie pour une meilleure organisation
const permissionGroups = [
  {
    name: 'Profil utilisateur',
    icon: <PeopleIcon />,
    permissions: [
      { value: Permission.READ_OWN_PROFILE, label: 'Voir son profil', description: 'Permet à l\'utilisateur de voir son propre profil' },
      { value: Permission.UPDATE_OWN_PROFILE, label: 'Modifier son profil', description: 'Permet à l\'utilisateur de modifier son propre profil' }
    ]
  },
  {
    name: 'Gestion des utilisateurs',
    icon: <PeopleIcon />,
    permissions: [
      { value: Permission.READ_USERS, label: 'Voir les utilisateurs', description: 'Permet de voir la liste des utilisateurs' },
      { value: Permission.CREATE_USERS, label: 'Créer des utilisateurs', description: 'Permet de créer de nouveaux utilisateurs' },
      { value: Permission.UPDATE_USERS, label: 'Modifier des utilisateurs', description: 'Permet de modifier les informations des utilisateurs existants' },
      { value: Permission.DELETE_USERS, label: 'Supprimer des utilisateurs', description: 'Permet de supprimer des utilisateurs du système' }
    ]
  },
  {
    name: 'Gestion des rôles',
    icon: <SecurityIcon />,
    permissions: [
      { value: Permission.READ_ROLES, label: 'Voir les rôles', description: 'Permet de voir la liste des rôles' },
      { value: Permission.UPDATE_ROLES, label: 'Modifier les rôles', description: 'Permet de modifier les rôles existants' }
    ]
  },
  {
    name: 'Modules fonctionnels',
    icon: <DashboardIcon />,
    permissions: [
      { value: Permission.ACCESS_ROLE_ANALYSIS, label: 'Accès à l\'analyse de rôles', description: 'Permet d\'accéder au module d\'analyse de rôles' },
      { value: Permission.ACCESS_USER_MAPPING, label: 'Accès au mapping utilisateur', description: 'Permet d\'accéder au module de mapping utilisateur' },
      { value: Permission.ACCESS_RISK_REMEDIATION, label: 'Accès à la remédiation des risques', description: 'Permet d\'accéder au module de remédiation des risques SoD' }
    ]
  },
  {
    name: 'Rapports et exports',
    icon: <BarChartIcon />,
    permissions: [
      { value: Permission.EXPORT_REPORTS, label: 'Exporter des rapports', description: 'Permet d\'exporter des rapports dans différents formats' }
    ]
  },
  {
    name: 'Administration système',
    icon: <SettingsIcon />,
    permissions: [
      { value: Permission.MANAGE_SYSTEM, label: 'Gérer le système', description: 'Permet de gérer les paramètres système' },
      { value: Permission.MANAGE_LICENSES, label: 'Gérer les licences', description: 'Permet de gérer les licences de l\'application' }
    ]
  }
];

export const ProfileForm: React.FC<ProfileFormProps> = ({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  // Configurer le formulaire avec react-hook-form et zod
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: initialData ? {
      name: initialData.name,
      description: initialData.description,
      permissions: initialData.permissions,
      isDefault: initialData.isDefault || false
    } : {
      name: '',
      description: '',
      permissions: [],
      isDefault: false
    }
  });

  // Observer les permissions sélectionnées
  const selectedPermissions = watch('permissions');

  // Fonction pour vérifier si une permission est sélectionnée
  const isPermissionSelected = (permission: Permission) => {
    return selectedPermissions?.includes(permission) || false;
  };

  // Gérer la sélection/désélection d'une permission
  const handlePermissionToggle = (permission: Permission) => {
    const currentPermissions = [...(selectedPermissions || [])];
    const index = currentPermissions.indexOf(permission);
    
    if (index === -1) {
      currentPermissions.push(permission);
    } else {
      currentPermissions.splice(index, 1);
    }
    
    setValue('permissions', currentPermissions);
  };

  // Sélectionner/désélectionner toutes les permissions d'un groupe
  const handleGroupToggle = (groupPermissions: Permission[]) => {
    const allSelected = groupPermissions.every(p => isPermissionSelected(p));
    
    if (allSelected) {
      // Si toutes sont sélectionnées, les désélectionner
      const newPermissions = selectedPermissions.filter(p => !groupPermissions.includes(p));
      setValue('permissions', newPermissions);
    } else {
      // Sinon, sélectionner toutes celles qui ne le sont pas
      const newPermissions = [...selectedPermissions];
      groupPermissions.forEach(p => {
        if (!newPermissions.includes(p)) {
          newPermissions.push(p);
        }
      });
      setValue('permissions', newPermissions);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader 
          title={initialData ? "Modifier le profil" : "Créer un nouveau profil"} 
          subheader="Définissez les informations du profil et ses permissions"
        />
        <Divider />
        <CardContent>
          <Grid container spacing={3}>
            <Grid size={{ xs: 12 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Nom du profil"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    error={!!errors.description}
                    helperText={errors.description?.message}
                    disabled={isSubmitting}
                  />
                )}
              />
            </Grid>
            
            <Grid size={{ xs: 12 }}>
              <Controller
                name="isDefault"
                control={control}
                render={({ field }) => (
                  <FormControlLabel 
                    control={
                      <Switch 
                        checked={field.value} 
                        onChange={field.onChange}
                        disabled={isSubmitting}
                      />
                    } 
                    label="Définir comme profil par défaut pour les nouveaux utilisateurs"
                  />
                )}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      
      <Card sx={{ mt: 3 }}>
        <CardHeader 
          title="Permissions"
          subheader="Sélectionnez les permissions à attribuer à ce profil"
          action={
            errors.permissions && (
              <Chip 
                label="Au moins une permission requise" 
                color="error" 
                size="small"
                sx={{ mt: 1 }}
              />
            )
          }
        />
        <Divider />
        <CardContent>
          {permissionGroups.map((group, index) => (
            <Paper 
              key={group.name} 
              elevation={0} 
              sx={{ 
                mb: 2, 
                p: 2, 
                border: '1px solid', 
                borderColor: 'divider',
                borderRadius: 1
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ mr: 1 }}>{group.icon}</Box>
                  <Typography variant="subtitle1">{group.name}</Typography>
                </Box>
                <Button
                  size="small"
                  onClick={() => handleGroupToggle(group.permissions.map(p => p.value))}
                >
                  {group.permissions.every(p => isPermissionSelected(p.value)) ? 'Désélectionner tout' : 'Sélectionner tout'}
                </Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <FormGroup>
                <Grid container spacing={1}>
                  {group.permissions.map((permission) => (
                    <Grid key={permission.value} size={{ xs: 12, md: 6 }}>
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isPermissionSelected(permission.value)}
                            onChange={() => handlePermissionToggle(permission.value)}
                            disabled={isSubmitting}
                          />
                        }
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {permission.label}
                            <Tooltip title={permission.description}>
                              <HelpIcon fontSize="small" sx={{ ml: 1, color: 'text.secondary', fontSize: 16 }} />
                            </Tooltip>
                          </Box>
                        }
                      />
                    </Grid>
                  ))}
                </Grid>
              </FormGroup>
            </Paper>
          ))}
          
          {errors.permissions && (
            <FormHelperText error>
              {errors.permissions.message}
            </FormHelperText>
          )}
        </CardContent>
      </Card>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Annuler
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting}
          startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
        >
          {isSubmitting ? 'Enregistrement...' : initialData ? 'Mettre à jour' : 'Créer'}
        </Button>
      </Box>
    </form>
  );
}; 
