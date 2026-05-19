// Vista de Administración (Admin Panel) - Bóveda de Seguridad & Editor de Datos

import { Store } from '../store.js';
import { Api, GIST_ID } from '../api.js';
import { t } from '../i18n.js';

export function renderAdmin(container, state) {
  const { config, promos, adminToken } = state;

  // CASO A: Bóveda Bloqueada (No hay token verificado en memoria RAM)
  if (!adminToken) {
    container.innerHTML = `
      <div class="max-w-md mx-auto px-4 py-8 animate-fade-in pb-36">
        <!-- Barra superior / Navegación -->
        <div class="flex items-center justify-between mb-8">
          <button id="btn-admin-back" class="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
            <i data-lucide="arrow-left" class="w-4 h-4"></i> ${t('btn_back')}
          </button>
          <span class="text-xs uppercase tracking-widest text-zinc-500 font-bold">${t('nav_admin')}</span>
        </div>

        <!-- Tarjeta de la Bóveda -->
        <div class="glass-panel p-6 rounded-3xl border border-zinc-800 space-y-6 text-center shadow-2xl relative overflow-hidden">
          <div class="absolute -top-12 -left-12 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl"></div>
          
          <div class="mx-auto w-16 h-16 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-2xl flex items-center justify-center shadow-inner relative z-10">
            <i id="vault-lock-icon" data-lucide="shield-alert" class="w-7 h-7 text-zinc-400 transition-all duration-300"></i>
          </div>

          <div class="space-y-2 relative z-10">
            <h2 class="text-xl font-extrabold text-white tracking-tight">${t('vault_title')}</h2>
            <p class="text-xs text-zinc-500 leading-relaxed px-2">${t('vault_subtitle')}</p>
          </div>

          <div class="space-y-4 pt-2 relative z-10 text-left">
            <!-- Entrada de Token (PAT) -->
            <div class="space-y-1.5">
              <label class="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 pl-1">${t('label_token_required')}</label>
              <input type="password" id="vault-token-input" class="glass-input w-full p-3.5 rounded-xl text-xs font-mono focus:outline-none" 
                     placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
            </div>

            <!-- Botón de Desbloqueo -->
            <button type="button" id="btn-vault-unlock" class="btn-premium w-full py-4 bg-white text-zinc-950 font-bold hover:bg-zinc-100 rounded-xl text-xs tracking-widest uppercase shadow-xl flex items-center justify-center gap-2">
              <i data-lucide="key-round" class="w-4 h-4 text-zinc-950"></i>
              <span>${t('btn_unlock')}</span>
            </button>

            <!-- Retroalimentación / Estado -->
            <div id="vault-status-container" class="hidden text-center p-3 rounded-xl border transition-all text-xs font-bold"></div>
          </div>
        </div>
      </div>
    `;

    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Volver al home
    document.getElementById('btn-admin-back').addEventListener('click', () => {
      Store.navigate('home');
    });

    // Desbloquear Bóveda
    const unlockBtn = document.getElementById('btn-vault-unlock');
    const tokenInput = document.getElementById('vault-token-input');
    const statusBox = document.getElementById('vault-status-container');
    const lockIcon = document.getElementById('vault-lock-icon');

    unlockBtn.addEventListener('click', async () => {
      const token = tokenInput.value.trim();

      if (!token) {
        alert(t('alert_token_missing'));
        return;
      }

      // Estado Cargando
      unlockBtn.disabled = true;
      tokenInput.disabled = true;
      statusBox.className = "text-center p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 animate-fade-in text-xs font-bold";
      statusBox.innerText = t('msg_verifying');
      statusBox.classList.remove('hidden');

      if (lockIcon) {
        lockIcon.classList.add('animate-pulse');
        lockIcon.className = "w-7 h-7 text-emerald-400 animate-pulse";
      }

      try {
        // Validar el token contra el Gist implícito con timeout y cache-busting
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 segundos de timeout

        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          cache: 'no-store',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Token Válido — Verificar que tenga el scope 'gist' (solo para tokens clásicos ghp_)
          const scopes = response.headers.get('x-oauth-scopes');
          const isFineGrained = token.startsWith('github_pat_');
          if (scopes !== null && !isFineGrained) {
            const scopeList = scopes.split(',').map(s => s.trim());
            if (!scopeList.includes('gist')) {
              throw new Error(t('msg_invalid_token') + ' (scope "gist" requerido)');
            }
          }

          statusBox.className = "text-center p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 animate-fade-in text-xs font-bold";
          statusBox.innerText = "¡Verificado con éxito! Desbloqueando...";
          
          setTimeout(() => {
            Store.setAdminToken(token);
          }, 1000);
        } else {
          throw new Error('Sin autorización para modificar este Gist');
        }
      } catch (err) {
        // Token Inválido
        unlockBtn.disabled = false;
        tokenInput.disabled = false;
        statusBox.className = "text-center p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 animate-fade-in text-xs font-bold";
        statusBox.innerText = t('msg_invalid_token');

        if (lockIcon) {
          lockIcon.className = "w-7 h-7 text-red-400";
        }
      }
    });

    return;
  }

  // CASO B: Bóveda Desbloqueada (Visualizar todos los formularios)
  const tasas = config ? config.tasas_remesas : [];
  const operadores = config ? config.operadores_recarga : [];
  const promosList = promos || [];
  const deliveryBaseCost = config ? (config.opciones_delivery?.costo_base_usd || 3.00) : 3.00;

  // Editor de Tasas (Remesas)
  const ratesEditorHtml = tasas.map((tasa, idx) => `
    <div class="glass-panel p-4 rounded-2xl border border-zinc-800 space-y-3 relative group">
      <!-- Botón Eliminar País -->
      <button type="button" data-idx-delete-country="${idx}" class="absolute top-3.5 right-3.5 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all focus:outline-none">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>

      <div class="grid grid-cols-2 gap-3 pr-8">
        <!-- Nombre del País -->
        <div class="space-y-1">
          <input type="text" data-idx-country="${idx}" data-field="pais" class="glass-input w-full p-2.5 rounded-xl text-xs font-semibold text-white focus:outline-none" 
                 value="${tasa.pais}" placeholder="${t('placeholder_country')}">
        </div>
        <!-- Código de Moneda -->
        <div class="space-y-1">
          <input type="text" data-idx-country="${idx}" data-field="moneda" class="glass-input w-full p-2.5 rounded-xl text-xs font-bold text-white focus:outline-none uppercase" 
                 value="${tasa.moneda}" placeholder="${t('placeholder_currency')}">
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <!-- Tasa por Dólar -->
        <div class="space-y-1">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 pl-1">${t('placeholder_rate')}</label>
          <input type="number" step="any" data-idx-country="${idx}" data-field="tasa_por_dolar" class="glass-input w-full p-2.5 rounded-xl text-xs font-semibold text-white focus:outline-none" 
                 value="${tasa.tasa_por_dolar}" placeholder="1.00">
        </div>
        <!-- Comisión Fija USD -->
        <div class="space-y-1">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 pl-1">${t('placeholder_commission')}</label>
          <input type="number" step="any" data-idx-country="${idx}" data-field="comision_fija_usd" class="glass-input w-full p-2.5 rounded-xl text-xs font-semibold text-white focus:outline-none" 
                 value="${tasa.comision_fija_usd}" placeholder="0.00">
        </div>
      </div>
    </div>
  `).join('');

  // Editor de Recargas (Operadores y Montos)
  const recargasEditorHtml = operadores.map((op, idx) => `
    <div class="glass-panel p-4 rounded-2xl border border-zinc-800 space-y-3 relative group">
      <!-- Botón Eliminar Operador -->
      <button type="button" data-idx-delete-operator="${idx}" class="absolute top-3.5 right-3.5 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all focus:outline-none">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>

      <div class="grid grid-cols-2 gap-3 pr-8">
        <!-- Nombre del Operador -->
        <div class="space-y-1">
          <input type="text" data-idx-operator="${idx}" data-field="nombre" class="glass-input w-full p-2.5 rounded-xl text-xs font-semibold text-white focus:outline-none" 
                 value="${op.nombre}" placeholder="${t('placeholder_operator_name')}">
        </div>
        <!-- Tipo de Servicio -->
        <div class="space-y-1">
          <input type="text" data-idx-operator="${idx}" data-field="tipo" class="glass-input w-full p-2.5 rounded-xl text-xs font-medium text-white focus:outline-none" 
                 value="${op.tipo}" placeholder="${t('placeholder_operator_type')}">
        </div>
      </div>

      <!-- Montos Permitidos (Texto separado por comas) -->
      <div class="space-y-1.5">
        <label class="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 pl-1">${t('placeholder_operator_amounts')}</label>
        <input type="text" data-idx-operator="${idx}" data-field="montos_permitidos_usd" class="glass-input w-full p-2.5 rounded-xl text-xs font-semibold text-white focus:outline-none" 
               value="${op.montos_permitidos_usd.join(', ')}" placeholder="5, 10, 15, 20">
      </div>
    </div>
  `).join('');

  // Editor de Promociones
  const promosEditorHtml = promosList.map((promo, idx) => `
    <div class="glass-panel p-4 rounded-2xl border border-zinc-800 space-y-3 relative group">
      <!-- Botón Eliminar Promo -->
      <button type="button" data-idx-delete-promo="${idx}" class="absolute top-3.5 right-3.5 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all focus:outline-none">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>

      <div class="space-y-3 pr-8">
        <!-- Título de la Promo -->
        <input type="text" data-idx-promo="${idx}" data-field="titulo" class="glass-input w-full p-2.5 rounded-xl text-xs font-semibold text-white focus:outline-none" 
               value="${promo.titulo}" placeholder="Título de la oferta">
        <!-- Descripción -->
        <textarea rows="2" data-idx-promo="${idx}" data-field="descripcion" class="glass-input w-full p-2.5 rounded-xl text-xs text-zinc-300 focus:outline-none" 
                  placeholder="Descripción detallada de la promoción">${promo.descripcion}</textarea>
      </div>

      <!-- Estado Activo -->
      <div class="flex items-center justify-between pt-1">
        <span class="text-xs font-semibold text-zinc-400">${t('label_active')}</span>
        <label class="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" data-idx-promo-active="${idx}" class="sr-only peer" ${promo.activo ? 'checked' : ''}>
          <div class="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-white peer-checked:after:bg-zinc-900"></div>
        </label>
      </div>
    </div>
  `).join('');

  // Editor de Direcciones de Oficina
  const oficinasEditorHtml = (config?.oficinas || []).map((o, idx) => `
    <div class="glass-panel p-4 rounded-2xl border border-zinc-800 space-y-3 relative group">
      <!-- Botón Eliminar Oficina -->
      <button type="button" data-idx-delete-office="${idx}" class="absolute top-3.5 right-3.5 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all focus:outline-none">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>

      <div class="space-y-2.5 pr-8">
        <div class="space-y-1">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Nombre de Oficina</label>
          <input type="text" data-idx-office="${idx}" data-field="nombre" class="glass-input w-full p-2.5 rounded-xl text-xs font-semibold text-white focus:outline-none" 
                 value="${o.nombre}" placeholder="Ej. Oficina Central Paramaribo">
        </div>
        <div class="space-y-1">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Dirección Física</label>
          <textarea rows="2" data-idx-office="${idx}" data-field="direccion" class="glass-input w-full p-2.5 rounded-xl text-xs text-zinc-300 focus:outline-none" 
                    placeholder="Wilhelminastraat #45, Paramaribo">${o.direccion}</textarea>
        </div>
      </div>
    </div>
  `).join('');

  // Editor de Contactos WhatsApp
  const contactosEditorHtml = (config?.telefonos_contacto || []).map((c, idx) => `
    <div class="glass-panel p-4 rounded-2xl border border-zinc-800 space-y-3 relative group">
      <!-- Botón Eliminar Contacto -->
      <button type="button" data-idx-delete-contact="${idx}" class="absolute top-3.5 right-3.5 text-zinc-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-500/10 transition-all focus:outline-none">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
      </button>

      <div class="grid grid-cols-2 gap-3 pr-8">
        <div class="space-y-1">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Nombre / Línea</label>
          <input type="text" data-idx-contact="${idx}" data-field="nombre" class="glass-input w-full p-2.5 rounded-xl text-xs font-semibold text-white focus:outline-none" 
                 value="${c.nombre}" placeholder="Ej. Operador A">
        </div>
        <div class="space-y-1">
          <label class="block text-[9px] font-bold uppercase tracking-wider text-zinc-500 pl-1">Número WhatsApp</label>
          <input type="text" data-idx-contact="${idx}" data-field="numero" class="glass-input w-full p-2.5 rounded-xl text-xs font-bold text-white focus:outline-none" 
                 value="${c.numero}" placeholder="Ej. 5971234567">
        </div>
      </div>
    </div>
  `).join('');

  // Renderizador de Pedidos
  const sortedPedidos = [...(state.pedidos || [])].sort((a, b) => {
    if (a.estado === 'pendiente' && b.estado !== 'pendiente') return -1;
    if (a.estado !== 'pendiente' && b.estado === 'pendiente') return 1;
    return new Date(b.fecha || 0) - new Date(a.fecha || 0);
  });

  const ordersHtml = sortedPedidos.map(p => {
    const isRemesa = p.type === 'remesa';
    const dateFormatted = p.fecha ? new Date(p.fecha).toLocaleString() : 'Fecha no disponible';
    
    let logisticsText = '';
    if (p.delivery?.selected) {
      logisticsText = `🚚 Delivery: <span class="text-zinc-300 font-medium">${p.delivery.direccion || ''}</span>`;
    } else if (p.delivery?.oficina) {
      const office = (config?.oficinas || []).find(o => o.id === p.delivery.oficina);
      logisticsText = `🏢 Retiro en Oficina: <span class="text-zinc-300 font-medium">${office ? office.nombre : p.delivery.oficina}</span>`;
    } else {
      logisticsText = `🏠 Retiro presencial sin dirección`;
    }
    
    let detailsText = '';
    let totalUSD = 0;
    if (isRemesa) {
      const r = p.remesa;
      totalUSD = (r?.montoEnviar || 0) + (p.delivery?.selected ? deliveryBaseCost : 0.00);
      detailsText = `
        <p class="text-zinc-400">País: <strong class="text-white">${r?.pais?.pais || 'N/A'}</strong></p>
        <p class="text-zinc-400">Recibe: <strong class="text-emerald-400">${r?.montoRecibir?.toLocaleString() || 0} ${r?.pais?.moneda || ''}</strong></p>
        <p class="text-zinc-400">Envía: <strong class="text-zinc-200">$${r?.montoEnviar?.toFixed(2) || '0.00'} USD</strong></p>
      `;
    } else {
      const r = p.recarga;
      totalUSD = (r?.monto || 0) + (p.delivery?.selected ? deliveryBaseCost : 0.00);
      detailsText = `
        <p class="text-zinc-400">Operador: <strong class="text-white">${r?.operador?.nombre || 'N/A'}</strong></p>
        <p class="text-zinc-400">Móvil: <strong class="text-blue-400">${r?.telefono || ''}</strong></p>
        <p class="text-zinc-400">Recarga: <strong class="text-zinc-200">$${r?.monto?.toFixed(2) || '0.00'} USD</strong></p>
      `;
    }
    
    const statusBadges = {
      pendiente: '<span class="px-2 py-0.5 text-[9px] font-bold text-amber-400 bg-amber-500/10 rounded-full border border-amber-500/20 uppercase tracking-wider animate-pulse">Pendiente</span>',
      completado: '<span class="px-2 py-0.5 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-wider">Completado</span>',
      cancelado: '<span class="px-2 py-0.5 text-[9px] font-bold text-zinc-500 bg-zinc-500/10 rounded-full border border-zinc-500/20 uppercase tracking-wider">Cancelado</span>'
    };
    
    return `
      <div class="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-4 relative overflow-hidden transition-all duration-300 hover:border-zinc-700">
        <!-- Encabezado -->
        <div class="flex items-center justify-between border-b border-zinc-900 pb-3">
          <div class="flex items-center gap-2">
            <span class="text-xs font-bold text-white font-mono">#${p.id.slice(0, 8)}</span>
            ${p.type === 'remesa' 
              ? '<span class="px-1.5 py-0.5 text-[8px] font-extrabold text-emerald-400 bg-emerald-500/10 rounded uppercase">Remesa</span>'
              : '<span class="px-1.5 py-0.5 text-[8px] font-extrabold text-blue-400 bg-blue-500/10 rounded uppercase">Recarga</span>'}
          </div>
          <div>
            ${statusBadges[p.estado] || p.estado}
          </div>
        </div>
        
        <!-- Detalles -->
        <div class="grid grid-cols-2 gap-4 text-xs">
          <div class="space-y-1">
            ${detailsText}
          </div>
          <div class="space-y-1 text-right">
            <p class="text-[10px] text-zinc-500">${dateFormatted}</p>
            <p class="text-xs text-zinc-400 mt-1.5">Total:</p>
            <p class="text-lg font-extrabold text-white">$${totalUSD.toFixed(2)} <span class="text-[10px] font-bold text-zinc-400">USD</span></p>
          </div>
        </div>
        
        <!-- Logística y Contacto -->
        <div class="text-[11px] space-y-1.5 bg-zinc-950/40 p-3 rounded-xl border border-zinc-900">
          <p class="text-zinc-400">${logisticsText}</p>
          ${p.contacto_whatsapp ? `<p class="text-zinc-500">📞 WhatsApp de contacto: <span class="text-zinc-400 font-mono font-semibold">${p.contacto_whatsapp}</span></p>` : ''}
        </div>
        
        <!-- Acciones del Pedido (Sólo si está pendiente) -->
        ${p.estado === 'pendiente' ? `
          <div class="flex gap-2 pt-1">
            <button type="button" data-action-complete="${p.id}" class="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md">
              <i data-lucide="check" class="w-3.5 h-3.5 text-zinc-950"></i> Completar
            </button>
            <button type="button" data-action-cancel="${p.id}" class="py-2.5 px-4 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-zinc-200 font-semibold rounded-xl text-xs uppercase transition-all">
              Cancelar
            </button>
          </div>
        ` : ''}
      </div>
    `;
  }).join('');

  const pendingOrdersCount = (state.pedidos || []).filter(p => p.estado === 'pendiente').length;

  container.innerHTML = `
    <div class="max-w-md mx-auto px-4 py-6 animate-fade-in pb-36">
      <!-- Barra superior / Navegación -->
      <div class="flex items-center justify-between mb-6">
        <button id="btn-admin-back" class="p-2 -ml-2 text-zinc-400 hover:text-white transition-colors flex items-center gap-1 text-sm font-medium">
          <i data-lucide="arrow-left" class="w-4 h-4"></i> ${t('btn_back')}
        </button>
        <div class="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-[9px] font-bold uppercase tracking-wider">
          <i data-lucide="shield-check" class="w-3 h-3"></i>
          <span>Bóveda Desbloqueada</span>
        </div>
      </div>

      <div class="space-y-2 mb-6">
        <h2 class="text-2xl font-extrabold tracking-tight text-white">${t('admin_title')}</h2>
        <p class="text-xs text-zinc-500 leading-relaxed">${t('admin_subtitle')}</p>
      </div>

      <!-- Control de Pestañas Premium -->
      <div class="flex border border-zinc-800/80 mb-6 bg-zinc-950/40 p-1.5 rounded-2xl gap-1.5">
        <button id="tab-btn-ajustes" class="flex-1 py-3 rounded-xl text-xs font-bold transition-all text-center focus:outline-none bg-white text-zinc-950 shadow-lg shadow-white/5 flex items-center justify-center gap-1.5">
          <i data-lucide="settings" class="w-3.5 h-3.5"></i>
          <span>Ajustes</span>
        </button>
        <button id="tab-btn-pedidos" class="flex-1 py-3 rounded-xl text-xs font-bold transition-all text-center focus:outline-none text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 relative">
          <i data-lucide="clipboard-list" class="w-3.5 h-3.5"></i>
          <span>Pedidos</span>
          ${pendingOrdersCount > 0 ? `
            <span class="absolute -top-1.5 -right-1.5 flex h-4 w-4">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-4 w-4 bg-rose-500 text-[9px] font-extrabold text-white items-center justify-center">${pendingOrdersCount}</span>
            </span>
          ` : ''}
        </button>
      </div>

      <!-- CONTENIDO PESTAÑA 1: AJUSTES -->
      <div id="admin-tab-ajustes-content" class="space-y-6">
        
        <!-- Fuera de Servicio -->
        <div class="glass-panel p-5 rounded-2xl border border-zinc-800 space-y-4">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5">
            <i data-lucide="power" class="w-4 h-4 text-rose-500"></i> ${t('label_out_of_service_editor')}
          </h3>
          <p class="text-[10px] text-zinc-500 leading-normal">${t('label_out_of_service_editor_sub')}</p>
          
          <div class="space-y-3 pt-2">
            <!-- Toggle Remesas -->
            <div class="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/40">
              <div>
                <span class="text-xs font-bold text-white">Envío de Remesas</span>
                <p class="text-[9px] text-zinc-500 mt-0.5">Desactivar temporalmente el módulo de remesas</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="toggle-service-remesas" class="sr-only peer" ${config?.fuera_de_servicio?.remesas ? 'checked' : ''}>
                <div class="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500 peer-checked:after:bg-white"></div>
              </label>
            </div>

            <!-- Toggle Recargas -->
            <div class="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/40">
              <div>
                <span class="text-xs font-bold text-white">Recargas Móviles</span>
                <p class="text-[9px] text-zinc-500 mt-0.5">Desactivar temporalmente el módulo de recargas</p>
              </div>
              <label class="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" id="toggle-service-recargas" class="sr-only peer" ${config?.fuera_de_servicio?.recargas ? 'checked' : ''}>
                <div class="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-500 peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>
        </div>

        <!-- Editor de Oficinas Físicas -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-zinc-500">Direcciones de Oficinas</h3>
            <button type="button" id="btn-add-office" class="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Añadir Oficina
            </button>
          </div>
          <div class="space-y-3">
            ${oficinasEditorHtml || `<p class="text-xs text-zinc-500 italic text-center py-4">No hay oficinas configuradas. El retiro físico estará deshabilitado.</p>`}
          </div>
        </div>

        <!-- Editor de Contactos WhatsApp -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-zinc-500">Líneas de WhatsApp</h3>
            <button type="button" id="btn-add-contact" class="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-all flex items-center gap-1">
              <i data-lucide="plus" class="w-3.5 h-3.5"></i> Añadir Contacto
            </button>
          </div>
          <div class="space-y-3">
            ${contactosEditorHtml || `<p class="text-xs text-zinc-500 italic text-center py-4">No hay contactos configurados. Se usará el número por defecto.</p>`}
          </div>
        </div>

        <!-- Editor de Países y Tasas (Remesas) -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-zinc-500">${t('editor_section_title')}</h3>
            <button type="button" id="btn-add-country" class="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-all">
              ${t('btn_add_country')}
            </button>
          </div>
          <div class="space-y-3">
            ${ratesEditorHtml || `<p class="text-xs text-zinc-500 italic text-center py-4">No hay países configurados.</p>`}
          </div>
        </div>

        <!-- Editor de Operadores y Montos (Recargas) -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-zinc-500">${t('editor_recargas_title')}</h3>
            <button type="button" id="btn-add-operator" class="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-all">
              ${t('btn_add_operator')}
            </button>
          </div>
          <div class="space-y-3">
            ${recargasEditorHtml || `<p class="text-xs text-zinc-500 italic text-center py-4">No hay operadores configurados.</p>`}
          </div>
        </div>

        <!-- Editor de Promociones -->
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <h3 class="text-xs font-semibold uppercase tracking-widest text-zinc-500">${t('label_promos_editor')}</h3>
            <button type="button" id="btn-add-promo" class="text-[10px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 font-bold px-3 py-1.5 rounded-lg transition-all">
              ${t('btn_add_promo')}
            </button>
          </div>
          <div class="space-y-3">
            ${promosEditorHtml || `<p class="text-xs text-zinc-500 italic text-center py-4">No hay promociones configuradas.</p>`}
          </div>
        </div>

        <!-- Publicación Remota Con Un Clic (Token en Memoria) -->
        <div class="pt-6 border-t border-zinc-900 space-y-4">
          <button id="btn-publish-gist" class="btn-premium w-full py-4 bg-white text-zinc-950 font-bold hover:bg-zinc-100 rounded-2xl text-xs tracking-widest uppercase shadow-xl flex items-center justify-center gap-2">
            <i data-lucide="globe" class="w-4 h-4 text-zinc-950"></i>
            <span>${t('btn_publish')}</span>
          </button>
          
          <div id="publish-status-container" class="hidden text-center p-3 rounded-xl border">
            <p id="publish-status-text" class="text-xs font-bold"></p>
          </div>
        </div>
      </div>

      <!-- CONTENIDO PESTAÑA 2: PEDIDOS -->
      <div id="admin-tab-pedidos-content" class="space-y-4 hidden">
        <div class="flex items-center justify-between">
          <h3 class="text-xs font-semibold uppercase tracking-widest text-zinc-500">Gestión de Pedidos</h3>
          <span class="text-[10px] text-zinc-400 bg-zinc-900 border border-zinc-800 px-2.5 py-1 rounded-md font-semibold">${state.pedidos?.length || 0} en total</span>
        </div>
        
        <div class="space-y-3.5">
          ${ordersHtml || `<p class="text-xs text-zinc-500 italic text-center py-10">No hay pedidos registrados en el sistema.</p>`}
        </div>
      </div>
    </div>
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }

  // EVENT LISTENERS

  // Volver
  document.getElementById('btn-admin-back').addEventListener('click', () => {
    Store.navigate('home');
  });

  // Controladores de Pestañas
  const tabBtnAjustes = document.getElementById('tab-btn-ajustes');
  const tabBtnPedidos = document.getElementById('tab-btn-pedidos');
  const tabAjustesContent = document.getElementById('admin-tab-ajustes-content');
  const tabPedidosContent = document.getElementById('admin-tab-pedidos-content');

  if (tabBtnAjustes && tabBtnPedidos) {
    tabBtnAjustes.addEventListener('click', () => {
      tabBtnAjustes.className = "flex-1 py-3 rounded-xl text-xs font-bold transition-all text-center focus:outline-none bg-white text-zinc-950 shadow-lg shadow-white/5 flex items-center justify-center gap-1.5";
      tabBtnPedidos.className = "flex-1 py-3 rounded-xl text-xs font-bold transition-all text-center focus:outline-none text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5 relative";
      tabAjustesContent.classList.remove('hidden');
      tabPedidosContent.classList.add('hidden');
    });

    tabBtnPedidos.addEventListener('click', () => {
      tabBtnPedidos.className = "flex-1 py-3 rounded-xl text-xs font-bold transition-all text-center focus:outline-none bg-white text-zinc-950 shadow-lg shadow-white/5 flex items-center justify-center gap-1.5 relative";
      tabBtnAjustes.className = "flex-1 py-3 rounded-xl text-xs font-bold transition-all text-center focus:outline-none text-zinc-400 hover:text-zinc-200 flex items-center justify-center gap-1.5";
      tabPedidosContent.classList.remove('hidden');
      tabAjustesContent.classList.add('hidden');
    });
  }

  // Controladores Fuera de Servicio
  const toggleRemesas = document.getElementById('toggle-service-remesas');
  if (toggleRemesas) {
    toggleRemesas.addEventListener('change', (e) => {
      Store.setFueraDeServicio('remesas', e.target.checked);
    });
  }

  const toggleRecargas = document.getElementById('toggle-service-recargas');
  if (toggleRecargas) {
    toggleRecargas.addEventListener('change', (e) => {
      Store.setFueraDeServicio('recargas', e.target.checked);
    });
  }

  // Añadir/Editar/Eliminar Oficinas
  const btnAddOffice = document.getElementById('btn-add-office');
  if (btnAddOffice) {
    btnAddOffice.addEventListener('click', () => {
      Store.addOficina({
        id: `office_${Date.now()}`,
        nombre: "Nueva Oficina",
        direccion: "Dirección de la oficina..."
      });
    });
  }

  container.querySelectorAll('input[data-idx-office], textarea[data-idx-office]').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx-office'));
      const field = e.target.getAttribute('data-field');
      const val = e.target.value;
      Store.updateOficina(idx, field, val);
    });
  });

  container.querySelectorAll('button[data-idx-delete-office]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const btnEl = e.target.closest('button');
      const idx = parseInt(btnEl.getAttribute('data-idx-delete-office'));
      Store.deleteOficina(idx);
    });
  });

  // Añadir/Editar/Eliminar Contactos WhatsApp
  const btnAddContact = document.getElementById('btn-add-contact');
  if (btnAddContact) {
    btnAddContact.addEventListener('click', () => {
      Store.addContacto({
        nombre: "Operador Nuevo",
        numero: "5971234567"
      });
    });
  }

  container.querySelectorAll('input[data-idx-contact]').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx-contact'));
      const field = e.target.getAttribute('data-field');
      const val = e.target.value;
      Store.updateContacto(idx, field, val);
    });
  });

  container.querySelectorAll('button[data-idx-delete-contact]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const btnEl = e.target.closest('button');
      const idx = parseInt(btnEl.getAttribute('data-idx-delete-contact'));
      Store.deleteContacto(idx);
    });
  });

  // Mutaciones del editor de países (Remesas)
  container.querySelectorAll('input[data-idx-country]').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx-country'));
      const field = e.target.getAttribute('data-field');
      const val = e.target.value;
      Store.updateRemesaPais(idx, field, val);
    });
  });

  // Botón Añadir País
  document.getElementById('btn-add-country').addEventListener('click', () => {
    Store.addRemesaPais({
      pais: "Nuevo País",
      moneda: "LOCAL",
      tasa_por_dolar: 1.00,
      comision_fija_usd: 5.00
    });
  });

  // Botones Eliminar País
  container.querySelectorAll('button[data-idx-delete-country]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const btnEl = e.target.closest('button');
      const idx = parseInt(btnEl.getAttribute('data-idx-delete-country'));
      Store.deleteRemesaPais(idx);
    });
  });

  // Mutaciones del editor de recargas (Operadores)
  container.querySelectorAll('input[data-idx-operator]').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx-operator'));
      const field = e.target.getAttribute('data-field');
      const val = e.target.value;
      Store.updateRecargaOperador(idx, field, val);
    });
  });

  // Botón Añadir Operador
  document.getElementById('btn-add-operator').addEventListener('click', () => {
    Store.addRecargaOperador({
      nombre: "Nuevo Operador",
      tipo: "Móvil",
      montos_permitidos_usd: [5, 10, 20]
    });
  });

  // Botones Eliminar Operador
  container.querySelectorAll('button[data-idx-delete-operator]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const btnEl = e.target.closest('button');
      const idx = parseInt(btnEl.getAttribute('data-idx-delete-operator'));
      Store.deleteRecargaOperador(idx);
    });
  });

  // Mutaciones del editor de promociones
  container.querySelectorAll('input[data-idx-promo], textarea[data-idx-promo]').forEach(input => {
    input.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx-promo'));
      const field = e.target.getAttribute('data-field');
      const val = e.target.value;
      Store.updatePromo(idx, field, val);
    });
  });

  // Toggles Activo Promociones
  container.querySelectorAll('input[data-idx-promo-active]').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx-promo-active'));
      const isChecked = e.target.checked;
      Store.updatePromo(idx, 'activo', isChecked);
    });
  });

  // Botón Añadir Oferta
  document.getElementById('btn-add-promo').addEventListener('click', () => {
    Store.addPromo({
      id: `promo_${Date.now()}`,
      titulo: "Nueva Oferta Especial",
      descripcion: "Descripción de la oferta...",
      activo: true
    });
  });

  // Botones Eliminar Oferta
  container.querySelectorAll('button[data-idx-delete-promo]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const btnEl = e.target.closest('button');
      const idx = parseInt(btnEl.getAttribute('data-idx-delete-promo'));
      Store.deletePromo(idx);
    });
  });

  // Sincronizar Pedidos a Gist al cambiar de estado
  async function syncPedidosToGist(pedidoId, nuevoEstado) {
    Store.updatePedidoEstado(pedidoId, nuevoEstado);
    const updatedState = Store.getState();
    const filename = 'moneycast.txt';
    const payload = {
      files: {
        [filename]: {
          content: JSON.stringify({
            config: updatedState.config,
            promos: updatedState.promos,
            pedidos: updatedState.pedidos || []
          }, null, 2)
        }
      }
    };
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${updatedState.adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        // Recargar datos y re-renderizar para reflejar el estado actual
        const data = await Api.loadAppData();
        Store.setData(data.config, data.promos, data.pedidos);
      } else {
        throw new Error(`GitHub devuelto con código: ${response.status}`);
      }
    } catch (err) {
      console.error(err);
      alert(`Error al sincronizar el estado del pedido: ${err.message}`);
    }
  }

  // Escuchadores de Acciones de Pedido (Completar / Cancelar)
  container.querySelectorAll('button[data-action-complete]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const btnEl = e.target.closest('button');
      const id = btnEl.getAttribute('data-action-complete');
      btnEl.disabled = true;
      btnEl.classList.add('opacity-70', 'cursor-wait');
      await syncPedidosToGist(id, 'completado');
    });
  });

  container.querySelectorAll('button[data-action-cancel]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const btnEl = e.target.closest('button');
      const id = btnEl.getAttribute('data-action-cancel');
      btnEl.disabled = true;
      btnEl.classList.add('opacity-70', 'cursor-wait');
      await syncPedidosToGist(id, 'cancelado');
    });
  });

  // BOTÓN DE PUBLICACIÓN REMOTA GENERAL CON UN CLIC
  document.getElementById('btn-publish-gist').addEventListener('click', async () => {
    const filename = 'moneycast.txt';
    const statusContainer = document.getElementById('publish-status-container');
    const statusText = document.getElementById('publish-status-text');

    if (config) {
      config.ultima_actualizacion = new Date().toISOString();
    }

    statusContainer.className = "text-center p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 text-zinc-400 animate-fade-in";
    statusText.innerText = t('msg_publishing');
    statusContainer.classList.remove('hidden');

    const payload = {
      files: {
        [filename]: {
          content: JSON.stringify({
            config: config,
            promos: promosList,
            pedidos: state.pedidos || []
          }, null, 2)
        }
      }
    };

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        statusContainer.className = "text-center p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 animate-fade-in";
        statusText.innerText = t('msg_publish_success');
        
        const data = await Api.loadAppData();
        Store.setData(data.config, data.promos, data.pedidos);
      } else {
        throw new Error(`GitHub API devuelta con código: ${response.status}`);
      }
    } catch (err) {
      console.error(err);
      statusContainer.className = "text-center p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 animate-fade-in";
      statusText.innerText = `${t('msg_publish_error')} (${err.message})`;
    }
  });
}

