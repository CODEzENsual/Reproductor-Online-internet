// utils
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
const sanitize = str => {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
};

document.addEventListener('DOMContentLoaded', () => {
  // referencias
  const ids = {
    video: 'video',
    reproductor: 'reproductor',
    menu: 'menu-reproductor',
    titulo: 'titulo-video',
    autor: 'autor-video',
    btnPlay: 'btn-reproducir',
    iconPlay: 'icono-reproducir',
    btnVol: 'btn-volumen',
    iconVol: 'icono-volumen',
    volSlider: 'volumen',
    progreso: 'progreso',
    tiempoActual: 'tiempo-actual',
    tiempoTotal: 'tiempo-total',
    btnRetro: 'btn-retroceder',
    btnAvanzar: 'btn-avanzar',
    btnFull: 'btn-pantalla-completa',
    btnConfig: 'btn-config',
    menuConfig: 'menu-configuracion',
    cerrarConfig: 'cerrar-config',
    selectRes: 'resolucion',
    selectVel: 'velocidad',
    inputVideo: 'subir-video',
    btnLimpiar: 'limpiar-videos',
    listaVideos: 'lista-videos',
    contador: 'contador-videos',
    alerta: 'alerta-tamaño',
    cerrarAlerta: 'cerrar-alerta',
    dialogo: 'dialogo-confirmacion',
    textoConfirm: 'texto-confirmacion',
    btnSi: 'confirmar-si',
    btnNo: 'confirmar-no',
    inputSub: 'input-subtitulos',
    btnSub: 'btn-subtitulos',
    iconSub: 'icono-subtitulos',
    trackSub: 'track-subtitulos'
  };
  const $ = id => document.getElementById(id);
  const el = {};
  for (let k in ids) el[k] = $(ids[k]);

  // estado
  let lista = [], actual = null, hls = null;
  let ultimaAct = Date.now(), confirmCb = () => {};
  const MAX_TAM = 10 * 1024**3;

  // inactividad
  const checkInactividad = () => {
    if (!el.video.paused && Date.now() - ultimaAct > 3000) {
      el.menu.classList.remove('visible');
      el.reproductor.classList.add('ocultar-cursor');
      el.menuConfig.classList.remove('visible');
    }
    requestAnimationFrame(checkInactividad);
  };
  const showMenu = () => {
    ultimaAct = Date.now();
    el.menu.classList.add('visible');
    el.reproductor.classList.remove('ocultar-cursor');
  };

  // HLS o src
  const cargarHLS = file => {
    const url = URL.createObjectURL(file);
    if (hls) { hls.destroy(); hls = null; }
    if (file.name.endsWith('.m3u8') && window.Hls?.isSupported()) {
      hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(el.video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        el.selectRes.innerHTML =
          `<option value="auto">Auto</option>` +
          hls.levels.map((lvl,i)=>
            `<option value="${i}">${lvl.height}p</option>`
          ).join('');
      });
    } else {
      el.video.src = url;
    }
  };

  // lista
  const crearItem = item => {
    const li = document.createElement('li');
    li.id = item.id; li.className = 'item-video';
    const info = document.createElement('div');
    info.className = 'info-item-video';
    const nm = document.createElement('div');
    nm.className = 'nombre-video';
    nm.textContent = sanitize(item.nombre);
    const sz = document.createElement('div');
    sz.className = 'tamaño-video';
    sz.textContent = formatTamaño(item.tamaño);
    info.append(nm, sz);

    const actions = document.createElement('div');
    actions.className = 'acciones-video';
    ['reproducir','eliminar'].forEach(type=>{
      const btn = document.createElement('button');
      btn.className = `btn-accion-video btn-${type}`;
      btn.dataset.id = item.id;
      btn.setAttribute('aria-label', type);
      const ic = document.createElement('i');
      ic.className = `bi bi-${type==='reproducir'?'play-fill':'trash'}`;
      btn.append(ic);
      actions.append(btn);
    });
    li.append(info, actions);
    return li;
  };
  const actualizarLista = () => {
    el.contador.textContent = `(${lista.length})`;
    if (!lista.length) {
      el.listaVideos.innerHTML = '<li class="video-vacio">No hay vídeos en la lista</li>';
    }
  };
  const setCurrent = item => {
    el.listaVideos.querySelectorAll('.activo').forEach(x=>x.classList.remove('activo'));
    cargarHLS(item.archivo);
    el.titulo.textContent = sanitize(item.nombre);
    el.autor.textContent = formatTamaño(item.tamaño);
    actual = item;
    document.getElementById(item.id).classList.add('activo');
  };
  const addVideo = file => {
    const id = 'v'+Date.now();
    const it = {id, archivo:file, nombre:file.name, tamaño:file.size};
    lista.push(it);
    el.listaVideos.append(crearItem(it));
    if (lista.length===1) setCurrent(it);
    actualizarLista();
  };
  const removeVideo = id => {
    lista = lista.filter(v=>v.id!==id);
    document.getElementById(id)?.remove();
    if (actual?.id===id) {
      if (lista.length) setCurrent(lista[0]);
      else {
        el.video.removeAttribute('src');
        el.titulo.textContent='Título del vídeo';
        el.autor.textContent='Autor / Tamaño';
        actual=null;
      }
    }
    actualizarLista();
  };
  const limpiarLista = () => {
    lista=[]; actual=null;
    el.listaVideos.innerHTML = '<li class="video-vacio">No hay vídeos en la lista</li>';
    el.video.removeAttribute('src');
    el.titulo.textContent='Título del vídeo';
    el.autor.textContent='Autor / Tamaño';
    actualizarLista();
  };

  // subtítulos dyn
  el.inputSub.addEventListener('change', () => {
    const f = el.inputSub.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const tr = el.trackSub;
    tr.src = url;
    tr.mode = 'showing';
    el.iconSub.className = 'bi bi-badge-cc-fill';
  });

  // toggle subtítulos
  el.btnSub.addEventListener('click', () => {
    const tr = el.trackSub;
    if (tr.mode === 'showing') {
      tr.mode = 'hidden';
      el.iconSub.className = 'bi bi-badge-cc';
    } else {
      tr.mode = 'showing';
      el.iconSub.className = 'bi bi-badge-cc-fill';
    }
    showMenu();
  });

  // eventos básicos
  el.btnPlay.addEventListener('click', () => {
    if (el.video.paused) {
      el.video.play().then(()=> {
        el.iconPlay.className='bi bi-pause-fill';
        el.reproductor.classList.add('reproduciendo');
      }).catch(()=>{});
    } else {
      el.video.pause();
      el.iconPlay.className='bi bi-play-fill';
      el.reproductor.classList.remove('reproduciendo');
    }
    showMenu();
  });
  el.video.addEventListener('click', ()=>el.btnPlay.click());
  el.volSlider.addEventListener('input', e=> {
    el.video.volume = e.target.value;
    el.iconVol.className = el.video.volume===0
      ? 'bi bi-volume-mute-fill'
      : (el.video.volume<0.5 ? 'bi bi-volume-down-fill' : 'bi bi-volume-up-fill');
    showMenu();
  }, {passive:true});
  el.btnVol.addEventListener('click', () => {
    if (el.video.volume>0) { el.video.volume=0; el.volSlider.value=0; }
    else { el.video.volume=el.volSlider.value=0.7; }
    el.iconVol.className = el.video.volume===0
      ? 'bi bi-volume-mute-fill'
      : 'bi bi-volume-up-fill';
    showMenu();
  });

  // progreso rAF
  const updateProgress = () => {
    if (!isNaN(el.video.duration)) {
      const val = (el.video.currentTime/el.video.duration)*100;
      el.progreso.value = val;
      el.tiempoActual.textContent = formatTiempo(el.video.currentTime);
      el.progreso.setAttribute('aria-valuenow', val.toFixed(1));
    }
    requestAnimationFrame(updateProgress);
  };
  el.video.addEventListener('loadedmetadata', () => {
    el.tiempoTotal.textContent = formatTiempo(el.video.duration);
    el.tiempoActual.textContent = formatTiempo(0);
    el.progreso.value = 0;

    // ajustar ratio + fullscreen
    if (el.video.videoHeight>el.video.videoWidth) {
      el.reproductor.classList.add('vertical');
      el.btnFull.classList.add('oculto');
      el.btnFull.disabled = true;
    } else {
      el.reproductor.classList.remove('vertical');
      el.btnFull.classList.remove('oculto');
      el.btnFull.disabled = false;
    }
    requestAnimationFrame(updateProgress);
  });
  el.progreso.addEventListener('input', e => {
    el.video.currentTime = (e.target.value/100)*el.video.duration;
    showMenu();
  }, {passive:true});

  // demás controles
  el.btnRetro.addEventListener('click', () => { el.video.currentTime = Math.max(0, el.video.currentTime - 10); showMenu(); });
  el.btnAvanzar.addEventListener('click', () => { el.video.currentTime = Math.min(el.video.duration, el.video.currentTime + 10); showMenu(); });
  el.btnFull.addEventListener('click', () => {
    if (!document.fullscreenElement) el.reproductor.requestFullscreen();
    else document.exitFullscreen();
  });
  el.btnConfig.addEventListener('click', () => { el.menuConfig.classList.toggle('visible'); showMenu(); });
  el.cerrarConfig.addEventListener('click', () => { el.menuConfig.classList.remove('visible'); showMenu(); });

  el.selectVel.addEventListener('change', ()=>{ el.video.playbackRate = parseFloat(el.selectVel.value); });
  el.selectRes.addEventListener('change', ()=> {
    if (hls) hls.currentLevel = el.selectRes.value==='auto' ? -1 : parseInt(el.selectRes.value,10);
  });

  // upload vídeos
  el.inputVideo.addEventListener('change', () => {
    Array.from(el.inputVideo.files).forEach(f => {
      if (f.size>MAX_TAM) el.alerta.classList.add('visible');
      else addVideo(f);
    });
  });

  // limpiar lista con confirm
  el.btnLimpiar.addEventListener('click', () => {
    el.textoConfirm.textContent = '¿Limpiar toda la lista de vídeos?';
    el.dialogo.classList.add('visible');
    confirmCb = limpiarLista;
  });

  // lista delegado
  el.listaVideos.addEventListener('click', e => {
    const pr = e.target.closest('.btn-reproducir');
    const del = e.target.closest('.btn-eliminar');
    if (pr) setCurrent(lista.find(v=>v.id===pr.dataset.id));
    if (del) {
      el.textoConfirm.textContent = '¿Eliminar este vídeo?';
      el.dialogo.classList.add('visible');
      confirmCb = ()=>removeVideo(del.dataset.id);
    }
  });

  // confirm dialog
  el.btnSi.addEventListener('click', () => { confirmCb(); el.dialogo.classList.remove('visible'); });
  el.btnNo.addEventListener('click', () => el.dialogo.classList.remove('visible'));

  // cerrar alerta
  el.cerrarAlerta.addEventListener('click', () => el.alerta.classList.remove('visible'));

  // teclado y actividad
  document.addEventListener('keydown', e => {
    if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyF'].includes(e.code)) {
      e.preventDefault();
      const m = {
        Space: () => el.btnPlay.click(),
        ArrowLeft: () => el.btnRetro.click(),
        ArrowRight: () => el.btnAvanzar.click(),
        ArrowUp: () => { el.volSlider.value = Math.min(1,+el.volSlider.value+0.1); el.volSlider.dispatchEvent(new Event('input')); },
        ArrowDown: () => { el.volSlider.value = Math.max(0,+el.volSlider.value-0.1); el.volSlider.dispatchEvent(new Event('input')); },
        KeyF: () => el.btnFull.click()
      };
      m[e.code]?.();
    }
  }, {passive:false});

  el.reproductor.addEventListener('mousemove', showMenu, {passive:true});
  el.reproductor.addEventListener('touchstart', showMenu, {passive:true});

  requestAnimationFrame(checkInactividad);
  showMenu();
});