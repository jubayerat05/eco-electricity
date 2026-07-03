import { Router } from 'express';
import { AutomationController } from '../controllers/automation.controller';

const router = Router();
const controller = new AutomationController();

router.get('/status', controller.getStatus);
router.post('/toggle', controller.toggleEngine);
router.post('/mode', controller.setMode);
router.get('/rules', controller.getRules);
router.post('/rules', controller.createRule);
router.put('/rules/:id', controller.updateRule);
router.delete('/rules/:id', controller.deleteRule);
router.post('/undo', controller.undo);
router.post('/occupancy', controller.setOccupancy);
router.get('/logs', controller.getLogs);

export default router;
