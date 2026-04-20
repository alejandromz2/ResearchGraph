import { Router } from 'express';
import * as projectController from '../controllers/projectController';

const router = Router();

router.get('/', projectController.listProjects);
router.post('/', projectController.createProject);

export default router;
