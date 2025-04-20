'use strict';

import Player from './player.js';
import Playlist from './playlist.js';

/**
 * Inicializa la aplicación del reproductor de vídeo
 */
document.addEventListener('DOMContentLoaded', () => {
  // Crear instancia del reproductor
  const player = new Player();
  
  // Crear instancia de la lista de reproducción
  const playlist = new Playlist(player, player.ui);
});