'use strict';

/**
 * Funciones de utilidad para el reproductor
 * @module utils
 */

/**
 * Formatea segundos en formato MM:SS
 * @param {number} segundos - Segundos a formatear
 * @returns {string} Tiempo formateado
 */
export function formatTiempo(segundos) {
  if (isNaN(segundos) || !isFinite(segundos)) return '0:00';
  
  const minutos = Math.floor(segundos / 60);
  const secs = Math.floor(segundos % 60);
  
  return `${minutos}:${secs < 10 ? '0' + secs : secs}`;
}

/**
 * Formatea bytes en formato legible
 * @param {number} bytes - Bytes a formatear
 * @returns {string} Tamaño formateado
 */
export function formatTamaño(bytes) {
  if (isNaN(bytes) || !isFinite(bytes)) return '0 B';
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(2)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(2)} MB`;
  
  return `${(bytes / 1073741824).toFixed(2)} GB`;
}

/**
 * Genera un ID único para elementos
 * @returns {string} ID único
 */
export function generarId() {
  return 'v' + Date.now() + Math.random().toString(36).substr(2, 5);
}

/**
 * Sanitiza texto para prevenir XSS
 * @param {string} texto - Texto a sanitizar
 * @returns {string} Texto sanitizado
 */
export function sanitizarTexto(texto) {
  if (!texto) return '';
  
  const div = document.createElement('div');
  div.textContent = texto;
  return div.innerHTML;
}

/**
 * Detecta si un vídeo es vertical
 * @param {HTMLVideoElement} videoEl - Elemento de vídeo
 * @returns {boolean} True si es vertical, false si es horizontal
 */
export function esVideoVertical(videoEl) {
  // Si aún no hay metadatos disponibles, devolver false
  if (!videoEl || !videoEl.videoWidth || !videoEl.videoHeight) {
    return false;
  }
  
  // Es vertical si la altura es mayor que el ancho
  return videoEl.videoHeight > videoEl.videoWidth;
}

/**
 * Valida la extensión de un archivo
 * @param {string} nombre - Nombre del archivo
 * @param {Array<string>} extensionesPermitidas - Lista de extensiones permitidas
 * @returns {boolean} True si la extensión es válida
 */
export function validarExtension(nombre, extensionesPermitidas) {
  if (!nombre || !extensionesPermitidas || !extensionesPermitidas.length) {
    return false;
  }
  
  const extension = nombre.split('.').pop().toLowerCase();
  return extensionesPermitidas.includes(extension);
}