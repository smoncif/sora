import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Tooltip,
  Grid
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Security as SecurityIcon,
  CheckCircle as CheckCircleIcon,
  Stars as StarsIcon
} from '@mui/icons-material';

interface GlobalMetricsProps {
  totalRoles: number;
  globalCoverageScore: number;
  globalQualityScore: number;
  globalSecurityScore: number;
  globalOverallScore: number;
}

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: number; 
  icon: React.ElementType; 
  color: string; 
}) => (
  <Card>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Icon sx={{ color, mr: 1 }} />
        <Typography variant="h6" component="div">
          {title}
        </Typography>
      </Box>
      <Box sx={{ position: 'relative', display: 'inline-flex' }}>
        <CircularProgress
          variant="determinate"
          value={value}
          size={60}
          sx={{ color }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" component="div" color="text.secondary">
            {`${Math.round(value)}%`}
          </Typography>
        </Box>
      </Box>
    </CardContent>
  </Card>
);

export const GlobalMetrics: React.FC<GlobalMetricsProps> = ({
  totalRoles,
  globalCoverageScore,
  globalQualityScore,
  globalSecurityScore,
  globalOverallScore
}) => {
  return (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Métriques Globales
      </Typography>
      <Grid container spacing={2}>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Tooltip title="Score global de l'analyse">
            <div>
              <MetricCard
                title="Score Global"
                value={globalOverallScore}
                icon={StarsIcon}
                color="#1976d2"
              />
            </div>
          </Tooltip>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Tooltip title="Pourcentage de couverture des transactions">
            <div>
              <MetricCard
                title="Couverture"
                value={globalCoverageScore}
                icon={AssessmentIcon}
                color="#2e7d32"
              />
            </div>
          </Tooltip>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Tooltip title="Score de qualité des rôles">
            <div>
              <MetricCard
                title="Qualité"
                value={globalQualityScore}
                icon={CheckCircleIcon}
                color="#ed6c02"
              />
            </div>
          </Tooltip>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6,
            md: 3
          }}>
          <Tooltip title="Score de sécurité des rôles">
            <div>
              <MetricCard
                title="Sécurité"
                value={globalSecurityScore}
                icon={SecurityIcon}
                color="#d32f2f"
              />
            </div>
          </Tooltip>
        </Grid>
      </Grid>
    </Box>
  );
}; 

