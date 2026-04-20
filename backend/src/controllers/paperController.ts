import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../db';

export const listPapers = (req: Request, res: Response) => {
  try {
    const papers = db.prepare('SELECT * FROM papers WHERE projectId = ?').all(req.params.projectId);
    res.json(papers.map((p: any) => ({
      ...p,
      authors: JSON.parse(p.authors || '[]'),
      labels: JSON.parse(p.labels || '[]'),
      paperTags: JSON.parse(p.paperTags || '[]'),
      canvasData: p.canvasData ? JSON.parse(p.canvasData) : null,
      pdfHighlights: p.pdfHighlights ? JSON.parse(p.pdfHighlights) : []
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch papers' });
  }
};

export const listAllPapers = (req: Request, res: Response) => {
  try {
    const papers = db.prepare('SELECT * FROM papers').all();
    res.json(papers.map((p: any) => ({
      ...p,
      authors: JSON.parse(p.authors || '[]'),
      labels: JSON.parse(p.labels || '[]'),
      paperTags: JSON.parse(p.paperTags || '[]'),
      canvasData: p.canvasData ? JSON.parse(p.canvasData) : null,
      pdfHighlights: p.pdfHighlights ? JSON.parse(p.pdfHighlights) : []
    })));
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch all papers' });
  }
};

export const createPaper = (req: Request, res: Response) => {
  try {
    const { title, year, authors, labels, paperTags, group, relevance, importance } = req.body;
    if (!title) return res.status(400).json({ error: 'Paper title is required' });
    
    const id = uuidv4();
    db.prepare(`
      INSERT INTO papers (id, projectId, title, year, authors, labels, paperTags, metrics, dataset, core, observations, "group", relevance, importance, pdfHighlights)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      req.params.projectId,
      title,
      year || null,
      JSON.stringify(authors || []),
      JSON.stringify(labels || []),
      JSON.stringify(paperTags || []),
      '', '', '', '',
      group || 'Ungrouped',
      relevance || 0,
      importance || 0,
      JSON.stringify([])
    );
    res.status(201).json({ id, title, year, authors, labels, paperTags, group, relevance, importance });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create paper' });
  }
};

export const updatePaper = (req: Request, res: Response) => {
  try {
    const updates = req.body;
    const fields = Object.keys(updates);
    if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

    // Wrap field names in double quotes to handle reserved keywords like "group"
    const setClause = fields.map(f => `"${f}" = ?`).join(', ');
    const values = fields.map(f => {
      const val = updates[f];
      // For columns that are stored as JSON in the DB
      if (['authors', 'labels', 'paperTags', 'canvasData', 'pdfHighlights'].includes(f)) {
        return JSON.stringify(val);
      }
      return val;
    });

    const query = `UPDATE papers SET ${setClause} WHERE id = ?`;
    const result = db.prepare(query).run(...values, req.params.id);
    
    if (result.changes === 0) return res.status(404).json({ error: 'Paper not found' });
    res.sendStatus(200);
  } catch (err) {
    console.error('Update paper error:', err);
    res.status(500).json({ error: 'Failed to update paper' });
  }
};

export const deletePaper = (req: Request, res: Response) => {
  try {
    const result = db.prepare('DELETE FROM papers WHERE id = ?').run(req.params.id);
    if (result.changes === 0) return res.status(404).json({ error: 'Paper not found' });
    res.sendStatus(200);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete paper' });
  }
};

export const uploadPdf = (req: Request, res: Response) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  res.json({ pdfPath: req.file.filename });
};
