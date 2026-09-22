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

  // Сохранение одного блоба. Возвращает {ok, via, cancelled?, error?}.
  // Логика разделена: здесь нет открытия превью ни в каком виде.
  const saveOneBlob = async (blob, name) => {
    // 1) Web Share API — путь для iPhone: одно нажатие, в share-sheet выбираешь «Сохранить в Фото».
    if (canShareFiles()) {
      const file = blobToFile(blob, name);
      try {
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file], title: name });
          return { ok: true, via: 'share' };
        }
      } catch (err) {
        // AbortError — пользователь закрыл share-sheet без сохранения.
        if (err && (err.name === 'AbortError' || err.name === 'NotAllowedError')) {
          return { ok: false, cancelled: true, via: 'share' };
        }
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
    let saved = 0, cancelled = 0, errors = 0;
    const total = targets.length;
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
      else { it.status = 'save-error'; errors++; }
      renderResults();
      // Пауза, чтобы пользователь успел закрыть системное меню и нажал дальше.
      if (i < total - 1) await new Promise(r => setTimeout(r, 350));
    }

    els.saveProgressFill.style.width = '100%';
    els.saveProgress.hidden = true;
    els.saveAllBtn.disabled = false;
    els.saveProgressDone.hidden = false;
    if (errors === 0 && cancelled === 0) {
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
