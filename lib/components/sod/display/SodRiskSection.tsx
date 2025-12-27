/**
 * Composant pour afficher un risque SoD avec son badge et ses fonctions
 * 
 * ✅ UNIFIÉ : Utilise maintenant UnifiedRiskSection pour garantir la cohérence visuelle
 */

'use client';

import React from 'react';
import { SodSimpleRoleRiskItem } from 'lib/types/sodAnalysis';
import { UnifiedRiskSection } from '../unified/UnifiedRiskSection';
import { convertSimpleRoleRiskToUnified } from 'lib/types/unifiedSodTypes';

export interface SodRiskSectionProps {
  /** Risque */
  risk: SodSimpleRoleRiskItem;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du rôle parent */
  roleName?: string;
  
  /** Tous les risques du rôle (pour calculer le nombre de risques par fonction) */
  allRisks?: SodSimpleRoleRiskItem[];
  
  /** Callback pour supprimer une action */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une action */
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
  
  /** Callback pour passer à l'étape suivante */
  onNextStep?: () => void;
  
  /** Afficher le bouton "Nouvelle Étape" */
  showNextStepButton?: boolean;
}

/**
 * Affiche un risque SoD avec badge, fonctions et actions
 * ✅ UNIFIÉ : Délègue à UnifiedRiskSection pour garantir la cohérence visuelle
 */
export const SodRiskSection: React.FC<SodRiskSectionProps> = ({
  risk,
  defaultExpanded = true,
  roleName,
  allRisks,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onNextStep,
  showNextStepButton = false,
}) => {
  // Convertir le risque de rôle simple en risque unifié
  const unifiedRisk = React.useMemo(() => {
    return convertSimpleRoleRiskToUnified(risk, roleName || '');
  }, [risk, roleName]);
  
  // Convertir allRisks en format unifié pour les statistiques
  const unifiedAllRisks = React.useMemo(() => {
    return allRisks?.map(r => convertSimpleRoleRiskToUnified(r, roleName || '')) || [];
  }, [allRisks, roleName]);
  
  return (
    <UnifiedRiskSection
      risk={unifiedRisk}
      context="ROLE"
      defaultExpanded={defaultExpanded}
      parentName={roleName}
      allRisks={unifiedAllRisks}
      onDeleteAction={onDeleteAction}
      onRestrictAction={onRestrictAction}
      onRestrictResource={onRestrictResource}
      showNextStepButton={showNextStepButton}
      onNextStep={onNextStep}
    />
  );
};

