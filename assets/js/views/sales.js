class SalesView {
    static cart = [];
    static locationUrl = null;

    static init() {
        this.servicesListEl = document.getElementById('sales-services-list');
        this.cartItemsEl = document.getElementById('cart-items');
        this.cartTotalEl = document.getElementById('cart-total');
        this.btnCheckout = document.getElementById('btn-checkout');
        this.toggleDelivery = document.getElementById('toggle-delivery');
        this.locationStatus = document.getElementById('location-status');

        this.toggleDelivery.addEventListener('change', (e) => this.handleDeliveryToggle(e));
        this.btnCheckout.addEventListener('click', () => this.handleCheckout());

        this.renderAvailableServices();
        this.updateCartUI();
    }

    static renderAvailableServices() {
        const services = Store.getServices();
        this.servicesListEl.innerHTML = '';
        
        if(services.length === 0) {
            this.servicesListEl.innerHTML = '<p class="text-gray-500 text-center py-8">No hay servicios disponibles.</p>';
            return;
        }

        services.forEach(service => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition-all hover:shadow-md';
            el.innerHTML = `
                <div>
                    <h4 class="font-bold text-gray-800">${service.name}</h4>
                    <p class="text-primary font-bold mt-1">$${parseFloat(service.price).toFixed(2)}</p>
                </div>
                <button class="btn-add-cart p-3 bg-primary text-white rounded-full shadow hover:bg-primary-dark transition active:scale-95" data-id="${service.id}">
                    <i data-lucide="plus" class="w-5 h-5"></i>
                </button>
            `;
            this.servicesListEl.appendChild(el);
        });

        lucide.createIcons();

        document.querySelectorAll('.btn-add-cart').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const service = Store.getServices().find(s => s.id === id);
                if(service) {
                    this.cart.push(service);
                    this.updateCartUI();
                    
                    // Simple animation feedback
                    const target = e.currentTarget;
                    target.classList.add('bg-gold');
                    target.innerHTML = '<i data-lucide="check" class="w-5 h-5 text-white"></i>';
                    lucide.createIcons();
                    setTimeout(() => {
                        target.classList.remove('bg-gold');
                        target.innerHTML = '<i data-lucide="plus" class="w-5 h-5"></i>';
                        lucide.createIcons();
                    }, 500);
                }
            });
        });
    }

    static updateCartUI() {
        this.cartItemsEl.innerHTML = '';
        let total = 0;

        if (this.cart.length === 0) {
            this.cartItemsEl.innerHTML = '<li class="text-gray-500 italic text-center py-2">Carrito vacío</li>';
            this.btnCheckout.disabled = true;
        } else {
            this.btnCheckout.disabled = false;
            this.cart.forEach((item, index) => {
                total += parseFloat(item.price);
                const li = document.createElement('li');
                li.className = 'flex justify-between items-center border-b border-gray-100 py-2';
                li.innerHTML = `
                    <span class="font-medium text-gray-700">${item.name}</span>
                    <div class="flex items-center gap-3">
                        <span class="font-bold text-gray-800">$${parseFloat(item.price).toFixed(2)}</span>
                        <button class="text-red-400 hover:text-red-600 bg-red-50 p-1 rounded remove-from-cart transition" data-index="${index}">
                            <i data-lucide="x" class="w-3 h-3"></i>
                        </button>
                    </div>
                `;
                this.cartItemsEl.appendChild(li);
            });
            
            lucide.createIcons();
            
            document.querySelectorAll('.remove-from-cart').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = e.currentTarget.getAttribute('data-index');
                    this.cart.splice(idx, 1);
                    this.updateCartUI();
                });
            });
        }

        this.cartTotalEl.innerText = `$${total.toFixed(2)}`;
    }

    static handleDeliveryToggle(e) {
        if (e.target.checked) {
            this.locationStatus.classList.remove('hidden');
            this.locationStatus.innerHTML = '<span class="text-gray-500 flex items-center justify-center gap-1"><i data-lucide="loader" class="w-4 h-4 animate-spin"></i> Obteniendo ubicación...</span>';
            lucide.createIcons();
            
            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const lat = position.coords.latitude;
                        const lng = position.coords.longitude;
                        this.locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                        this.locationStatus.innerHTML = '<span class="text-primary flex items-center justify-center gap-1 font-medium"><i data-lucide="check-circle" class="w-4 h-4"></i> Ubicación obtenida exitosamente</span>';
                        lucide.createIcons();
                    },
                    (error) => {
                        console.error(error);
                        let errMsg = "Error al obtener ubicación";
                        if (error.code === error.PERMISSION_DENIED) errMsg = "Permiso de ubicación denegado";
                        this.locationStatus.innerHTML = `<span class="text-red-500 text-xs text-center flex items-center justify-center gap-1 font-medium"><i data-lucide="alert-circle" class="w-4 h-4"></i> ${errMsg}</span>`;
                        lucide.createIcons();
                        e.target.checked = false; // Revert switch
                    },
                    { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
                );
            } else {
                alert("Geolocalización no soportada en este navegador.");
                e.target.checked = false;
                this.locationStatus.classList.add('hidden');
            }
        } else {
            this.locationUrl = null;
            this.locationStatus.classList.add('hidden');
        }
    }

    static handleCheckout() {
        if (this.cart.length === 0) return;
        
        let total = this.cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
        const includeDelivery = this.toggleDelivery.checked;
        
        const message = WhatsAppService.generateMessage(this.cart, total, includeDelivery, this.locationUrl);
        WhatsAppService.openWhatsApp(message);
        
        // Optional: clear cart after sending
        this.cart = [];
        this.updateCartUI();
        this.toggleDelivery.checked = false;
        this.locationUrl = null;
        this.locationStatus.classList.add('hidden');
    }
}
