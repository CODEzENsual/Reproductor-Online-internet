// script.js
document.addEventListener('DOMContentLoaded', () => {
  // ELEMENTOS
  const video            = document.getElementById('video');
  const reproductor      = document.getElementById('reproductor');
  const menu             = document.getElementById('menu-reproductor');
  const tituloVideo      = document.getElementById('titulo-video');
  const autorVideo       = document.getElementById('autor-video');
  const btnPlay          = document.getElementById('btn-reproducir');
  const iconPlay         = document.getElementById('icono-reproducir');
  const btnVol           = document.getElementById('btn-volumen');
  const iconVol          = document.getElementById('icono-volumen');
  const volSlider        = document.getElementById('volumen');
  const progreso         = document.getElementById('progreso');
  const tiempoActual     = document.getElementById('tiempo-actual');
  const tiempoTotal      = document.getElementById('tiempo-total');
  const btnRetro         = document.getElementById('btn-retroceder');
  const btnAvanzar       = document.getElementById('btn-avanzar');
  const btnFull          = document.getElementById('btn-pantalla-completa');
  const btnConfig        = document.getElementById('btn-config');
  const menuConfig       = document.getElementById('menu-configuracion');
  const cerrarConfig     = document.getElementById('cerrar-config');
  const selectResolucion = document.getElementById('resolucion');
  const selectVelocidad  = document.getElementById('velocidad');
  const inputVideo       = document.getElementById('subir-video');
  const btnLimpiar       = document.getElementById('limpiar-videos');
  const listaVideos      = document.getElementById('lista-videos');
  const contadorVideos   = document.getElementById('contador-videos');
  const alertaTamaño     = document.getElementById('alerta-tamaño');
  const cerrarAlerta     = document.getElementById('cerrar-alerta');
  const dialogoConfirm   = document.getElementById('dialogo-confirmacion');
  const textoConfirm     = document.getElementById('texto-confirmacion');
  const btnConfirmSi     = document.getElementById('confirmar-si');
  const btnConfirmNo     = document.getElementById('confirmar-no');

  // VARIABLES
  let listaDeVideos = [];
  let videoActual   = null;
  let temporizador, ultimaActividad = Date.now();
  const esperaOculto    = 3000;
  const TAMAÑO_MAXIMO   = 10 * 1024 * 1024 * 1024; // 10 GB
  let accionConfirmacion= null;
  let hls = null;

  // FUNCIONES AUXILIARES
  const formatTiempo = s => {
    const m = Math.floor(s/60), sec = Math.floor(s%60);
    return `${m}:${sec<10?'0'+sec:sec}`;
  };
  const formatTamaño = b => {
    if (b<1024) return `${b} B`;
    if (b<1048576) return `${(b/1024).toFixed(2)} KB`;
    if (b<1073741824) return `${(b/1048576).toFixed(2)} MB`;
    return `${(b/1073741824).toFixed(2)} GB`;
  };
  const showMenu = () => {
    ultimaActividad = Date.now();
    menu.classList.add('visible');
    reproductor.classList.remove('ocultar-cursor');
  };
  const checkActivity = () => {
    if (!video.paused && Date.now() - ultimaActividad > esperaOculto) {
      menu.classList.remove('visible');
      reproductor.classList.add('ocultar-cursor');
      menuConfig.classList.remove('visible');
    }
  };
  const loopActivity = () => {
    clearInterval(temporizador);
    temporizador = setInterval(checkActivity, 1000);
  };
  const mostrarAlertaFn = () => alertaTamaño.classList.add('visible');
  const mostrarConfirm = (txt, cb) => {
    textoConfirm.textContent = txt;
    dialogoConfirm.classList.add('visible');
    accionConfirmacion = cb;
  };
  const actualizarContador = () => {
    contadorVideos.textContent = `(${listaDeVideos.length})`;
    if (listaDeVideos.length===0) {
      listaVideos.innerHTML = '<li class="video-vacio">No hay vídeos en la lista</li>';
    } else {
      const v = listaVideos.querySelector('.video-vacio');
      if (v) v.remove();
    }
  };

  // CARGA Y CAMBIO DE RESOLUCIÓN (HLS)
  const cargarHLS = file => {
    const url = URL.createObjectURL(file);
    if (hls) { hls.destroy(); hls = null; }
    if (file.name.endsWith('.m3u8') && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        selectResolucion.innerHTML = '<option value="auto">Auto</option>';
        hls.levels.forEach((lvl,i) => {
          selectResolucion.innerHTML += `<option value="${i}">${lvl.height}p</option>`;
        });
      });
    } else {
      video.src = url;
    }
  };

  // GESTIÓN DE LISTA DE VÍDEOS
  const cargarVideo = item => {
    document.querySelectorAll('.item-video.activo').forEach(el=>el.classList.remove('activo'));
    cargarHLS(item.archivo);
    tituloVideo.textContent = item.nombre;
    autorVideo.textContent  = formatTamaño(item.tamaño);
    videoActual = item;
    document.getElementById(item.id).classList.add('activo');
  };
  const añadirVideo = file => {
    const id = 'v'+Date.now();
    const item = { id, archivo: file, nombre: file.name, tamaño: file.size };
    listaDeVideos.push(item);
    const li = document.createElement('li');
    li.id = id; li.className='item-video';
    li.innerHTML = `
      <div class="info-item-video">
        <div class="nombre-video">${file.name}</div>
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
    actualizarContador();
    if (listaDeVideos.length===1) cargarVideo(item);
  };
  const eliminarVideo = id => {
    listaDeVideos = listaDeVideos.filter(i=>i.id!==id);
    document.getElementById(id)?.remove();
    actualizarContador();
    if (videoActual?.id===id) {
      if (listaDeVideos.length) cargarVideo(listaDeVideos[0]);
      else {
        video.src=''; tituloVideo.textContent='Título del vídeo'; autorVideo.textContent='Autor / Tamaño'; videoActual=null;
      }
    }
  };
  const limpiarLista = () => {
    listaDeVideos=[]; listaVideos.innerHTML='<li class="video-vacio">No hay vídeos en la lista</li>';
    video.src=''; tituloVideo.textContent='Título del vídeo'; autorVideo.textContent='Autor / Tamaño'; videoActual=null;
    actualizarContador();
  };

  // EVENTOS PRINCIPALES
  btnPlay.addEventListener('click', () => {
    if (video.paused) {
      video.play().then(()=> {
        iconPlay.className='bi bi-pause-fill';
        reproductor.classList.add('reproduciendo');
        loopActivity();
      }).catch(()=>{});
    } else {
      video.pause();
      iconPlay.className='bi bi-play-fill';
      reproductor.classList.remove('reproduciendo');
    }
    showMenu();
  });
  video.addEventListener('click', ()=> btnPlay.click());

  volSlider.addEventListener('input', () => {
    video.volume = volSlider.value;
    iconVol.className = video.volume === 0
      ? 'bi bi-volume-mute-fill'
      : video.volume < 0.5
        ? 'bi bi-volume-down-fill'
        : 'bi bi-volume-up-fill';
    showMenu();
  });
  btnVol.addEventListener('click', () => {
    if (video.volume > 0) {
      video.volume = 0; volSlider.value = 0;
    } else {
      video.volume = volSlider.value = 0.7;
    }
    iconVol.className = video.volume === 0
      ? 'bi bi-volume-mute-fill'
      : 'bi bi-volume-up-fill';
    showMenu();
  });

  video.addEventListener('timeupdate', () => {
    if (!isNaN(video.duration)) {
      progreso.value = (video.currentTime / video.duration) * 100;
      tiempoActual.textContent = formatTiempo(video.currentTime);
    }
  });
  video.addEventListener('loadedmetadata', () => {
    tiempoTotal.textContent = formatTiempo(video.duration);
    tiempoActual.textContent = formatTiempo(0);
    progreso.value = 0;
  });
  progreso.addEventListener('input', () => {
    video.currentTime = (progreso.value / 100) * video.duration;
    showMenu();
  });

  btnRetro.addEventListener('click', () => { video.currentTime = Math.max(0, video.currentTime - 10); showMenu(); });
  btnAvanzar.addEventListener('click', () => { video.currentTime = Math.min(video.duration, video.currentTime + 10); showMenu(); });

  btnFull.addEventListener('click', () => {
    if (video.videoHeight > video.videoWidth) return;
    if (!document.fullscreenElement) reproductor.requestFullscreen();
    else document.exitFullscreen();
  });

  btnConfig.addEventListener('click', () => { menuConfig.classList.toggle('visible'); showMenu(); });
  cerrarConfig.addEventListener('click', () => { menuConfig.classList.remove('visible'); showMenu(); });

  selectVelocidad.addEventListener('change', () => { video.playbackRate = parseFloat(selectVelocidad.value); });
  selectResolucion.addEventListener('change', () => {
    if (hls) {
      hls.currentLevel = selectResolucion.value === 'auto' ? -1 : parseInt(selectResolucion.value);
    }
  });

  inputVideo.addEventListener('change', () => {
    const file = inputVideo.files[0];
    if (!file) return;
    if (file.size > TAMAÑO_MAXIMO) return mostrarAlertaFn();
    añadirVideo(file);
  });

  listaVideos.addEventListener('click', e => {
    if (e.target.closest('.btn-reproducir')) {
      const id = e.target.closest('.btn-reproducir').dataset.id;
      cargarVideo(listaDeVideos.find(i => i.id === id));
    }
    if (e.target.closest('.btn-eliminar')) {
      const id = e.target.closest('.btn-eliminar').dataset.id;
      mostrarConfirm('¿Eliminar este vídeo?', () => eliminarVideo(id));
    }
  });

  btnConfirmarSi.addEventListener('click', () => { accionConfirmacion(); dialogoConfirm.classList.remove('visible'); });
  btnConfirmarNo.addEventListener('click', () => dialogoConfirm.classList.remove('visible'));

  cerrarAlerta.addEventListener('click', () => alertaTamaño.classList.remove('visible'));

  reproductor.addEventListener('mousemove', showMenu);
  reproductor.addEventListener('touchstart', showMenu, { passive: true });

  video.addEventListener('ended', () => {
    iconPlay.className = 'bi bi-play-fill';
    reproductor.classList.add('visible');
    reproductor.classList.remove('reproduciendo');
    clearInterval(temporizador);
    if (videoActual) {
      const idx = listaDeVideos.findIndex(i => i.id === videoActual.id);
      if (idx >= 0 && idx < listaDeVideos.length - 1) {
        setTimeout(() => {
          cargarVideo(listaDeVideos[idx + 1]);
          btnPlay.click();
        }, 1500);
      }
    }
  });

  document.addEventListener('keydown', e => {
    if (document.activeElement === document.body || reproductor.contains(document.activeElement)) {
      const acciones = {
        Space:   () => btnPlay.click(),
        ArrowLeft:  () => btnRetro.click(),
        ArrowRight: () => btnAvanzar.click(),
        ArrowUp:    () => { volSlider.value = Math.min(1, parseFloat(volSlider.value) + 0.1); volSlider.dispatchEvent(new Event('input')); },
        ArrowDown:  () => { volSlider.value = Math.max(0, parseFloat(volSlider.value) - 0.1); volSlider.dispatchEvent(new Event('input')); },
        KeyF:       () => btnFull.click(),
      };
      if (acciones[e.code]) { acciones[e.code](); e.preventDefault(); }
    }
  });

  loopActivity();
  showMenu();
});
