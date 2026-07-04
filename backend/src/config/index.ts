import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file (check both backend/ and root/ directories)
dotenv.config({ path: path.join(__dirname, '../../.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  discordToken: process.env.DISCORD_TOKEN || '',
  discordClientId: process.env.DISCORD_CLIENT_ID || '',
  discordGuildId: process.env.DISCORD_GUILD_ID || '',
  discordChannelId: process.env.DISCORD_CHANNEL_ID || '',
  simulationSpeed: parseFloat(process.env.SIMULATION_SPEED || '1.0'),
  officeHours: {
    start: parseInt(process.env.OFFICE_HOURS_START || '9', 10), // Hour, e.g. 9 for 9 AM
    end: parseInt(process.env.OFFICE_HOURS_END || '17', 10)     // Hour, e.g. 17 for 5 PM
  },
  powerThreshold: parseFloat(process.env.POWER_THRESHOLD || '800'), // Watts
  enableRandomToggle: process.env.ENABLE_RANDOM_TOGGLE === 'true',
  nodeEnv: process.env.NODE_ENV || 'development',
  geminiApiKey: process.env.GEMINI_API_KEY || ''
};
