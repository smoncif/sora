'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { CoverageAnalysis } from 'lib/types/roleAnalysis';
import { AnalysisMode } from 'lib/types/analysis';
import { 
  calculateEnrichedRoles,
  type ScoreCalculationConfig 
} from '../../services/analysis/scoreCalculationService';

/**
 * Configuration pour la sélection automatique
 */
export interface AutoSelectionConfig {
  /** Analyses de couverture disponibles */
  coverageAnalyses: CoverageAnalysis[];
  /** Fonction de sélection existante à réutiliser */
  onSelectionChange: (itemId: string, selectedRoles: Set<string>) => void;
  /** Fonction pour récupérer les sélections actuelles */
  getSelectedRoles: (itemId: string) => Set<string>;
  /** Délai entre chaque sélection en ms (défaut: 300ms) */
  selectionDelay?: number;
  /** Configuration de calcul des scores (nécessaire pour les vrais calculs) */
  scoreCalculationConfig: ScoreCalculationConfig;
  /** Mode d'analyse (roles = multiple, users = unique) */
  mode?: AnalysisMode;
  /** Nombre maximum de sélections par élément (1 pour users, illimité pour roles) */
  maxSelectionsPerItem?: number;
}

/**
 * État de progression de la sélection automatique
 */
export interface AutoSelectionProgress {
  /** Élément actuel en cours de traitement (business rôle ou utilisateur) */
  currentItem: string | null;
  /** Rôle cible actuel en cours de traitement */
  currentTargetRole: string | null;
  /** Nombre d'éléments traités */
  itemsProcessed: number;
  /** Nombre total d'éléments */
  totalItems: number;
  /** Nombre de rôles sélectionnés dans cette session */
  rolesSelected: number;
  /** Nombre de rôles ignorés (score insuffisant) */
  rolesSkipped: number;
  /** Mode de sélection */
  mode: AnalysisMode;
}

/**
 * Interface de retour du hook useAutoSelection
 */
export interface UseAutoSelectionReturn {
  /** Sélection automatique en cours */
  isRunning: boolean;
  /** Progression détaillée */
  progress: AutoSelectionProgress;
  /** Score minimum requis pour la sélection (0-100) */
  minScoreThreshold: number;
  /** Définir le score minimum */
  setMinScoreThreshold: (score: number) => void;
  /** Démarrer la sélection automatique */
  startAutoSelection: () => Promise<void>;
  /** Arrêter la sélection automatique */
  stopAutoSelection: () => void;
  /** Erreur éventuelle */
  error: string | null;
}

/**
 * Hook pour la sélection automatique des rôles
 * 
 * - Mode "roles" : Sélectionne plusieurs rôles simples par rôle métier
 * - Mode "users" : Sélectionne un seul rôle métier par utilisateur
 * 
 * La sélection se fait rôle par rôle avec des délais pour permettre la mise à jour
 * des scores dynamiques après chaque sélection.
 */
export const useAutoSelection = (config: AutoSelectionConfig): UseAutoSelectionReturn => {
  const mode = config.mode || 'roles';
  const maxSelectionsPerItem = config.maxSelectionsPerItem || (mode === 'users' ? 1 : undefined);
  
  // États
  const [isRunning, setIsRunning] = useState(false);
  const [minScoreThreshold, setMinScoreThreshold] = useState(50); // 50% par défaut
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<AutoSelectionProgress>({
    currentItem: null,
    currentTargetRole: null,
    itemsProcessed: 0,
    totalItems: 0,
    rolesSelected: 0,
    rolesSkipped: 0,
    mode: mode,
  });

  // Références pour le contrôle d'interruption
  const isRunningRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Référence pour tracker la dernière analyse traitée
  const lastCoverageAnalysesRef = useRef<CoverageAnalysis[]>([]);
  
  // Réinitialiser l'état quand l'analyse change VRAIMENT
  useEffect(() => {
    // Vérifier si c'est vraiment une nouvelle analyse ou juste une recréation d'objet
    const isDifferentAnalysis = config.coverageAnalyses.length !== lastCoverageAnalysesRef.current.length ||
      config.coverageAnalyses.some((analysis, index) => {
        const prevAnalysis = lastCoverageAnalysesRef.current[index];
        const itemId = analysis.businessRole;
        const prevItemId = prevAnalysis?.businessRole;
        return !prevAnalysis || itemId !== prevItemId;
      });
    
    // Ne procéder que si c'est vraiment une analyse différente
    if (!isDifferentAnalysis) {
      return;
    }
    
    // Sauvegarder la nouvelle référence
    lastCoverageAnalysesRef.current = config.coverageAnalyses;
    
    // Arrêter toute sélection en cours
    if (isRunningRef.current) {
      isRunningRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setIsRunning(false);
    }
    
    // Réinitialiser tous les états
    setProgress({
      currentItem: null,
      currentTargetRole: null,
      itemsProcessed: 0,
      totalItems: config.coverageAnalyses.length,
      rolesSelected: 0,
      rolesSkipped: 0,
      mode: mode,
    });
    setError(null);
  }, [config.coverageAnalyses]);

  /**
   * Attendre un délai spécifique (interruptible)
   */
  const delay = useCallback(async (ms: number): Promise<void> => {
    if (!isRunningRef.current) return;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        if (isRunningRef.current) {
          resolve();
        } else {
          reject(new Error('Interrupted'));
        }
      }, ms);

      // Nettoyer le timeout si interruption
      if (abortControllerRef.current) {
        abortControllerRef.current.signal.addEventListener('abort', () => {
          clearTimeout(timeoutId);
          reject(new Error('Interrupted'));
        });
      }
    });
  }, []);

  /**
   * Réinitialiser l'état de progression
   */
  const resetProgress = useCallback(() => {
    setProgress({
      currentItem: null,
      currentTargetRole: null,
      itemsProcessed: 0,
      totalItems: config.coverageAnalyses.length,
      rolesSelected: 0,
      rolesSkipped: 0,
      mode: mode,
    });
  }, [config.coverageAnalyses.length]);

     /**
    * Traiter un business rôle spécifique avec la vraie logique de calcul des scores
    * Implémente l'algorithme optimal : sélectionner toujours le meilleur rôle disponible
    */
   const processItem = useCallback(async (analysis: CoverageAnalysis): Promise<void> => {
     if (!isRunningRef.current) return;

     const itemId = analysis.businessRole;
     
     // Mettre à jour la progression
     setProgress(prev => ({
       ...prev,
       currentItem: itemId,
       currentTargetRole: null,
     }));

     // Récupérer les sélections actuelles pour cet élément
     let currentSelections = config.getSelectedRoles(itemId);
     let newSelections = new Set(currentSelections);

     console.log(`🚀 Démarrage traitement optimal pour: ${itemId}`);
     console.log(`📊 Sélections initiales: ${Array.from(currentSelections).join(', ')}`);

     let iteration = 0;
     const maxIterations = maxSelectionsPerItem || 100; // Limite selon le mode

     // Boucle principale : sélectionner le meilleur rôle disponible à chaque tour
     while (isRunningRef.current && iteration < maxIterations && 
            (!maxSelectionsPerItem || newSelections.size < maxSelectionsPerItem)) {
       // Calculer les rôles enrichis avec les sélections actuelles
       const enrichedRoles = calculateEnrichedRoles(analysis, newSelections, config.scoreCalculationConfig);
       
       // Trouver le meilleur rôle disponible (score le plus élevé) parmi les non-sélectionnés
       const availableRoles = enrichedRoles.filter(role => !newSelections.has(role.roleName));
       const bestRole = availableRoles.length > 0 
         ? availableRoles.sort((a, b) => b.globalScore - a.globalScore)[0]
         : null;
       
       if (!bestRole) {
         console.log(`🏁 Plus de rôles disponibles pour ${itemId}`);
         break;
       }

       // Mettre à jour la progression avec le rôle en cours d'évaluation
       setProgress(prev => ({
         ...prev,
         currentTargetRole: bestRole.roleName,
       }));

       console.log(`🎯 Meilleur rôle trouvé: ${bestRole.roleName}`);
       console.log(`📈 Score Global: ${bestRole.globalScore.toFixed(1)}, Seuil: ${minScoreThreshold}`);
       console.log(`📋 Détails: Couverture=${bestRole.coveragePercentage.toFixed(1)}%, Taille=${bestRole.sizeScore.toFixed(1)}%, Usage=${bestRole.usageFrequency.toFixed(1)}%`);
       
       if (bestRole.globalScore >= minScoreThreshold) {
         // Sélectionner ce rôle
         newSelections.add(bestRole.roleName);
         
         // Appliquer la sélection via l'API existante
         config.onSelectionChange(itemId, newSelections);
         
         // Mettre à jour les compteurs
         setProgress(prev => ({
           ...prev,
           rolesSelected: prev.rolesSelected + 1,
         }));

         console.log(`✅ Sélectionné: ${bestRole.roleName} (Score: ${bestRole.globalScore.toFixed(1)}) - Itération ${iteration + 1}`);

         // Attendre que les scores se mettent à jour
         try {
           await delay(config.selectionDelay || 300);
         } catch {
           return; // Interruption
         }
       } else {
         // Le meilleur rôle disponible n'atteint pas le seuil, arrêter pour ce business rôle
         console.log(`⏹️ Meilleur rôle disponible (${bestRole.roleName}: ${bestRole.globalScore.toFixed(1)}) < seuil (${minScoreThreshold}), arrêt pour ${itemId}`);
         
         // Compter tous les rôles restants comme ignorés
         const remainingRoles = analysis.simpleRoles.filter(r => !newSelections.has(r.roleName));
         setProgress(prev => ({
           ...prev,
           rolesSkipped: prev.rolesSkipped + remainingRoles.length,
         }));
         
         break;
       }

       iteration++;
     }

     if (iteration >= maxIterations) {
       console.log(`⚠️ Limite de sécurité atteinte pour ${itemId}`);
     }

     console.log(`🏁 Traitement terminé pour ${itemId} après ${iteration} itérations`);
     console.log(`📊 Résultat final: ${newSelections.size - currentSelections.size} nouveaux rôles sélectionnés`);
   }, [config, minScoreThreshold, delay]);

  /**
   * Démarrer la sélection automatique
   */
  const startAutoSelection = useCallback(async (): Promise<void> => {
    if (isRunning || config.coverageAnalyses.length === 0) return;

    try {
      // Initialiser
      setIsRunning(true);
      isRunningRef.current = true;
      abortControllerRef.current = new AbortController();
      setError(null);
      resetProgress();

      console.log(`🚀 Démarrage de la sélection automatique (seuil: ${minScoreThreshold}%)`);

      // Traiter chaque business rôle
      for (let i = 0; i < config.coverageAnalyses.length; i++) {
        if (!isRunningRef.current) break;

        const analysis = config.coverageAnalyses[i];
        
        const itemId = analysis.businessRole;
        console.log(`📊 Traitement de l'élément: ${itemId}`);
        
        await processItem(analysis);

        // Mettre à jour la progression
        setProgress(prev => ({
          ...prev,
          itemsProcessed: i + 1,
          currentItem: null,
          currentTargetRole: null,
        }));
      }

      console.log('✅ Sélection automatique terminée');

    } catch (error) {
      if (error instanceof Error && error.message !== 'Interrupted') {
        console.error('❌ Erreur lors de la sélection automatique:', error);
        setError(error.message);
      }
    } finally {
      // Nettoyer
      setIsRunning(false);
      isRunningRef.current = false;
      abortControllerRef.current = null;
      
      // Réinitialiser la progression après un délai
      setTimeout(() => {
        setProgress(prev => ({
          ...prev,
          currentItem: null,
          currentTargetRole: null,
        }));
      }, 2000);
    }
  }, [isRunning, config, minScoreThreshold, resetProgress, processItem]);

  /**
   * Arrêter la sélection automatique
   */
  const stopAutoSelection = useCallback(() => {
    if (!isRunning) return;

    console.log('⏹️ Arrêt de la sélection automatique demandé');
    
    isRunningRef.current = false;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, [isRunning]);

  return {
    isRunning,
    progress,
    minScoreThreshold,
    setMinScoreThreshold,
    startAutoSelection,
    stopAutoSelection,
    error,
  };
};

export default useAutoSelection;
