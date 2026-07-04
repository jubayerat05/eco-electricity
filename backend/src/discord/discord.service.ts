import { Client, GatewayIntentBits, Partials, TextChannel } from 'discord.js';
import { IDeviceRepository } from '../services/device.repository';
import { PowerService } from '../services/power.service';
import { AlertService } from '../services/alert.service';
import { RoomId } from '../types';
import { config } from '../config';
import { GoogleGenerativeAI } from '@google/generative-ai';

export class DiscordService {
  private client: Client | null = null;
  private isMock = false;
  private processedMessageIds: Set<string> = new Set();

  constructor(
    private deviceRepo: IDeviceRepository,
    private powerService: PowerService,
    private alertService: AlertService
  ) {
    if (!config.discordToken) {
      console.warn('[Discord] DISCORD_TOKEN is missing. Discord bot will run in MOCK MODE (logging replies to console).');
      this.isMock = true;
    }
  }

  async start() {
    if (this.isMock) {
      return;
    }

    if (this.client) {
      console.warn('[Discord] Client is already started. Skipping duplicate initialization.');
      return;
    }

    try {
      this.client = new Client({
        intents: [
          GatewayIntentBits.Guilds,
          GatewayIntentBits.GuildMessages,
          GatewayIntentBits.MessageContent
        ],
        partials: [Partials.Channel]
      });

      this.client.once('ready', () => {
        console.log(`[Discord] Bot logged in successfully as ${this.client?.user?.tag}`);
      });

      this.client.on('messageCreate', async (message) => {
        // Ignore bot messages
        if (message.author.bot) return;

        const text = message.content.trim();
        if (!text.startsWith('!')) return;

        // Deduplicate: avoid responding multiple times to the exact same message ID
        if (this.processedMessageIds.has(message.id)) return;
        this.processedMessageIds.add(message.id);
        if (this.processedMessageIds.size > 500) {
          const firstKey = this.processedMessageIds.values().next().value;
          if (firstKey) this.processedMessageIds.delete(firstKey);
        }

        console.log(`[Discord] Command received: "${text}" from ${message.author.username}`);
        const response = await this.handleCommand(text);

        await message.reply(response);
      });

      await this.client.login(config.discordToken);
    } catch (error) {
      console.error('[Discord] Failed to start Discord client, falling back to mock mode:', error);
      this.isMock = true;
    }
  }

  async stop() {
    if (this.client) {
      try {
        await this.client.destroy();
        console.log('[Discord] Bot logged out and client destroyed.');
      } catch (err) {
        console.error('[Discord] Error shutting down client:', err);
      }
      this.client = null;
    }
  }

  // Helper to conversationalize raw telemetry data using Gemini Free Tier API
  private async humanizeResponse(rawData: string, commandContext: string): Promise<string> {
    if (!config.geminiApiKey || config.geminiApiKey === 'your_gemini_api_key_here') {
      return rawData;
    }

    try {
      const ai = new GoogleGenerativeAI(config.geminiApiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const prompt = `
You are EBot, a friendly and helpful AI Green Building Assistant.
Your task is to take the following raw telemetry status for the command "${commandContext}" and rewrite it as a conversational, warm, and humanized Discord message.

Raw Telemetry Data:
${rawData}

Instructions:
1. Keep the exact values, numbers, and states. Do NOT invent or alter data.
2. The boss hates robotic data dumps; make the response friendly and professional.
3. Keep the output short and concise (under 3 sentences).
4. Do not include markdown headers like "#" or "##" in the response.
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return text || rawData;
    } catch (err) {
      console.warn(`[Discord AI] Failed to conversationalize response: ${(err as Error).message}. Using raw data fallback.`);
      return rawData;
    }
  }

  // Handle bot commands and return natural responses
  async handleCommand(commandString: string): Promise<string> {
    const parts = commandString.split(' ');
    const command = parts[0].toLowerCase();
    const arg = parts.slice(1).join(' ').toLowerCase();

    let rawResponse = '';
    switch (command) {
      case '!help':
        return this.getHelpMessage();
      case '!status':
        rawResponse = await this.getStatusMessage();
        return await this.humanizeResponse(rawResponse, 'Status Summary');
      case '!room':
        rawResponse = await this.getRoomMessage(arg);
        if (rawResponse.startsWith('❌')) return rawResponse;
        return await this.humanizeResponse(rawResponse, `Room Status for ${arg}`);
      case '!usage':
        rawResponse = await this.getUsageMessage();
        return await this.humanizeResponse(rawResponse, 'Energy Consumption');
      case '!alerts':
        rawResponse = await this.getAlertsMessage();
        return await this.humanizeResponse(rawResponse, 'Active Warnings');
      default:
        return `Unknown command. Type \`!help\` to see the list of available commands.`;
    }
  }

  // Helper to humanize proactive alerts and resolutions using Gemini Free Tier API
  private async humanizeAlert(alertMessage: string): Promise<string> {
    if (!config.geminiApiKey || config.geminiApiKey === 'your_gemini_api_key_here') {
      return alertMessage;
    }

    try {
      const ai = new GoogleGenerativeAI(config.geminiApiKey);
      const model = ai.getGenerativeModel({ model: 'gemini-2.5-flash' });

      const isResolved = alertMessage.startsWith('✅') || alertMessage.startsWith('Restored');
      const prompt = isResolved
        ? `
You are EBot, a friendly AI Green Building Assistant.
Your task is to take the following raw notification that an office alert has been resolved/cleared:
"${alertMessage}"

Instructions:
1. Rewrite it as a brief, conversational, and warm update for the channel.
2. Keep it under 2 sentences.
3. Keep the tone casual and positive (e.g. "Looks like the lights in Work Room 1 are off now. Thanks for checking!").
`
        : `
You are EBot, a friendly AI Green Building Assistant.
Your task is to take the following raw alert notification:
"${alertMessage}"

Instructions:
1. Rewrite it as a conversational, proactive warning message for the team channel.
2. Focus on checking if anyone is left in the room or if they forgot to turn things off.
3. Keep it under 2 sentences.
4. Tone should be casual, friendly, and expressive (e.g. "Hey! Work Room 2 still has 2 fans and 3 lights ON and it's 10 PM. Did someone forget to leave?").
5. Keep all factual numbers, room names, and time references accurate. Do NOT invent or alter data.
`;

      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      return text || alertMessage;
    } catch (err) {
      console.warn(`[Discord AI] Failed to humanize alert message: ${(err as Error).message}. Using raw data fallback.`);
      return alertMessage;
    }
  }

  // Send an alert message to the designated channel
  async sendAlert(alertMessage: string) {
    const finalMessage = await this.humanizeAlert(alertMessage);

    if (this.isMock) {
      console.log(`[Discord Mock Alert Log] ⚠ ALERT CHANNEL: "${finalMessage}"`);
      return;
    }

    if (!config.discordChannelId) {
      console.warn('[Discord] Cannot post alert: DISCORD_CHANNEL_ID is not configured.');
      return;
    }

    try {
      const channel = await this.client?.channels.fetch(config.discordChannelId);
      if (channel && channel.isTextBased()) {
        await (channel as TextChannel).send(finalMessage);
        console.log(`[Discord] Alert message posted to channel ${config.discordChannelId}`);
      } else {
        console.warn(`[Discord] Channel ${config.discordChannelId} is not a text channel.`);
      }
    } catch (err) {
      console.error('[Discord] Failed to send alert message:', err);
    }
  }

  private getHelpMessage(): string {
    return `💡 **Office IoT Power Monitor Commands**:\n` +
      `- \`!status\`: Show current status and total office power draw.\n` +
      `- \`!room drawing | work1 | work2\`: Show detailed status of a specific room.\n` +
      `- \`!usage\`: View today's total energy consumption in kWh.\n` +
      `- \`!alerts\`: View active system alerts.\n` +
      `- \`!help\`: Display this list of commands.`;
  }

  private async getStatusMessage(): Promise<string> {
    const devices = await this.deviceRepo.getAll();
    const powerState = await this.powerService.getPowerState();

    const activeDevicesCount = devices.filter((d) => d.status === 'ON').length;
    const totalDevicesCount = devices.length;

    const currentHour = new Date().getHours();
    const isOpen = currentHour >= 9 && currentHour < 17;

    return `🏢 **Office Status Summary**:\n` +
      `- **Office Hours**: ${isOpen ? 'Open (9 AM - 5 PM)' : 'After Hours'}\n` +
      `- **Active Load**: **${powerState.totalPowerDraw}W**\n` +
      `- **Devices Active**: **${activeDevicesCount}** running (out of ${totalDevicesCount} total).`;
  }

  private async getRoomMessage(roomArg: string): Promise<string> {
    let roomId: RoomId | null = null;
    let roomLabel = '';

    if (roomArg === 'drawing') {
      roomId = 'drawing';
      roomLabel = 'Drawing Room';
    } else if (roomArg === 'work1' || roomArg === 'work room 1') {
      roomId = 'work1';
      roomLabel = 'Work Room 1';
    } else if (roomArg === 'work2' || roomArg === 'work room 2') {
      roomId = 'work2';
      roomLabel = 'Work Room 2';
    }

    if (!roomId) {
      return `❌ Please specify a valid room: \`!room drawing\`, \`!room work1\`, or \`!room work2\`.`;
    }

    const devices = await this.deviceRepo.getAll();
    const roomDevices = devices.filter((d) => d.room === roomId);
    const roomPower = roomDevices.reduce((sum, d) => sum + (d.status === 'ON' ? d.powerDraw : 0), 0);

    const activeFans = roomDevices.filter((d) => d.type === 'fan' && d.status === 'ON').length;
    const activeLights = roomDevices.filter((d) => d.type === 'light' && d.status === 'ON').length;

    const fanPlural = activeFans === 1 ? 'fan' : 'fans';
    const lightPlural = activeLights === 1 ? 'light' : 'lights';

    return `🚪 **${roomLabel} Status**:\n` +
      `Currently has **${activeLights}** ${lightPlural} ON and **${activeFans}** ${fanPlural} running, consuming about **${roomPower}W**.`;
  }

  private async getUsageMessage(): Promise<string> {
    const kwh = this.powerService.getAccumulatedEnergy();
    return `🔋 **Energy Usage Today**:\n` +
      `The office has consumed approximately **${kwh.toFixed(4)} kWh** today.`;
  }

  private async getAlertsMessage(): Promise<string> {
    const alerts = await this.alertService.getAlerts();
    const active = alerts.filter((a) => !a.resolved);

    if (active.length === 0) {
      return `✅ **System Alerts**: No active issues or exceptions detected. All clear!`;
    }

    const alertList = active
      .map((a) => `- [${a.severity}] **${a.message}** (triggered at ${new Date(a.timestamp).toLocaleTimeString()})`)
      .join('\n');

    return `⚠ **Active System Alerts (${active.length})**:\n${alertList}`;
  }
}
