// Global variables
let mqtt;
let lastActivity = [];
let deviceConnected = false;
let lastButtonPress = 0;
let buttonCooldown = 5000;
let buttonLocked = false;
let currentDistance = 0;
let currentThreshold = defaultThreshold;
let isAutoMode = false;
let usersDatabase = null;
let rfidAccessLogs = [];
let authorizedUids = [];

// Sends a message to an MQTT topic with spam protection
function sendMesg(topic, command) { 
    if (!mqtt || !mqtt.isConnected()) {
        updateConnectionStatus("Disconnected", false);
        return false;
    }
    
    lastButtonPress = Date.now();
    
    const message = new Paho.MQTT.Message(command);
    message.destinationName = topic;
    mqtt.send(message);
    
    logActivity("Send", `Sent command '${command}' to topic '${topic}'`);
    
    if (topic === servoTopic) {
        updateServoStatus("Menunggu respon..");
    }
    
    return true;
}

// Updates the broker connection status in the UI
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

// Updates device connection status in the UI
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

// Updates distance sensor reading and threshold in the UI
function updateDistanceReading(distance, threshold) {
    currentDistance = distance;
    
    if (threshold !== undefined && threshold > 0) {
        currentThreshold = threshold;
    }
    
    const distanceElement = document.getElementById("distance-reading");
    if (distanceElement) {
        if (isAutoMode) {
            distanceElement.textContent = `${distance} cm / ${currentThreshold} cm`;
            
            let percentage = 0;
            if (distance <= currentThreshold * 2) {
                percentage = Math.max(0, 100 - (distance / (currentThreshold * 2) * 100));
            }
            
            const progressElement = document.getElementById("distance-progress");
            if (progressElement) {
                progressElement.style.width = `${percentage}%`;
                
                if (distance < currentThreshold) {
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

// Updates status alert banner in the UI
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

// Updates servo status display in the UI
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

// Logs activity to the activity log
function logActivity(action, status) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    
    lastActivity.unshift({
        time: timeStr,
        action: action,
        status: status
    });
    
    if (lastActivity.length > maxLogEntries) {
        lastActivity.pop();
    }
    
    const lastUpdateElement = document.getElementById("last-update");
    if (lastUpdateElement) {
        lastUpdateElement.textContent = timeStr;
    }
    
    updateActivityLog();
    
    if ((action === "Send" && status.includes("command '1'")) || 
        (action === "Access" && status.includes("Granted"))) {
        updateTodayAccessCount();
    }
}

// Updates today's access count based on logs
function updateTodayAccessCount() {
    const today = new Date().toISOString().split('T')[0];
    
    const todayLogs = rfidAccessLogs.filter(log => {
        const logDate = new Date(log.timestamp).toISOString().split('T')[0];
        return logDate === today && log.status === "Granted";
    });
    
    const accessCounter = document.getElementById("today-access");
    if (accessCounter) {
        accessCounter.textContent = todayLogs.length;
    }
    
    localStorage.setItem('todayAccessCount', todayLogs.length);
}

// Updates activity log display in the UI
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

// Logs RFID access attempt and triggers verification
function logAccessAttempt(uid, timestamp) {
    rfidAccessLogs.unshift({
        uid: uid,
        timestamp: timestamp,
        status: "Pending"
    });
    
    logActivity("RFID", `Card detected: ${uid}`);
    
    updateAccessLogTable();
    
    localStorage.setItem('rfidAccessLogs', JSON.stringify(rfidAccessLogs));
    
    verifyAccess(uid);
}

// Updates the list of authorized UIDs
function updateAuthorizedUidsList(uidsList) {
    authorizedUids = uidsList;
    console.log("Updated authorized UIDs list:", authorizedUids);
}

// Checks if a UID is authorized
function isAuthorizedUid(uid) {
    console.log("Checking authorization for UID:", uid);
    console.log("Authorized UIDs:", window.authorizedUsers);
    
    if (window.authorizedUsers && window.authorizedUsers.length > 0) {
        authorizedUids = window.authorizedUsers;
    }
    
    const isAuthorized = authorizedUids.includes(uid);
    console.log("Authorization result:", isAuthorized);
    
    return isAuthorized;
}

// Verifies RFID access permissions
function verifyAccess(uid) {
    const isAuthorized = isAuthorizedUid(uid);
    console.log(`Access check for UID ${uid}: ${isAuthorized ? 'Granted' : 'Denied'}`);
    
    const accessResult = {
        uid: uid,
        granted: isAuthorized,
        name: isAuthorized ? "Authorized User" : "Unauthorized User"
    };
    
    if (mqtt && mqtt.isConnected()) {
        const message = new Paho.MQTT.Message(JSON.stringify(accessResult));
        message.destinationName = accessResultTopic;
        mqtt.send(message);
        logActivity("Access", `Result sent: ${accessResult.granted ? "Access granted" : "Access denied"}`);
        
        updateAccessLogStatus(uid, accessResult.granted ? "Granted" : "Denied");
    }
}

// Updates access log status for a specific UID
function updateAccessLogStatus(uid, status) {
    for (let i = 0; i < rfidAccessLogs.length; i++) {
        if (rfidAccessLogs[i].uid === uid) {
            rfidAccessLogs[i].status = status;
            break;
        }
    }
    
    localStorage.setItem('rfidAccessLogs', JSON.stringify(rfidAccessLogs));
    
    updateAccessLogTable();
}

// Updates access log table on log-access.html
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

// Loads access logs from localStorage
function loadAccessLogs() {
    const savedLogs = localStorage.getItem('rfidAccessLogs');
    if (savedLogs) {
        rfidAccessLogs = JSON.parse(savedLogs);
    }
    
    updateTodayAccessCount();
    
    updateAccessLogTable();
}

// Initializes today's access counter on page load
function initTodayAccessCounter() {
    const today = new Date().toISOString().split('T')[0];
    const lastAccessDate = localStorage.getItem('lastAccessDate');
    
    if (lastAccessDate !== today) {
        localStorage.setItem('todayAccessCount', '0');
        localStorage.setItem('lastAccessDate', today);
    }
    
    const accessCounter = document.getElementById("today-access");
    if (accessCounter) {
        const savedCount = localStorage.getItem('todayAccessCount') || '0';
        accessCounter.textContent = savedCount;
    }
}

// Checks device connection by sending ping
function checkDeviceStatus() {
    if (!mqtt || !mqtt.isConnected()) {
        updateDeviceStatus(false);
        return;
    }
    
    const pingTimeout = setTimeout(() => {
        updateDeviceStatus(false);
        logActivity("Device", "No response from device - considered offline");
    }, devicePingTimeout);
    
    window.currentPingTimeout = pingTimeout;
    
    const message = new Paho.MQTT.Message("ping");
    message.destinationName = devicePingTopic;
    mqtt.send(message);
    
    logActivity("Ping", "Checking device status");
}

// Establishes MQTT broker connection
function MQTTconnect() {
    updateConnectionStatus("Menghubungkan ke broker...", false);
    
    mqtt = new Paho.MQTT.Client(
        host, 
        port, 
        path, 
        "WebClient-" + Math.floor(Math.random() * 100000)
    );

    const options = {
        timeout: 3,
        useSSL: useTLS,
        cleanSession: cleansession,
        onSuccess: onConnect,
        onFailure: function (message) {
            updateConnectionStatus("Gagal terhubung ke broker", false);
            updateDeviceStatus(false);
            logActivity("Connection", `Gagal: ${message.errorMessage}`);
            console.log("Connection failed: " + message.errorMessage + " Retrying");
            setTimeout(MQTTconnect, reconnectTimeout);
        }
    };

    mqtt.onConnectionLost = onConnectionLost;
    mqtt.onMessageArrived = onMessageArrived;

    if (username) {
        options.userName = username;
        options.password = password;
    }

    mqtt.connect(options);
}

// Handles successful MQTT connection
function onConnect() {
    updateConnectionStatus("Terhubung ke broker", true);
    logActivity("Connection", "Terhubung ke broker MQTT");
    
    mqtt.subscribe(servoTopic, {qos: 0});
    mqtt.subscribe(statusTopic, {qos: 0});
    mqtt.subscribe(devicePingResponseTopic, {qos: 0});
    mqtt.subscribe(distanceTopic, {qos: 0});
    mqtt.subscribe(rfidTopic, {qos: 0});
    mqtt.subscribe(accessResultTopic, {qos: 0});
    
    logActivity("Subscribe", `Berlangganan topik: ${servoTopic}, ${statusTopic}, ${devicePingResponseTopic}, ${distanceTopic}, ${rfidTopic}, ${accessResultTopic}`);
    
    checkDeviceStatus();
    
    setInterval(checkDeviceStatus, deviceStatusInterval);
}

// Handles MQTT connection loss
function onConnectionLost(response) {
    updateConnectionStatus("Terputus dari broker", false);
    updateDeviceStatus(false);
    logActivity("Connection", `Terputus: ${response.errorMessage}`);
    
    setTimeout(MQTTconnect, reconnectTimeout);
    console.log("Connection lost: " + response.errorMessage + ". Reconnecting...");
}

// Processes incoming MQTT messages
function onMessageArrived(message) {
    const topic = message.destinationName;
    const payload = message.payloadString;

    const messageKey = `${topic}-${payload}`;
    const now = Date.now();

    if (!window.lastMessageKeys) window.lastMessageKeys = {};
    window.lastMessageKeys[messageKey] = now;

    logActivity("Receive", `Message from ${topic}: ${payload}`);

    if (topic === servoTopic) {
        updateServoStatus(payload === "1" ? "Terbuka" : "Tertutup");
    } 
    else if (topic === statusTopic) {
        try {
            if (isValidJSON(payload)) {
                const status = JSON.parse(payload);
                updateDeviceStatus(status.online === true);

                if (status.servo !== undefined) {
                    updateServoStatus(status.servo === 1 ? "Terbuka" : "Tertutup");
                }

                if (status.auto_mode !== undefined) {
                    updateModeUI(status.auto_mode);
                }

                if (status.distance !== undefined) {
                    if (status.threshold !== undefined) {
                        updateDistanceReading(status.distance, status.threshold);
                    } else {
                        updateDistanceReading(status.distance, currentThreshold);
                    }
                }
            } else {
                console.warn("Received non-JSON payload on status topic:", payload);
                logActivity("Warning", "Received invalid JSON format on status topic");
            }
        } catch (e) {
            console.error("Error parsing status message:", e);
            logActivity("Error", `JSON parsing error: ${e.message}`);
        }
    }
    else if (topic === devicePingResponseTopic) {
        updateDeviceStatus(true);
        logActivity("Pong", "Device responded and online");

        if (window.currentPingTimeout) {
            clearTimeout(window.currentPingTimeout);
            window.currentPingTimeout = null;
        }

        if (payload.includes("servo:")) {
            const servoStatus = payload.split("servo:")[1].trim();
            updateServoStatus(servoStatus === "1" ? "Terbuka" : "Tertutup");
        }
    }
    else if (topic === distanceTopic) {
        const newThreshold = parseInt(payload);
        if (!isNaN(newThreshold) && newThreshold > 0) {
            updateDistanceReading(currentDistance, newThreshold);
            logActivity("Threshold", `Distance threshold updated to ${newThreshold} cm`);
        }
    }
    else if (topic === rfidTopic) {
        try {
            if (isValidJSON(payload)) {
                const data = JSON.parse(payload);
                const uid = data.uid;
                const timestamp = new Date().toLocaleString();
            
                logAccessAttempt(uid, timestamp);
            } else {
                console.warn("Received non-JSON payload on RFID topic:", payload);
                logActivity("Warning", "Received invalid JSON format on RFID topic");
            }
        } catch (error) {
            console.error("Error processing RFID message:", error);
            logActivity("Error", `RFID message processing error: ${error.message}`);
        }
    }
    else if (topic === accessResultTopic) {
        try {
            if (isValidJSON(payload)) {
                const result = JSON.parse(payload);
                const uid = result.uid;
                const granted = result.granted;
                const name = result.name || "Unknown User";

                updateAccessLogStatus(uid, granted ? "Granted" : "Denied");

                logActivity("Access", `${granted ? "Granted" : "Denied"} for ${name}`);
            } else {
                console.warn("Received non-JSON payload on access result topic:", payload);
                logActivity("Warning", "Received invalid JSON format on access result topic");
            }
        } catch (error) {
            console.error("Error processing access result message:", error);
            logActivity("Error", `Access result processing error: ${error.message}`);
        }
    }
}

// Checks if a string is valid JSON
function isValidJSON(str) {
    try {
        JSON.parse(str);
        return true;
    } catch (e) {
        return false;
    }
}

// Document ready initialization
$(document).ready(function() {
    initTodayAccessCounter();
    
    const reconnectTimeout = 2000;
    
    const mqttTopicElement = document.getElementById("mqtt-topic");
    if (mqttTopicElement) {
        mqttTopicElement.textContent = servoTopic;
    }
    
    const thresholdInput = document.getElementById("distance-threshold");
    if (thresholdInput) {
        thresholdInput.value = currentThreshold;
    }
    
    loadAccessLogs();
    
    updateActivityLog();
    
    updateDeviceStatus(false);

    if (window.location.pathname.includes('pengguna.html')) {
        fetch('users.json')
            .then(response => response.json())
            .then(data => {
                if (data && data.authorized_uids) {
                    authorizedUids = data.authorized_uids;
                    console.log("Loaded authorized UIDs in websockets.js:", authorizedUids);
                    window.authorizedUsers = authorizedUids;
                }
            })
            .catch(error => console.error("Error loading users.json:", error));
    }

    MQTTconnect();
});