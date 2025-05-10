// Configuration for MQTT broker connection
const host = 'broker.emqx.io';
const port = 8083;
const path = '/mqtt';

// Security configuration for the MQTT connection
const useTLS = false;
const cleansession = true;

// Authentication credentials for MQTT broker
const username = "";
const password = "";

// MQTT topics for different device functions
const servoTopic = '/control/servo';
const statusTopic = '/device/status';
const devicePingTopic = '/device/ping';
const devicePingResponseTopic = '/device/pong';
const distanceTopic = '/sensor/distance';
const rfidTopic = '/sensor/rfid';
const accessResultTopic = '/control/access';

// Dashboard configuration parameters
const maxLogEntries = 10;
const deviceStatusInterval = 2000;
const devicePingTimeout = 10000;
const defaultThreshold = "";