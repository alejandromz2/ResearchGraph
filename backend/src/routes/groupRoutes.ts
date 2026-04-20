import { Router } from 'express';
import * as groupController from '../controllers/groupController';

const router = Router();

router.get('/', groupController.listGroups);
router.post('/', groupController.createGroup);
router.patch('/:id', groupController.updateGroup);
router.delete('/:id', groupController.deleteGroup);

export default router;
