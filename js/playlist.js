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
      this.ui.elementos.dialogoConfirm.classList.remove('visible');
    });
    
    btnConfirmNo.addEventListener('click', () => {
      this.ui.elementos.dialogoConfirm.classList.remove('visible');
    });
    
    // Cerrar alerta de tamaño
    cerrarAlerta.addEventListener('click', () => {
      this.ui.elementos.alertaTamaño.classList.remove('visible');
    });
  }
  
  /**
   * Maneja la subida de un archivo de vídeo
   */
  manejarSubidaVideo() {
    const { inputVideo } = this.ui.elementos;
    const file = inputVideo.files[0];
    
    if (!file) return;
    
    // Validar tamaño
    if (file.size > CONFIG.TAMAÑO_MAXIMO) {
      this.ui.mostrarAlertaTamaño();
      return;
    }
    
    // Validar extensión
    const extension = file.name.split('.').pop().toLowerCase();
    if (!CONFIG.SEGURIDAD.EXTENSIONES_VIDEO.includes(extension)) {
      console.error('Formato de vídeo no soportado');
      return;
    }
    
    this.añadirVideo(file);
  }
  
  /**
   * Añade un vídeo a la lista de reproducción
   * @param {File} file - Archivo de vídeo a añadir
   */
  añadirVideo(file) {
    const { listaVideos } = this.ui.elementos;
    
    // Crear ID único
    const id = generarId();
    
    // Crear objeto de vídeo
    const item = { 
      id, 
      archivo: file, 
      nombre: sanitizarTexto(file.name), 
      tamaño: file.size 
    };
    
    // Añadir a la lista
    this.listaDeVideos.push(item);
    
    // Crear elemento de lista
    const li = document.createElement('li');
    li.id = id;
    li.className = 'item-video';
    li.innerHTML = `
      <div class="info-item-video">
        <div class="nombre-video">${sanitizarTexto(file.name)}</div>
        <div class="tamaño-video">${formatTamaño(file.size)}</div>
      </div>
      <div class="acciones-video">
        <button class="btn-accion-video btn-reproducir" data-id="${id}" aria-label="Reproducir">
          <i class="bi bi-play-fill"></i>
        </button>
        <button class="btn-accion-video btn-eliminar" data-id="${id}" aria-label="Eliminar">
          <i class="bi bi-trash"></i>
        </button>
      </div>`;
    
    listaVideos.appendChild(li);
    
    // Actualizar contador
    this.ui.actualizarContador(this.listaDeVideos.length);
    
    // Si es el primer vídeo, cargarlo automáticamente
    if (this.listaDeVideos.length === 1) {
      this.cargarVideo(item);
    }
  }
  
  /**
   * Maneja acciones en elementos de la lista
   * @param {Event} e - Evento de clic
   */
  manejarAccionesLista(e) {
    // Reproducir vídeo
    if (e.target.closest('.btn-reproducir')) {
      const id = e.target.closest('.btn-reproducir').dataset.id;
      const video = this.listaDeVideos.find(i => i.id === id);
      if (video) this.cargarVideo(video);
    }
    
    // Eliminar vídeo
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
    // Actualizar UI en lista
    document.querySelectorAll('.item-video.activo').forEach(el => {
      el.classList.remove('activo');
    });
    
    // Cargar vídeo en el reproductor
    this.player.cargarVideo(item.archivo);
    
    // Actualizar información
    this.ui.actualizarInfoVideo(item.nombre, formatTamaño(item.tamaño));
    
    // Actualizar estado actual
    this.videoActual = item;
    
    // Marcar como activo en la lista
    document.getElementById(item.id)?.classList.add('activo');
  }
  
  /**
   * Elimina un vídeo de la lista
   * @param {string} id - ID del vídeo a eliminar
   */
  eliminarVideo(id) {
    // Filtrar lista
    this.listaDeVideos = this.listaDeVideos.filter(i => i.id !== id);
    
    // Eliminar elemento DOM
    document.getElementById(id)?.remove();
    
    // Actualizar contador
    this.ui.actualizarContador(this.listaDeVideos.length);
    
    // Si era el vídeo actual, cargar otro o limpiar
    if (this.videoActual?.id === id) {
      if (this.listaDeVideos.length) {
        this.cargarVideo(this.listaDeVideos[0]);
      } else {
        const { video } = this.ui.elementos;
        video.src = '';
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
    
    // Vaciar lista
    this.listaDeVideos = [];
    
    // Limpiar DOM
    listaVideos.innerHTML = '<li class="video-vacio">No hay vídeos en la lista</li>';
    
    // Limpiar reproductor
    video.src = '';
    
    // Actualizar UI
    this.ui.actualizarInfoVideo('Título del vídeo', 'Autor / Tamaño');
    this.videoActual = null;
    this.ui.actualizarContador(0);
  }
}

export default Playlist;