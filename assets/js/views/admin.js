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
        // Validar el token contra el Gist implícito
        const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          // Token Válido! Almacenar en Store de forma exclusiva (Memoria RAM)
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

      <div class="space-y-6">
        <!-- 1. Editor de Países y Tasas (Remesas) -->
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

        <!-- 2. Editor de Operadores y Montos (Recargas) -->
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

        <!-- 3. Editor de Promociones -->
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

        <!-- 4. Publicación Remota Con Un Clic (Token en Memoria) -->
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

  // BOTÓN DE PUBLICACIÓN REMOTA CON UN CLIC (Usa el Token PAT ya verificado en memoria RAM)
  document.getElementById('btn-publish-gist').addEventListener('click', async () => {
    const filename = 'moneycast.txt';
    const statusContainer = document.getElementById('publish-status-container');
    const statusText = document.getElementById('publish-status-text');

    // Actualizar última fecha de modificación
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
            promos: promosList
          }, null, 2)
        }
      }
    };

    try {
      const response = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        statusContainer.className = "text-center p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 animate-fade-in";
        statusText.innerText = t('msg_publish_success');
        
        // Sincronizar de inmediato el cliente local
        const data = await Api.loadAppData();
        Store.setData(data.config, data.promos);
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
