class CrudView {
    static init() {
        this.listEl = document.getElementById('crud-services-list');
        this.formEl = document.getElementById('form-service');
        this.modalEl = document.getElementById('modal-service');
        this.modalContentEl = document.getElementById('modal-content');
        
        document.getElementById('btn-add-service').addEventListener('click', () => this.openModal());
        document.getElementById('btn-close-modal').addEventListener('click', () => this.closeModal());
        document.getElementById('btn-cancel-modal').addEventListener('click', () => this.closeModal());
        
        this.formEl.addEventListener('submit', (e) => this.handleSubmit(e));
        
        this.renderList();
    }

    static renderList() {
        const services = Store.getServices();
        this.listEl.innerHTML = '';
        
        if(services.length === 0) {
            this.listEl.innerHTML = '<p class="text-gray-500 text-center py-8">No hay servicios registrados.</p>';
            return;
        }

        services.forEach(service => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center transition-all hover:shadow-md';
            el.innerHTML = `
                <div>
                    <span class="text-[10px] font-bold text-primary uppercase tracking-widest bg-green-50 px-2 py-1 rounded-full">${service.category}</span>
                    <h4 class="font-bold text-gray-800 text-lg mt-1">${service.name}</h4>
                    <p class="text-gold-dark font-bold">$${parseFloat(service.price).toFixed(2)}</p>
                </div>
                <div class="flex gap-2">
                    <button class="btn-edit p-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-200 transition" data-id="${service.id}">
                        <i data-lucide="edit-2" class="w-4 h-4"></i>
                    </button>
                    <button class="btn-delete p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition" data-id="${service.id}">
                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                    </button>
                </div>
            `;
            this.listEl.appendChild(el);
        });

        lucide.createIcons();

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                this.editService(id);
            });
        });
        
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                if(confirm('¿Seguro que deseas eliminar este servicio?')) {
                    Store.deleteService(id);
                    this.renderList();
                    if(window.SalesView) window.SalesView.renderAvailableServices();
                }
            });
        });
    }

    static openModal(service = null) {
        document.getElementById('modal-title').innerText = service ? 'Editar Servicio' : 'Nuevo Servicio';
        
        if (service) {
            document.getElementById('service-id').value = service.id;
            document.getElementById('service-name').value = service.name;
            document.getElementById('service-category').value = service.category;
            document.getElementById('service-price').value = service.price;
        } else {
            this.formEl.reset();
            document.getElementById('service-id').value = '';
        }

        this.modalEl.classList.remove('hidden');
        setTimeout(() => {
            this.modalContentEl.classList.remove('scale-95', 'opacity-0');
            this.modalContentEl.classList.add('scale-100', 'opacity-100');
        }, 10);
    }

    static closeModal() {
        this.modalContentEl.classList.remove('scale-100', 'opacity-100');
        this.modalContentEl.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            this.modalEl.classList.add('hidden');
        }, 300);
    }

    static handleSubmit(e) {
        e.preventDefault();
        
        const id = document.getElementById('service-id').value;
        const name = document.getElementById('service-name').value;
        const category = document.getElementById('service-category').value;
        const price = parseFloat(document.getElementById('service-price').value);

        const serviceData = { id, name, category, price };

        if (id) {
            Store.updateService(serviceData);
        } else {
            Store.addService(serviceData);
        }

        this.renderList();
        if(window.SalesView) window.SalesView.renderAvailableServices();
        this.closeModal();
    }

    static editService(id) {
        const services = Store.getServices();
        const service = services.find(s => s.id === id);
        if (service) {
            this.openModal(service);
        }
    }
}
