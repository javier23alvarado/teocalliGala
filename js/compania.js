// Firebase Auth & Firestore v9.23.0 modular CDN Imports
import { auth, db, storage, firebaseConfig } from "./firebase-config.js";

import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";

import { 
  doc, 
  getDoc,
  collection, 
  addDoc, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocs,
  serverTimestamp,
  query,
  where,
  setDoc
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

// Redirección dinámica compatible con cleanUrls y archivos locales (.html)
const LOGIN_REDIRECT = window.location.pathname.endsWith(".html") ? "login.html" : "/login";

// Elementos del DOM
const loadingOverlay = document.getElementById("loading-overlay");
const profileName = document.getElementById("profile-name");
const profileRole = document.getElementById("profile-role");
const avatarInitials = document.getElementById("avatar-initials");
const dbWelcomeTitle = document.getElementById("db-welcome-title");
const dbWelcomeDesc = document.getElementById("db-welcome-desc");
const badgeActiveStatus = document.getElementById("badge-active-status");
const btnLogout = document.getElementById("btn-logout");
const dbAlert = document.getElementById("db-alert");

// Elementos de la vista personalizada del Miembro
const welcomeRoleTitle = document.getElementById("welcome-role-title");
const welcomeRoleMessage = document.getElementById("welcome-role-message");
const welcomeRoleCard = document.getElementById("welcome-role-card");

// Navegación Sidebar
const navDbGeneral = document.getElementById("btn-resumen");
const navDbUsers = document.getElementById("btn-users");
const sidebarOptUsers = document.getElementById("sidebar-opt-users");
const navDbProfile = document.getElementById("btn-perfil");
const navDbAgenda = document.getElementById("btn-agenda");
const navDbGala = document.getElementById("btn-gala");
const btnMenuToggle = document.getElementById("btn-menu-toggle");
const sidebar = document.querySelector(".sidebar");
const profileAvatarSidebar = document.getElementById("profile-avatar-sidebar");

// Secciones del Dashboard
const dbSectionGeneral = document.getElementById("db-section-general");
const dbSectionUsers = document.getElementById("db-section-users");
const dbSectionProfile = document.getElementById("db-section-profile");

// Métricas
const metricTotalDancers = document.getElementById("metric-total-dancers");
const metricActiveDancers = document.getElementById("metric-active-dancers");

// Formulario de Registro/Edición CRUD
const newUserForm = document.getElementById("new-user-form");
const userRegistrationCard = document.getElementById("user-registration-card");
const regUidInput = document.getElementById("reg-uid");
const regNombresInput = document.getElementById("reg-nombres");
const regPaternoInput = document.getElementById("reg-paterno");
const regMaternoInput = document.getElementById("reg-materno");
const regAliasInput = document.getElementById("reg-alias");
const regDobInput = document.getElementById("reg-dob");
const regSexoSelect = document.getElementById("reg-sexo");
const regCompanySelect = document.getElementById("reg-company");
const regEmailInput = document.getElementById("reg-email");
const regPhoneInput = document.getElementById("reg-phone");
const regRoleSelect = document.getElementById("reg-role");
const regStatusInput = document.getElementById("reg-status");

const btnRegisterSubmit = document.getElementById("btn-register-submit");
const btnCancelEdit = document.getElementById("btn-cancel-edit");
const formActionTitle = document.getElementById("form-action-title");

// Elementos de Filtros
const filterCompany = document.getElementById("filter-company");
const filterGender = document.getElementById("filter-gender");
const filterAge = document.getElementById("filter-age");

// Tabla CRUD
const usersTableBody = document.getElementById("users-table-body");
const usersCountBadge = document.getElementById("users-count-badge");

// Estado de la Aplicación
let currentUserProfile = null;
let unsubscribeUsers = null;
let companiesCatalog = []; // Catálogo dinámico de compañías
let currentUsersData = []; // Datos completos cargados para filtrado local

// Catálogo de roles estático para formatear visualizaciones
const rolesCatalog = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  bailarin: "Bailarín"
};

// ====================================================
// UTILERÍAS GENERALES
// ====================================================
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

function closeSidebarOnMobile() {
  if (sidebar && sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
  }
}

function calculateAge(dobString) {
  if (!dobString) return "--";
  const today = new Date();
  const birthDate = new Date(dobString);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

// Convertir una imagen a formato WebP y comprimirla en el cliente usando HTML5 Canvas
function convertToWebP(file, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            console.warn("Canvas toBlob fallido, subiendo archivo original.");
            resolve(file);
          }
        }, "image/webp", quality);
      };
      img.onerror = (err) => {
        console.warn("Error al cargar la imagen en img.onload, subiendo archivo original:", err);
        resolve(file);
      };
      img.src = event.target.result;
    };
    reader.onerror = (err) => {
      console.warn("Error al leer el archivo en FileReader, subiendo archivo original:", err);
      resolve(file);
    };
    reader.readAsDataURL(file);
  });
}

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

// Inicializar datos simulados de compañías y usuarios en LocalStorage si es modo Demo
if (isDemoMode) {
  console.warn("🔧 Ejecutando Dashboard en Modo Demo (Local Storage).");
  
  // Catálogo de compañías
  const storedCompanies = localStorage.getItem("teocalli_demo_companies");
  if (!storedCompanies) {
    companiesCatalog = [
      { id: "1ra-compania", nombre: "1ra Compañía" },
      { id: "segunda-compania", nombre: "Segunda Compañía" },
      { id: "prebase", nombre: "Prebase" }
    ];
    localStorage.setItem("teocalli_demo_companies", JSON.stringify(companiesCatalog));
  } else {
    companiesCatalog = JSON.parse(storedCompanies);
  }

  // Comprobar sesión
  const demoSession = sessionStorage.getItem("demo_active_user");
  if (!demoSession) {
    window.location.href = LOGIN_REDIRECT;
  } else {
    currentUserProfile = JSON.parse(demoSession);
    initializeDashboard(currentUserProfile);
  }
} else {
  // ---- FLUJO REAL CON FIREBASE AUTH ----
  showLoading(true);
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Route Guard: Redirección inmediata a login
      window.location.href = LOGIN_REDIRECT;
    } else {
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Validación estricta de cuenta activa
          if (userData.activo !== true) {
            await signOut(auth);
            sessionStorage.clear();
            window.location.href = LOGIN_REDIRECT;
            return;
          }

          currentUserProfile = { uid: user.uid, ...userData };
          
          // Cargar catálogo de compañías desde Firestore antes de inicializar vistas
          await loadCompaniesCatalog();
          initializeDashboard(currentUserProfile);
        } else {
          await signOut(auth);
          sessionStorage.clear();
          window.location.href = LOGIN_REDIRECT;
        }
      } catch (error) {
        console.error("Error al recuperar sesión de base de datos:", error);
        window.location.href = LOGIN_REDIRECT;
      }
    }
  });
}

// Cargar catálogo de compañías
async function loadCompaniesCatalog() {
  if (isDemoMode) return;
  try {
    const compRef = collection(db, "companias");
    const snapshot = await getDocs(compRef);
    companiesCatalog = [];
    
    // Si la colección 'companias' está vacía en Firestore, la inicializamos con defaults
    if (snapshot.empty) {
      console.log("Inicializando catálogo de compañías por defecto en Firestore...");
      const defaultCompanies = [
        { id: "1ra-compania", nombre: "1ra Compañía" },
        { id: "segunda-compania", nombre: "Segunda Compañía" },
        { id: "prebase", nombre: "Prebase" }
      ];
      for (const comp of defaultCompanies) {
        await setDoc(doc(db, "companias", comp.id), { nombre: comp.nombre });
        companiesCatalog.push(comp);
      }
    } else {
      snapshot.forEach(doc => {
        companiesCatalog.push({ id: doc.id, nombre: doc.data().nombre });
      });
    }
  } catch (error) {
    console.error("Error al cargar catálogo de compañías:", error);
    // Fallback de catálogo en caso de error
    companiesCatalog = [
      { id: "1ra-compania", nombre: "1ra Compañía" },
      { id: "segunda-compania", nombre: "Segunda Compañía" },
      { id: "prebase", nombre: "Prebase" }
    ];
  }
}

// ====================================================
// ORQUESTACIÓN DE RENDERIZADO Y CONTROL DE ACCESO
// ====================================================
function initializeDashboard(profile) {
  setupGalaModule(profile);
  // Mostrar contenedor principal al verificar sesión
  const dashboardWrapper = document.querySelector(".dashboard-wrapper");
  if (dashboardWrapper) dashboardWrapper.style.display = "flex";

  // Rellenar navbar superior y avatar
  const fullName = `${profile.nombres || ""} ${profile.apellidoPaterno || ""} ${profile.apellidoMaterno || ""}`.trim();
  profileName.textContent = fullName || profile.nombre;
  
  const roleText = rolesCatalog[profile.id_rol] || "Miembro";
  profileRole.textContent = roleText;

  const initials = (profile.nombres || profile.nombre || "U").split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  avatarInitials.textContent = initials;

  // Mostrar foto de perfil en el sidebar si existe
  if (profile.fotoPerfil) {
    if (profileAvatarSidebar) {
      profileAvatarSidebar.src = profile.fotoPerfil;
      profileAvatarSidebar.style.display = "block";
    }
    avatarInitials.style.display = "none";
  } else {
    if (profileAvatarSidebar) profileAvatarSidebar.style.display = "none";
    avatarInitials.style.display = "inline";
  }

  dbWelcomeTitle.textContent = `¡Bienvenido, ${profile.alias || profile.nombre || fullName}!`;
  dbWelcomeDesc.textContent = `Sesión iniciada como ${roleText}`;
  
  badgeActiveStatus.textContent = "Perfil Activo";
  badgeActiveStatus.className = "badge badge-active";

  // Poblar dropdown de compañías en el formulario
  populateCompanyDropdown();

  // Configurar las acciones y carga de la vista del perfil
  setupUserProfile(profile);

  // Orquestación estricta por roles
  if (profile.id_rol === "super_admin") {
    // Si es Super Administrador, habilitar vista CRUD y controles de gestión
    if (sidebarOptUsers) sidebarOptUsers.style.display = "block";
    setupSuperAdminCRUD();
    
    // Configurar vista general personalizada para administrador
    welcomeRoleTitle.textContent = "Consola de Super Administrador";
    welcomeRoleMessage.textContent = "Tienes acceso completo a la base de datos de la Compañía Teocalli. Puedes crear, consultar, modificar y eliminar miembros de la plataforma, así como supervisar sus estados de acceso.";
  } else {
    // Si es administrador o bailarín estándar:
    // Ocultar por completo o remover del DOM el listado de gestión, el menú lateral y el formulario
    if (sidebarOptUsers) sidebarOptUsers.remove();
    if (dbSectionUsers) dbSectionUsers.remove();
    if (userRegistrationCard) userRegistrationCard.remove();

    // Obtener nombre legible de su compañía vinculada
    const companyObj = companiesCatalog.find(c => c.id === profile.id_compania);
    const companyName = companyObj ? companyObj.nombre : "Compañía General";

    // Personalizar vista de bienvenida
    welcomeRoleTitle.textContent = `Ballet Folclórico - ${companyName}`;
    welcomeRoleMessage.innerHTML = `Hola <strong>${profile.nombre}</strong>. Has ingresado al portal interno del ballet. Tu compañía asignada es <strong>${companyName}</strong> con el nivel de acceso de <strong>${roleText}</strong>.<br><br>Próximamente tendrás acceso a tus evaluaciones técnicas, asistencia de ensayos y materiales de coreografías en esta sección.`;
    
    metricTotalDancers.textContent = "--";
    metricActiveDancers.textContent = "--";
    
    showLoading(false);
  }
  
  // Configurar módulo de agenda
  setupAgendaModule();
}

// Cargar opciones en el dropdown
function populateCompanyDropdown() {
  if (!regCompanySelect) return;
  regCompanySelect.innerHTML = `<option value="" disabled selected>Selecciona compañía</option>`;
  companiesCatalog.forEach(comp => {
    const opt = document.createElement("option");
    opt.value = comp.id;
    opt.textContent = comp.nombre;
    regCompanySelect.appendChild(opt);
  });
}

// ====================================================
// NAVEGADORES GLOBALES E INTERACTIVIDAD MÓVIL
// ====================================================
if (navDbGeneral) {
  navDbGeneral.addEventListener("click", (e) => {
    e.preventDefault();
    switchDbSection("general");
    closeSidebarOnMobile();
  });
}

if (navDbGala) {
  navDbGala.addEventListener("click", (e) => {
    e.preventDefault();
    switchDbSection("gala");
    closeSidebarOnMobile();
  });
}

if (navDbProfile) {
  navDbProfile.addEventListener("click", (e) => {
    e.preventDefault();
    switchDbSection("profile");
    closeSidebarOnMobile();
  });
}

// Control del menú hamburguesa móvil
if (btnMenuToggle && sidebar) {
  btnMenuToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    sidebar.classList.toggle("active");
  });

  // Cerrar sidebar al hacer clic en el área principal
  document.addEventListener("click", (e) => {
    if (sidebar.classList.contains("active") && !sidebar.contains(e.target) && e.target !== btnMenuToggle) {
      sidebar.classList.remove("active");
    }
  });
}

// Cierre de sesión
btnLogout.addEventListener("click", async () => {
  showLoading(true);
  
  if (unsubscribeUsers) unsubscribeUsers();

  if (isDemoMode) {
    sessionStorage.clear();
    window.location.href = LOGIN_REDIRECT;
  } else {
    try {
      await signOut(auth);
      sessionStorage.clear();
      window.location.href = LOGIN_REDIRECT;
    } catch (e) {
      showLoading(false);
      console.error("Error al cerrar sesión:", e);
    }
  }
});

// ====================================================
// GESTIÓN DEL PERFIL DE USUARIO (Acciones y Contraseña)
// ====================================================
function setupUserProfile(profile) {
  const profileDetailsForm = document.getElementById("profile-details-form");
  const profileAvatarInput = document.getElementById("profile-avatar-input");
  const profileAvatarImg = document.getElementById("profile-avatar-img");
  const profileNombresInput = document.getElementById("profile-nombres");
  const profilePaternoInput = document.getElementById("profile-paterno");
  const profileMaternoInput = document.getElementById("profile-materno");
  const profileAliasInput = document.getElementById("profile-alias");
  const profilePhoneInput = document.getElementById("profile-phone");
  const profileEmailInput = document.getElementById("profile-email");

  const profilePasswordForm = document.getElementById("profile-password-form");
  const profileNewPasswordInput = document.getElementById("profile-new-password");
  const profileConfirmPasswordInput = document.getElementById("profile-confirm-password");

  if (!profileDetailsForm) return;

  // Llenar campos del perfil con la sesión activa
  if (profileNombresInput) profileNombresInput.value = profile.nombres || "";
  if (profilePaternoInput) profilePaternoInput.value = profile.apellidoPaterno || "";
  if (profileMaternoInput) profileMaternoInput.value = profile.apellidoMaterno || "";
  if (profileAliasInput) profileAliasInput.value = profile.alias || "";
  if (profilePhoneInput) profilePhoneInput.value = profile.celular || "";
  if (profileEmailInput) profileEmailInput.value = profile.email || "";
  
  if (profile.fotoPerfil && profileAvatarImg) {
    profileAvatarImg.src = profile.fotoPerfil;
  }

  // Previsualización y codificación de cualquier formato de imagen
  if (profileAvatarInput && profileAvatarImg) {
    profileAvatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const validExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif", ".bmp", ".tiff"];
        const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        
        if (!file.type.startsWith("image/") && !validExtensions.includes(fileExtension)) {
          showAlert("El archivo seleccionado debe ser una imagen válida.");
          profileAvatarInput.value = ""; // Resetear input
          return;
        }
        
        // Guardar archivo original para ser procesado al guardar
        profileAvatarImg.pendingFile = file;

        // Previsualizar la imagen usando URL temporal
        const previewUrl = URL.createObjectURL(file);
        profileAvatarImg.src = previewUrl;
      }
    });
  }

  // Guardar datos del perfil
  profileDetailsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading(true);

    const newAlias = profileAliasInput.value.trim();
    const newPhone = profilePhoneInput.value.trim();

    const updatedData = {
      alias: newAlias,
      celular: newPhone
    };

    if (isDemoMode) {
      const saveDemoProfile = (fotoPerfilUrl) => {
        const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
        const idx = demoUsers.findIndex(u => u.uid === profile.uid);
        if (idx !== -1) {
          if (fotoPerfilUrl) {
            updatedData.fotoPerfil = fotoPerfilUrl;
          }
          demoUsers[idx] = { ...demoUsers[idx], ...updatedData };
          localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));
          
          sessionStorage.setItem("demo_active_user", JSON.stringify(demoUsers[idx]));
          
          // Actualizar navbar superior e imagen del sidebar
          const updatedName = `${demoUsers[idx].nombres || ""} ${demoUsers[idx].apellidoPaterno || ""} ${demoUsers[idx].apellidoMaterno || ""}`.trim();
          profileName.textContent = updatedName || demoUsers[idx].nombre;
          if (demoUsers[idx].fotoPerfil && profileAvatarSidebar) {
            profileAvatarSidebar.src = demoUsers[idx].fotoPerfil;
            profileAvatarSidebar.style.display = "block";
            avatarInitials.style.display = "none";
          }
          
          showLoading(false);
          showAlert("Datos de perfil actualizados con éxito (Demo).", "success");
        }
      };

      if (profileAvatarImg.pendingFile) {
        convertToWebP(profileAvatarImg.pendingFile)
          .then((webpBlob) => {
            const reader = new FileReader();
            reader.readAsDataURL(webpBlob);
            reader.onloadend = () => {
              saveDemoProfile(reader.result);
            };
          })
          .catch((err) => {
            showLoading(false);
            console.error("Error al procesar WebP:", err);
            showAlert("Error al comprimir la imagen.");
          });
      } else {
        saveDemoProfile(null);
      }
    } else {
      const saveRealProfile = async (fotoPerfilUrl) => {
        try {
          if (fotoPerfilUrl) {
            updatedData.fotoPerfil = fotoPerfilUrl;
          }

          const userRef = doc(db, "usuarios", profile.uid);
          await updateDoc(userRef, updatedData);
          
          // Actualizar navbar y sidebar
          if (updatedData.fotoPerfil && profileAvatarSidebar) {
            profileAvatarSidebar.src = updatedData.fotoPerfil;
            profileAvatarSidebar.style.display = "block";
            avatarInitials.style.display = "none";
          }
          
          showLoading(false);
          showAlert("Tu perfil ha sido actualizado exitosamente.", "success");
        } catch (error) {
          showLoading(false);
          console.error("Error al actualizar perfil:", error);
          showAlert("Error al guardar perfil en Firestore: " + error.message);
        }
      };

      if (profileAvatarImg.pendingFile) {
        convertToWebP(profileAvatarImg.pendingFile)
          .then((webpBlob) => {
            // Si la conversión retornó el archivo original heic/raw
            if (!(webpBlob instanceof Blob)) {
              const reader = new FileReader();
              reader.readAsDataURL(webpBlob);
              reader.onloadend = () => {
                saveRealProfile(reader.result);
              };
              return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(webpBlob);
            reader.onloadend = () => {
              saveRealProfile(reader.result);
            };
          })
          .catch((err) => {
            showLoading(false);
            console.error("Error al procesar WebP:", err);
            showAlert("Error al comprimir la imagen.");
          });
      } else {
        saveRealProfile(null);
      }
    }
  });

  // Cambiar contraseña
  if (profilePasswordForm) {
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
          showAlert("Contraseña cambiada con éxito (Demo).", "success");
        }, 500);
      } else {
        try {
          const user = auth.currentUser;
          if (user) {
            const { updatePassword } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js");
            await updatePassword(user, newPassword);
            
            profilePasswordForm.reset();
            showLoading(false);
            showAlert("Contraseña actualizada con éxito.", "success");
          } else {
            showLoading(false);
            showAlert("No se detectó un usuario autenticado.");
          }
        } catch (error) {
          showLoading(false);
          console.error("Error al cambiar contraseña:", error);
          if (error.code === "auth/requires-recent-login") {
            showAlert("⚠️ <strong>Acción requerida:</strong> Por seguridad, debes cerrar sesión, iniciar sesión de nuevo e intentar el cambio inmediatamente.");
          } else {
            showAlert("Error al actualizar contraseña: " + error.message);
          }
        }
      }
    });
  }
}

// ====================================================
// PESTAÑAS DE GESTIÓN (Tabs setup)
if (profileAliasInput) profileAliasInput.value = profile.alias || "";
  if (profilePhoneInput) profilePhoneInput.value = profile.celular || "";
  if (profileEmailInput) profileEmailInput.value = profile.email || "";
  
  if (profile.fotoPerfil && profileAvatarImg) {
    profileAvatarImg.src = profile.fotoPerfil;
  }

  // Previsualización y codificación de cualquier formato de imagen
  if (profileAvatarInput && profileAvatarImg) {
    profileAvatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const validExtensions = [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".gif", ".bmp", ".tiff"];
        const fileExtension = file.name.substring(file.name.lastIndexOf(".")).toLowerCase();
        
        if (!file.type.startsWith("image/") && !validExtensions.includes(fileExtension)) {
          showAlert("El archivo seleccionado debe ser una imagen válida.");
          profileAvatarInput.value = ""; // Resetear input
          return;
        }
        
        // Guardar archivo original para ser procesado al guardar
        profileAvatarImg.pendingFile = file;

        // Previsualizar la imagen usando URL temporal
        const previewUrl = URL.createObjectURL(file);
        profileAvatarImg.src = previewUrl;
      }
    });
  }

  // Guardar datos del perfil
  profileDetailsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    showLoading(true);

    const newAlias = profileAliasInput.value.trim();
    const newPhone = profilePhoneInput.value.trim();

    const updatedData = {
      alias: newAlias,
      celular: newPhone
    };

    if (isDemoMode) {
      const saveDemoProfile = (fotoPerfilUrl) => {
        const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
        const idx = demoUsers.findIndex(u => u.uid === profile.uid);
        if (idx !== -1) {
          if (fotoPerfilUrl) {
            updatedData.fotoPerfil = fotoPerfilUrl;
          }
          demoUsers[idx] = { ...demoUsers[idx], ...updatedData };
          localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));
          
          sessionStorage.setItem("demo_active_user", JSON.stringify(demoUsers[idx]));
          
          // Actualizar navbar superior e imagen del sidebar
          const updatedName = `${demoUsers[idx].nombres || ""} ${demoUsers[idx].apellidoPaterno || ""} ${demoUsers[idx].apellidoMaterno || ""}`.trim();
          profileName.textContent = updatedName || demoUsers[idx].nombre;
          if (demoUsers[idx].fotoPerfil && profileAvatarSidebar) {
            profileAvatarSidebar.src = demoUsers[idx].fotoPerfil;
            profileAvatarSidebar.style.display = "block";
            avatarInitials.style.display = "none";
          }
          
          showLoading(false);
          showAlert("Datos de perfil actualizados con éxito (Demo).", "success");
        }
      };

      if (profileAvatarImg.pendingFile) {
        convertToWebP(profileAvatarImg.pendingFile)
          .then((webpBlob) => {
            const reader = new FileReader();
            reader.readAsDataURL(webpBlob);
            reader.onloadend = () => {
              saveDemoProfile(reader.result);
            };
          })
          .catch((err) => {
            showLoading(false);
            console.error("Error al procesar WebP:", err);
            showAlert("Error al comprimir la imagen.");
          });
      } else {
        saveDemoProfile(null);
      }
    } else {
      const saveRealProfile = async (fotoPerfilUrl) => {
        try {
          if (fotoPerfilUrl) {
            updatedData.fotoPerfil = fotoPerfilUrl;
          }

          const userRef = doc(db, "usuarios", profile.uid);
          await updateDoc(userRef, updatedData);
          
          // Actualizar navbar y sidebar
          if (updatedData.fotoPerfil && profileAvatarSidebar) {
            profileAvatarSidebar.src = updatedData.fotoPerfil;
            profileAvatarSidebar.style.display = "block";
            avatarInitials.style.display = "none";
          }
          
          showLoading(false);
          showAlert("Tu perfil ha sido actualizado exitosamente.", "success");
        } catch (error) {
          showLoading(false);
          console.error("Error al actualizar perfil:", error);
          showAlert("Error al guardar perfil en Firestore: " + error.message);
        }
      };

      if (profileAvatarImg.pendingFile) {
        convertToWebP(profileAvatarImg.pendingFile)
          .then((webpBlob) => {
            // Si la conversión retornó el archivo original heic/raw
            if (!(webpBlob instanceof Blob)) {
              const reader = new FileReader();
              reader.readAsDataURL(webpBlob);
              reader.onloadend = () => {
                saveRealProfile(reader.result);
              };
              return;
            }
            const reader = new FileReader();
            reader.readAsDataURL(webpBlob);
            reader.onloadend = () => {
              saveRealProfile(reader.result);
            };
          })
          .catch((err) => {
            showLoading(false);
            console.error("Error al procesar WebP:", err);
            showAlert("Error al comprimir la imagen.");
          });
      } else {
        saveRealProfile(null);
      }
    }
  });

  // Cambiar contraseña
  if (profilePasswordForm) {
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
          showAlert("Contraseña cambiada con éxito (Demo).", "success");
        }, 500);
      } else {
        try {
          const user = auth.currentUser;
          if (user) {
            const { updatePassword } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js");
            await updatePassword(user, newPassword);
            
            profilePasswordForm.reset();
            showLoading(false);
            showAlert("Contraseña actualizada con éxito.", "success");
          } else {
            showLoading(false);
            showAlert("No se detectó un usuario autenticado.");
          }
        } catch (error) {
          showLoading(false);
          console.error("Error al cambiar contraseña:", error);
          if (error.code === "auth/requires-recent-login") {
            showAlert("⚠️ <strong>Acción requerida:</strong> Por seguridad, debes cerrar sesión, iniciar sesión de nuevo e intentar el cambio inmediatamente.");
          } else {
            showAlert("Error al actualizar contraseña: " + error.message);
          }
        }
      }
    });
  }
}

// ====================================================
// PESTAÑAS DE GESTIÓN (Tabs setup)
// ====================================================
function setupUserManagementTabs() {
  const tabBtnList = document.getElementById("tab-btn-list");
  const tabBtnForm = document.getElementById("tab-btn-form");
  const tabContentList = document.getElementById("tab-content-list");
  const tabContentForm = document.getElementById("tab-content-form");

  if (!tabBtnList || !tabBtnForm || !tabContentList || !tabContentForm) return;

  tabBtnList.addEventListener("click", () => {
    tabBtnList.classList.add("active");
    tabBtnForm.classList.remove("active");
    tabContentList.style.display = "block";
    tabContentForm.style.display = "none";
  });

  tabBtnForm.addEventListener("click", () => {
    tabBtnForm.classList.add("active");
    tabBtnList.classList.remove("active");
    tabContentForm.style.display = "block";
    tabContentList.style.display = "none";
  });
}

function switchToTab(tabName) {
  const tabBtnList = document.getElementById("tab-btn-list");
  const tabBtnForm = document.getElementById("tab-btn-form");
  const tabContentList = document.getElementById("tab-content-list");
  const tabContentForm = document.getElementById("tab-content-form");

  if (!tabBtnList || !tabBtnForm || !tabContentList || !tabContentForm) return;

  if (tabName === "list") {
    tabBtnList.classList.add("active");
    tabBtnForm.classList.remove("active");
    tabContentList.style.display = "block";
    tabContentForm.style.display = "none";
  } else if (tabName === "form") {
    tabBtnForm.classList.add("active");
    tabBtnList.classList.remove("active");
    tabContentForm.style.display = "block";
    tabContentList.style.display = "none";
  }
}

// ====================================================
// FILTRADO LOCAL DE USUARIOS
// ====================================================
function filterAndRender() {
  let filtered = [...currentUsersData];

  // 1. Filtrar por compañía
  const compVal = filterCompany ? filterCompany.value : "todos";
  if (compVal !== "todos") {
    filtered = filtered.filter(u => u.id_compania === compVal);
  }

  // 2. Filtrar por sexo (género)
  const genVal = filterGender ? filterGender.value : "todos";
  if (genVal !== "todos") {
    filtered = filtered.filter(u => u.sexo === genVal);
  }

  // 3. Filtrar por edad
  const ageVal = filterAge ? filterAge.value : "todos";
  if (ageVal !== "todos") {
    filtered = filtered.filter(u => {
      const age = calculateAge(u.fechaNacimiento);
      if (age === "--") return false;

      if (ageVal === "menor") return age < 18;
      if (ageVal === "joven") return age >= 18 && age <= 25;
      if (ageVal === "adulto") return age >= 26 && age <= 35;
      if (ageVal === "mayor") return age > 35;
      return true;
    });
  }

  renderUsersTable(filtered);

  // El badge de la tabla muestra el número de miembros filtrados
  if (usersCountBadge) usersCountBadge.textContent = `${filtered.length} miembros`;

  // Las métricas grandes muestran los totales globales
  updateMetrics(currentUsersData);
}

// ====================================================
// CRUD DE USUARIOS (Solo Super Administrador)
// ====================================================
function setupSuperAdminCRUD() {
  if (navDbUsers) {
    navDbUsers.addEventListener("click", (e) => {
      e.preventDefault();
      switchDbSection("users");
      closeSidebarOnMobile();
    });
  }

  // Configurar listeners de las pestañas
  setupUserManagementTabs();

  // Escuchar cambios en los filtros
  if (filterCompany) filterCompany.addEventListener("change", filterAndRender);
  if (filterGender) filterGender.addEventListener("change", filterAndRender);
  if (filterAge) filterAge.addEventListener("change", filterAndRender);

  // Configurar envío del formulario de registro (Crear/Editar)
  if (newUserForm) newUserForm.addEventListener("submit", handleFormSubmit);

  // Configurar botón cancelar edición
  if (btnCancelEdit) btnCancelEdit.addEventListener("click", resetFormState);

  // READ (Lectura en tiempo real)
  if (isDemoMode) {
    // Sincronización simulada local
    currentUsersData = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
    filterAndRender();
  } else {
    const q = collection(db, "usuarios");
    unsubscribeUsers = onSnapshot(q, (snapshot) => {
      currentUsersData = [];
      snapshot.forEach((doc) => {
        currentUsersData.push({ uid: doc.id, ...doc.data() });
      });
      filterAndRender();
    }, (error) => {
      console.error("Error al leer en tiempo real de Firestore:", error);
      showAlert("Error de permisos en Firestore al sincronizar usuarios.");
    });
  }

  showLoading(false);
}

function switchDbSection(sectionName) {
  document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
  document.querySelectorAll(".db-section").forEach(s => s.classList.remove("active"));

  if (sectionName === "general") {
    if (navDbGeneral) navDbGeneral.classList.add("active");
    if (dbSectionGeneral) dbSectionGeneral.classList.add("active");
  } else if (sectionName === "users") {
    if (navDbUsers) navDbUsers.classList.add("active");
    if (dbSectionUsers) dbSectionUsers.classList.add("active");
  } else if (sectionName === "profile") {
    if (navDbProfile) navDbProfile.classList.add("active");
    if (dbSectionProfile) dbSectionProfile.classList.add("active");
  } else if (sectionName === "agenda") {
    if (navDbAgenda) navDbAgenda.classList.add("active");
    const dbSectionAgenda = document.getElementById("db-section-agenda");
    if (dbSectionAgenda) dbSectionAgenda.classList.add("active");
  } else if (sectionName === "gala") {
    if (navDbGala) navDbGala.classList.add("active");
    const dbSectionGala = document.getElementById("db-section-gala");
    if (dbSectionGala) dbSectionGala.classList.add("active");
  }
}

function updateMetrics(users) {
  const total = users.length;
  const active = users.filter(u => u.activo === true).length;
  
  if (metricTotalDancers) metricTotalDancers.textContent = total;
  if (metricActiveDancers) metricActiveDancers.textContent = active;
}

function renderUsersTable(users) {
  if (!usersTableBody) return;
  usersTableBody.innerHTML = "";

  if (users.length === 0) {
    usersTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center;">No hay miembros que coincidan con los filtros.</td></tr>`;
    return;
  }

  users.forEach(user => {
    const tr = document.createElement("tr");

    // Formatear columna de compañía usando catálogo
    const companyObj = companiesCatalog.find(c => c.id === user.id_compania);
    const companyName = companyObj ? companyObj.nombre : user.id_compania;

    const activeBadge = user.activo 
      ? `<span class="badge badge-active">Activo</span>` 
      : `<span class="badge badge-inactive">Inactivo</span>`;
      
    const roleText = rolesCatalog[user.id_rol] || user.id_rol;

    const age = calculateAge(user.fechaNacimiento);
    const genderText = user.sexo === "Femenino" ? "Mujer" : (user.sexo === "Masculino" ? "Hombre" : "--");

    tr.innerHTML = `
      <td>
        <strong style="font-size: 15px;">${user.nombre}</strong>
        ${user.alias ? `<br><small style="color: var(--text-muted);">"${user.alias}"</small>` : ""}
      </td>
      <td>${companyName}</td>
      <td>
        <div>${age} años</div>
        <small style="color: var(--text-muted);">${genderText}</small>
      </td>
      <td>
        <div>${user.email}</div>
        <small style="color: var(--text-muted);">${user.celular}</small>
      </td>
      <td><span class="badge badge-role-bailarin">${roleText}</span></td>
      <td>${activeBadge}</td>
      <td>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-edit-user" data-uid="${user.uid}" style="padding: 6px 12px; font-size: 12px; border-radius: var(--radius-sm);">
            Editar
          </button>
          <button class="btn btn-primary btn-delete-user" data-uid="${user.uid}" style="padding: 6px 12px; font-size: 12px; border-radius: var(--radius-sm); background-color: var(--danger); box-shadow: none;">
            Eliminar
          </button>
        </div>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });

  // Agregar manejadores de eventos para Editar y Eliminar
  document.querySelectorAll(".btn-edit-user").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const uid = e.target.getAttribute("data-uid");
      enterEditMode(uid);
    });
  });

  document.querySelectorAll(".btn-delete-user").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const uid = e.target.getAttribute("data-uid");
      handleDeleteUser(uid);
    });
  });
}

// ====================================================
// CREATE (Crear) & UPDATE (Actualizar)
// ====================================================
async function handleFormSubmit(e) {
  e.preventDefault();
  
  const uid = regUidInput.value;
  const nombres = regNombresInput.value.trim();
  const paterno = regPaternoInput.value.trim();
  const materno = regMaternoInput.value.trim();
  const alias = regAliasInput.value.trim();
  const dob = regDobInput.value;
  const company = regCompanySelect.value;
  const email = regEmailInput.value.trim();
  const phone = regPhoneInput.value.trim();
  const role = regRoleSelect.value;
  const active = regStatusInput.checked;
  const sexo = regSexoSelect ? regSexoSelect.value : "";

  showLoading(true);

  // Estructura normalizada del documento
  const userData = {
    nombres: nombres,
    apellidoPaterno: paterno,
    apellidoMaterno: materno,
    nombre: `${nombres} ${paterno} ${materno}`.trim(),
    alias: alias,
    fechaNacimiento: dob,
    sexo: sexo,
    email: email,
    celular: phone,
    id_compania: company,
    id_rol: role,
    activo: active
  };

  if (uid) {
    // ---- UPDATE (Actualizar) ----
    if (uid === currentUserProfile.uid && !active) {
      showLoading(false);
      showAlert("No puedes desactivar tu propia cuenta.");
      return;
    }

    if (isDemoMode) {
      // Simulación de actualización
      setTimeout(() => {
        const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
        const idx = demoUsers.findIndex(u => u.uid === uid);
        if (idx !== -1) {
          demoUsers[idx] = { ...demoUsers[idx], ...userData };
          localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));
          
          resetFormState();
          currentUsersData = demoUsers;
          filterAndRender();
          
          showLoading(false);
          showAlert("Miembro actualizado con éxito (Demo).", "success");
        }
      }, 500);
    } else {
      // Real en Firestore
      try {
        const userRef = doc(db, "usuarios", uid);
        await updateDoc(userRef, userData);
        
        resetFormState();
        showLoading(false);
        showAlert("Miembro actualizado correctamente en Firestore.", "success");
      } catch (error) {
        showLoading(false);
        console.error("Error al actualizar usuario en Firestore:", error);
        showAlert("Error al actualizar: " + error.message);
      }
    }
  } else {
    // ---- CREATE (Crear) ----
    if (isDemoMode) {
      // Simulación de creación
      setTimeout(() => {
        const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
        
        if (demoUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
          showLoading(false);
          showAlert("Ya existe un miembro registrado con ese correo.");
          return;
        }

        const newUid = "demo-uid-" + Math.random().toString(36).substr(2, 9);
        const newUser = { 
          uid: newUid, 
          ...userData, 
          requiereCambioPassword: true, 
          creadoEn: new Date().toISOString() 
        };
        
        demoUsers.push(newUser);
        localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));
        
        resetFormState();
        currentUsersData = demoUsers;
        filterAndRender();
        
        showLoading(false);
        showAlert("Miembro registrado con contraseña temporal 'teocalli2026' (Demo).", "success");
      }, 500);
    } else {
      // Real en Firestore / Firebase Auth
      try {
        const usersRef = collection(db, "usuarios");
        
        // Comprobar correo único en Firestore
        const q = query(usersRef, where("email", "==", email));
        const qSnap = await getDocs(q);
        if (!qSnap.empty) {
          showLoading(false);
          showAlert("Ya existe un miembro registrado con ese correo.");
          return;
        }

        // --- REGISTRAR EN FIREBASE AUTH CON APP SECUNDARIA ---
        const { initializeApp } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js");
        const { getAuth, createUserWithEmailAndPassword, signOut: secondarySignOut } = await import("https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js");
        
        // Inicializar app secundaria temporal con nombre único para evitar colisiones
        const appName = "secondary-auth-" + Math.random().toString(36).substr(2, 9);
        const secondaryApp = initializeApp(firebaseConfig, appName);
        const secondaryAuth = getAuth(secondaryApp);
        
        // Crear usuario en Authentication con contraseña temporal teocalli2026
        const authResult = await createUserWithEmailAndPassword(secondaryAuth, email, "teocalli2026");
        const newUid = authResult.user.uid;
        
        // Cerrar sesión en la app secundaria de inmediato para no alterar sesión del administrador
        await secondarySignOut(secondaryAuth);

        // Estructura del perfil Firestore
        const newUserDoc = { 
          ...userData, 
          uid: newUid,
          requiereCambioPassword: true, // Forzar cambio de contraseña en primer login
          creadoEn: serverTimestamp() 
        };
        
        // Guardar perfil en la base de datos con ID igual al UID creado
        await setDoc(doc(db, "usuarios", newUid), newUserDoc);

        resetFormState();
        showLoading(false);
        showAlert("Miembro registrado exitosamente. Contraseña temporal: 'teocalli2026'.", "success");
      } catch (error) {
        showLoading(false);
        console.error("Error al registrar en Firebase Auth/Firestore:", error);
        showAlert("Error al registrar en Firebase: " + error.message);
      }
    }
  }
}

// Entrar en modo edición al hacer click en Editar
async function enterEditMode(uid) {
  showLoading(true);
  
  let user = null;
  
  if (isDemoMode) {
    const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
    user = demoUsers.find(u => u.uid === uid);
  } else {
    try {
      const userRef = doc(db, "usuarios", uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        user = { uid, ...userDoc.data() };
      }
    } catch (e) {
      console.error("Error al obtener miembro:", e);
      showAlert("No se pudo cargar el perfil para edición.");
    }
  }

  if (user) {
    // Llenar campos del formulario
    if (regUidInput) regUidInput.value = user.uid;
    if (regNombresInput) regNombresInput.value = user.nombres || "";
    if (regPaternoInput) regPaternoInput.value = user.apellidoPaterno || "";
    if (regMaternoInput) regMaternoInput.value = user.apellidoMaterno || "";
    if (regAliasInput) regAliasInput.value = user.alias || "";
    if (regDobInput) regDobInput.value = user.fechaNacimiento || "";
    if (regSexoSelect) regSexoSelect.value = user.sexo || "";
    if (regCompanySelect) regCompanySelect.value = user.id_compania;
    if (regEmailInput) regEmailInput.value = user.email;
    if (regPhoneInput) regPhoneInput.value = user.celular;
    if (regRoleSelect) regRoleSelect.value = user.id_rol;
    if (regStatusInput) regStatusInput.checked = user.activo;

    // Cambiar textos y botones del formulario
    if (formActionTitle) formActionTitle.textContent = "Editar Miembro";
    if (btnRegisterSubmit) btnRegisterSubmit.textContent = "Guardar Cambios";
    if (btnCancelEdit) btnCancelEdit.style.display = "inline-block";
    
    // Cambiar automáticamente a la pestaña del formulario para visualización
    switchToTab("form");
  }
  
  showLoading(false);
}

// Resetear formulario a modo de creación
function resetFormState() {
  if (newUserForm) newUserForm.reset();
  if (regUidInput) regUidInput.value = "";
  if (regNombresInput) regNombresInput.value = "";
  if (regPaternoInput) regPaternoInput.value = "";
  if (regMaternoInput) regMaternoInput.value = "";
  if (regSexoSelect) regSexoSelect.value = "";
  if (regStatusInput) regStatusInput.checked = true;
  if (formActionTitle) formActionTitle.textContent = "Registrar Nuevo Miembro";
  if (btnRegisterSubmit) btnRegisterSubmit.textContent = "Registrar Usuario";
  if (btnCancelEdit) btnCancelEdit.style.display = "none";
  
  // Cambiar automáticamente a la pestaña del listado al terminar la acción
  switchToTab("list");
}

// ====================================================
// DELETE (Eliminar)
// ====================================================
async function handleDeleteUser(uid) {
  if (uid === currentUserProfile.uid) {
    showAlert("No puedes eliminar tu propio perfil de administrador.");
    return;
  }

  const confirmDelete = confirm("¿Estás seguro de que deseas eliminar permanentemente a este miembro de la compañía?");
  if (!confirmDelete) return;

  showLoading(true);

  if (isDemoMode) {
    setTimeout(() => {
      const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
      const filtered = demoUsers.filter(u => u.uid !== uid);
      localStorage.setItem("teocalli_demo_users", JSON.stringify(filtered));
      
      if (regUidInput && regUidInput.value === uid) resetFormState();
      
      currentUsersData = filtered;
      filterAndRender();
      
      showLoading(false);
      showAlert("Miembro eliminado de la simulación.", "success");
    }, 400);
  } else {
    try {
      const userRef = doc(db, "usuarios", uid);
      await deleteDoc(userRef);
      
      if (regUidInput && regUidInput.value === uid) resetFormState();
      
      showLoading(false);
      showAlert("Miembro eliminado exitosamente de Firestore.", "success");
    } catch (error) {
      showLoading(false);
      console.error("Error al eliminar usuario de Firestore:", error);
      showAlert("No tienes permisos suficientes en Firestore para eliminar este miembro.");
    }
  }
}

// ====================================================
// MÓDULO DE AGENDA (Ensayos, Presentaciones, Talleres)
// ====================================================
let currentCalendarDate = new Date();
let agendaEvents = [];
let selectedEvent = null;

// Elementos de la Agenda
const calendarDaysContainer = document.getElementById("calendar-days-container");
const calendarCurrentMonth = document.getElementById("calendar-current-month");
const agendaModal = document.getElementById("agenda-modal");
const agendaModalTitle = document.getElementById("agenda-modal-title");
const agendaEventForm = document.getElementById("agenda-event-form");
const eventDancersCheckboxes = document.getElementById("event-dancers-checkboxes");
const eventDetailPanel = document.getElementById("event-detail-panel");
const eventDetailType = document.getElementById("event-detail-type");
const eventDetailTitle = document.getElementById("event-detail-title");
const eventDetailBody = document.getElementById("event-detail-body");

function setupAgendaModule() {
  const calendarPrevMonth = document.getElementById("calendar-prev-month");
  const calendarNextMonth = document.getElementById("calendar-next-month");
  const btnOpenEventModal = document.getElementById("btn-open-event-modal");
  const btnCloseAgendaModal = document.getElementById("btn-close-agenda-modal");
  const eventTypeSelect = document.getElementById("event-type-select");
  const btnEditEvent = document.getElementById("btn-edit-event");
  const btnDeleteEvent = document.getElementById("btn-delete-event");
  
  if (navDbAgenda) {
    navDbAgenda.addEventListener("click", (e) => {
      e.preventDefault();
      switchDbSection("agenda");
      closeSidebarOnMobile();
      renderCalendar();
    });
  }

  if (calendarPrevMonth) {
    calendarPrevMonth.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (calendarNextMonth) {
    calendarNextMonth.addEventListener("click", () => {
      currentCalendarDate.setMonth(currentCalendarDate.getMonth() + 1);
      renderCalendar();
    });
  }

  if (btnOpenEventModal) {
    btnOpenEventModal.addEventListener("click", () => {
      openAgendaFormModal();
    });
  }

  if (btnCloseAgendaModal && agendaModal) {
    btnCloseAgendaModal.addEventListener("click", () => {
      agendaModal.style.display = "none";
    });
  }

  if (eventTypeSelect) {
    eventTypeSelect.addEventListener("change", triggerFormFieldsVisibility);
  }

  const eventIsRecurring = document.getElementById("event-is-recurring");
  if (eventIsRecurring) {
    eventIsRecurring.addEventListener("change", handleRecurrenceCheckboxToggle);
  }

  if (btnEditEvent) {
    btnEditEvent.addEventListener("click", () => {
      if (selectedEvent) {
        openAgendaFormModal("", selectedEvent);
      }
    });
  }

  if (btnDeleteEvent) {
    btnDeleteEvent.addEventListener("click", handleDeleteEvent);
  }

  if (agendaEventForm) {
    agendaEventForm.addEventListener("submit", handleAgendaFormSubmit);
  }

  // Mostrar botón de crear evento solo si es administrador
  if (currentUserProfile && (currentUserProfile.id_rol === "super_admin" || currentUserProfile.id_rol === "admin")) {
    if (btnOpenEventModal) btnOpenEventModal.style.display = "inline-block";
  }

  // Carga inicial y escucha en tiempo real
  if (isDemoMode) {
    const storedAgenda = localStorage.getItem("teocalli_demo_agenda");
    if (!storedAgenda) {
      const todayStr = new Date().toISOString().split("T")[0];
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      
      const defaultEvents = [
        {
          id: "demo-event-1",
          tipo: "ensayo",
          titulo: "Ensayo General de Compañía",
          fecha: todayStr,
          hora: "19:30",
          id_compania: "1ra-compania",
          creadoPor: "demo-admin",
          creadoEn: new Date().toISOString()
        },
        {
          id: "demo-event-2",
          tipo: "presentacion",
          titulo: "Presentación Teatro Degollado",
          fecha: tomorrowStr,
          hora: "20:00",
          ubicacion: "Teatro Degollado, Guadalajara Centro",
          descripcion: "Presentación especial de Fandango y Danza de los Viejitos.",
          invitados: [currentUserProfile.uid],
          creadoPor: "demo-admin",
          creadoEn: new Date().toISOString()
        },
        {
          id: "demo-event-3",
          tipo: "taller",
          titulo: "Taller de Zapateado Veracruzano",
          fecha: tomorrowStr,
          hora: "10:00",
          ubicacion: "Salón Principal Teocalli",
          descripcion: "Taller técnico de perfeccionamiento de zapateado veracruzano.",
          costo: 150,
          id_compania: "todos",
          creadoPor: "demo-admin",
          creadoEn: new Date().toISOString()
        }
      ];
      localStorage.setItem("teocalli_demo_agenda", JSON.stringify(defaultEvents));
      agendaEvents = defaultEvents;
    } else {
      agendaEvents = JSON.parse(storedAgenda);
    }
    renderCalendar();
    updateReminders();
  } else {
    // Sincronizar en tiempo real desde Firestore
    const q = collection(db, "agenda");
    onSnapshot(q, (snapshot) => {
      agendaEvents = [];
      snapshot.forEach(doc => {
        agendaEvents.push({ id: doc.id, ...doc.data() });
      });
      renderCalendar();
      updateReminders();
    }, (err) => {
      console.error("Error al cargar la agenda de Firestore:", err);
      showAlert("Error de permisos en Firestore al sincronizar la agenda.");
    });
  }
}

function shouldUserSeeEvent(event) {
  if (!currentUserProfile) return false;
  
  const role = currentUserProfile.id_rol;
  if (role === "super_admin" || role === "admin") return true;
  
  if (event.tipo === "ensayo" || event.tipo === "taller") {
    return event.id_compania === "todos" || event.id_compania === currentUserProfile.id_compania;
  }
  
  if (event.tipo === "presentacion") {
    return Array.isArray(event.invitados) && event.invitados.includes(currentUserProfile.uid);
  }
  
  return false;
}

function renderCalendar() {
  if (!calendarDaysContainer || !calendarCurrentMonth) return;
  
  calendarDaysContainer.innerHTML = "";
  
  const year = currentCalendarDate.getFullYear();
  const month = currentCalendarDate.getMonth();
  
  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  calendarCurrentMonth.textContent = `${monthNames[month]} ${year}`;
  
  const firstDayIndex = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();
  const prevLastDay = new Date(year, month, 0).getDate();
  
  // Días del mes anterior
  for (let i = firstDayIndex; i > 0; i--) {
    const dayNum = prevLastDay - i + 1;
    const cell = createCalendarCell(year, month - 1, dayNum, true);
    calendarDaysContainer.appendChild(cell);
  }
  
  // Días del mes actual
  const today = new Date();
  for (let i = 1; i <= lastDay; i++) {
    const isToday = today.getDate() === i && today.getMonth() === month && today.getFullYear() === year;
    const cell = createCalendarCell(year, month, i, false, isToday);
    calendarDaysContainer.appendChild(cell);
  }
  
  // Días del mes siguiente
  const totalCells = firstDayIndex + lastDay;
  const remainingCells = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remainingCells; i++) {
    const cell = createCalendarCell(year, month + 1, i, true);
    calendarDaysContainer.appendChild(cell);
  }
}

function createCalendarCell(year, month, day, isOtherMonth, isToday = false) {
  const cellDate = new Date(year, month, day);
  const dateString = cellDate.toISOString().split("T")[0];
  
  const cell = document.createElement("div");
  cell.className = `calendar-day-cell${isOtherMonth ? " other-month" : ""}${isToday ? " today" : ""}`;
  cell.dataset.date = dateString;
  
  cell.innerHTML = `
    <div class="calendar-day-num">${day}</div>
    <div class="calendar-day-events"></div>
  `;
  
  const dayEvents = agendaEvents.filter(event => event.fecha === dateString && shouldUserSeeEvent(event));
  const eventsContainer = cell.querySelector(".calendar-day-events");
  
  dayEvents.forEach(event => {
    const dot = document.createElement("div");
    dot.className = `calendar-event-dot event-${event.tipo}`;
    dot.textContent = event.titulo;
    dot.title = `${event.titulo} (${event.hora})`;
    dot.dataset.eventId = event.id;
    
    dot.addEventListener("click", (e) => {
      e.stopPropagation();
      showEventDetails(event);
    });
    
    eventsContainer.appendChild(dot);
  });
  
  cell.addEventListener("click", () => {
    if (dayEvents.length > 0) {
      showEventDetails(dayEvents[0]);
    } else {
      if (currentUserProfile && (currentUserProfile.id_rol === "super_admin" || currentUserProfile.id_rol === "admin")) {
        openAgendaFormModal(dateString);
      }
    }
  });
  
  return cell;
}

function showEventDetails(event) {
  selectedEvent = event;
  
  if (!eventDetailPanel || !eventDetailType || !eventDetailTitle || !eventDetailBody) return;
  
  eventDetailType.style.display = "inline-block";
  eventDetailType.textContent = event.tipo;
  eventDetailType.className = `event-detail-badge event-${event.tipo}`;
  
  eventDetailTitle.textContent = event.titulo;
  
  const dateObj = new Date(event.fecha + "T00:00:00");
  const formattedDate = dateObj.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  
  let bodyHtml = `
    <div class="event-detail-item">
      <span class="event-detail-label">🕒 Hora:</span>
      <span class="event-detail-value">${event.hora}</span>
    </div>
    <div class="event-detail-item">
      <span class="event-detail-label">📅 Fecha:</span>
      <span class="event-detail-value">${formattedDate}</span>
    </div>
  `;
  
  if (event.tipo === "ensayo" || event.tipo === "taller") {
    const companyName = event.id_compania === "todos" ? "Todas las Compañías" : (companiesCatalog.find(c => c.id === event.id_compania)?.nombre || event.id_compania);
    bodyHtml += `
      <div class="event-detail-item">
        <span class="event-detail-label">👥 Compañía:</span>
        <span class="event-detail-value">${companyName}</span>
      </div>
    `;
  }
  
  if (event.tipo === "presentacion" || event.tipo === "taller") {
    bodyHtml += `
      <div class="event-detail-item">
        <span class="event-detail-label">📍 Ubicación:</span>
        <span class="event-detail-value">${event.ubicacion || "No especificada"}</span>
      </div>
      <div class="event-detail-item" style="flex-direction: column; gap: 4px;">
        <span class="event-detail-label">📝 Descripción:</span>
        <span class="event-detail-value" style="white-space: pre-wrap;">${event.descripcion || "Sin descripción."}</span>
      </div>
    `;
  }
  
  if (event.tipo === "taller") {
    const costText = event.costo > 0 ? `$${event.costo} MXN` : "Gratuito / Incluido";
    bodyHtml += `
      <div class="event-detail-item">
        <span class="event-detail-label">💰 Costo:</span>
        <span class="event-detail-value" style="font-weight: bold; color: var(--primary);">${costText}</span>
      </div>
    `;
  }
  
  if (event.tipo === "presentacion") {
    let invitedDancersText = "Nadie convocado.";
    if (Array.isArray(event.invitados) && event.invitados.length > 0) {
      const names = event.invitados.map(uid => {
        const userObj = currentUsersData.find(u => u.uid === uid);
        return userObj ? userObj.nombre : "Bailarín";
      });
      invitedDancersText = names.join(", ");
    }
    bodyHtml += `
      <div class="event-detail-item" style="flex-direction: column; gap: 4px;">
        <span class="event-detail-label">💃 Convocados:</span>
        <span class="event-detail-value">${invitedDancersText}</span>
      </div>
    `;
  }
  
  eventDetailBody.innerHTML = bodyHtml;
  
  const eventAdminActions = document.getElementById("event-admin-actions");
  if (eventAdminActions) {
    if (currentUserProfile && (currentUserProfile.id_rol === "super_admin" || currentUserProfile.id_rol === "admin")) {
      eventAdminActions.style.display = "flex";
    } else {
      eventAdminActions.style.display = "none";
    }
  }
}

function populateDancersCheckboxes() {
  if (!eventDancersCheckboxes) return;
  eventDancersCheckboxes.innerHTML = "";
  
  const dancers = currentUsersData.filter(u => u.id_rol === "bailarin" && u.activo === true);
  
  if (dancers.length === 0) {
    eventDancersCheckboxes.innerHTML = `<p style="color: var(--text-muted); font-size: 12px; margin: 0;">No hay bailarines activos registrados.</p>`;
    return;
  }
  
  dancers.forEach(dancer => {
    const label = document.createElement("label");
    label.className = "checkbox-item";
    label.innerHTML = `
      <input type="checkbox" name="invited-dancer" value="${dancer.uid}">
      <span>${dancer.nombre} (${companiesCatalog.find(c => c.id === dancer.id_compania)?.nombre || dancer.id_compania})</span>
    `;
    eventDancersCheckboxes.appendChild(label);
  });
}

function handleRecurrenceCheckboxToggle() {
  const eventIsRecurring = document.getElementById("event-is-recurring");
  const recurrenceFields = document.getElementById("event-recurrence-fields");
  const dateSingleGroup = document.getElementById("event-date-single-group");
  const dateInput = document.getElementById("event-date-input");
  const startDateInput = document.getElementById("event-start-date");
  const endDateInput = document.getElementById("event-end-date");
  
  const isRecurring = eventIsRecurring && eventIsRecurring.checked;
  
  if (isRecurring) {
    if (recurrenceFields) recurrenceFields.style.display = "block";
    if (dateSingleGroup) dateSingleGroup.style.display = "none";
    if (dateInput) dateInput.removeAttribute("required");
    if (startDateInput) startDateInput.setAttribute("required", "true");
    if (endDateInput) endDateInput.setAttribute("required", "true");
  } else {
    if (recurrenceFields) recurrenceFields.style.display = "none";
    if (dateSingleGroup) dateSingleGroup.style.display = "block";
    if (dateInput) dateInput.setAttribute("required", "true");
    if (startDateInput) startDateInput.removeAttribute("required");
    if (endDateInput) endDateInput.removeAttribute("required");
  }
}

function openAgendaFormModal(dateString = "", eventToEdit = null) {
  if (!agendaModal || !agendaModalTitle || !agendaEventForm) return;
  
  agendaEventForm.reset();
  
  // Limpiar checkboxes de recurrencia y bailarines convocados
  document.querySelectorAll('input[name="recurrence-days"]').forEach(cb => cb.checked = false);
  const eventIsRecurring = document.getElementById("event-is-recurring");
  if (eventIsRecurring) eventIsRecurring.checked = false;
  
  const eventIdInput = document.getElementById("event-id");
  const eventTypeSelect = document.getElementById("event-type-select");
  const eventTitleInput = document.getElementById("event-title-input");
  const eventDateInput = document.getElementById("event-date-input");
  const eventTimeInput = document.getElementById("event-time-input");
  const eventCompanySelect = document.getElementById("event-company-select");
  const eventLocationInput = document.getElementById("event-location-input");
  const eventDescInput = document.getElementById("event-desc-input");
  const eventCostInput = document.getElementById("event-cost-input");
  
  populateDancersCheckboxes();
  
  if (eventToEdit) {
    agendaModalTitle.textContent = "Editar Evento";
    if (eventIdInput) eventIdInput.value = eventToEdit.id;
    if (eventTypeSelect) eventTypeSelect.value = eventToEdit.tipo;
    if (eventTitleInput) eventTitleInput.value = eventToEdit.titulo;
    if (eventDateInput) eventDateInput.value = eventToEdit.fecha;
    if (eventTimeInput) eventTimeInput.value = eventToEdit.hora;
    
    if (eventToEdit.tipo === "ensayo" || eventToEdit.tipo === "taller") {
      if (eventCompanySelect) eventCompanySelect.value = eventToEdit.id_compania || "todos";
    }
    
    if (eventToEdit.tipo === "presentacion" || eventToEdit.tipo === "taller") {
      if (eventLocationInput) eventLocationInput.value = eventToEdit.ubicacion || "";
      if (eventDescInput) eventDescInput.value = eventToEdit.descripcion || "";
    }
    
    if (eventToEdit.tipo === "taller") {
      if (eventCostInput) eventCostInput.value = eventToEdit.costo || 0;
    }
    
    if (eventToEdit.tipo === "presentacion" && Array.isArray(eventToEdit.invitados)) {
      eventToEdit.invitados.forEach(uid => {
        const cb = document.querySelector(`input[name="invited-dancer"][value="${uid}"]`);
        if (cb) cb.checked = true;
      });
    }
    
    // Ocultar opción de recurrencia en edición de evento individual
    const groupRecurrence = document.getElementById("event-group-recurrence");
    if (groupRecurrence) groupRecurrence.style.display = "none";
  } else {
    agendaModalTitle.textContent = "Crear Evento";
    if (eventIdInput) eventIdInput.value = "";
    if (eventDateInput && dateString) eventDateInput.value = dateString;
    
    const groupRecurrence = document.getElementById("event-group-recurrence");
    if (groupRecurrence && eventTypeSelect.value === "ensayo") {
      groupRecurrence.style.display = "block";
    }
  }
  
  handleRecurrenceCheckboxToggle();
  triggerFormFieldsVisibility();
  agendaModal.style.display = "flex";
}

function triggerFormFieldsVisibility() {
  const type = document.getElementById("event-type-select").value;
  
  const groupCompany = document.getElementById("event-group-company");
  const groupDetails = document.getElementById("event-group-details");
  const groupCost = document.getElementById("event-group-cost");
  const groupDancers = document.getElementById("event-group-dancers");
  const groupRecurrence = document.getElementById("event-group-recurrence");
  const eventIsRecurring = document.getElementById("event-is-recurring");
  const eventIdInput = document.getElementById("event-id");
  
  if (type === "ensayo") {
    if (groupCompany) groupCompany.style.display = "block";
    if (groupDetails) groupDetails.style.display = "none";
    if (groupCost) groupCost.style.display = "none";
    if (groupDancers) groupDancers.style.display = "none";
    // Solo permitir recurrencia al crear un nuevo ensayo, no al editar uno existente
    if (groupRecurrence) {
      groupRecurrence.style.display = (!eventIdInput || !eventIdInput.value) ? "block" : "none";
    }
  } else {
    if (groupCompany) groupCompany.style.display = (type === "taller" ? "block" : "none");
    if (groupDetails) groupDetails.style.display = "block";
    if (groupCost) groupCost.style.display = (type === "taller" ? "block" : "none");
    if (groupDancers) groupDancers.style.display = (type === "presentacion" ? "block" : "none");
    
    if (groupRecurrence) groupRecurrence.style.display = "none";
    if (eventIsRecurring) {
      eventIsRecurring.checked = false;
      handleRecurrenceCheckboxToggle();
    }
  }
}

async function handleAgendaFormSubmit(e) {
  e.preventDefault();
  
  const eventIdInput = document.getElementById("event-id");
  const eventTypeSelect = document.getElementById("event-type-select");
  const eventTitleInput = document.getElementById("event-title-input");
  const eventDateInput = document.getElementById("event-date-input");
  const eventTimeInput = document.getElementById("event-time-input");
  const eventCompanySelect = document.getElementById("event-company-select");
  const eventLocationInput = document.getElementById("event-location-input");
  const eventDescInput = document.getElementById("event-desc-input");
  const eventCostInput = document.getElementById("event-cost-input");
  
  const eventIsRecurring = document.getElementById("event-is-recurring");
  const id = eventIdInput ? eventIdInput.value : "";
  const tipo = eventTypeSelect.value;
  const titulo = eventTitleInput.value.trim();
  const hora = eventTimeInput.value;
  
  const isRecurring = eventIsRecurring && eventIsRecurring.checked && tipo === "ensayo" && !id;
  
  showLoading(true);
  
  const eventData = {
    tipo,
    titulo,
    hora,
    creadoPor: currentUserProfile.uid,
    creadoEn: isDemoMode ? new Date().toISOString() : serverTimestamp()
  };
  
  if (tipo === "ensayo" || tipo === "taller") {
    eventData.id_compania = eventCompanySelect.value;
  }
  
  if (tipo === "presentacion" || tipo === "taller") {
    eventData.ubicacion = eventLocationInput.value.trim();
    eventData.descripcion = eventDescInput.value.trim();
  }
  
  if (tipo === "taller") {
    eventData.costo = Number(eventCostInput.value) || 0;
  }
  
  if (tipo === "presentacion") {
    const checkboxes = document.querySelectorAll('input[name="invited-dancer"]:checked');
    eventData.invitados = Array.from(checkboxes).map(cb => cb.value);
  }
  
  if (isRecurring) {
    const startDateVal = document.getElementById("event-start-date").value;
    const endDateVal = document.getElementById("event-end-date").value;
    
    if (!startDateVal || !endDateVal) {
      showLoading(false);
      showAlert("Por favor selecciona las fechas de inicio y fin para la recurrencia.");
      return;
    }
    
    const start = new Date(startDateVal + "T00:00:00");
    const end = new Date(endDateVal + "T00:00:00");
    
    if (start > end) {
      showLoading(false);
      showAlert("La fecha de inicio no puede ser posterior a la fecha de fin.");
      return;
    }
    
    const checkedDays = Array.from(document.querySelectorAll('input[name="recurrence-days"]:checked')).map(cb => Number(cb.value));
    
    const datesToCreate = [];
    let current = new Date(start);
    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (checkedDays.length === 0 || checkedDays.includes(dayOfWeek)) {
        datesToCreate.push(current.toISOString().split("T")[0]);
      }
      current.setDate(current.getDate() + 1);
    }
    
    if (datesToCreate.length === 0) {
      showLoading(false);
      showAlert("Ningún día de la semana seleccionado coincide con el rango de fechas programado.");
      return;
    }
    
    if (isDemoMode) {
      setTimeout(() => {
        let demoAgenda = JSON.parse(localStorage.getItem("teocalli_demo_agenda") || "[]");
        datesToCreate.forEach(dateStr => {
          const newId = "demo-event-" + Math.random().toString(36).substr(2, 9);
          demoAgenda.push({ id: newId, ...eventData, fecha: dateStr });
        });
        localStorage.setItem("teocalli_demo_agenda", JSON.stringify(demoAgenda));
        agendaEvents = demoAgenda;
        
        if (agendaModal) agendaModal.style.display = "none";
        renderCalendar();
        updateReminders();
        showLoading(false);
        showAlert(`Se registraron ${datesToCreate.length} ensayos recurrentes con éxito.`, "success");
      }, 500);
    } else {
      try {
        const promises = datesToCreate.map(dateStr => {
          return addDoc(collection(db, "agenda"), { ...eventData, fecha: dateStr });
        });
        await Promise.all(promises);
        
        if (agendaModal) agendaModal.style.display = "none";
        showLoading(false);
        showAlert(`Se registraron ${datesToCreate.length} ensayos recurrentes con éxito.`, "success");
      } catch (error) {
        showLoading(false);
        console.error("Error al guardar ensayos recurrentes:", error);
        showAlert("Error al guardar ensayos recurrentes: " + error.message);
      }
    }
  } else {
    // Evento único o edición
    const fecha = eventDateInput.value;
    if (!fecha) {
      showLoading(false);
      showAlert("Por favor selecciona una fecha para el evento.");
      return;
    }
    eventData.fecha = fecha;
    
    if (isDemoMode) {
      setTimeout(() => {
        let demoAgenda = JSON.parse(localStorage.getItem("teocalli_demo_agenda") || "[]");
        
        if (id) {
          const idx = demoAgenda.findIndex(evt => evt.id === id);
          if (idx !== -1) {
            demoAgenda[idx] = { id, ...eventData };
            showAlert("Evento actualizado con éxito.", "success");
          }
        } else {
          const newId = "demo-event-" + Math.random().toString(36).substr(2, 9);
          demoAgenda.push({ id: newId, ...eventData });
          showAlert("Evento registrado con éxito.", "success");
        }
        
        localStorage.setItem("teocalli_demo_agenda", JSON.stringify(demoAgenda));
        agendaEvents = demoAgenda;
        
        if (agendaModal) agendaModal.style.display = "none";
        renderCalendar();
        updateReminders();
        showLoading(false);
      }, 500);
    } else {
      try {
        if (id) {
          await updateDoc(doc(db, "agenda", id), eventData);
          showAlert("Evento actualizado con éxito.", "success");
        } else {
          await addDoc(collection(db, "agenda"), eventData);
          showAlert("Evento registrado con éxito.", "success");
        }
        
        if (agendaModal) agendaModal.style.display = "none";
        showLoading(false);
      } catch (error) {
        showLoading(false);
        console.error("Error al guardar evento:", error);
        showAlert("Error al guardar evento: " + error.message);
      }
    }
  }
}

async function handleDeleteEvent() {
  if (!selectedEvent) return;
  
  const confirmDelete = confirm("¿Estás seguro de que deseas eliminar este evento de la agenda?");
  if (!confirmDelete) return;
  
  showLoading(true);
  
  if (isDemoMode) {
    setTimeout(() => {
      let demoAgenda = JSON.parse(localStorage.getItem("teocalli_demo_agenda") || "[]");
      demoAgenda = demoAgenda.filter(evt => evt.id !== selectedEvent.id);
      localStorage.setItem("teocalli_demo_agenda", JSON.stringify(demoAgenda));
      
      agendaEvents = demoAgenda;
      selectedEvent = null;
      
      if (eventDetailTitle && eventDetailBody && eventDetailType) {
        eventDetailTitle.textContent = "Selecciona un evento";
        eventDetailBody.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">Haz clic en cualquier evento o día con puntitos de color en el calendario para ver los detalles.</p>`;
        eventDetailType.style.display = "none";
      }
      
      const eventAdminActions = document.getElementById("event-admin-actions");
      if (eventAdminActions) eventAdminActions.style.display = "none";
      
      renderCalendar();
      updateReminders();
      showLoading(false);
      showAlert("Evento eliminado con éxito.", "success");
    }, 400);
  } else {
    try {
      await deleteDoc(doc(db, "agenda", selectedEvent.id));
      selectedEvent = null;
      
      if (eventDetailTitle && eventDetailBody && eventDetailType) {
        eventDetailTitle.textContent = "Selecciona un evento";
        eventDetailBody.innerHTML = `<p style="color: var(--text-muted); font-size: 14px;">Haz clic en cualquier evento o día con puntitos de color en el calendario para ver los detalles.</p>`;
        eventDetailType.style.display = "none";
      }
      
      const eventAdminActions = document.getElementById("event-admin-actions");
      if (eventAdminActions) eventAdminActions.style.display = "none";
      
      showLoading(false);
      showAlert("Evento eliminado con éxito.", "success");
    } catch (error) {
      showLoading(false);
      console.error("Error al borrar evento:", error);
      showAlert("No tienes permisos suficientes en Firestore para borrar este evento.");
    }
  }
}

function updateReminders() {
  const generalRemindersList = document.getElementById("general-reminders-list");
  if (!generalRemindersList) return;
  
  generalRemindersList.innerHTML = "";
  
  const todayStr = new Date().toISOString().split("T")[0];
  
  const visibleEvents = agendaEvents
    .filter(shouldUserSeeEvent)
    .sort((a, b) => {
      if (a.fecha !== b.fecha) return a.fecha.localeCompare(b.fecha);
      return a.hora.localeCompare(b.hora);
    });
    
  const todayEvents = visibleEvents.filter(e => e.fecha === todayStr);
  
  const next7Days = [];
  const todayObj = new Date();
  for (let i = 1; i <= 7; i++) {
    const d = new Date(); d.setDate(todayObj.getDate() + i);
    next7Days.push(d.toISOString().split("T")[0]);
  }
  const upcomingEvents = visibleEvents.filter(e => next7Days.includes(e.fecha));
  
  let html = "";
  
  if (todayEvents.length === 0 && upcomingEvents.length === 0) {
    generalRemindersList.innerHTML = `<p style="color: var(--text-muted); font-size: 14px; margin: 0;">No tienes eventos programados para hoy ni en los próximos días.</p>`;
    return;
  }
  
  if (todayEvents.length > 0) {
    html += `<div style="font-weight: 700; font-size: 13px; color: var(--primary); text-transform: uppercase; margin-bottom: 8px;">📅 Hoy:</div>`;
    todayEvents.forEach(e => {
      html += createReminderItemHtml(e);
    });
  }
  
  if (upcomingEvents.length > 0) {
    html += `<div style="font-weight: 700; font-size: 13px; color: #6f42c1; text-transform: uppercase; margin-top: 15px; margin-bottom: 8px;">🗓️ Próximos días:</div>`;
    upcomingEvents.forEach(e => {
      html += createReminderItemHtml(e);
    });
  }
  
  generalRemindersList.innerHTML = html;
}

function createReminderItemHtml(event) {
  let colorLabel = "var(--primary)";
  if (event.tipo === "presentacion") colorLabel = "#6f42c1";
  if (event.tipo === "taller") colorLabel = "#fd7e14";
  
  const dateObj = new Date(event.fecha + "T00:00:00");
  const dateText = dateObj.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
  
  let extra = "";
  if (event.tipo === "presentacion" || event.tipo === "taller") {
    extra = ` - <em>${event.ubicacion}</em>`;
  }
  
  return `
    <div style="background-color: var(--bg-site); border: 1px solid var(--border-color); border-left: 5px solid ${colorLabel}; padding: 12px; border-radius: var(--radius-sm); font-size: 14px; display: flex; justify-content: space-between; align-items: center; gap: 10px; margin-bottom: 8px;">
      <div>
        <span style="font-weight: 700; text-transform: uppercase; font-size: 10px; color: ${colorLabel}; display: block; margin-bottom: 2px;">${event.tipo}</span>
        <strong>${event.titulo}</strong>${extra}
      </div>
      <div style="text-align: right; flex-shrink: 0; font-size: 13px;">
        <span style="font-weight: 700; display: block; color: var(--text-main);">${dateText}</span>
        <small style="color: var(--text-muted);">${event.hora}</small>
      </div>
    </div>
  `;
}

// ====================================================
// MÓDULO GALA - MAPA INTERACTIVO Y GESTIÓN
// ====================================================
import { 
  collection, query, where, getDocs, setDoc, doc, updateDoc, onSnapshot 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

let unsubscribeGalaSeats = null;
let galaSeatsData = [];
let galaUsersCatalog = [];
let galaMapMatrix = null;

export async function setupGalaModule(profile) {
  const isAdmin = profile.id_rol === "super_admin" || profile.id_rol === "admin" || profile.rol === "super_admin";
  
  const btnSeed = document.getElementById("btn-seed-seats");
  const assignGroup = document.getElementById("gala-admin-assign-group");
  
  // Fetch Map Matrix
  try {
    const res = await fetch("assets/data/mapa.json");
    galaMapMatrix = await res.json();
  } catch(e) {
    console.error("No se pudo cargar el mapa.json", e);
  }
  
  // DOM setup depending on role
  if (isAdmin) {
    if (btnSeed) btnSeed.style.display = "block";
    if (assignGroup) assignGroup.style.display = "block";
    
    const wrapper = document.querySelector(".gala-map-wrapper");
    if(wrapper) wrapper.classList.add("admin-mode");
    
    // Cargar catálogo de usuarios
    if (typeof isDemoMode === "undefined" || !isDemoMode) {
      const q = query(collection(window.db, "usuarios"), where("activo", "==", true));
      const snap = await getDocs(q);
      const select = document.getElementById("gala-assign-select");
      if(select) {
          snap.forEach(d => {
            galaUsersCatalog.push({ uid: d.id, ...d.data() });
            const opt = document.createElement("option");
            opt.value = d.id;
            opt.textContent = `${d.data().nombres || d.data().nombre} ${d.data().apellidoPaterno || ""}`.trim();
            select.appendChild(opt);
          });
      }
    }
  }

  // Seeder (Solo Admin)
  if (btnSeed) {
    btnSeed.addEventListener("click", async () => {
      if(!galaMapMatrix) {
          alert("El mapa no ha cargado aún.");
          return;
      }
      if(!confirm("¿Seguro que deseas inicializar/borrar los asientos en base al archivo de Excel? Esto puede tardar unos minutos.")) return;
      
      const showLoading = typeof window.showLoading === "function" ? window.showLoading : () => {};
      showLoading(true);
      try {
        let total = 0;
        
        for (const [id, pos] of Object.entries(galaMapMatrix.seats)) {
          let sec = 1;
          const match = id.match(/^([A-Z]+)(\d+)$/);
          
          if (match) {
              const letters = match[1];
              const num = parseInt(match[2], 10);
              const isEven = num % 2 === 0;
              const isSingleLetter = letters.length === 1;
              const isDoubleLetter = letters.length === 2;
              
              if (letters === 'TT') {
                  sec = 4;
              } else if (num >= 100) {
                  if (isSingleLetter) {
                      sec = 3;
                  } else {
                      sec = 4;
                  }
              } else {
                  if (!isEven) {
                      sec = isSingleLetter ? 1 : 2;
                  } else {
                      sec = isSingleLetter ? 5 : 6;
                  }
              }
          }

          await setDoc(doc(window.db, "asientos_gala", id), {
            id_asiento: id,
            seccion: sec,
            fila: match ? match[1] : "-",
            numero: match ? parseInt(match[2], 10) : 0,
            coordenadas: { r: pos.r, c: pos.c },
            estado: "LIBRE",
            asignado_a: null,
            cliente_reserva: null
          });
          total++;
          if(total % 50 === 0) console.log(`Sembrados ${total} asientos...`);
        }
        alert(`¡${total} asientos inicializados con éxito desde el CSV!`);
      } catch(e) {
        console.error(e);
        alert("Error inicializando los asientos.");
      }
      showLoading(false);
    });
  }

  // Suscripción a los asientos
  if (typeof isDemoMode === "undefined" || !isDemoMode) {
    unsubscribeGalaSeats = onSnapshot(collection(window.db, "asientos_gala"), (snap) => {
      galaSeatsData = [];
      snap.forEach(d => galaSeatsData.push(d.data()));
      renderGalaMap(profile, isAdmin);
    });
  }
}

function renderGalaMap(profile, isAdmin) {
  const container = document.getElementById("gala-map-container");
  if (!container) return;
  
  container.innerHTML = "";
  
  let countTotal = 0, countLibres = 0, countRes = 0, countVen = 0;

  if (galaMapMatrix) {
    container.style.display = "grid";
    container.style.gridTemplateColumns = `repeat(${galaMapMatrix.max_col}, minmax(20px, 25px))`;
    container.style.gridTemplateRows = `repeat(${galaMapMatrix.max_row}, minmax(20px, 25px))`;
    container.style.gap = "6px";
    container.style.justifyContent = "center";
    container.style.padding = "20px";
    container.style.minWidth = "max-content";
  }

  const sorted = galaSeatsData;

  sorted.forEach(seat => {
    const isOwner = seat.asignado_a === profile.uid;
    
    if (isOwner) {
      countTotal++;
      if (seat.estado === "LIBRE") countLibres++;
      if (seat.estado === "RESERVADO") countRes++;
      if (seat.estado === "VENDIDO") countVen++;
    }

    if (!isAdmin && !isOwner) return;

    const div = document.createElement("div");
    div.className = `gala-seat seat-sec-${seat.seccion}`;
    
    if (seat.estado === "RESERVADO") div.classList.add("seat-reservado");
    if (seat.estado === "VENDIDO") div.classList.add("seat-vendido");

    if (seat.coordenadas) {
        div.style.gridRow = seat.coordenadas.r;
        div.style.gridColumn = seat.coordenadas.c;
    } else if (galaMapMatrix && galaMapMatrix.seats[seat.id_asiento]) {
        div.style.gridRow = galaMapMatrix.seats[seat.id_asiento].r;
        div.style.gridColumn = galaMapMatrix.seats[seat.id_asiento].c;
    }

    div.addEventListener("mouseenter", () => {
      const tooltip = document.getElementById("gala-tooltip");
      if (!tooltip) return;
      tooltip.innerHTML = `<strong>${seat.id_asiento}</strong><br>Estado: ${seat.estado}${seat.cliente_reserva ? '<br>Cliente: ' + seat.cliente_reserva : ''}`;
      tooltip.classList.add("visible");
      
      const rect = div.getBoundingClientRect();
      const mapWrapper = document.querySelector(".gala-map-wrapper");
      tooltip.style.left = (rect.left - mapWrapper.getBoundingClientRect().left + 30) + "px";
      tooltip.style.top = (rect.top - mapWrapper.getBoundingClientRect().top - 10) + "px";
    });
    
    div.addEventListener("mouseleave", () => {
      const tooltip = document.getElementById("gala-tooltip");
      if (tooltip) tooltip.classList.remove("visible");
    });

    div.addEventListener("click", () => {
      if (!isAdmin && seat.estado === "VENDIDO") return;
      openSeatModal(seat, isAdmin);
    });

    container.appendChild(div);
  });
  
  const mDisp = document.getElementById("gala-metric-disp");
  const mRes = document.getElementById("gala-metric-res");
  const mVen = document.getElementById("gala-metric-ven");
  const mTot = document.getElementById("gala-metric-total");
  
  if (mDisp) mDisp.textContent = isAdmin ? galaSeatsData.filter(s=>s.estado==="LIBRE").length : countLibres;
  if (mRes) mRes.textContent = isAdmin ? galaSeatsData.filter(s=>s.estado==="RESERVADO").length : countRes;
  if (mVen) mVen.textContent = isAdmin ? galaSeatsData.filter(s=>s.estado==="VENDIDO").length : countVen;
  if (mTot) mTot.textContent = isAdmin ? galaSeatsData.length : countTotal;
}

function openSeatModal(seat, isAdmin) {
  document.getElementById("gala-modal-id").textContent = seat.id_asiento;
  document.getElementById("gala-modal-status").value = seat.estado;
  document.getElementById("gala-modal-client").value = seat.cliente_reserva || "";
  
  const assignGroup = document.getElementById("gala-admin-assign-group");
  const selectAssign = document.getElementById("gala-assign-select");
  if (assignGroup && isAdmin) {
    selectAssign.value = seat.asignado_a || "";
  }
  
  document.getElementById("gala-seat-modal").classList.add("active");
  document.getElementById("gala-modal-overlay").classList.add("active");
  
  const btnSave = document.getElementById("btn-save-gala-seat");
  const newBtn = btnSave.cloneNode(true);
  btnSave.parentNode.replaceChild(newBtn, btnSave);
  
  newBtn.addEventListener("click", async () => {
    try {
      const data = {
        estado: document.getElementById("gala-modal-status").value,
        cliente_reserva: document.getElementById("gala-modal-client").value.trim() || null
      };
      const sel = document.getElementById("gala-assign-select");
      if (sel && sel.closest(".form-group").style.display !== "none") {
        data.asignado_a = sel.value || null;
      }
      await updateDoc(doc(window.db, "asientos_gala", seat.id_asiento), data);
      document.getElementById("gala-seat-modal").classList.remove("active");
      document.getElementById("gala-modal-overlay").classList.remove("active");
    } catch(err) {
      console.error(err);
      alert("Error al guardar: " + err.message);
    }
  });
  
  document.getElementById("btn-close-gala-modal").addEventListener("click", () => {
    document.getElementById("gala-seat-modal").classList.remove("active");
    document.getElementById("gala-modal-overlay").classList.remove("active");
  });
}
