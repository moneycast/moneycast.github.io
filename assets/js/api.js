// Módulo de API - Integración con GitHub Gists y Fallback de Mocks

// Configura aquí tus URLs RAW del Gist si ya las tienes creadas y quieres dejarlas fijas de fábrica
// Por ejemplo: 'https://raw.githubusercontent.com/usuario/gist-id/raw/datos_app.json'
const GIST_DATA_URL = ''; 
const GIST_PROMOS_URL = '';

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
  // Carga los datos de la aplicación (configuración y ofertas)
  async loadAppData() {
    const customGistId = localStorage.getItem('moneycast_gist_id');
    const customFilename = localStorage.getItem('moneycast_gist_filename') || 'datos_app.json';
    const customPromosFilename = localStorage.getItem('moneycast_gist_promos_filename') || 'ofertas.json';

    let dataUrl = GIST_DATA_URL;
    let promosUrl = GIST_PROMOS_URL;

    // Si hay un Gist ID configurado en LocalStorage, usamos la API pública de Gists de GitHub
    // Esto es genial porque evita la caché de 5 minutos del RAW CDN de GitHub y devuelve los datos actualizados instantáneamente.
    if (customGistId) {
      try {
        console.log(`API: Cargando datos desde API Gist de GitHub (ID: ${customGistId})`);
        const res = await fetch(`https://api.github.com/gists/${customGistId}`);
        if (res.ok) {
          const gistData = await res.json();
          const files = gistData.files;
          
          let config = MOCK_CONFIG;
          let promos = MOCK_PROMOS;
          
          if (files[customFilename] && files[customFilename].content) {
            config = JSON.parse(files[customFilename].content);
          }
          if (files[customPromosFilename] && files[customPromosFilename].content) {
            promos = JSON.parse(files[customPromosFilename].content);
          }
          
          console.log('API: Datos cargados correctamente desde el Gist.');
          return { config, promos };
        } else {
          throw new Error(`API Gist devuelta con código ${res.status}`);
        }
      } catch (error) {
        console.warn('API: Fallo al cargar desde Gist API personalizada, probando URLs RAW o Mocks.', error);
      }
    }

    // Si no hay URLs configuradas de fábrica, usamos mocks inmediatamente
    if (!dataUrl || !promosUrl) {
      console.log('API: Utilizando datos mock locales.');
      return {
        config: MOCK_CONFIG,
        promos: MOCK_PROMOS
      };
    }

    try {
      const [resConfig, resPromos] = await Promise.all([
        fetch(dataUrl),
        fetch(promosUrl)
      ]);

      if (!resConfig.ok || !resPromos.ok) {
        throw new Error('Error al conectar con los servidores de GitHub Gist.');
      }

      const config = await resConfig.json();
      const promos = await resPromos.json();

      return { config, promos };
    } catch (error) {
      console.warn('API: Fallo al cargar datos reales. Cargando fallback de mocks.', error);
      return {
        config: MOCK_CONFIG,
        promos: MOCK_PROMOS,
        fallback: true
      };
    }
  }
};
