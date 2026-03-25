/**
 * Résolution des noms de feuilles pour les templates d'analyse rôles / utilisateurs.
 * Logique alignée sur simplifiedAnalysisService et userAnalysisParsingService.
 */

/**
 * Template analyse **rôles** (2 feuilles) : exact, casse, ou Feuille1/Feuille2 → index.
 */
export function findSheetForRoleAnalysisTemplate(
  targetName: string,
  availableSheets: string[]
): string | null {
  if (availableSheets.includes(targetName)) {
    return targetName;
  }

  const lowerTarget = targetName.toLowerCase();
  const found = availableSheets.find((sheet) => sheet.toLowerCase() === lowerTarget);
  if (found) return found;

  if (targetName === 'Feuille1' && availableSheets.length > 0) {
    return availableSheets[0];
  }
  if (targetName === 'Feuille2' && availableSheets.length > 1) {
    return availableSheets[1];
  }

  return null;
}

/**
 * Template analyse **utilisateurs** (3 feuilles) : exact, FeuilleN → index, ou correspondance partielle.
 */
export function findSheetForUserAnalysisTemplate(
  expectedName: string,
  availableSheets: string[]
): string | null {
  if (availableSheets.includes(expectedName)) {
    return expectedName;
  }

  if (expectedName.startsWith('Feuille')) {
    const index = parseInt(expectedName.replace('Feuille', ''), 10) - 1;
    if (!Number.isNaN(index) && index >= 0 && index < availableSheets.length) {
      return availableSheets[index];
    }
  }

  const lowerExpected = expectedName.toLowerCase();
  const match = availableSheets.find(
    (sheet) =>
      sheet.toLowerCase().includes(lowerExpected) ||
      lowerExpected.includes(sheet.toLowerCase())
  );

  return match || null;
}
