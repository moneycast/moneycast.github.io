class WhatsAppService {
    static PHONE_NUMBER = '5977479759';

    static generateMessage(cart, total, includeDelivery, locationUrl) {
        let text = `*💳 NUEVA ORDEN MONEYCAST*\n\n`;
        text += `*Detalle del Pedido:*\n`;
        
        cart.forEach(item => {
            text += `▪ ${item.name} - $${item.price.toFixed(2)}\n`;
        });
        
        text += `\n*Total a pagar:* $${total.toFixed(2)}\n`;
        
        if (includeDelivery) {
            text += `\n*📍 Solicitud de Delivery:*\n`;
            if (locationUrl) {
                text += `Ubicación: ${locationUrl}\n`;
            } else {
                text += `Ubicación: Pendiente de enviar por el cliente.\n`;
            }
        }

        return encodeURIComponent(text);
    }

    static openWhatsApp(text) {
        // Simple device detection
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        
        let url;
        if (isMobile) {
            // Mobile app deep link
            url = `https://api.whatsapp.com/send?phone=${this.PHONE_NUMBER}&text=${text}`;
        } else {
            // Desktop web link
            url = `https://web.whatsapp.com/send?phone=${this.PHONE_NUMBER}&text=${text}`;
        }
        
        window.open(url, '_blank');
    }
}
