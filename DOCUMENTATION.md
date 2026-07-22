# DOCUMENTACIÓN MASTER - PLATAFORMA TEOCALLI (SABIA DE MI TIERRA)

**Proyecto**: Ballet Folclórico Compañía Teocalli  
**Repositorio**: `javier23alvarado/teocalliGala`  
**Última actualización**: 21 de Julio del 2026 (Estado de Producción)  

---

## 📋 1. Visión General del Proyecto

Plataforma web integral para el Ballet Folclórico Compañía Teocalli. Combina una vista pública para difusión cultural, venta de talleres y fechas de cartelera abiertas (actualmente con un layout minimalista de alto impacto visual diseñado exclusivamente para el evento Gala), con un portal privado para la administración de miembros, perfiles individuales, gestión de compañías y un módulo completo de agenda con calendarios interactivos y notificaciones.

### Stack Tecnológico
* **Frontend**: HTML5 Semántico, CSS3 Vanilla (tokens personalizados, HSL, Glassmorphism), JavaScript ES Modules.
* **Backend & Servidores**: Firebase (Authentication, Cloud Firestore, Firebase Hosting).
* **Almacenamiento de Imágenes**: Firestore Base64 comprimido a WebP (200x200px) para evitar preflights CORS en GCS.

---

## 📁 2. Estructura de Directorios

```
c:/software/teocalli/
├── assets/
│   └── images/
│       └── teocalli.jfif        # Isotipo / Marca de la compañía
├── css/
│   └── style.css                # Sistema de diseño global, modales y calendarios
├── js/
│   ├── firebase-config.js       # Configuración centralizada e inicio de Firebase SDK v9
│   ├── login.js                 # Lógica de inicio de sesión y forzado de primer cambio de contraseña
│   └── compania.js              # Lógica de SPA (Resumen, Usuarios, Perfil, Agenda)
├── skill/
│   └── SKILL.md                 # Guía operativa y reglas para Agentes de IA
├── index.html                   # Landing page pública y Cartelera Abierta (Layout Minimalista Gala)
├── login.html                   # Formulario de inicio de sesión y cambio de clave obligatorio
├── compania.html                # Panel privado de control (Dashboard SPA, estado puro maestro)
├── firestore.rules              # Reglas de seguridad de Cloud Firestore
├── firebase.json                # Configuración de Firebase Hosting y Clean URLs
├── init-superadmin.js           # Script Node.js para sembrar el primer Super Administrador
└── DOCUMENTATION.md             # Este documento técnico master
```

---

## 🔐 3. Autenticación y Esquema de Roles

### Colección `/usuarios`

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `uid` | String | ID único devuelto por Firebase Auth |
| `nombre` | String | Nombres del miembro |
| `apellidoPaterno`| String | Apellido paterno |
| `apellidoMaterno`| String | Apellido materno |
| `correo` | String | Correo electrónico institucional o personal |
| `id_rol` | String | `super_admin`, `admin`, o `bailarin` |
| `id_compania` | String | `1ra-compania`, `segunda-compania`, `prebase`, o `todos` |
| `genero` | String | `femenino`, `masculino`, u `otro` |
| `fechaNacimiento`| String | Formato `YYYY-MM-DD` (usado para filtro de edad) |
| `activo` | Boolean| Estado del usuario en el sistema |
| `fotoPerfil` | String | Imagen codificada en Base64 WebP (200x200px) |
| `fechaCreacion` | Timestamp| Fecha de registro en el sistema |

### Roles y Permisos (`id_rol`)

1. **Super Administrador (`super_admin`)**:
   * Acceso total a la plataforma.
   * Gestión completa de usuarios (Crear, Editar, Activar/Desactivar, Eliminar).
   * Creación, edición y eliminación de eventos en la Agenda.
2. **Administrador (`admin`)**:
   * Gestión de la Agenda (Crear, Editar, Eliminar eventos de su compañía).
   * Consulta de miembros.
3. **Bailarín (`bailarin`)**:
   * Visualización de su perfil individual y actualización de datos/foto de perfil.
   * Visualización de agenda personalizada (Ensayos de su compañía y Presentaciones convocadas).

### Flujo de Contraseña por Defecto
* Al registrar un nuevo usuario desde la consola administrativa, la contraseña inicial asignada es **`teocalli2026`**.
* Al iniciar sesión por primera vez, el sistema detecta que el usuario no ha personalizado su contraseña y despliega el formulario obligatorio de cambio de clave antes de conceder acceso al dashboard.

---

## 📅 4. Módulo de Agenda y Calendario

### Colección `/agenda`

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | String | ID de documento en Firestore |
| `tipo` | String | `ensayo`, `presentacion`, o `taller` |
| `titulo` | String | Nombre o resumen del evento |
| `fecha` | String | Fecha única en formato `YYYY-MM-DD` |
| `hora` | String | Hora de inicio (formato `HH:MM`) |
| `id_compania` | String | Compañía convocada (`1ra-compania`, `segunda-compania`, `prebase`, `todos`) |
| `ubicacion` | String | Dirección o recinto (solo para Presentaciones y Talleres) |
| `descripcion` | String | Detalles del repertorio o notas |
| `costo` | Number | Precio del taller en MXN (0 si es gratuito) |
| `invitados` | Array<String>| UIDs de bailarines convocados (solo Presentaciones) |
| `creadoPor` | String | UID del creador |
| `creadoEn` | Timestamp | Fecha de creación |

### Funcionalidades Clave de Agenda
* **Calendario Mensual Interactivo**: Renderiza los días del mes actual con badges identificadores según la actividad (Rosa = Ensayo, Púrpura = Presentación, Naranja = Taller).
* **Ensayos Recurrentes por Período**: Al crear un ensayo, los administradores pueden activar la casilla de recurrencia e ingresar una *Fecha Inicio* y *Fecha Fin*, seleccionando opcionalmente días específicos de la semana (ej. Lun, Mié, Vie). El sistema procesa y genera automáticamente la serie de eventos individuales en lote mediante llamadas paralelas (`Promise.all`).
* **Widget de Recordatorios**: En la pantalla de bienvenida del dashboard se filtran y muestran los eventos de "Hoy" y de los "Próximos 7 días".
* **Cartelera Pública (`index.html`)**: La landing page consulta la colección `/agenda` de Firestore en tiempo real para mostrar las presentaciones y talleres futuros sin requerir autenticación.

---

## 🖼️ 5. Manejo de Imágenes de Perfil

Para evitar bloqueos de política CORS al subir archivos binarios a Firebase Storage sin configuración preflight en GCS, las fotos de perfil siguen este protocolo de optimización:
1. El usuario selecciona cualquier archivo de imagen (soporta JPG, PNG, WebP e imágenes HEIC de cámaras iPhone).
2. Se procesa mediante un `HTMLCanvasElement` en el cliente que escala la imagen a **200 x 200 píxeles** y la comprime a formato **WebP** al 80% de calidad.
3. El resultado (~5KB a 9KB) se convierte a un Data URL Base64 y se almacena directamente en el atributo `fotoPerfil` de la colección `/usuarios` en Firestore.
4. Si la decodificación en canvas falla (ej. HEIC en escritorio), cuenta con un fallback que conserva el archivo original.

---

## 💻 6. Modo Demo (Simulación Offline)

Si las credenciales en `js/firebase-config.js` permanecen como marcadores de posición (`TU_API_KEY_AQUI`), la plataforma activa automáticamente el **Modo Demo**:
* Simula las operaciones de autenticación, CRUD de usuarios y gestión de la agenda utilizando `localStorage` (`teocalli_demo_users`, `teocalli_demo_agenda`).
* Permite probar la experiencia completa de la aplicación de manera local sin necesidad de configurar una base de datos activa.

---

## 🛠️ 7. Guía de Ejecución y Despliegue

### Requisitos Previos
* Node.js v16+
* Firebase CLI (`npm install -g firebase-tools`)

### Servidor Local
Para ejecutar localmente con servidor de desarrollo:
```bash
npx live-server .
# o usando python
python -m http.server 8000
```

### Despliegue en Firebase Hosting
```bash
firebase login
firebase deploy
```
