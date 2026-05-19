// Vista de Recargas de Saldo Móvil - Traducida con i18n

import { Store } from '../store.js';
import { t } from '../i18n.js';

export function renderRecarga(container, state) {
  const { config, order } = state;
  const operadores = config ? config.operadores_recarga : [];
  const deliveryBaseCost = config ? config.opciones_delivery.costo_base_usd : 3.00;

  if (!order.recarga.operador && operadores.length > 0) {
    Store.setRecargaOperador(operadores[0]);
    return;
  }

  const selectedOperador = order.recarga.operador;

  const operatorsHtml = operadores.map(op => `
    <button type="button" data-op-name="${op.nombre}" class="operator-pill flex-1 py-3 px-4 rounded-xl text-center text-xs font-bold border transition-all ${
      selectedOperador && selectedOperador.nombre === op.nombre
        ? 'bg-white border-white text-zinc-950 shadow-lg shadow-white/5'
        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
    }">
      ${op.nombre}
    </button>
  `).join('');

  let montosHtml = '';
  if (selectedOperador) {
    montosHtml = selectedOperador.montos_permitidos_usd.map(monto => `
      <button type="button" data-monto="${monto}" class="monto-pill p-4 rounded-2xl text-center text-sm font-extrabold border transition-all ${
        order.recarga.monto === monto
          ? 'bg-white border-white text-zinc-950'
          : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700'
      }">
        $${monto} USD
      </button>
    `).join('');
  }

  container.innerHTML = `
    <div class="max-w-md mx-auto px-4 py-6 animate-fade-in">
      <!-- Barra superior / Navegación -->
      <div class="flex items-center justify-between mb-6">
        <button id="btn-recarga-back" class="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> ${t('btn_back')}
        </button>
        <span class="text-xs uppercase tracking-widest text-zinc-500 font-bold">${t('step_indicator', { step: 1 })}</span>
      </div>

      <h2 class="text-2xl font-extrabold tracking-tight text-white mb-6">${t('recarga_title')}</h2>

      <div class="space-y-5">
        <!-- Selector de Operador -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400">${t('label_operator')}</label>
          <div class="flex gap-2.5">
            ${operatorsHtml}
          </div>
        </div>

        <!-- Número de Teléfono -->
        <div class="space-y-1.5 glass-panel p-4 rounded-2xl border border-zinc-800">
          <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400">${t('label_phone')}</label>
          <div class="flex items-center">
            <input type="tel" id="input-telefono" class="bg-transparent text-xl font-extrabold text-white w-full focus:outline-none placeholder-zinc-700" 
                   value="${order.recarga.telefono || ''}" placeholder="+597 000-0000">
            <div class="text-zinc-500 pl-2">
              <i data-lucide="phone" class="w-5 h-5"></i>
            </div>
          </div>
        </div>

        <!-- Selector de Monto -->
        <div class="space-y-2">
          <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400">${t('label_amount')}</label>
          <div class="grid grid-cols-3 gap-2.5">
            ${montosHtml}
          </div>
        </div>

        <!-- Delivery en Efectivo para Recargas (Cobro en Domicilio) -->
        <div class="glass-panel p-5 rounded-2xl border border-zinc-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-400">
                <i data-lucide="truck" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">${t('label_payment_delivery')}</h3>
                <p class="text-[10px] text-zinc-500 mt-0.5">${t('label_delivery_recarga_sub', { cost: deliveryBaseCost.toFixed(2) })}</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="toggle-delivery" class="sr-only peer" ${order.delivery.selected ? 'checked' : ''}>
              <div class="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white peer-checked:after:bg-zinc-900"></div>
            </label>
          </div>

          <!-- Campos de dirección de delivery -->
          <div id="delivery-address-container" class="mt-4 pt-4 border-t border-zinc-900 space-y-3 ${order.delivery.selected ? '' : 'hidden'}">
            <!-- Geolocation Button -->
            <button type="button" id="btn-geolocation" class="w-full flex items-center justify-center gap-2 p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl transition-colors">
              <i data-lucide="map-pin" class="w-4 h-4 text-emerald-400"></i>
              <span id="geo-status">${t('btn_geo')}</span>
            </button>

            <div class="space-y-1.5">
              <label class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">${t('label_exact_payment_address')}</label>
              <textarea id="textarea-direccion" rows="3" class="glass-input w-full p-3.5 rounded-xl text-xs placeholder-zinc-600 focus:outline-none" 
                        placeholder="${t('placeholder_address_recarga')}">${order.delivery.direccion || ''}</textarea>
            </div>
          </div>
        </div>

        <!-- Botón de Continuar -->
        <button id="btn-recarga-submit" class="btn-premium w-full py-4 bg-white text-zinc-950 hover:bg-zinc-100 rounded-2xl text-sm font-bold tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 mt-2">
          <span>${t('btn_continue')}</span>
          <i data-lucide="arrow-right" class="w-4 h-4"></i>
        </button>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // EVENT LISTENERS

  document.getElementById('btn-recarga-back').addEventListener('click', () => {
    Store.navigate('home');
  });

  document.querySelectorAll('.operator-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const opName = pill.getAttribute('data-op-name');
      const op = operadores.find(o => o.nombre === opName);
      if (op) {
        Store.setRecargaOperador(op);
        if (!op.montos_permitidos_usd.includes(order.recarga.monto)) {
          Store.setRecargaMonto(op.montos_permitidos_usd[0]);
        }
      }
    });
  });

  document.querySelectorAll('.monto-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const monto = parseFloat(pill.getAttribute('data-monto'));
      Store.setRecargaMonto(monto);
    });
  });

  const inputTel = document.getElementById('input-telefono');
  inputTel.addEventListener('input', (e) => {
    Store.setRecargaTelefono(e.target.value);
  });

  const toggleDelivery = document.getElementById('toggle-delivery');
  const addressContainer = document.getElementById('delivery-address-container');
  toggleDelivery.addEventListener('change', (e) => {
    const isChecked = e.target.checked;
    Store.setDeliverySelected(isChecked);
    if (isChecked) {
      addressContainer.classList.remove('hidden');
    } else {
      addressContainer.classList.add('hidden');
    }
  });

  const textareaDireccion = document.getElementById('textarea-direccion');
  textareaDireccion.addEventListener('input', (e) => {
    Store.setDeliveryDireccion(e.target.value);
  });

  const btnGeo = document.getElementById('btn-geolocation');
  const geoStatus = document.getElementById('geo-status');
  btnGeo.addEventListener('click', () => {
    if (!navigator.geolocation) {
      geoStatus.innerText = t('geo_unsupported');
      return;
    }

    geoStatus.innerText = t('geo_loading');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        Store.setDeliveryCoordenadas(latitude, longitude);
        
        const coordsText = `📍 GPS (Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)})`;
        const currentText = textareaDireccion.value;
        const newText = currentText 
          ? `${coordsText}\n${currentText.replace(/📍 GPS \(Lat:.*, Lng:.*\)\n?/g, '')}` 
          : coordsText;
        
        textareaDireccion.value = newText;
        Store.setDeliveryDireccion(newText);
        geoStatus.innerText = t('geo_success');
      },
      (err) => {
        console.error(err);
        geoStatus.innerText = t('geo_error');
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  });

  document.getElementById('btn-recarga-submit').addEventListener('click', () => {
    if (!order.recarga.telefono.trim()) {
      alert(t('alert_phone'));
      return;
    }

    if (order.recarga.monto <= 0) {
      alert(t('alert_amount_select'));
      return;
    }

    if (order.delivery.selected && !order.delivery.direccion.trim()) {
      alert(t('alert_address'));
      return;
    }

    Store.navigate('checkout');
  });
}
