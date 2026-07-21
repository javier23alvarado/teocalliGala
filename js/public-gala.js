import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const btnObtenerAcceso = document.getElementById("btn-obtener-acceso");
const modalReservaGala = document.getElementById("modal-reserva-gala");
const btnCloseReserva = document.getElementById("btn-close-reserva");

const publicMapSection = document.getElementById("public-map-section");
const publicMapContainer = document.getElementById("public-map-container");
const publicCartItems = document.getElementById("public-cart-items");
const publicCartTotal = document.getElementById("public-cart-total");
const btnPublicCheckout = document.getElementById("btn-public-checkout");

const modalOverlay = document.getElementById("modal-checkout-overlay");
const modalCheckout = document.getElementById("modal-checkout");
const btnCancelCheckout = document.getElementById("btn-cancel-checkout");
const btnConfirmCheckout = document.getElementById("btn-confirm-checkout");
const inputName = document.getElementById("checkout-name");
const inputPhone = document.getElementById("checkout-phone");

let galaSeatsData = [];
let selectedSeats = [];
let galaMapMatrix = null;

// Fetch Map Matrix
fetch("assets/data/mapa.json")
  .then(res => res.json())
  .then(data => {
    galaMapMatrix = data;
    renderPublicMap();
  })
  .catch(err => console.error("Error loading map matrix", err));

// Mostrar modal de reserva al dar clic en Obtener Acceso
if (btnObtenerAcceso && modalReservaGala) {
  btnObtenerAcceso.addEventListener("click", () => {
    modalReservaGala.style.display = "flex";
  });
}

// Cerrar modal de reserva
if (btnCloseReserva && modalReservaGala) {
  btnCloseReserva.addEventListener("click", () => {
    modalReservaGala.style.display = "none";
  });
}

// Escuchar Firebase

onSnapshot(collection(db, "asientos_gala"), (snap) => {
  galaSeatsData = [];
  snap.forEach(doc => {
    galaSeatsData.push(doc.data());
  });
  
  // Limpiar asientos seleccionados que ya no estén libres (por concurrencia)
  selectedSeats = selectedSeats.filter(id => {
    const s = galaSeatsData.find(d => d.id_asiento === id);
    return s && s.estado === "LIBRE";
  });
  
  renderPublicMap();
  updateCart();
  
  
});

function renderPublicMap() {
  if (!publicMapContainer) return;
  publicMapContainer.innerHTML = "";
  
  if (galaMapMatrix) {
    publicMapContainer.style.display = "grid";
    publicMapContainer.style.gridTemplateColumns = `repeat(${galaMapMatrix.max_col}, minmax(20px, 25px))`;
    publicMapContainer.style.gridTemplateRows = `repeat(${galaMapMatrix.max_row}, minmax(20px, 25px))`;
    publicMapContainer.style.gap = "6px";
    publicMapContainer.style.justifyContent = "center";
    publicMapContainer.style.padding = "20px";
    publicMapContainer.style.minWidth = "max-content"; // Para que no se aplaste en scroll
  }

  const sorted = galaSeatsData; // Orden natural está bien

  sorted.forEach(seat => {
    const div = document.createElement("div");
    div.className = `gala-seat seat-sec-${seat.seccion}`;
    
    if (seat.estado === "RESERVADO") div.classList.add("seat-reservado");
    if (seat.estado === "VENDIDO") div.classList.add("seat-vendido");
    if (selectedSeats.includes(seat.id_asiento)) div.classList.add("selected");

    // Asignar Coordenadas si están disponibles
    if (seat.coordenadas) {
        div.style.gridRow = seat.coordenadas.r;
        div.style.gridColumn = seat.coordenadas.c;
    } else if (galaMapMatrix && galaMapMatrix.seats[seat.id_asiento]) {
        div.style.gridRow = galaMapMatrix.seats[seat.id_asiento].r;
        div.style.gridColumn = galaMapMatrix.seats[seat.id_asiento].c;
    }

    // Tooltip
    div.addEventListener("mouseenter", () => {
      const tooltip = document.getElementById("gala-tooltip");
      if (!tooltip) return;
      let estadoTxt = seat.estado;
      if (selectedSeats.includes(seat.id_asiento)) estadoTxt = "SELECCIONADO";
      
      tooltip.innerHTML = `<strong>${seat.id_asiento}</strong><br>Estado: ${estadoTxt}`;
      tooltip.classList.add("visible");
      
      const rect = div.getBoundingClientRect();
      const mapWrapper = document.querySelector(".gala-map-wrapper").getBoundingClientRect();
      tooltip.style.left = (rect.left - mapWrapper.left + 30) + "px";
      tooltip.style.top = (rect.top - mapWrapper.top - 10) + "px";
    });
    
    div.addEventListener("mouseleave", () => {
      const tooltip = document.getElementById("gala-tooltip");
      if (tooltip) tooltip.classList.remove("visible");
    });

    // Selección
    div.addEventListener("click", () => {
      if (seat.estado !== "LIBRE") return;
      
      const idx = selectedSeats.indexOf(seat.id_asiento);
      if (idx === -1) {
        if (selectedSeats.length >= 10) {
          alert("No puedes seleccionar más de 10 asientos a la vez.");
          return;
        }
        selectedSeats.push(seat.id_asiento);
      } else {
        selectedSeats.splice(idx, 1);
      }
      
      renderPublicMap(); // re-render simple para reflejar selección
      updateCart();
    });

    publicMapContainer.appendChild(div);
  });
}

function updateCart() {
  if (!publicCartItems) return;
  
  if (selectedSeats.length === 0) {
    publicCartItems.innerHTML = `<p style="color: #888; font-size: 13px;">No has seleccionado asientos.</p>`;
    btnPublicCheckout.style.opacity = "0.5";
    btnPublicCheckout.style.pointerEvents = "none";
  } else {
    let html = "";
    selectedSeats.forEach(id => {
      const s = galaSeatsData.find(d => d.id_asiento === id);
      if (s) {
        html += `
          <div class="cart-item">
            <div>
              <strong>${id}</strong> <small style="color:#aaa;">(Sec ${s.seccion})</small>
            </div>
            <button class="cart-item-remove" data-id="${id}">X</button>
          </div>
        `;
      }
    });
    publicCartItems.innerHTML = html;
    
    btnPublicCheckout.style.opacity = "1";
    btnPublicCheckout.style.pointerEvents = "auto";
    
    // Attach remove events
    document.querySelectorAll(".cart-item-remove").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const id = e.target.getAttribute("data-id");
        selectedSeats = selectedSeats.filter(s => s !== id);
        renderPublicMap();
        updateCart();
      });
    });
  }
  
  if (publicCartTotal) publicCartTotal.textContent = selectedSeats.length;
}

// Flujo de Checkout (Simulado con redirección a WhatsApp)
if (btnPublicCheckout) {
  btnPublicCheckout.addEventListener("click", () => {
    if (modalOverlay) modalOverlay.style.display = "flex";
    if (modalCheckout) modalCheckout.style.display = "block";
  });
}

if (btnCancelCheckout) {
  btnCancelCheckout.addEventListener("click", () => {
    if (modalOverlay) modalOverlay.style.display = "none";
    if (modalCheckout) modalCheckout.style.display = "none";
  });
}

if (btnConfirmCheckout) {
  btnConfirmCheckout.addEventListener("click", () => {
    const name = inputName.value.trim();
    const phone = inputPhone.value.trim();
    
    if (!name || !phone) {
      alert("Por favor ingresa tu nombre y teléfono.");
      return;
    }
    
    const asientosStr = selectedSeats.join(", ");
    const msj = \`Hola, soy \${name} (\${phone}). Quiero reservar los asientos para la Gala Teocalli: \${asientosStr}.\`;
    const wappUrl = \`https://wa.me/523312345678?text=\${encodeURIComponent(msj)}\`;
    
    alert("Serás redirigido a WhatsApp para coordinar tu pago directo con la compañía.");
    window.open(wappUrl, '_blank');
    
    // Limpiar carrito
    selectedSeats = [];
    if (modalOverlay) modalOverlay.style.display = "none";
    if (modalCheckout) modalCheckout.style.display = "none";
    renderPublicMap();
    updateCart();
  });
}

// ====================================================
