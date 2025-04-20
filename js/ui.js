'use strict';

import CONFIG from './config.js';
import { sanitizarTexto } from './utils.js';

/**
 * Controlador de la interfaz de usuario
 * @module ui
 */
class UI {
  constructor() {
    // Inicializar propiedades
    this.ultimaActividad = Date.now();
    this.temporizador = null;
    this.accionConfirmacion = null;
    this.onSubtitulosCargados = null; // Added callback property
    
    // Obtener elementos DOM (versión segura)
    this.elementos = this.obtenerElementos();
    
    // Inicializar eventos de UI
    this.inicializarEventosUI();
  }

  /**
   * Obtiene todos los elementos DOM necesarios de forma segura
   * @returns {Object} Objeto con todos los elementos DOM
   */
  obtenerElementos() {
    const elementos = {
      video: document.getElementById('video'),
      reproductor: document.getElementById('reproductor'),
      menu: document.getElementById('menu-reproductor'),
      tituloVideo: document.getElementById('titulo-video'),
      autorVideo: document.getElementById('autor-video'),
      btnPlay: document.getElementById('btn-reproducir'),
      iconPlay: document.getElementById('icono-reproducir'),
      btnVol: document.getElementById('btn-volumen'),
      iconVol: document.getElementById('icono-volumen'),
      volSlider: document.getElementById('volumen'),
      progreso: document.getElementById('progreso'),
      tiempoActual: document.getElementById('tiempo-actual'),
      tiempoTotal: document.getElementById('tiempo-total'),
      btnRetro: document.getElementById('btn-retroceder'),
      btnAvanzar: document.getElementById('btn-avanzar'),
      btnFull: document.getElementById('btn-pantalla-completa'),
      btnConfig: document.getElementById('btn-config'),
      menuConfig: document.getElementById('menu-configuracion'),
      cerrarConfig: document.getElementById('cerrar-config'),
      selectResolucion: document.getElementById('resolucion'),
      selectVelocidad: document.getElementById('velocidad'),
      inputVideo: document.getElementById('subir-video'),
      btnLimpiar: document.getElementById('limpiar-videos'),
      listaVideos: document.getElementById('lista-videos'),
      contadorVideos: document.getElementById('contador-videos'),
      alertaTamaño: document.getElementById('alerta-tamaño'),
      cerrarAlerta: document.getElementById('cerrar-alerta'),
      dialogoConfirm: document.getElementById('dialogo-confirmacion'),
      textoConfirm: document.getElementById('texto-confirmacion'),
      btnConfirmSi: document.getElementById('confirmar-si'),
      btnConfirmNo: document.getElementById('confirmar-no'),
      btnSubtitulos: document.getElementById('btn-subtitulos'),
      iconSubtitulos: document.getElementById('icono-subtitulos'),
      inputSubtitulos: document.getElementById('input-subtitulos') // Added subtitle input
    };
    
    // Verificar que todos los elementos existan
    Object.entries(elementos).forEach(([key, el]) => {
      if (!el) console.warn(`Elemento DOM no encontrado: ${key}`);
    });
    
    return elementos;
  }

  /**
   * Inicializa los eventos relacionados con la UI
   */
  inicializarEventosUI() {
    // Gestionar visibilidad del menú
    const { reproductor, menu, video, btnSubtitulos, inputSubtitulos } = this.elementos; // Added btnSubtitulos, inputSubtitulos
    
    reproductor.addEventListener('mousemove', this.showMenu.bind(this));
    reproductor.addEventListener('touchstart', this.showMenu.bind(this), { passive: true });

    // Event listener for subtitle button click
    btnSubtitulos.addEventListener('click', () => {
      inputSubtitulos.click(); // Open file dialog
    });

    // Event listener for subtitle file selection
    inputSubtitulos.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file && this.onSubtitulosCargados) {
        this.onSubtitulosCargados(file);
      }
      // Reset input value to allow loading the same file again
      inputSubtitulos.value = ''; 
    });
    
    // Iniciar temporizador para ocultar menú
    this.loopActivity();
  }

  /**
   * Muestra el menú de controles y registra actividad
   */
  showMenu() {
    const { menu, reproductor } = this.elementos;
    
    this.ultimaActividad = Date.now();
    menu.classList.add('visible');
    reproductor.classList.remove('ocultar-cursor');
  }

  /**
   * Comprueba si hay actividad reciente
   */
  checkActivity() {
    const { video, menu, reproductor, menuConfig } = this.elementos;
    
    if (!video.paused && Date.now() - this.ultimaActividad > CONFIG.ESPERA_OCULTO) {
      menu.classList.remove('visible');
      reproductor.classList.add('ocultar-cursor');
      menuConfig.classList.remove('visible');
    }
  }

  /**
   * Inicia el bucle para comprobar actividad
   */
  loopActivity() {
    clearInterval(this.temporizador);
    this.temporizador = setInterval(this.checkActivity.bind(this), 1000);
  }

  /**
   * Muestra una alerta de tamaño excedido
   */
  mostrarAlertaTamaño() {
    const { alertaTamaño } = this.elementos;
    alertaTamaño.classList.add('visible');
    alertaTamaño.setAttribute('aria-hidden', 'false'); // Make visible to screen readers
  }

  /**
   * Hides the size alert dialog.
   */
  ocultarAlertaTamaño() {
    const { alertaTamaño } = this.elementos;
    alertaTamaño.classList.remove('visible');
    alertaTamaño.setAttribute('aria-hidden', 'true'); // Hide from screen readers
  }

  /**
   * Muestra un diálogo de confirmación
   * @param {string} texto - Texto a mostrar en el diálogo
   * @param {Function} callback - Función a ejecutar al confirmar
   */
  mostrarConfirmacion(texto, callback) {
    const { textoConfirm, dialogoConfirm } = this.elementos;
    
    textoConfirm.textContent = sanitizarTexto(texto);
    dialogoConfirm.classList.add('visible');
    dialogoConfirm.setAttribute('aria-hidden', 'false'); // Make visible to screen readers
    this.accionConfirmacion = callback;
  }

  /**
   * Hides the confirmation dialog.
   */
  ocultarConfirmacion() {
    const { dialogoConfirm } = this.elementos;
    dialogoConfirm.classList.remove('visible');
    dialogoConfirm.setAttribute('aria-hidden', 'true'); // Hide from screen readers
  }

  /**
   * Establece los metadatos de un vídeo en la UI
   * @param {string} titulo - Título del vídeo
   * @param {string} info - Info adicional (autor o tamaño)
   */
  actualizarInfoVideo(titulo, info) {
    const { tituloVideo, autorVideo } = this.elementos;
    
    tituloVideo.textContent = sanitizarTexto(titulo || CONFIG.A11Y.VIDEO_SIN_TITULO);
    autorVideo.textContent = sanitizarTexto(info || CONFIG.A11Y.VIDEO_SIN_AUTOR);
  }
  
  /**
   * Actualiza el contador de vídeos y gestiona el placeholder
   * @param {number} cantidad - Cantidad de vídeos
   */
  actualizarContador(cantidad) {
    const { contadorVideos, listaVideos } = this.elementos;
    
    contadorVideos.textContent = `(${cantidad})`;
    
    if (cantidad === 0) {
      listaVideos.innerHTML = '<li class="video-vacio">No hay vídeos en la lista</li>';
    } else {
      const videoVacio = listaVideos.querySelector('.video-vacio');
      if (videoVacio) videoVacio.remove();
    }
  }
  
  /**
   * Actualiza el aspecto del reproductor según la orientación del vídeo
   * @param {boolean} esVertical - Si el vídeo es vertical
   */
  actualizarAspectRatio(esVertical) {
    const { reproductor, btnFull } = this.elementos;
    
    if (esVertical) {
      reproductor.classList.add('vertical');
      btnFull.setAttribute('disabled', 'disabled');
      btnFull.setAttribute('aria-disabled', 'true');
      btnFull.setAttribute('title', 'No disponible para vídeos verticales');
      btnFull.style.opacity = '0.5';
    } else {
      reproductor.classList.remove('vertical');
      btnFull.removeAttribute('disabled');
      btnFull.removeAttribute('aria-disabled');
      btnFull.setAttribute('title', 'Pantalla completa');
      btnFull.style.opacity = '1';
    }
  }
  
  /**
   * Gestiona el cambio de estado de reproducción en la UI
   * @param {boolean} reproduciendo - Si está reproduciendo o pausado
   */
  actualizarEstadoReproduccion(reproduciendo) {
    const { iconPlay, reproductor } = this.elementos;
    
    if (reproduciendo) {
      iconPlay.className = 'bi bi-pause-fill';
      reproductor.classList.add('reproduciendo');
      this.loopActivity();
    } else {
      iconPlay.className = 'bi bi-play-fill';
      reproductor.classList.remove('reproduciendo');
    }
  }

  /**
   * Updates the subtitle button state and icon.
   * @param {boolean} activados - Whether subtitles are active.
   */
  actualizarEstadoSubtitulos(activados) {
    const { iconSubtitulos, btnSubtitulos } = this.elementos;
    if (activados) {
      iconSubtitulos.className = 'bi bi-badge-cc-fill'; // Icon for active subtitles
      btnSubtitulos.setAttribute('aria-label', 'Desactivar subtítulos');
      btnSubtitulos.classList.add('activo'); // Optional: add visual cue
    } else {
      iconSubtitulos.className = 'bi bi-badge-cc'; // Icon for inactive subtitles
      btnSubtitulos.setAttribute('aria-label', 'Activar subtítulos');
      btnSubtitulos.classList.remove('activo'); // Optional: remove visual cue
    }
  }

  /**
   * Updates the fullscreen button state and aria-label.
   * @param {boolean} isFullscreen - Whether the player is in fullscreen mode.
   */
  actualizarEstadoFullscreen(isFullscreen) {
    const { btnFull } = this.elementos;
    const icon = btnFull.querySelector('i');
    if (isFullscreen) {
      icon.className = 'bi bi-fullscreen-exit';
      btnFull.setAttribute('aria-label', 'Salir de pantalla completa');
    } else {
      icon.className = 'bi bi-fullscreen';
      btnFull.setAttribute('aria-label', 'Activar pantalla completa');
    }
  }
}

export default UI;