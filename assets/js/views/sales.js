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
        
        const btnRefresh = document.getElementById('btn-refresh-location');
        if (btnRefresh) {
            btnRefresh.addEventListener('click', () => this.refreshLocation());
        }

        this.renderAvailableServices();
        this.updateCartUI();
    }

    static renderAvailableServices() {
        const services = Store.getServices();
        this.servicesListEl.innerHTML = '';
        
        if(services.length === 0) {
            this.servicesListEl.innerHTML = '<p class="text-slate-400 text-center py-8 text-sm">No hay servicios disponibles.</p>';
            return;
        }

        services.forEach(service => {
            let catIcon = 'help-circle';
            if (service.category === 'Recarga') catIcon = 'smartphone';
            else if (service.category === 'Remesa') catIcon = 'globe';

            const el = document.createElement('div');
            el.className = 'bg-white p-4.5 rounded-2xl shadow-premium-light border border-slate-100/60 flex justify-between items-center transition-all duration-200 hover:translate-y-[-2px]';
            el.innerHTML = `
                <div class="flex items-center gap-3.5">
                    <div class="w-11 h-11 rounded-full bg-red-50 border border-red-100/50 flex items-center justify-center text-primary">
                        <i data-lucide="${catIcon}" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <span class="text-[9px] font-black uppercase tracking-wider text-primary bg-red-50/60 border border-red-100/30 px-2 py-0.5 rounded-full">${service.category}</span>
                        <h4 class="font-extrabold text-slate-800 text-sm mt-1.5">${service.name}</h4>
                        <p class="text-primary font-black text-xs mt-0.5">$${parseFloat(service.price).toFixed(2)}</p>
                    </div>
                </div>
                <button class="btn-add-cart w-10 h-10 bg-primary hover:bg-primary-dark text-white rounded-full shadow transition active:scale-95 flex items-center justify-center border border-primary/10" data-id="${service.id}">
                    <i data-lucide="plus" class="w-4.5 h-4.5"></i>
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
                    
                    // Vibrant check mark animation feedback
                    const target = e.currentTarget;
                    target.classList.remove('bg-primary');
                    target.classList.add('bg-emerald-500');
                    target.innerHTML = '<i data-lucide="check" class="w-4.5 h-4.5 text-white"></i>';
                    lucide.createIcons();
                    setTimeout(() => {
                        target.classList.remove('bg-emerald-500');
                        target.classList.add('bg-primary');
                        target.innerHTML = '<i data-lucide="plus" class="w-4.5 h-4.5 text-white"></i>';
                        lucide.createIcons();
                    }, 600);
                }
            });
        });
    }

    static updateCartUI() {
        this.cartItemsEl.innerHTML = '';
        let total = 0;

        if (this.cart.length === 0) {
            this.cartItemsEl.innerHTML = '<li class="text-slate-400 italic text-center py-6 text-sm">Tu carrito está vacío</li>';
            this.cartTotalEl.innerText = '$0.00';
            this.btnCheckout.disabled = true;
            return;
        }

        this.btnCheckout.disabled = false;

        this.cart.forEach((item, index) => {
            total += parseFloat(item.price);
            const li = document.createElement('li');
            li.className = 'py-3.5 flex justify-between items-center border-b border-slate-100 last:border-b-0';
            li.innerHTML = `
                <div>
                    <span class="text-[9px] font-black uppercase tracking-wider text-primary bg-red-50 px-2 py-0.5 rounded-full">${item.category}</span>
                    <h5 class="font-extrabold text-slate-800 text-sm mt-1.5">${item.name}</h5>
                    <p class="text-primary font-black text-xs mt-0.5">$${parseFloat(item.price).toFixed(2)}</p>
                </div>
                <button class="text-xs font-black uppercase tracking-wider text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 p-2.5 rounded-xl border border-red-100/40 remove-from-cart transition" data-index="${index}">
                    Quitar
                </button>
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

        this.cartTotalEl.innerText = `$${total.toFixed(2)}`;
    }

    static handleDeliveryToggle(e) {
        const manualContainer = document.getElementById('manual-address-container');
        if (e.target.checked) {
            this.getGeolocation();
        } else {
            this.locationUrl = null;
            this.locationStatus.classList.add('hidden');
            manualContainer.classList.add('hidden');
            document.getElementById('manual-address').value = '';
        }
    }

    static getGeolocation(callback = null) {
        const manualContainer = document.getElementById('manual-address-container');
        const locationStatus = document.getElementById('location-status');
        const locationText = document.getElementById('location-text');
        
        locationStatus.classList.remove('hidden');
        locationText.innerHTML = '<i data-lucide="loader" class="w-4 h-4 animate-spin text-slate-500"></i> <span class="text-slate-600">Obteniendo ubicación...</span>';
        lucide.createIcons();
        
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const lat = position.coords.latitude;
                    const lng = position.coords.longitude;
                    SalesView.locationUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                    
                    locationText.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 text-primary"></i> <span class="text-primary font-bold">Ubicación obtenida exitosamente</span>';
                    lucide.createIcons();
                    
                    manualContainer.classList.add('hidden');
                    if (callback) callback();
                },
                (error) => {
                    console.error("Geolocation error:", error);
                    SalesView.locationUrl = null;
                    let errMsg = "No se pudo obtener ubicación automática.";
                    
                    if (error.code === error.PERMISSION_DENIED) {
                        errMsg = "Permiso de ubicación denegado por el navegador.";
                    } else if (error.code === error.POSITION_UNAVAILABLE) {
                        errMsg = "Ubicación no disponible en este dispositivo.";
                    } else if (error.code === error.TIMEOUT) {
                        errMsg = "Tiempo de espera agotado al obtener ubicación.";
                    }
                    
                    locationText.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 text-primary"></i> <span class="text-primary font-bold">${errMsg}</span>`;
                    lucide.createIcons();
                    
                    manualContainer.classList.remove('hidden');
                    if (callback) callback();
                },
                { enableHighAccuracy: false, timeout: 8000, maximumAge: 30000 }
            );
        } else {
            SalesView.locationUrl = null;
            locationText.innerHTML = '<i data-lucide="alert-circle" class="w-4 h-4 text-primary"></i> <span class="text-primary font-bold">Geolocalización no soportada en este navegador.</span>';
            lucide.createIcons();
            manualContainer.classList.remove('hidden');
            if (callback) callback();
        }
    }

    static refreshLocation() {
        const refreshBtn = document.getElementById('btn-refresh-location');
        if (refreshBtn) {
            const icon = refreshBtn.querySelector('i');
            if (icon) icon.classList.add('animate-spin');
        }
        
        this.getGeolocation(() => {
            if (refreshBtn) {
                const icon = refreshBtn.querySelector('i');
                if (icon) icon.classList.remove('animate-spin');
            }
        });
    }

    static handleCheckout() {
        if (this.cart.length === 0) return;
        
        let total = this.cart.reduce((sum, item) => sum + parseFloat(item.price), 0);
        const includeDelivery = this.toggleDelivery.checked;
        const manualAddress = document.getElementById('manual-address').value.trim();
        
        const deliveryInfo = this.locationUrl || manualAddress;
        
        const message = WhatsAppService.generateMessage(this.cart, total, includeDelivery, deliveryInfo);
        WhatsAppService.openWhatsApp(message);
        
        this.cart = [];
        this.updateCartUI();
        this.toggleDelivery.checked = false;
        this.locationUrl = null;
        this.locationStatus.classList.add('hidden');
        document.getElementById('manual-address-container').classList.add('hidden');
        document.getElementById('manual-address').value = '';
    }
}
window.SalesView = SalesView;
