import UserProfile from '@/components/features/profile/UserProfile';

export const metadata = {
  title: 'Profil - Sora Clone',
  description: 'Gérez votre profil sur Sora Clone',
};

export default function ProfilePage() {
  return (
    <div className="container mx-auto py-12">
      <h1 className="text-3xl font-bold text-center mb-8">
        Votre Profil
      </h1>
      
      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-8 md:grid-cols-3">
        <div className="md:col-span-1">
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Informations utilisateur</h2>
            <UserProfile />
          </div>
        </div>
        
        <div className="md:col-span-2">
          <div className="bg-white shadow-md rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Paramètres du compte</h2>
            <form className="space-y-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="fullName">
                  Nom complet
                </label>
                <input
                  id="fullName"
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Votre nom complet"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="votre.email@exemple.com"
                  disabled
                />
                <p className="text-sm text-gray-500 mt-1">
                  L'email ne peut pas être modifié.
                </p>
              </div>
              
              <button
                type="submit"
                className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
              >
                Enregistrer les modifications
              </button>
            </form>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4 text-red-600">Zone de danger</h2>
            <p className="text-gray-600 mb-4">
              Les actions suivantes sont irréversibles. Soyez prudent.
            </p>
            
            <button
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded"
            >
              Supprimer le compte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 