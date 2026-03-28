import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, signInAnonymously, onAuthStateChanged, AuthError } from 'firebase/auth';
import { auth } from '@/lib/firebase';

function getAuthErrorMessage(err: AuthError): string {
  switch (err.code) {
    case 'auth/configuration-not-found':
      return 'Login anonimo nao esta ativado. Ative em Firebase Console > Authentication > Sign-in method > Anonymous.';
    case 'auth/admin-restricted-operation':
      return 'Login anonimo nao esta ativado. Ative em Firebase Console > Authentication > Sign-in method > Anonymous.';
    case 'auth/network-request-failed':
      return 'Erro de rede. Verifique sua conexao com a internet.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
    default:
      if (err.code?.startsWith('auth/requests-from-referer')) {
        return 'API Key bloqueada para este dominio. Adicione http://localhost:3000/* nas restricoes da API Key no Google Cloud Console.';
      }
      return `Erro de autenticacao: ${err.code || err.message}`;
  }
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  authError: string | null;
  getToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  authError: null,
  getToken: async () => null,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setAuthError(null);
        setLoading(false);
      } else {
        // Auto login anonimo
        signInAnonymously(auth).catch((err: AuthError) => {
          console.error('Erro ao fazer login anonimo:', err);
          setAuthError(getAuthErrorMessage(err));
          setLoading(false);
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const getToken = async (): Promise<string | null> => {
    if (!user) return null;
    return user.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, authError, getToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
