// Registro del service worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(err => console.warn('SW registro fallido', err));
}

function $(id){return document.getElementById(id)}

document.addEventListener('DOMContentLoaded', ()=>{
  const imageInput = $('imageInput');
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

  let currentFile = null;

  // Manejar imagen seleccionada
  imageInput.addEventListener('change', async (e)=>{
    const f = e.target.files && e.target.files[0];
    if(!f) return;
    currentFile = f;
    const url = URL.createObjectURL(f);
    preview.src = url;
    previewWrap.classList.remove('hidden');
    ocrStatus.textContent = '';
  });

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

  // Enviar 3 mensajes secuencialmente
  sendAll.addEventListener('click', ()=>{
    const to = dest.value.trim().replace(/[^0-9]/g,'');
    if(!to){ alert('Ingrese número destino (WhatsApp)'); return; }
    const msgs = buildMessages();
    sendSequentialWhatsApp(to, msgs);
  });

  function buildMessages(){
    const c = card.value.trim();
    const p = phone.value.trim();
    const a = amount.value.trim();
    const cur = currency.value.trim();
    const m1 = `Tarjeta: ${c}`;
    const m2 = `Teléfono solicitante: ${p}`;
    const m3 = `Cantidad: ${a} ${cur}`;
    return [m1,m2,m3];
  }

  function isMobile(){ return /Mobi|Android/i.test(navigator.userAgent); }

  function sendSequentialWhatsApp(to, msgs){
    const mobile = isMobile();
    msgs.forEach((m, i)=>{
      setTimeout(()=>{
        const text = encodeURIComponent(m);
        const url = mobile ? `whatsapp://send?phone=${to}&text=${text}` : `https://web.whatsapp.com/send?phone=${to}&text=${text}`;
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

});

// Manejo básico de offline
self.addEventListener && console.log('app.js cargado');
