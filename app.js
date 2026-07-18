// app.js - Lógica de control y Firebase para Compañía Teocalli
import { auth, db } from "./firebase-config.js";

// Firebase imports desde CDN para uso dinámico
import { 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  addDoc, 
  getDocs, 
  onSnapshot,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ====================================================
// CONFIGURACIÓN DE MODO DEMO / SIMULACIÓN
// ====================================================
let isDemoMode = false;
let demoUsers = [];

// Detectar si las credenciales de Firebase siguen siendo los placeholders
try {
  // Intentar obtener el config para verificar si tiene placeholders
  const isPlaceholder = auth.app.options.apiKey === "TU_API_KEY_AQUI" || !auth.app.options.apiKey;
  if (isPlaceholder) {
    isDemoMode = true;
  }
} catch (e) {
  isDemoMode = true;
}

// Inicializar base de datos simulada en LocalStorage si estamos en Modo Demo
if (isDemoMode) {
  console.warn("⚠️ Ejecutando en Modo Demostración. Configura las credenciales de Firebase en firebase-config.js para usar la base de datos real.");
  
  const storedUsers = localStorage.getItem("teocalli_demo_users");
  if (!storedUsers) {
    demoUsers = [
      {
        uid: "demo-uid-super-admin",
        nombre: "Javier Alvarado (Super)",
        alias: "Javi Admin",
        fechaNacimiento: "1990-05-15",
        compania: "1ra Compañía",
        email: "admin@teocalli.org",
        celular: "3312345678",
        rol: "super_admin",
        activo: true
      },
      {
        uid: "demo-uid-admin",
        nombre: "Director Artístico",
        alias: "Dir Arte",
        fechaNacimiento: "1985-08-20",
        compania: "Segunda Compañía",
        email: "director@teocalli.org",
        celular: "3322334455",
        rol: "admin",
        activo: true
      },
      {
        uid: "demo-uid-dancer",
        nombre: "Sofía Hernández",
        alias: "Sofi",
        fechaNacimiento: "2000-11-02",
        compania: "1ra Compañía",
        email: "danza@teocalli.org",
        celular: "3399887766",
        rol: "bailarin",
        activo: true
      },
      {
        uid: "demo-uid-inactive",
        nombre: "Juan Pérez",
        alias: "Juanito",
        fechaNacimiento: "1998-02-14",
        compania: "Prebase",
        email: "inactivo@teocalli.org",
        celular: "3344556677",
        rol: "bailarin",
        activo: false
      }
    ];
    localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));
  } else {
    demoUsers = JSON.parse(storedUsers);
  }
}

// Estado del usuario activo en memoria de la app
let currentUserProfile = null;
let unsubscribeUsersSnapshot = null;

// ====================================================
// CONTROLADOR DE VISTAS (SPA ROUTING)
// ====================================================
const views = {
  public: document.getElementById("public-view"),
  login: document.getElementById("login-view"),
  dashboard: document.getElementById("dashboard-view")
};

function navigateTo(viewName) {
  // Ocultar todas las secciones
  Object.keys(views).forEach(key => {
    views[key].classList.remove("active");
  });
  
  // Mostrar la sección seleccionada
  if (views[viewName]) {
    views[viewName].classList.add("active");
  }

  // Ajustar barra de navegación pegajosa en página pública
  if (viewName === "public") {
    document.getElementById("main-navbar").style.display = "block";
  } else {
    document.getElementById("main-navbar").style.display = "none";
  }
  
  // Volver al tope de la página
  window.scrollTo(0, 0);
}

// ====================================================
// ELEMENTOS DEL DOM
// ====================================================
const btnToLogin = document.getElementById("btn-to-login");
const btnBackToPublic = document.getElementById("btn-back-to-public");
const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const loginPasswordInput = document.getElementById("login-password");
const loginAlert = document.getElementById("login-alert");
const dbAlert = document.getElementById("db-alert");
const btnLogout = document.getElementById("btn-logout");
const loadingOverlay = document.getElementById("loading-overlay");

// Elementos de Perfil en Dashboard
const profileName = document.getElementById("profile-name");
const profileRole = document.getElementById("profile-role");
const avatarInitials = document.getElementById("avatar-initials");
const dbWelcomeTitle = document.getElementById("db-welcome-title");
const dbWelcomeDesc = document.getElementById("db-welcome-desc");
const badgeActiveStatus = document.getElementById("badge-active-status");

// Métricas
const metricTotalDancers = document.getElementById("metric-total-dancers");
const metricActiveDancers = document.getElementById("metric-active-dancers");

// Sidebar & Navegación interna Dashboard
const navDbGeneral = document.getElementById("nav-db-general");
const navDbUsers = document.getElementById("nav-db-users");
const optUsersMenu = document.getElementById("sidebar-opt-users");
const dbSections = {
  general: document.getElementById("db-section-general"),
  users: document.getElementById("db-section-users")
};

// Formulario de Registro & Tabla
const newUserForm = document.getElementById("new-user-form");
const usersTableBody = document.getElementById("users-table-body");
const usersCountBadge = document.getElementById("users-count-badge");

// ====================================================
// UTILIDADES UI
// ====================================================
function showLoading(show) {
  loadingOverlay.style.display = show ? "flex" : "none";
}

function showAlert(container, message, type = "danger") {
  container.innerHTML = message;
  container.className = `alert alert-${type}`;
  container.style.display = "block";
  
  // Ocultar automáticamente después de 6 segundos
  setTimeout(() => {
    container.style.display = "none";
  }, 6000);
}

// Cambiar pestañas internas del Dashboard
function switchDbSection(sectionName) {
  Object.keys(dbSections).forEach(key => {
    dbSections[key].classList.remove("active");
  });
  
  document.querySelectorAll(".sidebar-link").forEach(link => {
    link.classList.remove("active");
  });

  if (dbSections[sectionName]) {
    dbSections[sectionName].classList.add("active");
  }

  if (sectionName === "general") navDbGeneral.classList.add("active");
  if (sectionName === "users") navDbUsers.classList.add("active");
}

// ====================================================
// AUTENTICACIÓN Y SESIÓN
// ====================================================

// Login handler
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = loginEmailInput.value.trim();
  const password = loginPasswordInput.value;
  
  showLoading(true);
  
  if (isDemoMode) {
    // Autenticación en modo simulación
    setTimeout(() => {
      const user = demoUsers.find(u => u.email === email);
      
      // Para fines de la demo, permitimos cualquier contraseña mayor a 5 caracteres
      if (user && password.length >= 6) {
        handleUserSession(user);
      } else if (user) {
        showLoading(false);
        showAlert(loginAlert, "Contraseña incorrecta. (Demo: Usa cualquier clave de 6+ caracteres)");
      } else {
        showLoading(false);
        showAlert(loginAlert, "El usuario no existe. Intenta con: <strong>admin@teocalli.org</strong> (clave: 123456)");
      }
    }, 800);
  } else {
    // Autenticación real con Firebase
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;
      
      // Obtener el perfil del usuario desde Firestore
      const userDocRef = doc(db, "usuarios", uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        handleUserSession({ uid, ...userData });
      } else {
        // El usuario está en Auth pero no tiene perfil en Firestore
        showLoading(false);
        await signOut(auth);
        showAlert(loginAlert, "Tu perfil de usuario no se encuentra configurado en la base de datos.");
      }
    } catch (error) {
      showLoading(false);
      let errorMsg = "Error al iniciar sesión. Verifica tus datos.";
      if (error.code === "auth/user-not-found" || error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        errorMsg = "Correo o contraseña incorrectos.";
      }
      showAlert(loginAlert, errorMsg);
    }
  }
});

// Logout handler
btnLogout.addEventListener("click", async () => {
  showLoading(true);
  
  // Desuscribirse del listener en tiempo real si existe
  if (unsubscribeUsersSnapshot) {
    unsubscribeUsersSnapshot();
    unsubscribeUsersSnapshot = null;
  }

  if (isDemoMode) {
    setTimeout(() => {
      currentUserProfile = null;
      showLoading(false);
      loginForm.reset();
      navigateTo("public");
    }, 500);
  } else {
    try {
      await signOut(auth);
      currentUserProfile = null;
      showLoading(false);
      loginForm.reset();
      navigateTo("public");
    } catch (error) {
      showLoading(false);
      console.error("Error al cerrar sesión", error);
    }
  }
});

// Procesar sesión de usuario (valida activo y roles)
async function handleUserSession(userProfile) {
  // REGLA: Si no está activo, bloquear acceso
  if (!userProfile.activo) {
    showLoading(false);
    if (!isDemoMode) {
      await signOut(auth);
    }
    showAlert(loginAlert, "🚫 <strong>Acceso denegado:</strong> Tu cuenta ha sido desactivada por el administrador.");
    return;
  }
  
  currentUserProfile = userProfile;
  
  // Actualizar interfaz del Dashboard con datos de perfil
  profileName.textContent = userProfile.nombre;
  
  // Formatear rol visible
  let rolText = "Bailarín";
  if (userProfile.rol === "super_admin") rolText = "Super Administrador";
  if (userProfile.rol === "admin") rolText = "Administrador";
  profileRole.textContent = rolText;
  
  // Iniciales del avatar
  const initials = userProfile.nombre.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  avatarInitials.textContent = initials || "U";
  
  // Titulo bienvenida
  dbWelcomeTitle.textContent = `¡Hola, ${userProfile.alias || userProfile.nombre}!`;
  dbWelcomeDesc.textContent = `Acceso como ${rolText} de la Compañía Teocalli`;
  
  // Badge de Estado Activo
  badgeActiveStatus.textContent = "Perfil Activo";
  badgeActiveStatus.className = "badge badge-active";
  
  // Control de privilegios según Rol
  if (userProfile.rol === "super_admin") {
    optUsersMenu.style.display = "block";
  } else {
    optUsersMenu.style.display = "none";
    switchDbSection("general"); // Asegurar que no se quede en sección restringida
  }
  
  // Cargar métricas y configurar listeners de datos
  loadDashboardData();
  
  showLoading(false);
  navigateTo("dashboard");
  
  // Mostrar banner de aviso en Dashboard si estamos en modo Demo
  if (isDemoMode) {
    showAlert(dbAlert, "⚙️ <strong>Modo Demo Activo:</strong> Estás interactuando con datos temporales almacenados en el navegador (Local Storage). Modifica <code>firebase-config.js</code> para conectar tu proyecto real.", "warning");
  }
}

// Escuchar estado de autenticación real con Firebase (solo si no es demo)
if (!isDemoMode) {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      showLoading(true);
      try {
        const userDocRef = doc(db, "usuarios", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          handleUserSession({ uid: user.uid, ...userDoc.data() });
        } else {
          showLoading(false);
          await signOut(auth);
          navigateTo("public");
        }
      } catch (e) {
        showLoading(false);
        console.error("Error cargando perfil tras auth state change", e);
        navigateTo("public");
      }
    } else {
      navigateTo("public");
    }
  });
} else {
  // En modo demo, iniciar en vista pública
  navigateTo("public");
}

// ====================================================
// CONTROLADOR DE DATOS (DASHBOARD)
// ====================================================

function loadDashboardData() {
  if (isDemoMode) {
    // Datos simulados en tiempo real (Local Storage)
    updateMetricsUI(demoUsers);
    renderUsersTable(demoUsers);
  } else {
    // Carga de base de datos Firestore real
    try {
      const q = collection(db, "usuarios");
      
      // Listener en tiempo real si el usuario es Super Admin o Admin (quien puede leer todos los usuarios)
      if (currentUserProfile.rol === "super_admin" || currentUserProfile.rol === "admin") {
        unsubscribeUsersSnapshot = onSnapshot(q, (snapshot) => {
          const usersList = [];
          snapshot.forEach((doc) => {
            usersList.push({ uid: doc.id, ...doc.data() });
          });
          updateMetricsUI(usersList);
          renderUsersTable(usersList);
        }, (error) => {
          console.error("Error al escuchar cambios en Firestore:", error);
          showAlert(dbAlert, "Error al cargar la lista de miembros de la base de datos.");
        });
      } else {
        // Si es Bailarín, solo puede leer sus propios datos y métricas públicas estáticas
        metricTotalDancers.textContent = "--";
        metricActiveDancers.textContent = "--";
        usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No tienes permisos para ver esta sección.</td></tr>`;
      }
    } catch (e) {
      console.error("Error cargando datos de Firestore", e);
    }
  }
}

function updateMetricsUI(users) {
  const total = users.length;
  const active = users.filter(u => u.activo === true).length;
  
  metricTotalDancers.textContent = total;
  metricActiveDancers.textContent = active;
  usersCountBadge.textContent = `${total} miembros`;
}

function renderUsersTable(users) {
  usersTableBody.innerHTML = "";
  
  if (users.length === 0) {
    usersTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-muted);">No hay miembros registrados.</td></tr>`;
    return;
  }
  
  users.forEach(user => {
    const tr = document.createElement("tr");
    
    // Formatear columnas
    const aliasHtml = user.alias ? `<br><small style="color: var(--text-muted);">"${user.alias}"</small>` : "";
    const activeBadge = user.activo 
      ? `<span class="badge badge-active">Activo</span>` 
      : `<span class="badge badge-inactive">Inactivo</span>`;
      
    let roleBadge = "Bailarín";
    let roleClass = "badge-role-bailarin";
    if (user.rol === "super_admin") {
      roleBadge = "Super Admin";
      roleClass = "badge-role-superadmin";
    } else if (user.rol === "admin") {
      roleBadge = "Admin";
      roleClass = "badge-role-admin";
    }

    tr.innerHTML = `
      <td>
        <strong style="font-size: 15px;">${user.nombre}</strong>
        ${aliasHtml}
      </td>
      <td>${user.compania}</td>
      <td>
        <div>${user.email}</div>
        <small style="color: var(--text-muted);">${user.celular}</small>
      </td>
      <td><span class="badge ${roleClass}">${roleBadge}</span></td>
      <td>
        <div style="display: flex; align-items: center; justify-content: space-between;">
          ${activeBadge}
          ${currentUserProfile.rol === "super_admin" ? `
            <button class="btn btn-secondary btn-toggle-status" data-uid="${user.uid}" style="padding: 4px 8px; font-size: 11px; margin-left: 10px;">
              Alternar
            </button>
          ` : ""}
        </div>
      </td>
    `;
    usersTableBody.appendChild(tr);
  });

  // Agregar listeners a los botones de alternar estado (exclusivo Super Admin)
  document.querySelectorAll(".btn-toggle-status").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const uid = e.target.getAttribute("data-uid");
      toggleUserStatus(uid);
    });
  });
}

// Cambiar estado activo/desactivado de un usuario
async function toggleUserStatus(uid) {
  if (uid === currentUserProfile.uid) {
    showAlert(dbAlert, "⚠️ No puedes desactivar tu propia cuenta de administrador.");
    return;
  }

  showLoading(true);

  if (isDemoMode) {
    setTimeout(() => {
      const index = demoUsers.findIndex(u => u.uid === uid);
      if (index !== -1) {
        demoUsers[index].activo = !demoUsers[index].activo;
        localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));
        loadDashboardData();
        showAlert(dbAlert, "Estado del usuario actualizado correctamente.", "success");
      }
      showLoading(false);
    }, 400);
  } else {
    try {
      const userRef = doc(db, "usuarios", uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const currentStatus = userDoc.data().activo;
        await setDoc(userRef, { activo: !currentStatus }, { merge: true });
        showAlert(dbAlert, "Estado del usuario actualizado en Firestore.", "success");
      }
      showLoading(false);
    } catch (e) {
      showLoading(false);
      console.error("Error al actualizar estado en Firestore", e);
      showAlert(dbAlert, "No tienes permisos para modificar este usuario (verifica las reglas de seguridad).");
    }
  }
}

// ====================================================
// FORMULARIO DE REGISTRO DE NUEVOS MIEMBROS
// ====================================================
newUserForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const name = document.getElementById("reg-name").value.trim();
  const alias = document.getElementById("reg-alias").value.trim();
  const dob = document.getElementById("reg-dob").value;
  const company = document.getElementById("reg-company").value;
  const email = document.getElementById("reg-email").value.trim();
  const phone = document.getElementById("reg-phone").value.trim();
  const role = document.getElementById("reg-role").value;
  const isActiveStatus = document.getElementById("reg-status").checked;

  showLoading(true);

  const newUserProfile = {
    nombre: name,
    alias: alias,
    fechaNacimiento: dob,
    compania: company,
    email: email,
    celular: phone,
    rol: role,
    activo: isActiveStatus
  };

  if (isDemoMode) {
    setTimeout(() => {
      // Validar email único en la demo
      if (demoUsers.some(u => u.email.toLowerCase() === email.toLowerCase())) {
        showLoading(false);
        showAlert(dbAlert, "⚠️ Error: Ya existe un miembro registrado con ese correo electrónico.");
        return;
      }

      // Crear nuevo usuario simulado
      const newUid = "demo-uid-" + Math.random().toString(36).substr(2, 9);
      const userToRegister = { uid: newUid, ...newUserProfile };
      
      demoUsers.push(userToRegister);
      localStorage.setItem("teocalli_demo_users", JSON.stringify(demoUsers));
      
      newUserForm.reset();
      // Restaurar checkbox estado activo por defecto
      document.getElementById("reg-status").checked = true;
      
      loadDashboardData();
      showLoading(false);
      showAlert(dbAlert, `🎉 <strong>${name}</strong> ha sido registrado con éxito.`, "success");
    }, 600);
  } else {
    // Flujo real en Firebase
    try {
      // REGLA: Para no desconectar la sesión del Super Admin actual al registrar una cuenta de Auth
      // crearemos el perfil del usuario en Firestore. El proceso de vinculación de autenticación
      // se realiza asociándolo a su correo. Cuando el nuevo usuario se registre por primera vez o se le cree
      // su cuenta a través de un script administrativo o Firebase Console, se mapeará con este UID.
      // 
      // NOTA: Para un flujo óptimo de producción client-side, generamos un ID basado en una estructura legible
      // o un hash. En este caso creamos el documento con una ID autogenerada.
      
      // Validar si el correo ya existe en Firestore
      const usersRef = collection(db, "usuarios");
      const q = query(usersRef, where("email", "==", email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        showLoading(false);
        showAlert(dbAlert, "⚠️ Error: Ya existe un perfil de usuario registrado con ese correo electrónico.");
        return;
      }

      // Escribir el nuevo perfil en Firestore
      const docRef = await addDoc(collection(db, "usuarios"), newUserProfile);
      
      // Opcional: Escribimos también su UID si lo manejáramos con vinculación por Auth.
      // Aquí estamos escribiendo un documento que el Super Admin podrá ver y que el usuario
      // podrá reclamar o vincular usando su UID al iniciar sesión.
      
      newUserForm.reset();
      document.getElementById("reg-status").checked = true;
      showLoading(false);
      showAlert(dbAlert, `🎉 Perfil de <strong>${name}</strong> registrado exitosamente en Firestore.`, "success");
    } catch (error) {
      showLoading(false);
      console.error("Error al registrar usuario en Firestore:", error);
      showAlert(dbAlert, "Error al registrar el perfil en la base de datos: " + error.message);
    }
  }
});

// ====================================================
// EVENT LISTENERS GENERALES Y NAVEGACIÓN
// ====================================================

// Navegar a Login
btnToLogin.addEventListener("click", () => {
  loginForm.reset();
  loginAlert.style.display = "none";
  navigateTo("login");
});

// Volver desde Login a Sitio Público
btnBackToPublic.addEventListener("click", (e) => {
  e.preventDefault();
  navigateTo("public");
});

// Navegación Sidebar del Dashboard
navDbGeneral.addEventListener("click", (e) => {
  e.preventDefault();
  switchDbSection("general");
});

navDbUsers.addEventListener("click", (e) => {
  e.preventDefault();
  switchDbSection("users");
});

// Efecto sticky en barra de navegación pública al hacer scroll
window.addEventListener("scroll", () => {
  const navbar = document.getElementById("main-navbar");
  if (window.scrollY > 20) {
    navbar.classList.add("scrolled");
  } else {
    navbar.classList.remove("scrolled");
  }
});
