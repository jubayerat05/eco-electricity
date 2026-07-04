import { IDeviceRepository } from '../device.repository';
import { PowerService } from '../power.service';
import { AlertService } from '../alert.service';
import { ScoringEngine, ScoreDetails } from './scoringEngine';
import { RecommendationEngine, Recommendation } from './recommendationEngine';
import { AnomalyDetector, Anomaly } from './anomalyDetector';
import { SummaryGenerator } from './summaryGenerator';

export interface AIInsights {
  summary: string;
  efficiencyScore: number;
  efficiencyGrade: 'Excellent' | 'Good' | 'Fair' | 'Poor';
  efficiencyColor: string;
  recommendations: Recommendation[];
  anomalies: Anomaly[];
  cards: {
    officeHealth: string;
    mostActiveRoom: string;
    highestPowerDevice: string;
    estimatedDailyCost: number;
  };
  trendAnalysis: {
    status: 'INCREASING' | 'DECREASING' | 'STABLE';
    peakUsageTime: string;
    averageHourlyUsage: number;
    highestConsumingRoom: string;
  };
}

export class AIInsightsAnalyzer {
  private scoringEngine = new ScoringEngine();
  private recommendationEngine = new RecommendationEngine();
  private anomalyDetector = new AnomalyDetector();
  private summaryGenerator = new SummaryGenerator();

  private cachedInsights: AIInsights | null = null;
  private loadHistory: number[] = [];

  constructor(
    private deviceRepo: IDeviceRepository,
    private powerService: PowerService,
    private alertService: AlertService
  ) {}

  async calculateInsights(): Promise<AIInsights> {
    const devices = await this.deviceRepo.getAll();
    const alerts = await this.alertService.getAlerts();
    const powerState = await this.powerService.getPowerState();
    const totalPower = powerState.totalPowerDraw;

    // Record load history for trend calculation
    this.loadHistory.push(totalPower);
    if (this.loadHistory.length > 20) {
      this.loadHistory.shift();
    }

    // 1. Calculate Score details
    const scoreDetails = this.scoringEngine.calculateScore(devices, alerts, totalPower);

    // 2. Generate Recommendations
    const recommendations = this.recommendationEngine.generateRecommendations(devices, totalPower);

    // 3. Detect Anomalies
    const anomalies = this.anomalyDetector.detectAnomalies(devices, totalPower);

    // 4. Generate Natural Language Summary
    const summary = await this.summaryGenerator.generateSummary(devices, totalPower);

    // 5. Compute Card Details
    const activeCount = devices.filter((d) => d.status === 'ON').length;
    const officeHealth = activeCount === 0 
      ? 'Idle (No draw)' 
      : scoreDetails.score >= 75 ? 'Healthy operation' : 'Wasting energy';

    // Find most active room
    const rooms = ['drawing', 'work1', 'work2'] as const;
    const roomLabels: Record<string, string> = {
      drawing: 'Drawing Room',
      work1: 'Work Room 1',
      work2: 'Work Room 2'
    };
    const roomPowers = rooms.map((roomId) => {
      const roomDevices = devices.filter((d) => d.room === roomId);
      const active = roomDevices.filter((d) => d.status === 'ON').length;
      const power = roomDevices.reduce((sum, d) => sum + (d.status === 'ON' ? d.powerDraw : 0), 0);
      return { roomId, active, power };
    });
    const maxActiveRoom = roomPowers.reduce((max, r) => (r.power > max.power ? r : max), roomPowers[0]);
    const mostActiveRoomLabel = maxActiveRoom.power > 0 ? roomLabels[maxActiveRoom.roomId] : 'None';

    // Find highest power device
    const activeDevices = devices.filter((d) => d.status === 'ON');
    const highestPowerDevice = activeDevices.length > 0
      ? activeDevices.reduce((max, d) => (d.powerDraw > max.powerDraw ? d : max), activeDevices[0]).name
      : 'None';

    // Estimate daily cost (using standard grid rate 12.39 per kWh)
    const kwhToday = powerState.estimatedKwhToday;
    const estimatedDailyCost = kwhToday * 12.39;

    // 6. Trend Analysis
    let status: 'INCREASING' | 'DECREASING' | 'STABLE' = 'STABLE';
    if (this.loadHistory.length >= 2) {
      const last = this.loadHistory[this.loadHistory.length - 1];
      const prev = this.loadHistory[this.loadHistory.length - 2];
      if (last > prev) {
        status = 'INCREASING';
      } else if (last < prev) {
        status = 'DECREASING';
      }
    }

    const averageHourlyUsage = this.loadHistory.length > 0
      ? this.loadHistory.reduce((sum, v) => sum + v, 0) / this.loadHistory.length
      : 0;

    const highestConsumingRoom = maxActiveRoom.power > 0 ? roomLabels[maxActiveRoom.roomId] : 'None';

    const now = new Date();
    const currHour = now.getHours();
    const peakUsageTime = `${currHour % 12 || 12}:00 ${currHour >= 12 ? 'PM' : 'AM'}`;

    const insights: AIInsights = {
      summary,
      efficiencyScore: scoreDetails.score,
      efficiencyGrade: scoreDetails.grade,
      efficiencyColor: scoreDetails.color,
      recommendations,
      anomalies,
      cards: {
        officeHealth,
        mostActiveRoom: mostActiveRoomLabel,
        highestPowerDevice,
        estimatedDailyCost
      },
      trendAnalysis: {
        status,
        peakUsageTime,
        averageHourlyUsage,
        highestConsumingRoom
      }
    };

    this.cachedInsights = insights;
    return insights;
  }

  getLatestInsights(): AIInsights {
    if (this.cachedInsights) {
      return this.cachedInsights;
    }
    
    // Return a default baseline insights object if not evaluated yet
    return {
      summary: 'Awaiting first simulation tick to initialize AI telemetry analyzer...',
      efficiencyScore: 100,
      efficiencyGrade: 'Excellent',
      efficiencyColor: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10',
      recommendations: [],
      anomalies: [],
      cards: {
        officeHealth: 'Healthy operation',
        mostActiveRoom: 'None',
        highestPowerDevice: 'None',
        estimatedDailyCost: 0
      },
      trendAnalysis: {
        status: 'STABLE',
        peakUsageTime: '2:30 PM',
        averageHourlyUsage: 0,
        highestConsumingRoom: 'None'
      }
    };
  }
}
