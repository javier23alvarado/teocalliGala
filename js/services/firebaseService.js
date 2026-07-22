// firebase-config.js - Configuración central de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

// TODO: Reemplazar con las credenciales de tu proyecto de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA2fBMU5IpyNU1UqX8pV5wRMg_ghtyJqoA",
  authDomain: "teocalli-sabia-de-mi-tierra.firebaseapp.com",
  databaseURL: "https://teocalli-sabia-de-mi-tierra-default-rtdb.firebaseio.com",
  projectId: "teocalli-sabia-de-mi-tierra",
  storageBucket: "teocalli-sabia-de-mi-tierra.firebasestorage.app",
  messagingSenderId: "283561336136",
  appId: "1:283561336136:web:c3955ba2688dbbc713e77d",
  measurementId: "G-DGR1VXTXNL"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);

// Exportar servicios de Auth, Firestore, Storage y Configuración
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app, "gs://teocalli-sabia-de-mi-tierra.appspot.com");
export { firebaseConfig };
