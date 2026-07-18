// login.js - Lógica de inicio de sesión para Compañía Teocalli
import { auth, db } from "./firebase-config.js";

// Firebase Auth & Firestore v9.23.0 modular CDN Imports
import { 
  signInWithEmailAndPassword, 
  signOut 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import { 
  doc, 
  getDoc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Elementos del DOM
const loginForm = document.getElementById("login-form");
const emailInput = document.getElementById("login-email");
const passwordInput = document.getElementById("login-password");
const loginAlert = document.getElementById("login-alert");
const loadingOverlay = document.getElementById("loading-overlay");

// ====================================================
// DETECTAR MODO DEMOSTRACIÓN (Para pruebas locales sin configurar Firebase)
// ====================================================
let isDemoMode = false;
try {
  if (auth.app.options.apiKey === "TU_API_KEY_AQUI" || !auth.app.options.apiKey) {
    isDemoMode = true;
  }
} catch (e) {
  isDemoMode = true;
}

// Cuentas de prueba pre-guardadas en LocalStorage para modo Demo
if (isDemoMode) {
  console.warn("🔧 Ejecutando Login en Modo Demo. Edita firebase-config.js para conectar con Firestore real.");
  const storedUsers = localStorage.getItem("teocalli_demo_users");
  if (!storedUsers) {
    const defaultDemoUsers = [
      { uid: "4J5PxGAHnkM1CaNm7L24hkhkD8A2", nombre: "Angel Javier Ramos Alvarado", alias: "SuperAdmin Teocalli", compania: "1ra compañia", email: "tu-email-de-autenticacion@dominio.com", rol: "super_admin", activo: true },
      { uid: "demo-uid-admin", nombre: "Director Artístico", alias: "Director", compania: "Segunda Compañía", email: "director@teocalli.org", rol: "admin", activo: true },
      { uid: "demo-uid-dancer", nombre: "Sofía Hernández", alias: "Sofi", compania: "1ra Compañía", email: "danza@teocalli.org", rol: "bailarin", activo: true },
      { uid: "demo-uid-inactive", nombre: "Juan Pérez", alias: "Juanito", compania: "Prebase", email: "inactivo@teocalli.org", rol: "bailarin", activo: false }
    ];
    localStorage.setItem("teocalli_demo_users", JSON.stringify(defaultDemoUsers));
  }
}

function showLoading(show) {
  loadingOverlay.style.display = show ? "flex" : "none";
}

function showAlert(message, type = "danger") {
  loginAlert.innerHTML = message;
  loginAlert.className = `alert alert-${type}`;
  loginAlert.style.display = "block";
}

// Manejar Submit del Formulario
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  showLoading(true);
  loginAlert.style.display = "none";

  if (isDemoMode) {
    // ---- MODO DEMO ----
    setTimeout(() => {
      const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
      const user = demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (user && password.length >= 6) {
        if (!user.activo) {
          showLoading(false);
          showAlert("Acceso denegado. Usuario inactivo");
          return;
        }

        sessionStorage.setItem("demo_active_user", JSON.stringify(user));
        sessionStorage.setItem("user_rol", user.rol);
        
        showLoading(false);
        // Redirección limpia a /compania
        window.location.href = "/compania";
      } else if (user) {
        showLoading(false);
        showAlert("Contraseña incorrecta. (Demo: Usa cualquier clave de 6+ caracteres)");
      } else {
        showLoading(false);
        showAlert("Acceso denegado. Usuario inactivo");
      }
    }, 800);
  } else {
    // ---- MODO REAL CON FIREBASE ----
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      try {
        const userDocRef = doc(db, "usuarios", uid);
        const userDocSnapshot = await getDoc(userDocRef);

        if (userDocSnapshot.exists()) {
          const userData = userDocSnapshot.data();

          // Validación de usuario activo
          if (userData.activo !== true) {
            await signOut(auth);
            showLoading(false);
            showAlert("Acceso denegado. Usuario inactivo");
            return;
          }

          // Guardar rol en sessionStorage bajo la clave 'user_rol'
          sessionStorage.setItem("user_rol", userData.rol);
          
          showLoading(false);
          // Redirigir a /compania
          window.location.href = "/compania";
        } else {
          // Documento de usuario no existe
          await signOut(auth);
          showLoading(false);
          showAlert("Acceso denegado. Usuario inactivo");
        }
      } catch (firestoreError) {
        await signOut(auth);
        showLoading(false);
        console.error("Error en Firestore:", firestoreError);
        showAlert("Acceso denegado. Usuario inactivo");
      }

    } catch (authError) {
      showLoading(false);
      console.error("Error en Auth:", authError);
      showAlert("Acceso denegado. Usuario inactivo");
    }
  }
});
