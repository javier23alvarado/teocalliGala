---
name: teocalli-gala-assistant
description: Operational rules, architectural patterns, and development guidance for maintaining, extending, and deploying the Ballet Folclórico Compañía Teocalli web application. Use when working on the Teocalli codebase, adding modules, updating database schemas, handling image uploads, or deploying.
---

# Teocalli Gala Assistant Skill

This skill provides comprehensive operational guidelines, architectural constraints, and step-by-step instructions for AI agents working on the **Ballet Folclórico Compañía Teocalli** codebase (`javier23alvarado/teocalliGala`).

---

## 📌 Core Architectural Principles

1. **Directory Organization Constraint**:
   * All CSS styles MUST be placed in `css/style.css`.
   * All JavaScript logic files MUST reside in `js/` (e.g. `js/firebase-config.js`, `js/login.js`, `js/compania.js`, `js/public-gala.js`).
   * Images and visual branding assets MUST be stored under `assets/images/`.
   * HTML pages (`index.html`, `login.html`, `compania.html`) remain at the workspace root.
   * `index.html` is the public-facing landing page (currently heavily optimized for the "Gala" event with static modals and WhatsApp redirects).
   * `compania.html` is the strict, isolated private Dashboard for members.

2. **Firebase & Cloud Firestore Conventions**:
   * Always import Firebase SDK v9 modular instances from `./firebase-config.js` when working inside `js/`.
   * Always ensure `firestore.rules` is updated whenever new Firestore collections or access permissions are introduced.
   * Maintain the Demo Mode fallback logic (`isDemoMode` checked against placeholder API keys) so the application remains 100% functional offline via `localStorage`.

3. **Client-Side Image Optimization**:
   * NEVER upload raw high-resolution binary files directly to GCS Firebase Storage without preflight handling due to CORS constraints.
   * Convert user avatar uploads to **200x200px Base64 WebP** using an HTML5 Canvas element before saving into the `fotoPerfil` attribute of `/usuarios`.

4. **Security & Route Guarding**:
   * Keep `.dashboard-wrapper` hidden (`display: none;`) by default until `onAuthStateChanged` validates the active session to prevent flickering durante redirect transitions.
   * **Login and Password Interception**: New accounts are generated with the default password `teocalli2026`. You must intercept this password manually inside the submit handler to force a password change. To prevent `onAuthStateChanged` from prematurely redirecting users during a manual login, use the `isManualLogin` flag to temporarily disable automatic redirects.

---

## 🧭 Step-by-Step AI Agent Workflows

### Scenario 1: Adding a New Feature or Module to the SPA Dashboard (`compania.html` / `js/compania.js`)
1. **Markup**: Add the navigation button in `compania.html` inside `<ul class="sidebar-menu">` with an ID like `#btn-mynewmodule`. Add a `<section id="db-section-mynewmodule" class="db-section">` in `compania.html`.
2. **Styles**: Add modern, clean responsive CSS in `css/style.css` following the predefined design tokens (`var(--primary)`, `var(--bg-card)`, `var(--radius-md)`).
3. **Navigation Logic**: Declare `const navDbMyNewModule = document.getElementById("btn-mynewmodule");` in `js/compania.js`. Update `switchDbSection(sectionName)` to handle `"mynewmodule"`.
4. **Data Sync**: Implement real-time listeners using `onSnapshot` for Firestore, and provide a `localStorage` fallback branch if `isDemoMode` is active.

### Scenario 2: Modifying Database Security Rules (`firestore.rules`)
1. Edit `firestore.rules`.
2. Ensure roles are validated against `request.auth.uid` looking up `/databases/$(database)/documents/usuarios/$(request.auth.uid)`.
3. Support both `id_rol` and `rol` field aliases for backward compatibility.

### Scenario 3: Deploying Changes to Staging / Production
1. Commit all modified files to Git.
2. Run `firebase deploy` in the shell or prompt the user to execute it.

---

## 📄 Reference Files

* **Master Technical Documentation**: [DOCUMENTATION.md](file:///c:/software/teocalli/DOCUMENTATION.md)
* **Database Rules**: [firestore.rules](file:///c:/software/teocalli/firestore.rules)
* **Global Styles**: [style.css](file:///c:/software/teocalli/css/style.css)
* **Dashboard Logic**: [compania.js](file:///c:/software/teocalli/js/compania.js)
