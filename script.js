const camara = document.getElementById("camara");
const botonFoto = document.getElementById("boton-foto");
const botonGrabar = document.getElementById("boton-iniciar-video");
const botonDetener = document.getElementById("boton-detener-video");
const lienzo = document.getElementById("lienzo");

const botonUbicacion = document.getElementById("boton-ubicacion");
const ubicacionTexto = document.getElementById("ubicacion-texto");

const botonEnviar = document.getElementById("boton-enviar");
const listaReportes = document.getElementById("lista-reportes");

const activarCamaraBtn = document.getElementById("activar-camara");

// Nuevo contenedor para las vistas previas
const previewsContainer = document.getElementById("previews-container");

// Elementos del modal de video
const videoModal = document.getElementById("video-modal");
const modalVideoPlayer = document.getElementById("modal-video-player");
const closeVideoModalBtn = document.getElementById("close-video-modal");

// Elementos del modal del mapa
const mapModal = document.getElementById("map-modal");
const closeMapModalBtn = document.getElementById("close-map-modal");
let map = null; // Variable para la instancia del mapa

let stream = null;
let mediaRecorder = null;
let partesVideo = [];

// Cambiamos a arrays para almacenar múltiples fotos y videos
let fotosBase64 = [];
let videosURL = [];
let ubicacionActual = null;
let ubicacionCoords = null; // Para guardar las coordenadas para el mapa

const MAX_PHOTOS = 10;
const MAX_VIDEOS = 5; // Reducido para evitar problemas de memoria
const MAX_VIDEO_DURATION = 30; // Tiempo máximo de grabación en segundos
const VIDEO_QUALITY = 0.8; // Calidad de video (0-1)

// Nueva función para activar cámara
activarCamaraBtn.addEventListener("click", async () => {
  try {
    const constraints = {
      video: {
        facingMode: "environment", // Preferir la cámara trasera
        width: { ideal: 1280 }, // Resolución ideal
        height: { ideal: 720 },
        frameRate: { ideal: 30 }
      },
      audio: false // No solicitar audio inicialmente
    };

    const s = await navigator.mediaDevices.getUserMedia(constraints);
    
    // Liberar recursos si ya hay un stream activo
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    stream = s;
    camara.srcObject = stream;
    activarCamaraBtn.hidden = true;
    camara.style.display = 'block';
  } catch (error) {
    console.error("Error al acceder a la cámara:", error);
    alert("Error al acceder a la cámara: " + error.message);
  }
});

// Función para mostrar las vistas previas de fotos y videos
function displayPreviews() {
  previewsContainer.innerHTML = ''; // Limpiar el contenedor antes de añadir nuevos elementos

  fotosBase64.forEach(foto => {
    const img = document.createElement("img");
    img.src = foto;
    img.alt = "Foto del reporte";
    previewsContainer.appendChild(img);
  });

  videosURL.forEach(videoUrl => {
    const vid = document.createElement("video");
    vid.src = videoUrl;
    vid.controls = false; // Desactivar controles para que no aparezcan en la vista previa
    vid.alt = "Video del reporte";
    vid.preload = "metadata"; // Cargar solo metadatos para vista previa

    // Evento de clic para abrir el modal de video
    vid.addEventListener('click', () => {
      modalVideoPlayer.src = videoUrl;
      videoModal.style.display = 'flex'; // Mostrar el modal
      modalVideoPlayer.play(); // Reproducir el video
    });

    previewsContainer.appendChild(vid);
  });
}

// Evento para cerrar el modal de video
closeVideoModalBtn.addEventListener('click', () => {
  videoModal.style.display = 'none';
  modalVideoPlayer.pause(); // Pausar el video al cerrar
  modalVideoPlayer.src = ''; // Limpiar la fuente
});

// Cerrar el modal de video o mapa si se hace clic fuera del contenido
window.addEventListener('click', (event) => {
  if (event.target === videoModal) {
    videoModal.style.display = 'none';
    modalVideoPlayer.pause();
    modalVideoPlayer.src = '';
  }
  if (event.target === mapModal) {
    mapModal.style.display = 'none';
    // Limpiar el mapa al cerrar el modal (importante para OpenLayers)
    if (map) {
        map.setTarget(null);
        map = null;
    }
  }
});

// Tomar Foto
botonFoto.addEventListener("click", () => {
  if (!stream) {
    alert("Por favor, activa la cámara primero.");
    return;
  }
  if (fotosBase64.length >= MAX_PHOTOS) {
    alert(`Solo puedes tomar un máximo de ${MAX_PHOTOS} fotos.`);
    return;
  }

  const contexto = lienzo.getContext("2d");
  lienzo.width = camara.videoWidth;
  lienzo.height = camara.videoHeight;
  contexto.drawImage(camara, 0, 0, lienzo.width, lienzo.height);
  fotosBase64.push(lienzo.toDataURL("image/png"));
  
  displayPreviews(); // Actualizar las vistas previas
});

// Grabar Video
botonGrabar.addEventListener("click", async () => {
  if (!stream) {
    alert("Por favor, activa la cámara primero.");
    return;
  }
  if (videosURL.length >= MAX_VIDEOS) {
    alert(`Solo puedes grabar un máximo de ${MAX_VIDEOS} videos.`);
    return;
  }

  try {
    // Solicitar audio solo cuando se graba video
    const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const combinedStream = new MediaStream([
      ...stream.getVideoTracks(),
      ...audioStream.getAudioTracks()
    ]);
    
    partesVideo = [];
    mediaRecorder = new MediaRecorder(combinedStream, {
      mimeType: 'video/webm',
      videoBitsPerSecond: 2500000, // Ajustar bitrate para mejor calidad
      audioBitsPerSecond: 128000
    });
    
    mediaRecorder.ondataavailable = e => partesVideo.push(e.data);
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(partesVideo, { type: "video/webm" });
      const videoUrl = URL.createObjectURL(blob);
      videosURL.push(videoUrl);
      
      displayPreviews();

      // Limpiar recursos
      audioStream.getTracks().forEach(track => track.stop());
      // URL.revokeObjectURL(videoUrl); // Revocar aquí puede borrar el video antes de verlo en la lista
    };

    mediaRecorder.onerror = (error) => {
      console.error("Error en la grabación:", error);
      alert("Error durante la grabación del video.");
    };

    mediaRecorder.start(); // Iniciar grabación
    // Configurar un temporizador para detener la grabación después de MAX_VIDEO_DURATION
    setTimeout(() => {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();
            alert(`La grabación se detuvo automáticamente después de ${MAX_VIDEO_DURATION} segundos.`);
            botonGrabar.hidden = false;
            botonDetener.hidden = true;
        }
    }, MAX_VIDEO_DURATION * 1000);

    botonGrabar.hidden = true;
    botonDetener.hidden = false;
  } catch (error) {
    console.error("Error al acceder al micrófono:", error);
    alert("Error al acceder al micrófono para grabar video: " + error.message);
  }
});

botonDetener.addEventListener("click", () => {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
    botonGrabar.hidden = false;
    botonDetener.hidden = true;
  }
});

// Función para inicializar el mapa con OpenLayers
function initMap(latitude, longitude) {
    // Si el mapa ya existe, lo destruimos para inicializarlo de nuevo con la nueva ubicación
    if (map) {
        map.setTarget(null); // Desvincula el mapa del div
        map = null; // Elimina la instancia del mapa
    }

    map = new ol.Map({
        target: 'map', // ID del div donde se renderizará el mapa
        layers: [
            new ol.layer.Tile({
                source: new ol.source.OSM() // Usar OpenStreetMap como fuente
            })
        ],
        view: new ol.View({
            center: ol.proj.fromLonLat([longitude, latitude]), // Coordenadas [longitud, latitud]
            zoom: 16 // Nivel de zoom inicial
        })
    });

    // Añadir un marcador (punto) en la ubicación
    const marker = new ol.Feature({
        geometry: new ol.geom.Point(ol.proj.fromLonLat([longitude, latitude]))
    });

    const vectorSource = new ol.source.Vector({
        features: [marker]
    });

    const markerStyle = new ol.style.Style({
        image: new ol.style.Circle({
            radius: 8,
            fill: new ol.style.Fill({ color: 'red' }),
            stroke: new ol.style.Stroke({ color: 'white', width: 2 })
        })
    });

    const vectorLayer = new ol.layer.Vector({
        source: vectorSource,
        style: markerStyle
    });

    map.addLayer(vectorLayer);
}

// Enviar Ubicación
botonUbicacion.addEventListener("click", () => {
  if (!navigator.geolocation) {
    ubicacionTexto.textContent = "La geolocalización no es soportada por tu navegador.";
    return;
  }

  ubicacionTexto.textContent = "Obteniendo ubicación...";

  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude.toFixed(5);
    const lon = pos.coords.longitude.toFixed(5);
    ubicacionActual = `Latitud: ${lat}, Longitud: ${lon}`;
    ubicacionCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
    ubicacionTexto.textContent = ubicacionActual;

    // Mostrar el modal del mapa
    mapModal.style.display = 'flex';
    // Inicializar el mapa con la ubicación obtenida
    initMap(pos.coords.latitude, pos.coords.longitude);

  }, (err) => {
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
    ubicacionCoords = null; // Limpiar coordenadas si hay error
  }, {
    enableHighAccuracy: true, // Solicitar alta precisión
    timeout: 10000,           // Tiempo máximo para intentar obtener la ubicación (10 segundos)
    maximumAge: 0             // No usar una posición en caché, siempre intentar una nueva
  });
});

// Evento para cerrar el modal del mapa
closeMapModalBtn.addEventListener('click', () => {
    mapModal.style.display = 'none';
    // Limpiar el mapa al cerrar el modal
    if (map) {
        map.setTarget(null);
        map = null;
    }
});

// Manejar el envío del formulario
document.getElementById("formulario").addEventListener("submit", (e) => {
  e.preventDefault(); // Prevenir recarga de página

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
    if (ubicacionCoords) {
        whatsappMessage += `Ver en mapa: https://www.google.com/maps/search/?api=1&query=${ubicacionCoords.latitude},${ubicacionCoords.longitude}\n`;
    }
  } else {
    whatsappMessage += `Ubicación: No proporcionada\n`;
  }

  // Nota sobre la media, ya que no se puede adjuntar directamente con este método
  if (fotosBase64.length > 0 || videosURL.length > 0) {
      whatsappMessage += `\n*Nota: Se adjuntó(aron) foto(s)/video(s) en el formulario web. Por favor, revisa la aplicación para ver los detalles completos.*`;
  }

  // Codificar el mensaje para la URL (maneja caracteres especiales)
  const encodedMessage = encodeURIComponent(whatsappMessage);

  // Construir la URL de WhatsApp
  const whatsappURL = `https://wa.me/${targetPhoneNumber}?text=${encodedMessage}`;

  // Abrir WhatsApp en una nueva pestaña/ventana
  window.open(whatsappURL, '_blank');

  // --- Lógica para agregar el reporte a la lista local (conservada) ---
  const li = document.createElement("li");
  li.innerHTML = `<strong>Nombre:</strong> ${nombre}<br>
                  <strong>Correo:</strong> ${correo}<br>
                  <strong>Descripción:</strong> ${descripcion}<br>
                  <strong>Ubicación:</strong> ${ubicacionActual || "Sin ubicación"}<br>`;
  
  // Añadir todas las fotos al reporte
  if (fotosBase64.length > 0) {
    li.appendChild(document.createElement("p")).textContent = "Fotos:";
    fotosBase64.forEach(foto => {
      const img = document.createElement("img");
      img.src = foto;
      img.width = 150; // Tamaño de la imagen en la lista de reportes
      img.style.marginRight = '5px'; // Espacio entre imágenes
      img.style.marginBottom = '5px';
      li.appendChild(img);
    });
  }

  // Añadir todos los videos al reporte
  if (videosURL.length > 0) {
    li.appendChild(document.createElement("p")).textContent = "Videos:";
    videosURL.forEach(video => {
      const vid = document.createElement("video");
      vid.src = video;
      vid.controls = true;
      vid.width = 150; // Tamaño del video en la lista de reportes
      vid.style.marginRight = '5px'; // Espacio entre videos
      vid.style.marginBottom = '5px';
      li.appendChild(vid);
    });
  }

  // Añadir un enlace al mapa si hay ubicación
  if (ubicacionCoords) {
    const mapLink = document.createElement("a");
    mapLink.href = `https://www.google.com/maps/search/?api=1&query=${ubicacionCoords.latitude},${ubicacionCoords.longitude}`;
    mapLink.textContent = "Ver en Google Maps";
    mapLink.target = "_blank"; // Abrir en una nueva pestaña
    mapLink.style.display = 'block';
    mapLink.style.marginTop = '10px';
    li.appendChild(mapLink);
  }

  listaReportes.appendChild(li);

  // Limpiar campos y arrays después de enviar
  document.getElementById("nombre").value = "";
  document.getElementById("correo").value = "";
  document.getElementById("descripcion").value = "";
  ubicacionTexto.textContent = "";

  fotosBase64 = []; // Limpiar el array de fotos
  videosURL = [];   // Limpiar el array de videos
  ubicacionActual = null;
  ubicacionCoords = null; // Limpiar coordenadas del mapa
  displayPreviews(); // Limpiar el contenedor de vistas previas
});