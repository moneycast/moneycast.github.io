// Vista de Resumen y Confirmación de la Orden (Checkout) - Traducida con i18n

import { Store } from '../store.js';
import { WhatsApp } from '../whatsapp.js';
import { t } from '../i18n.js';

export function renderCheckout(container, state) {
  const { order, config } = state;
  const deliveryBaseCost = config ? config.opciones_delivery.costo_base_usd : 3.00;

  const isRemesa = order.type === 'remesa';
  const deliveryCost = order.delivery.selected ? deliveryBaseCost : 0.00;
  
  let totalUSD = 0;
  let summaryHtml = '';

  if (isRemesa) {
    const r = order.remesa;
    totalUSD = r.montoEnviar + deliveryCost;

    summaryHtml = `
      <div class="space-y-4">
        <!-- Tarjeta de Resumen -->
        <div class="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
          <div class="flex items-center gap-3 border-b border-zinc-900 pb-4">
            <div class="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <i data-lucide="send" class="w-5 h-5"></i>
            </div>
            <div>
              <span class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">${t('label_summary')}</span>
              <h3 class="text-sm font-bold text-white">${t('summary_remesa')}</h3>
            </div>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_country')}</span>
              <span class="font-bold text-white">${r.pais.pais}</span>
            </div>
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_recipient_receives')}:</span>
              <span class="font-extrabold text-white text-base">${r.montoRecibir.toLocaleString()} ${r.pais.moneda}</span>
            </div>
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_net_send')}</span>
              <span class="font-semibold text-zinc-200">$${r.montoEnviar.toFixed(2)} USD</span>
            </div>
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_commission')}</span>
              <span class="font-semibold text-zinc-200">$${r.comision.toFixed(2)} USD</span>
            </div>
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_delivery_cost')}</span>
              <span class="font-semibold text-zinc-200">${order.delivery.selected ? `$${deliveryBaseCost.toFixed(2)} USD` : t('label_delivery_status_no')}</span>
            </div>
          </div>
        </div>

        <!-- Dirección de Delivery (Si aplica) -->
        ${order.delivery.selected ? `
          <div class="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-2">
            <div class="flex items-center gap-2 text-xs font-bold text-zinc-300">
              <i data-lucide="map-pin" class="w-4 h-4 text-emerald-400"></i>
              <span>${t('label_address_pickup')}</span>
            </div>
            <p class="text-xs text-zinc-400 leading-relaxed bg-zinc-950/50 p-3 rounded-xl border border-zinc-900">${order.delivery.direccion}</p>
          </div>
        ` : ''}
      </div>
    `;

  } else {
    const r = order.recarga;
    totalUSD = r.monto + deliveryCost;

    summaryHtml = `
      <div class="space-y-4">
        <!-- Tarjeta de Resumen -->
        <div class="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-4">
          <div class="flex items-center gap-3 border-b border-zinc-900 pb-4">
            <div class="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
              <i data-lucide="smartphone" class="w-5 h-5"></i>
            </div>
            <div>
              <span class="text-[10px] uppercase tracking-wider text-zinc-500 font-bold">${t('label_summary')}</span>
              <h3 class="text-sm font-bold text-white">${t('summary_recarga')}</h3>
            </div>
          </div>

          <div class="space-y-3 text-sm">
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_operator')}:</span>
              <span class="font-bold text-white">${r.operador.nombre}</span>
            </div>
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_phone')}:</span>
              <span class="font-extrabold text-white text-base">${r.telefono}</span>
            </div>
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_amount')} (USD):</span>
              <span class="font-semibold text-zinc-200">$${r.monto.toFixed(2)} USD</span>
            </div>
            <div class="flex justify-between items-center text-zinc-400">
              <span>${t('label_payment_delivery_cost')}</span>
              <span class="font-semibold text-zinc-200">${order.delivery.selected ? `$${deliveryBaseCost.toFixed(2)} USD` : t('label_delivery_status_no')}</span>
            </div>
          </div>
        </div>

        <!-- Dirección de Delivery (Si aplica) -->
        ${order.delivery.selected ? `
          <div class="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-2">
            <div class="flex items-center gap-2 text-xs font-bold text-zinc-300">
              <i data-lucide="map-pin" class="w-4 h-4 text-emerald-400"></i>
              <span>${t('label_address_payment')}</span>
            </div>
            <p class="text-xs text-zinc-400 leading-relaxed bg-zinc-950/50 p-3 rounded-xl border border-zinc-900">${order.delivery.direccion}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="max-w-md mx-auto px-4 py-6 animate-fade-in">
      <!-- Barra superior / Navegación -->
      <div class="flex items-center justify-between mb-6">
        <button id="btn-checkout-back" class="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> ${t('btn_back')}
        </button>
        <span class="text-xs uppercase tracking-widest text-zinc-500 font-bold">${t('step_indicator', { step: 2 })}</span>
      </div>

      <h2 class="text-2xl font-extrabold tracking-tight text-white mb-6">${t('checkout_title')}</h2>

      <div class="space-y-6">
        ${summaryHtml}

        <!-- Total General Fijo -->
        <div class="glass-panel p-5 rounded-3xl border-glow-emerald border bg-emerald-500/[0.02] flex items-center justify-between">
          <div>
            <span class="text-[10px] uppercase tracking-wider text-emerald-400 font-bold">${t('label_grand_total')}</span>
            <p class="text-[11px] text-zinc-500 mt-0.5">${t('label_grand_total_sub')}</p>
          </div>
          <div class="text-right">
            <span class="text-3xl font-extrabold text-white text-glow">$${totalUSD.toFixed(2)}</span>
            <span class="text-xs font-bold text-zinc-300 block">USD</span>
          </div>
        </div>

        <!-- Botón de Envío WhatsApp -->
        <button id="btn-whatsapp-submit" class="btn-premium w-full py-4.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-2xl text-sm font-bold tracking-wider uppercase shadow-xl flex items-center justify-center gap-2 mt-4">
          <i data-lucide="message-square" class="w-5 h-5 text-zinc-950"></i>
          <span>${t('btn_whatsapp')}</span>
        </button>

        <p class="text-[10px] text-zinc-500 text-center leading-relaxed max-w-xs mx-auto">
          ${t('checkout_footer_notice')}
        </p>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // EVENT LISTENERS

  document.getElementById('btn-checkout-back').addEventListener('click', () => {
    Store.navigate(isRemesa ? 'remesa' : 'recarga');
  });

  document.getElementById('btn-whatsapp-submit').addEventListener('click', () => {
    WhatsApp.sendOrder(order);
  });
}
