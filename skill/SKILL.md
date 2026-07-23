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
   * All JavaScript logic resides in `js/controllers/companiaController.js` (monolithic SPA controller).
   * Images and visual branding assets MUST be stored under `assets/images/`.
   * HTML views are in `views/` (e.g. `views/compania.html`).
   * `index.html` is the public-facing landing page (Gala event, WhatsApp redirects).
   * `views/compania.html` is the private Dashboard for members (admin SPA).

2. **Firebase & Cloud Firestore Conventions**:
   * Always import Firebase SDK v9 modular instances from `js/services/firebaseService.js`.
   * The seat state document is at: `doc(db, 'gala', 'estadoBoletos')` — structure: `{ asientos: { [seatId]: { estado, bailarin_id, comentario } } }`.
   * Firestore updates use `updateDoc` with dot-notation paths: `asientos.A1.estado`, `asientos.A1.bailarin_id`, `asientos.A1.comentario`.
   * All users are stored in `/usuarios` collection with fields: `nombres`, `apellidoPaterno`, `alias`, `activo`, `id_rol`.

3. **Client-Side Image Optimization**:
   * Convert user avatar uploads to **200x200px Base64 WebP** using an HTML5 Canvas element before saving into `fotoPerfil` of `/usuarios`.

4. **Security & Route Guarding**:
   * Keep `.dashboard-wrapper` hidden (`display: none;`) by default until `onAuthStateChanged` validates the active session.
   * Default new account password is `teocalli2026`. Force password change on first login.

5. **Deployment**:
   * After ANY code change, run `firebase deploy --only hosting` from the project root.
   * The live URL is: `https://teocalli-sabia-de-mi-tierra.web.app`
   * The script tag uses a version param `?v=X.X` to bust cache — bump it when deploying significant JS changes.

---

## 🎟️ Módulo de Administración de Boletos Gala (Implementado Jul 2026)

### Qué se implementó

En `views/compania.html` → sección "Boleto Gala", se agregó un **sistema de dos tabs**:

- **Tab 1 – Mapa de Asientos**: Vista visual interactiva con panzoom, coloreado por estado (libre/reservado/vendido).
- **Tab 2 – Administración de Asientos**: Tabla con filtros, exportación Excel y modales de gestión.

### Componentes clave en el HTML

```html
<!-- Botón de Asignación Masiva -->
<button id="btn-mass-assign" ...>Asignación Masiva</button>

<!-- Modal individual por asiento -->
<div id="boleto-modal" class="modal-overlay" style="display: none;">...</div>

<!-- Modal de asignación masiva -->
<div id="mass-assign-modal" class="modal-overlay" style="display: none;">
  <form id="mass-assign-form">
    <textarea id="mass-assign-input">...</textarea>       <!-- Asientos separados por coma -->
    <select id="mass-assign-user-select">...</select>     <!-- Usuario a asignar -->
    <select id="mass-assign-status-select">...</select>   <!-- Estado: libre/reservado/vendido -->
  </form>
</div>
```

### Variables JS declaradas al inicio del módulo (companiaController.js, líneas ~70-100)

```js
const boletoModal            = document.getElementById("boleto-modal");
const btnMassAssign          = document.getElementById("btn-mass-assign");
const massAssignModal        = document.getElementById("mass-assign-modal");
const btnCloseMassAssignModal= document.getElementById("btn-close-mass-assign-modal");
const massAssignUserSelect   = document.getElementById("mass-assign-user-select");
```

### Event Listeners (dentro de `setupBoletosTabsAndFilters()`)

```js
// Abrir modal de asignación masiva
if (btnMassAssign && massAssignModal) {
  btnMassAssign.addEventListener("click", () => {
    massAssignModal.style.display = "flex";
  });
}
// Cerrar modal masivo
if (btnCloseMassAssignModal && massAssignModal) {
  btnCloseMassAssignModal.addEventListener("click", () => {
    massAssignModal.style.display = "none";
  });
}
// Cerrar al clic fuera del modal
window.addEventListener("click", (e) => {
  if (e.target === massAssignModal) massAssignModal.style.display = "none";
  if (e.target === boletoModal) boletoModal.style.display = "none";
});
```

### 🐛 BUG PENDIENTE: Botón "Asignación Masiva" no abre su modal al primer clic

**Síntoma**: El modal `#mass-assign-modal` solo aparece después de haber hecho clic en algún botón "Editar" de la tabla. Al primer clic en "Asignación Masiva" desde una página recién cargada, no ocurre nada visible.

**Causa probable investigada pero no confirmada**:
- Las variables `btnMassAssign` y `massAssignModal` se capturan con `getElementById` al cargar el módulo. Si el elemento existe en el DOM (aunque el tab padre esté `display:none`), deberían capturarse correctamente.
- Se descartó: cache del navegador (se forzó recarga), errores de sintaxis JS (node -c pasó), z-index insuficiente.
- **Hipótesis activa**: Puede que `btnMassAssign` sea `null` en el momento de captura si el DOM aún no tiene el elemento renderizado (problema de timing con el tab oculto), lo que haría que `addEventListener` nunca se registre.

**Próximo paso de diagnóstico**: Abrir DevTools en la página en vivo, ir a la consola y ejecutar:
```js
console.log(document.getElementById('btn-mass-assign'));
console.log(document.getElementById('mass-assign-modal'));
```
Si alguno retorna `null`, la causa es que el elemento no existe en el DOM en el momento de ejecución del módulo.

**Solución alternativa a probar**: Envolver el `addEventListener` en un `DOMContentLoaded` o mover la captura de la variable dentro de la función `setupBoletosTabsAndFilters()` en lugar de al inicio del módulo.

---

## 🧭 Workflows de Agente

### Añadir un nuevo módulo al Dashboard SPA

1. **HTML**: Agregar botón en `sidebar-menu` con `id="btn-mynewmodule"` y sección `<section id="db-section-mynewmodule" class="db-section">` en `views/compania.html`.
2. **CSS**: Añadir estilos en `css/style.css` usando tokens de diseño (`var(--primary)`, `var(--bg-card)`, `var(--radius-md)`).
3. **JS**: En `companiaController.js`, declarar variable, actualizar `switchDbSection()`, implementar listeners.
4. **Deploy**: `firebase deploy --only hosting`

### Modificar Reglas de Firestore

1. Editar `firestore.rules`.
2. Validar roles con `request.auth.uid` contra `/usuarios/$(request.auth.uid)`.
3. Soportar campos `id_rol` y `rol` por compatibilidad.

### Notificaciones Toast (sistema implementado)

```js
window.showToast("Mensaje", "success" | "warning" | "danger");
```
Aparece en esquina inferior derecha, se auto-oculta a los 4 segundos.

---

## 📄 Archivos Clave

| Archivo | Descripción |
|---|---|
| `views/compania.html` | Dashboard SPA completo (HTML + modales) |
| `js/controllers/companiaController.js` | Toda la lógica del dashboard |
| `css/style.css` | Estilos globales + tokens de diseño |
| `js/services/firebaseService.js` | Instancias Firebase (auth, db, storage) |
| `firestore.rules` | Reglas de seguridad Firestore |
| `firebase.json` | Configuración de hosting Firebase |
