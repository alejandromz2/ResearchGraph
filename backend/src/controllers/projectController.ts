import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

export const listProjects = (req: Request, res: Response) => {
  try {
    const projects = db.prepare('SELECT * FROM projects').all();
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

export const createProject = (req: Request, res: Response) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Project name is required' });
    
    const id = uuidv4();
    db.prepare('INSERT INTO projects (id, name, description) VALUES (?, ?, ?)')
      .run(id, name, description || '');
    res.status(201).json({ id, name, description });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create project' });
  }
};
