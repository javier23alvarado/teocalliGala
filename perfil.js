// perfil.js - Lógica modular para la gestión de perfil y contraseña (Compañía Teocalli)
import { auth, db } from "./firebase-config.js";

// Firebase Auth & Firestore v9.23.0 modular CDN Imports
import { 
  onAuthStateChanged,
  updatePassword
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import { 
  doc, 
  getDoc, 
  updateDoc 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Elementos del DOM de Perfil
const profileDetailsForm = document.getElementById("profile-details-form");
const profileAvatarInput = document.getElementById("profile-avatar-input");
const profileAvatarImg = document.getElementById("profile-avatar-img");
const profileFullNameInput = document.getElementById("profile-full-name");
const profileAliasInput = document.getElementById("profile-alias");
const profilePhoneInput = document.getElementById("profile-phone");
const profileEmailInput = document.getElementById("profile-email");

// Formulario de contraseña
const profilePasswordForm = document.getElementById("profile-password-form");
const profileNewPasswordInput = document.getElementById("profile-new-password");
const profileConfirmPasswordInput = document.getElementById("profile-confirm-password");

// Alertas y loader (Reutilizados del Dashboard)
const dbAlert = document.getElementById("db-alert");
const loadingOverlay = document.getElementById("loading-overlay");

let currentUserUid = null;

// ====================================================
// DETECTAR MODO DEMOSTRACIÓN (Local Storage)
// ====================================================
let isDemoMode = false;
try {
  if (auth.app.options.apiKey === "TU_API_KEY_AQUI" || !auth.app.options.apiKey) {
    isDemoMode = true;
  }
} catch (e) {
  isDemoMode = true;
}

// Utilidades UI
function showLoading(show) {
  if (loadingOverlay) {
    loadingOverlay.style.display = show ? "flex" : "none";
  }
}

function showAlert(message, type = "danger") {
  if (dbAlert) {
    dbAlert.innerHTML = message;
    dbAlert.className = `alert alert-${type}`;
    dbAlert.style.display = "block";
    window.scrollTo({ top: 0, behavior: "smooth" });
    setTimeout(() => {
      dbAlert.style.display = "none";
    }, 6000);
  } else {
    alert(message);
  }
}

// ====================================================
// CARGA INICIAL DE DATOS DEL PERFIL
// ====================================================
if (isDemoMode) {
  // Carga en Modo Demo
  const demoSession = sessionStorage.getItem("demo_active_user");
  if (demoSession) {
    const user = JSON.parse(demoSession);
    currentUserUid = user.uid;
    populateProfileData(user);
  }
} else {
  // Carga Real con Firebase Auth
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUserUid = user.uid;
      showLoading(true);
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const docSnap = await getDoc(userDocRef);
        
        if (docSnap.exists()) {
          populateProfileData(docSnap.data());
        }
      } catch (error) {
        console.error("Error al cargar datos del perfil:", error);
        showAlert("No se pudieron cargar los datos de tu perfil en Firestore.");
      }
      showLoading(false);
    }
  });
}

function populateProfileData(userData) {
  if (profileFullNameInput) profileFullNameInput.value = userData.nombre || "";
  if (profileAliasInput) profileAliasInput.value = userData.alias || "";
  if (profilePhoneInput) profilePhoneInput.value = userData.celular || "";
  if (profileEmailInput) profileEmailInput.value = userData.email || "";
  
  // Cargar imagen de perfil si existe
  if (userData.fotoPerfil && profileAvatarImg) {
    profileAvatarImg.src = userData.fotoPerfil;
  }
}

// ====================================================
// PREVIEW LOCAL Y PREPARACIÓN DE IMAGEN
// ====================================================
profileAvatarInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (file) {
    // 1. Mostrar preview inmediato
    const previewUrl = URL.createObjectURL(file);
    profileAvatarImg.src = previewUrl;
    
    // 2. Codificar la imagen a DataURL (Base64) para persistencia local en localstorage o firestore
    const reader = new FileReader();
    reader.onloadend = () => {
      profileAvatarImg.dataset.pendingImage = reader.result;
    };
    reader.readAsDataURL(file);
  }
});

// ====================================================
// ACTUALIZACIÓN DE DATOS EN FIRESTORE
// ====================================================
profileDetailsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  if (!currentUserUid) return;

  const newAlias = profileAliasInput.value.trim();
  const newPhone = profilePhoneInput.value.trim();
  const pendingImage = profileAvatarImg.dataset.pendingImage; // Imagen en base64

  showLoading(true);

  // Campos a actualizar
  const updatedData = {
    alias: newAlias,
    celular: newPhone
  };

  // Agregar la foto si fue modificada
  if (pendingImage) {
    updatedData.fotoPerfil = pendingImage;
  }

  if (isDemoMode) {
    // ---- MODO DEMO (Actualizar Local Storage) ----
    setTimeout(() => {
      const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
      const idx = demoUsers.findIndex(u => u.uid === currentUserUid);
      
      if (idx !== -1) {
        demoUsers[idx] = { ...demoUsers[idx], ...updatedData };
        localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));
        
        // Actualizar la sesión actual en sessionStorage
        sessionStorage.setItem("demo_active_user", JSON.stringify(demoUsers[idx]));
        
        // Sincronizar UI del navbar del Dashboard si existe
        const profileNameEl = document.getElementById("profile-name");
        if (profileNameEl) profileNameEl.textContent = demoUsers[idx].nombre;
        
        showLoading(false);
        showAlert("Datos personales actualizados correctamente (Simulación).", "success");
      }
    }, 600);
  } else {
    // ---- MODO REAL CON FIRESTORE ----
    try {
      const userRef = doc(db, "usuarios", currentUserUid);
      
      // Actualizar solo los campos permitidos en Firestore
      await updateDoc(userRef, updatedData);
      
      // Actualizar nombre artístico y foto en el navbar de forma inmediata si aplica
      const profileNameEl = document.getElementById("profile-name");
      if (profileNameEl) {
        // Obtenemos los nuevos datos para confirmar
        const freshDoc = await getDoc(userRef);
        if (freshDoc.exists()) {
          profileNameEl.textContent = freshDoc.data().nombre;
        }
      }
      
      showLoading(false);
      showAlert("Tu perfil ha sido actualizado exitosamente.", "success");
    } catch (error) {
      showLoading(false);
      console.error("Error al actualizar perfil en Firestore:", error);
      showAlert("Error al guardar cambios: No tienes permisos en Firestore o falló la conexión.");
    }
  }
});

// ====================================================
// CAMBIO DE CONTRASEÑA SEGURO (Auth)
// ====================================================
profilePasswordForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const newPassword = profileNewPasswordInput.value;
  const confirmPassword = profileConfirmPasswordInput.value;

  if (newPassword !== confirmPassword) {
    showAlert("Las contraseñas no coinciden.");
    return;
  }

  showLoading(true);

  if (isDemoMode) {
    setTimeout(() => {
      profilePasswordForm.reset();
      showLoading(false);
      showAlert("Contraseña cambiada con éxito en Modo Demo.", "success");
    }, 600);
  } else {
    try {
      const user = auth.currentUser;
      if (user) {
        // Cambiar la contraseña en Firebase Auth
        await updatePassword(user, newPassword);
        
        profilePasswordForm.reset();
        showLoading(false);
        showAlert("Contraseña actualizada con éxito en tu cuenta.", "success");
      } else {
        showLoading(false);
        showAlert("No se detectó un usuario autenticado.");
      }
    } catch (error) {
      showLoading(false);
      console.error("Error al actualizar la contraseña:", error);
      
      // Manejar el caso especial de reautenticación requerida
      if (error.code === "auth/requires-recent-login") {
        showAlert("⚠️ <strong>Acción requerida:</strong> Por seguridad, debes cerrar sesión, iniciar sesión de nuevo e intentar el cambio inmediatamente.");
      } else {
        showAlert("Error al actualizar la contraseña: " + error.message);
      }
    }
  }
});
