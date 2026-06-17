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

function withTimeout(promise, ms, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(errorMessage)), ms)),
  ]);
}

function normalizeCardText(text) {
  const normalized = extractCardNumber(text);
  return normalized.replace(/\D/g, '');
}


// ──────────────────────────────────────────────
// Local Storage Manager
// ──────────────────────────────────────────────
const STORAGE_KEY = 'remesas_history_v1';

function getOperations() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Error reading history', e);
    return [];
  }
}

function saveOperations(operations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(operations));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function addOperation(card, confirm, amount, phone) {
  const operations = getOperations();
  const newOp = {
    id: generateId(),
    date: new Date().toISOString(),
    card,
    confirm,
    amount,
    phone
  };
  operations.unshift(newOp);
  saveOperations(operations);
}

function updateOperation(id, updatedData) {
  let operations = getOperations();
  operations = operations.filter(op => op.id !== id);
  const newOp = { ...updatedData, id: generateId(), date: new Date().toISOString() };
  operations.unshift(newOp);
  saveOperations(operations);
}

function deleteOperation(id) {
  let operations = getOperations();
  operations = operations.filter(op => op.id !== id);
  saveOperations(operations);
}

function importOperations(importedArray) {
  const current = getOperations();
  const currentIds = new Set(current.map(op => op.id));
  
  const newOps = importedArray.filter(op => !currentIds.has(op.id));
  if (newOps.length > 0) {
    saveOperations([...newOps, ...current]);
  }
  return newOps.length;
}

function exportOperations() {
  const ops = getOperations();
  const blob = new Blob([JSON.stringify(ops, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `remesas_backup_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ──────────────────────────────────────────────
// Background Tesseract.js Worker
// ──────────────────────────────────────────────
let ocrWorker = null;
let currentOcrStatusEl = null;
let ocrWorkerReadyPromise = null;

async function initTesseractWorker() {
  if (typeof Tesseract === 'undefined') return;

  ocrWorkerReadyPromise = (async () => {
    try {
      ocrWorker = await Tesseract.createWorker({
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v4.0.2/dist/worker.min.js',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v4.0.2/tesseract-core-simd.wasm.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        workerBlobURL: false,
        logger: (m) => {
          if (currentOcrStatusEl && m.status === 'recognizing text') {
            currentOcrStatusEl.textContent = `🔍 OCR: ${Math.round(m.progress * 100)}%`;
          }
        },
      });

      await ocrWorker.load();
      await ocrWorker.loadLanguage('eng');
      await ocrWorker.initialize('eng');
      await ocrWorker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });

      console.log('[Tesseract] Worker ready in background.');
    } catch (err) {
      console.error('[Tesseract] Init error:', err);
      ocrWorker = null;
    }
  })();

  return ocrWorkerReadyPromise;
}

// ──────────────────────────────────────────────
// OCR via Tesseract.js (runs entirely in the browser)
// ──────────────────────────────────────────────
async function ocrWithTesseract(imageFile, statusEl) {
  if (typeof Tesseract === 'undefined') throw new Error('Tesseract.js not loaded');

  statusEl.textContent = '🔍 Analizando imagen…';

  if (ocrWorkerReadyPromise) {
    await ocrWorkerReadyPromise.catch((err) => {
      console.warn('[Tesseract] worker init failed:', err);
      ocrWorker = null;
      ocrWorkerReadyPromise = null;
    });
  }

  const options = {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@v4.0.2/dist/worker.min.js',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@v4.0.2/tesseract-core-simd.wasm.js',
    langPath: 'https://tessdata.projectnaptha.com/4.0.0',
    workerBlobURL: false,
    logger: (m) => {
      if (m.status === 'recognizing text') {
        statusEl.textContent = `🔍 OCR: ${Math.round(m.progress * 100)}%`;
      }
    },
  };

  const recognizeWithWorker = async (worker) => {
    currentOcrStatusEl = statusEl;
    try {
      const { data } = await worker.recognize(imageFile);
      return data.text || '';
    } finally {
      currentOcrStatusEl = null;
    }
  };

  const run = async () => {
    if (ocrWorker) {
      return recognizeWithWorker(ocrWorker);
    }

    try {
      const worker = await Tesseract.createWorker(options);
      try {
        await worker.load();
        await worker.loadLanguage('eng');
        await worker.initialize('eng');
        await worker.setParameters({ tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK });
        return await recognizeWithWorker(worker);
      } finally {
        await worker.terminate();
      }
    } catch (err) {
      console.warn('[Tesseract] worker fallback:', err);
      const { data } = await Tesseract.recognize(imageFile, 'eng', {
        ...options,
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });
      return data.text || '';
    }
  };

  return withTimeout(run(), 15000, 'Tesseract OCR timeout');
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

  if (!response.ok) {
    const body = await response.text().catch(() => 'no body');
    throw new Error(`OCR.space HTTP ${response.status}: ${body.slice(0, 200)}`);
  }

  let result;
  try {
    result = await response.json();
  } catch (err) {
    const text = await response.text().catch(() => 'unable to read response');
    throw new Error(`OCR.space non-JSON response: ${text.slice(0, 200)}`);
  }

  if (result.IsErroredOnProcessing) throw new Error(result.ErrorMessage?.[0] || 'OCR.space error');
  return result.ParsedResults?.[0]?.ParsedText || '';
}

// ──────────────────────────────────────────────
// Main: scan card from image file using multiple strategies
// ──────────────────────────────────────────────
async function scanCardFromImage(imageFile, cardInput, statusEl) {
  statusEl.classList.remove('hidden', 'text-red-500', 'text-green-600');
  statusEl.classList.add('text-blue-500');
  statusEl.textContent = '🔍 Analizando imagen…';
  console.log('[scanCardFromImage] start');

  let digits = null;

  // ── Strategy 1: Tesseract.js (local, no network needed)
  try {
    statusEl.textContent = '🔍 Analizando con OCR local…';
    const text = await ocrWithTesseract(imageFile, statusEl);
    console.log('[Tesseract] raw text:', text);
    digits = extractCardNumber(text);
    if (digits) console.log('[Tesseract] found digits:', digits);
    else console.log('[Tesseract] no digits found');
  } catch (err) {
    console.warn('[Tesseract] failed:', err.message);
    statusEl.textContent = '⚠️ OCR local falló. Probando OCR en la nube…';
  }

  // ── Strategy 2: OCR.space API (cloud fallback)
  if (!digits) {
    try {
      statusEl.textContent = '☁️ Probando OCR en la nube…';
      const text = await withTimeout(ocrWithOcrSpace(imageFile, statusEl), 20000, 'OCR.space timeout');
      console.log('[OCR.space] raw text:', text);
      digits = extractCardNumber(text);
      if (digits) console.log('[OCR.space] found digits:', digits);
      else console.log('[OCR.space] no digits found');
    } catch (err) {
      console.warn('[OCR.space] failed:', err.message);
      statusEl.textContent = '❌ No se pudo procesar la imagen. Ingrésalo manualmente.';
      statusEl.classList.replace('text-blue-500', 'text-red-500');
      return;
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
      addOperation(card, confirm, amount, phone); // Save to local storage
      window.open(url, '_blank');
      form.reset();
      location.hash = '#history'; // Navigate to history to see the new entry
    });
  });

  return container;
}

// ──────────────────────────────────────────────
// History Section
// ──────────────────────────────────────────────
function renderHistory() {
  const container = el('div', 'p-4 max-w-md mx-auto w-full pb-24 md:pb-8');

  const header = el('div', 'flex justify-between items-center mb-6');
  const title = el('h1', 'text-2xl font-bold text-gray-900 dark:text-white', {}, 'Historial');
  
  const actionsContainer = el('div', 'flex gap-2');
  
  const exportBtn = el('button', 'p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition', { title: 'Exportar JSON' }, el('span', 'material-symbols-outlined', {}, 'download'));
  const importBtn = el('button', 'p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition', { title: 'Importar JSON' }, el('span', 'material-symbols-outlined', {}, 'upload'));
  
  const fileInput = el('input', 'hidden', { type: 'file', accept: 'application/json' });
  
  actionsContainer.append(fileInput, importBtn, exportBtn);
  header.append(title, actionsContainer);

  exportBtn.addEventListener('click', exportOperations);
  importBtn.addEventListener('click', () => fileInput.click());
  
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        if (Array.isArray(data)) {
          const added = importOperations(data);
          alert(`Importación completada. Se añadieron ${added} operaciones nuevas.`);
          // refresh history
          const newContainer = renderHistory();
          container.replaceWith(newContainer);
        } else {
          alert('Formato JSON inválido.');
        }
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  const listContainer = el('div', 'space-y-4');
  const operations = getOperations();

  if (operations.length === 0) {
    listContainer.append(el('div', 'text-center text-gray-500 py-10', {}, 'No hay operaciones registradas.'));
  } else {
    operations.forEach(op => {
      const cardEl = el('div', 'bg-white dark:bg-gray-800 p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700 relative');
      
      const dateStr = new Date(op.date).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
      
      const headRow = el('div', 'flex justify-between items-start mb-2');
      const amountEl = el('div', 'text-lg font-bold text-primary', {}, `$${op.amount}`);
      const dateEl = el('div', 'text-xs text-gray-500', {}, dateStr);
      headRow.append(amountEl, dateEl);
      
      const bodyRow = el('div', 'text-sm text-gray-700 dark:text-gray-300 space-y-1 mb-4');
      bodyRow.append(
        el('div', '', {}, el('span', 'font-medium', {}, 'Tarjeta: '), op.card),
        el('div', '', {}, el('span', 'font-medium', {}, 'Confirmación: '), op.confirm)
      );

      const actionRow = el('div', 'flex gap-2 justify-end');
      const editBtn = el('button', 'px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-semibold rounded hover:bg-blue-100 dark:hover:bg-blue-800/50 transition', {}, 'Editar');
      const deleteBtn = el('button', 'px-3 py-1.5 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold rounded hover:bg-red-100 dark:hover:bg-red-800/50 transition', {}, 'Eliminar');
      
      actionRow.append(editBtn, deleteBtn);
      
      // Delete logic
      deleteBtn.addEventListener('click', () => {
        if (confirm('¿Seguro que deseas eliminar este registro?')) {
          deleteOperation(op.id);
          cardEl.remove();
          if (listContainer.children.length === 0) {
            listContainer.append(el('div', 'text-center text-gray-500 py-10', {}, 'No hay operaciones registradas.'));
          }
        }
      });

      // Edit logic
      editBtn.addEventListener('click', () => {
        // Native prompts for simplicity (as requested to just edit)
        const newCard = prompt('Editar Tarjeta:', op.card);
        if (newCard === null) return; // cancelled
        const newConfirm = prompt('Editar Confirmación:', op.confirm);
        if (newConfirm === null) return;
        const newAmount = prompt('Editar Monto:', op.amount);
        if (newAmount === null) return;
        
        if (newCard !== op.card || newConfirm !== op.confirm || newAmount !== op.amount) {
          updateOperation(op.id, { card: newCard, confirm: newConfirm, amount: newAmount, phone: op.phone });
          // refresh history
          const newContainer = renderHistory();
          container.replaceWith(newContainer);
        }
      });

      cardEl.append(headRow, bodyRow, actionRow);
      listContainer.append(cardEl);
    });
  }

  container.append(header, listContainer);
  return container;
}

// ──────────────────────────────────────────────
// Simple hash router
// ──────────────────────────────────────────────
function router() {
  // Normalize hash: remove '#', leading '/', and trim whitespace
  const rawHash = location.hash.replace(/^#\/?/, '').trim();
  const route = rawHash || 'send';
  const app = document.getElementById('app');
  app.innerHTML = '';
  
  if (route === 'send') {
    app.appendChild(renderSendForm());
  } else if (route === 'history') {
    app.appendChild(renderHistory());
  } else {
    app.appendChild(el('div', 'p-4', {}, 'Página no encontrada'));
  }

  // Update nav UI dynamically
  ['send', 'history'].forEach(r => {
    const desktop = document.getElementById(`nav-${r}-desktop`);
    const mobile = document.getElementById(`nav-${r}-mobile`);
    if (r === route) {
      if (desktop) desktop.className = 'flex items-center gap-3 p-3 rounded-lg bg-primary/10 text-primary font-medium transition';
      if (mobile) mobile.className = 'flex-1 flex flex-col items-center py-2 text-primary transition';
    } else {
      if (desktop) desktop.className = 'flex items-center gap-3 p-3 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition';
      if (mobile) mobile.className = 'flex-1 flex flex-col items-center py-2 text-gray-500 hover:text-primary transition';
    }
  });
}

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
  router();
  initTesseractWorker();
  checkForSharedImage();
});

// ──────────────────────────────────────────────
// Web Share Target: check if app was opened with a shared image
// ──────────────────────────────────────────────
async function checkForSharedImage() {
  try {
    const cache = await caches.open('remesas-shared-image-v2');
    const sharedImageRequest = new Request(new URL('shared-image', location.href).href);
    const response = await cache.match(sharedImageRequest);
    if (!response) return;

    const isSharedUrl = location.search.includes('shared=1') || location.hash.includes('shared=1');
    if (!isSharedUrl) {
      console.log('[Share Target] shared image found in cache without query string, processing anyway');
    }

    const blob = await response.blob();
    const file = new File([blob], 'shared_image.jpg', { type: blob.type || 'image/jpeg' });

    // Remove the shared image from cache so it doesn't re-trigger on next open
    await cache.delete(sharedImageRequest);

    // Show scanning feedback while form loads
    // Wait a tick for the DOM to be ready after router()
    setTimeout(async () => {
      const statusEl = document.getElementById('ocrStatus');
      const cardInput = document.getElementById('cardInput');

      if (!statusEl || !cardInput) return;

      statusEl.classList.remove('hidden', 'text-red-500', 'text-green-600');
      statusEl.classList.add('text-blue-500');
      statusEl.textContent = '📤 Imagen recibida. Analizando…';

      if (ocrWorkerReadyPromise) {
        await ocrWorkerReadyPromise.catch((err) => {
          console.warn('[Share Target] ocr worker init failed:', err);
          ocrWorker = null;
          ocrWorkerReadyPromise = null;
        });
      }

      try {
        const resizedFile = await resizeImageBlob(file);
        await withTimeout(
          scanCardFromImage(resizedFile, cardInput, statusEl),
          25000,
          'Procesamiento de OCR agotó el tiempo'
        );
      } catch (err) {
        console.error('[Share Target] OCR error:', err);
        statusEl.textContent = '❌ No se pudo procesar la imagen a tiempo. Ingrésala manualmente.';
        statusEl.classList.replace('text-blue-500', 'text-red-500');
      }
    }, 600);
  } catch (err) {
    console.error('[Share Target] Error reading shared image cache:', err);
  }
}

// Standalone resize helper that accepts a Blob/File directly (no FileReader needed)
function resizeImageBlob(file, maxDim = 1200) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > height) {
        if (width > maxDim) { height *= maxDim / width; width = maxDim; }
      } else {
        if (height > maxDim) { width *= maxDim / height; height = maxDim; }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        if (!blob) return reject(new Error('Canvas toBlob failed'));
        resolve(new File([blob], file.name, { type: 'image/jpeg', lastModified: Date.now() }));
      }, 'image/jpeg', 0.85);
    };
    img.onerror = reject;
    img.src = url;
  });
}

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
