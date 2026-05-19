// Módulo de WhatsApp - Generador de mensajes y enlaces directos en el idioma activo

import { Store } from './store.js';

// Cambia aquí el número de teléfono de tu negocio (incluyendo código de país sin el signo '+')
// Por ejemplo: '5978888888' para Surinam, '59899000000' para Uruguay, etc.
const WHATSAPP_PHONE = '5971234567'; 

const templates = {
  es: {
    remesa: {
      intro: "👋 *¡Hola! Me gustaría iniciar una orden de Remesa:*",
      details: "💵 *Detalles de la Transacción:*",
      country: "• *País Destino:*",
      receives: "• *Recibe:*",
      sends: "• *Envía (Neto):*",
      fee: "• *Comisión Fija:*",
      delivery_method: "⚡ *Método de Entrega:*",
      delivery_yes: "🚚 *Delivery de Efectivo:* Sí\n📍 *Dirección:*",
      delivery_no: "🏢 *Retiro en Oficina / Digital*",
      total: "📊 *Total a Pagar:*",
      footer: "*(Creado a través de la PWA de Moneycast)*"
    },
    recarga: {
      intro: "👋 *¡Hola! Me gustaría realizar una Recarga de Saldo:*",
      details: "📱 *Detalles del Servicio:*",
      operator: "• *Operador:*",
      amount: "• *Monto de Recarga:*",
      phone: "• *Número de Teléfono:*",
      payment_method: "⚡ *Método de Pago:*",
      delivery_yes: "🚚 *Delivery para cobro en efectivo:* Sí\n📍 *Dirección:*",
      delivery_no: "🏢 *Pago Digital / Transferencia*",
      total: "📊 *Total a Pagar:*",
      footer: "*(Creado a través de la PWA de Moneycast)*"
    }
  },
  en: {
    remesa: {
      intro: "👋 *Hello! I would like to start a Remittance order:*",
      details: "💵 *Transaction Details:*",
      country: "• *Destination Country:*",
      receives: "• *Recipient Receives:*",
      sends: "• *Send Amount (Net):*",
      fee: "• *Fixed Fee:*",
      delivery_method: "⚡ *Delivery Method:*",
      delivery_yes: "🚚 *Cash Delivery:* Yes\n📍 *Address:*",
      delivery_no: "🏢 *Office Pickup / Digital*",
      total: "📊 *Total to Pay:*",
      footer: "*(Created via Moneycast PWA)*"
    },
    recarga: {
      intro: "👋 *Hello! I would like to make a Mobile Top-up:*",
      details: "📱 *Service Details:*",
      operator: "• *Operator:*",
      amount: "• *Top-up Amount:*",
      phone: "• *Phone Number:*",
      payment_method: "⚡ *Payment Method:*",
      delivery_yes: "🚚 *Cash collection delivery:* Yes\n📍 *Address:*",
      delivery_no: "🏢 *Digital Payment / Transfer*",
      total: "📊 *Total to Pay:*",
      footer: "*(Created via Moneycast PWA)*"
    }
  },
  nl: {
    remesa: {
      intro: "👋 *Hallo! Ik wil graag een Geldoverboeking starten:*",
      details: "💵 *Transactie Details:*",
      country: "• *Land van Bestemming:*",
      receives: "• *Ontvanger Ontvangt:*",
      sends: "• *Verzendbedrag (Netto):*",
      fee: "• *Vaste Kosten:*",
      delivery_method: "⚡ *Leveringsmethode:*",
      delivery_yes: "🚚 *Contante Levering:* Ja\n📍 *Adres:*",
      delivery_no: "🏢 *Ophalen op Kantoor / Digitaal*",
      total: "📊 *Totaal te Betalen:*",
      footer: "*(Gemaakt via Moneycast PWA)*"
    },
    recarga: {
      intro: "👋 *Hallo! Ik wil graag mobiel Beltegoed Opwaarderen:*",
      details: "📱 *Dienst Details:*",
      operator: "• *Operator:*",
      amount: "• *Opwaardeerbedrag:*",
      phone: "• *Telefoonnummer:*",
      payment_method: "⚡ *Betalingsmethode:*",
      delivery_yes: "🚚 *Contant geld ophalen levering:* Ja\n📍 *Adres:*",
      delivery_no: "🏢 *Digitale Betaling / Overboeking*",
      total: "📊 *Totaal te Betalen:*",
      footer: "*(Gemaakt via Moneycast PWA)*"
    }
  }
};

export const WhatsApp = {
  generateOrderLink(order) {
    const lang = Store.getState().language || 'es';
    const t = templates[lang] || templates['es'];
    const config = Store.getState().config;
    let message = '';
    
    // Obtener número de WhatsApp dinámico
    let whatsappPhone = order.contacto_whatsapp;
    if (!whatsappPhone) {
      const contacts = config ? config.telefonos_contacto || [] : [];
      whatsappPhone = contacts.length > 0 ? contacts[0].numero : WHATSAPP_PHONE;
    }
    
    if (order.type === 'remesa') {
      const r = order.remesa;
      
      let deliveryText = '';
      if (order.delivery.selected) {
        deliveryText = `${t.remesa.delivery_yes} ${order.delivery.direccion}`;
      } else if (order.delivery.oficina) {
        const offices = config ? config.oficinas || [] : [];
        const office = offices.find(o => o.id === order.delivery.oficina);
        const officeDetails = office ? `${office.nombre} - ${office.direccion}` : order.delivery.oficina;
        deliveryText = `🏢 *Retiro en Oficina:* ${officeDetails}`;
      } else {
        deliveryText = t.remesa.delivery_no;
      }
      
      const totalUSD = r.montoEnviar + (order.delivery.selected ? (config?.opciones_delivery?.costo_base_usd || 3.00) : 0.00); 

      message = `${t.remesa.intro}

${t.remesa.details}
${t.remesa.country} ${r.pais.pais}
${t.remesa.receives} ${r.montoRecibir.toLocaleString()} ${r.pais.moneda}
${t.remesa.sends} $${r.montoEnviar.toFixed(2)} USD
${t.remesa.fee} $${r.comision.toFixed(2)} USD

${t.remesa.delivery_method}
${deliveryText}

${t.remesa.total}
👉 *$${totalUSD.toFixed(2)} USD*

${t.remesa.footer}`;

    } else if (order.type === 'recarga') {
      const r = order.recarga;
      
      let deliveryText = '';
      if (order.delivery.selected) {
        deliveryText = `${t.recarga.delivery_yes} ${order.delivery.direccion}`;
      } else if (order.delivery.oficina) {
        const offices = config ? config.oficinas || [] : [];
        const office = offices.find(o => o.id === order.delivery.oficina);
        const officeDetails = office ? `${office.nombre} - ${office.direccion}` : order.delivery.oficina;
        deliveryText = `🏢 *Retiro en Oficina:* ${officeDetails}`;
      } else {
        deliveryText = t.recarga.delivery_no;
      }

      const totalUSD = r.monto + (order.delivery.selected ? (config?.opciones_delivery?.costo_base_usd || 3.00) : 0.00);

      message = `${t.recarga.intro}

${t.recarga.details}
${t.recarga.operator} ${r.operador.nombre}
${t.recarga.amount} $${r.monto.toFixed(2)} USD
${t.recarga.phone} ${r.telefono}

${t.recarga.payment_method}
${deliveryText}

${t.recarga.total}
👉 *$${totalUSD.toFixed(2)} USD*

${t.recarga.footer}`;
    }

    const encodedText = encodeURIComponent(message);
    return `https://wa.me/${whatsappPhone}?text=${encodedText}`;
  },

  sendOrder(order) {
    const link = this.generateOrderLink(order);
    window.open(link, '_blank');
  }
};
