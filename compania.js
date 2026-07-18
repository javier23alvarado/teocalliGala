// compania.js - Panel de control y Route Guard para Compañía Teocalli
import { auth, db } from "./firebase-config.js";

// Firebase Auth & Firestore CDN Imports
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
  doc, 
  getDoc,
  collection, 
  addDoc, 
  onSnapshot,
  setDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

// Navegación Sidebar
const navDbGeneral = document.getElementById("nav-db-general");
const navDbUsers = document.getElementById("nav-db-users");
const sidebarOptUsers = document.getElementById("sidebar-opt-users");

// Secciones del Dashboard
const dbSectionGeneral = document.getElementById("db-section-general");
const dbSectionUsers = document.getElementById("db-section-users");

// Métricas
const metricTotalDancers = document.getElementById("metric-total-dancers");
const metricActiveDancers = document.getElementById("metric-active-dancers");

// Formulario de Registro y Tabla
const newUserForm = document.getElementById("new-user-form");
const usersTableBody = document.getElementById("users-table-body");
const usersCountBadge = document.getElementById("users-count-badge");

// Estado
let currentUserProfile = null;
let unsubscribeUsers = null;

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

// Utilidades UI
function showLoading(show) {
  loadingOverlay.style.display = show ? "flex" : "none";
}

function showAlert(message, type = "danger") {
  dbAlert.innerHTML = message;
  dbAlert.className = `alert alert-${type}`;
  dbAlert.style.display = "block";
  setTimeout(() => {
    dbAlert.style.display = "none";
  }, 6000);
}

// ====================================================
// ROUTE GUARD E INICIALIZACIÓN DE SESIÓN
// ====================================================
if (isDemoMode) {
  // Inicialización de Ruta Protegida en Modo Demo
  console.warn("🔧 Ejecutando Dashboard en Modo Demo (Local Storage).");
  const demoSession = sessionStorage.getItem("demo_active_user");
  if (!demoSession) {
    // No hay sesión activa, redirigir inmediatamente a login
    window.location.href = "/login";
  } else {
    currentUserProfile = JSON.parse(demoSession);
    initializeDashboard(currentUserProfile);
  }
} else {
  // Inicialización de Ruta Protegida Real con Firebase Auth
  showLoading(true);
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Route Guard: Redirección inmediata si no hay sesión
      window.location.href = "/login";
    } else {
      try {
        // Consultar el perfil en Firestore
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Bloqueo estricto si el usuario fue desactivado
          if (userData.activo !== true) {
            await signOut(auth);
            sessionStorage.clear();
            window.location.href = "/login";
            return;
          }

          currentUserProfile = { uid: user.uid, ...userData };
          initializeDashboard(currentUserProfile);
        } else {
          // Documento no configurado
          await signOut(auth);
          window.location.href = "/login";
        }
      } catch (error) {
        console.error("Error al autenticar ruta protegida:", error);
        window.location.href = "/login";
      }
    }
  });
}

// ====================================================
// ORQUESTACIÓN Y CONFIGURACIÓN SEGÚN ROL
// ====================================================
function initializeDashboard(profile) {
  // 1. Mostrar información básica de bienvenida
  profileName.textContent = profile.nombre;
  
  let rolText = "Bailarín";
  if (profile.rol === "super_admin") rolText = "Super Administrador";
  if (profile.rol === "admin") rolText = "Administrador";
  profileRole.textContent = rolText;

  const initials = profile.nombre.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  avatarInitials.textContent = initials || "U";

  dbWelcomeTitle.textContent = `¡Bienvenido, ${profile.alias || profile.nombre}!`;
  dbWelcomeDesc.textContent = `Has accedido con el rol de ${rolText}.`;
  
  badgeActiveStatus.textContent = "Perfil Activo";
  badgeActiveStatus.className = "badge badge-active";

  // 2. ORQUESTACIÓN DE VISTAS POR ROL:
  // - Si es 'super_admin': Mostrar controles completos.
  // - Si es 'admin' o 'bailarin': Remover por completo del DOM los controles de administración.
  if (profile.rol === "super_admin") {
    sidebarOptUsers.style.display = "block";
    setupSuperAdminFeatures();
  } else {
    // Remover físicamente los elementos del DOM por seguridad y limpieza
    if (sidebarOptUsers) sidebarOptUsers.remove();
    if (dbSectionUsers) dbSectionUsers.remove();
    
    // Si no es Super Admin, las métricas no muestran datos de otros usuarios
    metricTotalDancers.textContent = "--";
    metricActiveDancers.textContent = "--";
    
    showLoading(false);
  }
}

// Cierre de Sesión
btnLogout.addEventListener("click", async () => {
  showLoading(true);
  
  if (unsubscribeUsers) {
    unsubscribeUsers();
  }

  if (isDemoMode) {
    sessionStorage.clear();
    window.location.href = "/login";
  } else {
    try {
      await signOut(auth);
      sessionStorage.clear();
      window.location.href = "/login";
    } catch (e) {
      showLoading(false);
      console.error("Error al desloguearse:", e);
    }
  }
});

// ====================================================
// SECCIÓN EXCLUSIVA: LÓGICA DE SUPER ADMINISTRADOR
// ====================================================
function setupSuperAdminFeatures() {
  // Configurar navegación de pestañas
  navDbGeneral.addEventListener("click", (e) => {
    e.preventDefault();
    switchSection("general");
  });

  navDbUsers.addEventListener("click", (e) => {
    e.preventDefault();
    switchSection("users");
  });

  // Cargar y escuchar datos en tiempo real
  if (isDemoMode) {
    const usersList = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
    updateMetrics(usersList);
    renderUsersTable(usersList);
  } else {
    const q = collection(db, "usuarios");
    unsubscribeUsers = onSnapshot(q, (snapshot) => {
      const usersList = [];
      snapshot.forEach((doc) => {
        usersList.push({ uid: doc.id, ...doc.data() });
      });
      updateMetrics(usersList);
      renderUsersTable(usersList);
    }, (error) => {
      console.error("Error al sincronizar usuarios:", error);
      showAlert("No se pudieron cargar los datos de Firestore. Verifica tus permisos.");
    });
  }

  // Configurar submit de creación de usuario
  newUserForm.addEventListener("submit", handleRegisterUser);
  
  showLoading(false);
}

function switchSection(sectionName) {
  document.querySelectorAll(".sidebar-link").forEach(l => l.classList.remove("active"));
  document.querySelectorAll(".db-section").forEach(s => s.classList.remove("active"));

  if (sectionName === "general") {
    navDbGeneral.classList.add("active");
    dbSectionGeneral.classList.add("active");
  } else if (sectionName === "users") {
    navDbUsers.classList.add("active");
    dbSectionUsers.classList.add("active");
  }
}

function updateMetrics(users) {
  const total = users.length;
  const active = users.filter(u => u.activo === true).length;
  
  metricTotalDancers.textContent = total;
  metricActiveDancers.textContent = active;
  usersCountBadge.textContent = `${total} miembros`;
}

function renderUsersTable(users) {
  usersTableBody.innerHTML = "";

  if (users.length === 0) {
    usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">No hay miembros registrados.</td></tr>`;
    return;
  }

  users.forEach(user => {
    const tr = document.createElement("tr");
    
    const activeBadge = user.activo 
      ? `<span class="badge badge-active">Activo</span>` 
      : `<span class="badge badge-inactive">Inactivo</span>`;
      
    let roleText = "Bailarín";
    let roleClass = "badge-role-bailarin";
    if (user.rol === "super_admin") {
      roleText = "Super Admin";
      roleClass = "badge-role-superadmin";
    } else if (user.rol === "admin") {
      roleText = "Admin";
      roleClass = "badge-role-admin";
    }

    tr.innerHTML = `
      <td>
        <strong style="font-size: 15px;">${user.nombre}</strong>
        ${user.alias ? `<br><small style="color: var(--text-muted);">"${user.alias}"</small>` : ""}
      </td>
      <td>${user.compania}</td>
      <td>
        <div>${user.email}</div>
        <small style="color: var(--text-muted);">${user.celular}</small>
      </td>
      <td><span class="badge ${roleClass}">${roleText}</span></td>
      <td>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          ${activeBadge}
          <button class="btn btn-secondary btn-toggle-status" data-uid="${user.uid}" style="padding: 4px 8px; font-size: 11px;">
            Alternar
          </button>
        </div>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });

  // Asignar eventos de alternar estado activo/inactivo
  document.querySelectorAll(".btn-toggle-status").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const uid = e.target.getAttribute("data-uid");
      toggleUserActiveStatus(uid);
    });
  });
}

// ====================================================
// FUNCIÓN DE REGISTRO EXCLUSIVA (MEJOR PRÁCTICA)
// ====================================================
async function handleRegisterUser(e) {
  e.preventDefault();
  
  const name = document.getElementById("reg-name").value.trim();
  const alias = document.getElementById("reg-alias").value.trim();
  const dob = document.getElementById("reg-dob").value;
  const company = document.getElementById("reg-company").value;
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const role = document.getElementById("reg-role").value;
  const isActive = document.getElementById("reg-status").checked;

  showLoading(true);

  const newUserProfile = {
    nombre: name,
    alias: alias,
    fechaNacimiento: dob,
    compania: company,
    email: email,
    celular: phone,
    rol: role,
    activo: isActive
  };

  if (isDemoMode) {
    // ---- REGISTRO MODO DEMO ----
    setTimeout(() => {
      const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
      
      if (demoUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showLoading(false);
        showAlert("⚠️ El correo ya está registrado en el Modo Demo.");
        return;
      }

      const tempUid = "demo-uid-" + Math.random().toString(36).substr(2, 9);
      demoUsers.push({ uid: tempUid, ...newUserProfile });
      localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));

      newUserForm.reset();
      document.getElementById("reg-status").checked = true;
      
      updateMetrics(demoUsers);
      renderUsersTable(demoUsers);
      showLoading(false);
      showAlert(`🎉 Miembro ${name} registrado con éxito (Simulación).`, "success");
    }, 600);
  } else {
    // ---- REGISTRO EN FIRESTORE (FLUJO DE INVITACIÓN) ----
    // MEJOR PRÁCTICA:
    // Para evitar desloguear al Super Administrador actual usando Auth client-side,
    // creamos el perfil del usuario en la colección `/usuarios` con una ID autogenerada.
    // El usuario final podrá activar su cuenta ingresando por primera vez a través de un flujo 
    // de registro público que verifique si su correo ya ha sido pre-autorizado en Firestore, 
    // o el administrador le crea la credencial vía Consola/Admin SDK de Firebase.
    try {
      // 1. Validar que el correo no esté duplicado en Firestore
      const usersRef = collection(db, "usuarios");
      const emailQuery = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(emailQuery);
      
      if (!querySnapshot.empty) {
        showLoading(false);
        showAlert("⚠️ Error: Ya existe un miembro registrado con ese correo electrónico.");
        return;
      }

      // 2. Insertar en Firestore directamente
      // Al ser cliente-side, dejamos que Firestore genere la ID
      const newDocRef = await addDoc(collection(db, "usuarios"), newUserProfile);
      
      // Actualizamos agregando el UID al documento si es necesario para mapeos manuales
      await setDoc(doc(db, "usuarios", newDocRef.id), { uid: newDocRef.id }, { merge: true });

      newUserForm.reset();
      document.getElementById("reg-status").checked = true;
      showLoading(false);
      showAlert(`🎉 Perfil de ${name} pre-registrado correctamente en Firestore.`, "success");
    } catch (error) {
      showLoading(false);
      console.error("Error al pre-registrar miembro en Firestore:", error);
      showAlert("Error al escribir el registro en Firestore: " + error.message);
    }
  }
}

// Alternar estado de Activo/Inactivo
async function toggleUserActiveStatus(uid) {
  if (uid === currentUserProfile.uid) {
    showAlert("⚠️ No puedes desactivar tu propio perfil de administrador.");
    return;
  }

  showLoading(true);

  if (isDemoMode) {
    setTimeout(() => {
      const demoUsers = JSON.parse(localStorage.getItem("teocalli_demo_users") || "[]");
      const idx = demoUsers.findIndex(u => u.uid === uid);
      if (idx !== -1) {
        demoUsers[idx].activo = !demoUsers[idx].activo;
        localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));
        updateMetrics(demoUsers);
        renderUsersTable(demoUsers);
        showAlert("Estado del usuario modificado (Simulación).", "success");
      }
      showLoading(false);
    }, 400);
  } else {
    try {
      const userRef = doc(db, "usuarios", uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentActive = userDoc.data().activo;
        await setDoc(userRef, { activo: !currentActive }, { merge: true });
        showAlert("Estado del miembro actualizado en Firestore.", "success");
      }
      showLoading(false);
    } catch (e) {
      showLoading(false);
      console.error("Error al alternar estado en Firestore:", e);
      showAlert("No tienes permisos suficientes en Firestore para realizar esta acción.");
    }
  }
}
