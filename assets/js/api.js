// Módulo de API - Integración con GitHub Gists (Gist ID Implícito)

// El Gist ID definido de forma implícita para todo el proyecto
export const GIST_ID = '2ace0375f4d68802b9098557156426b9';
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
  // Carga los datos de la aplicación (configuración y ofertas unificadas)
  async loadAppData() {
    try {
      console.log(`API: Cargando datos desde API Gist de GitHub Implícito (ID: ${GIST_ID})`);
      const res = await fetch(`https://api.github.com/gists/${GIST_ID}`);
      
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
              promos: MOCK_PROMOS
            };
          }
          
          try {
            // El contenido del archivo moneycast.txt se parsea como un JSON que unifica config y promos
            const parsedData = JSON.parse(contentStr);
            const config = parsedData.config || MOCK_CONFIG;
            const promos = parsedData.promos || MOCK_PROMOS;
            
            console.log('API: Datos unificados cargados con éxito desde moneycast.txt.');
            return { config, promos };
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
      fallback: true
    };
  }
};
