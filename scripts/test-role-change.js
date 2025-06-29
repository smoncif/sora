/**
 * Script de test pour vérifier le changement de rôles
 * 
 * Ce script peut être utilisé pour tester manuellement :
 * 1. Le changement de rôle via l'interface admin
 * 2. La mise à jour automatique des permissions
 * 3. L'accès aux menus selon le rôle
 */

console.log(`
🧪 TEST DU CHANGEMENT DE RÔLES

📋 Étapes à tester :

1. Connectez-vous en tant qu'administrateur
2. Allez dans "Paramètres" > "Gestion des utilisateurs"
3. Changez le rôle d'un utilisateur avec le dropdown
4. Vérifiez que :
   ✅ Le tableau se met à jour instantanément
   ✅ Aucun rechargement de page
   ✅ Le select dropdown se désactive temporairement
   ✅ Message de succès affiché

5. Si vous changez VOTRE PROPRE rôle :
   ✅ Vous devriez voir les menus se mettre à jour automatiquement
   ✅ Sans avoir besoin de vous reconnecter

🔍 Points à vérifier :

Backend :
- L'API /api/admin/users PATCH avec action 'change_role' fonctionne
- Le rôle est bien mis à jour dans la table 'profiles'
- L'utilisateur mis à jour est retourné dans la réponse

Frontend :
- Le Select dropdown fonctionne correctement
- L'état loading individuel par utilisateur
- La mise à jour locale de l'état
- Le rafraîchissement du profil pour l'utilisateur connecté

Navigation :
- Les menus d'admin apparaissent quand on devient admin
- Les menus d'admin disparaissent quand on devient user

🐛 Problèmes potentiels :
- JWT token pas à jour → résolu par refreshUserProfile()
- Rôle en cache → résolu par récupération depuis la DB
- Interface qui clignote → résolu par loading individuel
`);

// Fonctions helper pour les tests en console
window.testRoleChange = {
  // Test de l'API directement
  async testAPI(userId, newRole) {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userId,
          action: 'change_role',
          reason: newRole
        })
      });
      const data = await response.json();
      console.log('✅ API Response:', data);
      return data;
    } catch (error) {
      console.error('❌ API Error:', error);
    }
  },

  // Vérifier le rôle actuel de l'utilisateur connecté
  getCurrentRole() {
    // Cette fonction sera disponible si l'utilisateur ouvre la console
    console.log('Rôle actuel dans le contexte:', window.userRole || 'Non disponible');
  },

  help() {
    console.log(`
Fonctions de test disponibles :

testRoleChange.testAPI(userId, newRole) - Tester l'API directement
testRoleChange.getCurrentRole() - Voir le rôle actuel
testRoleChange.help() - Afficher cette aide

Exemple :
testRoleChange.testAPI('user-id-123', 'admin')
    `);
  }
};

export default window.testRoleChange; 