import { Router } from 'express';
import * as edgeController from '../controllers/edgeController';

const router = Router();

router.get('/edges', edgeController.listAllEdges);
router.get('/projects/:projectId/edges', edgeController.listEdges);
router.post('/projects/:projectId/edges', edgeController.createEdge);
router.delete('/edges/:id', edgeController.deleteEdge);

export default router;
