import Link from 'next/link';

export const metadata = {
  title: 'Accès refusé - Sora Clone',
  description: 'Vous n\'avez pas les autorisations nécessaires pour accéder à cette page',
};

export default function AccessDeniedPage() {
  return (
    <div className="container mx-auto py-12 text-center">
      <div className="max-w-md mx-auto bg-white shadow-md rounded-lg p-8">
        <div className="text-red-500 text-5xl mb-6">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-24 w-24 mx-auto" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        
        <h1 className="text-3xl font-bold mb-4">
          Accès Refusé
        </h1>
        
        <p className="text-gray-600 mb-6">
          Vous n'avez pas les autorisations nécessaires pour accéder à cette page. 
          Veuillez contacter votre administrateur si vous pensez qu'il s'agit d'une erreur.
        </p>
        
        <div className="flex flex-col space-y-4">
          <Link 
            href="/"
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Retour au tableau de bord
          </Link>
          
          <Link 
            href="/"
            className="text-blue-500 hover:text-blue-700"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
} 