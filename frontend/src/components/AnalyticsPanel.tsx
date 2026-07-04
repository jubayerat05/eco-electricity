import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { useLanguage } from '../context/LanguageContext';
import { Zap, BatteryCharging, TrendingUp, Leaf, Award } from 'lucide-react';
import type { RoomId } from '../types';

export const AnalyticsPanel: React.FC = () => {
  const { powerState } = useSocket();
  const { t } = useLanguage();
  const [history, setHistory] = useState<number[]>([]);

  const totalPower = powerState?.totalPowerDraw || 0;
  const kwhToday = powerState?.estimatedKwhToday || 0;
  
  // 0.385 kg CO2 per kWh grid average emissions coefficient
  const carbonKgs = kwhToday * 0.385;

  // Track history of total power draw for trend chart
  useEffect(() => {
    if (powerState) {
      setHistory((prev) => {
        const val = powerState.totalPowerDraw;
        if (prev.length === 0) {
          // Seed initial baseline telemetry points for instant chart rendering
          return [
            Math.max(0, val - 30),
            Math.max(0, val - 15),
            Math.max(0, val - 5),
            val
          ];
        }
        const next = [...prev, val];
        if (next.length > 20) {
          next.shift(); // Keep last 20 points
        }
        return next;
      });
    }
  }, [powerState]);

  const getRoomName = (room: RoomId) => {
    switch (room) {
      case 'drawing': return t('room.drawing');
      case 'work1': return t('room.work1');
      case 'work2': return t('room.work2');
    }
  };

  const getEnergyGrade = (power: number) => {
    const hour = new Date().getHours();
    const isOfficeHours = hour >= 9 && hour < 17;
    
    if (power === 0) return { grade: 'A+', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' };
    
    if (isOfficeHours) {
      if (power < 200) return { grade: 'A', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' };
      if (power < 400) return { grade: 'B', color: 'text-sky-400 border-sky-500/20 bg-sky-500/10' };
      if (power < 600) return { grade: 'C', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10' };
      if (power < 800) return { grade: 'D', color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' };
      return { grade: 'F', color: 'text-rose-400 border-rose-500/20 bg-rose-500/10' };
    } else {
      if (power < 50) return { grade: 'A', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' };
      if (power < 150) return { grade: 'C', color: 'text-yellow-400 border-yellow-500/20 bg-yellow-500/10' };
      if (power < 300) return { grade: 'D', color: 'text-amber-400 border-amber-500/20 bg-amber-500/10' };
      return { grade: 'F', color: 'text-rose-400 border-rose-500/20 bg-rose-500/10' };
    }
  };

  const gradeInfo = getEnergyGrade(totalPower);

  // Generate SVG path for trend line
  const generateTrendPath = () => {
    if (history.length < 2) return '';
    const maxVal = Math.max(...history, 150); // Min scale height equivalent to 150W
    const width = 500;
    const height = 120;
    const padding = 5;

    const points = history.map((val, idx) => {
      const x = (idx / (history.length - 1)) * (width - padding * 2) + padding;
      const y = height - ((val / maxVal) * (height - padding * 2) + padding);
      return `${x},${y}`;
    });

    return `M ${points.join(' L ')}`;
  };

  return (
    <div className="p-6 glass-panel rounded-3xl mb-6">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap size={18} className="text-yellow-400 animate-pulse" />
          {t('analytics.title')}
        </h2>
        <p className="text-xs text-slate-400">{t('analytics.subtitle')}</p>
      </div>

      {/* 4 Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Total Wattage */}
        <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/10 flex items-center gap-4">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl">
            <Zap size={22} />
          </div>
          <div>
            <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">Total Power Draw</div>
            <div className="text-xl font-black text-white">{totalPower} W</div>
          </div>
        </div>

        {/* Today's Energy */}
        <div className="p-4 rounded-2xl bg-sky-950/20 border border-sky-500/10 flex items-center gap-4">
          <div className="p-3 bg-sky-600/20 text-sky-400 rounded-xl">
            <BatteryCharging size={22} />
          </div>
          <div>
            <div className="text-[10px] text-sky-400 font-bold uppercase tracking-wider">Usage Today</div>
            <div className="text-xl font-black text-white">
              {kwhToday.toFixed(4)} <span className="text-xs font-semibold text-slate-500">kWh</span>
            </div>
          </div>
        </div>

        {/* Carbon Footprint */}
        <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/10 flex items-center gap-4">
          <div className="p-3 bg-emerald-600/20 text-emerald-400 rounded-xl">
            <Leaf size={22} />
          </div>
          <div>
            <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">CO2 Footprint</div>
            <div className="text-xl font-black text-white">
              {carbonKgs.toFixed(4)} <span className="text-xs font-semibold text-slate-500">kg</span>
            </div>
          </div>
        </div>

        {/* Energy Efficiency Grade */}
        <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 flex items-center gap-4">
          <div className="p-3 bg-indigo-650/10 text-indigo-400 rounded-xl">
            <Award size={22} />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Building Grade</div>
            <div className={`text-md font-bold px-2 py-0.5 mt-0.5 rounded border inline-block ${gradeInfo.color}`}>
              Grade {gradeInfo.grade}
            </div>
          </div>
        </div>

      </div>

      {/* Expanded Chart & Room Breakdown Split */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Room breakdown progress bars */}
        <div className="flex flex-col justify-center">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Room Load Breakdown</h3>
          <div className="flex flex-col gap-4">
            {powerState?.rooms.map((roomSummary) => {
              const roomCapacities: Record<string, number> = { drawing: 270, work1: 195, work2: 120 };
              const maxCap = roomCapacities[roomSummary.room] || 270;
              const pct = Math.min(100, Math.round((roomSummary.powerDraw / maxCap) * 100));
              return (
                <div key={roomSummary.room} className="flex flex-col gap-2">
                  <div className="flex justify-between text-xs font-semibold">
                    <span className="text-slate-300">{getRoomName(roomSummary.room)}</span>
                    <span className="text-indigo-400">{roomSummary.powerDraw} W <span className="text-[10px] text-slate-500 font-normal">({pct}%)</span></span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-950 border border-slate-900 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Expanded Live Power Trend Chart */}
        <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-850 flex flex-col justify-between min-h-[160px]">
          <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-3">
            <span>Real-time Load Curve (W)</span>
            <span className="flex items-center gap-1 text-indigo-400 animate-pulse">
              <TrendingUp size={10} /> Live Streaming
            </span>
          </div>

          <div className="w-full h-[120px] bg-slate-950/70 border border-slate-900 rounded-xl overflow-hidden flex items-end relative">
            {history.length > 1 ? (
              <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="trendGradientExpanded" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                <path
                  d={`${generateTrendPath()} L 500 120 L 0 120 Z`}
                  fill="url(#trendGradientExpanded)"
                />
                <path
                  d={generateTrendPath()}
                  fill="none"
                  stroke="#818cf8"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/20">
                <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 500 120" preserveAspectRatio="none">
                  <path
                    d="M 0 60 Q 62.5 20, 125 60 T 250 60 T 375 60 T 500 60"
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="animate-pulse"
                    style={{ animationDuration: '2s' }}
                  />
                </svg>
                <span className="relative z-10 text-[9px] text-slate-500 font-black uppercase tracking-widest animate-pulse">
                  Awaiting Telemetry Stream...
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
