// Store collection of users with access permissions
let authorizedUsers = [];

// Loads authorized users from JSON file and updates the UI
function loadAuthorizedUsers() {
    updateUserLoadStatus("Memuat daftar pengguna...", "loading");
    
    fetch('users.json')
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to load users data');
            }
            return response.json();
        })
        .then(data => {
            console.log("Loaded users data:", data);
            
            if (data && data.authorized_uids) {
                authorizedUsers = data.authorized_uids;
                
                displayAuthorizedUsers();
                
                updateUserLoadStatus("Berhasil memuat daftar pengguna", "success");
                
                window.authorizedUsers = authorizedUsers;
                console.log("Authorized UIDs set globally:", window.authorizedUsers);
            } else {
                throw new Error('Invalid users data format');
            }
        })
        .catch(error => {
            console.error('Error loading users:', error);
            
            updateUserLoadStatus("Gagal memuat daftar pengguna: " + error.message, "error");
            
            displayEmptyState();
        });
}

// Updates the status alert with appropriate styling based on message type
function updateUserLoadStatus(message, type) {
    const alertElement = document.getElementById("status-alert");
    if (!alertElement) return;
    
    const iconElement = alertElement.querySelector("i");
    const textElement = alertElement.querySelector("p");
    
    if (type === "loading") {
        alertElement.className = "bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6";
        iconElement.className = "fas fa-spinner fa-spin text-yellow-400";
        textElement.className = "text-sm text-yellow-700";
    } else if (type === "success") {
        alertElement.className = "bg-green-50 border-l-4 border-green-400 p-4 mb-6";
        iconElement.className = "fas fa-check-circle text-green-400";
        textElement.className = "text-sm text-green-700";
    } else if (type === "error") {
        alertElement.className = "bg-red-50 border-l-4 border-red-400 p-4 mb-6";
        iconElement.className = "fas fa-exclamation-circle text-red-400";
        textElement.className = "text-sm text-red-700";
    }
    
    textElement.textContent = message;
}

// Renders the authorized users table with the current user data
function displayAuthorizedUsers() {
    const userTable = document.getElementById("user-entries");
    const emptyState = document.getElementById("empty-state");
    
    if (!userTable) return;
    
    userTable.innerHTML = "";
    
    if (authorizedUsers && authorizedUsers.length > 0) {
        if (emptyState) {
            emptyState.classList.add("hidden");
        }
        
        authorizedUsers.forEach((uid, index) => {
            const row = document.createElement("tr");
            
            const numberCell = document.createElement("td");
            numberCell.className = "px-6 py-3 text-sm";
            numberCell.textContent = index + 1;
            
            const uidCell = document.createElement("td");
            uidCell.className = "px-6 py-3 text-sm font-medium";
            uidCell.textContent = uid;
            
            const statusCell = document.createElement("td");
            statusCell.className = "px-6 py-3 text-sm";
            statusCell.innerHTML = '<span class="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Aktif</span>';
            
            row.appendChild(numberCell);
            row.appendChild(uidCell);
            row.appendChild(statusCell);
            
            userTable.appendChild(row);
        });
    } else {
        displayEmptyState();
    }
}

// Shows empty state message when no users are available
function displayEmptyState() {
    const userTable = document.getElementById("user-entries");
    const emptyState = document.getElementById("empty-state");
    
    if (!userTable) return;
    
    userTable.innerHTML = "";
    
    if (emptyState) {
        emptyState.classList.remove("hidden");
    }
    
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    cell.className = "px-6 py-4 text-center text-gray-500";
    cell.textContent = "Tidak ada pengguna yang ditemukan";
    cell.colSpan = 3;
    row.appendChild(cell);
    userTable.appendChild(row);
}

// Initialize user management when DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
    console.log("Document ready, loading authorized users...");
    loadAuthorizedUsers();
});