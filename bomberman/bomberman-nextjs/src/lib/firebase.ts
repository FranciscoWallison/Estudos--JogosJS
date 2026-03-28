import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyAGb7oAJ0FNG7WKaSZ88n5Wub8BjXDgRj4',
  authDomain: 'teste-e1a37.firebaseapp.com',
  databaseURL: 'https://teste-e1a37-default-rtdb.firebaseio.com',
  projectId: 'teste-e1a37',
  storageBucket: 'teste-e1a37.firebasestorage.app',
  messagingSenderId: '67698678643',
  appId: '1:67698678643:web:d5ba7d5266b98633538306',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const database = getDatabase(app);
export default app;
