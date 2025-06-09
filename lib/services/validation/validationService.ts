/**
 * Service de validation générique
 * 
 * Ce service fournit des utilitaires et fonctions pour la validation 
 * de données, indépendamment du format source (Excel, JSON, etc.).
 * 
 * Il implémente un système flexible de validation avec:
 * - Support pour différents niveaux de sévérité (erreur, avertissement, information)
 * - API fluide pour la construction de résultats de validation
 * - Règles de validation communes réutilisables
 * - Statistiques détaillées sur les validations effectuées
 * 
 * @module ValidationService
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  ValidationError, 
  ValidationErrorType, 
  ValidationSeverity
} from 'lib/types/validation';

/**
 * Interface pour les résultats génériques de validation
 * 
 * Cette interface définit la structure d'un résultat de validation,
 * qui contient des informations sur la validité des données, les erreurs
 * détectées, ainsi que des statistiques sur la validation effectuée.
 * 
 * @property {boolean} valid - Indique si la validation a réussi (aucune erreur)
 * @property {ValidationError[]} errors - Liste des erreurs (sévérité ERROR)
 * @property {ValidationError[]} warnings - Liste des avertissements (sévérité WARNING)
 * @property {ValidationError[]} infos - Liste des informations (sévérité INFO)
 * @property {Date} timestamp - Date et heure de la validation
 * @property {T} [data] - Données validées, potentiellement transformées
 * @property {object} stats - Statistiques sur la validation
 * @property {number} stats.totalErrors - Nombre total d'erreurs
 * @property {number} stats.totalWarnings - Nombre total d'avertissements
 * @property {number} stats.totalInfos - Nombre total d'informations
 * @property {Record<string, number>} stats.byType - Nombre d'erreurs par type
 * @template T - Type des données validées
 */
export interface ValidationResult<T = unknown> {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  infos: ValidationError[];
  timestamp: Date;
  data?: T;
  stats: {
    totalErrors: number;
    totalWarnings: number;
    totalInfos: number;
    byType: Record<string, number>;
    [key: string]: any;
  };
}

/**
 * Interface pour une règle de validation générique
 * 
 * Définit le contrat pour créer des règles de validation réutilisables,
 * avec un type, un message et une fonction de validation.
 * 
 * @property {ValidationErrorType | string} type - Type d'erreur généré si la validation échoue
 * @property {string} message - Message d'erreur à afficher si la validation échoue
 * @property {function} validate - Fonction qui vérifie la validité de la valeur
 * @property {Record<string, unknown>} [metadata] - Métadonnées supplémentaires pour la règle
 * @template T - Type de la valeur à valider
 */
export interface ValidationRule<T = unknown> {
  type: ValidationErrorType | string;
  message: string;
  validate: (value: T, context?: Record<string, unknown>) => boolean;
  metadata?: Record<string, unknown>;
}

/**
 * Ajoute une erreur à la liste des erreurs
 * 
 * Cette fonction crée une nouvelle erreur de validation avec une
 * sévérité de type ERROR et l'ajoute à la liste fournie.
 * 
 * @param {ValidationError[]} errors - Liste des erreurs à laquelle ajouter
 * @param {ValidationErrorType} type - Type de l'erreur
 * @param {string} message - Message décrivant l'erreur
 * @param {Partial<Omit<ValidationError, 'id' | 'type' | 'severity' | 'message'>>} [metadata] - Métadonnées supplémentaires
 * @returns {ValidationError} L'erreur créée
 * 
 * @example
 * // Ajouter une erreur de validation
 * const errors: ValidationError[] = [];
 * addError(errors, 'format', 'Le format du champ "date" est invalide', {
 *   field: 'date',
 *   value: '2023-13-45',
 *   path: 'user.profile.date'
 * });
 * // 1
 */
export function addError(
  errors: ValidationError[],
  type: ValidationErrorType, 
  message: string,
  metadata?: Partial<Omit<ValidationError, 'id' | 'type' | 'severity' | 'message'>>
): ValidationError {
  const error = {
    id: uuidv4(),
    type,
    severity: ValidationSeverity.ERROR,
    message,
    ...metadata
  };
  
  errors.push(error);
  return error;
}

/**
 * Ajoute un avertissement à la liste des avertissements
 * 
 * Cette fonction crée un nouvel avertissement de validation avec une
 * sévérité de type WARNING et l'ajoute à la liste fournie.
 * 
 * @param {ValidationError[]} warnings - Liste des avertissements à laquelle ajouter
 * @param {ValidationErrorType} type - Type de l'avertissement
 * @param {string} message - Message décrivant l'avertissement
 * @param {Partial<Omit<ValidationError, 'id' | 'type' | 'severity' | 'message'>>} [metadata] - Métadonnées supplémentaires
 * @returns {ValidationError} L'avertissement créé
 * 
 * @example
 * // Ajouter un avertissement
 * const warnings: ValidationError[] = [];
 * addWarning(warnings, 'deprecated', 'Ce champ sera obsolète dans la prochaine version', {
 *   field: 'legacyFormat',
 *   recommendation: 'Utiliser le nouveau format newFormat à la place'
 * });
 */
export function addWarning(
  warnings: ValidationError[],
  type: ValidationErrorType, 
  message: string,
  metadata?: Partial<Omit<ValidationError, 'id' | 'type' | 'severity' | 'message'>>
): ValidationError {
  const warning = {
    id: uuidv4(),
    type,
    severity: ValidationSeverity.WARNING,
    message,
    ...metadata
  };
  
  warnings.push(warning);
  return warning;
}

/**
 * Ajoute une information à la liste des infos
 * 
 * Cette fonction crée une nouvelle information de validation avec une
 * sévérité de type INFO et l'ajoute à la liste fournie.
 * 
 * @param {ValidationError[]} infos - Liste des informations à laquelle ajouter
 * @param {ValidationErrorType} type - Type de l'information
 * @param {string} message - Message décrivant l'information
 * @param {Partial<Omit<ValidationError, 'id' | 'type' | 'severity' | 'message'>>} [metadata] - Métadonnées supplémentaires
 * @returns {ValidationError} L'information créée
 * 
 * @example
 * // Ajouter une information
 * const infos: ValidationError[] = [];
 * addInfo(infos, 'statistics', 'Le fichier contient 150 enregistrements', {
 *   recordCount: 150,
 *   fileSize: '1.2MB'
 * });
 */
export function addInfo(
  infos: ValidationError[],
  type: ValidationErrorType, 
  message: string,
  metadata?: Partial<Omit<ValidationError, 'id' | 'type' | 'severity' | 'message'>>
): ValidationError {
  const info = {
    id: uuidv4(),
    type,
    severity: ValidationSeverity.INFO,
    message,
    ...metadata
  };
  
  infos.push(info);
  return info;
}

/**
 * Construit le résultat final de la validation
 * 
 * Assemble les listes d'erreurs, avertissements et informations en un
 * objet ValidationResult complet avec statistiques. Une validation
 * est considérée comme valide s'il n'y a aucune erreur (les avertissements
 * n'affectent pas la validité).
 * 
 * @param {ValidationError[]} errors - Liste des erreurs
 * @param {ValidationError[]} warnings - Liste des avertissements
 * @param {ValidationError[]} infos - Liste des informations
 * @param {T} [data] - Données validées à inclure dans le résultat
 * @param {Record<string, any>} [additionalStats={}] - Statistiques supplémentaires à inclure
 * @returns {ValidationResult<T>} Résultat de validation complet
 * @template T - Type des données validées
 * 
 * @example
 * // Construire un résultat de validation
 * const errors: ValidationError[] = [];
 * const warnings: ValidationError[] = [];
 * const infos: ValidationError[] = [];
 * 
 * // Ajouter des erreurs, avertissements et infos avec les fonctions add*
 * addError(errors, 'required', 'Le champ "nom" est requis', { field: 'nom' });
 * addWarning(warnings, 'length', 'Le champ "description" est très court', { field: 'description' });
 * addInfo(infos, 'format', 'Le format de date a été normalisé');
 * 
 * // Assembler le résultat final
 * const result = buildValidationResult(errors, warnings, infos, data, {
 *   processingTimeMs: 235,
 *   validatedFields: 15
 * });
 * 
 * // false (car il y a des erreurs)
 * // 1
 * // 235
 */
export function buildValidationResult<T = unknown>(
  errors: ValidationError[],
  warnings: ValidationError[],
  infos: ValidationError[],
  data?: T,
  additionalStats: Record<string, any> = {}
): ValidationResult<T> {
  // Calculer les statistiques par type d'erreur
  const statsByType: Record<string, number> = {};
  
  [...errors, ...warnings, ...infos].forEach(item => {
    statsByType[item.type] = (statsByType[item.type] || 0) + 1;
  });
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
    data,
    timestamp: new Date(),
    stats: {
      totalErrors: errors.length,
      totalWarnings: warnings.length,
      totalInfos: infos.length,
      byType: statsByType,
      ...additionalStats
    }
  };
}

/**
 * Règles de validation courantes
 * 
 * Collection de règles de validation prédéfinies et réutilisables
 * pour les cas les plus courants.
 */
export const CommonValidationRules = {
  /**
   * Vérifie qu'une valeur est définie et non vide
   * 
   * @param {string} [message='Valeur requise'] - Message d'erreur personnalisé
   * @returns {ValidationRule} Règle de validation
   * 
   * @example
   * // Création d'une règle 'required'
   * const requiredRule = CommonValidationRules.required('Ce champ est obligatoire');
   * // Validation d'une valeur
   * if (!requiredRule.validate(value)) {
   *   * }
   */
  required: (message = 'Valeur requise'): ValidationRule => ({
    type: 'required',
    message,
    validate: (value) => value !== undefined && value !== null && value !== '',
  }),
  
  /**
   * Vérifie qu'une valeur est un nombre valide
   * 
   * @param {string} [message='Format numérique requis'] - Message d'erreur personnalisé
   * @returns {ValidationRule} Règle de validation
   * 
   * @example
   * // Validation d'une entrée utilisateur comme nombre
   * const numericRule = CommonValidationRules.numericFormat('Veuillez entrer un nombre valide');
   * const isValid = numericRule.validate(userInput);
   * if (!isValid) {
   *   // Afficher une erreur
   *   displayError(numericRule.message);
   * }
   */
  numericFormat: (message = 'Format numérique requis'): ValidationRule => ({
    type: 'format',
    message,
    validate: (value) => value === undefined || value === null || value === '' || !isNaN(Number(value)),
  }),
  
  /**
   * Vérifie qu'une valeur est une date valide
   * 
   * Cette règle accepte différents formats de date:
   * - Objet Date JavaScript
   * - Chaîne de caractères convertible en date (ISO, etc.)
   * - Timestamp numérique
   * 
   * Les valeurs vides ou nulles sont considérées comme valides.
   * 
   * @param {string} [message='Format de date requis'] - Message d'erreur personnalisé
   * @returns {ValidationRule} Règle de validation
   * 
   * @example
   * // Validation d'une date
   * const dateRule = CommonValidationRules.dateFormat('Date de naissance invalide');
   * const userBirthdate = '2000-02-30'; // Date invalide (30 février)
   * 
   * if (!dateRule.validate(userBirthdate)) {
   *   // Afficher une erreur
   *   displayError(dateRule.message);
   * }
   */
  dateFormat: (message = 'Format de date requis'): ValidationRule => ({
    type: 'format',
    message,
    validate: (value) => {
      if (value === undefined || value === null || value === '') return true;
      
      // Vérification si c'est déjà un objet Date
      if (value instanceof Date) return !isNaN(value.getTime());
      
      // Essai de conversion en date
      // S'assurer que value est convertible en string ou number avant de créer une date
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return !isNaN(date.getTime());
      }
      
      // Pour tout autre type, la validation échoue
      return false;
    },
  }),
  
  /**
   * Vérifie qu'une valeur est dans une liste de valeurs autorisées
   * 
   * Cette règle est utile pour les champs qui doivent correspondre
   * à une liste prédéfinie (comme des énumérations, catégories, etc.)
   * 
   * Les valeurs vides ou nulles sont considérées comme valides.
   * 
   * @param {unknown[]} validValues - Liste des valeurs autorisées
   * @param {string} [message='Valeur non autorisée'] - Message d'erreur personnalisé
   * @returns {ValidationRule} Règle de validation
   * 
   * @example
   * // Validation d'un statut parmi des valeurs autorisées
   * const validStatuses = ['active', 'pending', 'archived'];
   * const statusRule = CommonValidationRules.valueIn(validStatuses, 'Statut invalide');
   * 
   * const userStatus = 'deleted';
   * if (!statusRule.validate(userStatus)) {
   *   // Afficher une erreur
   *   displayError(`${statusRule.message}. Valeurs acceptées: ${validStatuses.join(', ')}`);
   * }
   */
  valueIn: (validValues: unknown[], message = 'Valeur non autorisée'): ValidationRule => ({
    type: 'values',
    message,
    validate: (value) => 
      value === undefined || 
      value === null || 
      value === '' || 
      validValues.includes(value as unknown),
  }),
  
  /**
   * Vérifie qu'une valeur numérique est dans une plage spécifiée
   * 
   * Cette règle vérifie qu'une valeur est supérieure ou égale à min
   * et inférieure ou égale à max.
   * 
   * Les valeurs vides ou nulles sont considérées comme valides.
   * 
   * @param {number} min - Valeur minimale (incluse)
   * @param {number} max - Valeur maximale (incluse)
   * @param {string} [message] - Message d'erreur personnalisé (généré automatiquement si non fourni)
   * @returns {ValidationRule} Règle de validation
   * 
   * @example
   * // Vérifier qu'un âge est entre 18 et 65 ans
   * const ageRule = CommonValidationRules.numberRange(18, 65, 'L\'âge doit être entre 18 et 65 ans');
   * 
   * const userAge = 16;
   * if (!ageRule.validate(userAge)) {
   *   // Afficher une erreur
   *   displayError(ageRule.message);
   * }
   */
  numberRange: (min: number, max: number, message?: string): ValidationRule => ({
    type: 'range',
    message: message || `La valeur doit être entre ${min} et ${max}`,
    validate: (value) => {
      if (value === undefined || value === null || value === '') return true;
      
      const num = Number(value);
      return !isNaN(num) && num >= min && num <= max;
    },
    metadata: { min, max }
  }),
  
  /**
   * Vérifie qu'une chaîne a une longueur dans une plage spécifiée
   * 
   * Cette règle vérifie qu'une chaîne de caractères a une longueur
   * supérieure ou égale à min et inférieure ou égale à max.
   * 
   * Les valeurs vides ou nulles sont considérées comme valides.
   * 
   * @param {number} min - Longueur minimale (incluse)
   * @param {number} max - Longueur maximale (incluse)
   * @param {string} [message] - Message d'erreur personnalisé (généré automatiquement si non fourni)
   * @returns {ValidationRule} Règle de validation
   * 
   * @example
   * // Vérifier qu'un mot de passe a entre 8 et 64 caractères
   * const passwordRule = CommonValidationRules.stringLength(8, 64, 'Le mot de passe doit contenir entre 8 et 64 caractères');
   * 
   * const userPassword = 'pass';
   * if (!passwordRule.validate(userPassword)) {
   *   // Afficher une erreur
   *   displayError(passwordRule.message);
   * }
   */
  stringLength: (min: number, max: number, message?: string): ValidationRule => ({
    type: 'length',
    message: message || `La longueur doit être entre ${min} et ${max} caractères`,
    validate: (value) => {
      if (value === undefined || value === null || value === '') return true;
      
      const str = String(value);
      return str.length >= min && str.length <= max;
    },
    metadata: { min, max }
  }),
  
  /**
   * Vérifie qu'une valeur correspond à un pattern regex
   * 
   * Cette règle vérifie qu'une chaîne correspond à une expression régulière.
   * 
   * Les valeurs vides ou nulles sont considérées comme valides.
   * 
   * @param {RegExp} pattern - Expression régulière à tester
   * @param {string} [message='Format invalide'] - Message d'erreur personnalisé
   * @returns {ValidationRule} Règle de validation
   * 
   * @example
   * // Vérifier qu'une chaîne est un email valide
   * const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
   * const emailRule = CommonValidationRules.pattern(emailRegex, 'Email invalide');
   * 
   * const userEmail = 'invalid-email';
   * if (!emailRule.validate(userEmail)) {
   *   // Afficher une erreur
   *   displayError(emailRule.message);
   * }
   */
  pattern: (pattern: RegExp, message = 'Format invalide'): ValidationRule => ({
    type: 'format' as ValidationErrorType,
    message,
    validate: (value) => {
      if (value === undefined || value === null || value === '') return true;
      
      return pattern.test(String(value));
    },
    metadata: { pattern: pattern.toString() }
  }),
};

/**
 * Valide une valeur unique contre un ensemble de règles
 * 
 * Cette fonction prend une valeur et un ensemble de règles, applique chaque
 * règle à la valeur, et renvoie une liste des erreurs de validation détectées.
 * 
 * @param {unknown} value - Valeur à valider
 * @param {ValidationRule[]} rules - Règles de validation à appliquer
 * @param {Record<string, unknown>} [context={}] - Contexte supplémentaire à passer aux règles
 * @param {string} [fieldName] - Nom du champ validé (pour les messages d'erreur)
 * @returns {ValidationError[]} Liste des erreurs de validation détectées (vide si tout est valide)
 * 
 * @example
 * // Valider un champ email
 * const email = 'user@invalid';
 * const emailRules = [
 *   CommonValidationRules.required('Email requis'),
 *   CommonValidationRules.pattern(/^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/, 'Format d\'email invalide')
 * ];
 * 
 * const errors = validateValue(email, emailRules, {}, 'email');
 * 
 * if (errors.length > 0) {
 *   errors.forEach(error => {
 *   });
 * } else {
 *   * }
 */
export function validateValue(
  value: unknown, 
  rules: ValidationRule[], 
  context: Record<string, unknown> = {},
  fieldName?: string
): ValidationError[] {
  const errors: ValidationError[] = [];
  
  for (const rule of rules) {
    const isValid = rule.validate(value, context);
    
    if (!isValid) {
      const metadata: Record<string, unknown> = {
        ...(rule.metadata || {}),
        value,
      };
      
      if (fieldName) {
        metadata.field = fieldName;
      }
      
      addError(errors, rule.type as ValidationErrorType, rule.message, metadata);
    }
  }
  
  return errors;
} 

