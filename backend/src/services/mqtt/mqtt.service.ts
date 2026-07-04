import mqtt, { MqttClient } from 'mqtt';
import { SimulationService } from '../../simulation/simulation.service';
import { AutomationEngine } from '../automation/automationEngine';

export class MqttService {
  private client: MqttClient | null = null;
  private isProcessingMqttEvent = false;

  constructor(
    private simulationService: SimulationService,
    private automationEngine: AutomationEngine
  ) {}

  start(brokerUrl = 'mqtt://broker.hivemq.com:1883') {
    if (this.client) {
      console.warn('[MQTT] Client is already started.');
      return;
    }
    try {
      this.client = mqtt.connect(brokerUrl, {
        clientId: `backend-smartoffice-${Math.random().toString(16).substring(2, 8)}`,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 3000
      });

      this.client.on('connect', () => {
        console.log('[MQTT] Connected to MQTT broker at', brokerUrl);
        // Subscribe to all state topics from drawing room hardware simulation
        this.client?.subscribe('smartoffice/drawing/#', (err) => {
          if (!err) {
            console.log('[MQTT] Subscribed to smartoffice/drawing/#');
          }
        });
      });

      this.client.on('message', async (topic: string, message: Buffer) => {
        const payload = message.toString().trim();
        await this.handleIncomingMessage(topic, payload);
      });

      this.client.on('error', (err) => {
        console.error('[MQTT] Connection error:', err.message);
      });

      // Listen to simulator device updates to publish command out to ESP32 Wokwi circuit
      this.simulationService.on('deviceUpdated', (device) => {
        if (this.isProcessingMqttEvent) return; // Avoid echo loops
        this.publishDeviceCommand(device.id, device.status);
      });

    } catch (err) {
      console.error('[MQTT] Failed to start MQTT service:', err);
    }
  }

  stop() {
    if (this.client) {
      this.client.end(true);
      this.client = null;
      console.log('[MQTT] Disconnected from MQTT broker.');
    }
  }

  private async handleIncomingMessage(topic: string, payload: string) {
    // Topic format: smartoffice/<room>/<device>/state
    const parts = topic.split('/');
    if (parts.length < 4 || parts[0] !== 'smartoffice') return;

    const room = parts[1]; // e.g. "drawing"
    const devId = parts[2]; // e.g. "light1", "fan1", "motion", "master"
    const action = parts[3]; // e.g. "state"

    if (action !== 'state') return;

    this.isProcessingMqttEvent = true;
    try {
      if (devId === 'motion') {
        const isOccupied = payload === 'true' || payload === 'ON' || payload === '1';
        this.automationEngine.setOccupancy(room, isOccupied);
        console.log(`[MQTT] Hardware Motion Sensor -> Room '${room}' occupancy set to ${isOccupied}`);
      } else {
        const status: 'ON' | 'OFF' = (payload === 'ON' || payload === '1' || payload === 'true') ? 'ON' : 'OFF';
        const targetDeviceId = this.mapMqttDeviceToBackendId(room, devId);
        if (targetDeviceId) {
          await this.simulationService.forceToggleDevice(targetDeviceId, status);
          console.log(`[MQTT] Hardware Relay -> Device '${targetDeviceId}' updated to ${status}`);
        }
      }
    } finally {
      this.isProcessingMqttEvent = false;
    }
  }

  publishDeviceCommand(backendDeviceId: string, status: 'ON' | 'OFF') {
    if (!this.client || !this.client.connected) return;

    const mapped = this.mapBackendIdToMqtt(backendDeviceId);
    if (!mapped) return;

    const topic = `smartoffice/${mapped.room}/${mapped.device}/set`;
    this.client.publish(topic, status, { qos: 0, retain: false });
    console.log(`[MQTT] Published command to Hardware -> ${topic}: ${status}`);
  }

  private mapMqttDeviceToBackendId(room: string, mqttDevice: string): string | null {
    // Maps "light1" -> "drawing-light-1"
    if (mqttDevice.startsWith('light')) {
      const num = mqttDevice.replace('light', '');
      return `${room}-light-${num}`;
    }
    if (mqttDevice.startsWith('fan')) {
      const num = mqttDevice.replace('fan', '');
      return `${room}-fan-${num}`;
    }
    return null;
  }

  private mapBackendIdToMqtt(backendId: string): { room: string; device: string } | null {
    // Maps "drawing-light-1" -> { room: "drawing", device: "light1" }
    const parts = backendId.split('-');
    if (parts.length === 3) {
      const room = parts[0];
      const type = parts[1];
      const num = parts[2];
      return { room, device: `${type}${num}` };
    }
    return null;
  }
}
