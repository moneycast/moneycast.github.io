// Vista de Inicio (Home) - Traducida con i18n

import { Store } from '../store.js';
import { t } from '../i18n.js';

export function renderHome(container, state) {
  const { promos } = state;

  const activePromos = promos.filter(p => p.activo);
  
  let promosHtml = '';
  if (activePromos.length > 0) {
    promosHtml = `
      <div class="mt-8 animate-fade-in" style="animation-delay: 0.15s">
        <h3 class="text-xs uppercase tracking-widest text-zinc-500 font-semibold mb-3">${t('promos_title')}</h3>
        <div class="flex flex-col gap-3">
          ${activePromos.map(promo => `
            <div class="glass-card p-4 rounded-2xl border-l-2 border-l-emerald-500 flex items-start gap-3">
              <div class="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
                <i data-lucide="sparkles" class="w-5 h-5"></i>
              </div>
              <div>
                <h4 class="text-sm font-semibold text-zinc-100">${promo.titulo}</h4>
                <p class="text-xs text-zinc-400 mt-1 leading-relaxed">${promo.descripcion}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="max-w-md mx-auto px-4 py-6">
      <!-- Hero / Header -->
      <div class="text-center py-10 animate-fade-in">
        <span class="text-[10px] tracking-[0.2em] uppercase font-bold text-zinc-500">${t('brand_subtitle')}</span>
        <h1 class="text-4xl font-extrabold tracking-tight text-white mt-2 mb-3 text-glow">${t('home_title')}</h1>
        <p class="text-sm text-zinc-400 font-light max-w-xs mx-auto leading-relaxed">
          ${t('home_desc')}
        </p>
      </div>

  const fueraDeServicio = state.config?.fuera_de_servicio || { remesas: false, recargas: false };
  const remesaFuera = fueraDeServicio.remesas;
  const recargaFuera = fueraDeServicio.recargas;

  container.innerHTML = `
    <div class="max-w-md mx-auto px-4 py-6">
      <!-- Hero / Header -->
      <div class="text-center py-10 animate-fade-in">
        <span class="text-[10px] tracking-[0.2em] uppercase font-bold text-zinc-500">${t('brand_subtitle')}</span>
        <h1 class="text-4xl font-extrabold tracking-tight text-white mt-2 mb-3 text-glow">${t('home_title')}</h1>
        <p class="text-sm text-zinc-400 font-light max-w-xs mx-auto leading-relaxed">
          ${t('home_desc')}
        </p>
      </div>

      <!-- Grid de Servicios -->
      <div class="grid grid-cols-1 gap-4 mt-4 animate-fade-in" style="animation-delay: 0.05s">
        <!-- Servicio Remesa -->
        <button id="btn-service-remesa" 
          class="glass-card w-full text-left p-6 rounded-3xl flex items-center justify-between group focus:outline-none transition-all duration-300 ${remesaFuera ? 'opacity-50 cursor-not-allowed border-rose-500/20' : 'hover:-translate-y-1'}"
          ${remesaFuera ? 'disabled' : ''}>
          <div class="flex items-center gap-4">
            <div class="p-3.5 bg-zinc-900 rounded-2xl border border-zinc-800 text-zinc-300 group-hover:text-white group-hover:border-zinc-700 transition-colors">
              <i data-lucide="send" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                ${t('service_remesa_title')}
                ${remesaFuera ? `<span class="px-2 py-0.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 rounded-full border border-rose-500/20 uppercase tracking-widest animate-pulse">Pausado</span>` : ''}
              </h2>
              <p class="text-xs text-zinc-400 mt-0.5">${t('service_remesa_desc')}</p>
            </div>
          </div>
          <div class="text-zinc-500 group-hover:text-white transition-colors">
            <i data-lucide="${remesaFuera ? 'ban' : 'chevron-right'}" class="w-5 h-5 ${remesaFuera ? 'text-rose-500' : ''}"></i>
          </div>
        </button>

        <!-- Servicio Recarga -->
        <button id="btn-service-recarga" 
          class="glass-card w-full text-left p-6 rounded-3xl flex items-center justify-between group focus:outline-none transition-all duration-300 ${recargaFuera ? 'opacity-50 cursor-not-allowed border-rose-500/20' : 'hover:-translate-y-1'}"
          ${recargaFuera ? 'disabled' : ''}>
          <div class="flex items-center gap-4">
            <div class="p-3.5 bg-zinc-900 rounded-2xl border border-zinc-800 text-zinc-300 group-hover:text-white group-hover:border-zinc-700 transition-colors">
              <i data-lucide="smartphone" class="w-6 h-6"></i>
            </div>
            <div>
              <h2 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                ${t('service_recarga_title')}
                ${recargaFuera ? `<span class="px-2 py-0.5 text-[9px] font-bold text-rose-400 bg-rose-500/10 rounded-full border border-rose-500/20 uppercase tracking-widest animate-pulse">Pausado</span>` : ''}
              </h2>
              <p class="text-xs text-zinc-400 mt-0.5">${t('service_recarga_desc')}</p>
            </div>
          </div>
          <div class="text-zinc-500 group-hover:text-white transition-colors">
            <i data-lucide="${recargaFuera ? 'ban' : 'chevron-right'}" class="w-5 h-5 ${recargaFuera ? 'text-rose-500' : ''}"></i>
          </div>
        </button>
      </div>

      <!-- Seccion Delivery Info Banner -->
      <div class="mt-6 glass-panel border border-zinc-800 rounded-3xl p-5 flex items-center gap-4 animate-fade-in" style="animation-delay: 0.1s">
        <div class="p-3 bg-zinc-900 rounded-xl text-zinc-400">
          <i data-lucide="truck" class="w-5 h-5 animate-pulse-subtle"></i>
        </div>
        <div class="flex-1">
          <h3 class="text-xs font-semibold uppercase tracking-wider text-zinc-300">${t('delivery_banner_title')}</h3>
          <p class="text-[11px] text-zinc-400 mt-0.5 leading-relaxed">
            ${t('delivery_banner_desc')}
          </p>
        </div>
      </div>

      <!-- Ofertas -->
      ${promosHtml}
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Event Listeners
  if (!remesaFuera) {
    document.getElementById('btn-service-remesa').addEventListener('click', () => {
      Store.resetOrder();
      Store.navigate('remesa');
    });
  }

  if (!recargaFuera) {
    document.getElementById('btn-service-recarga').addEventListener('click', () => {
      Store.resetOrder();
      Store.navigate('recarga');
    });
  }
}
