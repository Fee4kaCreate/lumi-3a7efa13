/* Lumi v0.5 — мобильный сервис обработки изображений
   Загрузка до 12 фото, выбор размера/формата независимо, режим fit/cover,
   Canvas-обработка, локальное сохранение настроек, pinch+drag в просмотре и кадрировании. */
(() => {
  'use strict';

  const MAX_FILES = 12;
  const ALLOWED_EXT = ['jpg','jpeg','png','webp','heic','heif'];
  const STORE_KEY = 'lumi.settings.v1';

  const $ = (id) => document.getElementById(id);

  const els = {
    pickBtn: $('pickBtn'),
    addMoreBtn: $('addMoreBtn'),
    fileInput: $('fileInput'),
    workspace: $('workspace'),
    hero: $('hero'),
    photoGrid: $('photoGrid'),
    counterValue: $('counterValue'),
    settingsCard: $('settingsCard'),
    sizePresets: $('sizePresets'),
    customSizeChip: $('customSizeChip'),
    customSize: $('customSize'),
    customW: $('customW'),
    customH: $('customH'),
    applyCustomSize: $('applyCustomSize'),
    formatChips: $('formatChips'),
    formatNote: $('formatNote'),
    modeToggle: $('modeToggle'),
    modeNote: $('modeNote'),
    processBtn: $('processBtn'),
    progressWrap: $('progressWrap'),
    progressText: $('progressText'),
    progressFill: $('progressFill'),
    results: $('results'),
    resultsSub: $('resultsSub'),
    resultsGrid: $('resultsGrid'),
    footer: $('footer'),
    clearBtn: $('clearBtn'),
    toast: $('toast'),
    viewModal: $('viewModal'),
    viewClose: $('viewClose'),
    viewStage: $('viewStage'),
    viewImage: $('viewImage'),
    cropModal: $('cropModal'),
    cropClose: $('cropClose'),
    cropStage: $('cropStage'),
    cropFrame: $('cropFrame'),
    cropImage: $('cropImage'),
    resetCrop: $('resetCrop'),
    confirmCrop: $('confirmCrop'),
    saveAllBtn: $('saveAllBtn'),
    saveProgress: $('saveProgress'),
    saveProgressText: $('saveProgressText'),
    saveProgressFill: $('saveProgressFill'),
    saveProgressDone: $('saveProgressDone'),
  };

  const state = {
    items: [],            // {id, file, name, baseName, ext, src, w, h, status, blob, blobUrl, errMsg, crop}
    settings: { w: 1800, h: 2400, format: 'png', mode: 'fit' },
    viewTargetId: null,
    viewGesture: null,    // {scale, tx, ty, baseW, baseH, minScale, maxScale, pointers:[]}
    cropTargetId: null,
    cropGesture: null,    // {scale, tx, ty, baseW, baseH, minScale, maxScale, pointers:[]}
  };
  // ---------- утилиты ----------
  const uid = () => Math.random().toString(36).slice(2, 10);
  const fmtBytes = (b) => {
    if (!Number.isFinite(b)) return '—';
    if (b < 1024) return b + ' Б';
    if (b < 1024*1024) return (b/1024).toFixed(1) + ' КБ';
    return (b/1024/1024).toFixed(1) + ' МБ';
  };
  const getExt = (name) => {
    const m = /\.([a-zA-Z0-9]+)$/.exec(name || '');
    return m ? m[1].toLowerCase() : '';
  };
  const stripExt = (name) => (name || '').replace(/\.[^.]+$/, '');
  const mimeFor = (fmt) => fmt === 'jpg' ? 'image/jpeg' : (fmt === 'webp' ? 'image/webp' : 'image/png');
  const extFor = (fmt) => fmt === 'jpg' ? 'jpg' : fmt;
  const escapeHtml = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const isFiniteN = (v) => Number.isFinite(v);

  const toast = (msg, kind='') => {
    if (!els.toast) return;
    els.toast.textContent = msg;
    els.toast.className = 'toast is-show' + (kind ? ' is-' + kind : '');
    els.toast.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => {
      els.toast.classList.remove('is-show');
      setTimeout(() => { els.toast.hidden = true; }, 250);
    }, 2400);
  };

  // ---------- настройки ----------
  const loadSettings = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (s && isFiniteN(+s.w) && isFiniteN(+s.h) && +s.w >= 50 && +s.h >= 50) {
        state.settings.w = +s.w;
        state.settings.h = +s.h;
      }
      if (s && ['png','jpg','webp'].includes(s.format)) state.settings.format = s.format;
      if (s && ['fit','cover'].includes(s.mode)) state.settings.mode = s.mode;
    } catch(_) {}
  };
  const saveSettings = () => {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        w: state.settings.w, h: state.settings.h,
        format: state.settings.format, mode: state.settings.mode
      }));
    } catch(_) {}
  };

  // ---------- UI: размер/формат/режим ----------
  const refreshPresetChips = () => {
    [...els.sizePresets.querySelectorAll('.chip[data-w]')].forEach(b => {
      const w = +b.dataset.w, h = +b.dataset.h;
      b.classList.toggle('is-active', w === state.settings.w && h === state.settings.h);
    });
    const presets = [[1800,2400],[1200,1600],[1000,1000],[1080,1350]];
    const isPreset = presets.some(([w,h]) => w === state.settings.w && h === state.settings.h);
    els.customSizeChip.classList.toggle('is-active', !isPreset);
    if (isPreset) els.customSize.hidden = true;
    els.customW.value = state.settings.w;
    els.customH.value = state.settings.h;
  };

  const refreshFormatChips = () => {
    [...els.formatChips.querySelectorAll('.chip[data-fmt]')].forEach(b => {
      b.classList.toggle('is-active', b.dataset.fmt === state.settings.format);
    });
  };

  const refreshMode = () => {
    [...els.modeToggle.querySelectorAll('.mode-btn')].forEach(b => {
      b.classList.toggle('is-active', b.dataset.mode === state.settings.mode);
    });
    if (state.items.length === 0) {
      els.modeNote.textContent = '';
    } else {
      const differs = state.items.some(it => {
        const sr = it.w / it.h, tr = state.settings.w / state.settings.h;
        return Math.abs(sr - tr) > 0.01;
      });
      els.modeNote.textContent = differs
        ? 'У части фото другие пропорции — режим «Кадрирование» попросит выбрать область.'
        : 'Пропорции совпадают — обрезка не понадобится.';
    }
  };

  const updateCropRatioCss = () => {
    if (!isFiniteN(state.settings.w) || !isFiniteN(state.settings.h) || state.settings.h <= 0) return;
    const ratio = (state.settings.w / state.settings.h).toFixed(4);
    document.documentElement.style.setProperty('--crop-ratio', ratio);
  };

  const syncControls = () => {
    refreshPresetChips();
    refreshFormatChips();
    refreshMode();
    updateCropRatioCss();
    els.processBtn.disabled = state.items.length === 0;
    if (state.items.length) {
      renderGrid();
      requestAnimationFrame(drawThumbnails);
    }
  };

  els.sizePresets.addEventListener('click', (e) => {
    const b = e.target.closest('.chip[data-w]');
    if (!b) return;
    state.settings.w = +b.dataset.w;
    state.settings.h = +b.dataset.h;
    saveSettings();
    els.customSize.hidden = true;
    syncControls();
  });

  els.customSizeChip.addEventListener('click', () => {
    els.customSize.hidden = false;
    els.customW.value = state.settings.w;
    els.customH.value = state.settings.h;
    setTimeout(() => els.customW.focus(), 50);
  });

  els.applyCustomSize.addEventListener('click', () => {
    const w = parseInt(els.customW.value, 10);
    const h = parseInt(els.customH.value, 10);
    if (!isFiniteN(w) || !isFiniteN(h) || w < 50 || h < 50) {
      toast('Введите размер от 50 px', 'warn');
      return;
    }
    state.settings.w = w;
    state.settings.h = h;
    saveSettings();
    toast('Размер применён ✨', 'ok');
    syncControls();
  });

  els.formatChips.addEventListener('click', (e) => {
    const b = e.target.closest('.chip[data-fmt]');
    if (!b || b.disabled) return;
    state.settings.format = b.dataset.fmt;
    saveSettings();
    syncControls();
  });

  els.modeToggle.addEventListener('click', (e) => {
    const b = e.target.closest('.mode-btn');
    if (!b) return;
    state.settings.mode = b.dataset.mode;
    saveSettings();
    syncControls();
  });
  // ---------- загрузка фото ----------
  // iPhone Safari: программный .click() по скрытому инпуту часто не приводит к change.
  // Сбрасываем value ДО клика, слушаем change/input и ловим focusin после закрытия пикера.
  let picking = false;
  const openPicker = () => {
    try { els.fileInput.value = ''; } catch(_) {}
    picking = true;
    els.fileInput.click();
  };
  els.pickBtn.addEventListener('click', openPicker);
  els.addMoreBtn.addEventListener('click', openPicker);

  const onFilesPicked = async () => {
    const inp = els.fileInput;
    const files = Array.from(inp.files || []);
    picking = false;
    if (!files.length) return;
    try { inp.value = ''; } catch(_) {}
    await ingestFiles(files);
  };
  els.fileInput.addEventListener('change', onFilesPicked);
  els.fileInput.addEventListener('input', onFilesPicked);
  document.addEventListener('focusin', (e) => {
    if (picking && e.target === els.fileInput) {
      setTimeout(onFilesPicked, 50);
    }
  });

  const ingestFiles = async (files) => {
    const free = MAX_FILES - state.items.length;
    if (free <= 0) { toast('Можно выбрать максимум 12 изображений', 'warn'); return; }
    const toAdd = files.slice(0, free);
    if (files.length > free) toast('Можно выбрать максимум 12 изображений', 'warn');

    for (const file of toAdd) {
      const ext = getExt(file.name);
      if (!ALLOWED_EXT.includes(ext)) {
        toast(`«${file.name}» — формат не поддерживается`, 'warn');
        continue;
      }
      const item = await readImage(file);
      if (!item) {
        toast(`«${file.name}» — не удалось прочитать файл`, 'warn');
        continue;
      }
      item.status = 'pending';
      state.items.push(item);
      renderGrid();
    }
    syncControls();
    els.workspace.hidden = state.items.length === 0;
  };

  const readImage = (file) => new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve({
        id: uid(),
        file,
        name: file.name,
        baseName: stripExt(file.name),
        ext: getExt(file.name),
        src: reader.result,
        w: img.naturalWidth,
        h: img.naturalHeight,
        status: 'pending',
        errMsg: '',
        blob: null,
        blobUrl: null,
        crop: null,
      });
      img.onerror = () => resolve(null);
      img.src = reader.result;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
  // ---------- сетка ----------
  const renderStatus = (it) => {
    if (it.status === 'pending')    return `<span class="photo-status">Ожидает обработки</span>`;
    if (it.status === 'processing') return `<span class="photo-status">Обрабатываю…</span>`;
    if (it.status === 'done')       return `<span class="photo-status is-ok">✓ Готово</span>`;
    if (it.status === 'saved')      return `<span class="photo-status is-ok">✓ Сохранено</span>`;
    if (it.status === 'error')      return `<span class="photo-status is-warn">⚠️ Не удалось обработать</span><button class="card-retry" type="button" data-act="retry">Повторить</button>`;
    return '';
  };

  const hasEmptySides = (it) => {
    if (state.settings.mode === 'cover') return false;
    const sr = it.w / it.h, tr = state.settings.w / state.settings.h;
    return Math.abs(sr - tr) > 0.01;
  };

  const renderGrid = () => {
    els.photoGrid.innerHTML = '';
    els.counterValue.textContent = state.items.length;
    const targetW = state.settings.w, targetH = state.settings.h;
    const newFmt = extFor(state.settings.format).toUpperCase();
    state.items.forEach((it) => {
      const li = document.createElement('li');
      li.className = 'photo-card';
      li.dataset.id = it.id;
      const cropped = !!it.crop;
      li.innerHTML = `
        <button class="card-remove" type="button" aria-label="Удалить" data-act="remove">✕</button>
        <button class="photo-thumb-wrap" type="button" data-act="preview" aria-label="Открыть просмотр">
          <canvas class="photo-thumb-canvas" data-thumb-id="${it.id}" aria-label="Превью"></canvas>
        </button>
        <div class="photo-name">${escapeHtml(it.name)}</div>
        <div class="photo-meta">
          <span>${it.w} × ${it.h} px</span>
          <span class="fmt">${(it.ext||'').toUpperCase() || 'IMG'}</span>
          <span>${fmtBytes(it.file.size)}</span>
        </div>
        <div class="photo-target">
          <span>${targetW} × ${targetH} <span class="dot">•</span> ${newFmt}</span>
          ${cropped
            ? '<span class="photo-cropped">✓ Кадрировано</span>'
            : (hasEmptySides(it) ? '<span class="photo-empty">Есть пустые поля</span>' : '')}
        </div>
        ${renderStatus(it)}
        <div class="card-actions">
          <button class="btn-mini-crop" type="button" data-act="crop">✂️ Кадрировать</button>
        </div>
      `;
      els.photoGrid.appendChild(li);
    });
    els.addMoreBtn.disabled = state.items.length >= MAX_FILES;
    requestAnimationFrame(drawThumbnails);
  };

  els.photoGrid.addEventListener('click', (e) => {
    const card = e.target.closest('.photo-card');
    if (!card) return;
    const id = card.dataset.id;
    const actEl = e.target.closest('[data-act]');
    const act = actEl && actEl.dataset.act;
    if (act === 'remove') {
      state.items = state.items.filter(x => x.id !== id);
      renderGrid();
      els.workspace.hidden = state.items.length === 0;
      syncControls();
    } else if (act === 'retry') {
      const it = state.items.find(x => x.id === id);
      if (it) processOne(it).then(() => afterProcess());
    } else if (act === 'preview') {
      openView(id);
    } else if (act === 'crop') {
      openCrop(id);
    }
  });
  // ---------- превью под целевой размер ----------
  // Рисует на каждом canvas миниатюру именно в выбранном размере.
  // «Без обрезки» (fit) — белая подложка, фото вписано целиком, видны белые поля.
  // «Кадрирование» (cover) — фото заполняет весь холст, лишнее обрезано, белых полей нет.
  const thumbCache = new Map();
  const getCachedImg = (it) => new Promise((resolve) => {
    if (thumbCache.has(it.id)) return resolve(thumbCache.get(it.id));
    const img = new Image();
    img.onload = () => { thumbCache.set(it.id, img); resolve(img); };
    img.onerror = () => resolve(null);
    img.src = it.src;
  });

  const fitDims = (imgW, imgH, boxW, boxH, mode) => {
    if (mode === 'cover') {
      const s = Math.max(boxW / imgW, boxH / imgH);
      const dw = imgW * s, dh = imgH * s;
      return { dw, dh, dx: (boxW - dw) / 2, dy: (boxH - dh) / 2 };
    }
    const s = Math.min(boxW / imgW, boxH / imgH);
    const dw = imgW * s, dh = imgH * s;
    return { dw, dh, dx: (boxW - dw) / 2, dy: (boxH - dh) / 2 };
  };

  // узор шахматки 8×8 на белом фоне — для свободных областей
  const CHECKER_SIZE = 8;
  const CHECKER_A = '#FFFFFF';
  const CHECKER_B = '#E7E7EA';
  const fillChecker = (ctx, w, h) => {
    ctx.fillStyle = CHECKER_A;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = CHECKER_B;
    for (let y = 0; y < h; y += CHECKER_SIZE) {
      for (let x = 0; x < w; x += CHECKER_SIZE * 2) {
        const off = ((y / CHECKER_SIZE) % 2 === 0) ? 0 : CHECKER_SIZE;
        ctx.fillRect(x + off, y, CHECKER_SIZE, CHECKER_SIZE);
      }
    }
  };

  const drawThumbnails = async () => {
    const canvases = els.photoGrid.querySelectorAll('canvas.photo-thumb-canvas');
    if (!canvases.length) return;
    const targetW = state.settings.w, targetH = state.settings.h;
    if (!isFiniteN(targetW) || !isFiniteN(targetH) || targetW <= 0 || targetH <= 0) return;
    const ratio = targetW / targetH;
    const mode = state.settings.mode;
    for (const c of canvases) {
      const id = c.dataset.thumbId;
      const it = state.items.find(x => x.id === id);
      if (!it) continue;
      const wrap = c.parentElement;
      const cssW = Math.max(120, Math.min(wrap.clientWidth || 240, 320));
      const cssH = Math.round(cssW / ratio);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.style.width = cssW + 'px';
      c.style.height = cssH + 'px';
      c.width = Math.round(cssW * dpr);
      c.height = Math.round(cssH * dpr);
      const ctx = c.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fillChecker(ctx, cssW, cssH);
      const img = await getCachedImg(it);
      if (!img || !c.isConnected) continue;
      paintPhoto(ctx, img, cssW, cssH, mode, it.crop);
    }
  };

  const fillCheckerRegion = (ctx, x, y, w, h) => {
    if (w <= 0 || h <= 0) return;
    // сохраняем текущий набор и обрезаем под регион
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    // рисуем шахматку внутри региона
    const cs = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#E7E7EA';
    const startRow = Math.floor(y / cs);
    const endRow = Math.ceil((y + h) / cs);
    const startCol = Math.floor(x / cs);
    const endCol = Math.ceil((x + w) / cs);
    for (let row = startRow; row < endRow; row++) {
      for (let col = startCol; col < endCol; col++) {
        if (((row + col) & 1) === 0) {
          const rx = col * cs, ry = row * cs;
          const ix = Math.max(x, rx), iy = Math.max(y, ry);
          const ix2 = Math.min(x + w, rx + cs), iy2 = Math.min(y + h, ry + cs);
          if (ix2 > ix && iy2 > iy) ctx.fillRect(ix, iy, ix2 - ix, iy2 - iy);
        }
      }
    }
    ctx.restore();
  };

  let _resizeRaf = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(_resizeRaf);
    _resizeRaf = requestAnimationFrame(drawThumbnails);
  });
  // ---------- обработка ----------
  const drawChecker = (ctx, w, h) => {
    // большая шахматка под результат (16 px клетки — заметно, но не кричит)
    const cs = 16;
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#E7E7EA';
    const cols = Math.ceil(w / cs), rows = Math.ceil(h / cs);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (((r + c) & 1) === 0) {
          ctx.fillRect(c * cs, r * cs, cs, cs);
        }
      }
    }
  };

  const paintPhoto = (ctx, img, w, h, mode, crop) => {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    if (crop) ctx.drawImage(img, crop.x, crop.y, crop.w, crop.h, 0, 0, w, h);
    else {const {dw,dh,dx,dy}=fitDims(img.naturalWidth,img.naturalHeight,w,h,mode);ctx.drawImage(img,dx,dy,dw,dh);}
  };
  const drawOnCanvas = (img, targetW, targetH, mode, crop) => {
    const canvas=document.createElement('canvas');canvas.width=targetW;canvas.height=targetH;
    const ctx=canvas.getContext('2d');
    // The checkerboard describes transparency in the editor, never in the file.
    if(state.settings.format==='jpg'){ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,targetW,targetH);}
    paintPhoto(ctx,img,targetW,targetH,mode,crop);
    return canvas;
  };

  const canvasToBlob = (canvas, fmt) => new Promise((resolve, reject) => {
    const mime = mimeFor(fmt);
    const q = (fmt === 'jpg') ? 0.95 : undefined;
    canvas.toBlob(b => {
      if (b && b.type === mime) return resolve(b);
      // Safari иногда возвращает PNG при попытке WEBP — пробуем фоллбэк
      if (b && fmt === 'webp') {
        canvas.toBlob(b2 => b2 ? resolve(b2) : reject(new Error('Этот формат не поддерживается браузером. Выберите PNG или JPG.')), 'image/png');
        return;
      }
      reject(new Error('Этот формат не поддерживается браузером. Выберите PNG или JPG.'));
    }, mime, q);
  });

  const processOne = async (it) => {
    it.status = 'processing';
    renderGrid();
    try {
      const img = new Image();
      img.src = it.src;
      await new Promise((res, rej) => { img.onload = res; img.onerror = () => rej(new Error('img load')); });
      const crop = state.settings.mode === 'cover' ? (it.crop || cropForAll(it)) : null;
      const canvas = drawOnCanvas(img, state.settings.w, state.settings.h, state.settings.mode, crop);
      const blob = await canvasToBlob(canvas, state.settings.format);
      if (it.blobUrl) URL.revokeObjectURL(it.blobUrl);
      it.blob = blob;
      it.blobUrl = URL.createObjectURL(blob);
      it.status = 'done';
      it.errMsg = '';
    } catch (err) {
      it.status = 'error';
      it.errMsg = (err && err.message) || 'error';
    }
    renderGrid();
  };

  // обрезка по центру под целевые пропорции, когда пользователь не задал свою
  const cropForAll = (it) => {
    const sr = it.w / it.h, tr = state.settings.w / state.settings.h;
    if (Math.abs(sr - tr) < 0.01) return { x: 0, y: 0, w: it.w, h: it.h };
    if (sr > tr) {
      const nw = Math.round(it.h * tr);
      return { x: Math.round((it.w - nw) / 2), y: 0, w: nw, h: it.h };
    }
    const nh = Math.round(it.w / tr);
    return { x: 0, y: Math.round((it.h - nh) / 2), w: it.w, h: nh };
  };

  const afterProcess = () => {
    const done = state.items.filter(x => x.status === 'done' || x.status === 'saved').length;
    const err = state.items.filter(x => x.status === 'error').length;
    els.progressText.textContent = `Обработано: ${done} из ${state.items.length}` + (err ? `, ошибок: ${err}` : '');
    els.progressFill.style.width = '100%';
    setTimeout(() => { els.progressWrap.hidden = true; }, 600);
    renderResults();
    els.results.hidden = false;
    els.footer.hidden = false;
    els.resultsSub.textContent = err
      ? `Готово: ${done} из ${state.items.length}. Ошибок: ${err} — можно повторить. Нажмите на фото, чтобы открыть просмотр.`
      : 'Нажмите на фото, чтобы открыть просмотр. Сохраняйте одной кнопкой или все разом.'
  };

  els.processBtn.addEventListener('click', async () => {
    if (!state.items.length) return;
    els.processBtn.disabled = true;
    els.progressWrap.hidden = false;
    els.progressFill.style.width = '0%';
    for (let i = 0; i < state.items.length; i++) {
      const it = state.items[i];
      els.progressText.textContent = `Обрабатываю ${i+1} из ${state.items.length}…`;
      els.progressFill.style.width = (((i) / state.items.length) * 100).toFixed(1) + '%';
      await processOne(it);
    }
    els.progressFill.style.width = '100%';
    els.processBtn.disabled = false;
    afterProcess();
  });
  // ---------- результаты ----------
  const renderResults = () => {
    els.resultsGrid.innerHTML = '';
    state.items.forEach((it) => {
      const li = document.createElement('li');
      li.className = 'result-card';
      li.dataset.id = it.id;
      const dim = `${state.settings.w} × ${state.settings.h}`;
      const newName = `${it.baseName || 'image'}.${extFor(state.settings.format)}`;
      const fmt = extFor(state.settings.format).toUpperCase();
      let statusHtml;
      if (it.status === 'saved')            statusHtml = `<span class="result-status is-saved">✓ Сохранено</span>`;
      else if (it.status === 'saving')      statusHtml = `<span class="result-status is-saving">Сохраняю…</span>`;
      else if (it.status === 'save-error')  statusHtml = `<span class="result-status is-warn">⚠️ Не удалось сохранить</span>`;
      else if (it.status === 'done')        statusHtml = `<span class="result-status is-done">Готово — нажмите, чтобы сохранить</span>`;
      else if (it.status === 'error')       statusHtml = `<span class="result-status is-warn">⚠️ Не удалось обработать</span>`;
      else                                  statusHtml = '';
      const src = it.blobUrl || it.src;
      const saveLabel = it.status === 'saved' ? '✓ Сохранено' : (it.status === 'saving' ? 'Сохраняю…' : 'Сохранить');
      const saveDisabled = it.status === 'saved' || it.status === 'saving' || !it.blob;
      li.innerHTML = `
        <button class="result-thumb-wrap" type="button" data-act="view"  aria-label="Открыть просмотр">
          <img class="result-thumb" alt="" src="${src}">
        </button>
        <div class="result-name">${escapeHtml(newName)}</div>
        <div class="result-meta">
          <span>${dim} px</span>
          <span class="fmt">${fmt}</span>
          ${it.blob ? `<span>${fmtBytes(it.blob.size)}</span>` : ''}
        </div>
        ${statusHtml}
        <button class="btn-mini-save" type="button" data-act="save"  ${saveDisabled ? 'disabled' : ''}>${saveLabel}</button>
      `;
      els.resultsGrid.appendChild(li);
    });
  };

  // тап по превью карточки = просмотр, тап по кнопке «Сохранить» = сохранение одной
  // Обработчики разделены полностью: просмотр и сохранение никогда не смешиваются.
  els.resultsGrid.addEventListener('click', (e) => {
    const saveBtn = e.target.closest('[data-act="save"]');
    if (saveBtn) {
      e.stopPropagation();
      e.preventDefault();
      const card = saveBtn.closest('.result-card');
      if (!card) return;
      saveItem(card.dataset.id);
      return;
    }
    const viewBtn = e.target.closest('[data-act="view"]');
    if (viewBtn) {
      e.stopPropagation();
      e.preventDefault();
      const card = viewBtn.closest('.result-card');
      if (!card) return;
      openResultView(card.dataset.id);
      return;
    }
  });
  // ---------- сохранение ----------
  // Главная задача: нажал «Сохранить» — файл ушёл на устройство без открытия превью.
  // На iPhone Safari единственный надёжный путь в «Фото» — Web Share API (там есть «Сохранить изображение»).
  // На Android/десктопе — anchor download: файл уезжает в «Загрузки».
  const newFileName = (it) => `${it.baseName || 'image'}.${extFor(state.settings.format)}`;
  const blobToFile = (blob, name) => {
    try { return new File([blob], name, { type: blob.type || 'image/png' }); }
    catch (_) { return blob; }
  };
  const isIOS = () => {
    const ua = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(ua)) return true;
    if (/Macintosh/.test(ua) && navigator.maxTouchPoints && navigator.maxTouchPoints > 1) return true; // iPadOS
    return false;
  };
  const canShareFiles = () => !!(navigator.canShare && navigator.share);
  // Делимся только на iPhone и iPad: там share-sheet — единственный путь в «Фото».
  // На Android и компьютере navigator.share тоже есть, и прежний код уходил в него
  // всегда — файл попадал в чужое приложение вместо «Загрузок», и выглядело это как
  // «не сохраняется». Там нужна обычная загрузка по ссылке.
  const shouldShare = () => isIOS() && canShareFiles();

  // Сохранение одного блоба. Возвращает {ok, via, cancelled?, error?}.
  // Логика разделена: здесь нет открытия превью ни в каком виде.
  const saveOneBlob = async (blob, name) => {
    // 1) Web Share API — путь для iPhone: одно нажатие, в share-sheet выбираешь «Сохранить в Фото».
    if (shouldShare()) {
      const file = blobToFile(blob, name);
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: name });
          return { ok: true, via: 'share' };
        }
      } catch (err) {
        // AbortError — пользователь закрыл share-sheet сам.
        if (err && err.name === 'AbortError') return { ok: false, cancelled: true, via: 'share' };
        // NotAllowedError — это не отказ хозяйки: браузер требует, чтобы share-sheet
        // открывался прямо по нажатию. При сохранении по очереди второе и следующие
        // фото сюда и попадали, а считались «пропущенными» — отсюда «сохранилось одно».
        if (err && err.name === 'NotAllowedError') return { ok: false, needsTap: true, via: 'share' };
        // Прочие ошибки — пробуем fallback.
      }
    }
    // 2) Anchor download — для Android и десктопа. Создаём ссылку, кликаем, чистим.
    return await new Promise((resolve) => {
      try {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = name;
        a.rel = 'noopener';
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          try { document.body.removeChild(a); } catch (_) {}
          URL.revokeObjectURL(url);
        }, 1500);
        return resolve({ ok: true, via: 'anchor' });
      } catch (err) {
        return resolve({ ok: false, via: 'anchor', error: err });
      }
    });
  };

  const saveItem = async (id) => {
    const it = state.items.find(x => x.id === id);
    if (!it || !it.blob) return false;
    const name = newFileName(it);
    const wasSaved = it.status === 'saved';
    it.status = 'saving';
    renderResults(); renderGrid();
    const res = await saveOneBlob(it.blob, name);
    if (res.ok) {
      it.status = 'saved';
      toast(`«${name}» сохранено ✨`, 'ok');
      renderResults(); renderGrid();
      return true;
    }
    if (res.cancelled) {
      // Отмена через share-sheet — откатываем на «Готово», чтобы можно было повторить.
      it.status = wasSaved ? 'saved' : 'done';
      renderResults(); renderGrid();
      return false;
    }
    it.status = 'save-error';
    it.errMsg = 'не удалось сохранить';
    renderResults(); renderGrid();
    toast('Не удалось сохранить — попробуйте снова', 'warn');
    return false;
  };

  const saveAll = async () => {
    const targets = state.items.filter(x => x.blob && x.status !== 'saved');
    if (!targets.length) { toast('Все фотографии уже сохранены', 'ok'); return; }
    if (!els.saveAllBtn) return;
    els.saveAllBtn.disabled = true;
    els.saveProgress.hidden = false;
    els.saveProgressDone.hidden = true;

    // На iPhone делим по одному файлу: navigator.share принимает набор, но пользователю удобнее по одному с явным прогрессом.
    // На остальных — anchor download каждого файла по очереди с маленькой паузой.
    let saved = 0, cancelled = 0, errors = 0, needsTap = 0;
    const total = targets.length;

    // На iPhone весь набор уходит одним share-sheet: нажатие одно, и правило браузера
    // «только по нажатию» не нарушается. Раньше фотографии отправлялись по очереди,
    // и всё после первой молча пропадало.
    if (shouldShare() && total > 1) {
      const files = targets.map(it => blobToFile(it.blob, newFileName(it)));
      let batched = false;
      try {
        if (navigator.canShare({ files })) {
          await navigator.share({ files, title: `Фотографии (${total})` });
          batched = true;
        }
      } catch (err) {
        if (err && err.name === 'AbortError') {
          for (const it of targets) it.status = 'done';
          els.saveProgress.hidden = true;
          els.saveAllBtn.disabled = false;
          els.saveProgressDone.hidden = false;
          els.saveProgressDone.textContent = 'Сохранение отменено — нажмите «Сохранить всё» ещё раз.';
          els.saveProgressDone.className = 'save-progress-done is-warn';
          renderResults();
          return;
        }
        // Остальное — пробуем по одной, как раньше.
      }
      if (batched) {
        for (const it of targets) it.status = 'saved';
        els.saveProgressFill.style.width = '100%';
        els.saveProgress.hidden = true;
        els.saveAllBtn.disabled = false;
        els.saveProgressDone.hidden = false;
        els.saveProgressDone.textContent = `✓ Все ${total} фотографий отправлены в «Фото»`;
        els.saveProgressDone.className = 'save-progress-done is-ok';
        toast(`Сохранено: ${total}`, 'ok');
        renderResults();
        return;
      }
    }
    for (let i = 0; i < total; i++) {
      const it = targets[i];
      els.saveProgressText.textContent = `Сохраняю… ${i + 1} из ${total}`;
      els.saveProgressFill.style.width = ((i / total) * 100).toFixed(1) + '%';
      it.status = 'saving';
      renderResults();
      const name = newFileName(it);
      const res = await saveOneBlob(it.blob, name);
      if (res.ok) { it.status = 'saved'; saved++; }
      else if (res.cancelled) { it.status = 'done'; cancelled++; }
      else if (res.needsTap) { it.status = 'done'; needsTap++; }
      else { it.status = 'save-error'; errors++; }
      renderResults();
      // Браузер больше не откроет окно сохранения без нового нажатия — дальше идти незачем.
      if (res.needsTap) break;
      // Пауза, чтобы пользователь успел закрыть системное меню и нажал дальше.
      if (i < total - 1) await new Promise(r => setTimeout(r, 350));
    }

    els.saveProgressFill.style.width = '100%';
    els.saveProgress.hidden = true;
    els.saveAllBtn.disabled = false;
    els.saveProgressDone.hidden = false;
    if (needsTap) {
      els.saveProgressDone.textContent = saved
        ? `Сохранено ${saved} из ${total}. Нажмите «Сохранить всё» ещё раз — телефон просит подтверждать каждый раз.`
        : 'Телефон просит подтверждать сохранение нажатием. Нажмите «Сохранить всё» ещё раз.';
      els.saveProgressDone.className = 'save-progress-done is-warn';
    } else if (errors === 0 && cancelled === 0) {
      els.saveProgressDone.textContent = `✓ Все ${saved} фотографий сохранены`;
      els.saveProgressDone.className = 'save-progress-done is-ok';
      toast(`Сохранено: ${saved}`, 'ok');
    } else if (saved > 0) {
      els.saveProgressDone.textContent = `Сохранено ${saved} из ${total}. Пропущено: ${cancelled + errors}.`;
      els.saveProgressDone.className = 'save-progress-done is-warn';
    } else {
      els.saveProgressDone.textContent = `Не удалось сохранить. Попробуйте ещё раз или сохраняйте по одной.`;
      els.saveProgressDone.className = 'save-progress-done is-warn';
    }
    renderResults();
  };
  // ---------- полноэкранный просмотр (только просмотр, без правок) ----------
  // Один палец — drag, два пальца — pinch+drag. Колесо мыши — зум на десктопе.
  // Полноэкранный просмотр одной фотографии. Используем только оригинальное фото,
  // чтобы при увеличении картинка не размывалась.
  const openView = (id, source) => {
    const it = state.items.find(x => x.id === id);
    if (!it) return;
    const useSrc = (source === 'result' && it.blobUrl) ? it.blobUrl : it.src;
    state.viewTargetId = id;
    state.viewContext = source || 'source';
    els.viewImage.removeAttribute('src');
    els.viewModal.hidden = false;
    els.viewModal.classList.remove('is-swiping');
    els.viewImage.style.transform = '';
    requestAnimationFrame(() => {
      const img = new Image();
      img.onload = () => {
        els.viewImage.src = useSrc;
        els.viewImage.style.width = img.naturalWidth + 'px';
        els.viewImage.style.height = img.naturalHeight + 'px';
        // стартовая подгонка под сцену
        const stage = els.viewStage;
        const sw = stage.clientWidth - 16, sh = stage.clientHeight - 16;
        const s = Math.min(sw / img.naturalWidth, sh / img.naturalHeight);
        const dispW = img.naturalWidth * s;
        const dispH = img.naturalHeight * s;
        const tx = (stage.clientWidth - dispW) / 2;
        const ty = (stage.clientHeight - dispH) / 2;
        state.viewGesture = {
          scale: s, tx, ty,
          baseW: img.naturalWidth, baseH: img.naturalHeight,
          sw: stage.clientWidth, sh: stage.clientHeight,
          minScale: s * 0.5, maxScale: s * 8,
          pointers: [],
        };
        applyViewTransform();
      };
      img.onerror = () => toast('Не удалось открыть фото', 'warn');
      img.src = useSrc;
    });
  };

  const openResultView = (id) => openView(id, 'result');

  const applyViewTransform = () => {
    const g = state.viewGesture; if (!g) return;
    els.viewImage.style.transform = `translate(${g.tx}px, ${g.ty}px) scale(${g.scale})`;
  };

  const constrainView = (g) => {
    const dispW = g.baseW * g.scale, dispH = g.baseH * g.scale;
    // минимум — картинка покрывает сцену (тогда нет «пустого» фона, кроме случаев когда она меньше)
    if (dispW < g.sw) {
      g.tx = (g.sw - dispW) / 2;
    } else {
      g.tx = clamp(g.tx, g.sw - dispW, 0);
    }
    if (dispH < g.sh) {
      g.ty = (g.sh - dispH) / 2;
    } else {
      g.ty = clamp(g.ty, g.sh - dispH, 0);
    }
  };

  const onViewPointerDown = (e) => {
    const g = state.viewGesture; if (!g) return;
    e.preventDefault();
    if(g.pointers.some(p=>p.id===e.pointerId))return;
    g.pointers.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
    els.viewStage.setPointerCapture(e.pointerId);
    if (g.pointers.length === 2) {
      g.startDist = Math.hypot(g.pointers[0].x - g.pointers[1].x, g.pointers[0].y - g.pointers[1].y);
      g.startScale = g.scale;
    } else {
      g.startTx = g.tx; g.startTy = g.ty;
      g.startX = e.clientX; g.startY = e.clientY;
    }
  };
  const onViewPointerMove = (e) => {
    const g = state.viewGesture; if (!g) return;
    const p = g.pointers.find(p => p.id === e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (g.pointers.length === 2) {
      const d = Math.hypot(g.pointers[0].x - g.pointers[1].x, g.pointers[0].y - g.pointers[1].y);
      const factor = d / g.startDist;
      g.scale = clamp(g.startScale * factor, g.minScale, g.maxScale);
      constrainView(g);
      applyViewTransform();
    } else if (g.pointers.length === 1) {
      g.tx = g.startTx + (e.clientX - g.startX);
      g.ty = g.startTy + (e.clientY - g.startY);
      constrainView(g);
      applyViewTransform();
    }
  };
  const onViewPointerUp = (e) => {
    const g = state.viewGesture; if (!g) return;
    g.pointers = g.pointers.filter(p => p.id !== e.pointerId);
    try { els.viewStage.releasePointerCapture(e.pointerId); } catch(_) {}
    if (g.pointers.length === 1) {
      g.startTx = g.tx; g.startTy = g.ty;
      g.startX = g.pointers[0].x; g.startY = g.pointers[0].y;
    }
  };

  els.viewStage.addEventListener('pointerdown', onViewPointerDown);
  els.viewStage.addEventListener('pointermove', onViewPointerMove);
  els.viewStage.addEventListener('pointerup', onViewPointerUp);
  els.viewStage.addEventListener('pointercancel', onViewPointerUp);
  els.viewStage.addEventListener('wheel', (e) => {
    const g = state.viewGesture; if (!g) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
    g.scale = clamp(g.scale * factor, g.minScale, g.maxScale);
    constrainView(g);
    applyViewTransform();
  }, { passive: false });

  const closeView = () => {
    els.viewModal.hidden = true;
    els.viewModal.classList.remove('is-swiping');
    els.viewImage.style.transform = '';
    els.viewImage.style.opacity = '';
    state.viewTargetId = null;
    state.viewContext = null;
    state.viewGesture = null;
    state.swipe = null;
    els.viewImage.removeAttribute('src');
  };

  // Свайп вниз — закрыть просмотр. Один палец, порог ~90 px или быстрый свайп.
  els.viewStage.addEventListener('pointerdown', (e) => {
    if (!state.viewGesture) return;
    // игнорируем начало жеста двумя пальцами — это pinch
    if (e.isPrimary === false) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    state.swipe = { id: e.pointerId, startY: e.clientY, startX: e.clientX, lastY: e.clientY, startT: performance.now(), active: true, moved: false };
  });
  els.viewStage.addEventListener('pointermove', (e) => {
    const sw = state.swipe; if (!sw || !sw.active || sw.id !== e.pointerId) return;
    // если во время свайпа появился второй палец — отменяем свайп
    if (state.viewGesture && state.viewGesture.pointers && state.viewGesture.pointers.length > 1) { sw.active = false; return; }
    const dy = e.clientY - sw.startY;
    const dx = Math.abs(e.clientX - sw.startX);
    if (dx > 30 && dx > Math.abs(dy)) { sw.active = false; return; }
    if (Math.abs(dy) > 6) sw.moved = true;
    sw.lastY = e.clientY;
    if (dy > 0 && sw.active) {
      const stage = els.viewStage;
      const opacity = Math.max(0, 1 - dy / 320);
      els.viewImage.style.transform = `translate(${state.viewGesture.tx}px, ${state.viewGesture.ty + dy}px) scale(${state.viewGesture.scale})`;
      els.viewImage.style.opacity = String(opacity);
    }
  });
  const endSwipe = (e) => {
    const sw = state.swipe; if (!sw || sw.id !== e.pointerId) return;
    const dy = sw.lastY - sw.startY;
    const dt = performance.now() - sw.startT;
    const fast = dy > 60 && dt < 250;
    const far = dy > 90;
    if (sw.active && (far || fast) && state.viewGesture) {
      closeView();
    } else if (sw.active && state.viewGesture) {
      els.viewImage.style.transform = '';
      els.viewImage.style.opacity = '';
    }
    state.swipe = null;
  };
  els.viewStage.addEventListener('pointerup', endSwipe);
  els.viewStage.addEventListener('pointercancel', endSwipe);

  els.viewClose.addEventListener('click', closeView);
  els.viewModal.addEventListener('click', (e) => {
    if (e.target === els.viewModal) closeView();
  });
  // ---------- кадрирование ----------
  // Белый холст, рамка под целевой размер. Один палец — drag, два — pinch+drag.
  const openCrop = (id) => {
    const it = state.items.find(x => x.id === id);
    if (!it) return;
    state.cropTargetId = id;
    els.cropModal.hidden = false;
    els.cropImage.removeAttribute('src');
    requestAnimationFrame(() => {
      const img = new Image();
      img.onload = () => {
        els.cropImage.src = it.src;
        const stage = els.cropStage;
        const frame = els.cropFrame;
        const sw = stage.clientWidth, sh = stage.clientHeight;
        // рамка по выбранному размеру, вписанная в сцену
        const targetRatio = state.settings.w / state.settings.h;
        let fw, fh;
        const padding = 24;
        if (sw / sh > targetRatio) {
          fh = sh - padding * 2;
          fw = fh * targetRatio;
        } else {
          fw = sw - padding * 2;
          fh = fw / targetRatio;
        }
        frame.style.left = ((sw - fw) / 2) + 'px';
        frame.style.top = ((sh - fh) / 2) + 'px';
        frame.style.width = fw + 'px';
        frame.style.height = fh + 'px';
        // стартовый масштаб: фото покрывает рамку
        const startScale = Math.min(fw / img.naturalWidth, fh / img.naturalHeight);
        const dispW = img.naturalWidth * startScale;
        const dispH = img.naturalHeight * startScale;
        state.cropGesture = {
          scale: startScale,
          tx: (fw - dispW) / 2,
          ty: (fh - dispH) / 2,
          baseW: img.naturalWidth, baseH: img.naturalHeight,
          fw, fh, sw, sh,
          minScale: startScale * 0.25,
          maxScale: startScale * 6,
          pointers: [],
          startDist: 0, startScale2: startScale,
          startTx: 0, startTy: 0, startX: 0, startY: 0,
        };
        applyCropTransform();
      };
      img.onerror = () => { toast('Не удалось загрузить фото для кадрирования', 'warn'); closeCrop(); };
      img.src = it.src;
    });
  };

  const applyCropTransform = () => {
    const g = state.cropGesture; if (!g) return;
    els.cropImage.style.width = g.baseW + 'px';
    els.cropImage.style.height = g.baseH + 'px';
    els.cropImage.style.transform = `translate(${g.tx}px, ${g.ty}px) scale(${g.scale})`;
  };

  // Фото не может быть меньше рамки — пользователь должен закрыть пустое пространство.
  const constrainCrop = (g) => {
    const dispW = g.baseW * g.scale, dispH = g.baseH * g.scale;
    g.tx = clamp(g.tx, 16 - dispW, g.fw - 16);
    g.ty = clamp(g.ty, 16 - dispH, g.fh - 16);
  };

  const onCropPointerDown = (e) => {
    const g = state.cropGesture; if (!g) return;
    e.preventDefault();
    if(g.pointers.some(p=>p.id===e.pointerId))return;
    g.pointers.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
    els.cropFrame.setPointerCapture(e.pointerId);
    if (g.pointers.length === 2) {
      const [a, b] = g.pointers;
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      g.startScale2 = g.scale;
      // якорь pinch — середина между пальцами
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const fr = els.cropFrame.getBoundingClientRect();
      const localX = mx - fr.left, localY = my - fr.top;
      g.pinchLocal = { x: localX, y: localY };
      g.pinchStartTx = g.tx; g.pinchStartTy = g.ty;
    } else {
      g.startTx = g.tx; g.startTy = g.ty;
      g.startX = e.clientX; g.startY = e.clientY;
    }
  };
  const onCropPointerMove = (e) => {
    const g = state.cropGesture; if (!g) return;
    const p = g.pointers.find(p => p.id === e.pointerId); if (!p) return;
    p.x = e.clientX; p.y = e.clientY;
    if (g.pointers.length === 2) {
      const [a, b] = g.pointers;
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const factor = d / g.startDist;
      const newScale = clamp(g.startScale2 * factor, g.minScale, g.maxScale);
      const realFactor = newScale / g.startScale2;
      g.scale = newScale;
      // смещение, чтобы точка между пальцами оставалась на месте относительно рамки
      const fr = els.cropFrame.getBoundingClientRect();
      const localX = ((a.x + b.x) / 2) - fr.left;
      const localY = ((a.y + b.y) / 2) - fr.top;
      g.tx = localX - (g.pinchLocal.x - g.pinchStartTx) * realFactor;
      g.ty = localY - (g.pinchLocal.y - g.pinchStartTy) * realFactor;
      constrainCrop(g);
      applyCropTransform();
    } else if (g.pointers.length === 1) {
      g.tx = g.startTx + (e.clientX - g.startX);
      g.ty = g.startTy + (e.clientY - g.startY);
      constrainCrop(g);
      applyCropTransform();
    }
  };
  const onCropPointerUp = (e) => {
    const g = state.cropGesture; if (!g) return;
    g.pointers = g.pointers.filter(p => p.id !== e.pointerId);
    try { els.cropFrame.releasePointerCapture(e.pointerId); } catch(_) {}
    if (g.pointers.length === 1) {
      g.startTx = g.tx; g.startTy = g.ty;
      g.startX = g.pointers[0].x; g.startY = g.pointers[0].y;
    }
  };

  els.cropFrame.addEventListener('pointerdown', onCropPointerDown);
  els.cropFrame.addEventListener('pointermove', onCropPointerMove);
  els.cropFrame.addEventListener('pointerup', onCropPointerUp);
  els.cropFrame.addEventListener('pointercancel', onCropPointerUp);
  els.cropFrame.addEventListener('wheel', (e) => {
    const g = state.cropGesture; if (!g) return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 1/1.1;
    g.scale = clamp(g.scale * factor, g.minScale, g.maxScale);
    constrainCrop(g);
    applyCropTransform();
  }, { passive: false });
  // ---------- кнопки кадрирования ----------
  // Применяет кадрирование к одной выбранной фотографии.
  // Пересчёт: видимая область рамки в координатах исходника.
  const confirmCrop = () => {
    const g = state.cropGesture;
    const it = state.items.find(x => x.id === state.cropTargetId);
    if (!g || !it) { closeCrop(); return; }
    // рамка внутри stage имеет позицию (frameLeft, frameTop); координаты g.tx/ty — относительно frame.
    // src-область: видимая часть изображения, попадающая в рамку.
    const visX = -g.tx;
    const visY = -g.ty;
    const visW = g.fw;
    const visH = g.fh;
    const sx = visX / g.scale;
    const sy = visY / g.scale;
    const sw = visW / g.scale;
    const sh = visH / g.scale;
    const crop = {x:sx,y:sy,w:sw,h:sh};
    it.crop = crop;
    toast('Кадрирование сохранено ✨', 'ok');
    closeCrop();
    renderGrid();
    requestAnimationFrame(drawThumbnails);
  };

  els.resetCrop.addEventListener('click', () => {
    if (state.cropTargetId) openCrop(state.cropTargetId);
  });
  els.confirmCrop.addEventListener('click', confirmCrop);
  els.cropClose.addEventListener('click', closeCrop);
  els.cropModal.addEventListener('click', (e) => {
    if (e.target === els.cropModal) closeCrop();
  });

  function closeCrop(){
    els.cropModal.hidden = true;
    state.cropTargetId = null;
    state.cropGesture = null;
    els.cropImage.removeAttribute('src');
  }

  // ---------- init ----------
  loadSettings();
  syncControls();
  refreshPresetChips();
  refreshFormatChips();
  refreshMode();
  updateCropRatioCss();
})();
