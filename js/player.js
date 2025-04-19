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
    
    // Inicializar eventos del reproductor
    this.inicializarEventosReproductor();
  }

  /**
   * Inicializa los eventos relacionados con la reproducción
   */
  inicializarEventosReproductor() {
    const { 
      video, btnPlay, btnVol, volSlider, progreso, 
      btnRetro, btnAvanzar, btnFull, btnConfig, 
      cerrarConfig, selectVelocidad, selectResolucion
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
   * Carga un vídeo HLS o normal
   * @param {File} file - Archivo de vídeo a cargar
   */
  cargarVideo(file) {
    const { video, selectResolucion } = this.ui.elementos;
    
    // Validar el archivo
    const extension = file.name.split('.').pop().toLowerCase();
    if (!CONFIG.SEGURIDAD.EXTENSIONES_VIDEO.includes(extension)) {
      console.error('Formato de vídeo no soportado');
      return;
    }
    
    // Crear URL segura con revocación automática
    const url = URL.createObjectURL(file);
    setTimeout(() => URL.revokeObjectURL(url), CONFIG.SEGURIDAD.MAX_BLOB_TIEMPO);
    
    // Destruir HLS previo si existe
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    
    // Cargar vídeo según formato
    if (file.name.endsWith('.m3u8') && window.Hls && window.Hls.isSupported()) {
      this.hls = new window.Hls();
      this.hls.loadSource(url);
      this.hls.attachMedia(video);
      
      this.hls.on(window.Hls.Events.MANIFEST_PARSED, () => {
        selectResolucion.innerHTML = '<option value="auto">Auto</option>';
        this.hls.levels.forEach((lvl, i) => {
          selectResolucion.innerHTML += `<option value="${i}">${lvl.height}p</option>`;
        });
      });
    } else {
      video.src = url;
    }
    
    // Detectar orientación del vídeo una vez cargado
    video.addEventListener('loadedmetadata', () => {
      this.ui.actualizarAspectRatio(esVideoVertical(video));
    }, { once: true });
  }
}

export default Player;