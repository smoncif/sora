import RoleGuard from 'lib/components/auth/RoleGuard';
import { UserRole } from 'lib/types/auth';

export const metadata = {
  title: 'Administration - Sora Clone',
  description: 'Panneau d\'administration de l\'application Sora Clone',
};

export default function AdminPage() {
  return (
    <RoleGuard 
      requiredRoles={UserRole.ADMIN}
      redirectTo="/dashboard"
    >
      <div className="container mx-auto py-12">
        <h1 className="text-3xl font-bold text-center mb-8">
          Panneau d'Administration
        </h1>
        
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Gestion des utilisateurs */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Gestion des utilisateurs</h2>
              <p className="text-gray-600 mb-4">
                Gérez les comptes utilisateurs, les rôles et les permissions.
              </p>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Voir les utilisateurs
              </button>
            </div>
            
            {/* Analyses de l'application */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Analyses</h2>
              <p className="text-gray-600 mb-4">
                Consultez les statistiques d'utilisation et les performances de l'application.
              </p>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Voir les statistiques
              </button>
            </div>
            
            {/* Configuration système */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Configuration système</h2>
              <p className="text-gray-600 mb-4">
                Modifiez les paramètres généraux et les configurations de l'application.
              </p>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Voir les paramètres
              </button>
            </div>
            
            {/* Logs du système */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Logs système</h2>
              <p className="text-gray-600 mb-4">
                Consultez les journaux d'activité et les erreurs de l'application.
              </p>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Voir les logs
              </button>
            </div>
            
            {/* Gestion des modèles */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Gestion des modèles</h2>
              <p className="text-gray-600 mb-4">
                Configurez les modèles d'IA et les paramètres de génération.
              </p>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Configurer les modèles
              </button>
            </div>
            
            {/* Maintenance */}
            <div className="bg-white shadow-md rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Maintenance</h2>
              <p className="text-gray-600 mb-4">
                Effectuez des opérations de maintenance sur la base de données et le stockage.
              </p>
              <button className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded">
                Lancer la maintenance
              </button>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
} 



