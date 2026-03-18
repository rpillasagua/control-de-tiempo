import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs } from 'firebase/firestore';

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

console.log('🔗 Inicializando Firebase Project:', config.projectId);
const app = initializeApp(config);
const db = getFirestore(app);

async function runTest() {
  try {
    console.log('👀 Probando LEER de la colección clients...');
    // Leer probará las reglas o si la base de datos existe
    const snap = await getDocs(collection(db, 'clients'));
    console.log('✅ Lectura exitosa. Documentos encontrados:', snap.size);
  } catch (err) {
    console.error('❌ ERROR LEYENDO:', err.code, err.message);
  }

  try {
    console.log('✍️ Probando ESCRIBIR un cliente de prueba...');
    await addDoc(collection(db, 'clients'), { 
      name: 'Cliente Prueba Node',
      createdBy: 'test@anon.com',
      test: true
    });
    console.log('✅ Escritura exitosa.');
  } catch (err) {
    console.error('❌ ERROR ESCRIBIENDO:', err.code, err.message);
  }
  
  process.exit(0);
}

runTest();
