import { initializeApp, cert, getApps, App } from 'firebase-admin/app';
import { getAuth, DecodedIdToken } from 'firebase-admin/auth';

let adminApp: App;

function getAdminApp(): App {
  if (getApps().length === 0) {
    // Em desenvolvimento, usar emulador ou credenciais default
    // Em producao, usar GOOGLE_APPLICATION_CREDENTIALS env var
    adminApp = initializeApp({
      projectId: 'teste-e1a37',
    });
  }
  return getApps()[0];
}

/**
 * Verificar token de autenticacao Firebase
 */
export async function verifyToken(idToken: string): Promise<DecodedIdToken | null> {
  try {
    const app = getAdminApp();
    const auth = getAuth(app);
    return await auth.verifyIdToken(idToken);
  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return null;
  }
}
