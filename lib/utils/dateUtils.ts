/**
 * Utilitaires pour la gestion des dates et du temps
 */

/**
 * Calcule la durée écoulée depuis une date et la formate en français
 * @param dateString - Date au format ISO string
 * @returns Durée formatée (ex: "22 min", "2h", "3j")
 */
export function getTimeAgo(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  
  // Convertir en différentes unités
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  // Formatage selon la durée
  if (diffMinutes < 1) {
    return "maintenant";
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  } else if (diffHours < 24) {
    return `${diffHours}h`;
  } else if (diffDays < 7) {
    return `${diffDays}j`;
  } else if (diffWeeks < 4) {
    return `${diffWeeks} sem`;
  } else if (diffMonths < 12) {
    return `${diffMonths} mois`;
  } else {
    return `${diffYears} an${diffYears > 1 ? 's' : ''}`;
  }
}

/**
 * Formate une date en français
 * @param dateString - Date au format ISO string
 * @returns Date formatée
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Formate une date courte en français
 * @param dateString - Date au format ISO string
 * @returns Date formatée courte
 */
export function formatShortDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
} 