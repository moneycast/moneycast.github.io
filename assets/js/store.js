const STORAGE_KEY = 'moneycast_services';

class Store {
    static getServices() {
        const data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            // Default services if empty
            const defaultServices = [
                { id: '1', name: 'Recarga Claro', category: 'Recarga', price: 5.00 },
                { id: '2', name: 'Recarga Movistar', category: 'Recarga', price: 5.00 },
                { id: '3', name: 'Remesa Internacional', category: 'Remesa', price: 50.00 }
            ];
            this.saveServices(defaultServices);
            return defaultServices;
        }
        return JSON.parse(data);
    }

    static saveServices(services) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(services));
    }

    static addService(service) {
        const services = this.getServices();
        service.id = Date.now().toString();
        services.push(service);
        this.saveServices(services);
        return service;
    }

    static updateService(updatedService) {
        const services = this.getServices();
        const index = services.findIndex(s => s.id === updatedService.id);
        if (index !== -1) {
            services[index] = updatedService;
            this.saveServices(services);
        }
    }

    static deleteService(id) {
        let services = this.getServices();
        services = services.filter(s => s.id !== id);
        this.saveServices(services);
    }
}
