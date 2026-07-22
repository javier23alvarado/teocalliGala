// public-gala.js - Lógica simplificada para el modal estático de la Taquilla Gala

const btnObtenerAcceso = document.getElementById("btn-obtener-acceso");
const modalReservaGala = document.getElementById("modal-reserva-gala");
const btnCloseReserva = document.getElementById("btn-close-reserva");

// Mostrar modal de reserva al dar clic en Obtener Acceso
if (btnObtenerAcceso && modalReservaGala) {
  btnObtenerAcceso.addEventListener("click", () => {
    modalReservaGala.classList.add("active");
  });
}

// Cerrar modal de reserva desde el botón (X)
if (btnCloseReserva && modalReservaGala) {
  btnCloseReserva.addEventListener("click", () => {
    modalReservaGala.classList.remove("active");
  });
}

// Cerrar modal haciendo clic en el fondo oscuro (backdrop)
if (modalReservaGala) {
  modalReservaGala.addEventListener("click", (e) => {
    if (e.target === modalReservaGala) {
      modalReservaGala.classList.remove("active");
    }
  });
}

