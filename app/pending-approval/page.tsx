'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  Container,
  useTheme,
  alpha,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  AdminPanelSettings as AdminIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

const steps = [
  {
    label: 'Inscription',
    description: 'Votre compte a été créé avec succès',
    icon: <CheckCircleIcon color="success" />,
    completed: true,
  },
  {
    label: 'Confirmation email',
    description: 'Votre adresse email a été confirmée',
    icon: <CheckCircleIcon color="success" />,
    completed: true,
  },
  {
    label: 'Approbation administrateur',
    description: 'En attente de validation par un administrateur',
    icon: <ScheduleIcon color="warning" />,
    completed: false,
    active: true,
  },
  {
    label: 'Accès à l\'application',
    description: 'Vous pourrez vous connecter une fois approuvé',
    icon: <AdminIcon color="disabled" />,
    completed: false,
  },
];

export default function PendingApprovalPage() {
  const theme = useTheme();
  const router = useRouter();

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Box sx={{ 
          display: 'inline-flex',
          p: 2,
          borderRadius: '50%',
          background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
          mb: 2,
        }}>
          <ScheduleIcon sx={{ fontSize: 48, color: 'warning.main' }} />
        </Box>
        
        <Typography variant="h3" fontWeight="bold" gutterBottom>
          En attente d'approbation
        </Typography>
        
        <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
          Votre email a été confirmé avec succès !
        </Typography>
      </Box>

      <Card sx={{ 
        mb: 4,
        borderRadius: 3,
        boxShadow: `0 8px 32px ${alpha(theme.palette.common.black, 0.08)}`,
        border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
      }}>
        <CardContent sx={{ p: 4 }}>
          <Alert 
            severity="info" 
            sx={{ 
              mb: 4,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${alpha(theme.palette.info.main, 0.1)} 0%, ${alpha(theme.palette.info.main, 0.05)} 100%)`,
              border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
            }}
            icon={<EmailIcon />}
          >
            <Typography variant="body1" fontWeight={600}>
              Email confirmé avec succès !
            </Typography>
            <Typography variant="body2">
              Votre adresse email a été vérifiée. Vous devez maintenant attendre qu'un administrateur approuve votre compte.
            </Typography>
          </Alert>

          <Typography variant="h6" gutterBottom sx={{ mb: 3 }}>
            Processus de validation
          </Typography>

          <Stepper orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.label} active={step.active} completed={step.completed}>
                <StepLabel
                  icon={step.icon}
                  sx={{
                    '& .MuiStepLabel-iconContainer': {
                      paddingRight: 2,
                    }
                  }}
                >
                  <Typography variant="body1" fontWeight={step.active ? 600 : 400}>
                    {step.label}
                  </Typography>
                </StepLabel>
                <StepContent>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      <Card sx={{ 
        mb: 4,
        borderRadius: 3,
        background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.05)} 0%, ${alpha(theme.palette.warning.main, 0.02)} 100%)`,
        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
      }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h6" gutterBottom color="warning.main">
            Prochaines étapes
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>📧 Notification par email :</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vous recevrez un email de confirmation une fois que votre compte aura été approuvé par un administrateur. 
              Cela peut prendre de quelques heures à quelques jours selon la charge de travail de l'équipe.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>🔑 Accès à l'application :</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Une fois approuvé, vous pourrez vous connecter normalement avec vos identifiants 
              et accéder à toutes les fonctionnalités de l'application.
            </Typography>
          </Box>

          <Box>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>❓ Besoin d'aide :</strong>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Si vous avez des questions ou si l'approbation prend plus de temps que prévu, 
              n'hésitez pas à contacter l'équipe de support.
            </Typography>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={() => router.push('/login')}
          sx={{
            borderRadius: 2,
            px: 4,
            py: 1.5,
          }}
        >
          Retour à la connexion
        </Button>
      </Box>
    </Container>
  );
}
 