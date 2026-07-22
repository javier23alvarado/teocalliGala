// init-superadmin.js - Script de inicialización única del Super Administrador
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// TODO: Colocar tus credenciales de Firebase aquí
const firebaseConfig = {
  apiKey: "TU_API_KEY_AQUI",
  authDomain: "TU_AUTH_DOMAIN_AQUI",
  projectId: "TU_PROJECT_ID_AQUI",
  storageBucket: "TU_STORAGE_BUCKET_AQUI",
  messagingSenderId: "TU_MESSAGING_SENDER_ID_AQUI",
  appId: "TU_APP_ID_AQUI"
};

// Inicializar Firebase y Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// UID del Super Administrador creado manualmente en Firebase Auth
const SUPER_ADMIN_UID = "4J5PxGAHnkM1CaNm7L24hkhkD8A2";

// Estructura del documento
const superAdminProfile = {
  nombre: "Angel Javier Ramos Alvarado",
  alias: "SuperAdmin Teocalli",
  fechaNacimiento: "1990-01-01",
  compania: "1ra compañia",
  email: "tu-email-de-autenticacion@dominio.com",
  celular: "0000000000",
  rol: "super_admin",
  activo: true
};

async function createSuperAdminNode() {
  console.log("Registrando Super Administrador original en Firestore...");
  try {
    const docRef = doc(db, "usuarios", SUPER_ADMIN_UID);
    await setDoc(docRef, superAdminProfile);
    console.log(`✅ Nodo del Super Administrador generado en Firestore con UID: ${SUPER_ADMIN_UID}`);
  } catch (error) {
    console.error("❌ Error al crear el documento del Super Administrador:", error);
  }
}

// Ejecutar
createSuperAdminNode();
