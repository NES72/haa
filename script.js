const camara = document.getElementById("camara");
const botonFoto = document.getElementById("boton-foto");
const botonGrabar = document.getElementById("boton-iniciar-video");
const botonDetener = document.getElementById("boton-detener-video");
const lienzo = document.getElementById("lienzo");
const fotoPrevia = document.getElementById("foto-previa");
const videoPrevio = document.getElementById("video-previo");

const botonUbicacion = document.getElementById("boton-ubicacion");
const ubicacionTexto = document.getElementById("ubicacion-texto"); // Este elemento mostrará el texto y el mapa

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
}).catch(err => {
  console.error("Error al acceder a la cámara o micrófono:", err);
  alert("No se pudo acceder a la cámara o micrófono. Asegúrate de dar permisos.");
});

// Tomar Foto
botonFoto.addEventListener("click", () => {
  if (!stream) {
    alert("Cámara no disponible. Asegúrate de dar permisos.");
    return;
  }
  const contexto = lienzo.getContext("2d");
  lienzo.width = camara.videoWidth;
  lienzo.height = camara.videoHeight;
  contexto.drawImage(camara, 0, 0, lienzo.width, lienzo.height);
  fotoBase64 = lienzo.toDataURL("image/png");
  videoURL = null; // Limpiar video si se toma una foto

  fotoPrevia.src = fotoBase64;
  fotoPrevia.hidden = false;
  videoPrevio.hidden = true;
});

// Grabar Video
botonGrabar.addEventListener("click", () => {
  if (!stream) {
    alert("Cámara o micrófono no disponible. Asegúrate de dar permisos.");
    return;
  }
  partesVideo = [];
  mediaRecorder = new MediaRecorder(stream);
  mediaRecorder.ondataavailable = e => partesVideo.push(e.data);
  mediaRecorder.onstop = () => {
    const blob = new Blob(partesVideo, { type: "video/webm" });
    videoURL = URL.createObjectURL(blob);
    fotoBase64 = null; // Limpiar foto si se graba un video

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

// Enviar Ubicación y Mostrar Mapa
botonUbicacion.addEventListener("click", () => {
  if (!navigator.geolocation) {
    ubicacionTexto.textContent = "La geolocalización no es soportada por tu navegador.";
    return;
  }

  ubicacionTexto.textContent = "Obteniendo ubicación...";

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const lat = pos.coords.latitude.toFixed(5);
      const lon = pos.coords.longitude.toFixed(5);
      ubicacionActual = `Latitud: ${lat}, Longitud: ${lon}`;
      
      // Construir la URL del mapa de Google Maps para incrustar
      // Usamos la URL de Google Maps para un iframe, que es una forma común y sencilla
      // para mostrar un mapa sin necesidad de claves de API complejas para casos básicos.
      const mapEmbedURL = `https://maps.google.com/maps?q=${lat},${lon}&hl=es&z=15&output=embed`;

      // Limpiar cualquier contenido anterior en ubicacionTexto
      ubicacionTexto.innerHTML = "";

      // Agregar el texto de la ubicación
      const pText = document.createElement('p');
      pText.textContent = ubicacionActual;
      ubicacionTexto.appendChild(pText);
      
      // Crear un iframe para mostrar el mapa
      const mapIframe = document.createElement("iframe");
      mapIframe.src = mapEmbedURL;
      mapIframe.width = "100%"; // Ajusta el ancho como sea necesario
      mapIframe.height = "300px"; // Ajusta la altura como sea necesario
      mapIframe.style.border = "0";
      mapIframe.allowfullscreen = true; // Permite pantalla completa si el navegador lo soporta
      mapIframe.loading = "lazy"; // Carga perezosa para mejor rendimiento

      // Agregar el mapa al elemento ubicacionTexto
      ubicacionTexto.appendChild(mapIframe);
    },
    (err) => {
      console.error("Error al obtener la ubicación:", err);
      let errorMessage = "No se pudo obtener la ubicación.";
      if (err.code === err.PERMISSION_DENIED) {
        errorMessage += " Por favor, permite el acceso a la ubicación en la configuración de tu navegador.";
      } else if (err.code === err.POSITION_UNAVAILABLE) {
        errorMessage += " La información de ubicación no está disponible.";
      } else if (err.code === err.TIMEOUT) {
        errorMessage += " La solicitud para obtener la ubicación ha caducado.";
      }
      ubicacionTexto.textContent = errorMessage;
    },
    {
      enableHighAccuracy: true, // Solicitar alta precisión
      timeout: 10000,           // Tiempo máximo para intentar obtener la ubicación (10 segundos)
      maximumAge: 0             // No usar una posición en caché, siempre intentar una nueva
    }
  );
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
    // Opcional: Si quieres enviar el link del mapa en WhatsApp también
    const [latText, lonText] = ubicacionActual.split(', ').map(s => s.split(': ')[1]);
    whatsappMessage += `Ver en mapa: https://www.google.com/maps?q=${latText},${lonText}\n`;
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
  ubicacionTexto.textContent = ""; // Limpiar texto y mapa de la ubicación
  fotoBase64 = null;
  videoURL = null;
  ubicacionActual = null;
});