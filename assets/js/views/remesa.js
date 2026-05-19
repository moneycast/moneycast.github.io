// Vista de Remesas - Traducida con i18n

import { Store } from '../store.js';
import { t } from '../i18n.js';

export function renderRemesa(container, state) {
  const { config, order } = state;
  
  const fueraDeServicio = config?.fuera_de_servicio || { remesas: false, recargas: false };
  if (fueraDeServicio.remesas) {
    container.innerHTML = `
      <div class="max-w-md mx-auto px-4 py-16 text-center animate-fade-in">
        <div class="inline-flex p-4 bg-rose-500/10 rounded-full border border-rose-500/20 text-rose-400 mb-6 animate-pulse">
          <i data-lucide="ban" class="w-12 h-12"></i>
        </div>
        <h2 class="text-2xl font-extrabold tracking-tight text-white mb-4">${t('label_fuera_de_servicio_title')}</h2>
        <p class="text-sm text-zinc-400 leading-relaxed max-w-sm mx-auto mb-8">
          ${t('msg_out_of_service_remesas')}
        </p>
        <button id="btn-out-back" class="btn-premium px-8 py-3.5 bg-white text-zinc-950 hover:bg-zinc-100 rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 mx-auto">
          <i data-lucide="arrow-left" class="w-4 h-4"></i>
          <span>${t('btn_back')}</span>
        </button>
      </div>
    `;
    if (window.lucide) {
      window.lucide.createIcons();
    }
    document.getElementById('btn-out-back').addEventListener('click', () => {
      Store.navigate('home');
    });
    return;
  }

  const paises = config ? config.tasas_remesas : [];
  
  if (!order.remesa.pais && paises.length > 0) {
    Store.setRemesaPais(paises[0]);
    return;
  }

  const selectedPais = order.remesa.pais;
  const deliveryBaseCost = config ? config.opciones_delivery.costo_base_usd : 3.00;

  const countryOptionsHtml = paises.map(p => `
    <option value="${p.pais}" ${selectedPais && selectedPais.pais === p.pais ? 'selected' : ''}>
      ${p.pais} (${p.moneda})
    </option>
  `).join('');

  container.innerHTML = `
    <div class="max-w-md mx-auto px-4 py-6 animate-fade-in">
      <!-- Barra superior / Navegación -->
      <div class="flex items-center justify-between mb-6">
        <button id="btn-remesa-back" class="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> ${t('btn_back')}
        </button>
        <span class="text-xs uppercase tracking-widest text-zinc-500 font-bold">${t('step_indicator', { step: 1 })}</span>
      </div>

      <h2 class="text-2xl font-extrabold tracking-tight text-white mb-6">${t('remesa_title')}</h2>

      <div class="space-y-5">
        <!-- Selector de País -->
        <div class="space-y-1.5">
          <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400">${t('label_destination')}</label>
          <div class="relative">
            <select id="select-pais" class="glass-input w-full p-4 rounded-2xl appearance-none cursor-pointer text-sm font-medium pr-10">
              ${countryOptionsHtml}
            </select>
            <div class="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-zinc-400">
              <i data-lucide="chevron-down" class="w-4 h-4"></i>
            </div>
          </div>
        </div>

        <!-- Calculadora de Montos -->
        <div class="grid grid-cols-1 gap-4">
          <!-- Monto a Enviar en USD -->
          <div class="space-y-1.5 glass-panel p-4 rounded-2xl border border-zinc-800">
            <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400">${t('label_you_send')}</label>
            <div class="flex items-center justify-between">
              <input type="number" id="input-enviar" class="bg-transparent text-2xl font-extrabold text-white w-2/3 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                     value="${order.remesa.montoEnviar || ''}" placeholder="0.00">
              <span class="text-sm font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl">USD</span>
            </div>
          </div>

          <!-- Información de la tasa -->
          ${selectedPais ? `
            <div class="flex items-center justify-between px-3 text-xs text-zinc-400">
              <div class="flex items-center gap-1.5">
                <i data-lucide="trending-up" class="w-3.5 h-3.5 text-zinc-500"></i>
                <span>${t('label_rate')}</span>
              </div>
              <span class="font-semibold text-zinc-200">1 USD = ${selectedPais.tasa_por_dolar.toFixed(2)} ${selectedPais.moneda}</span>
            </div>
          ` : ''}

          <!-- Monto a Recibir -->
          <div class="space-y-1.5 glass-panel p-4 rounded-2xl border border-zinc-800">
            <label class="block text-xs font-semibold uppercase tracking-wider text-zinc-400">${t('label_recipient_receives')}</label>
            <div class="flex items-center justify-between">
              <input type="number" id="input-recibir" class="bg-transparent text-2xl font-extrabold text-white w-2/3 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
                     value="${order.remesa.montoRecibir || ''}" placeholder="0.00">
              <span class="text-sm font-bold text-zinc-300 bg-zinc-900 border border-zinc-800 px-3.5 py-1.5 rounded-xl">
                ${selectedPais ? selectedPais.moneda : ''}
              </span>
            </div>
          </div>
        </div>

        <!-- Comisiones y Detalles -->
        ${selectedPais ? `
          <div class="glass-panel p-4 rounded-2xl border border-zinc-800 text-xs space-y-2.5">
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_commission')}</span>
              <span class="font-medium text-zinc-200">$${selectedPais.comision_fija_usd.toFixed(2)} USD</span>
            </div>
            <div class="border-t border-zinc-900 pt-2.5 flex justify-between items-center text-sm font-semibold">
              <span class="text-zinc-300">${t('label_total_cost')}</span>
              <span class="text-white">$${(order.remesa.montoEnviar).toFixed(2)} USD</span>
            </div>
          </div>
        ` : ''}

        <!-- Delivery en Efectivo Toggle -->
        <div class="glass-panel p-5 rounded-2xl border border-zinc-800">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="p-2.5 bg-zinc-900 rounded-xl border border-zinc-800 text-zinc-400">
                <i data-lucide="truck" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-sm font-bold text-white">${t('label_request_delivery')}</h3>
                <p class="text-[10px] text-zinc-500 mt-0.5">${t('label_delivery_sub', { cost: deliveryBaseCost.toFixed(2) })}</p>
              </div>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" id="toggle-delivery" class="sr-only peer" ${order.delivery.selected ? 'checked' : ''}>
              <div class="w-11 h-6 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-white peer-checked:after:bg-zinc-900"></div>
            </label>
          </div>

          <!-- Campos de dirección de delivery (Expandible) -->
          <div id="delivery-address-container" class="mt-4 pt-4 border-t border-zinc-900 space-y-3 ${order.delivery.selected ? '' : 'hidden'}">
            <!-- Geolocation Button -->
            <button type="button" id="btn-geolocation" class="w-full flex items-center justify-center gap-2 p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white rounded-xl transition-colors">
              <i data-lucide="map-pin" class="w-4 h-4 text-emerald-400"></i>
              <span id="geo-status">${t('btn_geo')}</span>
            </button>

            <div class="space-y-1.5">
              <label class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">${t('label_exact_address')}</label>
              <textarea id="textarea-direccion" rows="3" class="glass-input w-full p-3.5 rounded-xl text-xs placeholder-zinc-600 focus:outline-none" 
                        placeholder="${t('placeholder_address_remesa')}">${order.delivery.direccion || ''}</textarea>
            </div>
          </div>
        </div>

        <!-- Botón de Continuar -->
        <button id="btn-remesa-submit" class="btn-premium w-full py-4 bg-white text-zinc-950 hover:bg-zinc-100 rounded-2xl text-sm font-bold tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 mt-2">
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

  document.getElementById('btn-remesa-back').addEventListener('click', () => {
    Store.navigate('home');
  });

  document.getElementById('select-pais').addEventListener('change', (e) => {
    const pais = paises.find(p => p.pais === e.target.value);
    if (pais) {
      Store.setRemesaPais(pais);
    }
  });

  const inputEnviar = document.getElementById('input-enviar');
  inputEnviar.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    Store.setRemesaMontoEnviar(val);
  });

  const inputRecibir = document.getElementById('input-recibir');
  inputRecibir.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) || 0;
    Store.setRemesaMontoRecibir(val);
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

    // Intentar primero con alta precisión; si falla por timeout o hardware, reintentar con baja precisión (WiFi/Celdas)
    const optionsHigh = { enableHighAccuracy: true, timeout: 6000, maximumAge: 30000 };
    const optionsLow = { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 };

    function getCoords(options, isFallback) {
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
          console.warn(`Geolocation: Error (isFallback=${isFallback}):`, err);
          if (!isFallback) {
            console.log('Geolocation: Reintentando con precisión de red/WiFi...');
            getCoords(optionsLow, true);
          } else {
            geoStatus.innerText = t('geo_error');
          }
        },
        options
      );
    }

    getCoords(optionsHigh, false);
  });

  document.getElementById('btn-remesa-submit').addEventListener('click', () => {
    if (order.remesa.montoEnviar <= 0) {
      alert(t('alert_amount'));
      return;
    }

    if (order.delivery.selected && !order.delivery.direccion.trim()) {
      alert(t('alert_address'));
      return;
    }

    Store.navigate('checkout');
  });
}
