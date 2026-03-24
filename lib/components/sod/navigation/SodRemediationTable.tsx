/**
 * Tableau de remédiation des risques SoD
 * Affiche les carrés colorés pour chaque combinaison rôle/risque
 */

'use client';

import React from 'react';
import {
  Box,
  Typography,
  useTheme,
  alpha,
} from '@mui/material';
import { SodSession, SodRiskLevel, SOD_RISK_LEVEL_COLORS } from 'lib/types/sodAnalysis';
import { calculateRiskRemediation, calculateCompositeRiskRemediation } from 'lib/utils/sodRulesApplication';
import { NavigationMode } from 'lib/hooks/sod/useSodNavigation';

export interface SodRemediationTableProps {
  /** Session SoD actuelle */
  session: SodSession;
  /** Mode d'affichage (simple ou composite) */
  mode: NavigationMode;
  /** Callback pour naviguer vers un risque */
  onNavigateToRisk: (roleName: string, riskCode: string, targetStep: number) => void;
}

interface RiskState {
  code: string;
  name: string;
  level: SodRiskLevel;
  isRemediated: boolean;
}

interface RoleData {
  name: string;
  risks: RiskState[];
}

// ✅ OPTIMISATION : Mémoriser le composant pour éviter les re-rendus inutiles
export const SodRemediationTable: React.FC<SodRemediationTableProps> = React.memo(({
  session,
  mode,
  onNavigateToRisk,
}) => {
  const theme = useTheme();

  // Pas besoin de collecter tous les risques uniques - chaque rôle a ses propres risques
  // Structure dynamique : autant de carrés que de risques par rôle

  // Préparer les données des rôles avec leurs états de remédiation
  // ✅ OPTIMISATION : Utiliser les nouvelles fonctions de remédiation
  const rolesData = React.useMemo((): RoleData[] => {
    const roles: RoleData[] = [];
    
    if (mode === 'simple' && session.simpleRoles?.roles) {
      
      session.simpleRoles.roles.forEach(role => {
        const roleRisks: RiskState[] = [];
        
        role.risks?.forEach(risk => {
          // ✅ NOUVELLE LOGIQUE : Utiliser calculateRiskRemediation
          const remediation = calculateRiskRemediation(role.roleName, risk.functions);
          
          roleRisks.push({
            code: risk.riskId || risk.code || `RISK_${role.roleName}_${risk.name}`, // Fallback si code n'existe pas
            name: risk.name || risk.riskId || 'Risque sans nom',
            level: risk.riskLevel as SodRiskLevel,
            isRemediated: remediation.isRemediated,
          });
        });
        
        roles.push({
          name: role.roleName,
          risks: roleRisks,
        });
      });
    } else if (mode === 'composite' && session.compositeRoles?.roles) {
      
      session.compositeRoles.roles.forEach(role => {
        const roleRisks: RiskState[] = [];
        
        role.risks?.forEach(risk => {
          // ✅ NOUVELLE LOGIQUE : Utiliser calculateCompositeRiskRemediation
          const remediation = calculateCompositeRiskRemediation(role.roleName, risk.functions);
          
          roleRisks.push({
            code: risk.riskId || risk.code || `RISK_${role.roleName}_${risk.name}`, // Fallback si code n'existe pas
            name: risk.name || risk.riskId || 'Risque sans nom',
            level: risk.riskLevel as SodRiskLevel,
            isRemediated: remediation.isRemediated,
          });
        });
        
        roles.push({
          name: role.roleName,
          risks: roleRisks,
        });
      });
    } else if (mode === 'users' && session.users) {
      // Mode utilisateurs : Afficher les risques par utilisateur
      console.log('🔍 [REMEDIATION TABLE] Mode utilisateurs:', {
        usersCount: session.users.length,
        firstUser: session.users[0],
        hasRisksByRole: session.users[0]?.risksByRole?.length > 0,
      });
      
      session.users.forEach((user: any) => {
        const userRisks: RiskState[] = [];
        
        console.log('👤 [USER]:', {
          userId: user.userId,
          risksByRoleCount: user.risksByRole?.length || 0,
          risksByRole: user.risksByRole,
        });
        
        // Parcourir tous les risques de l'utilisateur (MODE "Par Rôle")
        user.risksByRole?.forEach((risk: any) => {
          // Le statut de remédiation est déjà calculé dans la structure
          userRisks.push({
            code: risk.riskId || `RISK_${user.userId}_${userRisks.length}`,
            name: risk.riskDescription || risk.riskId || 'Risque sans nom',
            level: risk.riskLevel as SodRiskLevel,
            isRemediated: risk.isRemediated || false,
          });
        });
        
        console.log('📊 [USER RISKS]:', {
          userId: user.userId,
          userRisksCount: userRisks.length,
          userRisks,
        });
        
        // Utiliser userId comme identifiant
        roles.push({
          name: user.userId || `User_${roles.length + 1}`,
          risks: userRisks,
        });
      });
      
      console.log('✅ [REMEDIATION TABLE] Résultat final pour users:', {
        rolesCount: roles.length,
        roles,
      });
    }
    
    return roles;
  }, [session, mode]); // ✅ OPTIMISÉ : Dépendances simplifiées

  // Obtenir la couleur d'un carré selon la logique de remédiation et criticité
  const getSquareColor = (risk: RiskState) => {
    // Si le risque est remédié → Vert foncé
    if (risk.isRemediated) {
      return theme.palette.success.dark;
    }
    
    // Sinon → Couleur selon la criticité
    switch (risk.level) {
      case 'CRITICAL':
        return theme.palette.error.dark;
      case 'HIGH':
        return theme.palette.error.main;
      case 'MEDIUM':
        return theme.palette.warning.main;
      case 'LOW':
        return theme.palette.success.light; // Vert clair pour les risques faibles non remédiés
      default:
        return theme.palette.error.main;
    }
  };

  // ✅ OPTIMISATION : Mémoriser le callback pour éviter les re-rendus
  const handleSquareClick = React.useCallback((roleName: string, riskCode: string) => {
    const targetStep = mode === 'simple' ? 1 : mode === 'composite' ? 2 : 3; // 3 = Utilisateurs
    onNavigateToRisk(roleName, riskCode, targetStep);
  }, [mode, onNavigateToRisk]);

  if (rolesData.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Aucun rôle trouvé pour les {mode === 'simple' ? 'rôles simples' : mode === 'composite' ? 'rôles composites' : 'utilisateurs'}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      {/* Lignes des rôles - Structure dynamique */}
      {rolesData.map((role, roleIndex) => (
        <Box key={`${mode}-${role.name}-${roleIndex}`} sx={{ display: 'flex', mb: 1, alignItems: 'center' }}>
          {/* Numéro de ligne */}
          <Box
            sx={{
              width: 40,
              height: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              color: 'text.secondary',
              fontWeight: 600,
              mr: 1,
            }}
          >
            #{roleIndex + 1}
          </Box>

          {/* Carrés des risques - Autant de carrés que de risques pour ce rôle */}
          {role.risks.map((risk, riskIndex) => (
            <Box
              key={`${risk.code}-${riskIndex}`}
              onClick={() => handleSquareClick(role.name, risk.code)}
              sx={{
                width: 20,
                height: 20,
                backgroundColor: getSquareColor(risk),
                border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                cursor: 'pointer',
                '&:hover': {
                  transform: 'scale(1.1)',
                  boxShadow: theme.shadows[2],
                },
                transition: 'all 0.2s ease',
              }}
              title={`${risk.name} (${risk.level}) - ${risk.isRemediated ? 'Remédié' : 'Non remédié'}`}
            />
          ))}
        </Box>
      ))}

      {/* Légende */}
      <Box sx={{ mt: 2, display: 'flex', gap: 2, fontSize: '0.7rem', flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              backgroundColor: theme.palette.success.dark,
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            }}
          />
          <Typography variant="caption">Remédié</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              backgroundColor: theme.palette.error.dark,
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            }}
          />
          <Typography variant="caption">Critique</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              backgroundColor: theme.palette.error.main,
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            }}
          />
          <Typography variant="caption">Élevé</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              backgroundColor: theme.palette.warning.main,
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            }}
          />
          <Typography variant="caption">Moyen</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box
            sx={{
              width: 12,
              height: 12,
              backgroundColor: theme.palette.success.light,
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
            }}
          />
          <Typography variant="caption">Faible</Typography>
        </Box>
      </Box>
    </Box>
  );
}, (prevProps, nextProps) => {
  // ✅ OPTIMISATION : Comparaison personnalisée pour React.memo
  return (
    prevProps.session === nextProps.session &&
    prevProps.mode === nextProps.mode &&
    prevProps.onNavigateToRisk === nextProps.onNavigateToRisk
  );
});
