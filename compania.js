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
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
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
            reject(new Error("No se pudo convertir la imagen a WebP."));
          }
        }, "image/webp", quality);
      };
      img.onerror = (err) => reject(err);
      img.src = event.target.result;
    };
    reader.onerror = (err) => reject(err);
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

  // Previsualización y codificación de imagen con validación de tipo JPG/PNG
  if (profileAvatarInput && profileAvatarImg) {
    profileAvatarInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        const validTypes = ["image/jpeg", "image/png", "image/jpg"];
        if (!validTypes.includes(file.type)) {
          showAlert("Formato de archivo no válido. Solo se permiten imágenes JPG o PNG.");
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
      try {
        if (profileAvatarImg.pendingFile) {
          // Convertir a WebP en el cliente antes de subir
          const webpBlob = await convertToWebP(profileAvatarImg.pendingFile);
          
          // Subir a Firebase Storage
          const storageRef = ref(storage, `perfiles/${profile.uid}.webp`);
          await uploadBytes(storageRef, webpBlob);
          
          // Obtener URL de descarga
          const downloadUrl = await getDownloadURL(storageRef);
          updatedData.fotoPerfil = downloadUrl;
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
        showAlert("Error al guardar perfil en Firestore / Storage: " + error.message);
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
