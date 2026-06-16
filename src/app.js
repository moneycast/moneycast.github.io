// src/app.js
// Simple SPA for Remesas PWA

// Utility to create elements with Tailwind classes
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

// Render the send remittance form
function renderSendForm() {
  const container = el('div', 'p-4 max-w-md mx-auto');

  const title = el('h1', 'text-2xl font-bold mb-4 text-primary', {}, 'Enviar remesa');

  const form = el('form', 'space-y-4', { id: 'remitForm' });

  const cardInput = el('input', 'flex-1 w-full p-2 border rounded', {
    type: 'tel',
    placeholder: 'Número de tarjeta (xxxx xxxx xxxx xxxx)',
    required: 'required',
    pattern: '[0-9]{4} ?[0-9]{4} ?[0-9]{4} ?[0-9]{4}',
    name: 'card',
  });

  // Hidden file input for scanning
  const fileInput = el('input', '', {
    type: 'file',
    accept: 'image/*',
    capture: 'environment',
    style: 'display:none',
  });

  // Scan button
  const scanButton = el('button', 'ml-2 px-3 py-2 bg-primary text-white rounded hover:bg-primary/80 transition', { type: 'button' }, 'Escanear tarjeta');

  // Wrap card input and scan controls
  const cardWrapper = el('div', 'flex items-center', {}, cardInput, scanButton, fileInput);

  // Scan button handler
  scanButton.addEventListener('click', () => {
    fileInput.click();
  });

  // File input change handler – use Tesseract.js to OCR the image
  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      // Use Tesseract directly on the File object (handles blobs)
      const { data: { text } } = await Tesseract.recognize(file, 'eng');
      // Extract only digits (remove spaces, newlines, etc.)
      const digits = text.replace(/\D/g, '').trim();
      // Fill the card input and trigger an input event so any listeners react
      cardInput.value = digits;
      cardInput.dispatchEvent(new Event('input'));
    } catch (err) {
      console.error('OCR error', err);
    }
  });


  const confirmInput = el('input', 'w-full p-2 border rounded', {
    type: 'text',
    placeholder: 'Número de confirmación',
    required: 'required',
    name: 'confirm',
  });

  const amountInput = el('input', 'w-full p-2 border rounded', {
    type: 'number',
    placeholder: 'Monto a enviar',
    required: 'required',
    min: '0',
    step: '0.01',
    name: 'amount',
  });

  const phoneInput = el('input', 'w-full p-2 border rounded', {
    type: 'tel',
    placeholder: 'Teléfono destinatario (opcional, incluye código país)',
    name: 'phone',
  });

  const submit = el('button', 'w-full bg-primary text-white py-2 rounded hover:bg-primary/80 transition', {
    type: 'submit',
  }, 'Enviar vía WhatsApp');

  form.append(cardWrapper, confirmInput, amountInput, phoneInput, submit);
  container.append(title, form);

  // Form submit handler
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const card = cardInput.value.trim();
    const confirm = confirmInput.value.trim();
    const amount = amountInput.value.trim();
    const phone = phoneInput.value.trim();

    // Build message
    const lines = [];
    lines.push('----');
    lines.push(`Tarjeta: ${card}`);
    lines.push(`Confirmación: ${confirm}`);
    lines.push(`Monto: $${amount}`);
    lines.push('----');
    const text = lines.join('\n');

    // Encode for URL
    const encoded = encodeURIComponent(text);
    let url = '';
    if (phone) {
      // Use wa.me with phone
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    } else {
      // Fallback to generic send link (opens web WhatsApp)
      url = `https://api.whatsapp.com/send?text=${encoded}`;
    }
    window.open(url, '_blank');
  });

  return container;
}

// Simple hash router
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
window.addEventListener('load', router);

// Optional dark mode toggle (system prefers‑color‑scheme handled by Tailwind)
