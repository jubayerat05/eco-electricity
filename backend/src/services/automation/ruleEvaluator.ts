import { Device, Alert } from '../../types';

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: 'TIME' | 'IDLE' | 'OCCUPANCY';
  condition: {
    operator: 'GREATER_THAN' | 'LESS_THAN' | 'EQUALS';
    value: string; // e.g. "17:00" for time, "15" for minutes idle, "empty" for occupancy
    room?: string; // drawing | work1 | work2
  };
  action: {
    target: 'ALL_LIGHTS' | 'ALL_FANS' | 'DEVICE';
    value: 'ON' | 'OFF';
    deviceId?: string;
  };
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class RuleEvaluator {
  private rules: AutomationRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  private initializeDefaultRules() {
    this.rules = [
      {
        id: 'rule-office-hours',
        name: 'Office Hours Rule',
        enabled: true,
        triggerType: 'TIME',
        condition: {
          operator: 'GREATER_THAN',
          value: '17:00' // after 5 PM
        },
        action: {
          target: 'ALL_LIGHTS',
          value: 'OFF'
        },
        priority: 'HIGH'
      },
      {
        id: 'rule-idle-devices',
        name: 'Idle Device Rule',
        enabled: true,
        triggerType: 'IDLE',
        condition: {
          operator: 'GREATER_THAN',
          value: '10' // 10 minutes session runtime (600s)
        },
        action: {
          target: 'ALL_FANS',
          value: 'OFF'
        },
        priority: 'MEDIUM'
      },
      // ── DRAWING ROOM OCCUPANCY ──
      {
        id: 'rule-occupancy-drawing-lights',
        name: 'Drawing Room Occupancy Lights',
        enabled: true,
        triggerType: 'OCCUPANCY',
        condition: {
          operator: 'EQUALS',
          value: 'empty',
          room: 'drawing'
        },
        action: {
          target: 'ALL_LIGHTS',
          value: 'OFF'
        },
        priority: 'HIGH'
      },
      {
        id: 'rule-occupancy-drawing-fans',
        name: 'Drawing Room Occupancy Fans',
        enabled: true,
        triggerType: 'OCCUPANCY',
        condition: {
          operator: 'EQUALS',
          value: 'empty',
          room: 'drawing'
        },
        action: {
          target: 'ALL_FANS',
          value: 'OFF'
        },
        priority: 'HIGH'
      },
      // ── WORK ROOM 1 OCCUPANCY ──
      {
        id: 'rule-occupancy-work1-lights',
        name: 'Work Room 1 Occupancy Lights',
        enabled: true,
        triggerType: 'OCCUPANCY',
        condition: {
          operator: 'EQUALS',
          value: 'empty',
          room: 'work1'
        },
        action: {
          target: 'ALL_LIGHTS',
          value: 'OFF'
        },
        priority: 'HIGH'
      },
      {
        id: 'rule-occupancy-work1-fans',
        name: 'Work Room 1 Occupancy Fans',
        enabled: true,
        triggerType: 'OCCUPANCY',
        condition: {
          operator: 'EQUALS',
          value: 'empty',
          room: 'work1'
        },
        action: {
          target: 'ALL_FANS',
          value: 'OFF'
        },
        priority: 'HIGH'
      },
      // ── WORK ROOM 2 OCCUPANCY ──
      {
        id: 'rule-occupancy-work2-lights',
        name: 'Work Room 2 Occupancy Lights',
        enabled: true,
        triggerType: 'OCCUPANCY',
        condition: {
          operator: 'EQUALS',
          value: 'empty',
          room: 'work2'
        },
        action: {
          target: 'ALL_LIGHTS',
          value: 'OFF'
        },
        priority: 'HIGH'
      },
      {
        id: 'rule-occupancy-work2-fans',
        name: 'Work Room 2 Occupancy Fans',
        enabled: true,
        triggerType: 'OCCUPANCY',
        condition: {
          operator: 'EQUALS',
          value: 'empty',
          room: 'work2'
        },
        action: {
          target: 'ALL_FANS',
          value: 'OFF'
        },
        priority: 'HIGH'
      }
    ];
  }

  getRules(): AutomationRule[] {
    return this.rules;
  }

  createRule(rule: Omit<AutomationRule, 'id'>): AutomationRule {
    const newRule = { ...rule, id: `rule-${Date.now()}` };
    this.rules.push(newRule);
    return newRule;
  }

  updateRule(id: string, updatedFields: Partial<AutomationRule>): AutomationRule | null {
    const idx = this.rules.findIndex((r) => r.id === id);
    if (idx === -1) return null;
    this.rules[idx] = { ...this.rules[idx], ...updatedFields };
    return this.rules[idx];
  }

  deleteRule(id: string): boolean {
    const startLen = this.rules.length;
    this.rules = this.rules.filter((r) => r.id !== id);
    return this.rules.length < startLen;
  }
}
