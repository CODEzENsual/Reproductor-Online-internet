'use strict';

import CONFIG from './config.js';
import { formatTamaño, sanitizarTexto, generarId } from './utils.js';

/**
 * Gestiona la lista de reproducción
 * @module playlist
 */
class Playlist {
  constructor(player, ui) {
    this.player = player;
    this.ui = ui;
    this.listaDeVideos = [];
    this.videoActual = null;
    
    this.inicializarEventos();
  }
  
  /**
   * Inicializa los eventos relacionados con la lista de reproducción
   */
  inicializarEventos() {
    const { 
      inputVideo, listaVideos, btnLimpiar,
      btnConfirmSi, btnConfirmNo, cerrarAlerta
    } = this.ui.elementos;
    
    // Subir vídeo
    inputVideo.addEventListener('change', this.manejarSubidaVideo.bind(this));
    
    // Interacción con lista de vídeos
    listaVideos.addEventListener('click', this.manejarAccionesLista.bind(this));
    
    // Limpiar lista
    btnLimpiar.addEventListener('click', () => {
      this.ui.mostrarConfirmacion('¿Deseas eliminar todos los vídeos de la lista?', this.limpiarLista.bind(this));
    });
    
    // Eventos de confirmación
    btnConfirmSi.addEventListener('click', () => {
      if (this.ui.accionConfirmacion) this.ui.accionConfirmacion();
      this.ui.ocultarConfirmacion(); // Use UI method to hide and update aria-hidden
    });
    
    btnConfirmNo.addEventListener('click', () => {
      this.ui.ocultarConfirmacion(); // Use UI method to hide and update aria-hidden
    });
    
    // Cerrar alerta de tamaño
    cerrarAlerta.addEventListener('click', () => {
      this.ui.ocultarAlertaTamaño(); // Use UI method to hide and update aria-hidden
    });
  }
  
  /**
   * Maneja la subida de archivos de vídeo
   */
  manejarSubidaVideo() {
    const { inputVideo } = this.ui.elementos;
    const files = inputVideo.files;
    
    if (!files || files.length === 0) return;

    let primerVideoAñadido = this.listaDeVideos.length === 0;
    let videoParaCargar = null;

    for (const file of files) {
      // Validar tamaño
      if (file.size > CONFIG.TAMAÑO_MAXIMO) {
        this.ui.mostrarAlertaTamaño();
        console.warn(`Archivo omitido por tamaño: ${file.name}`);
        continue; // Skip this file
      }
      
      // Validar extensión
      const extension = file.name.split('.').pop().toLowerCase();
      if (!CONFIG.SEGURIDAD.EXTENSIONES_VIDEO.includes(extension)) {
        console.warn(`Archivo omitido por formato no soportado: ${file.name}`);
        continue; // Skip this file
      }
      
      const nuevoItem = this.añadirVideo(file);
      if (primerVideoAñadido && !videoParaCargar) {
        videoParaCargar = nuevoItem;
      }
    }

    if (videoParaCargar) {
      this.cargarVideo(videoParaCargar);
    }

    inputVideo.value = ''; 
  }
  
  /**
   * Añade un vídeo a la lista de reproducción y al DOM
   * @param {File} file - Archivo de vídeo a añadir
   * @returns {Object} El objeto de vídeo añadido a la lista
   */
  añadirVideo(file) {
    const { listaVideos } = this.ui.elementos;
    
    const videoVacio = listaVideos.querySelector('.video-vacio');
    if (videoVacio) videoVacio.remove();

    const id = generarId();
    
    const item = { 
      id, 
      archivo: file, 
      nombre: sanitizarTexto(file.name), 
      tamaño: file.size 
    };
    
    this.listaDeVideos.push(item);
    
    const li = document.createElement('li');
    li.id = id;
    li.className = 'item-video';
    li.innerHTML = `
      <div class="info-item-video">
        <div class="nombre-video">${sanitizarTexto(file.name)}</div>
        <div class="tamaño-video">${formatTamaño(file.size)}</div>
      </div>
      <div class="acciones-video">
        <button class="btn-accion-video btn-reproducir" data-id="${id}" aria-label="Reproducir ${sanitizarTexto(file.name)}">
          <i class="bi bi-play-fill"></i>
        </button>
        <button class="btn-accion-video btn-eliminar" data-id="${id}" aria-label="Eliminar ${sanitizarTexto(file.name)}">
          <i class="bi bi-trash"></i>
        </button>
      </div>`;
    
    listaVideos.appendChild(li);
    
    this.ui.actualizarContador(this.listaDeVideos.length);

    return item;
  }
  
  /**
   * Maneja acciones en elementos de la lista
   * @param {Event} e - Evento de clic
   */
  manejarAccionesLista(e) {
    if (e.target.closest('.btn-reproducir')) {
      const id = e.target.closest('.btn-reproducir').dataset.id;
      const video = this.listaDeVideos.find(i => i.id === id);
      if (video) this.cargarVideo(video);
    }
    
    if (e.target.closest('.btn-eliminar')) {
      const id = e.target.closest('.btn-eliminar').dataset.id;
      this.ui.mostrarConfirmacion('¿Eliminar este vídeo?', () => this.eliminarVideo(id));
    }
  }
  
  /**
   * Carga un vídeo en el reproductor
   * @param {Object} item - Objeto de vídeo a cargar
   */
  cargarVideo(item) {
    document.querySelectorAll('.item-video.activo').forEach(el => {
      el.classList.remove('activo');
    });
    
    this.player.cargarVideo(item.archivo);
    
    this.ui.actualizarInfoVideo(item.nombre, formatTamaño(item.tamaño));
    
    this.videoActual = item;
    
    document.getElementById(item.id)?.classList.add('activo');
  }
  
  /**
   * Elimina un vídeo de la lista
   * @param {string} id - ID del vídeo a eliminar
   */
  eliminarVideo(id) {
    const videoAEliminar = this.listaDeVideos.find(i => i.id === id);
    if (!videoAEliminar) return;

    const eraVideoActual = this.videoActual?.id === id;

    this.listaDeVideos = this.listaDeVideos.filter(i => i.id !== id);
    
    const elementoLi = document.getElementById(id);
    if (elementoLi) {
      elementoLi.remove();
    }
    
    this.ui.actualizarContador(this.listaDeVideos.length);
    this.actualizarPlaceholderLista();
    
    if (eraVideoActual) {
      if (this.listaDeVideos.length > 0) {
        const indiceActual = this.listaDeVideos.findIndex(v => v.id === videoAEliminar.id);
        const proximoIndice = indiceActual >= this.listaDeVideos.length ? 0 : indiceActual;
        this.cargarVideo(this.listaDeVideos[proximoIndice] || this.listaDeVideos[0]);
      } else {
        const { video } = this.ui.elementos;
        if (this.player.currentObjectURL && video.src === this.player.currentObjectURL) {
           URL.revokeObjectURL(this.player.currentObjectURL);
           this.player.currentObjectURL = null;
        }
        video.src = '';
        this.player.limpiarSubtitulos();
        this.ui.actualizarInfoVideo('Título del vídeo', 'Autor / Tamaño');
        this.videoActual = null;
      }
    }
  }
  
  /**
   * Limpia toda la lista de reproducción
   */
  limpiarLista() {
    const { video, listaVideos } = this.ui.elementos;
    
    this.listaDeVideos = [];
    
    listaVideos.innerHTML = '';
    this.actualizarPlaceholderLista();
    
    if (this.player.currentObjectURL) {
       URL.revokeObjectURL(this.player.currentObjectURL);
       this.player.currentObjectURL = null;
    }
    video.src = '';
    this.player.limpiarSubtitulos();
    
    this.ui.actualizarInfoVideo('Título del vídeo', 'Autor / Tamaño');
    this.videoActual = null;
    this.ui.actualizarContador(0);
  }

  /**
   * Checks if the playlist is empty and adds/removes the placeholder.
   */
  actualizarPlaceholderLista() {
    const { listaVideos } = this.ui.elementos;
    const videoVacio = listaVideos.querySelector('.video-vacio');

    if (this.listaDeVideos.length === 0 && !videoVacio) {
      const li = document.createElement('li');
      li.className = 'video-vacio';
      li.textContent = 'No hay vídeos en la lista';
      listaVideos.appendChild(li);
    } else if (this.listaDeVideos.length > 0 && videoVacio) {
      videoVacio.remove();
    }
  }
}

export default Playlist;