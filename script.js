const camara = document.getElementById("camara");
const botonFoto = document.getElementById("boton-foto");
const botonGrabar = document.getElementById("boton-iniciar-video");
const botonDetener = document.getElementById("boton-detener-video");
const lienzo = document.getElementById("lienzo");
const fotoPrevia = document.getElementById("foto-previa");
const videoPrevio = document.getElementById("video-previo");

const botonUbicacion = document.getElementById("boton-ubicacion");
const ubicacionTexto = document.getElementById("ubicacion-texto");

const botonEnviar = document.getElementById("boton-enviar");
const listaReportes = document.getElementById("lista-reportes");

let stream = null;
let mediaRecorder = null;
let partesVideo = [];
let fotoBase64 = null;
let videoURL = null;
let ubicacionActual = null;

// Activar cámara
navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(s => {
  stream = s;
  camara.srcObject = stream;
});

// Tomar Foto
botonFoto.addEventListener("click", () => {
  const contexto = lienzo.getContext("2d");
  lienzo.width = camara.videoWidth;
  lienzo.height = camara.videoHeight;
  contexto.drawImage(camara, 0, 0, lienzo.width, lienzo.height);
  fotoBase64 = lienzo.toDataURL("image/png");
  videoURL = null; // Clear video if a photo is taken

  fotoPrevia.src = fotoBase64;
  fotoPrevia.hidden = false;
  videoPrevio.hidden = true;
});

// Grabar Video
botonGrabar.addEventListener("click", () => {
  partesVideo = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e => partesVideo.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(partesVideo, { type: "video/webm" });
    videoURL = URL.createObjectURL(blob);
    fotoBase64 = null; // Clear photo if a video is recorded

    videoPrevio.src = videoURL;
    videoPrevio.hidden = false;
    fotoPrevia.hidden = true;
  };

  mediaRecorder.start();
  botonGrabar.hidden = true;
  botonDetener.hidden = false;
});

botonDetener.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    botonGrabar.hidden = false;
    botonDetener.hidden = true;
  }
});

// Enviar Ubicación
botonUbicacion.addEventListener("click", () => {
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude.toFixed(5);
    const lon = pos.coords.longitude.toFixed(5);
    ubicacionActual = `Latitud: ${lat}, Longitud: ${lon}`;
    ubicacionTexto.textContent = ubicacionActual;
  }, err => {
    ubicacionTexto.textContent = "No se pudo obtener la ubicación.";
  });
});

// Enviar Reporte (Opción 1: Click-to-Chat de WhatsApp)
botonEnviar.addEventListener("click", (event) => {
  // Evitar que el formulario se envíe de la manera tradicional (recargar la página)
  event.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const descripcion = document.getElementById("descripcion").value.trim();

  if (!nombre || !correo || !descripcion) {
    alert("Por favor llena todos los campos del formulario.");
    return;
  }

  // Número de WhatsApp para Bolivia (72946353) con código de país 591
  const targetPhoneNumber = "59172946353"; 

  let whatsappMessage = `*Nuevo Reporte Recibido*\n`;
  whatsappMessage += `De: ${nombre} (${correo})\n`;
  whatsappMessage += `Descripción: ${descripcion}\n`;

  if (ubicacionActual) {
    whatsappMessage += `Ubicación: ${ubicacionActual}\n`;
  } else {
    whatsappMessage += `Ubicación: No proporcionada\n`;
  }

  // Nota sobre la media, ya que no se puede adjuntar directamente con este método
  if (fotoBase64 || videoURL) {
      whatsappMessage += `\n*Nota: Se adjuntó una foto/video en el formulario web. Por favor, revisa la aplicación para ver los detalles completos.*`;
  }

  // Codificar el mensaje para la URL (maneja caracteres especiales)
  const encodedMessage = encodeURIComponent(whatsappMessage);

  // Construir la URL de WhatsApp
  const whatsappURL = `https://wa.me/${targetPhoneNumber}?text=${encodedMessage}`;

  // Abrir WhatsApp en una nueva pestaña/ventana
  window.open(whatsappURL, '_blank');

  // --- Mantener la lógica existente para agregar el reporte a la lista local ---
  const li = document.createElement("li");
  li.textContent = `${nombre} - ${correo} - ${descripcion} - ${ubicacionActual || "Sin ubicación"}`;

  if (fotoBase64) {
    const img = document.createElement("img");
    img.src = fotoBase64;
    img.width = 150;
    li.appendChild(document.createElement("br"));
    li.appendChild(img);
  } else if (videoURL) {
    const vid = document.createElement("video");
    vid.src = videoURL;
    vid.controls = true;
    vid.width = 150;
    li.appendChild(document.createElement("br"));
    li.appendChild(vid);
  }

  listaReportes.appendChild(li);

  // Limpiar campos después de generar el enlace de WhatsApp y agregar a la lista local
  document.getElementById("nombre").value = "";
  document.getElementById("correo").value = "";
  document.getElementById("descripcion").value = "";
  fotoPrevia.hidden = true;
  videoPrevio.hidden = true;
  ubicacionTexto.textContent = "";
  fotoBase64 = null;
  videoURL = null;
  ubicacionActual = null;
});