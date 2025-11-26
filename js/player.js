'use strict';

import CONFIG from './config.js';
import UI from './ui.js';
import { formatTiempo, esVideoVertical } from './utils.js';

/**
 * Controlador principal del reproductor de vídeo
 * @module player
 */
class Player {
  constructor() {
    // Inicializar UI
    this.ui = new UI();
    
    // Inicializar estado del reproductor
    this.hls = null;
    this.currentObjectURL = null; // To manage blob URLs for revocation
    this.currentSubtitleURL = null; // To manage subtitle blob URLs
    
    // Inicializar eventos del reproductor
    this.inicializarEventosReproductor();

    // Connect UI subtitle loading callback
    this.ui.onSubtitulosCargados = this.cargarSubtitulos.bind(this);
  }

  /**
   * Inicializa los eventos relacionados con la reproducción
   */
  inicializarEventosReproductor() {
    const { 
      video, btnPlay, btnVol, volSlider, progreso, 
      btnRetro, btnAvanzar, btnFull, btnConfig, 
      cerrarConfig, selectVelocidad, selectResolucion,
      btnSubtitulos // Added subtitle button
    } = this.ui.elementos;
    
    // Reproducir/Pausar
    btnPlay.addEventListener('click', this.togglePlay.bind(this));
    video.addEventListener('click', () => btnPlay.click());
    
    // Volumen
    volSlider.addEventListener('input', this.ajustarVolumen.bind(this));
    btnVol.addEventListener('click', this.toggleMute.bind(this));
    
    // Progreso del vídeo
    video.addEventListener('timeupdate', this.actualizarProgreso.bind(this));
    video.addEventListener('loadedmetadata', this.cargarMetadatos.bind(this));
    progreso.addEventListener('input', this.ajustarProgreso.bind(this));
    
    // Controles de navegación
    btnRetro.addEventListener('click', () => {
      video.currentTime = Math.max(0, video.currentTime - CONFIG.SALTO_TIEMPO);
      this.ui.showMenu();
    });
    
    btnAvanzar.addEventListener('click', () => {
      video.currentTime = Math.min(video.duration, video.currentTime + CONFIG.SALTO_TIEMPO);
      this.ui.showMenu();
    });
    
    // Pantalla completa
    btnFull.addEventListener('click', this.toggleFullscreen.bind(this));
    document.addEventListener('fullscreenchange', () => {
      this.ui.actualizarEstadoFullscreen(!!document.fullscreenElement);
    });
    
    // Configuración
    btnConfig.addEventListener('click', () => {
      this.ui.elementos.menuConfig.classList.toggle('visible');
      this.ui.showMenu();
    });
    
    cerrarConfig.addEventListener('click', () => {
      this.ui.elementos.menuConfig.classList.remove('visible');
      this.ui.showMenu();
    });
    
    // Cambio de velocidad
    selectVelocidad.addEventListener('change', () => {
      video.playbackRate = parseFloat(selectVelocidad.value);
    });
    
    // Resolución (para HLS)
    selectResolucion.addEventListener('change', () => {
      if (this.hls) {
        this.hls.currentLevel = selectResolucion.value === 'auto' ? -1 : parseInt(selectResolucion.value);
      }
    });
    
    // Subtítulos (toggle visibility)
    btnSubtitulos.addEventListener('click', this.toggleSubtitulos.bind(this));

    // Detección de fin de vídeo
    video.addEventListener('ended', this.manejarFinVideo.bind(this));
    
    // Atajos de teclado
    document.addEventListener('keydown', this.manejarTeclas.bind(this));
  }

  /**
   * Alterna entre reproducir y pausar el vídeo
   */
  togglePlay() {
    const { video } = this.ui.elementos;
    
    if (video.paused) {
      video.play()
        .then(() => {
          this.ui.actualizarEstadoReproduccion(true);
        })
        .catch(error => {
          console.error('Error al reproducir el vídeo:', error);
        });
    } else {
      video.pause();
      this.ui.actualizarEstadoReproduccion(false);
    }
    
    this.ui.showMenu();
  }

  /**
   * Ajusta el volumen según el slider
   */
  ajustarVolumen() {
    const { video, volSlider, iconVol } = this.ui.elementos;
    
    video.volume = volSlider.value;
    
    iconVol.className = video.volume === 0
      ? 'bi bi-volume-mute-fill'
      : video.volume < 0.5
        ? 'bi bi-volume-down-fill'
        : 'bi bi-volume-up-fill';
    const { btnVol } = this.ui.elementos;
    if(btnVol) btnVol.setAttribute('aria-pressed', video.volume === 0 ? 'true' : 'false');
    
    this.ui.showMenu();
  }

  /**
   * Alterna entre silenciar y restaurar el sonido
   */
  toggleMute() {
    const { video, volSlider, iconVol } = this.ui.elementos;
    
    if (video.volume > 0) {
      video.volume = 0;
      volSlider.value = 0;
    } else {
      video.volume = 0.7;
      volSlider.value = 0.7;
    }
    
    iconVol.className = video.volume === 0
      ? 'bi bi-volume-mute-fill'
      : 'bi bi-volume-up-fill';
    const { btnVol } = this.ui.elementos;
    if(btnVol) btnVol.setAttribute('aria-pressed', video.volume === 0 ? 'true' : 'false');
    
    this.ui.showMenu();
  }

  /**
   * Actualiza la barra de progreso durante la reproducción
   */
  actualizarProgreso() {
    const { video, progreso, tiempoActual } = this.ui.elementos;
    
    if (!isNaN(video.duration)) {
      progreso.value = (video.currentTime / video.duration) * 100;
      tiempoActual.textContent = formatTiempo(video.currentTime);
    }
  }

  /**
   * Carga los metadatos del vídeo cuando está listo
   */
  cargarMetadatos() {
    const { video, tiempoTotal, tiempoActual, progreso } = this.ui.elementos;
    
    tiempoTotal.textContent = formatTiempo(video.duration);
    tiempoActual.textContent = formatTiempo(0);
    progreso.value = 0;
    
    // Detectar si el vídeo es vertical y actualizar UI
    this.ui.actualizarAspectRatio(esVideoVertical(video));
  }

  /**
   * Ajusta la posición del vídeo según la barra de progreso
   */
  ajustarProgreso() {
    const { video, progreso } = this.ui.elementos;
    
    video.currentTime = (progreso.value / 100) * video.duration;
    this.ui.showMenu();
  }

  /**
   * Alterna entre pantalla completa y normal
   */
  toggleFullscreen() {
    const { reproductor, video } = this.ui.elementos;
    
    // No permitir pantalla completa en vídeos verticales
    if (esVideoVertical(video)) return;
    
    if (!document.fullscreenElement) {
      reproductor.requestFullscreen().catch(err => {
        console.error('Error al entrar en pantalla completa:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error('Error al salir de pantalla completa:', err);
      });
    }
    // UI update is handled by the 'fullscreenchange' event listener
  }

  /**
   * Maneja el evento de fin de vídeo
   */
  manejarFinVideo() {
    this.ui.actualizarEstadoReproduccion(false);
    this.ui.elementos.reproductor.classList.add('visible');
    clearInterval(this.ui.temporizador);
  }

  /**
   * Maneja los atajos de teclado
   * @param {KeyboardEvent} e - Evento de teclado
   */
  manejarTeclas(e) {
    const { reproductor } = this.ui.elementos;
    
    if (document.activeElement === document.body || reproductor.contains(document.activeElement)) {
      const acciones = {
        Space: () => this.ui.elementos.btnPlay.click(),
        ArrowLeft: () => this.ui.elementos.btnRetro.click(),
        ArrowRight: () => this.ui.elementos.btnAvanzar.click(),
        ArrowUp: () => {
          const { volSlider } = this.ui.elementos;
          volSlider.value = Math.min(1, parseFloat(volSlider.value) + 0.1);
          volSlider.dispatchEvent(new Event('input'));
        },
        ArrowDown: () => {
          const { volSlider } = this.ui.elementos;
          volSlider.value = Math.max(0, parseFloat(volSlider.value) - 0.1);
          volSlider.dispatchEvent(new Event('input'));
        },
        KeyF: () => this.ui.elementos.btnFull.click(),
      };
      
      if (acciones[e.code]) {
        acciones[e.code]();
        e.preventDefault();
      }
    }
  }

  /**
   * Carga un vídeo HLS o normal desde un objeto File
   * @param {File} file - Archivo de vídeo a cargar
   */
  cargarVideo(file) {
    const { video, selectResolucion } = this.ui.elementos;
    
    // Validar el archivo
    const extension = file.name.split('.').pop().toLowerCase();
    if (!CONFIG.SEGURIDAD.EXTENSIONES_VIDEO.includes(extension)) {
      this.ui.mostrarAlerta('Formato de vídeo no soportado.'); // Use a generic alert if available
      console.error('Formato de vídeo no soportado');
      return;
    }

    // Revoke previous object URL if exists
    if (this.currentObjectURL) {
      URL.revokeObjectURL(this.currentObjectURL);
      this.currentObjectURL = null;
    }
    
    // Crear URL segura
    const url = URL.createObjectURL(file);
    this.currentObjectURL = url; // Store for later revocation

    // Clear existing subtitles
    this.limpiarSubtitulos();
    
    // Cargar vídeo desde la URL generada
    this.cargarVideoDesdeUrl(url, file.name.endsWith('.m3u8'));

    // Revoke URL once metadata is loaded (safer than timeout)
    video.addEventListener('loadedmetadata', () => {
      if (this.currentObjectURL === url) { // Ensure it's the same URL
        // URL.revokeObjectURL(url); // Keep it for potential re-use/seeking issues?
        // Let's revoke when a *new* video is loaded instead.
      }
    }, { once: true });
  }

  /**
   * Carga un vídeo HLS o normal desde una URL
   * @param {string} url - URL del vídeo (puede ser blob:, http:, etc.)
   * @param {boolean} [isHLS=false] - Indica si la URL es de un manifiesto HLS
   */
  cargarVideoDesdeUrl(url, isHLS = false) {
    const { video, selectResolucion } = this.ui.elementos;

    // Destruir HLS previo si existe
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    // Cargar vídeo según formato
    if (isHLS && window.Hls && window.Hls.isSupported()) {
      this.hls = new window.Hls();
      this.hls.loadSource(url);
      this.hls.attachMedia(video);
      
      this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        selectResolucion.innerHTML = '<option value="auto">Auto</option>';
        this.hls.levels.forEach((lvl, i) => {
          selectResolucion.innerHTML += `<option value="${i}">${lvl.height}p</option>`;
        });
        selectResolucion.disabled = false;
      });
      selectResolucion.disabled = false; // Enable HLS resolution selector
    } else {
      video.src = url;
      selectResolucion.innerHTML = '<option value="auto">Auto</option>'; // Reset resolution selector
      selectResolucion.disabled = true; // Disable for non-HLS
    }
    
    // Detectar orientación del vídeo una vez cargado
    video.addEventListener('loadedmetadata', () => {
      this.ui.actualizarAspectRatio(esVideoVertical(video));
    }, { once: true });

    // Reset playback state
    this.ui.actualizarEstadoReproduccion(false);
    this.ui.elementos.progreso.value = 0;
    this.ui.elementos.tiempoActual.textContent = formatTiempo(0);
    this.ui.elementos.tiempoTotal.textContent = formatTiempo(0);
  }

  /**
   * Carga un archivo de subtítulos (.vtt, .srt)
   * @param {File} file - Archivo de subtítulos
   */
  cargarSubtitulos(file) {
    const { video } = this.ui.elementos;
    const extension = file.name.split('.').pop().toLowerCase();

    if (!['vtt', 'srt'].includes(extension)) {
      console.error('Formato de subtítulos no soportado. Use .vtt o .srt');
      // Optionally show UI feedback
      return;
    }

    // Revoke previous subtitle URL
    if (this.currentSubtitleURL) {
      URL.revokeObjectURL(this.currentSubtitleURL);
      this.currentSubtitleURL = null;
    }

    // Remove existing track elements
    this.limpiarSubtitulos();

    const url = URL.createObjectURL(file);
    this.currentSubtitleURL = url; // Store for potential revocation later

    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.label = 'Español'; // Or derive from filename?
    track.srclang = 'es'; // Or derive?
    track.src = url;
    track.default = true; // Make it active by default

    video.appendChild(track);

    // Wait a moment for the track to be processed
    setTimeout(() => {
      if (video.textTracks.length > 0) {
        video.textTracks[0].mode = 'showing'; // Ensure it's visible
        this.ui.actualizarEstadoSubtitulos(true);
      } else {
        this.ui.actualizarEstadoSubtitulos(false);
      }
    }, 100); // Small delay might be needed
  }

  /**
   * Alterna la visibilidad de la primera pista de subtítulos
   */
  toggleSubtitulos() {
    const { video } = this.ui.elementos;
    if (video.textTracks.length > 0) {
      const track = video.textTracks[0];
      const isShowing = track.mode === 'showing';
      track.mode = isShowing ? 'hidden' : 'showing';
      this.ui.actualizarEstadoSubtitulos(!isShowing);
      this.ui.showMenu();
    } else {
      // If no track exists, maybe trigger file input again?
      this.ui.elementos.inputSubtitulos.click();
    }
  }

  /**
   * Elimina todas las pistas de subtítulos del vídeo
   */
  limpiarSubtitulos() {
    const { video } = this.ui.elementos;
    // Remove existing track elements
    const tracks = video.querySelectorAll('track');
    tracks.forEach(track => video.removeChild(track));

    // Revoke subtitle URL if exists
    if (this.currentSubtitleURL) {
      URL.revokeObjectURL(this.currentSubtitleURL);
      this.currentSubtitleURL = null;
    }
    this.ui.actualizarEstadoSubtitulos(false);
  }
}

export default Player;