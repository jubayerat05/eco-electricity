import { EventEmitter } from 'events';
import { IDeviceRepository } from '../services/device.repository';
import { PowerService } from '../services/power.service';
import { Device, RoomId } from '../types';
import { config } from '../config';

export class SimulationService extends EventEmitter {
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;
  private simulatedClockSeconds = 0;
  private nextToggleClockSeconds = 0;
  private speedMultiplier = 1;

  constructor(
    private deviceRepo: IDeviceRepository,
    private powerService: PowerService
  ) {
    super();
    this.speedMultiplier = config.simulationSpeed;
    this.scheduleNextToggle();
    // Simulation starts as stopped/paused by default. Users can start it via dashboard.
  }

  private scheduleNextToggle() {
    // Random between 10 and 30 seconds of simulated time
    const delay = Math.floor(Math.random() * 21) + 10;
    this.nextToggleClockSeconds = this.simulatedClockSeconds + delay;
  }

  // Get status
  isSimulationRunning(): boolean {
    return this.isRunning;
  }

  // Get speed
  getSpeed(): number {
    return this.speedMultiplier;
  }

  // Set speed
  setSpeed(speed: number) {
    this.speedMultiplier = speed;
  }

  // Start the simulation loop
  start() {
    if (this.isRunning) return;
    this.isRunning = true;

    // Tick every 1 second in real time
    this.intervalId = setInterval(() => {
      this.tick();
    }, 1000);

    this.emit('simulationStarted');
    console.log(`[Simulation] Simulator started. Speed multiplier: ${this.speedMultiplier}x`);
  }

  // Stop the simulation loop
  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.emit('simulationStopped');
    console.log('[Simulation] Simulator stopped.');
  }

  // Reset all devices and metrics
  async reset() {
    const wasRunning = this.isRunning;
    this.stop();
    
    // Reset device repository
    await this.deviceRepo.resetAll();
    // Reset power accumulator
    this.powerService.resetAccumulatedEnergy();
    
    this.simulatedClockSeconds = 0;
    this.scheduleNextToggle();

    const devices = await this.deviceRepo.getAll();
    this.emit('simulationReset', devices);

    if (wasRunning) {
      this.start();
    }
    console.log('[Simulation] Simulator and device stats reset.');
  }

  async triggerDemoMode() {
    this.stop();
    this.speedMultiplier = 30; // 30x speed
    this.start();
    
    // Set 6 specific devices ON in Drawing Room to show load and speed
    const devices = await this.deviceRepo.getAll();
    const drawingDevices = devices.filter(d => d.room === 'drawing');
    for (const d of drawingDevices) {
      await this.deviceRepo.update(d.id, {
        status: 'ON',
        powerDraw: d.type === 'fan' ? 75 : 15,
        runtimeCurrentSession: 7180 // 7180s = 1h 59m 40s (so it triggers overtime in 20 simulated seconds!)
      });
    }

    // Trigger update events
    const updatedDevices = await this.deviceRepo.getAll();
    this.emit('simulationReset', updatedDevices);
    
    const powerState = await this.powerService.getPowerState();
    this.emit('tick', powerState);

    console.log(`[Simulation] Demo mode activated. Speed: 30x. Drawing room devices initialized near overtime limit.`);
  }

  // Single tick logic (represents 1 second of real-time)
  private async tick() {
    const elapsedSeconds = 1 * this.speedMultiplier;
    this.simulatedClockSeconds += elapsedSeconds;

    // 1. Update runtimes for active devices and tick the power service accumulator
    const devices = await this.deviceRepo.getAll();
    for (const device of devices) {
      if (device.status === 'ON') {
        const newRuntimeCurrentSession = device.runtimeCurrentSession + elapsedSeconds;
        const newRuntimeToday = device.runtimeToday + elapsedSeconds;
        
        await this.deviceRepo.update(device.id, {
          runtimeCurrentSession: newRuntimeCurrentSession,
          runtimeToday: newRuntimeToday
        });
      }
    }

    // Tick the power accumulator
    await this.powerService.tickAccumulator(elapsedSeconds);

    // 2. Check if it's time to toggle a random device (only if enabled)
    if (config.enableRandomToggle && this.simulatedClockSeconds >= this.nextToggleClockSeconds) {
      await this.toggleRandomDevice();
      this.scheduleNextToggle();
    }

    // 3. Emit regular tick event with updated power state
    const powerState = await this.powerService.getPowerState();
    this.emit('tick', powerState);
  }

  // Helper to toggle a random device
  private async toggleRandomDevice() {
    const devices = await this.deviceRepo.getAll();
    if (devices.length === 0) return;

    // Pick a random device
    const randomIndex = Math.floor(Math.random() * devices.length);
    const device = devices[randomIndex];

    // Toggle status
    const newStatus = device.status === 'ON' ? 'OFF' : 'ON';
    let newPowerDraw = 0;
    if (newStatus === 'ON') {
      newPowerDraw = device.type === 'fan' ? 75 : 15;
    }

    const updatedDevice = await this.deviceRepo.update(device.id, {
      status: newStatus,
      powerDraw: newPowerDraw,
      lastChanged: new Date().toISOString(),
      // Reset session runtime if turning OFF, or starting at 0 if turning ON
      runtimeCurrentSession: 0
    });

    if (updatedDevice) {
      this.emit('deviceUpdated', updatedDevice);
      console.log(
        `[Simulation] Device updated: ${updatedDevice.name} is now ${updatedDevice.status} (${updatedDevice.powerDraw}W)`
      );
    }
  }

  // Force toggle a specific device (useful for REST API manual override)
  async forceToggleDevice(id: string, status: 'ON' | 'OFF'): Promise<Device | undefined> {
    const device = await this.deviceRepo.getById(id);
    if (!device) return undefined;

    const newPowerDraw = status === 'ON' ? (device.type === 'fan' ? 75 : 15) : 0;
    
    const updatedDevice = await this.deviceRepo.update(id, {
      status,
      powerDraw: newPowerDraw,
      lastChanged: new Date().toISOString(),
      runtimeCurrentSession: 0
    });

    if (updatedDevice) {
      this.emit('deviceUpdated', updatedDevice);
      
      // Calculate new power state immediately and emit
      const powerState = await this.powerService.getPowerState();
      this.emit('tick', powerState);
      
      console.log(
        `[Simulation Manual] Force updated: ${updatedDevice.name} is now ${updatedDevice.status}`
      );
    }

    return updatedDevice;
  }
}
