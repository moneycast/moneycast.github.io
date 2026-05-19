// Entrada principal de la aplicación (SPA Entry Point)

import { Store } from './store.js';
import { Api } from './api.js';
import { t } from './i18n.js';

// Vistas
import { renderHome } from './views/home.js';
import { renderRemesa } from './views/remesa.js';
import { renderRecarga } from './views/recarga.js';
import { renderCheckout } from './views/checkout.js';
import { renderAdmin } from './views/admin.js';

// Variables de instalación PWA
let deferredPrompt;

// Comprobar la versión en el servidor para forzar actualizaciones de caché
async function checkServerVersion() {
  try {
    const res = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (res.ok) {
      const serverMeta = await res.json();
      const localVersion = localStorage.getItem('moneycast_version');
      
      if (localVersion && localVersion !== serverMeta.version) {
        console.log(`PWA: Nueva versión detectada en el servidor (${serverMeta.version}). Limpiando cachés...`);
        
        // 1. Borrar todas las bases de datos de Cache Storage
        if ('caches' in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        }
        
        // 2. Guardar la nueva versión en localStorage
        localStorage.setItem('moneycast_version', serverMeta.version);
        
        // 3. Forzar actualización del Service Worker si existe
        if ('serviceWorker' in navigator) {
          const reg = await navigator.serviceWorker.ready;
          if (reg) {
            await reg.update();
          }
        }
        
        // 4. Recargar limpiando la memoria del navegador
        window.location.reload();
      } else if (!localVersion) {
        localStorage.setItem('moneycast_version', serverMeta.version);
      }
    }
  } catch (err) {
    console.warn('PWA: Error comprobando versión en el servidor:', err);
  }
}

// 1. Inicialización de la Aplicación y Carga de Datos
async function initApp() {
  // Comprobar actualizaciones de código en el servidor
  await checkServerVersion();

  // Registrar Service Worker para PWA
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js')
        .then(reg => {
          console.log('PWA: Service Worker registrado exitosamente.', reg.scope);
          
          // Forzar comprobación de actualización del SW en el servidor
          reg.update();
          
          // Re-comprobar SW periódicamente cada 5 minutos
          setInterval(() => {
            console.log('PWA: Comprobando actualizaciones de Service Worker en el servidor...');
            reg.update();
            checkServerVersion();
          }, 5 * 60 * 1000);
          
          // 1. Si ya hay un Service Worker esperando en segundo plano
          if (reg.waiting) {
            showUpdateToast(reg.waiting);
          }

          // 2. Escuchar si se instala un nuevo Service Worker
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                showUpdateToast(newWorker);
              }
            });
          });
        })
        .catch(err => console.error('PWA: Fallo al registrar Service Worker.', err));
    });

    // 3. Forzar refresco inmediato cuando el Service Worker activado toma el control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }

  // Escuchar evento de instalación PWA
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('btn-install-pwa');
    if (installBtn) {
      installBtn.classList.remove('hidden');
    }
  });

  // Escuchar cuando la PWA se instala con éxito
  window.addEventListener('appinstalled', () => {
    const installBtn = document.getElementById('btn-install-pwa');
    if (installBtn) {
      installBtn.classList.add('hidden');
    }
    deferredPrompt = null;
    console.log('PWA: Aplicación instalada correctamente.');
  });

  // Configurar botón de instalación
  document.getElementById('btn-install-pwa').addEventListener('click', async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`PWA: Selección del usuario para instalación: ${outcome}`);
      deferredPrompt = null;
      document.getElementById('btn-install-pwa').classList.add('hidden');
    }
  });

  // Cargar datos desde Gist / Mocks
  Store.setLoading(true);
  try {
    const data = await Api.loadAppData();
    Store.setData(data.config, data.promos);
  } catch (error) {
    Store.setError(error.message);
  }

  // Suscribirse a cambios en el estado para re-renderizar
  Store.subscribe(renderApp);

  // Renderizado Inicial
  renderApp(Store.getState());
  setupGlobalNavigation();
}

// 2. Enrutador y renderizador central de la SPA
function renderApp(state) {
  const container = document.getElementById('app');
  if (!container) return;

  // Actualizar selector de idiomas y textos fijos del marco
  updateLanguageSelector(state.language);
  
  const spanHome = document.querySelector('#nav-home span');
  const spanRemesa = document.querySelector('#nav-remesa span');
  const spanRecarga = document.querySelector('#nav-recarga span');
  const installBtn = document.getElementById('btn-install-pwa');

  if (spanHome) spanHome.innerText = t('nav_home');
  if (spanRemesa) spanRemesa.innerText = t('nav_remesa');
  if (spanRecarga) spanRecarga.innerText = t('nav_recarga');
  if (installBtn) installBtn.innerText = t('btn_install');

  // Manejo de Estados Globales (Carga, Errores)
  if (state.loading) {
    container.innerHTML = `
      <div class="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div class="w-8 h-8 border-2 border-white/10 border-t-white rounded-full animate-spin"></div>
        <p class="text-xs text-zinc-500 tracking-wider uppercase font-semibold">${t('loading_data')}</p>
      </div>
    `;
    return;
  }

  if (state.error) {
    container.innerHTML = `
      <div class="max-w-xs mx-auto text-center py-20 px-4 animate-fade-in">
        <div class="p-4 bg-red-500/10 text-red-400 rounded-3xl inline-block mb-4 border border-red-500/20">
          <i data-lucide="alert-circle" class="w-8 h-8"></i>
        </div>
        <h3 class="text-base font-bold text-white mb-2">${t('error_connection')}</h3>
        <p class="text-xs text-zinc-400 leading-relaxed mb-6">${state.error}</p>
        <button id="btn-retry-api" class="px-5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-semibold text-white rounded-xl transition-all">
          ${t('btn_retry')}
        </button>
      </div>
    `;
    document.getElementById('btn-retry-api').addEventListener('click', initApp);
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  // Renderizar la vista correspondiente
  switch (state.currentView) {
    case 'home':
      renderHome(container, state);
      break;
    case 'remesa':
      renderRemesa(container, state);
      break;
    case 'recarga':
      renderRecarga(container, state);
      break;
    case 'checkout':
      renderCheckout(container, state);
      break;
    case 'admin':
      renderAdmin(container, state);
      break;
    default:
      renderHome(container, state);
  }

  // Actualizar el estado visual de la barra de navegación inferior
  updateBottomNavBar(state.currentView);
}

// 3. Controladores de la barra de navegación global
function setupGlobalNavigation() {
  const btnHome = document.getElementById('nav-home');
  const btnRemesa = document.getElementById('nav-remesa');
  const btnRecarga = document.getElementById('nav-recarga');
  const btnAdmin = document.getElementById('btn-admin-settings');

  btnHome.addEventListener('click', () => {
    Store.navigate('home');
  });

  btnRemesa.addEventListener('click', () => {
    Store.resetOrder();
    Store.navigate('remesa');
  });

  btnRecarga.addEventListener('click', () => {
    Store.resetOrder();
    Store.navigate('recarga');
  });

  if (btnAdmin) {
    btnAdmin.addEventListener('click', () => {
      Store.navigate('admin');
    });
  }

  // Botones del Selector de Idioma
  const langSelector = document.getElementById('lang-selector');
  if (langSelector) {
    langSelector.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang');
        Store.setLanguage(lang);
      });
    });
  }
}

function updateBottomNavBar(currentView) {
  const btnHome = document.getElementById('nav-home');
  const btnRemesa = document.getElementById('nav-remesa');
  const btnRecarga = document.getElementById('nav-recarga');

  const navs = [
    { view: 'home', el: btnHome },
    { view: 'remesa', el: btnRemesa },
    { view: 'recarga', el: btnRecarga }
  ];

  navs.forEach(nav => {
    if (nav.view === currentView || (currentView === 'checkout' && nav.view === Store.getState().order.type)) {
      nav.el.classList.add('active-nav-item', 'text-white');
      nav.el.classList.remove('text-zinc-500');
    } else {
      nav.el.classList.remove('active-nav-item', 'text-white');
      nav.el.classList.add('text-zinc-500');
    }
  });
}

function updateLanguageSelector(lang) {
  const langSelector = document.getElementById('lang-selector');
  if (!langSelector) return;

  langSelector.querySelectorAll('button').forEach(btn => {
    const btnLang = btn.getAttribute('data-lang');
    if (btnLang === lang) {
      btn.className = "text-[9px] font-extrabold px-2 py-1 rounded-md transition-all bg-zinc-800 text-white";
    } else {
      btn.className = "text-[9px] font-extrabold px-2 py-1 rounded-md transition-all text-zinc-500 hover:text-zinc-200";
    }
  });
}

// Inicializar la aplicación de manera robusta (evitando fallos por eventos ya disparados en módulos ESM)
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}

// Renderiza un banner premium cuando hay una actualización de PWA lista
function showUpdateToast(worker) {
  if (document.getElementById('pwa-update-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'pwa-update-toast';
  toast.className = 'fixed bottom-24 left-4 right-4 md:left-auto md:right-6 md:w-80 bg-zinc-950/95 border border-zinc-800 p-4 rounded-2xl shadow-2xl flex items-center justify-between gap-4 z-50 animate-fade-in backdrop-blur-md';
  
  toast.innerHTML = `
    <div class="flex items-center gap-3">
      <div class="p-2.5 bg-white/5 border border-white/10 rounded-xl text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
      </div>
      <div class="space-y-0.5">
        <p class="text-xs font-bold text-white">${t('pwa_update_title')}</p>
        <p class="text-[10px] text-zinc-400 leading-tight">${t('pwa_update_desc')}</p>
      </div>
    </div>
    <button id="btn-pwa-update-toast" class="bg-white hover:bg-zinc-100 text-zinc-950 font-extrabold px-3 py-2 rounded-xl text-[9px] uppercase tracking-wider transition-all whitespace-nowrap">
      ${t('btn_pwa_update')}
    </button>
  `;

  document.body.appendChild(toast);

  document.getElementById('btn-pwa-update-toast').addEventListener('click', () => {
    worker.postMessage({ type: 'SKIP_WAITING' });
    toast.remove();
  });
}
