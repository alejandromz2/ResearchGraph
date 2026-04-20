import axios from 'axios';
import type { Project, Paper, Edge, Group } from '../types/index';

const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
});

export const projectApi = {
  list: () => api.get<Project[]>('/projects').then(res => res.data),
  create: (name: string, description: string) => 
    api.post<Project>('/projects', { name, description }).then(res => res.data),
};

export const paperApi = {
  list: (projectId: string) => 
    api.get<Paper[]>(`/projects/${projectId}/papers`).then(res => res.data),
  listAll: () => 
    api.get<Paper[]>('/papers').then(res => res.data),
  create: (projectId: string, data: Partial<Paper>) => 
    api.post<Paper>(`/projects/${projectId}/papers`, data).then(res => res.data),
  update: (id: string, updates: Partial<Paper>) => 
    api.patch(`/papers/${id}`, updates).then(res => res.data),
  delete: (id: string) => 
    api.delete(`/papers/${id}`).then(res => res.data),
  uploadPdf: (file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return api.post<{ pdfPath: string }>('/upload-pdf', formData).then(res => res.data);
  }
};

export const edgeApi = {
  list: (projectId: string) => 
    api.get<Edge[]>(`/projects/${projectId}/edges`).then(res => res.data),
  listAll: () => 
    api.get<Edge[]>('/edges').then(res => res.data),
  create: (projectId: string, source: string, target: string, label: string) => 
    api.post<Edge>(`/projects/${projectId}/edges`, { source, target, label }).then(res => res.data),
};

export const groupApi = {
  list: (projectId: string) => 
    api.get<Group[]>(`/groups?projectId=${projectId}`).then(res => res.data),
  create: (projectId: string, name: string, description: string) => 
    api.post<Group>('/groups', { projectId, name, description }).then(res => res.data),
  update: (id: string, updates: Partial<Group>) => 
    api.patch<Group>(`/groups/${id}`, updates).then(res => res.data),
  delete: (id: string) => 
    api.delete(`/groups/${id}`).then(res => res.data),
};

export const getPdfUrl = (path: string) => `${API_URL}/pdfs/${path}`;

export default api;
