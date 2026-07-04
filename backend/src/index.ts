import express from 'express';
import cors from 'cors';
import http from 'http';
import { config } from './config';

// Import routes
import deviceRoutes from './api/routes/device.routes';
import roomRoutes from './api/routes/room.routes';
import powerRoutes from './api/routes/power.routes';
import alertRoutes from './api/routes/alert.routes';
import usageRoutes from './api/routes/usage.routes';
import simulationRoutes from './api/routes/simulation.routes';
import aiInsightsRoutes from './api/routes/aiInsights.routes';
import analyticsRoutes from './api/routes/analytics.routes';
import aiAssistantRoutes from './api/routes/aiAssistant.routes';
import automationRoutes from './api/routes/automation.routes';

import { context } from './context';

const app = express();
const server = http.createServer(app);

// Initialize WebSockets
context.socketService.initialize(server);

// Start Discord Bot
context.discordService.start();

// Start MQTT Hardware Integration Service
context.mqttService.start();

app.use(cors());
app.use(express.json());

// Register API Routes as specified
app.use('/devices', deviceRoutes);
app.use('/rooms', roomRoutes);
app.use('/power', powerRoutes);
app.use('/alerts', alertRoutes);
app.use('/usage', usageRoutes);
app.use('/simulation', simulationRoutes);
app.use('/ai-insights', aiInsightsRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/ai-assistant', aiAssistantRoutes);
app.use('/automation', automationRoutes);

context.simulationService.on('tick', async () => {
  try {
    // Evaluate Smart Automation rules on every tick
    await context.automationEngine.evaluateTick();

    const insights = await context.aiInsightsAnalyzer.calculateInsights();
    context.socketService.broadcast('aiInsightsUpdated', insights);

    // Build and push historical snapshots
    const devices = await context.deviceRepo.getAll();
    const alerts = await context.alertService.getAlerts();
    const powerState = await context.powerService.getPowerState();

    const roomPowers: Record<string, number> = {};
    for (const r of powerState.rooms) {
      roomPowers[r.room] = r.powerDraw;
    }

    const deviceStates: Record<string, 'ON' | 'OFF'> = {};
    for (const d of devices) {
      deviceStates[d.id] = d.status;
    }

    const activeAlertsCount = alerts.filter((a) => !a.resolved).length;

    context.historyService.addEntry({
      timestamp: new Date().toISOString(),
      totalPower: powerState.totalPowerDraw,
      roomPowers,
      deviceStates,
      activeAlertsCount,
      efficiencyScore: insights.efficiencyScore
    });
  } catch (err) {
    console.error('[AI System] Error calculating/broadcasting insights:', err);
  }
});

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv
  });
});

const serverInstance = server.listen(config.port, () => {
  console.log(`[Server] Office IoT Backend listening on port ${config.port} in ${config.nodeEnv} mode`);
});

const shutdown = async (signal: string) => {
  console.log(`[Server] Received ${signal}. Shutting down services...`);
  await context.discordService.stop();
  context.mqttService.stop();
  serverInstance.close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
