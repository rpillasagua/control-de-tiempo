import { initializeApp, getApps } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { setLogLevel } from 'firebase/app';
import { logger } from './logger';

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
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Debug: Log Firebase config en desarrollo
if (typeof window !== 'undefined' && window.location.hostname.includes('localhost')) {
  logger.log('Firebase Config:', {
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

if (typeof window !== 'undefined' && isFirebaseConfigured) {
  try {
    // Check if already initialized
    if (getApps().length === 0) {
      app = initializeApp(firebaseConfig);

      // Initialize Firestore
      db = getFirestore(app);

      // 🌐 Habilitar persistencia local de Firestore para modo offline
      if (db) {
        enableIndexedDbPersistence(db).catch((err: any) => {
          if (err.code === 'failed-precondition') {
            logger.log('⚠️ Persistencia Firestore: Ya está habilitada en otra pestaña');
          } else if (err.code === 'unimplemented') {
            logger.log('⚠️ Persistencia Firestore: No soportada en este navegador');
          } else {
            logger.log('ℹ️ Persistencia Firestore: Inicializada previamente');
          }
        });
      }

      logger.log('✅ Firebase Firestore inicializado correctamente');
      logger.log('📊 Proyecto:', firebaseConfig.projectId);
    } else {
      // Use existing app
      app = getApps()[0];
      db = getFirestore(app);
      logger.log('ℹ️ Usando instancia de Firebase existente');
    }
  } catch (error) {
    logger.error('❌ Firebase no pudo inicializarse:', error);
    logger.warn('⚠️ La app funcionará sin base de datos.');
  }
} else if (typeof window !== 'undefined' && !isFirebaseConfigured) {
  logger.error('❌ Firebase NO está configurado. Configura las variables de entorno en .env.local');
}

// Exportamos db y auth
import { getAuth } from 'firebase/auth';

export const auth = (typeof window !== 'undefined' && app) ? getAuth(app) : null;
export { db };