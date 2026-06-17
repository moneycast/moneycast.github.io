// Registro del service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registro fallido', err));
}

function $(id){return document.getElementById(id)}

document.addEventListener('DOMContentLoaded', ()=>{
  // Tabs
  const tabFormBtn = document.getElementById('tabFormBtn');
  const tabHistoryBtn = document.getElementById('tabHistoryBtn');
  const tabForm = document.getElementById('tabForm');
  const tabHistory = document.getElementById('tabHistory');

  function showTab(name){
    if(name==='form'){
      tabForm.classList.remove('is-hidden'); tabHistory.classList.add('is-hidden');
      tabFormBtn.classList.add('is-active'); tabHistoryBtn.classList.remove('is-active');
    } else {
      tabForm.classList.add('is-hidden'); tabHistory.classList.remove('is-hidden');
      tabHistoryBtn.classList.add('is-active'); tabFormBtn.classList.remove('is-active');
    }
  }
  tabFormBtn && tabFormBtn.addEventListener('click', ()=>showTab('form'));
  tabHistoryBtn && tabHistoryBtn.addEventListener('click', ()=>showTab('history'));
  showTab('form');

  // Detect device type and adapt UI
  const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints && navigator.maxTouchPoints>0);
  const isMobile = /Mobi|Android/i.test(navigator.userAgent);
  if(isTouch) document.body.classList.add('touch');
  if(isMobile) document.body.classList.add('device-mobile'); else document.body.classList.add('device-desktop');
  // If touch device, enlarge actionable buttons
  if(isTouch){
    [ 'previewMessages','sendAll' ].forEach(id=>{ const el = document.getElementById(id); if(el) el.classList.add('is-large'); });
  }
  // File inputs / camera & gallery buttons
  const fileCamera = $('fileCamera');
  const fileGallery = $('fileGallery');
  const cameraBtn = $('cameraBtn');
  const galleryBtn = $('galleryBtn');
  const installBtn = $('installBtn');
  const preview = $('preview');
  const previewWrap = $('previewWrap');
  const ocrStatus = $('ocrStatus');
  const card = $('card');
  const dest = $('dest');
  const phone = $('phone');
  const amount = $('amount');
  const currency = $('currency');
  const previewMessages = $('previewMessages');
  const retryOcrBtn = $('retryOcrBtn');
  const msgList = $('msgList');
  const messagesSection = $('messages');
  const sendAll = $('sendAll');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistory');
  const editingIdInput = document.getElementById('editingId');

  let currentFile = null;
  let deferredPrompt = null;
  let ocrWorker = null;
  let ocrReady = false;

  async function preloadOcr(){
    if(ocrReady) return;
    try{
      await getOcrWorker();
      ocrReady = true;
      console.log('OCR preloaded');
    }catch(err){
      console.warn('OCR preload failed', err);
    }
  }

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    if(installBtn) installBtn.classList.remove('is-hidden');
  });
  installBtn && installBtn.addEventListener('click', async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add('is-hidden');
  });

  preloadOcr();

  // Wire camera/gallery buttons
  cameraBtn && cameraBtn.addEventListener('click', ()=>{ fileCamera && fileCamera.click(); });
  galleryBtn && galleryBtn.addEventListener('click', ()=>{ fileGallery && fileGallery.click(); });
  // Mobile bottom bar wiring
  const bbFormBtn = document.getElementById('bbFormBtn');
  const bbHistoryBtn = document.getElementById('bbHistoryBtn');
  const bbCameraBtn = document.getElementById('bbCameraBtn');
  bbFormBtn && bbFormBtn.addEventListener('click', ()=>{ showTab('form'); window.scrollTo({top:0, behavior:'smooth'}); });
  bbHistoryBtn && bbHistoryBtn.addEventListener('click', ()=>{ showTab('history'); window.scrollTo({top:0, behavior:'smooth'}); });
  bbCameraBtn && bbCameraBtn.addEventListener('click', ()=>{ fileCamera && fileCamera.click(); });

  // Manejar imagen seleccionada (camera & gallery)
  async function handleFileSelected(e){
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    await preloadOcr();
    currentFile = await normalizeImage(f);
    const url = URL.createObjectURL(currentFile);
    preview.src = url;
    previewWrap.classList.remove('is-hidden');
    ocrStatus.textContent = 'Preparando OCR...';
    await scanImage();
  }
  fileCamera && fileCamera.addEventListener('change', handleFileSelected);
  fileGallery && fileGallery.addEventListener('change', handleFileSelected);

  async function normalizeImage(file){
    try{
      const bitmap = await createImageBitmap(file);
      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const ctx = canvas.getContext('2d');
      ctx.filter = 'contrast(150%) brightness(110%) grayscale(100%)';
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      return await new Promise(resolve => canvas.toBlob(blob => {
        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.8));
    }catch(err){
      return file;
    }
  }

  async function getOcrWorker(){
    if(ocrWorker) return ocrWorker;
    const workerPromise = Tesseract.createWorker({
      workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.0.2/dist/worker.min.js',
      corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4.0.2/tesseract-core.wasm.js',
      langPath: 'https://tessdata.projectnaptha.com/4.0.0/',
      gzip: true,
      logger: m => {
        if(m.status === 'recognizing text'){
          ocrStatus.textContent = `OCR ${Math.round(m.progress * 100)}%`;
        } else if(m.status === 'loading tesseract core'){
          ocrStatus.textContent = 'Cargando OCR...';
        } else if(m.status === 'loading language traineddata'){
          ocrStatus.textContent = 'Descargando modelo de idioma...';
        } else if(m.status === 'initialized api'){
          ocrStatus.textContent = 'OCR listo';
        }
      }
    });
    try{
      const worker = await workerPromise;
      ocrWorker = worker;
      await worker.load();
      await worker.loadLanguage('eng');
      await worker.initialize('eng');
      await worker.setParameters({
        tessedit_char_whitelist: '0123456789',
        tessedit_pageseg_mode: '6'
      });
      return worker;
    }catch(err){
      console.error('OCR init failed', err);
      ocrStatus.textContent = 'No se pudo inicializar OCR. Revisa tu conexión o limpia caché.';
      throw err;
    }
  }

  async function scanImage(){
    if(!currentFile){ ocrStatus.textContent = 'Seleccione una imagen primero'; return; }
    try{
      const worker = await getOcrWorker();
      ocrStatus.textContent = 'Escaneando...';
      const { data: { text } } = await worker.recognize(currentFile);
      const digits = text.replace(/\D/g,'');
      const match = digits.match(/\d{13,19}/);
      if(match){
        card.value = formatCard(match[0]);
        ocrStatus.textContent = 'Número reconocido';
        return;
      }
      ocrStatus.textContent = 'No se encontró número de tarjeta';
    }catch(err){
      console.error('OCR failed', err);
      ocrStatus.textContent = 'Tesseract falló, intentando OCRAD...';
      try{
        await scanWithOcrad();
      }catch(err2){
        console.error('OCRAD failed', err2);
        ocrStatus.textContent = 'Error OCR: ' + (err2.message || 'problema desconocido');
      }
    }
  }

  async function scanWithOcrad(){
    if(typeof Ocrad !== 'function'){
      throw new Error('OCRAD no disponible');
    }
    ocrStatus.textContent = 'Escaneando con OCRAD...';
    const bitmap = await createImageBitmap(currentFile);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const text = Ocrad(imageData);
    const digits = cleanCardDigits(text);
    const match = digits.match(/\d{13,19}/);
    if(match){
      const cardNumber = formatCard(match[0]);
      card.value = cardNumber;
      ocrStatus.textContent = `Número reconocido con OCRAD (${getCardBrand(match[0])})`;
    } else {
      ocrStatus.textContent = 'OCRAD no encontró número de tarjeta';
    }
  }

  // Formateo y validación de tarjeta
  function cleanCardDigits(value){ return (value || '').replace(/\D/g,''); }
  function formatCard(value){
    const digits = cleanCardDigits(value);
    return digits.replace(/(.{4})/g,'$1 ').trim();
  }
  function isLikelyCardNumber(value){
    const digits = cleanCardDigits(value);
    return digits.length >= 13 && digits.length <= 19;
  }
  function getCardBrand(value){
    const digits = cleanCardDigits(value);
    if(/^4/.test(digits)) return 'Visa';
    if(/^5[1-5]/.test(digits)) return 'Mastercard';
    if(/^3[47]/.test(digits)) return 'American Express';
    if(/^6(?:011|5)/.test(digits)) return 'Discover';
    if(/^(?:2131|1800|35)/.test(digits)) return 'JCB';
    if(/^3(?:0[0-5]|[68])/.test(digits)) return 'Diners Club';
    return 'Tarjeta';
  }

  // Previsualizar mensajes
  previewMessages && previewMessages.addEventListener('click', ()=>{
    const msgs = buildMessages();
    msgList.textContent = msgs.join('\n');
    messagesSection.classList.remove('is-hidden');
  });

  retryOcrBtn && retryOcrBtn.addEventListener('click', async ()=>{
    if(!currentFile){
      ocrStatus.textContent = 'Primero selecciona una imagen.';
      return;
    }
    await preloadOcr();
    await scanImage();
  });

  // Enviar mensajes secuencialmente (soporta sin número)
  sendAll && sendAll.addEventListener('click', ()=>{
    const toRaw = dest.value.trim();
    const to = toRaw.replace(/[^0-9]/g,'');
    const msgs = buildMessages();
    sendSequentialWhatsApp(to, msgs);
    // Save to history (create or update)
    const eid = editingIdInput.value;
    const entry = {
      id: eid || Date.now().toString(),
      dest: toRaw || '',
      card: card.value.trim(),
      phone: phone.value.trim(),
      amount: amount.value.trim(),
      currency: currency.value.trim(),
      ts: new Date().toISOString()
    };
    saveHistoryEntry(entry);
    editingIdInput.value = '';
    renderHistory();
  });

  // Construye un único mensaje con solo los datos (sin etiquetas)
  function buildMessages(){
    const c = card.value.trim();
    const p = phone.value.trim();
    const a = amount.value.trim();
    const cur = currency.value.trim();
    const separator = Array.from({length:10}).map(()=>'_ ').join('');
    const single = [c, p, `${a} ${cur}`].filter(Boolean).join('\n');
    const final = single + '\n' + separator;
    return [final];
  }

  function sendSequentialWhatsApp(to, msgs){
    const mobile = isMobile;
    msgs.forEach((m, i)=>{
      setTimeout(()=>{
        const text = encodeURIComponent(m);
        let url = '';
        if(to){
          // Send to specific number: prefer app on mobile, use wa.me link on desktop
          const appUrl = `whatsapp://send?phone=${to}&text=${text}`;
          const webUrl = `https://wa.me/${to}?text=${text}`;
          openWithFallback(appUrl, webUrl);
        } else {
          // No number: open WhatsApp app on mobile, or wa.me web picker on desktop
          const appUrl = `whatsapp://send?text=${text}`;
          const webUrl = `https://wa.me/?text=${text}`;
          openWithFallback(appUrl, webUrl);
        }
      }, i * 900);
    });
  }

  // Try opening appUrl (custom scheme) on mobile; if it doesn't open, fallback to webUrl.
  function openWithFallback(appUrl, webUrl){
    if(!isMobile){
      window.open(webUrl, '_blank');
      return;
    }

    let opened = false;
    const visibilityHandler = ()=>{ opened = true; };
    document.addEventListener('visibilitychange', visibilityHandler);

    // Try to open via iframe to avoid leaving the page immediately
    try{
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = appUrl;
      document.body.appendChild(iframe);
      setTimeout(()=>{
        document.body.removeChild(iframe);
      }, 700);
    }catch(e){ console.debug('iframe open failed', e); }

    // After timeout, if page still visible, open webUrl
    setTimeout(()=>{
      document.removeEventListener('visibilitychange', visibilityHandler);
      if(!opened){ window.open(webUrl, '_blank'); }
    }, 800);
  }

  // Si la app fue invocada como Share Target (sharedImage en query)
  const params = new URLSearchParams(location.search);
  if(params.has('sharedImage')){
    const dataUrl = params.get('sharedImage');
    if(dataUrl){
      preview.src = dataUrl;
      previewWrap.classList.remove('is-hidden');
      // crear un File a partir del dataURL para usar con Tesseract
      dataURLToFile(dataUrl, 'shared.jpg').then(f=>{ currentFile = f; setTimeout(scanImage,300); });
    }
  }

  // Utilidad: convertir dataURL a File
  async function dataURLToFile(dataurl, filename){
    const res = await fetch(dataurl);
    const buf = await res.arrayBuffer();
    return new File([buf], filename, {type: res.headers.get('Content-Type')||'image/jpeg'});
  }

  // --- Historial (localStorage) CRUD ---
  function loadHistory(){
    try{ const raw = localStorage.getItem('historyOps'); return raw ? JSON.parse(raw) : []; }catch(e){ return []; }
  }

  function saveHistoryList(list){ localStorage.setItem('historyOps', JSON.stringify(list)); }

  function saveHistoryEntry(entry){
    const list = loadHistory();
    const existing = list.find(i=>i.id===entry.id);
    if(existing){
      const idx = list.findIndex(i=>i.id===entry.id);
      list[idx] = entry;
    } else { list.unshift(entry); }
    saveHistoryList(list);
  }

  function deleteHistory(id){ const list = loadHistory().filter(i=>i.id!==id); saveHistoryList(list); }
  function clearHistory(){ localStorage.removeItem('historyOps'); renderHistory(); }

  function renderHistory(){
    const list = loadHistory();
    historyList.innerHTML = '';
    if(list.length===0){ historyList.innerHTML = '<div class="has-text-grey">Sin historial</div>'; return; }
    list.forEach(item=>{
      const card = document.createElement('div');
      card.className = 'history-item';
      const header = document.createElement('div');
      header.className = 'content';
      header.innerHTML = `<p><strong>${item.card || '—'}</strong></p><p class="is-size-7 has-text-grey">${item.amount || ''} ${item.currency||''} • ${new Date(item.ts).toLocaleString()}</p>`;
      const actions = document.createElement('div'); actions.className = 'buttons is-flex-wrap-wrap';
      const viewBtn = document.createElement('button'); viewBtn.textContent = 'Ver'; viewBtn.className='button is-small is-info is-light';
      const editBtn = document.createElement('button'); editBtn.textContent = 'Editar'; editBtn.className='button is-small is-warning is-light';
      const resendBtn = document.createElement('button'); resendBtn.textContent = 'Reenviar'; resendBtn.className='button is-small is-success is-light';
      const delBtn = document.createElement('button'); delBtn.textContent = 'Borrar'; delBtn.className='button is-small is-danger is-light';
      actions.append(viewBtn, editBtn, resendBtn, delBtn);
      card.append(header, actions);
      historyList.appendChild(card);

      viewBtn.addEventListener('click', ()=>{ alert(`Tarjeta: ${item.card}\nTel: ${item.phone}\nCantidad: ${item.amount} ${item.currency}`); });

      editBtn.addEventListener('click', ()=>{
        editingIdInput.value = item.id;
        dest.value = item.dest || '';
        card.value = item.card || '';
        phone.value = item.phone || '';
        amount.value = item.amount || '';
        currency.value = item.currency || '';
        window.scrollTo({top:0,behavior:'smooth'});
      });

      resendBtn.addEventListener('click', ()=>{
        const separator = Array.from({length:10}).map(()=>'_ ').join('');
        const single = [item.card || '', item.phone || '', `${item.amount || ''} ${item.currency || ''}`].filter(Boolean).join('\n');
        const final = single + '\n' + separator;
        const to = (item.dest || '').replace(/[^0-9]/g,'');
        sendSequentialWhatsApp(to, [final]);
      });

      delBtn.addEventListener('click', ()=>{ if(confirm('Eliminar este registro?')){ deleteHistory(item.id); renderHistory(); } });
    });
  }

  clearHistoryBtn && clearHistoryBtn.addEventListener('click', ()=>{ if(confirm('Borrar todo el historial?')) clearHistory(); });

  // render inicial
  renderHistory();

});

// Manejo básico de offline
self.addEventListener && console.log('app.js cargado');
