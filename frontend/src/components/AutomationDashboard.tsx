import React, { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Power, Leaf, Moon, Palmtree, Play, Pause, RotateCcw,
  Plus, Trash2, Edit3, Check, X, Shield, Activity, Clock,
  TrendingDown, Users, ChevronDown, ChevronUp,
  Settings, Eye, EyeOff, Bot
} from 'lucide-react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
const API = `${BACKEND_URL}/automation`;

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: 'TIME' | 'IDLE' | 'OCCUPANCY';
  condition: {
    operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS';
    value: string;
    room?: string;
  };
  action: {
    target: 'ALL_LIGHTS' | 'ALL_FANS' | 'DEVICE';
    value: 'ON' | 'OFF';
    deviceId?: string;
  };
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

interface AutomationLog {
  id: string;
  timestamp: string;
  room: string;
  device: string;
  ruleName: string;
  previousState: string;
  newState: string;
  powerSaved: number;
  aiExplanation: string;
}

interface AutomationStats {
  totalActionsToday: number;
  totalKwhSaved: number;
  mostTriggeredRule: string;
  devicesTurnedOffCount: number;
  successRate: number;
}

type Mode = 'NORMAL' | 'ECO' | 'NIGHT' | 'VACATION';

const roomLabels: Record<string, string> = {
  drawing: 'Drawing Room',
  work1: 'Work Room 1',
  work2: 'Work Room 2'
};

export const AutomationDashboard: React.FC = () => {
  const { socket } = useSocket();

  const [enabled, setEnabled] = useState(true);
  const [mode, setMode] = useState<Mode>('NORMAL');
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [logs, setLogs] = useState<AutomationLog[]>([]);
  const [stats, setStats] = useState<AutomationStats | null>(null);
  const [occupancy, setOccupancy] = useState<Record<string, boolean>>({});

  const [showRuleBuilder, setShowRuleBuilder] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  // Rule builder form state
  const [rbName, setRbName] = useState('');
  const [rbTrigger, setRbTrigger] = useState<'TIME' | 'IDLE' | 'OCCUPANCY'>('TIME');
  const [rbOperator, setRbOperator] = useState<'GREATER_THAN' | 'LESS_THAN' | 'EQUALS'>('GREATER_THAN');
  const [rbValue, setRbValue] = useState('');
  const [rbRoom, setRbRoom] = useState('');
  const [rbTarget, setRbTarget] = useState<'ALL_LIGHTS' | 'ALL_FANS' | 'DEVICE'>('ALL_LIGHTS');
  const [rbAction, setRbAction] = useState<'ON' | 'OFF'>('OFF');
  const [rbPriority, setRbPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('MEDIUM');

  // ── Fetch initial data ──────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    try {
      const [statusRes, rulesRes, logsRes] = await Promise.all([
        fetch(`${API}/status`),
        fetch(`${API}/rules`),
        fetch(`${API}/logs`)
      ]);
      const statusData = await statusRes.json();
      const rulesData = await rulesRes.json();
      const logsData = await logsRes.json();

      setEnabled(statusData.enabled);
      setMode(statusData.mode);
      setOccupancy(statusData.occupancy || {});
      setStats(statusData.stats || null);
      setRules(rulesData);
      setLogs(logsData);
    } catch (err) {
      console.error('[Automation] Failed to fetch:', err);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // ── WebSocket listeners ─────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data: any) => {
      if (data.stats) setStats(data.stats);
      if (data.occupancy) setOccupancy(data.occupancy);
    };

    const handleLog = (log: AutomationLog) => {
      setLogs((prev) => [log, ...prev].slice(0, 100));
    };

    const handleOccupancy = (occ: Record<string, boolean>) => {
      setOccupancy(occ);
    };

    socket.on('automationUpdated', handleUpdate);
    socket.on('automationLogged', handleLog);
    socket.on('occupancyUpdated', handleOccupancy);

    return () => {
      socket.off('automationUpdated', handleUpdate);
      socket.off('automationLogged', handleLog);
      socket.off('occupancyUpdated', handleOccupancy);
    };
  }, [socket]);

  // ── API actions ─────────────────────────────────────────────────
  const toggleEngine = async () => {
    const next = !enabled;
    await fetch(`${API}/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: next })
    });
    setEnabled(next);
  };

  const switchMode = async (m: Mode) => {
    await fetch(`${API}/mode`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: m })
    });
    setMode(m);
    setTimeout(fetchAll, 500);
  };

  const toggleRuleEnabled = async (rule: AutomationRule) => {
    const res = await fetch(`${API}/rules/${rule.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled: !rule.enabled })
    });
    const updated = await res.json();
    setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
  };

  const deleteRule = async (id: string) => {
    await fetch(`${API}/rules/${id}`, { method: 'DELETE' });
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const undoAction = async () => {
    await fetch(`${API}/undo`, { method: 'POST' });
    setTimeout(fetchAll, 500);
  };

  const toggleOccupancy = async (room: string, currentOccupied: boolean) => {
    try {
      const nextState = !currentOccupied;
      await fetch(`${API}/occupancy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room, occupied: nextState })
      });
      setOccupancy((prev) => ({ ...prev, [room]: nextState }));
    } catch (err) {
      console.error('Failed to toggle occupancy:', err);
    }
  };

  const resetRuleBuilder = () => {
    setRbName('');
    setRbTrigger('TIME');
    setRbOperator('GREATER_THAN');
    setRbValue('');
    setRbRoom('');
    setRbTarget('ALL_LIGHTS');
    setRbAction('OFF');
    setRbPriority('MEDIUM');
    setEditingRule(null);
  };

  const openEditRule = (rule: AutomationRule) => {
    setEditingRule(rule);
    setRbName(rule.name);
    setRbTrigger(rule.triggerType);
    setRbOperator(rule.condition.operator);
    setRbValue(rule.condition.value);
    setRbRoom(rule.condition.room || '');
    setRbTarget(rule.action.target);
    setRbAction(rule.action.value);
    setRbPriority(rule.priority);
    setShowRuleBuilder(true);
  };

  const submitRule = async () => {
    const payload = {
      name: rbName || 'Custom Rule',
      enabled: true,
      triggerType: rbTrigger,
      condition: {
        operator: rbOperator,
        value: rbValue,
        ...(rbRoom ? { room: rbRoom } : {})
      },
      action: {
        target: rbTarget,
        value: rbAction
      },
      priority: rbPriority
    };

    if (editingRule) {
      const res = await fetch(`${API}/rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const updated = await res.json();
      setRules((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      const res = await fetch(`${API}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const created = await res.json();
      setRules((prev) => [...prev, created]);
    }

    resetRuleBuilder();
    setShowRuleBuilder(false);
  };

  // ── Mode Card Config ────────────────────────────────────────────
  const modes: { id: Mode; label: string; icon: React.ReactNode; color: string; desc: string }[] = [
    { id: 'NORMAL', label: 'Normal', icon: <Power size={20} />, color: 'from-blue-500 to-indigo-600', desc: 'Standard operation' },
    { id: 'ECO', label: 'Eco', icon: <Leaf size={20} />, color: 'from-emerald-500 to-green-600', desc: 'Reduce consumption' },
    { id: 'NIGHT', label: 'Night', icon: <Moon size={20} />, color: 'from-violet-500 to-purple-700', desc: 'After-hours shutdown' },
    { id: 'VACATION', label: 'Vacation', icon: <Palmtree size={20} />, color: 'from-amber-500 to-orange-600', desc: 'Full building shutdown' }
  ];

  const triggerLabels: Record<string, string> = { TIME: 'Time-Based', IDLE: 'Idle Duration', OCCUPANCY: 'Occupancy Sensor' };
  const operatorLabels: Record<string, string> = { GREATER_THAN: '>', LESS_THAN: '<', EQUALS: '=' };
  const targetLabels: Record<string, string> = { ALL_LIGHTS: 'All Lights', ALL_FANS: 'All Fans', DEVICE: 'Specific Device' };
  const priorityColors: Record<string, string> = {
    HIGH: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    LOW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
  };

  return (
    <div className="mt-6 space-y-6">
      {/* ── Section Header ──────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/20">
            <Bot size={22} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Smart Automation</h2>
            <p className="text-xs text-slate-400">Intelligent energy management & device control</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Undo Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={undoAction}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <RotateCcw size={13} />
            Undo
          </motion.button>

          {/* Enable/Disable Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleEngine}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all duration-300 shadow-lg ${
              enabled
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-emerald-500/30'
                : 'bg-slate-800 border border-slate-600 text-slate-400'
            }`}
          >
            {enabled ? <Play size={14} /> : <Pause size={14} />}
            {enabled ? 'Active' : 'Paused'}
          </motion.button>
        </div>
      </div>

      {/* ── Mode Selector Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {modes.map((m) => (
          <motion.button
            key={m.id}
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => switchMode(m.id)}
            className={`relative p-4 rounded-2xl border transition-all duration-300 text-left overflow-hidden ${
              mode === m.id
                ? 'border-white/20 shadow-xl'
                : 'border-slate-700/50 hover:border-slate-600/80 bg-slate-800/40'
            }`}
          >
            {mode === m.id && (
              <div className={`absolute inset-0 bg-gradient-to-br ${m.color} opacity-20`} />
            )}
            <div className="relative z-10">
              <div className={`inline-flex p-2 rounded-lg mb-2 ${
                mode === m.id
                  ? `bg-gradient-to-br ${m.color} text-white shadow-lg`
                  : 'bg-slate-700/50 text-slate-400'
              }`}>
                {m.icon}
              </div>
              <div className={`text-sm font-bold ${mode === m.id ? 'text-white' : 'text-slate-300'}`}>
                {m.label}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">{m.desc}</div>
            </div>
            {mode === m.id && (
              <motion.div
                layoutId="modeIndicator"
                className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white shadow-lg shadow-white/50"
              />
            )}
          </motion.button>
        ))}
      </div>

      {/* ── Occupancy Detector ──────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-3">
          <Users size={16} className="text-cyan-400" />
          <span className="text-xs font-bold text-white tracking-wide">Room Occupancy Sensors</span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(occupancy).map(([room, isOccupied]) => (
            <button
              key={room}
              onClick={() => toggleOccupancy(room, isOccupied)}
              className={`flex items-center gap-2 p-3 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${
                isOccupied
                  ? 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20'
                  : 'bg-slate-700/30 border-slate-600/30 hover:bg-slate-700/50'
              }`}
              title="Click to toggle room occupancy"
            >
              <div className={`w-2.5 h-2.5 rounded-full ${
                isOccupied ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse' : 'bg-slate-500'
              }`} />
              <div>
                <div className="text-xs font-semibold text-white">{roomLabels[room] || room}</div>
                <div className={`text-[10px] font-medium ${isOccupied ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {isOccupied ? 'Occupied (Click to empty)' : 'Empty (Click to occupy)'}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Actions Today', value: stats.totalActionsToday, icon: <Activity size={16} />, color: 'text-blue-400' },
            { label: 'kWh Saved', value: stats.totalKwhSaved.toFixed(4), icon: <TrendingDown size={16} />, color: 'text-emerald-400' },
            { label: 'Devices Off', value: stats.devicesTurnedOffCount, icon: <Power size={16} />, color: 'text-amber-400' },
            { label: 'Top Rule', value: stats.mostTriggeredRule, icon: <Shield size={16} />, color: 'text-violet-400', small: true },
            { label: 'Success Rate', value: `${stats.successRate}%`, icon: <Check size={16} />, color: 'text-cyan-400' }
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-3 rounded-xl bg-slate-800/50 border border-slate-700/50"
            >
              <div className={`flex items-center gap-1.5 mb-1 ${card.color}`}>
                {card.icon}
                <span className="text-[10px] font-semibold text-slate-400">{card.label}</span>
              </div>
              <div className={`font-bold text-white ${(card as any).small ? 'text-xs truncate' : 'text-lg'}`}>
                {card.value}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* ── Rules & Rule Builder ────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-indigo-400" />
            <span className="text-sm font-bold text-white">Automation Rules</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
              {rules.length}
            </span>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { resetRuleBuilder(); setShowRuleBuilder(!showRuleBuilder); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors"
          >
            {showRuleBuilder ? <X size={13} /> : <Plus size={13} />}
            {showRuleBuilder ? 'Cancel' : 'New Rule'}
          </motion.button>
        </div>

        {/* Rule Builder Form */}
        <AnimatePresence>
          {showRuleBuilder && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-4"
            >
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-600/40 space-y-3">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <Edit3 size={13} className="text-indigo-400" />
                  {editingRule ? 'Edit Rule' : 'Create New Rule'}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Name</label>
                    <input
                      value={rbName}
                      onChange={(e) => setRbName(e.target.value)}
                      placeholder="Rule name..."
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Trigger</label>
                    <select
                      value={rbTrigger}
                      onChange={(e) => setRbTrigger(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="TIME">Time-Based</option>
                      <option value="IDLE">Idle Duration</option>
                      <option value="OCCUPANCY">Occupancy</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Operator</label>
                    <select
                      value={rbOperator}
                      onChange={(e) => setRbOperator(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="GREATER_THAN">Greater Than</option>
                      <option value="LESS_THAN">Less Than</option>
                      <option value="EQUALS">Equals</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                      {rbTrigger === 'TIME' ? 'Time (HH:MM)' : rbTrigger === 'IDLE' ? 'Minutes' : 'empty / occupied'}
                    </label>
                    <input
                      value={rbValue}
                      onChange={(e) => setRbValue(e.target.value)}
                      placeholder={rbTrigger === 'TIME' ? '17:00' : rbTrigger === 'IDLE' ? '10' : 'empty'}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Room (optional)</label>
                    <select
                      value={rbRoom}
                      onChange={(e) => setRbRoom(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="">Any Room</option>
                      <option value="drawing">Drawing Room</option>
                      <option value="work1">Work Room 1</option>
                      <option value="work2">Work Room 2</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Target</label>
                    <select
                      value={rbTarget}
                      onChange={(e) => setRbTarget(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="ALL_LIGHTS">All Lights</option>
                      <option value="ALL_FANS">All Fans</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Action</label>
                    <select
                      value={rbAction}
                      onChange={(e) => setRbAction(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="OFF">Turn OFF</option>
                      <option value="ON">Turn ON</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-400 mb-1">Priority</label>
                    <select
                      value={rbPriority}
                      onChange={(e) => setRbPriority(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                    >
                      <option value="HIGH">High</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="LOW">Low</option>
                    </select>
                  </div>
                </div>

                {/* Rule Preview */}
                <div className="p-3 rounded-lg bg-slate-800/60 border border-dashed border-slate-600/50">
                  <div className="text-[10px] font-bold text-slate-500 mb-1">RULE PREVIEW</div>
                  <div className="text-xs text-slate-300">
                    <span className="text-indigo-400 font-semibold">IF</span>{' '}
                    {triggerLabels[rbTrigger]} {operatorLabels[rbOperator]} <span className="text-cyan-400 font-mono">{rbValue || '?'}</span>
                    {rbRoom && <> <span className="text-slate-500">in</span> <span className="text-amber-400">{roomLabels[rbRoom]}</span></>}
                    {' '}<span className="text-indigo-400 font-semibold">THEN</span>{' '}
                    Turn <span className={rbAction === 'OFF' ? 'text-rose-400' : 'text-emerald-400'}>{rbAction}</span>{' '}
                    <span className="text-violet-400">{targetLabels[rbTarget]}</span>
                  </div>
                </div>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={submitRule}
                  className="w-full py-2.5 text-xs font-bold rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-shadow"
                >
                  {editingRule ? 'Update Rule' : 'Create Rule'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Rules List */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {rules.map((rule) => (
            <motion.div
              key={rule.id}
              layout
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                rule.enabled
                  ? 'bg-slate-900/40 border-slate-600/30'
                  : 'bg-slate-900/20 border-slate-700/20 opacity-60'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <button onClick={() => toggleRuleEnabled(rule)}>
                  {rule.enabled
                    ? <Eye size={14} className="text-emerald-400 hover:text-emerald-300" />
                    : <EyeOff size={14} className="text-slate-500 hover:text-slate-400" />
                  }
                </button>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold text-white truncate">{rule.name}</div>
                  <div className="text-[10px] text-slate-500">
                    {triggerLabels[rule.triggerType]} {operatorLabels[rule.condition.operator]} {rule.condition.value}
                    {' → '}{targetLabels[rule.action.target]} {rule.action.value}
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${priorityColors[rule.priority]}`}>
                  {rule.priority}
                </span>
              </div>
              <div className="flex items-center gap-1.5 ml-3">
                <button
                  onClick={() => openEditRule(rule)}
                  className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-white transition-colors"
                >
                  <Edit3 size={12} />
                </button>
                <button
                  onClick={() => deleteRule(rule.id)}
                  className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </motion.div>
          ))}
          {rules.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">
              No automation rules configured. Click "New Rule" to get started.
            </div>
          )}
        </div>
      </div>

      {/* ── Activity Timeline ───────────────────────────────────── */}
      <div className="p-4 rounded-2xl bg-slate-800/50 border border-slate-700/50 backdrop-blur-sm">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={16} className="text-amber-400" />
          <span className="text-sm font-bold text-white">Automation Activity Log</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold">
            {logs.length} events
          </span>
        </div>

        <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
          <AnimatePresence initial={false}>
            {logs.slice(0, 30).map((log) => {
              const isExpanded = expandedLog === log.id;
              const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
              const isOff = log.newState === 'OFF';

              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  layout
                  className="rounded-xl bg-slate-900/40 border border-slate-700/30 overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                    className="w-full flex items-center justify-between p-3 text-left hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        log.ruleName.includes('Vacation') ? 'bg-orange-400' :
                        log.ruleName.includes('Night') ? 'bg-violet-400' :
                        log.ruleName.includes('Eco') ? 'bg-emerald-400' :
                        log.ruleName.includes('Reversal') ? 'bg-blue-400' :
                        'bg-cyan-400'
                      }`} />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-white truncate">{log.device}</div>
                        <div className="text-[10px] text-slate-500">{log.ruleName}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {log.powerSaved > 0 && (
                        <span className="text-[10px] font-bold text-emerald-400">
                          -{log.powerSaved}W
                        </span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isOff ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>
                        {log.previousState} → {log.newState}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{logTime}</span>
                      {isExpanded ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 pt-1 border-t border-slate-700/30">
                          <div className="p-3 rounded-lg bg-slate-800/60 border border-slate-600/30">
                            <div className="flex items-start gap-2">
                              <Bot size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
                              <p className="text-xs text-slate-300 leading-relaxed">{log.aiExplanation}</p>
                            </div>
                          </div>
                          <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
                            <span>Room: <span className="text-slate-300">{roomLabels[log.room] || log.room}</span></span>
                            <span>Power Saved: <span className="text-emerald-400">{log.powerSaved}W</span></span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {logs.length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">
              No automation events yet. The engine will log actions here as rules trigger.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
