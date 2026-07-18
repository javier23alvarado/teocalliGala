// init-db.js - Script para registrar por primera vez al Super Administrador en Firestore
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// TODO: Asegúrate de que las credenciales coincidan con las de tu proyecto
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

// UID exacto asignado manualmente al Super Administrador en Auth
const SUPER_ADMIN_UID = "4J5PxGAHnkM1CaNm7L24hkhkD8A2";

// Datos del perfil
const superAdminProfile = {
  nombre: "Angel Javier Ramos Alvarado",
  alias: "SuperAdmin Teocalli",
  fechaNacimiento: "1990-01-01",
  compania: "1ra compañia",
  email: "tu-email-de-registro@dominio.com",
  celular: "0000000000",
  rol: "super_admin",
  activo: true
};

async function initializeSuperAdmin() {
  console.log("Iniciando creación de perfil de Super Administrador...");
  try {
    const docRef = doc(db, "usuarios", SUPER_ADMIN_UID);
    await setDoc(docRef, superAdminProfile);
    console.log(`✅ Éxito: Perfil creado en la colección '/usuarios/' con el UID: ${SUPER_ADMIN_UID}`);
  } catch (error) {
    console.error("❌ Error al registrar el Super Administrador en Firestore:", error);
  }
}

// Ejecutar la inicialización
initializeSuperAdmin();
