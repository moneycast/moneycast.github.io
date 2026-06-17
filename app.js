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
      tabForm.classList.remove('hidden'); tabHistory.classList.add('hidden');
      tabFormBtn.classList.add('bg-white/20'); tabHistoryBtn.classList.remove('bg-white/20');
    } else {
      tabForm.classList.add('hidden'); tabHistory.classList.remove('hidden');
      tabHistoryBtn.classList.add('bg-white/20'); tabFormBtn.classList.remove('bg-white/20');
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
    [ 'scanBtn','previewMessages','sendAll' ].forEach(id=>{ const el = document.getElementById(id); if(el) el.classList.add('px-5','py-3','text-base'); });
  }
  // File inputs / camera & gallery buttons
  const fileCamera = $('fileCamera');
  const fileGallery = $('fileGallery');
  const cameraBtn = $('cameraBtn');
  const galleryBtn = $('galleryBtn');
  const installBtn = $('installBtn');
  const preview = $('preview');
  const previewWrap = $('previewWrap');
  const scanBtn = $('scanBtn');
  const ocrStatus = $('ocrStatus');
  const card = $('card');
  const dest = $('dest');
  const phone = $('phone');
  const amount = $('amount');
  const currency = $('currency');
  const previewMessages = $('previewMessages');
  const msgList = $('msgList');
  const messagesSection = $('messages');
  const sendAll = $('sendAll');
  const historyList = document.getElementById('historyList');
  const clearHistoryBtn = document.getElementById('clearHistory');
  const editingIdInput = document.getElementById('editingId');

  let currentFile = null;
  let deferredPrompt = null;

  // PWA install prompt
  window.addEventListener('beforeinstallprompt', (e)=>{
    e.preventDefault();
    deferredPrompt = e;
    if(installBtn) installBtn.classList.remove('hidden');
  });
  installBtn && installBtn.addEventListener('click', async ()=>{
    if(!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBtn.classList.add('hidden');
  });

  // Wire camera/gallery buttons
  cameraBtn && cameraBtn.addEventListener('click', ()=>{ fileCamera && fileCamera.click(); });
  galleryBtn && galleryBtn.addEventListener('click', ()=>{ fileGallery && fileGallery.click(); });

  // Manejar imagen seleccionada (camera & gallery)
  function handleFileSelected(e){
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    currentFile = f;
    const url = URL.createObjectURL(f);
    preview.src = url;
    previewWrap.classList.remove('hidden');
    ocrStatus.textContent = '';
  }
  fileCamera && fileCamera.addEventListener('change', handleFileSelected);
  fileGallery && fileGallery.addEventListener('change', handleFileSelected);

  // Escanear con Tesseract
  scanBtn.addEventListener('click', async ()=>{
    if(!currentFile){ ocrStatus.textContent = 'Seleccione una imagen primero'; return; }
    ocrStatus.textContent = 'Escaneando...';
    try{
      const { data: { text } } = await Tesseract.recognize(currentFile, 'spa');
      const digits = text.replace(/\D/g,'');
      const match = digits.match(/\d{13,19}/);
      if(match){
        card.value = formatCard(match[0]);
        ocrStatus.textContent = 'Número reconocido';
      } else {
        ocrStatus.textContent = 'No se encontró número de tarjeta';
      }
    }catch(err){
      console.error(err);
      ocrStatus.textContent = 'Error durante OCR';
    }
  });

  // Formateo simple de tarjeta
  function formatCard(s){ return s.replace(/(.{4})/g,'$1 ').trim(); }

  // Previsualizar mensajes
  previewMessages.addEventListener('click', ()=>{
    const msgs = buildMessages();
    msgList.innerHTML = '';
    msgs.forEach(m=>{ const li = document.createElement('li'); li.textContent = m; msgList.appendChild(li); });
    messagesSection.classList.remove('hidden');
  });

  // Enviar mensajes secuencialmente (soporta sin número)
  sendAll.addEventListener('click', ()=>{
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
          // Send to specific number
          url = mobile ? `whatsapp://send?phone=${to}&text=${text}` : `https://web.whatsapp.com/send?phone=${to}&text=${text}`;
        } else {
          // No number: open WhatsApp and let user pick contact
          url = mobile ? `whatsapp://send?text=${text}` : `https://wa.me/?text=${text}`;
        }
        window.open(url, '_blank');
      }, i * 900);
    });
  }

  // Si la app fue invocada como Share Target (sharedImage en query)
  const params = new URLSearchParams(location.search);
  if(params.has('sharedImage')){
    const dataUrl = params.get('sharedImage');
    if(dataUrl){
      preview.src = dataUrl;
      previewWrap.classList.remove('hidden');
      // crear un File a partir del dataURL para usar con Tesseract
      dataURLToFile(dataUrl, 'shared.jpg').then(f=>{ currentFile = f; setTimeout(()=>$('scanBtn').click(),300); });
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
    if(list.length===0){ historyList.innerHTML = '<li class="py-2 text-sm text-gray-500">Sin historial</li>'; return; }
    list.forEach(item=>{
      const li = document.createElement('li');
      li.className = 'py-2 flex items-center justify-between';
      const left = document.createElement('div');
      left.innerHTML = `<div class="text-sm font-medium">${item.card || '—'}</div><div class="text-xs text-gray-500">${item.amount || ''} ${item.currency||''} • ${new Date(item.ts).toLocaleString()}</div>`;
      const actions = document.createElement('div'); actions.className = 'flex gap-2';
      const viewBtn = document.createElement('button'); viewBtn.textContent = 'Ver'; viewBtn.className='text-sm text-sky-600';
      const editBtn = document.createElement('button'); editBtn.textContent = 'Editar'; editBtn.className='text-sm text-amber-600';
      const resendBtn = document.createElement('button'); resendBtn.textContent = 'Reenviar'; resendBtn.className='text-sm text-green-600';
      const delBtn = document.createElement('button'); delBtn.textContent = 'Borrar'; delBtn.className='text-sm text-red-600';
      actions.append(viewBtn, editBtn, resendBtn, delBtn);
      li.append(left, actions);
      historyList.appendChild(li);

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
