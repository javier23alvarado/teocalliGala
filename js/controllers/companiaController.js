// Firebase Auth & Firestore v9.23.0 modular CDN Imports
import { auth, db, storage, firebaseConfig, RESERVATION_EXPIRATION_MINUTES } from "../services/firebaseService.js";

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
const navDbMisBoletos = document.getElementById("btn-misboletos");
const btnMenuToggle = document.getElementById("btn-menu-toggle");
const sidebar = document.querySelector(".sidebar");
const profileAvatarSidebar = document.getElementById("profile-avatar-sidebar");

// Secciones del Dashboard
const dbSectionGeneral = document.getElementById("db-section-general");
const dbSectionUsers = document.getElementById("db-section-users");
const dbSectionProfile = document.getElementById("db-section-profile");

// Módulo Boletos Gala
const sidebarOptBoletos = document.getElementById("sidebar-opt-boletos");
const navDbBoletos = document.getElementById("btn-boletos");
const dbSectionBoletos = document.getElementById("db-section-boletos");
const btnInitMap = document.getElementById("btn-init-map");
const teatroMapGrid = document.getElementById("teatro-map-grid");
const countLibres = document.getElementById("count-libres");
const countReservados = document.getElementById("count-reservados");
const countVendidos = document.getElementById("count-vendidos");
const boletoModal = document.getElementById("boleto-modal");
const btnCloseBoletoModal = document.getElementById("btn-close-boleto-modal");
const boletoForm = document.getElementById("boleto-form");
const boletoIdInput = document.getElementById("boleto-id-input");
const boletoStatusSelect = document.getElementById("boleto-status-select");
const boletoBailarinGroup = document.getElementById("boleto-bailarin-group");
const boletoBailarinSelect = document.getElementById("boleto-bailarin-select");
const tabBtnBoletosMap = document.getElementById("tab-btn-boletos-map");
const tabBtnBoletosTable = document.getElementById("tab-btn-boletos-table");
const tabContentBoletosMap = document.getElementById("tab-content-boletos-map");
const tabContentBoletosTable = document.getElementById("tab-content-boletos-table");
const boletosTableBody = document.getElementById("boletos-table-body");
const misboletosTableBody = document.getElementById("misboletos-table-body");
const filterBoletoId = document.getElementById("filter-boleto-id");
const filterBoletoEstado = document.getElementById("filter-boleto-estado");
const filterBoletoBailarin = document.getElementById("filter-boleto-bailarin");
const btnExportBoletos = document.getElementById("btn-export-boletos");
let currentBoletosData = {}; // Cache for table filtering

// Mass Assign Modal
const btnMassAssign = document.getElementById("btn-mass-assign");
const massAssignModal = document.getElementById("mass-assign-modal");
const btnCloseMassAssignModal = document.getElementById("btn-close-mass-assign-modal");
const massAssignForm = document.getElementById("mass-assign-form");
const massAssignInput = document.getElementById("mass-assign-input");
const massAssignUserSelect = document.getElementById("mass-assign-user-select");
const massAssignStatusSelect = document.getElementById("mass-assign-status-select");

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
            window.location.href = LOGIN_REDIRECT + "?error=inactive";
            return;
          }

          currentUserProfile = { uid: user.uid, ...userData };
          
          // Cargar catálogo de compañías desde Firestore antes de inicializar vistas
          await loadCompaniesCatalog();
          initializeDashboard(currentUserProfile);
        } else {
          await signOut(auth);
          sessionStorage.clear();
          window.location.href = LOGIN_REDIRECT + "?error=not_found";
        }
      } catch (error) {
        console.error("Error al recuperar sesión de base de datos:", error);
        await signOut(auth);
        sessionStorage.clear();
        window.location.href = LOGIN_REDIRECT + "?error=permissions";
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
    if (sidebarOptBoletos) sidebarOptBoletos.style.display = "block";
    setupSuperAdminCRUD();
    if (typeof setupBoletosModule === "function") setupBoletosModule();
    
    // Configurar vista general personalizada para administrador
    welcomeRoleTitle.textContent = "Consola de Super Administrador";
    welcomeRoleMessage.textContent = "Tienes acceso completo a la base de datos de la Compañía Teocalli. Puedes crear, consultar, modificar y eliminar miembros de la plataforma, así como supervisar sus estados de acceso.";
  } else if (profile.id_rol === "admin") {
    if (sidebarOptUsers) sidebarOptUsers.remove();
    if (dbSectionUsers) dbSectionUsers.remove();
    if (userRegistrationCard) userRegistrationCard.remove();
    if (sidebarOptBoletos) sidebarOptBoletos.style.display = "block";
    if (typeof setupBoletosModule === "function") setupBoletosModule();

    const companyObj = companiesCatalog.find(c => c.id === profile.id_compania);
    const companyName = companyObj ? companyObj.nombre : "Compañía General";
    welcomeRoleTitle.textContent = `Ballet Folclórico - ${companyName} (Administrador)`;
    welcomeRoleMessage.textContent = "Tienes acceso al módulo de boletos.";
  } else {
    // Si es bailarín estándar:
    // Ocultar por completo o remover del DOM el listado de gestión, el menú lateral y el formulario
    if (sidebarOptUsers) sidebarOptUsers.remove();
    if (dbSectionUsers) dbSectionUsers.remove();
    if (userRegistrationCard) userRegistrationCard.remove();
    if (sidebarOptBoletos) sidebarOptBoletos.remove();
    if (dbSectionBoletos) dbSectionBoletos.remove();

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

if (navDbProfile) {
  navDbProfile.addEventListener("click", (e) => {
    e.preventDefault();
    switchDbSection("profile");
    closeSidebarOnMobile();
  });
}

if (navDbBoletos) {
  navDbBoletos.addEventListener("click", (e) => {
    e.preventDefault();
    switchDbSection("boletos");
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
  if (newUserForm) {
    newUserForm.addEventListener("submit", handleFormSubmit);
    
    // Auto-formato: Capitalizar nombres (Title Case)
    const capitalizeWords = (str) => str.replace(/\b\w/g, l => l.toUpperCase());
    [regNombresInput, regPaternoInput, regMaternoInput].forEach(input => {
      if (input) {
        input.addEventListener("input", function(e) {
          this.value = capitalizeWords(this.value);
        });
      }
    });

    // Auto-formato: Limpiar celular (solo números, max 10)
    if (regPhoneInput) {
      regPhoneInput.addEventListener("input", function(e) {
        this.value = this.value.replace(/\D/g, '').substring(0, 10);
      });
    }

    // Auto-formato: Normalizar correo en onblur
    if (regEmailInput) {
      regEmailInput.addEventListener("blur", function(e) {
        this.value = this.value.trim().toLowerCase();
      });
    }
  }

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
  } else if (sectionName === "boletos") {
    if (navDbBoletos) navDbBoletos.classList.add("active");
    if (dbSectionBoletos) dbSectionBoletos.classList.add("active");
  } else if (sectionName === "agenda") {
    if (navDbAgenda) navDbAgenda.classList.add("active");
    const dbSectionAgenda = document.getElementById("db-section-agenda");
    if (dbSectionAgenda) dbSectionAgenda.classList.add("active");
  } else if (sectionName === "misboletos") {
    if (navDbMisBoletos) navDbMisBoletos.classList.add("active");
    const dbSectionMisBoletos = document.getElementById("db-section-misboletos");
    if (dbSectionMisBoletos) dbSectionMisBoletos.classList.add("active");
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

  // Validaciones estrictas manuales
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    showAlert("Por favor, ingresa un correo electrónico válido.", "warning");
    return;
  }

  const phoneRegex = /^[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    showAlert("El número de celular debe contener exactamente 10 dígitos numéricos sin espacios.", "warning");
    return;
  }

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
      
      // Limpiar los boletos asignados a este usuario
      let boletosUpdates = {};
      let hasBoletosUpdates = false;
      if (typeof currentBoletosData !== 'undefined' && currentBoletosData) {
        Object.entries(currentBoletosData).forEach(([seatId, info]) => {
          if (info.bailarin_id === uid) {
            boletosUpdates[`asientos.${seatId}.estado`] = 'libre';
            boletosUpdates[`asientos.${seatId}.bailarin_id`] = null;
            boletosUpdates[`asientos.${seatId}.comentario`] = '';
            hasBoletosUpdates = true;
          }
        });
      }
      if (hasBoletosUpdates) {
        await updateDoc(doc(db, 'gala', 'estadoBoletos'), boletosUpdates);
      }
      
      if (regUidInput && regUidInput.value === uid) resetFormState();
      
      showLoading(false);
      showAlert("Miembro eliminado exitosamente de Firestore y sus boletos fueron liberados.", "success");
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
    navDbAgenda.addEventListener("click", () => {
      switchDbSection("agenda");
    });
  }

  if (navDbMisBoletos) {
    navDbMisBoletos.addEventListener("click", () => {
      switchDbSection("misboletos"); renderMisBoletosTable();
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
// MÓDULO BOLETOS GALA
// ====================================================
let asientosDbRef = null;
let unsubscribeBoletos = null;

async function setupBoletosModule() {
  

  if (!dbSectionBoletos) return;
  
  const boletoModalTitle = document.getElementById('boleto-modal-title');
  
  try {
    const res = await fetch('js/data/mapaGaleriasLayout.json');
    if (!res.ok) throw new Error('No se pudo cargar el layout');
    const mapData = await res.json();
    renderMapGrid(mapData);
    
    if (typeof Panzoom !== 'undefined' && teatroMapGrid) {
      const pz = Panzoom(teatroMapGrid, {
        maxScale: 5,
        minScale: 0.1,
        startScale: 0.45, 
        step: 0.2
      });
      teatroMapGrid.parentElement.addEventListener('wheel', pz.zoomWithWheel);
      
      setTimeout(() => {
        const parentBounds = teatroMapGrid.parentElement.getBoundingClientRect();
        const gridBounds = teatroMapGrid.getBoundingClientRect();
        // Centro real
        const startX = (parentBounds.width - (gridBounds.width / 0.7)) / 2;
        const startY = (parentBounds.height - (gridBounds.height / 0.7)) / 2;
        pz.pan(0, 0); // Un offset razonable para empezar centrado
      }, 100);
    }
  } catch (error) {
    console.error('Error al cargar mapaGaleriasLayout.json:', error);
    if (teatroMapGrid) teatroMapGrid.innerHTML = '<p style="color:red;text-align:center;">Error al cargar el mapa visual.</p>';
  }

  populateBailarinesSelect();
  setupBoletosTabsAndFilters();
  
  asientosDbRef = doc(db, 'gala', 'estadoBoletos');
  unsubscribeBoletos = onSnapshot(asientosDbRef, (docSnap) => {
    if (!docSnap.exists()) {
      if(btnInitMap) btnInitMap.style.display = 'block';
    } else {
      if(btnInitMap) btnInitMap.style.display = 'none';
      const data = docSnap.data().asientos || {};
      
      // Simular liberación local por tiempo
      const now = Date.now();
      Object.keys(data).forEach(seatId => {
        if (data[seatId].estado === 'reservado' && data[seatId].reservaDate) {
          const diffMinutes = (now - data[seatId].reservaDate) / (1000 * 60);
          if (diffMinutes > RESERVATION_EXPIRATION_MINUTES) {
            data[seatId].estado = 'libre';
          }
        }
      });
      
      currentBoletosData = data;
      updateMapUI(data);
      if (tabContentBoletosTable && tabContentBoletosTable.style.display !== 'none') {
        renderBoletosTable();
      }
      if (document.getElementById("db-section-misboletos")?.classList.contains("active")) {
        renderMisBoletosTable();
      }
    }
  });

  if (btnInitMap) {
    btnInitMap.addEventListener('click', async () => {
      if (!confirm('¿Seguro que deseas inicializar todos los asientos como Libres? Esto sobrescribirá datos existentes.')) return;
      
      const res = await fetch('js/data/mapaGaleriasLayout.json');
      const mapData = await res.json();
      const initialAsientos = {};
      
      mapData.layout.forEach(row => {
        row.forEach(cell => {
          if (cell && cell.trim() !== '' && cell.trim() !== 'pasillo' && cell.trim().toUpperCase() !== 'ESCENARIO') {
            initialAsientos[cell.trim()] = { estado: 'libre', bailarin_id: null };
          }
        });
      });
      
      try {
        await setDoc(asientosDbRef, { asientos: initialAsientos, lastUpdate: new Date().toISOString() });
        showAlert('Base de datos de boletos inicializada correctamente.', 'success');
      } catch (error) {
        console.error('Error init boletos:', error);
        showAlert('Error al inicializar: ' + error.message, 'danger');
      }
    });
  }

  if (btnCloseBoletoModal) {
    btnCloseBoletoModal.addEventListener('click', () => {
      if (boletoModal) boletoModal.style.display = 'none';
    });
  }
  
  if (boletoStatusSelect) {
    // Ya no ocultamos el grupo de selección de usuario basado en el estado
    boletoStatusSelect.addEventListener('change', (e) => {
      // boletoBailarinGroup.style.display = 'block'; (siempre visible por CSS)
    });
  }

  if (boletoForm) {
    boletoForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const seatId = boletoIdInput.value;
      const status = boletoStatusSelect.value;
      const bailarin = boletoBailarinSelect.value || null;
      const comentario = document.getElementById('boleto-comentario') ? document.getElementById('boleto-comentario').value : '';
      
      try {
        await updateDoc(asientosDbRef, {
          [`asientos.${seatId}.estado`]: status,
          [`asientos.${seatId}.bailarin_id`]: bailarin,
          [`asientos.${seatId}.comentario`]: comentario
        });
        if (boletoModal) boletoModal.style.display = 'none';
        window.showToast(`Boleto ${seatId} actualizado a ${status}.`, 'success');
      } catch(error) {
        console.error(error);
        window.showToast('Error al guardar: ' + error.message, 'danger');
      }
    });
  }
}

function renderMapGrid(mapData) {
  if (!teatroMapGrid) return;
  teatroMapGrid.innerHTML = '';
  teatroMapGrid.style.gridTemplateColumns = `repeat(${mapData.cols}, 1fr)`;
  
  let hasEscenario = false;

  mapData.layout.forEach(row => {
    // Si la fila completa está formada solo por vacíos o ESCENARIO, no la renderizamos
    // para acercar el bloque al mapa
    const isEscenarioRow = row.some(cell => cell && cell.trim().toUpperCase() === 'ESCENARIO');
    if (isEscenarioRow) {
      hasEscenario = true;
      return; // Omitir esta fila en el DOM
    }

    row.forEach(cell => {
      const div = document.createElement('div');
      div.className = 'teatro-seat';
      
      if (!cell || cell.trim() === '' || cell.trim() === 'pasillo') {
        div.classList.add('seat-empty');
      } else {
        const seatId = cell.trim();
        div.id = `seat-${seatId}`;
        div.textContent = seatId;
        div.classList.add('seat-libre');
        div.title = `Asiento ${seatId}`;
        
        div.addEventListener('click', () => {
          openBoletoModal(seatId);
        });
      }
      teatroMapGrid.appendChild(div);
    });
  });

  if (hasEscenario) {
    const escDiv = document.createElement('div');
    escDiv.style.gridColumn = '1 / -1';
    escDiv.style.marginTop = '20px';
    escDiv.style.height = '60px';
    escDiv.style.display = 'flex';
    escDiv.style.alignItems = 'center';
    escDiv.style.justifyContent = 'center';
    escDiv.style.backgroundColor = '#fdf2f8'; 
    escDiv.style.border = '3px solid #db2777'; 
    escDiv.style.color = '#db2777';
    escDiv.style.fontWeight = 'bold';
    escDiv.style.letterSpacing = '10px';
    escDiv.style.fontSize = '18px';
    escDiv.style.borderRadius = '8px';
    escDiv.textContent = 'ESCENARIO';
    teatroMapGrid.appendChild(escDiv);
  }
}

function updateMapUI(asientosData) {
  let countL = 0, countR = 0, countV = 0;
  
  Object.keys(asientosData).forEach(seatId => {
    const data = asientosData[seatId];
    const div = document.getElementById(`seat-${seatId}`);
    if (div) {
      div.classList.remove('seat-libre', 'seat-reservado', 'seat-vendido');
      div.classList.add(`seat-${data.estado}`);
      
      if (data.estado === 'libre') countL++;
      else if (data.estado === 'reservado') countR++;
      else if (data.estado === 'vendido') countV++;
    }
  });
  
  if (countLibres) countLibres.textContent = countL;
  if (countReservados) countReservados.textContent = countR;
  if (countVendidos) countVendidos.textContent = countV;
}

function openBoletoModal(seatId) {
  const boletoModalTitle = document.getElementById('boleto-modal-title');
  boletoIdInput.value = seatId;
  if(boletoModalTitle) boletoModalTitle.textContent = `Gestionar Asiento ${seatId}`;
  
  const div = document.getElementById(`seat-${seatId}`);
  if (div) {
    if (div.classList.contains('seat-vendido')) boletoStatusSelect.value = 'vendido';
    else if (div.classList.contains('seat-reservado')) boletoStatusSelect.value = 'reservado';
    else boletoStatusSelect.value = 'libre';
  } else {
    boletoStatusSelect.value = 'libre';
  }
  
  // El grupo de usuario asignado siempre está visible ahora
  if (boletoBailarinGroup) {
    boletoBailarinGroup.style.display = 'block';
  }
  
  getDoc(asientosDbRef).then(docSnap => {
    if(docSnap.exists()){
      const seatData = docSnap.data().asientos[seatId];
      if(seatData && seatData.bailarin_id) {
        boletoBailarinSelect.value = seatData.bailarin_id;
      } else {
        boletoBailarinSelect.value = '';
      }
      
      const comentarioInput = document.getElementById('boleto-comentario');
      if (comentarioInput) {
        comentarioInput.value = (seatData && seatData.comentario) ? seatData.comentario : '';
      }
    }
  });
  
  boletoModal.style.display = 'flex';
}

async function populateBailarinesSelect() {
  if (!boletoBailarinSelect) return;
  try {
    const q = query(collection(db, 'usuarios'), where('activo', '==', true));
    const querySnapshot = await getDocs(q);
    boletoBailarinSelect.innerHTML = '<option value="">Selecciona un usuario...</option>';
    querySnapshot.forEach((d) => {
      const u = d.data();
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = `${u.nombres} ${u.apellidoPaterno} (${u.alias || 'Sin alias'})`;
      boletoBailarinSelect.appendChild(opt);
      
      if (filterBoletoBailarin) {
        const optFilter = opt.cloneNode(true);
        filterBoletoBailarin.appendChild(optFilter);
      }
      
      if (typeof massAssignUserSelect !== 'undefined' && massAssignUserSelect) {
        const optMass = opt.cloneNode(true);
        massAssignUserSelect.appendChild(optMass);
      }
      
      // Aseguramos que currentUsersData tenga los usuarios para el mapeo
      if (!currentUsersData.find(user => user.id === d.id)) {
        currentUsersData.push({ id: d.id, ...u });
      }
    });
  } catch(error) {
    console.error('Error al poblar lista de bailarines', error);
  }
}

// ====================================================
// BOLETOS TABLA Y FILTROS
// ====================================================
function setupBoletosTabsAndFilters() {
  if (tabBtnBoletosMap) {
    tabBtnBoletosMap.addEventListener("click", () => {
      tabBtnBoletosMap.classList.add("active");
      if (tabBtnBoletosTable) tabBtnBoletosTable.classList.remove("active");
      if (tabContentBoletosMap) tabContentBoletosMap.style.display = "block";
      if (tabContentBoletosTable) tabContentBoletosTable.style.display = "none";
    });
  }

  if (tabBtnBoletosTable) {
    tabBtnBoletosTable.addEventListener("click", () => {
      tabBtnBoletosTable.classList.add("active");
      if (tabBtnBoletosMap) tabBtnBoletosMap.classList.remove("active");
      if (tabContentBoletosTable) tabContentBoletosTable.style.display = "block";
      if (tabContentBoletosMap) tabContentBoletosMap.style.display = "none";
      renderBoletosTable();
    });
  }
  
  if (filterBoletoId) filterBoletoId.addEventListener("input", renderBoletosTable);
  if (filterBoletoEstado) filterBoletoEstado.addEventListener("change", renderBoletosTable);
  if (filterBoletoBailarin) filterBoletoBailarin.addEventListener("change", renderBoletosTable);

  if (btnExportBoletos) {
    btnExportBoletos.addEventListener("click", exportBoletosToExcel);
  }

  // Asignación Masiva: listener directo sobre el elemento
  if (btnMassAssign && massAssignModal) {
    btnMassAssign.addEventListener("click", () => {
      massAssignModal.style.display = "flex";
    });
  }

  if (btnCloseMassAssignModal && massAssignModal) {
    btnCloseMassAssignModal.addEventListener("click", () => {
      massAssignModal.style.display = "none";
    });
  }

  // Cierre al hacer clic fuera del contenido del modal
  window.addEventListener("click", (e) => {
    if (e.target === massAssignModal) {
      massAssignModal.style.display = "none";
    }
    if (e.target === boletoModal) {
      boletoModal.style.display = "none";
    }
  });
}

function renderBoletosTable() {
  if (!boletosTableBody) return;
  boletosTableBody.innerHTML = "";

  const searchText = filterBoletoId ? filterBoletoId.value.toLowerCase().trim() : "";
  const filterEstado = filterBoletoEstado ? filterBoletoEstado.value : "todos";
  const filterBailarin = filterBoletoBailarin ? filterBoletoBailarin.value : "todos";

  const userMap = {};
  currentUsersData.forEach(u => {
    userMap[u.id] = (u.nombres || "") + " " + (u.apellidoPaterno || "");
  });

  let hasRows = false;
  
  if (!currentBoletosData) return;

  Object.entries(currentBoletosData).forEach(([seatId, info]) => {
    const estado = info.estado || "libre";
    const bailarinId = info.bailarin_id;
    const bailarinName = bailarinId && userMap[bailarinId] ? userMap[bailarinId] : (bailarinId || "N/A");
    const comentario = info.comentario || "";

    if (searchText && !seatId.toLowerCase().includes(searchText)) return;
    if (filterEstado !== "todos" && estado !== filterEstado) return;
    if (filterBailarin !== "todos" && bailarinId !== filterBailarin) return;

    hasRows = true;

    const tr = document.createElement("tr");

    let estadoBadge = `<span class="badge" style="background-color: #10b981; color: white;">Libre</span>`;
    if (estado === "reservado") estadoBadge = `<span class="badge" style="background-color: #f59e0b; color: white;">Reservado</span>`;
    if (estado === "vendido") estadoBadge = `<span class="badge" style="background-color: #ef4444; color: white;">Vendido</span>`;

    tr.innerHTML = `
      <td style="font-weight: bold; text-align: center;">${seatId}</td>
      <td style="text-align: center;">${estadoBadge}</td>
      <td style="text-align: center;">${estado === 'libre' && (!bailarinId || bailarinId === 'todos') ? '<span style="color:var(--text-muted)">-</span>' : bailarinName}</td>
      <td><small style="color:var(--text-muted)">${comentario}</small></td>
      <td style="text-align: center;">
        <button class="btn btn-secondary btn-sm btn-edit-seat" data-seat="${seatId}" style="padding: 4px 8px; font-size: 12px; border: 1px solid var(--border-color); border-radius: var(--radius-sm); cursor: pointer; background: transparent; color: var(--text-main);">Editar</button>
      </td>
    `;
    boletosTableBody.appendChild(tr);
  });

  if (!hasRows) {
    boletosTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay asientos que coincidan con los filtros.</td></tr>`;
  }

  // Bind edit buttons
  document.querySelectorAll('.btn-edit-seat').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const seatId = e.currentTarget.getAttribute('data-seat');
      openBoletoModal(seatId);
    });
  });
}

function renderMisBoletosTable() {
  if (!misboletosTableBody) return;
  misboletosTableBody.innerHTML = "";

  if (!currentBoletosData || !currentUserProfile || !currentUserProfile.uid) {
    misboletosTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Cargando...</td></tr>`;
    return;
  }

  let hasRows = false;

  Object.entries(currentBoletosData).forEach(([seatId, info]) => {
    const estado = info.estado || "libre";
    const bailarinId = info.bailarin_id;

    if (bailarinId !== currentUserProfile.uid) return;

    hasRows = true;

    const tr = document.createElement("tr");

    let estadoBadge = `<span class="badge" style="background-color: #10b981; color: white;">Libre</span>`;
    if (estado === "reservado") estadoBadge = `<span class="badge" style="background-color: #f59e0b; color: white;">Reservado</span>`;
    if (estado === "vendido") estadoBadge = `<span class="badge" style="background-color: #ef4444; color: white;">Vendido</span>`;

    tr.innerHTML = `
      <td style="font-weight: bold; text-align: center;">${seatId}</td>
      <td style="text-align: center;">${estadoBadge}</td>
      <td style="text-align: center;">
        <select class="input-field" style="padding: 4px 8px; font-size: 13px; max-width: 120px; display: inline-block;" onchange="window.changeMisBoletoState('${seatId}', this)">
          <option value="libre" ${estado === 'libre' ? 'selected' : ''}>Libre</option>
          <option value="reservado" ${estado === 'reservado' ? 'selected' : ''}>Reservado</option>
          <option value="vendido" ${estado === 'vendido' ? 'selected' : ''}>Vendido</option>
        </select>
      </td>
    `;
    misboletosTableBody.appendChild(tr);
  });

  if (!hasRows) {
    misboletosTableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: var(--text-muted);">No tienes boletos asignados actualmente.</td></tr>`;
  }
}

window.changeMisBoletoState = async function(seatId, selectElement) {
  const newState = selectElement.value;
  selectElement.disabled = true;
  
  try {
    const updateData = {};
    updateData[`asientos.${seatId}.estado`] = newState;
    
    await updateDoc(asientosDbRef, updateData);
    if(window.showToast) window.showToast(`Asiento ${seatId} actualizado a ${newState}`, "success");
  } catch (error) {
    console.error("Error al actualizar estado del boleto:", error);
    if(window.showToast) window.showToast("Error al actualizar estado: " + error.message, "danger");
    // Revert select visually
    const oldState = currentBoletosData[seatId]?.estado || 'libre';
    selectElement.value = oldState;
  } finally {
    selectElement.disabled = false;
  }
};


function exportBoletosToExcel() {
  if (typeof XLSX === "undefined") {
    showAlert("La librería de exportación aún está cargando o no se encuentra disponible. Comprueba tu conexión.", "danger");
    return;
  }

  const userMap = {};
  currentUsersData.forEach(u => {
    userMap[u.id] = (u.nombres || "") + " " + (u.apellidoPaterno || "");
  });

  const dataToExport = [];
  const searchText = filterBoletoId ? filterBoletoId.value.toLowerCase().trim() : "";
  const filterEstado = filterBoletoEstado ? filterBoletoEstado.value : "todos";
  const filterBailarin = filterBoletoBailarin ? filterBoletoBailarin.value : "todos";

  Object.entries(currentBoletosData).forEach(([seatId, info]) => {
    const estado = info.estado || "libre";
    const bailarinId = info.bailarin_id;
    const bailarinName = bailarinId && userMap[bailarinId] ? userMap[bailarinId] : (bailarinId || "");
    const comentario = info.comentario || "";

    if (searchText && !seatId.toLowerCase().includes(searchText)) return;
    if (filterEstado !== "todos" && estado !== filterEstado) return;
    if (filterBailarin !== "todos" && bailarinId !== filterBailarin) return;

    dataToExport.push({
      "Asiento": seatId,
      "Estado": estado.toUpperCase(),
      "Usuario Asignado": estado === 'libre' && !bailarinName ? '-' : bailarinName,
      "Comentarios": comentario
    });
  });

  if (dataToExport.length === 0) {
    showAlert("No hay datos para exportar con los filtros actuales.", "warning");
    return;
  }

  const worksheet = XLSX.utils.json_to_sheet(dataToExport);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Asientos");
  
  XLSX.writeFile(workbook, "Boletos_Teocalli_Gala.xlsx");
}

// Mass Assign Logic (Event Delegation global absoluto)
document.addEventListener("click", (e) => {
  if (e.target.closest("#btn-mass-assign")) {
    const modal = document.getElementById("mass-assign-modal");
    if (modal) {
      const input = document.getElementById("mass-assign-input");
      const userSel = document.getElementById("mass-assign-user-select");
      const statusSel = document.getElementById("mass-assign-status-select");
      if (input) input.value = "";
      if (userSel) {
        userSel.innerHTML = '<option value="">(Ninguno)</option>';
        currentUsersData.forEach(u => {
          const opt = document.createElement("option");
          opt.value = u.uid || u.id; // Soporta ambos campos para mayor seguridad
          opt.textContent = (u.nombres || "") + " " + (u.apellidoPaterno || "");
          userSel.appendChild(opt);
        });
      }
      if (statusSel) statusSel.value = "libre"; // Default a libre
      modal.style.display = "flex";
    } else {
      console.error("Modal de asignación masiva no encontrado en el DOM");
      alert("Error interno: Modal no encontrado.");
    }
  }
});

document.addEventListener("click", (e) => {
  if (e.target.closest("#btn-close-mass-assign-modal")) {
    const modal = document.getElementById("mass-assign-modal");
    if (modal) modal.style.display = "none";
  }
});

document.addEventListener("submit", async (e) => {
  if (e.target && e.target.id === "mass-assign-form") {
    e.preventDefault();
    
    const input = document.getElementById("mass-assign-input");
    const userSel = document.getElementById("mass-assign-user-select");
    const statusSel = document.getElementById("mass-assign-status-select");
    const modal = document.getElementById("mass-assign-modal");
    
    const seatsStr = input ? input.value : "";
    const userId = userSel ? userSel.value : "";
    const status = statusSel ? statusSel.value : "libre";
    
    if (!seatsStr.trim()) {
      if(window.showToast) window.showToast("Ingresa los asientos.", "warning");
      return;
    }
    
    if (status !== "libre" && !userId) {
      if(window.showToast) window.showToast("Selecciona un usuario para asientos reservados o vendidos.", "warning");
      return;
    }
    
    const seatsArr = seatsStr.split(',').map(s => s.trim().toUpperCase()).filter(s => s);
    const invalidFormat = seatsArr.some(s => !/^[A-Z0-9]+$/.test(s));
    
    if (invalidFormat) {
      if(window.showToast) window.showToast("Formato inválido. Ingresa solo letras y números separados por coma.", "danger");
      return;
    }
    
    // Validar que existen
    let currentBoletosData = {};
    if(window.currentBoletosData) currentBoletosData = window.currentBoletosData; // Asegurarse de tener acceso a currentBoletosData (aunque sea global en este archivo)
    
    // Como currentBoletosData está encapsulado, lo dejaremos que acceda al scope donde fue declarado si es posible. 
    // Wait, si lo muevo acá, currentBoletosData y updateDoc y asientosDbRef puede que no estén en scope!
    // ¡Ah! let currentBoletosData está arriba en el scope del módulo. Así que está bien.
    
    const nonExistent = seatsArr.filter(s => !currentBoletosData[s]);
    if (nonExistent.length > 0) {
      if(window.showToast) window.showToast(`Asientos inválidos o no existen: ${nonExistent.join(', ')}`, "danger");
      return;
    }
    
    try {
      const updateData = {};
      seatsArr.forEach(seat => {
        updateData[`asientos.${seat}.estado`] = status;
        updateData[`asientos.${seat}.bailarin_id`] = userId || null;
        updateData[`asientos.${seat}.comentario`] = ""; 
      });
      
      await updateDoc(asientosDbRef, updateData);
      if (modal) modal.style.display = "none";
      if(window.showToast) window.showToast(`${seatsArr.length} asiento(s) actualizado(s) masivamente.`, "success");
    } catch (error) {
      console.error("Error mass assign:", error);
      if(window.showToast) window.showToast("Error en asignación masiva: " + error.message, "danger");
    }
  }
});

window.showToast = function(message, type = 'success') {
  let toast = document.getElementById('custom-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'custom-toast';
    document.body.appendChild(toast);
    
    const style = document.createElement('style');
    style.innerHTML = `
      #custom-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 100000;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .toast-msg {
        min-width: 250px;
        background: #fff;
        color: #333;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.2);
        transform: translateX(150%);
        transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        display: flex;
        align-items: center;
        gap: 12px;
        font-family: inherit;
        font-weight: 500;
      }
      .toast-msg.show {
        transform: translateX(0);
      }
      .toast-success { border-left: 5px solid #10b981; }
      .toast-danger { border-left: 5px solid #ef4444; }
      .toast-warning { border-left: 5px solid #f59e0b; }
      .toast-icon { font-size: 20px; }
    `;
    document.head.appendChild(style);
  }
  
  const toastEl = document.createElement('div');
  toastEl.className = `toast-msg toast-${type}`;
  
  let icon = '✨';
  if (type === 'danger') icon = '❌';
  if (type === 'warning') icon = '⚠️';
  if (type === 'success') icon = '✅';
  
  toastEl.innerHTML = `<span class="toast-icon">${icon}</span> <span>${message}</span>`;
  toast.appendChild(toastEl);
  
  setTimeout(() => toastEl.classList.add('show'), 10);
  
  setTimeout(() => {
    toastEl.classList.remove('show');
    setTimeout(() => toastEl.remove(), 400);
  }, 4000);
};
