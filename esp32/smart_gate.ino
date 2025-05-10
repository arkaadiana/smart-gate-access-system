#include <WiFi.h>
#include <PubSubClient.h>
#include <ESP32Servo.h>
#include <ArduinoJson.h>
#include <SPI.h>
#include <MFRC522.h>

// WiFi configuration
const char* ssid = "Xiaomi 13T";
const char* password = "yakaligaarka";

// MQTT broker configuration
const char* mqtt_server = "broker.emqx.io";
WiFiClient espClient;
PubSubClient client(espClient);

// MQTT topics for communication
const char* servo_topic = "/control/servo";
const char* ping_topic = "/device/ping";
const char* pong_topic = "/device/pong";
const char* status_topic = "/device/status";
const char* distance_topic = "/sensor/distance";
const char* rfid_topic = "/sensor/rfid";
const char* access_result_topic = "/control/access";

// RFID module pin configuration
const int SS_PIN = 5;
const int RST_PIN = 0;
const int SCK_PIN = 18;
const int MOSI_PIN = 13;
const int MISO_PIN = 19;

MFRC522 rfid(SS_PIN, RST_PIN);

// I/O pins and servo configuration
const int servoPin = 32;
const int TRIG_PIN = 23;
const int ECHO_PIN = 22;
Servo servoMotor;
char perintah = '0';
bool autoMode = true;

// Timer variables for periodic tasks
unsigned long lastStatusTime = 0;
unsigned long lastSensorTime = 0;
unsigned long lastRfidCheckTime = 0;
const long statusInterval = 3000;
const long sensorInterval = 500;
const long rfidInterval = 200;

// Distance and RFID detection settings
int detectionThreshold = 10;
unsigned long lastUidTime = 0;
const long uidCooldown = 3000;

String lastUidDetected = "";

// Reads distance from ultrasonic sensor
long readDistance() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH);
  long distance = (duration * 0.0343) / 2;

  return distance;
}

// Publishes current servo status to MQTT
void publishServoStatus() {
  client.publish(servo_topic, String(perintah).c_str());
  publishStatus();
}

// Publishes complete device status as JSON to MQTT
void publishStatus() {
  DynamicJsonDocument root(75);
  JsonObject doc = root.to<JsonObject>();
  doc["online"] = true;
  doc["servo"] = perintah == '1' ? 1 : 0;
  doc["auto_mode"] = autoMode;
  doc["ip"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();

  long distance = readDistance();
  doc["distance"] = distance;
  doc["threshold"] = detectionThreshold;

  char jsonBuffer[256];
  serializeJson(doc, jsonBuffer);

  client.publish(status_topic, jsonBuffer);
  Serial.println("Status dipublikasikan");
}

// Processes incoming MQTT messages
void callback(char* topic, byte* payload, unsigned int length) {
  Serial.print("Pesan diterima [");
  Serial.print(topic);
  Serial.print("] ");

  String message = "";
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println(message);

  if (strcmp(topic, servo_topic) == 0) {
    if (message == "1" && perintah != '1') {
      Serial.println("Memutar servo ke posisi 90 (melalui MQTT)");
      servoMotor.write(90);
      perintah = '1';
      publishServoStatus();
    } else if (message == "0" && perintah != '0') {
      Serial.println("Memutar servo ke posisi 0 (melalui MQTT)");
      servoMotor.write(0);
      perintah = '0';
      publishServoStatus();
    } else if (message == "auto") {
      autoMode = true;
      Serial.println("Mode sensor jarak untuk penutupan otomatis aktif");
      publishStatus();
    } else if (message == "manual") {
      autoMode = false;
      Serial.println("Mode manual (hanya MQTT) aktif");
      publishStatus();
    }
  }
  else if (strcmp(topic, ping_topic) == 0) {
    String pongMessage = "online servo:" + String(perintah);
    client.publish(pong_topic, pongMessage.c_str());
    Serial.println("Ping diterima, mengirim pong");
  }
  else if (strcmp(topic, distance_topic) == 0) {
    int newThreshold = message.toInt();
    if (newThreshold > 0) {
      detectionThreshold = newThreshold;
      Serial.print("Threshold jarak diperbarui menjadi: ");
      Serial.println(detectionThreshold);
      publishStatus();
    } else {
      Serial.println("Pesan tidak valid untuk threshold jarak.");
    }
  }
  else if (strcmp(topic, access_result_topic) == 0) {
    StaticJsonDocument<200> doc;
    DeserializationError error = deserializeJson(doc, message);

    if (!error) {
      bool accessGranted = doc["granted"];
      String name = doc["name"].as<String>();
      
      if (accessGranted) {
        Serial.print("Akses diberikan untuk: ");
        Serial.println(name);
        
        if (perintah != '1') {
          Serial.println("Membuka palang (posisi 90)");
          servoMotor.write(90);
          perintah = '1';
          publishServoStatus();
        }
      } else {
        Serial.println("Akses ditolak!");
      }
    }
  }
}

// Reconnects to MQTT broker when connection is lost
void reconnect() {
  while (!client.connected()) {
    Serial.print("Menghubungkan ke MQTT...");
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      Serial.println("Terhubung ke MQTT!");
      client.subscribe(servo_topic);
      client.subscribe(ping_topic);
      client.subscribe(distance_topic);
      client.subscribe(access_result_topic);
      publishStatus();
    } else {
      Serial.print("Gagal, rc=");
      Serial.print(client.state());
      Serial.println(" Coba lagi dalam 5 detik");
      delay(5000);
    }
  }
}

void setup() {
  Serial.begin(115200);
  Serial.println("Menyiapkan perangkat...");

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
  rfid.PCD_Init();
  Serial.println("RFID reader initialized");

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Terhubung ke Wi-Fi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);

  servoMotor.attach(servoPin);
  servoMotor.write(0);
  perintah = '0';
}

unsigned long lastCommandTime = 0;
const int commandCooldown = 1000;
bool servoControlLock = false;

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  unsigned long currentMillis = millis();
  unsigned long millisRfid = millis();

  if (servoControlLock && (currentMillis - lastCommandTime >= commandCooldown)) {
    servoControlLock = false;
    Serial.println("Cooldown selesai, siap menerima perintah baru.");
  }

  if (autoMode && (currentMillis - lastSensorTime >= sensorInterval)) {
    lastSensorTime = currentMillis;

    long distance = readDistance();
    Serial.print("Jarak: ");
    Serial.print(distance);
    Serial.println(" cm");

    if (distance < detectionThreshold && !servoControlLock) {
      if (perintah != '0') {
        Serial.println("Objek terdeteksi! Menutup servo (posisi 0)");
        servoMotor.write(0);
        perintah = '0';
        publishServoStatus();

        servoControlLock = true;
        lastCommandTime = currentMillis;
      }
    }
  }

  if (millisRfid - lastRfidCheckTime >= rfidInterval) {
    lastRfidCheckTime = millisRfid;
    handleRfid();
  }

  if (currentMillis - lastStatusTime >= statusInterval) {
    lastStatusTime = currentMillis;
    publishStatus();
  }
}

// Handles RFID tag detection and processing
void handleRfid() {
  if (!rfid.PICC_IsNewCardPresent()) {
    return;
  }

  if (!rfid.PICC_ReadCardSerial()) {
    return;
  }

  String uid = getUID();

  unsigned long currentTime = millis();
  if (uid == lastUidDetected && currentTime - lastUidTime < uidCooldown) {
    Serial.println("UID cooldown active, skipping repeat send");
    haltPICC();
    return;
  }

  lastUidDetected = uid;
  lastUidTime = currentTime;

  Serial.print("Kartu terdeteksi, UID: ");
  Serial.println(uid);

  if (!servoControlLock) {
    StaticJsonDocument<100> doc;
    doc["uid"] = uid;
    doc["timestamp"] = currentTime;

    char jsonBuffer[100];
    serializeJson(doc, jsonBuffer);

    client.publish(rfid_topic, jsonBuffer);
    Serial.println("UID dipublikasikan ke MQTT");

    servoControlLock = true;
    lastCommandTime = currentTime;
  }

  haltPICC();
}

// Verifies if a new RFID card is present and can be read
bool verifyNewCardPresence() {
  if (!rfid.PICC_IsNewCardPresent()) {
    return false;
  }

  if (!rfid.PICC_ReadCardSerial()) {
    return false;
  }

  return true;
}

// Stops communication with the current RFID card
void haltPICC() {
  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

// Formats and returns the UID of the detected RFID card
String getUID() {
  String uid = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) {
      uid += "0";
    }
    uid += String(rfid.uid.uidByte[i], HEX);
  }
  return uid;
}