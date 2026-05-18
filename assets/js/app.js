class App {
    static init() {
        this.registerServiceWorker();
        this.initNavigation();
        
        // Initialize views
        if(window.Store && window.CrudView && window.SalesView) {
            CrudView.init();
            SalesView.init();
        } else {
            console.error("Dependencies not loaded");
        }

        // Sync button (reloads data)
        document.getElementById('btn-sync').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            btn.classList.add('animate-spin');
            setTimeout(() => {
                btn.classList.remove('animate-spin');
                SalesView.renderAvailableServices();
                CrudView.renderList();
            }, 600);
        });
    }

    static registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(registration => {
                        console.log('SW registered: ', registration.scope);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed: ', registrationError);
                    });
            });
        }
    }

    static initNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        const views = document.querySelectorAll('.view-section');

        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetId = e.currentTarget.getAttribute('data-target');
                
                // Update UI for buttons
                navBtns.forEach(b => {
                    b.classList.remove('text-primary');
                    b.classList.add('text-gray-400');
                });
                e.currentTarget.classList.remove('text-gray-400');
                e.currentTarget.classList.add('text-primary');

                // Toggle views
                views.forEach(view => {
                    if (view.id === targetId) {
                        view.classList.remove('hidden');
                        view.classList.add('block');
                    } else {
                        view.classList.remove('block');
                        view.classList.add('hidden');
                    }
                });
            });
        });
    }
}

// Run app
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
