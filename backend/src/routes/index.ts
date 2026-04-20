import { Router } from 'express';
import projectRoutes from './projectRoutes';
import paperRoutes from './paperRoutes';
import edgeRoutes from './edgeRoutes';
import groupRoutes from './groupRoutes';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/groups', groupRoutes);
router.use('/', paperRoutes);
router.use('/', edgeRoutes);

export default router;
