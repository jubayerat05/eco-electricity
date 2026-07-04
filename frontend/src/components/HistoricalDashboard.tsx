import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import {
  Clock,
  Zap,
  BarChart2,
  PieChart,
  Grid,
  Percent,
  RefreshCw,
  Sparkles
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

interface SummaryData {
  totalEnergyUsed: number;
  currentPower: number;
  avgPower: number;
  peakPower: number;
  hourlyCost: number;
  todayCost: number;
  mostActiveRoom: string;
  highestConsumingDevice: string;
  dailyEfficiencyScore: number;
  uptimeLeader: string;
  trendDirection: 'INCREASING' | 'DECREASING' | 'STABLE';
  aiInsights: string[];
}

interface HistoryEntry {
  timestamp: string;
  totalPower: number;
  roomPowers: Record<string, number>;
  deviceStates: Record<string, 'ON' | 'OFF'>;
  activeAlertsCount: number;
  efficiencyScore: number;
}

interface RoomData {
  room: string;
  name: string;
  currentPower: number;
  avgPower: number;
  todayKwh: number;
  peakPower: number;
  efficiencyScore: number;
}

interface DeviceUptime {
  deviceId: string;
  deviceName: string;
  room: string;
  type: string;
  uptimePercent: number;
  totalOnTime: number;
  totalOffTime: number;
  longestOnDuration: number;
  stateChangesCount: number;
  avgDailyRuntime: number;
}

export const HistoricalDashboard: React.FC = () => {
  const { devices, powerState } = useSocket();
  const { t } = useLanguage();
  const [range, setRange] = useState<'live' | 'hour' | 'today' | 'week'>('today');
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [rooms, setRooms] = useState<RoomData[]>([]);
  const [deviceStats, setDeviceStats] = useState<DeviceUptime[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch analytics data when range or socket changes
  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const [sumRes, histRes, roomRes, devRes] = await Promise.all([
        fetch(`${BACKEND_URL}/analytics/summary?range=${range}`),
        fetch(`${BACKEND_URL}/analytics/history?range=${range}`),
        fetch(`${BACKEND_URL}/analytics/rooms?range=${range}`),
        fetch(`${BACKEND_URL}/analytics/devices?range=${range}`)
      ]);

      const sumData = await sumRes.json();
      const histData = await histRes.json();
      const roomData = await roomRes.json();
      const devData = await devRes.json();

      setSummary(sumData);
      setHistory(histData);
      setRooms(roomData);
      setDeviceStats(devData);
    } catch (err) {
      console.error('Failed to load historical analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 5000);
    return () => clearInterval(interval);
  }, [range]);

  // SVG Helper to scale line chart path
  const renderLineChartPath = () => {
    if (history.length < 2) return '';
    const maxVal = Math.max(...history.map((h) => h.totalPower), 300);
    const minVal = 0;
    const width = 600;
    const height = 150;
    const padding = 10;

    return history
      .map((entry, index) => {
        const x = padding + (index / (history.length - 1)) * (width - padding * 2);
        const y = height - padding - ((entry.totalPower - minVal) / (maxVal - minVal)) * (height - padding * 2);
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  // SVG Helper to render fill under the line chart
  const renderAreaChartPath = () => {
    if (history.length < 2) return '';
    const width = 600;
    const height = 150;
    const padding = 10;

    const linePath = renderLineChartPath();
    const firstX = padding;
    const lastX = padding + (width - padding * 2);
    
    return `${linePath} L ${lastX.toFixed(1)} ${height - padding} L ${firstX.toFixed(1)} ${height - padding} Z`;
  };

  // Compute breakdown logic for Donut chart (Fans vs Lights wattage)
  const getFanVsLightRatio = () => {
    const fansCount = devices.filter((d) => d.status === 'ON' && d.type === 'fan').length;
    const lightsCount = devices.filter((d) => d.status === 'ON' && d.type === 'light').length;
    const fanPower = fansCount * 75;
    const lightPower = lightsCount * 15;
    const total = fanPower + lightPower;
    if (total === 0) return { fanPct: 50, lightPct: 50 };
    return {
      fanPct: Math.round((fanPower / total) * 100),
      lightPct: Math.round((lightPower / total) * 100)
    };
  };

  const ratio = getFanVsLightRatio();

  // Color mappings
  const getTrendColor = (dir: 'INCREASING' | 'DECREASING' | 'STABLE') => {
    if (dir === 'INCREASING') return 'text-rose-400 border-rose-500/20 bg-rose-500/10';
    if (dir === 'DECREASING') return 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10';
    return 'text-slate-400 border-slate-800 bg-slate-900/40';
  };

  return (
    <div className="p-6 glass-panel rounded-3xl mb-6">
      
      {/* Header and Range Filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Clock size={18} className="text-sky-400" />
            Historical Power Analytics
          </h2>
          <p className="text-xs text-slate-400">Aggregate building diagnostics and device performance auditing</p>
        </div>

        {/* Time Filter buttons */}
        <div className="flex items-center bg-slate-950/60 p-1.5 rounded-xl border border-slate-800">
          {(['live', 'hour', 'today', 'week'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all duration-300 ${
                range === r
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {r === 'live' ? 'Live (25s)' : r === 'hour' ? 'Last Hour' : r === 'today' ? 'Today' : 'Last 7 Days'}
            </button>
          ))}
        </div>
      </div>

      {loading && !summary ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <RefreshCw size={24} className="text-sky-500 animate-spin" />
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Aggregating historical databases...</span>
        </div>
      ) : summary && (
        <div>
          
          {/* 10 Analytics Widget Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            
            {/* Card 1: Total Energy */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Total Energy Used</span>
              <div className="text-lg font-black text-white mt-1 flex items-baseline gap-1">
                {summary.totalEnergyUsed.toFixed(3)}
                <span className="text-[10px] text-slate-400 font-medium">kWh</span>
              </div>
            </div>

            {/* Card 2: Current Draw */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Current Power</span>
              <div className="text-lg font-black text-sky-400 mt-1 flex items-baseline gap-1">
                {powerState?.totalPowerDraw ?? summary.currentPower}
                <span className="text-[10px] text-slate-400 font-medium">W</span>
              </div>
            </div>

            {/* Card 3: Average Power */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Average Power</span>
              <div className="text-lg font-black text-white mt-1 flex items-baseline gap-1">
                {summary.avgPower}
                <span className="text-[10px] text-slate-400 font-medium">W</span>
              </div>
            </div>

            {/* Card 4: Peak Power */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Peak Power</span>
              <div className="text-lg font-black text-white mt-1 flex items-baseline gap-1">
                {summary.peakPower}
                <span className="text-[10px] text-slate-400 font-medium">W</span>
              </div>
            </div>

            {/* Card 5: Estimated Cost */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Estimated Cost</span>
              <div className="text-lg font-black text-emerald-400 mt-1 flex items-baseline gap-0.5">
                <span className="text-sm font-sans">{t('common.currency')}</span>
                {summary.todayCost.toFixed(2)}
              </div>
            </div>

            {/* Card 6: Busiest Room */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Busiest Room</span>
              <div className="text-sm font-black text-white mt-1.5 truncate">{summary.mostActiveRoom}</div>
            </div>

            {/* Card 7: Top Device */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Highest Device</span>
              <div className="text-sm font-black text-white mt-1.5 truncate">{summary.highestConsumingDevice}</div>
            </div>

            {/* Card 8: Daily Efficiency */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Daily Score</span>
              <div className="text-lg font-black text-white mt-1 flex items-baseline gap-1">
                {summary.dailyEfficiencyScore}
                <span className="text-[10px] text-slate-400 font-medium">/100</span>
              </div>
            </div>

            {/* Card 9: Uptime Leader */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Uptime Leader</span>
              <div className="text-sm font-black text-white mt-1.5 truncate">{summary.uptimeLeader}</div>
            </div>

            {/* Card 10: Trend Direction */}
            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 hover:scale-[1.02] transition-transform duration-300">
              <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">Trend status</span>
              <div className={`text-[10px] font-black px-2 py-0.5 mt-1.5 rounded border inline-block uppercase tracking-wider ${getTrendColor(summary.trendDirection)}`}>
                {summary.trendDirection}
              </div>
            </div>

          </div>

          {/* Core Visualizations Layout Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Line/Area Power Trend Chart */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/30 border border-slate-850">
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={14} className="text-sky-400" /> Power Demand Trend
                </span>
                <span className="text-[10px] text-slate-500">Interval: {history.length} samples logged</span>
              </div>

              {history.length >= 2 ? (
                <div className="relative">
                  <svg viewBox="0 0 600 150" className="w-full h-40">
                    <defs>
                      <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0284c7" stopOpacity="0.25"/>
                        <stop offset="100%" stopColor="#0284c7" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    {/* Grid lines */}
                    <line x1="10" y1="10" x2="590" y2="10" stroke="#1e293b" strokeDasharray="3" />
                    <line x1="10" y1="75" x2="590" y2="75" stroke="#1e293b" strokeDasharray="3" />
                    <line x1="10" y1="140" x2="590" y2="140" stroke="#1e293b" strokeDasharray="3" />
                    
                    {/* Area fill */}
                    <path d={renderAreaChartPath()} fill="url(#areaGrad)" />
                    {/* Trend Line */}
                    <path
                      d={renderLineChartPath()}
                      fill="none"
                      stroke="#0284c7"
                      strokeWidth="2.5"
                      className="transition-all duration-500"
                    />
                  </svg>
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Collecting timeline coordinates...
                </div>
              )}
            </div>

            {/* Donut Chart (Energy Distribution) & Heatmap */}
            <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-850 flex flex-col justify-between">
              
              <div>
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                  <PieChart size={14} className="text-indigo-400" /> Device Distribution
                </span>
                
                <div className="flex justify-around items-center py-2">
                  {/* SVG Donut Circle */}
                  <div className="relative flex items-center justify-center">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle cx="40" cy="40" r="30" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                      <circle
                        cx="40"
                        cy="40"
                        r="30"
                        stroke="#818cf8"
                        strokeWidth="8"
                        fill="transparent"
                        strokeDasharray={188.4}
                        strokeDashoffset={188.4 - (188.4 * ratio.fanPct) / 100}
                      />
                    </svg>
                    <div className="absolute text-[9px] font-black text-white">{ratio.fanPct}% Fans</div>
                  </div>
                  
                  <div className="flex flex-col gap-2 text-[10px]">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded bg-indigo-400" />
                      <span className="text-slate-400">Smart Fans ({ratio.fanPct}%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded bg-slate-700" />
                      <span className="text-slate-400">Smart Lights ({ratio.lightPct}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Heatmap Grid */}
              <div className="pt-4 border-t border-slate-800/40">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                  <Grid size={12} className="text-sky-400" /> Hourly Load Intensity
                </span>
                <div className="grid grid-cols-12 gap-1">
                  {Array.from({ length: 24 }).map((_, i) => {
                    // Filter history entries matching hour i
                    const entriesForHour = history.filter((h) => new Date(h.timestamp).getHours() === i);
                    let hourWeight = 'bg-slate-900 border-slate-800';
                    let loadText = 'No data';

                    if (entriesForHour.length > 0) {
                      const avgLoad = entriesForHour.reduce((sum, h) => sum + h.totalPower, 0) / entriesForHour.length;
                      loadText = `${Math.round(avgLoad)}W avg`;
                      if (avgLoad > 400) {
                        hourWeight = 'bg-rose-500/80 border-rose-400/30';
                      } else if (avgLoad > 200) {
                        hourWeight = 'bg-amber-500/80 border-amber-400/30';
                      } else if (avgLoad > 50) {
                        hourWeight = 'bg-sky-500/80 border-sky-400/30';
                      } else {
                        hourWeight = 'bg-emerald-500/60 border-emerald-400/30';
                      }
                    } else if (i >= 9 && i < 17) {
                      hourWeight = 'bg-sky-500/40 border-sky-400/20';
                    }

                    return (
                      <div
                        key={i}
                        className={`h-4 rounded border ${hourWeight} hover:scale-105 transition-transform cursor-pointer`}
                        title={`Hour ${i}:00 - ${loadText}`}
                      />
                    );
                  })}
                </div>
              </div>

            </div>

          </div>

          {/* Room Comparisons & AI Bulleted Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            
            {/* Room Comparison Table & Bars */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-slate-900/30 border border-slate-850">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <BarChart2 size={14} className="text-emerald-400" /> Room Performance Comparison
              </span>
              
              <div className="flex flex-col gap-4">
                {rooms.map((room) => (
                  <div key={room.room} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-200">{room.name}</span>
                      <div className="flex items-center gap-4 text-slate-400">
                        <span>Load: <strong>{room.currentPower} W</strong></span>
                        <span>Today: <strong>{room.todayKwh.toFixed(3)} kWh</strong></span>
                      </div>
                    </div>
                    {/* SVG Bar */}
                    <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800/40">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, (room.currentPower / 300) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* AI Bulleted Insights Card */}
            <div className="p-5 rounded-2xl bg-indigo-950/10 border border-indigo-500/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5">
                <Sparkles size={80} className="text-indigo-400" />
              </div>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <Sparkles size={14} className="animate-pulse" /> AI Diagnostics Feed
              </span>
              <ul className="flex flex-col gap-3">
                {summary.aiInsights.map((insight, idx) => (
                  <li key={idx} className="text-[11px] text-slate-300 leading-normal flex gap-2 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1" />
                    {insight}
                  </li>
                ))}
              </ul>
            </div>

          </div>

          {/* Device Uptime Performance Listing */}
          <div className="p-5 rounded-2xl bg-slate-900/30 border border-slate-850">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-4">
              <Percent size={14} className="text-sky-400" /> Device Uptime & Runtime Auditing
            </span>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Device</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3 text-center">Uptime %</th>
                    <th className="py-2.5 px-3 text-center">State Changes</th>
                    <th className="py-2.5 px-3 text-right">Today's Runtime</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40 text-slate-300">
                  {deviceStats.map((stat) => (
                    <tr key={stat.deviceId} className="hover:bg-slate-800/10 transition-colors">
                      <td className="py-2.5 px-3 font-semibold text-white">{stat.deviceName}</td>
                      <td className="py-2.5 px-3 capitalize">{stat.room}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold">{stat.uptimePercent}%</span>
                          {/* Small bar */}
                          <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden inline-block">
                            <div className="h-full bg-sky-500" style={{ width: `${stat.uptimePercent}%` }} />
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold text-sky-400">{stat.stateChangesCount}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">
                        {Math.floor(stat.totalOnTime / 3600)}h {Math.floor((stat.totalOnTime % 3600) / 60)}m
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
