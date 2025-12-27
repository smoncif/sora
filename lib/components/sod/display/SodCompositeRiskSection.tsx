/**
 * Composant pour afficher un risque SoD de rôle composite
 * 
 * ✅ UNIFIÉ : Utilise maintenant UnifiedRiskSection pour garantir la cohérence visuelle
 */

'use client';

import React from 'react';
import { SodCompositeRoleRiskItem } from 'lib/types/sodAnalysis';
import { UnifiedRiskSection } from '../unified/UnifiedRiskSection';
import { convertCompositeRoleRiskToUnified } from 'lib/types/unifiedSodTypes';

export interface SodCompositeRiskSectionProps {
  /** Risque */
  risk: SodCompositeRoleRiskItem;
  
  /** Déplié par défaut */
  defaultExpanded?: boolean;
  
  /** Nom du rôle composite parent */
  compositeRoleName?: string;
  
  /** Tous les risques du rôle composite (pour calculer le nombre de risques par fonction) */
  allRisks?: SodCompositeRoleRiskItem[];
  
  /** Callback pour supprimer une action */
  onDeleteAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une action */
  onRestrictAction?: (roleName: string, riskId: string, actionCode: string, resources: any[]) => void;
  
  /** Callback pour restreindre une ressource spécifique */
  onRestrictResource?: (roleName: string, riskId: string, actionCode: string, resourceCode: string, externalResourceCode: string, values: string[], shouldRestrict?: boolean) => void;
  
  /** Callback pour exclure un rôle simple dans un rôle composite */
  onExcludeRole?: (compositeRoleName: string, simpleRoleName: string) => void;
  
  /** Callback pour passer à l'étape suivante */
  onNextStep?: () => void;
  
  /** Afficher le bouton "Nouvelle Étape" */
  showNextStepButton?: boolean;
}

/**
 * Affiche un risque SoD composite avec badge, fonctions et rôles simples
 * ✅ UNIFIÉ : Délègue à UnifiedRiskSection pour garantir la cohérence visuelle
 */
export const SodCompositeRiskSection: React.FC<SodCompositeRiskSectionProps> = ({
  risk,
  defaultExpanded = true,
  compositeRoleName,
  allRisks,
  onDeleteAction,
  onRestrictAction,
  onRestrictResource,
  onExcludeRole,
  onNextStep,
  showNextStepButton = false,
}) => {
  // Convertir le risque de rôle composite en risque unifié
  const unifiedRisk = React.useMemo(() => {
    return convertCompositeRoleRiskToUnified(risk, compositeRoleName || '');
  }, [risk, compositeRoleName]);
  
  // Convertir allRisks en format unifié pour les statistiques
  const unifiedAllRisks = React.useMemo(() => {
    return allRisks?.map(r => convertCompositeRoleRiskToUnified(r, compositeRoleName || '')) || [];
  }, [allRisks, compositeRoleName]);
  
  return (
    <UnifiedRiskSection
      risk={unifiedRisk}
      context="COMPOSITE"
      defaultExpanded={defaultExpanded}
      parentName={compositeRoleName}
      allRisks={unifiedAllRisks}
      onDeleteAction={onDeleteAction}
      onRestrictAction={onRestrictAction}
      onRestrictResource={onRestrictResource}
      onExcludeRole={onExcludeRole}
      showNextStepButton={showNextStepButton}
      onNextStep={onNextStep}
    />
  );
};

