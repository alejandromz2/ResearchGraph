export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface Paper {
  id: string;
  projectId: string;
  title: string;
  year: number | null;
  authors: string; // JSON string in DB
  labels: string; // JSON string in DB
  metrics: string;
  dataset: string;
  core: string;
  observations: string;
  group: string;
  relevance: number;
  importance: number;
  canvasData: string | null; // JSON string in DB
  pdfPath: string | null;
  pdfHighlights: string; // JSON string in DB
}

export interface Edge {
  id: string;
  projectId: string;
  source: string;
  target: string;
  label: string;
}

export interface Group {
  id: string;
  projectId: string;
  name: string;
  description: string;
}
