import { Router } from 'express';
import * as paperController from '../controllers/paperController';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

const router = Router();

// Setup PDF storage (duplicated from index.ts for modularity, could be moved to a middleware file)
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});
const upload = multer({ storage });

router.get('/papers', paperController.listAllPapers);
router.get('/projects/:projectId/papers', paperController.listPapers);
router.post('/projects/:projectId/papers', paperController.createPaper);
router.patch('/papers/:id', paperController.updatePaper);
router.delete('/papers/:id', paperController.deletePaper);
router.post('/upload-pdf', upload.single('pdf'), paperController.uploadPdf);

export default router;
