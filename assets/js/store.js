// Módulo de Estado Global (Store)

const state = {
  // Idioma activo (con detección automática y persistencia)
  language: localStorage.getItem('moneycast_lang') || 
            (['es', 'en', 'nl'].includes(navigator.language.split('-')[0]) ? navigator.language.split('-')[0] : 'es'),

  // Datos descargados del Gist
  config: null,
  promos: [],
  loading: true,
  error: null,

  // Estado de navegación
  currentView: 'home', // 'home', 'remesa', 'recarga', 'checkout'

  // Estado de la orden actual
  order: {
    type: null, // 'remesa' | 'recarga'
    
    // Para Remesas
    remesa: {
      pais: null, // Objeto de país seleccionado {pais, moneda, tasa_por_dolar, comision_fija_usd}
      montoRecibir: 0,
      montoEnviar: 0,
      comision: 0
    },

    // Para Recargas
    recarga: {
      operador: null, // Objeto de operador seleccionado
      monto: 0,
      telefono: ''
    },

    // Delivery de efectivo común
    delivery: {
      selected: false,
      direccion: '',
      coordenadas: null // {lat, lng} opcional
    }
  }
};

const listeners = [];

export const Store = {
  getState() {
    return state;
  },

  // Cambiar idioma de la aplicación
  setLanguage(lang) {
    if (['es', 'en', 'nl'].includes(lang)) {
      state.language = lang;
      localStorage.setItem('moneycast_lang', lang);
      this.notify();
    }
  },

  // Suscribirse a cambios en el estado
  subscribe(listener) {
    listeners.push(listener);
    return () => {
      const index = listeners.indexOf(listener);
      if (index > -1) listeners.splice(index, 1);
    };
  },

  // Notificar a todos los suscriptores
  notify() {
    listeners.forEach(listener => listener(state));
  },

  // Actualizar datos del Gist
  setData(config, promos) {
    state.config = config;
    state.promos = promos;
    state.loading = false;
    state.error = null;
    this.notify();
  },

  setError(error) {
    state.error = error;
    state.loading = false;
    this.notify();
  },

  setLoading(loading) {
    state.loading = loading;
    this.notify();
  },

  // Navegar a otra vista
  navigate(view) {
    state.currentView = view;
    // Si volvemos al home, no reiniciamos la orden necesariamente, para permitir correcciones.
    this.notify();
  },

  // Resetear la orden actual
  resetOrder() {
    state.order = {
      type: null,
      remesa: {
        pais: null,
        montoRecibir: 0,
        montoEnviar: 0,
        comision: 0
      },
      recarga: {
        operador: null,
        monto: 0,
        telefono: ''
      },
      delivery: {
        selected: false,
        direccion: '',
        coordenadas: null
      }
    };
    this.notify();
  },

  // Acciones de Remesa
  setRemesaPais(pais) {
    state.order.type = 'remesa';
    state.order.remesa.pais = pais;
    this.recalculateRemesa();
  },

  setRemesaMontoRecibir(monto) {
    state.order.type = 'remesa';
    state.order.remesa.montoRecibir = monto;
    
    if (state.order.remesa.pais) {
      // Calcular monto a enviar en USD
      // USD = (Monto en moneda local / Tasa por dólar) + comisión fija
      const tasa = state.order.remesa.pais.tasa_por_dolar;
      const comision = state.order.remesa.pais.comision_fija_usd;
      state.order.remesa.montoEnviar = Number(((monto / tasa) + comision).toFixed(2));
      state.order.remesa.comision = comision;
    }
    this.notify();
  },

  setRemesaMontoEnviar(monto) {
    state.order.type = 'remesa';
    state.order.remesa.montoEnviar = monto;

    if (state.order.remesa.pais) {
      // Calcular monto a recibir en moneda local
      // Local = (USD - comisión fija) * Tasa
      const tasa = state.order.remesa.pais.tasa_por_dolar;
      const comision = state.order.remesa.pais.comision_fija_usd;
      const netoUSD = Math.max(0, monto - comision);
      state.order.remesa.montoRecibir = Number((netoUSD * tasa).toFixed(2));
      state.order.remesa.comision = comision;
    }
    this.notify();
  },

  recalculateRemesa() {
    if (state.order.remesa.pais) {
      if (state.order.remesa.montoRecibir > 0) {
        this.setRemesaMontoRecibir(state.order.remesa.montoRecibir);
      } else if (state.order.remesa.montoEnviar > 0) {
        this.setRemesaMontoEnviar(state.order.remesa.montoEnviar);
      } else {
        // Valores por defecto si ambos son 0
        this.setRemesaMontoEnviar(100); 
      }
    }
  },

  // Acciones de Recarga
  setRecargaOperador(operador) {
    state.order.type = 'recarga';
    state.order.recarga.operador = operador;
    this.notify();
  },

  setRecargaMonto(monto) {
    state.order.recarga.monto = monto;
    this.notify();
  },

  setRecargaTelefono(tel) {
    state.order.recarga.telefono = tel;
    this.notify();
  },

  // Acciones de Delivery
  setDeliverySelected(selected) {
    state.order.delivery.selected = selected;
    this.notify();
  },

  setDeliveryDireccion(direccion) {
    state.order.delivery.direccion = direccion;
    this.notify();
  },

  setDeliveryCoordenadas(lat, lng) {
    state.order.delivery.coordenadas = { lat, lng };
    this.notify();
  },

  // Acciones Administrativas (Mutaciones locales del Estado)
  updateRemesaPais(index, field, value) {
    if (state.config && state.config.tasas_remesas[index]) {
      if (field === 'tasa_por_dolar' || field === 'comision_fija_usd') {
        state.config.tasas_remesas[index][field] = parseFloat(value) || 0;
      } else {
        state.config.tasas_remesas[index][field] = value;
      }
      this.recalculateRemesa();
      this.notify();
    }
  },

  addRemesaPais(paisObj) {
    if (!state.config) {
      state.config = { tasas_remesas: [], operadores_recarga: [], opciones_delivery: { disponible: true, costo_base_usd: 3.00 } };
    }
    state.config.tasas_remesas.push(paisObj);
    this.notify();
  },

  deleteRemesaPais(index) {
    if (state.config && state.config.tasas_remesas[index]) {
      state.config.tasas_remesas.splice(index, 1);
      // Ajustar selección de país si se elimina el actual
      if (state.order.remesa.pais && !state.config.tasas_remesas.find(p => p.pais === state.order.remesa.pais.pais)) {
        state.order.remesa.pais = state.config.tasas_remesas[0] || null;
      }
      this.recalculateRemesa();
      this.notify();
    }
  },

  updatePromo(index, field, value) {
    if (state.promos && state.promos[index]) {
      if (field === 'activo') {
        state.promos[index][field] = !!value;
      } else {
        state.promos[index][field] = value;
      }
      this.notify();
    }
  },

  addPromo(promoObj) {
    state.promos.push(promoObj);
    this.notify();
  },

  deletePromo(index) {
    if (state.promos && state.promos[index]) {
      state.promos.splice(index, 1);
      this.notify();
    }
  },

  // Acciones de Recargas Administrativas
  updateRecargaOperador(index, field, value) {
    if (state.config && state.config.operadores_recarga[index]) {
      if (field === 'montos_permitidos_usd') {
        // Convertir string separado por comas a array de números
        state.config.operadores_recarga[index][field] = value
          .split(',')
          .map(v => parseFloat(v.trim()))
          .filter(v => !isNaN(v));
      } else {
        state.config.operadores_recarga[index][field] = value;
      }
      this.notify();
    }
  },

  addRecargaOperador(operadorObj) {
    if (!state.config) {
      state.config = { tasas_remesas: [], operadores_recarga: [], opciones_delivery: { disponible: true, costo_base_usd: 3.00 } };
    }
    state.config.operadores_recarga.push(operadorObj);
    this.notify();
  },

  deleteRecargaOperador(index) {
    if (state.config && state.config.operadores_recarga[index]) {
      state.config.operadores_recarga.splice(index, 1);
      // Resetear orden de recarga si el operador actual desaparece
      if (state.order.recarga.operador && !state.config.operadores_recarga.find(o => o.nombre === state.order.recarga.operador.nombre)) {
        state.order.recarga.operador = state.config.operadores_recarga[0] || null;
      }
      this.notify();
    }
  }
};
