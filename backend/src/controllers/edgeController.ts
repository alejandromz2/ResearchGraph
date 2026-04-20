import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

export const listEdges = (req: Request, res: Response) => {
  try {
    const edges = db.prepare('SELECT * FROM edges WHERE projectId = ?').all(req.params.projectId);
    res.json(edges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch edges' });
  }
};

export const listAllEdges = (req: Request, res: Response) => {
  try {
    const edges = db.prepare('SELECT * FROM edges').all();
    res.json(edges);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all edges' });
  }
};

export const createEdge = (req: Request, res: Response) => {
  try {
    const { source, target, label } = req.body;
    if (!source || !target) return res.status(400).json({ error: 'Source and target are required' });
    
    const id = uuidv4();
    db.prepare('INSERT INTO edges (id, projectId, source, target, label) VALUES (?, ?, ?, ?, ?)')
      .run(id, req.params.projectId, source, target, label || '');
    res.status(201).json({ id, source, target, label });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create edge' });
  }
};

export const deleteEdge = (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM edges WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Edge not found' });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete edge' });
  }
};
