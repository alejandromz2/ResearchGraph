import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Code, AlertCircle, Star, TrendingUp, FolderOpen } from 'lucide-react';
import bibtexParse from 'bibtex-parse-js';
import { paperApi } from '../api';
import type { Paper } from '../types/index';

interface AddPaperModalProps {
  projectId: string;
  onClose: () => void;
  onSuccess: (paper: Paper) => void;
}

const AddPaperModal = ({ projectId, onClose, onSuccess }: AddPaperModalProps) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'bibtex' | 'file'>('manual');
  const [title, setTitle] = useState('');
  const [group, setGroup] = useState('Ungrouped');
  const [relevance, setRelevance] = useState(0);
  const [importance, setImportance] = useState(0);
  const [bibtex, setBibtex] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanBibtexValue = (val: string) => {
    if (!val) return '';
    return val.replace(/^\{|\}$/g, '').replace(/\{|\}/g, '').trim();
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    setLoading(true);
    try {
      const newPaper = await paperApi.create(projectId, { title, group, relevance, importance, labels: [], paperTags: [] });
      onSuccess({ 
        ...newPaper, 
        projectId, 
        authors: [], 
        labels: [], 
        paperTags: [],
        metrics: '', 
        dataset: '', 
        core: '', 
        observations: '', 
        group, 
        relevance, 
        importance, 
        canvasData: null, 
        pdfPath: null, 
        pdfHighlights: [] 
      } as Paper);
      onClose();
    } catch (err) {
      setError('Failed to add paper');
    } finally {
      setLoading(false);
    }
  };

  const handleBibtexSubmit = async () => {
    if (!bibtex) return;
    setLoading(true);
    try {
      const parsed = bibtexParse.toJSON(bibtex);
      if (parsed.length === 0) throw new Error('Invalid BibTeX');
      const entry = parsed[0].entryTags;
      const rawAuthors = cleanBibtexValue(entry.author);
      const authors = rawAuthors ? rawAuthors.split(/\s+and\s+/i).map(a => a.trim()) : [];
      const year = entry.year ? parseInt(entry.year.replace(/\D/g, '')) : null;
      const cleanTitle = cleanBibtexValue(entry.title) || 'Untitled';
      const abstract = cleanBibtexValue(entry.abstract);
      const rawKeywords = cleanBibtexValue(entry.keywords);
      const paperTags = rawKeywords ? rawKeywords.split(/[,;]+/).map(k => k.trim()).filter(Boolean) : [];
      const labels: string[] = []; // Manual tags start empty
      
      const newPaper = await paperApi.create(projectId, { 
        title: cleanTitle, 
        year, 
        authors,
        labels,
        paperTags,
        observations: abstract,
        group: 'Ungrouped',
        relevance: 0,
        importance: 0
      });
      
      onSuccess({ ...newPaper, projectId, authors, labels, paperTags, metrics: '', dataset: '', core: '', observations: abstract, group: 'Ungrouped', relevance: 0, importance: 0, canvasData: null, pdfPath: null, pdfHighlights: [] } as Paper);
      onClose();
    } catch (err) {
      setError('Invalid BibTeX format');
    } finally {
      setLoading(false);
    }
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      if (file.name.endsWith('.bib')) {
        const text = await file.text();
        setBibtex(text);
        setActiveTab('bibtex');
      } else if (file.name.endsWith('.pdf')) {
        const { pdfPath } = await paperApi.uploadPdf(file);
        const newPaper = await paperApi.create(projectId, { title: file.name.replace('.pdf', ''), pdfPath, group: 'Ungrouped', relevance: 0, importance: 0, labels: [], paperTags: [] });
        onSuccess({ ...newPaper, projectId, authors: [], labels: [], paperTags: [], metrics: '', dataset: '', core: '', observations: '', group: 'Ungrouped', relevance: 0, importance: 0, canvasData: null, pdfPath, pdfHighlights: [] } as Paper);
        onClose();
      }
    } catch (err) {
      setError('Failed to import file');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
        <div className="p-8 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Add New Paper</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="p-1.5 bg-slate-50 dark:bg-slate-800/50 flex gap-1 m-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-inner">
          {['manual', 'bibtex', 'file'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] transition-all flex items-center justify-center gap-2 ${activeTab === tab ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-sm border border-slate-200 dark:border-slate-600' : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
            >
              {tab === 'manual' && <FileText size={14} />}
              {tab === 'bibtex' && <Code size={14} />}
              {tab === 'file' && <Upload size={14} />}
              {tab}
            </button>
          ))}
        </div>

        <div className="px-8 pb-10 pt-2 min-h-[300px]">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 text-sm font-bold animate-in fade-in slide-in-from-top-2 uppercase tracking-tight">
              <AlertCircle size={18} className="shrink-0" />
              {error}
            </div>
          )}

          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">Paper Title</label>
                <input 
                  autoFocus
                  className="input py-5 text-xl font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 bg-slate-50 dark:bg-slate-800/30 dark:text-white"
                  placeholder="e.g. Attention Is All You Need"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <FolderOpen size={12} /> Group
                  </label>
                  <input 
                    className="input bg-slate-50 dark:bg-slate-800/30 dark:text-white"
                    placeholder="e.g. LLMs, Computer Vision..."
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <Star size={12} className="text-red-400" /> Importance (0-5)
                  </label>
                  <input 
                    type="number" min="0" max="5"
                    className="input bg-slate-50 dark:bg-slate-800/30 dark:text-white"
                    value={importance}
                    onChange={e => setImportance(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                    <TrendingUp size={12} className="text-blue-400" /> Relevance (0-5)
                  </label>
                  <input 
                    type="number" min="0" max="5"
                    className="input bg-slate-50 dark:bg-slate-800/30 dark:text-white"
                    value={relevance}
                    onChange={e => setRelevance(parseInt(e.target.value) || 0)}
                  />
                </div>
              </div>

              <button disabled={!title || loading} className="btn-primary w-full py-5 text-lg font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all">
                {loading ? 'Processing...' : 'Create Paper Node'}
              </button>
            </form>
          )}

          {activeTab === 'bibtex' && (
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] px-1">BibTeX String</label>
                <textarea 
                  className="input min-h-[200px] font-mono text-xs bg-slate-50 dark:bg-slate-800/30 dark:text-blue-300 p-6 leading-relaxed shadow-inner border-slate-200 dark:border-slate-800"
                  placeholder="@article{...}"
                  value={bibtex}
                  onChange={e => setBibtex(e.target.value)}
                />
              </div>
              <button disabled={!bibtex || loading} onClick={handleBibtexSubmit} className="btn-primary w-full py-5 text-lg font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all">
                {loading ? 'Parsing...' : 'Parse & Add Paper'}
              </button>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="flex flex-col items-center justify-center h-full py-4">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3rem] p-16 flex flex-col items-center justify-center gap-6 hover:border-blue-400 dark:hover:border-blue-900 hover:bg-blue-50/20 dark:hover:bg-blue-900/10 transition-all cursor-pointer group shadow-inner bg-slate-50/30 dark:bg-slate-800/20"
              >
                <div className="w-24 h-24 bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 rounded-[2.5rem] flex items-center justify-center group-hover:scale-110 transition-all shadow-2xl shadow-blue-100 dark:shadow-none border border-slate-100 dark:border-slate-700">
                  <Upload size={40} />
                </div>
                <div className="text-center">
                  <p className="font-black text-slate-900 dark:text-white text-xl tracking-tight">Choose a file to import</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500 mt-2 font-bold uppercase tracking-widest italic">PDF or BibTeX</p>
                </div>
              </div>
              <input type="file" hidden ref={fileInputRef} accept=".pdf,.bib" onChange={handleFileImport} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddPaperModal;
