// Vista de Administración (Admin Panel) - Editor Completo (Remesas & Recargas) y Token On-Demand

import { Store } from '../store.js';
import { Api } from '../api.js';
import { t } from '../i18n.js';

export function renderAdmin(container, state) {
  const { config, promos } = state;
  
  // Obtener credenciales públicas guardadas (Gist ID únicamente)
  const gistId = localStorage.getItem('moneycast_gist_id') || '';
  
  const tasas = config ? config.tasas_remesas : [];
  const operadores = config ? config.operadores_recarga : [];
  const promosList = promos || [];

  // 1. Editor de Tasas (Remesas)
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

  // 2. Editor de Recargas (Operadores y Montos)
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

  // 3. Editor de Promociones
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
        <span class="text-xs uppercase tracking-widest text-zinc-500 font-bold">${t('nav_admin')}</span>
      </div>

      <div class="space-y-2 mb-6">
        <h2 class="text-2xl font-extrabold tracking-tight text-white">${t('admin_title')}</h2>
        <p class="text-xs text-zinc-500 leading-relaxed">${t('admin_subtitle')}</p>
      </div>

      <div class="space-y-6">
        <!-- 1. Formulario de Gist ID (Local Storage) -->
        <div class="glass-panel p-5 rounded-3xl border border-zinc-800 space-y-4">
          <div class="flex items-center gap-2.5 text-zinc-300 font-bold text-sm">
            <i data-lucide="database" class="w-4 h-4 text-emerald-400"></i>
            <span>Base de Datos Gist</span>
          </div>

          <div class="space-y-3.5">
            <!-- Gist ID -->
            <div class="space-y-1">
              <label class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-500">${t('label_gist_id')}</label>
              <input type="text" id="admin-gist-id" class="glass-input w-full p-3 rounded-xl text-xs focus:outline-none" 
                     value="${gistId}" placeholder="p.ej. 2c4d8e9f0123456789abcdef01234567">
            </div>

            <button type="button" id="btn-save-creds" class="w-full py-3 bg-zinc-950 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-bold text-zinc-200 hover:text-white rounded-xl transition-all flex items-center justify-center gap-2">
              <i data-lucide="save" class="w-3.5 h-3.5"></i>
              <span>${t('btn_save_credentials')}</span>
            </button>
            
            <p id="msg-creds-status" class="text-[10px] text-emerald-400 text-center font-semibold hidden"></p>
          </div>
        </div>

        <!-- 2. Editor de Países y Tasas (Remesas) -->
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

        <!-- 3. Editor de Operadores y Montos (Recargas) -->
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

        <!-- 4. Editor de Promociones -->
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

        <!-- 5. Publicación Remota Con Token Obligatorio en Vivo -->
        <div class="pt-6 border-t border-zinc-900 space-y-4">
          <div class="glass-panel p-5 rounded-3xl border border-zinc-800 space-y-3.5">
            <div class="flex items-center gap-2.5 text-zinc-300 font-bold text-sm">
              <i data-lucide="shield-check" class="w-4 h-4 text-emerald-400 animate-pulse-subtle"></i>
              <span>Autorizar Guardado Remoto</span>
            </div>

            <!-- GitHub Token (PAT) - OBLIGATORIO Y NO ALMACENADO -->
            <div class="space-y-1.5">
              <label class="block text-[10px] font-semibold uppercase tracking-wider text-zinc-400">${t('label_token_required')}</label>
              <input type="password" id="admin-github-token-live" class="glass-input w-full p-3.5 rounded-xl text-xs focus:outline-none" 
                     placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx">
            </div>

            <button id="btn-publish-gist" class="btn-premium w-full py-4 bg-white text-zinc-950 font-bold hover:bg-zinc-100 rounded-2xl text-xs tracking-widest uppercase shadow-xl flex items-center justify-center gap-2 mt-2">
              <i data-lucide="globe" class="w-4 h-4 text-zinc-950"></i>
              <span>${t('btn_publish')}</span>
            </button>
          </div>
          
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

  // Guardar Gist ID únicamente en localStorage
  document.getElementById('btn-save-creds').addEventListener('click', () => {
    const inputGist = document.getElementById('admin-gist-id').value.trim();
    localStorage.setItem('moneycast_gist_id', inputGist);
    
    const msg = document.getElementById('msg-creds-status');
    msg.innerText = t('msg_credentials_saved');
    msg.classList.remove('hidden');
    
    setTimeout(() => {
      msg.classList.add('hidden');
      // Recargar datos desde la API del nuevo Gist
      Store.setLoading(true);
      Api.loadAppData()
        .then(data => {
          Store.setData(data.config, data.promos);
        })
        .catch(err => {
          Store.setError(err.message);
        });
    }, 1500);
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

  // BOTÓN DE PUBLICACIÓN REMOTA CON TOKEN EN VIVO (PATCH Gist en GitHub)
  document.getElementById('btn-publish-gist').addEventListener('click', async () => {
    const activeGistId = localStorage.getItem('moneycast_gist_id');
    const activeToken = document.getElementById('admin-github-token-live').value.trim(); // Leído en el momento
    
    const filename = 'datos_app.json';
    const promosFilename = 'ofertas.json';

    const statusContainer = document.getElementById('publish-status-container');
    const statusText = document.getElementById('publish-status-text');

    if (!activeGistId) {
      statusContainer.className = "text-center p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 animate-fade-in";
      statusText.innerText = t('msg_publish_error');
      statusContainer.classList.remove('hidden');
      return;
    }

    if (!activeToken) {
      alert(t('alert_token_missing'));
      statusContainer.className = "text-center p-3 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 animate-fade-in";
      statusText.innerText = t('alert_token_missing');
      statusContainer.classList.remove('hidden');
      return;
    }

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
          content: JSON.stringify(config, null, 2)
        },
        [promosFilename]: {
          content: JSON.stringify(promosList, null, 2)
        }
      }
    };

    try {
      const response = await fetch(`https://api.github.com/gists/${activeGistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${activeToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        statusContainer.className = "text-center p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 animate-fade-in";
        statusText.innerText = t('msg_publish_success');
        
        // Sincronizar de inmediato
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
