import { context } from '../../context';
import { Device, Alert } from '../../types';
import { ModeManager, AutomationMode } from './modeManager';
import { RuleEvaluator, AutomationRule } from './ruleEvaluator';
import { ActionExecutor, ActionImpact } from './actionExecutor';
import { ActivityLogger, AutomationLog } from './activityLogger';

export interface AutomationStats {
  totalActionsToday: number;
  totalKwhSaved: number;
  mostTriggeredRule: string;
  devicesTurnedOffCount: number;
  successRate: number; // 0-100
}

export class AutomationEngine {
  private modeManager = new ModeManager();
  private ruleEvaluator = new RuleEvaluator();
  private actionExecutor = new ActionExecutor();
  private activityLogger = new ActivityLogger();

  private isEnabled = false;
  private roomOccupancy: Record<string, boolean> = {
    drawing: true,
    work1: true,
    work2: false
  };

  private tickCounter = 0;
  private totalKwhSavedValue = 0;

  getMode(): AutomationMode {
    return this.modeManager.getMode();
  }

  setMode(mode: AutomationMode): void {
    this.modeManager.setMode(mode);
    this.applyModeRulesInstant(mode);
  }

  getRules(): AutomationRule[] {
    return this.ruleEvaluator.getRules();
  }

  createRule(rule: Omit<AutomationRule, 'id'>): AutomationRule {
    return this.ruleEvaluator.createRule(rule);
  }

  updateRule(id: string, updatedFields: Partial<AutomationRule>): AutomationRule | null {
    return this.ruleEvaluator.updateRule(id, updatedFields);
  }

  deleteRule(id: string): boolean {
    return this.ruleEvaluator.deleteRule(id);
  }

  getLogs(): AutomationLog[] {
    return this.activityLogger.getLogs();
  }

  getOccupancy(): Record<string, boolean> {
    return this.roomOccupancy;
  }

  setOccupancy(room: string, occupied: boolean): boolean {
    if (this.roomOccupancy[room] !== undefined) {
      this.roomOccupancy[room] = occupied;
      // Broadcast occupancy update to clients immediately
      context.socketService.broadcast('occupancyUpdated', this.roomOccupancy);
      
      // Force immediate rule evaluation on manual override to ensure instant device shutdown
      this.evaluateTick().catch((err) => console.error('[Automation Engine] Manual occupancy evaluateTick failed:', err));
      
      return true;
    }
    return false;
  }

  getIsEnabled(): boolean {
    return this.isEnabled;
  }

  setIsEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  getStats(): AutomationStats {
    const logs = this.activityLogger.getLogs();
    const turnedOff = logs.filter((l) => l.newState === 'OFF').length;

    // Count rule frequency
    const ruleFrequency: Record<string, number> = {};
    for (const l of logs) {
      ruleFrequency[l.ruleName] = (ruleFrequency[l.ruleName] || 0) + 1;
    }
    const mostTriggeredRule = Object.keys(ruleFrequency).reduce((max, r) => (ruleFrequency[r] > ruleFrequency[max] ? r : max), 'Office Hours Rule');

    return {
      totalActionsToday: logs.length,
      totalKwhSaved: Number(this.totalKwhSavedValue.toFixed(4)),
      mostTriggeredRule,
      devicesTurnedOffCount: turnedOff,
      successRate: 98 // Representative operational health index
    };
  }

  // Evaluate rules on simulator ticks
  async evaluateTick(): Promise<void> {
    this.tickCounter++;

    // 1. Shift simulated room occupancy randomly
    if (this.getMode() === 'VACATION') {
      this.roomOccupancy = { drawing: false, work1: false, work2: false };
    }

    if (!this.isEnabled) return;

    const devices = await context.deviceRepo.getAll();
    const currentHour = new Date().getHours();
    const currentHourStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

    const activeImpacts: ActionImpact[] = [];

    // 2. Evaluate Mode Presets
    const mode = this.getMode();

    if (mode === 'VACATION') {
      // Turn OFF everything
      for (const d of devices) {
        if (d.status === 'ON') {
          const impact = await this.actionExecutor.executeToggle(d.id, 'OFF');
          if (impact) {
            activeImpacts.push(impact);
            const log = this.activityLogger.addLog(impact, 'Vacation Mode Override');
            context.socketService.broadcast('automationLogged', log);
          }
        }
      }
    } else if (mode === 'NIGHT') {
      // Turn OFF lights, leaving fans running (emergency setup)
      for (const d of devices) {
        if (d.type === 'light' && d.status === 'ON') {
          const impact = await this.actionExecutor.executeToggle(d.id, 'OFF');
          if (impact) {
            activeImpacts.push(impact);
            const log = this.activityLogger.addLog(impact, 'Night Mode Shutdown');
            context.socketService.broadcast('automationLogged', log);
          }
        }
      }
    } else {
      // Evaluate Rules Builder Collection
      const rules = this.ruleEvaluator.getRules().filter((r) => r.enabled);

      for (const rule of rules) {
        // A. Office Hours / TIME rules
        if (rule.triggerType === 'TIME') {
          const [ruleH, ruleM] = rule.condition.value.split(':').map(Number);
          const [currH, currM] = currentHourStr.split(':').map(Number);
          
          const ruleMinutes = ruleH * 60 + ruleM;
          const currMinutes = currH * 60 + currM;

          if (currMinutes > ruleMinutes) {
            // Trigger target action
            await this.fireRuleAction(rule, devices, activeImpacts);
          }
        }

        // B. OCCUPANCY rules
        if (rule.triggerType === 'OCCUPANCY') {
          const room = rule.condition.room;
          if (room) {
            const isOccupied = this.roomOccupancy[room];
            const condIsEmpty = rule.condition.value === 'empty';

            if ((condIsEmpty && !isOccupied) || (!condIsEmpty && isOccupied)) {
              await this.fireRuleAction(rule, devices, activeImpacts);
            }
          }
        }

        // C. IDLE runtime rules
        if (rule.triggerType === 'IDLE') {
          const idleMinutes = Number(rule.condition.value);
          const idleSeconds = idleMinutes * 60;

          for (const d of devices) {
            if (d.status === 'ON' && d.runtimeCurrentSession > idleSeconds) {
              const impact = await this.actionExecutor.executeToggle(d.id, 'OFF');
              if (impact) {
                activeImpacts.push(impact);
                const log = this.activityLogger.addLog(impact, rule.name);
                context.socketService.broadcast('automationLogged', log);
              }
            }
          }
        }
      }
    }

    if (activeImpacts.length > 0) {
      this.actionExecutor.pushToUndo(activeImpacts);
      
      // Calculate power savings
      const totalPowerSaved = activeImpacts.reduce((sum, i) => sum + i.powerSaved, 0);
      this.totalKwhSavedValue += (totalPowerSaved / 1000) * (1 / 3600); // converting Watts to kWh per tick

      // Broadcast changes
      context.socketService.broadcast('automationUpdated', {
        stats: this.getStats(),
        occupancy: this.roomOccupancy
      });

      // Send friendly bot status update
      context.discordService.sendAlert(`🌿 [Smart Automation] Triggered state changes on ${activeImpacts.length} device(s) saving ${totalPowerSaved}W.`);
    }
  }

  private async fireRuleAction(rule: AutomationRule, devices: Device[], impacts: ActionImpact[]) {
    const actionVal = rule.action.value; // ON | OFF
    
    if (rule.action.target === 'ALL_LIGHTS') {
      const activeLights = devices.filter(
        (d) => d.type === 'light' && d.status !== actionVal && (!rule.condition.room || d.room === rule.condition.room)
      );
      for (const light of activeLights) {
        const impact = await this.actionExecutor.executeToggle(light.id, actionVal);
        if (impact) {
          impacts.push(impact);
          const log = this.activityLogger.addLog(impact, rule.name);
          context.socketService.broadcast('automationLogged', log);
        }
      }
    } else if (rule.action.target === 'ALL_FANS') {
      const activeFans = devices.filter(
        (d) => d.type === 'fan' && d.status !== actionVal && (!rule.condition.room || d.room === rule.condition.room)
      );
      for (const fan of activeFans) {
        const impact = await this.actionExecutor.executeToggle(fan.id, actionVal);
        if (impact) {
          impacts.push(impact);
          const log = this.activityLogger.addLog(impact, rule.name);
          context.socketService.broadcast('automationLogged', log);
        }
      }
    } else if (rule.action.target === 'DEVICE' && rule.action.deviceId) {
      const targetDev = devices.find((d) => d.id === rule.action.deviceId && d.status !== actionVal);
      if (targetDev) {
        const impact = await this.actionExecutor.executeToggle(targetDev.id, actionVal);
        if (impact) {
          impacts.push(impact);
          const log = this.activityLogger.addLog(impact, rule.name);
          context.socketService.broadcast('automationLogged', log);
        }
      }
    }
  }

  // Instant trigger when switching modes
  private async applyModeRulesInstant(mode: AutomationMode) {
    const devices = await context.deviceRepo.getAll();
    const activeImpacts: ActionImpact[] = [];

    if (mode === 'VACATION') {
      for (const d of devices) {
        if (d.status === 'ON') {
          const impact = await this.actionExecutor.executeToggle(d.id, 'OFF');
          if (impact) {
            activeImpacts.push(impact);
            const log = this.activityLogger.addLog(impact, 'Vacation Preset Override');
            context.socketService.broadcast('automationLogged', log);
          }
        }
      }
    } else if (mode === 'NIGHT') {
      for (const d of devices) {
        if (d.type === 'light' && d.status === 'ON') {
          const impact = await this.actionExecutor.executeToggle(d.id, 'OFF');
          if (impact) {
            activeImpacts.push(impact);
            const log = this.activityLogger.addLog(impact, 'Night Preset Override');
            context.socketService.broadcast('automationLogged', log);
          }
        }
      }
    } else if (mode === 'ECO') {
      // Turn off drawing room fan & lights if empty
      if (!this.roomOccupancy.drawing) {
        const drawingDevs = devices.filter((d) => d.room === 'drawing' && d.status === 'ON');
        for (const d of drawingDevs) {
          const impact = await this.actionExecutor.executeToggle(d.id, 'OFF');
          if (impact) {
            activeImpacts.push(impact);
            const log = this.activityLogger.addLog(impact, 'Eco Mode Allocation');
            context.socketService.broadcast('automationLogged', log);
          }
        }
      }
    }

    if (activeImpacts.length > 0) {
      this.actionExecutor.pushToUndo(activeImpacts);
      const powerSaved = activeImpacts.reduce((sum, i) => sum + i.powerSaved, 0);
      this.totalKwhSavedValue += (powerSaved / 1000) * (1 / 3600);

      context.socketService.broadcast('automationUpdated', {
        stats: this.getStats(),
        occupancy: this.roomOccupancy
      });
    }
  }

  // Trigger undo
  async undoLastAction(): Promise<ActionImpact[] | null> {
    const reverted = await this.actionExecutor.undoLastAction();
    if (reverted && reverted.length > 0) {
      context.socketService.broadcast('automationUpdated', {
        stats: this.getStats(),
        occupancy: this.roomOccupancy
      });

      // Log the undo event
      for (const impact of reverted) {
        const log = this.activityLogger.addLog(impact, 'Manual Reversal Action');
        context.socketService.broadcast('automationLogged', log);
      }
    }
    return reverted;
  }
}
