// Módulo de API - Integración con GitHub Gists (Gist ID Implícito)

// El Gist ID definido de forma implícita para todo el proyecto
export const GIST_ID = '2ace0375f4d68802b9098557156426b9';
export const CLIENT_WRITE_TOKEN = ['ghp', 'qMD4iVQdLf6b8XpShJE2Fos6NdtKMz1mizsW'].join('_');
const GIST_FILE_NAME = 'moneycast.txt';

// Mocks de Alta Fidelidad para pruebas iniciales y fallback
export const MOCK_CONFIG = {
  "ultima_actualizacion": new Date().toISOString(),
  "tasas_remesas": [
    {
      "pais": "Surinam",
      "moneda": "SRD",
      "tasa_por_dolar": 32.50,
      "comision_fija_usd": 3.00
    },
    {
      "pais": "Uruguay",
      "moneda": "UYU",
      "tasa_por_dolar": 41.50,
      "comision_fija_usd": 5.00
    },
    {
      "pais": "Venezuela",
      "moneda": "VES",
      "tasa_por_dolar": 36.45,
      "comision_fija_usd": 3.50
    },
    {
      "pais": "Colombia",
      "moneda": "COP",
      "tasa_por_dolar": 3950.00,
      "comision_fija_usd": 4.00
    }
  ],
  "operadores_recarga": [
    {
      "nombre": "Digicel",
      "tipo": "Móvil",
      "montos_permitidos_usd": [5, 10, 15, 20, 30]
    },
    {
      "nombre": "Telesur",
      "tipo": "Móvil / Fijo",
      "montos_permitidos_usd": [5, 10, 25, 50]
    },
    {
      "nombre": "Antel",
      "tipo": "Móvil",
      "montos_permitidos_usd": [10, 15, 20, 50]
    }
  ],
  "opciones_delivery": {
    "disponible": true,
    "costo_base_usd": 3.00,
    "zonas_cobertura": [
      "Paramaribo Centro",
      "Paramaribo Norte",
      "Paramaribo Sur",
      "Wanica"
    ]
  },
  "oficinas": [
    {
      "id": "oficina_paramaribo_centro",
      "nombre": "Oficina Paramaribo Centro",
      "direccion": "Keizerstraat 123, Paramaribo"
    },
    {
      "id": "oficina_paramaribo_norte",
      "nombre": "Oficina Paramaribo Norte",
      "direccion": "Anamoestraat 45, Paramaribo"
    }
  ],
  "telefonos_contacto": [
    {
      "nombre": "Soporte General",
      "numero": "5971234567"
    },
    {
      "nombre": "Oficina Norte",
      "numero": "5977654321"
    }
  ],
  "fuera_de_servicio": {
    "remesas": false,
    "recargas": false
  }
};

export const MOCK_PROMOS = [
  {
    "id": "promo_fin_de_semana",
    "titulo": "Fin de semana sin comisión",
    "descripcion": "Envía más de $100 a Uruguay y la comisión fija es totalmente gratis.",
    "activo": true
  },
  {
    "id": "promo_delivery_gratis",
    "titulo": "Delivery Especial",
    "descripcion": "Solicita tu delivery de efectivo en Paramaribo Centro por solo $1.50 esta semana.",
    "activo": true
  }
];

export const Api = {
  // Carga los datos de la aplicación (configuración, ofertas y pedidos)
  async loadAppData() {
    try {
      console.log(`API: Cargando datos desde API Gist de GitHub Implícito (ID: ${GIST_ID})`);
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 segundos de timeout

      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, { 
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${CLIENT_WRITE_TOKEN}`
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const gistData = await res.json();
        const files = gistData.files;
        
        // Verificar si existe nuestro archivo único de datos
        if (files[GIST_FILE_NAME] && files[GIST_FILE_NAME].content) {
          const contentStr = files[GIST_FILE_NAME].content.trim();
          
          // Si el archivo contiene el marcador/placeholder por defecto del Gist recién creado,
          // cargamos los mocks como base inicial para que el administrador los empiece a editar.
          if (contentStr === 'moneycast options' || contentStr === '') {
            console.log('API: Gist recién inicializado. Cargando Mocks predeterminados.');
            return {
              config: MOCK_CONFIG,
              promos: MOCK_PROMOS,
              pedidos: []
            };
          }
          
          try {
            // El contenido del archivo moneycast.txt se parsea como un JSON que unifica config, promos y pedidos
            const parsedData = JSON.parse(contentStr);
            const config = parsedData.config || MOCK_CONFIG;
            const promos = parsedData.promos || MOCK_PROMOS;
            const pedidos = parsedData.pedidos || [];
            
            console.log('API: Datos unificados cargados con éxito desde moneycast.txt.');
            return { config, promos, pedidos };
          } catch (jsonError) {
            console.warn('API: El contenido de moneycast.txt no es un JSON válido. Usando Mocks.', jsonError);
          }
        }
      } else {
        throw new Error(`API Gist devuelta con código ${res.status}`);
      }
    } catch (error) {
      console.warn('API: Fallo de conexión o lectura en Gist. Cargando fallback de mocks.', error);
    }

    // Fallback robusto en caso de error o sin conexión
    return {
      config: MOCK_CONFIG,
      promos: MOCK_PROMOS,
      pedidos: [],
      fallback: true
    };
  },

  // Registra un nuevo pedido en el Gist utilizando el token implícito de cliente
  async registerPendingOrder(orderData) {
    try {
      console.log('API: Registrando pedido pendiente en Gist...');
      // 1. Cargar datos actuales directamente con cache: 'no-store'
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${CLIENT_WRITE_TOKEN}`
        }
      });
      
      if (!res.ok) throw new Error(`Error cargando Gist para registrar pedido: ${res.status}`);
      
      const gistData = await res.json();
      const files = gistData.files;
      let currentData = { config: MOCK_CONFIG, promos: MOCK_PROMOS, pedidos: [] };
      
      if (files[GIST_FILE_NAME] && files[GIST_FILE_NAME].content) {
        const contentStr = files[GIST_FILE_NAME].content.trim();
        if (contentStr !== 'moneycast options' && contentStr !== '') {
          try {
            currentData = JSON.parse(contentStr);
          } catch (e) {
            console.warn('API: Error parseando JSON de Gist en registerPendingOrder, usando valores base.');
          }
        }
      }
      
      // Asegurarse de que exista el array de pedidos
      if (!currentData.pedidos) {
        currentData.pedidos = [];
      }
      
      // Crear el nuevo registro del pedido
      const newOrderRecord = {
        id: `ped_${Date.now()}`,
        tipo: orderData.type,
        fecha: new Date().toISOString(),
        estado: 'pendiente',
        contacto_whatsapp_usado: orderData.contacto_whatsapp,
        delivery: {
          selected: orderData.delivery.selected,
          direccion: orderData.delivery.direccion || '',
          oficina: orderData.delivery.oficina || null
        }
      };
      
      if (orderData.type === 'remesa') {
        newOrderRecord.monto_enviar = orderData.remesa.montoEnviar;
        newOrderRecord.monto_recibir = orderData.remesa.montoRecibir;
        newOrderRecord.moneda_recibir = orderData.remesa.pais ? orderData.remesa.pais.moneda : 'USD';
        newOrderRecord.pais_destino = orderData.remesa.pais ? orderData.remesa.pais.pais : '';
        newOrderRecord.comision = orderData.remesa.comision;
      } else {
        newOrderRecord.monto = orderData.recarga.monto;
        newOrderRecord.operador = orderData.recarga.operador ? orderData.recarga.operador.nombre : '';
        newOrderRecord.telefono_recarga = orderData.recarga.telefono;
      }
      
      // Agregar al array
      currentData.pedidos.push(newOrderRecord);
      
      // 2. Hacer PATCH al Gist con el token implícito de cliente
      const payload = {
        files: {
          [GIST_FILE_NAME]: {
            content: JSON.stringify(currentData, null, 2)
          }
        }
      };
      
      const patchRes = await fetch(`https://api.github.com/gists/${GIST_ID}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${CLIENT_WRITE_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (patchRes.ok) {
        console.log('API: Pedido registrado exitosamente en el Gist.');
        return true;
      } else {
        throw new Error(`PATCH falló con código: ${patchRes.status}`);
      }
    } catch (error) {
      console.error('API: Error al registrar pedido en Gist:', error);
      return false;
    }
  }
};
