export interface Project {
  id: string;
  name: string;
  description: string;
}

export interface Rect {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  height: number;
}

export interface Highlight {
  id: string;
  content: {
    text?: string;
    image?: string;
  };
  position: {
    boundingRect: Rect;
    rects: Rect[];
    pageNumber: number;
  };
  comment: {
    text: string;
    emoji: string;
  };
  color?: string; // New: Support for multiple highlight colors
}

export interface Paper {
  id: string;
  projectId: string;
  title: string;
  year: number | null;
  authors: string[];
  labels: string[]; // manual tags
  paperTags: string[]; // tags from the paper
  metrics: string;
  dataset: string;
  core: string;
  observations: string;
  group: string;
  relevance: number;
  importance: number;
  canvasData: any; 
  pdfPath: string | null;
  pdfHighlights: Highlight[];
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
