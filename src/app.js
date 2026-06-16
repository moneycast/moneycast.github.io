// src/app.js – Remesas PWA SPA

// ──────────────────────────────────────────────
// Utility: create DOM elements with Tailwind classes
// ──────────────────────────────────────────────
function el(tag, classes = '', attrs = {}, ...children) {
  const element = document.createElement(tag);
  if (classes) element.className = classes;
  Object.entries(attrs).forEach(([k, v]) => element.setAttribute(k, v));
  children.forEach((child) => {
    if (typeof child === 'string') element.appendChild(document.createTextNode(child));
    else if (child) element.appendChild(child);
  });
  return element;
}

// ──────────────────────────────────────────────
// Card number formatter: "9238129971831286" → "9238 1299 7183 1286"
// ──────────────────────────────────────────────
function formatCardNumber(raw) {
  const digits = raw.replace(/\D/g, '');
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

// ──────────────────────────────────────────────
// Extract best 16-digit card number from OCR text
// Handles common OCR artifacts (O→0, l→1, space noise, etc.)
// ──────────────────────────────────────────────
function extractCardNumber(text) {
  // Normalize common OCR mistakes on digits
  const normalized = text
    .replace(/[Oo]/g, '0')
    .replace(/[lI]/g, '1')
    .replace(/[Ss]/g, '5')
    .replace(/[Bb]/g, '8');

  // Try to find a 16-digit group (with optional spaces/dashes every 4 digits)
  const patterns = [
    // 4+space+4+space+4+space+4
    /\b(\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4})\b/g,
    // 16 consecutive digits
    /\b(\d{16})\b/g,
    // 13–19 digits (catch-all)
    /\b(\d{13,19})\b/g,
  ];

  for (const pattern of patterns) {
    const matches = [...normalized.matchAll(pattern)];
    if (matches.length > 0) {
      // Pick the match whose digit count is closest to 16
      const best = matches.reduce((prev, curr) => {
        const pd = prev[1].replace(/\D/g, '').length;
        const cd = curr[1].replace(/\D/g, '').length;
        return Math.abs(cd - 16) < Math.abs(pd - 16) ? curr : prev;
      });
      return best[1].replace(/\D/g, '');
    }
  }
  return null;
}

// ──────────────────────────────────────────────
// Background Tesseract.js Worker
// ──────────────────────────────────────────────
let ocrWorker = null;
let currentOcrStatusEl = null;

async function initTesseractWorker() {
  if (typeof Tesseract === 'undefined') return;
  try {
    ocrWorker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (currentOcrStatusEl && m.status === 'recognizing text') {
          currentOcrStatusEl.textContent = `🔍 OCR: ${Math.round(m.progress * 100)}%`;
        }
      }
    });
    await ocrWorker.setParameters({
      tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
    });
    console.log('[Tesseract] Worker ready in background.');
  } catch (err) {
    console.error('[Tesseract] Init error:', err);
  }
}

// ──────────────────────────────────────────────
// OCR via Tesseract.js (runs entirely in the browser)
// ──────────────────────────────────────────────
async function ocrWithTesseract(imageFile, statusEl) {
  if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js not loaded');

  statusEl.textContent = '🔍 Analizando imagen…';

  if (ocrWorker) {
    currentOcrStatusEl = statusEl;
    const { data } = await ocrWorker.recognize(imageFile);
    currentOcrStatusEl = null;
    return data.text || '';
  }

  // Fallback if worker not ready
  const { data } = await Tesseract.recognize(imageFile, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        statusEl.textContent = `🔍 OCR: ${Math.round(m.progress * 100)}%`;
      }
    },
    tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
  });

  return data.text || '';
}

// ──────────────────────────────────────────────
// OCR via OCR.space free API (fallback)
// ──────────────────────────────────────────────
async function ocrWithOcrSpace(imageFile, statusEl) {
  statusEl.textContent = '☁️ Enviando a servidor OCR…';

  const formData = new FormData();
  formData.append('apikey', 'helloworld');
  formData.append('file', imageFile);
  formData.append('language', 'eng');
  formData.append('isOverlayRequired', 'false');
  formData.append('scale', 'true');
  formData.append('isTable', 'false');
  formData.append('OCREngine', '2'); // Engine 2 is better for digits

  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();
  if (result.IsErroredOnProcessing) throw new Error(result.ErrorMessage?.[0] || 'OCR.space error');
  return result.ParsedResults?.[0]?.ParsedText || '';
}

// ──────────────────────────────────────────────
// Main: scan card from image file using multiple strategies
// ──────────────────────────────────────────────
async function scanCardFromImage(imageFile, cardInput, statusEl) {
  statusEl.classList.remove('hidden', 'text-red-500', 'text-green-600');
  statusEl.classList.add('text-blue-500');

  let digits = null;

  // ── Strategy 1: Tesseract.js (local, no network needed)
  try {
    const text = await ocrWithTesseract(imageFile, statusEl);
    console.log('[Tesseract] raw text:', text);
    digits = extractCardNumber(text);
    if (digits) console.log('[Tesseract] found digits:', digits);
  } catch (err) {
    console.warn('[Tesseract] failed:', err.message);
  }

  // ── Strategy 2: OCR.space API (cloud fallback)
  if (!digits) {
    try {
      const text = await ocrWithOcrSpace(imageFile, statusEl);
      console.log('[OCR.space] raw text:', text);
      digits = extractCardNumber(text);
      if (digits) console.log('[OCR.space] found digits:', digits);
    } catch (err) {
      console.warn('[OCR.space] failed:', err.message);
    }
  }

  // ── Strategy 3: Read the raw digit sequence from the file name or EXIF (not applicable here)
  // If all else fails, show an error
  if (!digits || digits.length < 13) {
    statusEl.textContent = '❌ No se pudo leer el número. Ingrésalo manualmente.';
    statusEl.classList.replace('text-blue-500', 'text-red-500');
    return;
  }

  // Format and fill the input
  const formatted = formatCardNumber(digits);
  cardInput.value = formatted;
  cardInput.dispatchEvent(new Event('input'));

  statusEl.textContent = `✅ Tarjeta detectada: ${formatted}`;
  statusEl.classList.replace('text-blue-500', 'text-green-600');
}

// ──────────────────────────────────────────────
// Render the remittance send form
// ──────────────────────────────────────────────
function renderSendForm() {
  const container = el('div', 'p-4 max-w-md mx-auto');
  const title = el('h1', 'text-2xl font-bold mb-6 text-primary', {}, 'Enviar remesa');

  const form = el('form', 'space-y-4', { id: 'remitForm' });

  // ── Card number input ──
  const cardLabel = el('label', 'block text-sm font-medium mb-1', { for: 'cardInput' }, 'Número de tarjeta');

  const cardInput = el('input', 'flex-1 w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-primary', {
    id: 'cardInput',
    type: 'tel',
    placeholder: 'xxxx xxxx xxxx xxxx',
    required: 'required',
    maxlength: '19',
    autocomplete: 'cc-number',
    name: 'card',
  });
  // Fix cardInput styling for dark mode explicitly
  cardInput.className = 'flex-1 w-full p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary';

  // Auto-format while typing: insert spaces every 4 digits
  cardInput.addEventListener('input', (e) => {
    let v = e.target.value.replace(/\D/g, '').slice(0, 16);
    e.target.value = v.replace(/(.{4})/g, '$1 ').trim();
  });

  // Hidden file inputs
  const fileInput = el('input', 'hidden', {
    id: 'cardFileInput',
    type: 'file',
    accept: 'image/*',
    capture: 'environment',
  });
  const galleryInput = el('input', 'hidden', {
    id: 'galleryFileInput',
    type: 'file',
    accept: 'image/*',
  });

  // Buttons
  const scanBtn = el(
    'button',
    'flex items-center justify-center p-2 bg-primary text-white rounded hover:bg-primary/80 active:scale-95 transition',
    { type: 'button', id: 'scanCardBtn', title: 'Usar cámara' },
    el('span', 'material-symbols-outlined', {}, 'photo_camera')
  );
  const galleryBtn = el(
    'button',
    'flex items-center justify-center p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 active:scale-95 transition',
    { type: 'button', id: 'galleryCardBtn', title: 'Subir imagen' },
    el('span', 'material-symbols-outlined', {}, 'image')
  );

  const cardRow = el('div', 'flex items-center gap-2', {}, cardInput, scanBtn, galleryBtn, fileInput, galleryInput);

  // Status / feedback line
  const statusEl = el('p', 'text-sm mt-1 hidden', { id: 'ocrStatus' }, '');
  statusEl.classList.remove('hidden'); // always visible space reserved

  const isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);

  scanBtn.addEventListener('click', () => {
    if (isMobile) {
      fileInput.click();
    } else {
      openWebcamModal(cardInput, statusEl, resizeImage, galleryInput);
    }
  });

  galleryBtn.addEventListener('click', () => {
    galleryInput.click();
  });

  // ── Desktop Webcam Modal ──
  function openWebcamModal(cardInput, statusEl, resizeImage, fileInput) {
    const overlay = el('div', 'fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4');
    const modal = el('div', 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col');
    const header = el('div', 'p-4 border-b flex justify-between items-center', {}, 
      el('h2', 'text-lg font-bold', {}, 'Cámara web'),
      el('button', 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200', { type: 'button' }, '✕')
    );
    const video = el('video', 'w-full bg-black object-contain max-h-[60vh]', { autoplay: 'true', playsinline: 'true' });
    const footer = el('div', 'p-4 flex gap-2 justify-end bg-gray-50 dark:bg-gray-900 border-t');
    
    const captureBtn = el('button', 'px-4 py-2 bg-primary text-white rounded hover:bg-primary/80 transition', { type: 'button' }, '📸 Tomar foto');
    const fallbackBtn = el('button', 'px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition', { type: 'button' }, '📁 Archivo');
    
    footer.append(fallbackBtn, captureBtn);
    modal.append(header, video, footer);
    overlay.append(modal);
    document.body.appendChild(overlay);

    let stream = null;
    const closeBtn = header.querySelector('button');

    function close() {
      if (stream) stream.getTracks().forEach(t => t.stop());
      overlay.remove();
    }

    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if(e.target === overlay) close(); });

    fallbackBtn.addEventListener('click', () => {
      close();
      fileInput.click();
    });

    // Request camera
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(s => {
        stream = s;
        video.srcObject = stream;
      })
      .catch(err => {
        console.error('Camera error', err);
        close();
        alert('No se pudo acceder a la cámara. Usa la opción de archivo.');
        fileInput.click();
      });

    captureBtn.addEventListener('click', () => {
      if (!video.videoWidth) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      canvas.toBlob(async (blob) => {
        close();
        if (!blob) return;
        const file = new File([blob], 'webcam_capture.jpg', { type: 'image/jpeg' });
        
        statusEl.classList.remove('hidden', 'text-red-500', 'text-green-600');
        statusEl.classList.add('text-blue-500');
        statusEl.textContent = '⚙️ Procesando imagen de cámara…';
        
        try {
          const resizedFile = await resizeImage(file);
          await scanCardFromImage(resizedFile, cardInput, statusEl);
        } catch (err) {
          console.error('Resize error:', err);
          statusEl.textContent = '❌ Error al procesar la imagen.';
          statusEl.classList.replace('text-blue-500', 'text-red-500');
        }
      }, 'image/jpeg', 0.9);
    });
  }

  // ── Image Resizer (to prevent 1MB limit on OCR.space and speed up Tesseract)
  function resizeImage(file, maxDim = 1200) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => {
            if (!blob) return reject(new Error('Canvas to Blob failed'));
            resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
          }, 'image/jpeg', 0.8);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    statusEl.classList.remove('hidden', 'text-red-500', 'text-green-600');
    statusEl.classList.add('text-blue-500');
    statusEl.textContent = '⚙️ Procesando imagen…';

    try {
      const resizedFile = await resizeImage(file);
      await scanCardFromImage(resizedFile, cardInput, statusEl);
    } catch (err) {
      console.error('Resize error:', err);
      statusEl.textContent = '❌ Error al procesar la imagen.';
      statusEl.classList.replace('text-blue-500', 'text-red-500');
    }
    e.target.value = '';
  };

  fileInput.addEventListener('change', handleFileChange);
  galleryInput.addEventListener('change', handleFileChange);

  // ── Confirmation number ──
  const confirmLabel = el('label', 'block text-sm font-medium mb-1', { for: 'confirmInput' }, 'Número de confirmación');
  const confirmInput = el('input', 'w-full p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary', {
    id: 'confirmInput',
    type: 'text',
    placeholder: 'Código de confirmación',
    required: 'required',
    name: 'confirm',
  });

  // ── Amount ──
  const amountLabel = el('label', 'block text-sm font-medium mb-1', { for: 'amountInput' }, 'Monto a enviar');
  const amountInput = el('input', 'w-full p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary', {
    id: 'amountInput',
    type: 'number',
    placeholder: '0.00',
    required: 'required',
    min: '0',
    step: '0.01',
    name: 'amount',
  });

  // ── Recipient phone ──
  const phoneLabel = el('label', 'block text-sm font-medium mb-1', { for: 'phoneInput' }, 'Teléfono destinatario');
  const phoneInput = el('input', 'w-full p-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-primary', {
    id: 'phoneInput',
    type: 'tel',
    placeholder: '+53... (opcional)',
    name: 'phone',
  });

  // ── Submit ──
  const submit = el(
    'button',
    'w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/80 active:scale-95 transition',
    { type: 'submit', id: 'submitBtn' },
    '📩 Enviar vía WhatsApp'
  );

  form.append(
    el('div', '', {}, cardLabel, cardRow, statusEl),
    el('div', '', {}, confirmLabel, confirmInput),
    el('div', '', {}, amountLabel, amountInput),
    el('div', '', {}, phoneLabel, phoneInput),
    submit
  );
  container.append(title, form);

  // ── Form submit handler ──
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const card    = cardInput.value.trim();
    const confirm = confirmInput.value.trim();
    const amount  = amountInput.value.trim();
    const phone   = phoneInput.value.trim();

    const lines = [
      `💳 Tarjeta: ${card}`,
      `🔑 Confirmación: ${confirm}`,
      `💵 Monto: $${amount}`,
      '────────────────',
    ];
    const encoded = encodeURIComponent(lines.join('\n'));

    let url;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    } else {
      url = `https://api.whatsapp.com/send?text=${encoded}`;
    }

    // ── Confirmation Modal ──
    const overlay = el('div', 'fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm');
    const modal = el('div', 'bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm overflow-hidden flex flex-col transform transition-all scale-95 opacity-0 duration-200');
    
    const header = el('div', 'p-4 border-b dark:border-gray-700 flex justify-between items-center', {}, 
      el('h2', 'text-lg font-bold text-gray-900 dark:text-white', {}, 'Confirmar envío')
    );

    const body = el('div', 'p-4 space-y-3 text-sm text-gray-700 dark:text-gray-300', {},
      el('p', '', {}, 'Revisa los datos antes de enviar la petición por WhatsApp:'),
      el('div', 'bg-gray-50 dark:bg-gray-900 p-3 rounded border dark:border-gray-700 font-mono text-xs', {}, 
        el('div', '', {}, `Tarjeta: ${card}`),
        el('div', '', {}, `Confirmación: ${confirm}`),
        el('div', '', {}, `Monto: $${amount}`)
      )
    );

    const footer = el('div', 'p-4 flex gap-3 justify-end border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50', {},
      el('button', 'px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-medium rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition', { type: 'button' }, 'Cancelar'),
      el('button', 'px-4 py-2 bg-primary text-white font-medium rounded hover:bg-primary/80 transition', { type: 'button' }, 'Confirmar y Enviar')
    );

    const [cancelBtn, confirmBtn] = footer.children;

    modal.append(header, body, footer);
    overlay.append(modal);
    document.body.appendChild(overlay);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modal.classList.remove('scale-95', 'opacity-0');
        modal.classList.add('scale-100', 'opacity-100');
      });
    });

    const closeModal = () => {
      modal.classList.remove('scale-100', 'opacity-100');
      modal.classList.add('scale-95', 'opacity-0');
      setTimeout(() => overlay.remove(), 200);
    };

    cancelBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => { if(e.target === overlay) closeModal(); });

    confirmBtn.addEventListener('click', () => {
      closeModal();
      window.open(url, '_blank');
    });
  });

  return container;
}

// ──────────────────────────────────────────────
// Simple hash router
// ──────────────────────────────────────────────
function router() {
  const route = location.hash.replace('#', '') || 'send';
  const app = document.getElementById('app');
  app.innerHTML = '';
  if (route === 'send') {
    app.appendChild(renderSendForm());
  } else {
    app.appendChild(el('div', 'p-4', {}, 'Página no encontrada'));
  }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
  router();
  initTesseractWorker();
});

// ──────────────────────────────────────────────
// PWA Installation Banner
// ──────────────────────────────────────────────
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later.
  deferredPrompt = e;
  // Update UI notify the user they can install the PWA
  showInstallBanner();
});

function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;

  const banner = el('div', 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 flex items-center justify-between z-50 border border-gray-100 dark:border-gray-700 transition-transform transform translate-y-20 opacity-0 duration-300', { id: 'pwa-install-banner' });
  
  const textInfo = el('div', 'flex flex-col', {}, 
    el('span', 'font-bold text-gray-900 dark:text-white text-sm', {}, 'Instalar aplicación'),
    el('span', 'text-xs text-gray-500 dark:text-gray-400', {}, 'Acceso rápido desde tu pantalla')
  );

  const actions = el('div', 'flex items-center gap-2');
  const installBtn = el('button', 'px-3 py-1.5 bg-primary text-white text-sm font-semibold rounded-md hover:bg-primary/80 transition', { type: 'button' }, 'Instalar');
  const dismissBtn = el('button', 'p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition', { type: 'button', 'aria-label': 'Descartar' }, '✕');

  actions.append(installBtn, dismissBtn);
  banner.append(textInfo, actions);
  document.body.appendChild(banner);

  // Animate in
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      banner.classList.remove('translate-y-20', 'opacity-0');
    });
  });

  dismissBtn.addEventListener('click', () => {
    banner.classList.add('translate-y-20', 'opacity-0');
    setTimeout(() => banner.remove(), 300);
  });

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`Instalación: ${outcome}`);
    deferredPrompt = null;
    banner.classList.add('translate-y-20', 'opacity-0');
    setTimeout(() => banner.remove(), 300);
  });
}

window.addEventListener('appinstalled', () => {
  const banner = document.getElementById('pwa-install-banner');
  if (banner) banner.remove();
  deferredPrompt = null;
  console.log('PWA instalada con éxito');
});
