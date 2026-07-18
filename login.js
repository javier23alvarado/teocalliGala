// login.js - Lógica de inicio de sesión definitiva y robusta para la Compañía Teocalli
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

// ====================================================================
// ASOCIACIÓN DE ELEMENTOS DEL DOM (Ajusta los IDs según tu plantilla HTML)
// ====================================================================
const loginForm = document.getElementById("login-form");          // ID de tu etiqueta <form>
const emailInput = document.getElementById("login-email");        // ID de tu <input> de email
const passwordInput = document.getElementById("login-password");  // ID de tu <input> de contraseña
const loginAlert = document.getElementById("login-alert");        // ID del contenedor para inyectar errores/alertas
const loadingOverlay = document.getElementById("loading-overlay"); // ID del spinner/overlay de carga (opcional)

// ====================================================================
// DETECTAR MODO DEMOSTRACIÓN (Fallback local si no hay credenciales)
// ====================================================================
let isDemoMode = false;
try {
  if (auth.app.options.apiKey === "TU_API_KEY_AQUI" || !auth.app.options.apiKey) {
    isDemoMode = true;
  }
} catch (e) {
  isDemoMode = true;
}

// Inicializar base de datos de simulación en LocalStorage para modo Demo
if (isDemoMode) {
  console.warn("🔧 Ejecutando Login en Modo Demo. Edita firebase-config.js para conectar con Firestore real.");
  const storedUsers = localStorage.getItem("teocalli_demo_users");
  if (!storedUsers) {
    const defaultDemoUsers = [
      { 
        uid: "4J5PxGAHnkM1CaNm7L24hkhkD8A2", 
        nombre: "Angel Javier Ramos Alvarado", 
        alias: "SuperAdmin Teocalli", 
        fechaNacimiento: "1990-01-01",
        email: "tu-email-de-autenticacion@dominio.com",
        celular: "0000000000",
        id_compania: "1ra-compania", 
        id_rol: "super_admin", 
        activo: true 
      },
      { 
        uid: "demo-uid-admin", 
        nombre: "Director Artístico", 
        alias: "Director", 
        fechaNacimiento: "1985-08-20",
        email: "director@teocalli.org",
        celular: "3322334455",
        id_compania: "segunda-compania", 
        id_rol: "admin", 
        activo: true 
      },
      { 
        uid: "demo-uid-dancer", 
        nombre: "Sofía Hernández", 
        alias: "Sofi", 
        fechaNacimiento: "2000-11-02",
        email: "danza@teocalli.org",
        celular: "3399887766",
        id_compania: "1ra-compania", 
        id_rol: "bailarin", 
        activo: true 
      },
      { 
        uid: "demo-uid-inactive", 
        nombre: "Juan Pérez", 
        alias: "Juanito", 
        fechaNacimiento: "1998-02-14",
        email: "inactivo@teocalli.org",
        celular: "3344556677",
        id_compania: "prebase", 
        id_rol: "bailarin", 
        activo: false 
      }
    ];
    localStorage.setItem("teocalli_demo_users", JSON.stringify(defaultDemoUsers));
  }
}

// Utilidades UI
function showLoading(show) {
  if (loadingOverlay) {
    loadingOverlay.style.display = show ? "flex" : "none";
  }
}

function showAlert(message, type = "danger") {
  if (loginAlert) {
    loginAlert.innerHTML = message;
    loginAlert.className = `alert alert-${type}`;
    loginAlert.style.display = "block";
  } else {
    alert(message);
  }
}

// ====================================================================
// CONTROLADOR DE EVENTO SUBMIT
// ====================================================================
loginForm.addEventListener("submit", async (e) => {
  // 1. CONTROL DE EVENTOS: Prevenir la recarga tradicional de manera inmediata
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = passwordInput.value;
  
  showLoading(true);
  if (loginAlert) loginAlert.style.display = "none";

  if (isDemoMode) {
    // ---- MODO DEMOSTRACIÓN LOCAL ----
    setTimeout(() => {
      const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
      const user = demoUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

      if (user && password.length >= 6) {
        // Validar si el usuario está activo
        if (user.activo !== true) {
          showLoading(false);
          showAlert("Acceso denegado. Su cuenta se encuentra inactiva.");
          return;
        }

        // Guardar sesión en sessionStorage
        sessionStorage.setItem("demo_active_user", JSON.stringify(user));
        sessionStorage.setItem("uid", user.uid);
        sessionStorage.setItem("id_rol", user.id_rol);
        sessionStorage.setItem("nombre", user.nombre);
        sessionStorage.setItem("id_compania", user.id_compania);
        
        showLoading(false);
        
        // Redirección compatible con Hosting cleanUrls y servidores locales (.html)
        const redirectPath = window.location.pathname.endsWith(".html") ? "compania.html" : "/compania";
        window.location.href = redirectPath;
      } else if (user) {
        showLoading(false);
        showAlert("Correo o contraseña incorrectos.");
      } else {
        showLoading(false);
        showAlert("Correo o contraseña incorrectos.");
      }
    }, 800);
  } else {
    // ---- MODO PRODUCCIÓN REAL CON FIREBASE ----
    try {
      // 2. MANEJO DE ERRORES CON FIREBASE AUTH (Intento de Inicio de Sesión)
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. VALIDACIÓN DE FIRESTORE SEGURA
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userDocRef);

        // Validar si el documento del usuario existe en Firestore
        if (!docSnap.exists()) {
          await signOut(auth);
          showLoading(false);
          showAlert("El usuario no está registrado en el sistema de la compañía.");
          return;
        }

        const userData = docSnap.data();

        // Validar estrictamente el campo booleano 'activo'
        if (userData.activo !== true) {
          await signOut(auth);
          showLoading(false);
          showAlert("Acceso denegado. Su cuenta se encuentra inactiva.");
          return;
        }

        // 4. MANEJO DE SESIÓN Y REDIRECCIÓN LOCAL
        sessionStorage.setItem("uid", user.uid);
        sessionStorage.setItem("id_rol", userData.id_rol);
        sessionStorage.setItem("nombre", userData.nombre);
        sessionStorage.setItem("id_compania", userData.id_compania);
        
        showLoading(false);
        
        // Redirección limpia compatible con cleanUrls y servidores locales
        const redirectPath = window.location.pathname.endsWith(".html") ? "compania.html" : "/compania";
        window.location.href = redirectPath;

      } catch (firestoreError) {
        // En caso de que falle Firestore o las reglas de seguridad bloqueen la lectura por inactividad
        await signOut(auth);
        showLoading(false);
        console.error("Error al leer el perfil de Firestore:", firestoreError);
        showAlert("Acceso denegado. Su cuenta se encuentra inactiva.");
      }

    } catch (authError) {
      showLoading(false);
      console.error("Error de autenticación con Auth:", authError);
      
      // Mapear específicamente los códigos de error de Firebase Auth
      let userFeedbackMsg = "Error al intentar iniciar sesión. Por favor, intente más tarde.";
      
      switch (authError.code) {
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential": // Agregado para compatibilidad con nuevas APIs de Firebase
          userFeedbackMsg = "Correo o contraseña incorrectos.";
          break;
        case "auth/invalid-email":
          userFeedbackMsg = "El formato del correo electrónico no es válido.";
          break;
        case "auth/too-many-requests":
          userFeedbackMsg = "Acceso bloqueado temporalmente por demasiados intentos fallidos.";
          break;
        default:
          userFeedbackMsg = "Error al intentar iniciar sesión. Por favor, intente más tarde.";
          break;
      }
      
      showAlert(userFeedbackMsg);
    }
  }
});
