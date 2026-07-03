import { Request, Response } from 'express';
import { context } from '../../context';

export class AutomationController {
  
  getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        enabled: context.automationEngine.getIsEnabled(),
        mode: context.automationEngine.getMode(),
        occupancy: context.automationEngine.getOccupancy(),
        stats: context.automationEngine.getStats()
      });
    } catch (error) {
      console.error('[Automation Controller] getStatus failed:', error);
      res.status(500).json({ error: 'Failed to retrieve automation status' });
    }
  };

  toggleEngine = async (req: Request, res: Response): Promise<void> => {
    try {
      const { enabled } = req.body;
      if (typeof enabled !== 'boolean') {
        res.status(400).json({ error: 'Payload must contain boolean "enabled" property' });
        return;
      }
      context.automationEngine.setIsEnabled(enabled);
      res.json({ success: true, enabled });
    } catch (error) {
      console.error('[Automation Controller] toggleEngine failed:', error);
      res.status(500).json({ error: 'Failed to toggle automation engine' });
    }
  };

  setMode = async (req: Request, res: Response): Promise<void> => {
    try {
      const { mode } = req.body;
      if (!mode) {
        res.status(400).json({ error: 'Payload must contain a "mode" property' });
        return;
      }
      context.automationEngine.setMode(mode);
      res.json({ success: true, mode });
    } catch (error) {
      console.error('[Automation Controller] setMode failed:', error);
      res.status(500).json({ error: 'Failed to update automation mode' });
    }
  };

  getRules = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(context.automationEngine.getRules());
    } catch (error) {
      console.error('[Automation Controller] getRules failed:', error);
      res.status(500).json({ error: 'Failed to retrieve automation rules' });
    }
  };

  createRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const rule = context.automationEngine.createRule(req.body);
      res.json(rule);
    } catch (error) {
      console.error('[Automation Controller] createRule failed:', error);
      res.status(500).json({ error: 'Failed to create automation rule' });
    }
  };

  updateRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const rule = context.automationEngine.updateRule(id, req.body);
      if (!rule) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }
      res.json(rule);
    } catch (error) {
      console.error('[Automation Controller] updateRule failed:', error);
      res.status(500).json({ error: 'Failed to update automation rule' });
    }
  };

  deleteRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const success = context.automationEngine.deleteRule(id);
      if (!success) {
        res.status(404).json({ error: 'Rule not found' });
        return;
      }
      res.json({ success: true });
    } catch (error) {
      console.error('[Automation Controller] deleteRule failed:', error);
      res.status(500).json({ error: 'Failed to delete automation rule' });
    }
  };

  getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json(context.automationEngine.getLogs());
    } catch (error) {
      console.error('[Automation Controller] getLogs failed:', error);
      res.status(500).json({ error: 'Failed to retrieve automation logs' });
    }
  };

  undo = async (req: Request, res: Response): Promise<void> => {
    try {
      const reverted = await context.automationEngine.undoLastAction();
      if (!reverted) {
        res.status(400).json({ error: 'No automation actions to undo' });
        return;
      }
      res.json({ success: true, reverted });
    } catch (error) {
      console.error('[Automation Controller] undo failed:', error);
      res.status(500).json({ error: 'Failed to revert last automation actions' });
    }
  };

  setOccupancy = async (req: Request, res: Response): Promise<void> => {
    try {
      const { room, occupied } = req.body;
      if (!room || typeof occupied !== 'boolean') {
        res.status(400).json({ error: 'Payload must contain a string "room" and a boolean "occupied"' });
        return;
      }
      const success = context.automationEngine.setOccupancy(room, occupied);
      if (!success) {
        res.status(400).json({ error: `Invalid room name: ${room}` });
        return;
      }
      res.json({ success: true, room, occupied });
    } catch (error) {
      console.error('[Automation Controller] setOccupancy failed:', error);
      res.status(500).json({ error: 'Failed to update occupancy' });
    }
  };
}
