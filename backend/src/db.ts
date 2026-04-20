import Database from 'better-sqlite3';
import path from 'path';

const db = new Database(path.join(__dirname, '../database.db'));

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS papers (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    title TEXT NOT NULL,
    year INTEGER,
    authors TEXT, -- JSON array
    labels TEXT, -- JSON array
    paperTags TEXT, -- JSON array
    metrics TEXT,
    dataset TEXT,
    core TEXT,
    observations TEXT,
    "group" TEXT,
    relevance INTEGER,
    importance INTEGER,
    canvasData TEXT, -- JSON Excalidraw
    pdfPath TEXT,
    pdfHighlights TEXT, -- JSON highlights
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );

  -- Migration: Add columns if they don't exist
  PRAGMA table_info(papers);
`);

try { db.exec('ALTER TABLE papers ADD COLUMN "group" TEXT'); } catch (e) {}
try { db.exec('ALTER TABLE papers ADD COLUMN relevance INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE papers ADD COLUMN importance INTEGER'); } catch (e) {}
try { db.exec('ALTER TABLE papers ADD COLUMN paperTags TEXT'); } catch (e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS edges (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    label TEXT,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (source) REFERENCES papers(id) ON DELETE CASCADE,
    FOREIGN KEY (target) REFERENCES papers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    projectId TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
  );
`);

export default db;
