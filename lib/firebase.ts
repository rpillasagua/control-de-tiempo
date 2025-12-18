import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { setLogLevel } from 'firebase/app';

// 🔇 Configurar nivel de log de Firebase para suprimir warnings offline
if (typeof window !== 'undefined') {
  // Reducir verbosidad de Firebase (solo errores críticos)
  setLogLevel('error');

  // Suprimir warnings adicionales de Firestore offline
  const originalConsoleWarn = console.warn;
  const originalConsoleError = console.error;

  console.warn = function (...args) {
    const message = args.join(' ');
    if (
      message.includes('Could not reach Cloud Firestore backend') ||
      message.includes('The operation could not be completed') ||
      message.includes('Connection failed') ||
      message.includes('device does not have a healthy Internet connection') ||
      message.includes('Firestore') && message.includes('offline')
    ) {
      return; // No mostrar warnings offline
    }
    originalConsoleWarn.apply(console, args);
  };

  console.error = function (...args) {
    const message = args.join(' ');
    if (
      message.includes('@firebase/firestore') && (
        message.includes('Could not reach') ||
        message.includes('Connection failed') ||
        message.includes('Most recent error')
      )
    ) {
      return; // No mostrar errores de conexión offline
    }
    originalConsoleError.apply(console, args);
  };
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'AIzaSyDxOH8U006DP1dSRIo0qaYoTrhoC_4b9bE',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'studio-6276322063-5d9d6.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'studio-6276322063-5d9d6',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'studio-6276322063-5d9d6.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '725463781946',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:725463781946:web:57b8c03f42060ec4eb5b03'
};

// Debug: Log Firebase config en desarrollo
if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
  console.log('Firebase Config:', {
    apiKey: firebaseConfig.apiKey.substring(0, 10) + '...',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
  });
}

// Verificar si Firebase está configurado correctamente
const isFirebaseConfigured =
  firebaseConfig.apiKey !== 'demo-api-key' &&
  firebaseConfig.projectId !== 'demo-project';

// Inicializar Firebase solo si no existe una instancia y está configurado
let app: any = null;
let db: any = null;

if (isFirebaseConfigured) {
  try {
    // Check if already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);

      // Initialize Firestore
      db = getFirestore(app);

      // 🌐 Habilitar persistencia local de Firestore para modo offline
      // MUST be called immediately after getFirestore and before any other operations
      if (typeof window !== 'undefined' && db) {
        enableIndexedDbPersistence(db).catch((err: any) => {
          if (err.code === 'failed-precondition') {
            console.log('⚠️ Persistencia Firestore: Ya está habilitada en otra pestaña');
          } else if (err.code === 'unimplemented') {
            console.log('⚠️ Persistencia Firestore: No soportada en este navegador');
          } else {
            // Silently ignore all other persistence errors
            console.log('ℹ️ Persistencia Firestore: Inicializada previamente');
          }
        });
      }

      console.log('✅ Firebase Firestore inicializado correctamente');
      console.log('📊 Proyecto:', firebaseConfig.projectId);
      console.log('🌐 Modo offline habilitado (persistencia local)');
      console.log('📝 Nota: Las fotos se guardan en Google Drive, no en Firebase Storage');
    } else {
      // Use existing app
      app = getApps()[0];
      db = getFirestore(app);
      console.log('ℹ️ Usando instancia de Firebase existente');
    }
  } catch (error) {
    console.error('❌ Firebase no pudo inicializarse:', error);
    console.warn('⚠️ La app funcionará sin base de datos.');
  }
} else {
  console.error('❌ Firebase NO está configurado. Configura las variables de entorno en .env.local');
}

// Solo exportamos db y auth - storage ya no se usa
import { getAuth } from 'firebase/auth';
export const auth = app ? getAuth(app) : null;
export { db };