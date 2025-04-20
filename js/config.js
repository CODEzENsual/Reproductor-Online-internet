'use strict';

/**
 * Configuración general del reproductor de vídeo
 * @module config
 */
const CONFIG = {
  /** Tiempo en ms antes de ocultar los controles */
  ESPERA_OCULTO: 3000,
  /** Tamaño máximo permitido para archivos (10GB) */
  TAMAÑO_MAXIMO: 10 * 1024 * 1024 * 1024,
  /** Tiempo para avanzar/retroceder al pulsar los botones (segundos) */
  SALTO_TIEMPO: 10,
  /** Valores y características de seguridad */
  SEGURIDAD: {
    /** Lista de extensiones permitidas para vídeos */
    EXTENSIONES_VIDEO: ['mp4', 'webm', 'ogg', 'm3u8'],
    /** Lista de extensiones permitidas para subtítulos */
    EXTENSIONES_SUBTITULOS: ['vtt', 'srt'],
    /** Tiempo máximo de caché para blobs (ms) */
    MAX_BLOB_TIEMPO: 1000 * 60 * 60 // 1 hora
  },
  /** Opciones de accesibilidad */
  A11Y: {
    /** Texto para vídeos sin título */
    VIDEO_SIN_TITULO: 'Vídeo sin título',
    /** Texto para vídeos sin autor */
    VIDEO_SIN_AUTOR: 'Autor desconocido'
  }
};

// Prevenir modificaciones a la configuración
Object.freeze(CONFIG);
Object.freeze(CONFIG.SEGURIDAD);
Object.freeze(CONFIG.A11Y);

export default CONFIG;