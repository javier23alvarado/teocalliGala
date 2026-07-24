// public-gala.js - Lógica interactiva para la Taquilla Gala Pública (Versión Simplificada General)

import { db } from "../services/firebaseService.js";
import { doc, onSnapshot, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const btnObtenerAcceso = document.getElementById("btn-obtener-acceso");
const modalReservaGala = document.getElementById("modal-reserva-gala");
const btnCloseReserva = document.getElementById("btn-close-reserva");
const btnContactWhatsapp = document.getElementById("btn-contact-whatsapp");

const publicMapWrapper = document.getElementById("public-map-wrapper");
const publicMapGrid = document.getElementById("public-teatro-map-grid");

const lblCount = document.getElementById("lbl-count");
const badgesContainer = document.getElementById("seat-badges-container");
const lblTotal = document.getElementById("lbl-total-pagar");

const BOLETO_PRECIO = 400;
let selectedSeats = new Set();
let allSeatsState = {}; // para guardar el estado real de Firebase

let pz; // Instancia global de Panzoom
let isDraggingMap = false;
let startX = 0, startY = 0;

// --- Lógica del Modal ---
if (btnObtenerAcceso && modalReservaGala) {
  btnObtenerAcceso.addEventListener("click", () => {
    modalReservaGala.classList.add("active");
    if (!publicMapGrid.hasChildNodes() || publicMapGrid.innerHTML.includes('Cargando')) {
      initPublicMap();
    }
  });
}

if (btnCloseReserva && modalReservaGala) {
  btnCloseReserva.addEventListener("click", () => {
    modalReservaGala.classList.remove("active");
  });
}

if (modalReservaGala) {
  modalReservaGala.addEventListener("click", (e) => {
    if (e.target === modalReservaGala) {
      modalReservaGala.classList.remove("active");
    }
  });
}

// --- Lógica del Mapa ---
async function initPublicMap() {
  try {
    const res = await fetch('js/data/mapaGaleriasLayout.json');
    const mapData = await res.json();
    renderPublicMapGrid(mapData);
    
    // Suscribirse a Firebase para pintar el estado real de los asientos
    const asientosDbRef = doc(db, 'gala', 'estadoBoletos');
    onSnapshot(asientosDbRef, (docSnap) => {
      if(docSnap.exists()){
        allSeatsState = docSnap.data().asientos || {};
        updateSeatsUI();
      }
    });

  } catch (err) {
    console.error("Error al cargar mapa", err);
    publicMapGrid.innerHTML = '<p>Error al cargar el mapa. Intenta más tarde.</p>';
  }
}

function renderPublicMapGrid(mapData) {
  publicMapGrid.innerHTML = '';
  publicMapGrid.style.gridTemplateColumns = `repeat(${mapData.cols}, 1fr)`;
  
  let hasEscenario = false;

  mapData.layout.forEach(row => {
    const isEscenarioRow = row.some(cell => cell && cell.trim().toUpperCase() === 'ESCENARIO');
    if (isEscenarioRow) {
      hasEscenario = true;
      return; 
    }

    row.forEach(cell => {
      const div = document.createElement('div');
      div.className = 'teatro-seat';
      
      if (!cell || cell.trim() === '' || cell.trim() === 'pasillo') {
        div.classList.add('seat-empty');
      } else {
        const seatId = cell.trim();
        div.id = `pub-seat-${seatId}`;
        div.textContent = seatId;
        div.dataset.seat = seatId;
        div.classList.add('seat-libre');
        
        // Listener de click modificado para detectar si hubo arrastre de panzoom
        div.addEventListener('click', (e) => {
          if (isDraggingMap) return;
          e.stopPropagation();
          handleSeatClick(seatId, div);
        });
      }
      publicMapGrid.appendChild(div);
    });
  });

  if (hasEscenario) {
    const escDiv = document.createElement('div');
    escDiv.style.gridColumn = '1 / -1';
    escDiv.style.marginTop = '15px';
    escDiv.style.height = '40px';
    escDiv.style.display = 'flex';
    escDiv.style.alignItems = 'center';
    escDiv.style.justifyContent = 'center';
    escDiv.style.backgroundColor = 'transparent'; 
    escDiv.style.border = '2px solid rgba(233,30,99,0.5)'; 
    escDiv.style.color = '#E91E63';
    escDiv.style.textShadow = '0 0 15px rgba(233,30,99,0.8)';
    escDiv.style.fontWeight = 'bold';
    escDiv.style.letterSpacing = '18px';
    escDiv.style.fontSize = '14px';
    escDiv.style.borderRadius = '8px';
    escDiv.style.boxShadow = 'inset 0 0 10px rgba(233,30,99,0.3)';
    escDiv.textContent = 'ESCENARIO';
    publicMapGrid.appendChild(escDiv);
  }

  // Init Panzoom
  if (typeof Panzoom !== 'undefined') {
    pz = Panzoom(publicMapGrid, {
      maxScale: 4,
      minScale: 0.3,
      startScale: 0.45,
      step: 0.2,
      contain: 'outside'
    });
    publicMapWrapper.addEventListener('wheel', pz.zoomWithWheel);
    
    // Auto center map initially
    setTimeout(() => {
      resetZoomAndCenter();
    }, 100);

    // Controles de UI
    document.getElementById("btn-zoom-in")?.addEventListener("click", () => pz.zoomIn());
    document.getElementById("btn-zoom-out")?.addEventListener("click", () => pz.zoomOut());
    document.getElementById("btn-zoom-reset")?.addEventListener("click", resetZoomAndCenter);

    // Detección de arrastre vs click exacto para evitar conflictos
    publicMapGrid.addEventListener('pointerdown', (e) => {
      isDraggingMap = false;
      startX = e.clientX;
      startY = e.clientY;
    });

    publicMapGrid.addEventListener('pointermove', (e) => {
      if (Math.abs(e.clientX - startX) > 5 || Math.abs(e.clientY - startY) > 5) {
        isDraggingMap = true; // Se considera arrastre
      }
    });
  }
}

function resetZoomAndCenter() {
  if (!pz) return;
  const parent = publicMapWrapper.getBoundingClientRect();
  const w = 952 * 0.45;
  const h = 644 * 0.45;
  const panX = (parent.width - w) / 2;
  const panY = (parent.height - h) / 2;
  
  pz.pan(panX, panY > 0 ? panY : 10, { animate: true, duration: 400 });
  pz.zoom(0.45, { animate: true, duration: 400 });
}

function updateSeatsUI() {
  const allSeatDivs = publicMapGrid.querySelectorAll('.teatro-seat:not(.seat-empty)');
  const now = Date.now();
  
  allSeatDivs.forEach(div => {
    const seatId = div.dataset.seat;
    if (!seatId) return;

    let state = 'libre';
    if (allSeatsState[seatId]) {
      state = allSeatsState[seatId].estado;
      
      // Auto-liberar si está reservado y pasaron más de 24 hrs
      if (state === 'reservado' && allSeatsState[seatId].reservaDate) {
        const diffHours = (now - allSeatsState[seatId].reservaDate) / (1000 * 60 * 60);
        if (diffHours > 24) {
          state = 'libre';
        }
      }
    }
    
    // Limpiar clases
    div.classList.remove('seat-libre', 'seat-reservado', 'seat-vendido', 'seat-unavailable');
    
    if (state !== 'libre') {
      div.classList.add('seat-unavailable');
      if (selectedSeats.has(seatId)) {
        selectedSeats.delete(seatId);
        div.classList.remove('seat-selected');
        updateCartUI();
      }
    } else {
      div.classList.add('seat-libre');
      if (selectedSeats.has(seatId)) div.classList.add('seat-selected');
    }
  });
}

function handleSeatClick(seatId, div) {
  // No hacer nada si el asiento no está libre (bloqueado por firebase)
  if (div.classList.contains('seat-unavailable')) return;

  if (selectedSeats.has(seatId)) {
    selectedSeats.delete(seatId);
    div.classList.remove('seat-selected');
  } else {
    if (selectedSeats.size >= 10) {
      alert("Solo puedes seleccionar un máximo de 10 boletos por transacción.");
      return;
    }
    selectedSeats.add(seatId);
    div.classList.add('seat-selected');
  }
  updateCartUI();
}

function updateCartUI() {
  const count = selectedSeats.size;
  const total = count * BOLETO_PRECIO;
  
  if (lblCount) lblCount.textContent = count;
  lblTotal.textContent = total + ' MXN';
  
  // Render badges
  if (badgesContainer) {
    if (count === 0) {
      badgesContainer.innerHTML = '<span style="color: #52525b; font-size: 0.9rem; font-style: italic;">Ninguno</span>';
    } else {
      badgesContainer.innerHTML = Array.from(selectedSeats)
        .sort()
        .map(seat => `<span class="badge-seat" onclick="window.removeSeat('${seat}')" title="Haz clic para remover">[${seat}] &times;</span>`)
        .join('');
    }
  }
  
  if (count > 0) {
    const seatsArray = Array.from(selectedSeats).sort().join(', ');
    const msg = `Hola, estoy interesado en adquirir boletos para la Gala "Savia de mi Tierra" el 22 de Agosto.\n\nMe interesan ${count} lugares: *(${seatsArray})*.\nTotal estimado: ${total} MXN.\n\n¿Me proporcionas información para realizar el pago?`;
    const encodedMsg = encodeURIComponent(msg);
    btnContactWhatsapp.href = `https://wa.me/523314393400?text=${encodedMsg}`;
    btnContactWhatsapp.classList.remove('disabled');
  } else {
    btnContactWhatsapp.href = '#';
    btnContactWhatsapp.classList.add('disabled');
  }
}

// Global para remover badges
window.removeSeat = function(seatId) {
  const div = document.getElementById(`pub-seat-${seatId}`);
  if (div) {
    selectedSeats.delete(seatId);
    div.classList.remove('seat-selected');
    updateCartUI();
  }
};

// Al hacer clic en reservar ahora, guardamos en firebase
btnContactWhatsapp.addEventListener('click', async (e) => {
  if (selectedSeats.size === 0) return;
  
  try {
    const asientosDbRef = doc(db, 'gala', 'estadoBoletos');
    const updates = {};
    const now = Date.now();
    
    selectedSeats.forEach(seatId => {
      updates[`asientos.${seatId}.estado`] = 'reservado';
      updates[`asientos.${seatId}.reservaDate`] = now;
      updates[`asientos.${seatId}.reservaUser`] = 'publico';
    });
    
    await updateDoc(asientosDbRef, updates);
    // Vaciamos la canasta
    selectedSeats.clear();
    updateCartUI();
  } catch (error) {
    console.error("Error al reservar:", error);
  }
});

// Bloquear el botón de WhatsApp inicialmente
btnContactWhatsapp.href = '#';
btnContactWhatsapp.classList.add('disabled');