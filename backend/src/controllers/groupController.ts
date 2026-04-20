import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

export const listGroups = (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    if (!projectId) return res.status(400).json({ error: 'projectId is required' });
    
    const groups = db.prepare('SELECT * FROM groups WHERE projectId = ?').all(projectId);
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

export const createGroup = (req: Request, res: Response) => {
  try {
    const { projectId, name, description } = req.body;
    if (!projectId || !name) return res.status(400).json({ error: 'projectId and name are required' });
    
    const id = uuidv4();
    db.prepare('INSERT INTO groups (id, projectId, name, description) VALUES (?, ?, ?, ?)')
      .run(id, projectId, name, description || '');
    res.status(201).json({ id, projectId, name, description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create group' });
  }
};

export const updateGroup = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    
    const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id) as any;
    if (!group) return res.status(404).json({ error: 'Group not found' });
    
    db.prepare('UPDATE groups SET name = ?, description = ? WHERE id = ?')
      .run(name ?? group.name, description ?? group.description, id);
    
    res.json({ ...group, name: name ?? group.name, description: description ?? group.description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update group' });
  }
};

export const deleteGroup = (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM groups WHERE id = ?').run(id);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
};
