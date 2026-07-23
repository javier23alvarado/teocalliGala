// public-gala.js - Lógica interactiva para la Taquilla Gala Pública

import { db } from "../services/firebaseService.js";
import { doc, onSnapshot, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const btnObtenerAcceso = document.getElementById("btn-obtener-acceso");
const modalReservaGala = document.getElementById("modal-reserva-gala");
const btnCloseReserva = document.getElementById("btn-close-reserva");
const btnContactWhatsapp = document.getElementById("btn-contact-whatsapp");

const publicMapGrid = document.getElementById("public-teatro-map-grid");
const lblAsientos = document.getElementById("lbl-asientos-seleccionados");
const lblTotal = document.getElementById("lbl-total-pagar");

const BOLETO_PRECIO = 400;
let selectedSeats = new Set();
let allSeatsState = {}; // para guardar el estado real de Firebase

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
        // Por defecto todos libres, el onSnapshot los bloqueará si no lo son
        div.classList.add('seat-libre');
        
        div.addEventListener('click', () => handleSeatClick(seatId, div));
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
    escDiv.style.backgroundColor = '#fdf2f8'; 
    escDiv.style.border = '3px solid #db2777'; 
    escDiv.style.color = '#db2777';
    escDiv.style.fontWeight = 'bold';
    escDiv.style.letterSpacing = '10px';
    escDiv.style.fontSize = '14px';
    escDiv.style.borderRadius = '8px';
    escDiv.textContent = 'ESCENARIO';
    publicMapGrid.appendChild(escDiv);
  }

  // Init Panzoom
  if (typeof Panzoom !== 'undefined') {
    const pz = Panzoom(publicMapGrid, {
      maxScale: 3,
      minScale: 0.25,
      startScale: 0.45,
      step: 0.15,
      origin: '0 0'
    });
    publicMapGrid.parentElement.addEventListener('wheel', pz.zoomWithWheel);
    
    // Auto center
    setTimeout(() => {
      const parent = publicMapGrid.parentElement.getBoundingClientRect();
      const w = 952 * 0.45;
      const h = 644 * 0.45;
      const panX = (parent.width - w) / 2;
      const panY = (parent.height - h) / 2;
      pz.pan(panX, panY > 0 ? panY : 10);
    }, 100);
  }
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
    // Si queremos limitar a 10 boletos por ejemplo:
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
  
  lblAsientos.textContent = count;
  lblTotal.textContent = `${total} MXN`;
  
  if (count > 0) {
    const seatsArray = Array.from(selectedSeats).sort().join(', ');
    const msg = `Hola, estoy interesado en adquirir boletos para la Gala "Savia de mi Tierra" el 22 de Agosto.\n\nMe interesan ${count} lugares: *(${seatsArray})*.\nTotal estimado: ${total} MXN.\n\n¿Me proporcionas información para realizar el pago?`;
    const encodedMsg = encodeURIComponent(msg);
    btnContactWhatsapp.href = `https://wa.me/523314393400?text=${encodedMsg}`;
    btnContactWhatsapp.style.opacity = '1';
    btnContactWhatsapp.style.pointerEvents = 'auto';
  } else {
    btnContactWhatsapp.href = '#';
    btnContactWhatsapp.style.opacity = '0.5';
    btnContactWhatsapp.style.pointerEvents = 'none';
  }
}

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
btnContactWhatsapp.style.opacity = '0.5';
btnContactWhatsapp.style.pointerEvents = 'none';
