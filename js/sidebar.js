// Manages sidebar creation and highlights the active page in navigation
document.addEventListener("DOMContentLoaded", function () {
    const sidebarHTML = `
        <div class="bg-gray-800 text-white w-64 flex flex-col overflow-auto" style="height: 100vh;">
            <div class="p-4 bg-gray-900">
                <h2 class="text-xl font-bold">IoT Dashboard</h2>
            </div>
            <nav class="flex-grow">
                <ul class="mt-6 space-y-1">
                    <li id="home-item">
                        <a href="home.html" class="flex items-center px-4 py-3 hover:bg-gray-700 space-x-4 w-full">
                            <span class="w-5 text-center"><i class="fas fa-home"></i></span>
                            <span class="flex-1">Home</span>
                        </a>
                    </li>
                    <li id="kontrol-palang-item">
                        <a href="kontrol-palang.html" class="flex items-center px-4 py-3 hover:bg-gray-700 space-x-4 w-full">
                            <span class="w-5 text-center"><i class="fas fa-cogs"></i></span>
                            <span class="flex-1">Kontrol Palang</span>
                        </a>
                    </li>
                    <li id="log-akses-item">
                        <a href="log-akses.html" class="flex items-center px-4 py-3 hover:bg-gray-700 space-x-4 w-full">
                            <span class="w-5 text-center"><i class="fas fa-history"></i></span>
                            <span class="flex-1">Log Akses</span>
                        </a>
                    </li>
                    <li id="pengguna-item">
                        <a href="pengguna.html" class="flex items-center px-4 py-3 hover:bg-gray-700 space-x-4 w-full">
                            <span class="w-5 text-center"><i class="fas fa-users"></i></span>
                            <span class="flex-1">Pengguna</span>
                        </a>
                    </li>
                </ul>
            </nav>
            <div class="p-4 mt-auto bg-gray-900 text-sm space-y-1">
                <div><span>Broker:</span> <span id="broker-status" class="text-red-400">Disconnected</span></div>
                <div><span>Device:</span> <span id="device-status" class="text-red-400">Disconnected</span></div>
            </div>
        </div>
    `;

    const sidebarContainer = document.getElementById("sidebar-container");
    if (sidebarContainer) {
        sidebarContainer.innerHTML = sidebarHTML;
    }

    const currentPage = window.location.pathname.split("/").pop();
    const activeClass = 'bg-gray-600';

    const menuIds = {
        'home.html': 'home-item',
        'kontrol-palang.html': 'kontrol-palang-item',
        'log-akses.html': 'log-akses-item',
        'pengguna.html': 'pengguna-item',
    };

    const activeItem = menuIds[currentPage];
    if (activeItem) {
        document.querySelector(`#${activeItem} a`).classList.add(activeClass);
    }
});