// compania.js - Panel de control y Route Guard para Compañía Teocalli
import { auth, db } from "./firebase-config.js";

// Firebase Auth & Firestore v9.23.0 modular CDN Imports
import { 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

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
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

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
const userRegistrationCard = document.getElementById("user-registration-card");

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
  console.warn("🔧 Ejecutando Dashboard en Modo Demo (Local Storage).");
  const demoSession = sessionStorage.getItem("demo_active_user");
  if (!demoSession) {
    // Redirigir a la ruta limpia /login si no hay sesión
    window.location.href = "/login";
  } else {
    currentUserProfile = JSON.parse(demoSession);
    initializeDashboard(currentUserProfile);
  }
} else {
  showLoading(true);
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Route Guard: Redirección inmediata si no hay usuario
      window.location.href = "/login";
    } else {
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();

          // Validar activo
          if (userData.activo !== true) {
            await signOut(auth);
            sessionStorage.clear();
            window.location.href = "/login";
            return;
          }

          currentUserProfile = { uid: user.uid, ...userData };
          initializeDashboard(currentUserProfile);
        } else {
          await signOut(auth);
          sessionStorage.clear();
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
// ORQUESTACIÓN DE RENDERIZADO DINÁMICO POR ROL
// ====================================================
function initializeDashboard(profile) {
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

  // Lógica de visualización / ocultación y remoción del DOM:
  if (profile.rol === "super_admin") {
    // Si es super_admin: Habilitar y mostrar la sección de creación
    if (sidebarOptUsers) sidebarOptUsers.style.display = "block";
    if (userRegistrationCard) userRegistrationCard.style.display = "block";
    setupSuperAdminFeatures();
  } else {
    // Si es admin o bailarin: Remover del DOM por completo los controles de creación/edición de usuarios
    if (sidebarOptUsers) sidebarOptUsers.remove();
    if (dbSectionUsers) dbSectionUsers.remove();
    if (userRegistrationCard) userRegistrationCard.remove();
    
    metricTotalDancers.textContent = "--";
    metricActiveDancers.textContent = "--";
    
    showLoading(false);
  }
}

// Cerrar sesión
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
// LOGICA ADMINISTRATIVA (Super Admin)
// ====================================================
function setupSuperAdminFeatures() {
  navDbGeneral.addEventListener("click", (e) => {
    e.preventDefault();
    switchSection("general");
  });

  navDbUsers.addEventListener("click", (e) => {
    e.preventDefault();
    switchSection("users");
  });

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
      console.error("Error en Snapshot:", error);
      showAlert("No se pudieron cargar los datos de Firestore. Verifica tus permisos.");
    });
  }

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

  document.querySelectorAll(".btn-toggle-status").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const uid = e.target.getAttribute("data-uid");
      toggleUserActiveStatus(uid);
    });
  });
}

// Registro por invitación (escribiendo perfil en Firestore directamente)
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
    // ---- MODO DEMO ----
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
    // ---- REGISTRO REAL EN FIRESTORE ----
    try {
      const usersRef = collection(db, "usuarios");
      const emailQuery = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(emailQuery);
      
      if (!querySnapshot.empty) {
        showLoading(false);
        showAlert("⚠️ Error: Ya existe un miembro registrado con ese correo electrónico.");
        return;
      }

      const newDocRef = await addDoc(collection(db, "usuarios"), newUserProfile);
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

// Alternar estado activo
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
      console.error("Error en Firestore:", e);
      showAlert("No tienes privilegios suficientes en Firestore para realizar esta acción.");
    }
  }
}
