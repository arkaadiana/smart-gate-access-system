// Updates button appearance based on active state
function updateButtonState(button, isActive) {
    if (!button) return;
    
    if (isActive) {
        button.disabled = true;
        button.classList.add('opacity-50', 'cursor-not-allowed');
    } else {
        button.disabled = false;
        button.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// Disables buttons and shows feedback during cooldown period
function showCooldownFeedback() {
    const btnOn = document.getElementById("btnOn");
    const btnOff = document.getElementById("btnOff");
    
    updateButtonState(btnOn, true);
    updateButtonState(btnOff, true);
    
    const cooldownElement = document.getElementById("cooldown-timer");
    if (cooldownElement) {
        startCooldownTimer(buttonCooldown); 
    }
}

// Displays and manages countdown timer during button cooldown
function startCooldownTimer(cooldownTime) {
    const cooldownElement = document.getElementById("cooldown-timer");
    if (!cooldownElement) return;
    
    let timeLeft = Math.ceil(cooldownTime / 1000);
    
    cooldownElement.classList.remove("hidden");
    cooldownElement.textContent = `Mohon tunggu ${timeLeft} detik...`;
    
    const timerInterval = setInterval(() => {
        timeLeft--;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            cooldownElement.classList.add("hidden");
        } else {
            cooldownElement.textContent = `Mohon tunggu ${timeLeft} detik...`;
        }
    }, 1000);
    
    setTimeout(() => {
        const btnOn = document.getElementById("btnOn");
        const btnOff = document.getElementById("btnOff");
        updateButtonState(btnOn, false);
        updateButtonState(btnOff, false);
    }, cooldownTime);
}

// Updates the UI elements when changing between auto and manual modes
function updateModeUI(auto) {
    isAutoMode = auto;
    
    const modeToggle = document.getElementById("modeToggle");
    const modeLabel = document.getElementById("modeLabel");
    if (modeToggle && modeLabel) {
        modeToggle.checked = isAutoMode;
        modeLabel.textContent = isAutoMode ? "Auto" : "Manual";
    }
    
    updateDistanceDisplay();
}

// Updates distance sensor readings display based on current operating mode
function updateDistanceDisplay() {
    const distanceElement = document.getElementById("distance-reading");
    if (!distanceElement) return;
    
    if (isAutoMode) {
        distanceElement.textContent = `${currentDistance} cm / ${currentThreshold} cm`;
        
        let percentage = 0;
        if (currentDistance <= currentThreshold * 2) {
            percentage = Math.max(0, 100 - (currentDistance / (currentThreshold * 2) * 100));
        }
        
        const progressElement = document.getElementById("distance-progress");
        if (progressElement) {
            progressElement.style.width = `${percentage}%`;
            
            if (currentDistance < currentThreshold) {
                progressElement.className = "bg-red-500 h-2 rounded transition-all";
            } else {
                progressElement.className = "bg-teal-500 h-2 rounded transition-all";
            }
        }
    } else {
        distanceElement.textContent = "Mode Manual";
        
        const progressElement = document.getElementById("distance-progress");
        if (progressElement) {
            progressElement.style.width = "0%";
            progressElement.className = "bg-gray-400 h-2 rounded transition-all";
        }
    }
}

// Updates broker connection status indicators in the UI
function updateConnectionStatus(status, isConnected) {
    const statusElement = document.getElementById("broker-status");
    if (statusElement) {
        statusElement.textContent = status;
        statusElement.className = isConnected ? "text-green-400" : "text-red-400";
    }
    
    const connectionStatusElement = document.getElementById("connection-status");
    if (connectionStatusElement) {
        connectionStatusElement.textContent = isConnected ? "Terhubung" : "Terputus";
        const parentCard = connectionStatusElement.closest("div.border-l-4");
        if (parentCard) {
            parentCard.className = parentCard.className.replace(/border-\w+-500/g, 
                isConnected ? "border-green-500" : "border-red-500");
        }
    }
}

// Updates device connection indicators throughout the UI
function updateDeviceStatus(isConnected) {
    deviceConnected = isConnected;
    
    const statusElement = document.getElementById("device-status");
    if (statusElement) {
        statusElement.textContent = isConnected ? "Terhubung" : "Tidak Terhubung";
        statusElement.className = isConnected ? "text-green-500" : "text-red-500";
    }
    
    const gateStatusElement = document.getElementById("gate-status");
    if (gateStatusElement) {
        gateStatusElement.textContent = isConnected ? "Perangkat Terhubung" : "Perangkat Offline";
        
        const gateIcon = gateStatusElement.parentElement.parentElement.querySelector("i");
        if (gateIcon) {
            gateIcon.className = isConnected ? "fas fa-door-open" : "fas fa-door-closed";
        }
    }
    
    if (!isConnected) {
        updateServoStatus("Tidak Diketahui");
    }
    
    updateStatusAlert(isConnected);
}

// Updates the status alert banner based on connection state
function updateStatusAlert(isConnected) {
    const alertElement = document.getElementById("status-alert");
    if (!alertElement) return;
    
    const iconElement = alertElement.querySelector("i");
    const textElement = alertElement.querySelector("p");
    
    if (isConnected) {
        alertElement.className = "bg-green-50 border-l-4 border-green-400 p-4 mb-6";
        iconElement.className = "fas fa-check-circle text-green-400";
        textElement.className = "text-sm text-green-700";
        textElement.textContent = "Perangkat IoT terhubung dan siap digunakan.";
    } else {
        alertElement.className = "bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6";
        iconElement.className = "fas fa-exclamation-triangle text-yellow-400";
        textElement.className = "text-sm text-yellow-700";
        textElement.textContent = "Menunggu koneksi dari perangkat IoT. Pastikan perangkat Anda menyala dan terhubung ke jaringan.";
    }
}

// Updates servo/gate status indicators in different UI components
function updateServoStatus(status) {
    const statusElement = document.getElementById("servo-status");
    if (statusElement) {
        statusElement.textContent = status;
    }
    
    const gateStatusElement = document.getElementById("gate-status");
    if (gateStatusElement && deviceConnected) {
        const gateIcon = gateStatusElement.parentElement.parentElement.querySelector("i");
        if (gateIcon) {
            gateIcon.className = (status === "Terbuka") ? "fas fa-door-open" : "fas fa-door-closed";
        }
        
        gateStatusElement.textContent = (status === "Terbuka") ? "Terbuka" : "Tertutup";
    }
}

// Sends threshold configuration to the device via MQTT
function sendThreshold() {
    const thresholdInput = document.getElementById("distance-threshold");
    if (!thresholdInput) return;
    
    const threshold = thresholdInput.value;
    if (threshold && !isNaN(threshold) && threshold > 0) {
        if (!mqtt || !mqtt.isConnected()) {
            alert("Tidak terhubung ke broker MQTT. Mohon tunggu koneksi atau refresh halaman.");
            return;
        }
        
        const message = new Paho.MQTT.Message(threshold.toString());
        message.destinationName = distanceTopic;
        mqtt.send(message);
        logActivity("Send", `Sent threshold '${threshold}' to topic '${distanceTopic}'`);
        
        currentThreshold = parseInt(threshold);
        updateDistanceReading(currentDistance, currentThreshold);
    } else {
        alert("Mohon masukkan nilai jarak yang valid (lebih dari 0).");
    }
}

// Updates access log table with the latest access events
function updateAccessLogTable() {
    const logTable = document.getElementById("log-entries");
    if (!logTable) return;
    
    logTable.innerHTML = "";
    
    if (rfidAccessLogs.length > 0) {
        rfidAccessLogs.forEach(log => {
            const row = document.createElement("tr");
            
            const uidCell = document.createElement("td");
            uidCell.className = "px-6 py-3 text-sm";
            uidCell.textContent = log.uid;
            
            const timestampCell = document.createElement("td");
            timestampCell.className = "px-6 py-3 text-sm";
            timestampCell.textContent = log.timestamp;
            
            const statusCell = document.createElement("td");
            statusCell.className = "px-6 py-3 text-sm";
            
            if (log.status === "Granted") {
                statusCell.className += " text-green-600";
                statusCell.innerHTML = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">Diterima</span>';
            } else if (log.status === "Denied") {
                statusCell.className += " text-red-600";
                statusCell.innerHTML = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">Ditolak</span>';
            } else {
                statusCell.className += " text-yellow-600";
                statusCell.innerHTML = '<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">Menunggu</span>';
            }
            
            row.appendChild(uidCell);
            row.appendChild(timestampCell);
            row.appendChild(statusCell);
            
            logTable.appendChild(row);
        });
        
        const emptyState = document.getElementById("empty-state");
        if (emptyState) emptyState.classList.add("hidden");
        
    } else {
        const emptyState = document.getElementById("empty-state");
        if (emptyState) emptyState.classList.remove("hidden");
        
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "px-6 py-4 text-center text-gray-500";
        cell.textContent = "Belum ada log akses";
        cell.colSpan = 3;
        row.appendChild(cell);
        logTable.appendChild(row);
    }
}

// Updates activity log display in the dashboard
function updateActivityLog() {
    const activityLog = document.getElementById("activity-log");
    if (!activityLog) return;
    
    activityLog.innerHTML = "";
    
    if (lastActivity.length > 0) {
        lastActivity.forEach(activity => {
            const row = document.createElement("tr");
            
            const timeCell = document.createElement("td");
            timeCell.className = "px-6 py-4 whitespace-nowrap text-sm";
            timeCell.textContent = activity.time;
            
            const actionCell = document.createElement("td");
            actionCell.className = "px-6 py-4 whitespace-nowrap text-sm";
            actionCell.textContent = activity.action;
            
            const statusCell = document.createElement("td");
            statusCell.className = "px-6 py-4 whitespace-nowrap text-sm";
            statusCell.textContent = activity.status;
            
            row.appendChild(timeCell);
            row.appendChild(actionCell);
            row.appendChild(statusCell);
            
            activityLog.appendChild(row);
        });
    } else {
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.className = "px-6 py-4 whitespace-nowrap text-sm text-center";
        cell.textContent = "No activity yet";
        cell.colSpan = 3;
        row.appendChild(cell);
        activityLog.appendChild(row);
    }
}

// Updates distance readings and threshold values throughout the UI
function updateDistanceReading(distance, threshold) {
    currentDistance = distance;
    
    if (threshold !== undefined && threshold > 0) {
        currentThreshold = threshold;
    }
    
    updateDistanceDisplay();
    
    const thresholdInput = document.getElementById("distance-threshold");
    if (thresholdInput && !thresholdInput.matches(':focus')) {
        if (currentThreshold !== parseInt(thresholdInput.value)) {
            thresholdInput.value = currentThreshold;
        }
    }
    
    const thresholdDisplay = document.getElementById("distance-threshold-display");
    if (thresholdDisplay) {
        thresholdDisplay.textContent = `${currentThreshold} cm`;
    }
}

// Sets up event listeners for UI controls when the page loads
document.addEventListener("DOMContentLoaded", function() {
    const btnOn = document.getElementById("btnOn");
    if (btnOn) {
        btnOn.addEventListener("click", function() {
            if (!deviceConnected) {
                alert("Perangkat tidak terhubung. Mohon periksa koneksi perangkat IoT Anda.");
                return;
            }
            
            if (sendMesg(servoTopic, "1")) {
                showCooldownFeedback();
            }
        });
    }

    const btnOff = document.getElementById("btnOff");
    if (btnOff) {
        btnOff.addEventListener("click", function() {
            if (!deviceConnected) {
                alert("Perangkat tidak terhubung. Mohon periksa koneksi perangkat IoT Anda.");
                return;
            }
            
            if (sendMesg(servoTopic, "0")) {
                showCooldownFeedback();
            }
        });
    }
    
    const modeToggle = document.getElementById("modeToggle");
    if (modeToggle) {
        modeToggle.addEventListener("change", function() {
            if (!deviceConnected) {
                alert("Perangkat tidak terhubung. Mohon periksa koneksi perangkat IoT Anda.");
                modeToggle.checked = isAutoMode;
                return;
            }
            
            modeToggle.disabled = true;
            const mode = modeToggle.checked ? "auto" : "manual";
            sendMesg(servoTopic, mode);
        
            updateModeUI(modeToggle.checked);

            setTimeout(function() {
                modeToggle.disabled = false;
            }, buttonCooldown);
        });
    }
    
    const btnThreshold = document.getElementById("btnThreshold");
    if (btnThreshold) {
        btnThreshold.addEventListener("click", function() {
            sendThreshold();
        });
    }
    
    const clearLogsBtn = document.getElementById("clearLogsBtn");
    if (clearLogsBtn) {
        clearLogsBtn.addEventListener("click", function() {
            if (confirm("Apakah Anda yakin ingin menghapus semua log akses?")) {
                rfidAccessLogs = [];
                
                localStorage.removeItem('rfidAccessLogs');
                
                updateAccessLogTable();
                
                logActivity("Admin", "Menghapus log akses");
            }
        });
    }
});