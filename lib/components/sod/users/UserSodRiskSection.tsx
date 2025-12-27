/**
 * Composant pour afficher un risque SoD utilisateur avec ses fonctions
 * 
 * ✅ UNIFIÉ : Utilise maintenant UnifiedRiskSection pour garantir la cohérence visuelle
 * 
 * Supporte 2 modes d'affichage :
 * - Mode "Par Rôle" : Risque → Fonction → Rôle → Action
 * - Mode "Par Transaction" : Risque → Fonction → Action → Rôle
 */

'use client';

import React from 'react';
import type { 
  UserSodRiskByRole, 
  UserSodRiskByTransaction,
} from 'lib/types/userSodAnalysis';
import { UnifiedRiskSection } from '../unified/UnifiedRiskSection';
import { 
  convertUserRiskByRoleToUnified,
  convertUserRiskByTransactionToUnified,
} from 'lib/types/unifiedSodTypes';

// Type union pour les risques
type UserSodRisk = UserSodRiskByRole | UserSodRiskByTransaction;

export interface UserSodRiskSectionProps {
  /** Risque (mode Par Rôle ou Par Transaction) */
  risk: UserSodRisk;
  
  /** Mode d'affichage */
  displayMode: 'BY_ROLE' | 'BY_TRANSACTION';
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Callbacks pour actions de remédiation */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
}

/**
 * Section risque utilisateur avec fonctions
 * ✅ UNIFIÉ : Délègue à UnifiedRiskSection pour garantir la cohérence visuelle
 */
export const UserSodRiskSection: React.FC<UserSodRiskSectionProps> = ({
  risk,
  displayMode,
  defaultExpanded = true,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
}) => {
  // Convertir le risque utilisateur en risque unifié
  const unifiedRisk = React.useMemo(() => {
    if (displayMode === 'BY_ROLE') {
      return convertUserRiskByRoleToUnified(risk as UserSodRiskByRole);
    } else {
      return convertUserRiskByTransactionToUnified(risk as UserSodRiskByTransaction);
    }
  }, [risk, displayMode]);
  
  return (
    <UnifiedRiskSection
      risk={unifiedRisk}
      context="USER"
      displayMode={displayMode}
      defaultExpanded={defaultExpanded}
      onDeleteAction={onDeleteAction}
      onRestrictAction={onRestrictAction}
      onRestrictResource={onRestrictResource}
    />
  );
};

