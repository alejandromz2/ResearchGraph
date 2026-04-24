import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, FileText, Layout, UploadCloud, CheckCircle, ChevronLeft, BarChart2, Database, Zap, MessageSquare, Columns2, BookOpen, Maximize2, FolderOpen, Star, TrendingUp, Tag, X, GitMerge, Book, Loader2 } from 'lucide-react';
import { paperApi, edgeApi, getPdfUrl } from '../api';
import type { Paper, Highlight } from '../types/index';
import PDFViewer from './PDFViewer';
import ExcalidrawCanvas from './ExcalidrawCanvas';
import type { ExcalidrawCanvasHandle } from './ExcalidrawCanvas';

type LayoutMode = 'pdf-form' | 'pdf-canvas' | 'canvas-only';

const NodeEditor = ({ projectId }: { projectId: string }) => {
  const { paperId } = useParams<{ paperId: string }>();
  const navigate = useNavigate();
  const canvasRef = useRef<ExcalidrawCanvasHandle>(null);
  const paperRef = useRef<Paper | null>(null);

  const [paper, setPaper] = useState<Paper | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollToHighlightId, setScrollToHighlightId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('pdf-canvas');
  const [isDragging, setIsDragging] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [leaveSaving, setLeaveSaving] = useState(false);

  useEffect(() => {
    if (paperId) {
      paperApi.list(projectId).then(papers => {
        const p = papers.find(x => x.id === paperId);
        setPaper(p || null);
        setLoading(false);
      });
    }
  }, [paperId, projectId]);

  paperRef.current = paper;

  useEffect(() => {
    if (!leaveDialogOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !leaveSaving) {
        e.preventDefault();
        setLeaveDialogOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [leaveDialogOpen, leaveSaving]);

  const handleUpdate = useCallback(async (updates: Partial<Paper>) => {
    if (!paper) return;
    const id = paper.id;
    setIsSaving(true);
    try {
      await paperApi.update(id, updates);
      setPaper((prev) => (prev && prev.id === id ? { ...prev, ...updates } as Paper : prev));
    } finally {
      setTimeout(() => setIsSaving(false), 500);
    }
  }, [paper]);

  const commitDomEdits = useCallback(async () => {
    (document.activeElement as HTMLElement | null)?.blur?.();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }, []);

  const goToProjectTable = useCallback(() => {
    setLeaveDialogOpen(false);
    navigate(`/project/${projectId}`);
  }, [navigate, projectId]);

  const openLeaveDialog = useCallback(() => setLeaveDialogOpen(true), []);

  const closeLeaveDialog = useCallback(() => {
    if (leaveSaving) return;
    setLeaveDialogOpen(false);
  }, [leaveSaving]);

  const handleLeaveSaveAndExit = useCallback(async () => {
    setLeaveSaving(true);
    try {
      await commitDomEdits();
      await new Promise((r) => setTimeout(r, 0));
      const p = paperRef.current;
      if (p) {
        await paperApi.update(p.id, {
          title: p.title,
          metrics: p.metrics,
          dataset: p.dataset,
          core: p.core,
          observations: p.observations,
          group: p.group,
          relevance: p.relevance,
          importance: p.importance,
          labels: p.labels,
          paperTags: p.paperTags,
          pdfHighlights: p.pdfHighlights,
        });
      }
      await canvasRef.current?.flushSave?.();
    } catch (e) {
      console.error(e);
      alert('No se pudieron guardar los cambios. Comprueba la conexión con el servidor e inténtalo de nuevo.');
      return;
    } finally {
      setLeaveSaving(false);
    }
    goToProjectTable();
  }, [commitDomEdits, goToProjectTable]);

  const handleLeaveDiscard = useCallback(() => {
    goToProjectTable();
  }, [goToProjectTable]);

  const setLayoutModeSafe = useCallback(
    async (id: LayoutMode) => {
      const hadCanvas = layoutMode === 'pdf-canvas' || layoutMode === 'canvas-only';
      const willHaveCanvas = id === 'pdf-canvas' || id === 'canvas-only';
      if (hadCanvas && !willHaveCanvas) {
        try {
          await commitDomEdits();
          await canvasRef.current?.flushSave?.();
        } catch (e) {
          console.error(e);
        }
      }
      setLayoutMode(id);
    },
    [commitDomEdits, layoutMode]
  );

  const handleCluster = async () => {
    if (!paper || (!paper.labels.length && !paper.paperTags.length)) {
      alert('Add some tags first!');
      return;
    }
    
    setIsSaving(true);
    const allPapers = await paperApi.list(projectId);
    const existingEdges = await edgeApi.list(projectId);
    const existingPairs = new Set(existingEdges.map(e => {
        const srcId = typeof e.source === 'object' ? (e.source as any).id : e.source;
        const tgtId = typeof e.target === 'object' ? (e.target as any).id : e.target;
        return `${srcId}_${tgtId}`;
    }));
    
    const newEdges = [];
    
    for (const other of allPapers) {
      if (other.id === paper.id) continue;
      
      const commonLabels = paper.labels.filter(t => other.labels.includes(t));
      const commonPaperTags = paper.paperTags.filter(t => other.paperTags.includes(t));
      
      if (commonLabels.length > 0 || commonPaperTags.length > 0) {
        if (!existingPairs.has(`${paper.id}_${other.id}`) && !existingPairs.has(`${other.id}_${paper.id}`)) {
          const labelsStr = commonLabels.map(t => `#${t}`).join(', ');
          const paperTagsStr = commonPaperTags.map(t => `Paper:${t}`).join(', ');
          const label = `Tags: ${[labelsStr, paperTagsStr].filter(x => x).join(' | ')}`;
          
          await edgeApi.create(projectId, paper.id, other.id, label);
          newEdges.push(other.title);
          existingPairs.add(`${paper.id}_${other.id}`);
        }
      }
    }
    
    setIsSaving(false);
    if (newEdges.length > 0) {
      alert(`Linked to ${newEdges.length} papers: ${newEdges.join(', ')}`);
    } else {
      alert('No new matches found based on tags.');
    }
  };

  const handleFile = async (file: File) => {
    const { pdfPath } = await paperApi.uploadPdf(file);
    handleUpdate({ pdfPath });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.dataTransfer?.files?.[0] || e.target.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  const handleHighlightClick = (id: string) => {
    setScrollToHighlightId(id);
    if (layoutMode === 'canvas-only') {
      setLayoutMode('pdf-canvas');
    }
  };

  const handleSendToCanvas = (highlight: Highlight) => {
    if (canvasRef.current) {
      canvasRef.current.addSnippet(highlight);
      if (layoutMode === 'pdf-form') {
        setLayoutMode('pdf-canvas');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file || file.type !== "application/pdf") return;

    handleFile(file);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full bg-white dark:bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  if (!paper) return (
    <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-slate-950">
      <p className="text-xl text-slate-500 mb-4 font-bold italic">Paper not found</p>
      <button onClick={() => navigate(`/project/${projectId}`)} className="btn-secondary">
        <ChevronLeft size={18} className="mr-2" /> Back to Table
      </button>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
      <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 shrink-0 bg-white dark:bg-slate-900 z-10 shadow-sm">
        <div className="flex items-center gap-4 flex-1">
          <button
            type="button"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors shadow-sm border border-transparent dark:border-slate-800"
            onClick={() => openLeaveDialog()}
          >
            <ChevronLeft size={24} />
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-1"></div>
          <div className="flex flex-col flex-1">
            <input
              className="text-lg font-black text-slate-900 dark:text-white bg-transparent border-none p-0 focus:ring-0 w-full tracking-tight"
              value={paper.title}
              onChange={e => handleUpdate({ title: e.target.value })}
              placeholder="Paper Title"
            />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-600 bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded tracking-tighter">NODE: {paper.id.slice(0, 8)}</span>
              {isSaving ? (
                <span className="text-[10px] text-blue-500 flex items-center gap-1 font-bold"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></div> SAVING...</span>
              ) : (
                <span className="text-[10px] text-green-600 dark:text-green-500 flex items-center gap-1 font-bold uppercase"><CheckCircle size={10} strokeWidth={3} /> Saved</span>
              )}
            </div>
          </div>
        </div>

        {/* Layout Switcher */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700 mx-4 shadow-inner">
          {[
            { id: 'pdf-form', label: 'PDF & Form', icon: BookOpen },
            { id: 'pdf-canvas', label: 'Split View', icon: Columns2 },
            { id: 'canvas-only', label: 'Only Canvas', icon: Maximize2 }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => void setLayoutModeSafe(id as LayoutMode)}
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${layoutMode === id ? 'bg-white dark:bg-slate-600 text-blue-600 dark:text-white shadow-sm' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              title={label}
            >
              <Icon size={18} />
              <span className={`text-[10px] font-black uppercase tracking-wider ${layoutMode === id ? 'block' : 'hidden'}`}>{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {!paper.pdfPath && (
            <label className="btn-secondary cursor-pointer border-dashed border-2 hover:border-blue-300 dark:hover:border-blue-800 px-4 h-10 dark:bg-slate-800 dark:border-slate-700">
              <UploadCloud size={18} className="mr-2 text-blue-500" />
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">Connect PDF</span>
              <input type="file" hidden accept="application/pdf" onChange={handleFileUpload} />
            </label>
          )}
          <button
            type="button"
            className="btn-primary px-6 h-10 shadow-lg shadow-blue-200 dark:shadow-blue-900/10"
            onClick={() => openLeaveDialog()}
          >
            <Save size={18} className="mr-2" /> Finish
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR */}
        {layoutMode === 'pdf-form' && (
          <aside className="w-[320px] border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50 dark:bg-slate-900/50 shrink-0 animate-in slide-in-from-left duration-300">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-y-auto custom-scrollbar">
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] mb-4">Annotated Metadata</h3>
              <div className="space-y-4">
                {/* Manual Tags management */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-blue-500 dark:text-blue-400 flex items-center gap-2 uppercase tracking-wider">
                      <Tag className="w-3 h-3" /> Manual Labels
                    </label>
                    <button 
                      onClick={handleCluster}
                      className="text-[9px] font-black text-blue-500 hover:text-blue-400 flex items-center gap-1 uppercase tracking-tighter bg-blue-500/10 px-1.5 py-0.5 rounded transition-all"
                      title="Connect to other papers with same tags"
                    >
                      <GitMerge size={10} /> Auto-Cluster
                    </button>
                  </div>
                  <div className="space-y-2">
                    <input
                      placeholder="#label1 #label2..."
                      className="input text-xs bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:bg-white dark:focus:bg-slate-800 shadow-inner border-slate-200/60 dark:border-slate-700/50"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget.value;
                          const newTags = input.split(/[\s,#]+/).map(t => t.trim()).filter(t => t && !paper.labels.includes(t));
                          if (newTags.length > 0) {
                            handleUpdate({ labels: [...paper.labels, ...newTags] });
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-1.5 px-1 min-h-[20px]">
                      {paper.labels.map(t => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 dark:bg-blue-900/30 text-[10px] font-bold text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 animate-in zoom-in-95"
                        >
                          #{t}
                          <button
                            onClick={() => handleUpdate({ labels: paper.labels.filter(x => x !== t) })}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Paper Tags management */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <label className="text-[10px] font-black text-fuchsia-500 dark:text-fuchsia-400 flex items-center gap-2 uppercase tracking-wider">
                      <Book className="w-3 h-3" /> Paper Source Tags
                    </label>
                  </div>
                  <div className="space-y-2">
                    <input
                      placeholder="Enter paper tag..."
                      className="input text-xs bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:bg-white dark:focus:bg-slate-800 shadow-inner border-slate-200/60 dark:border-slate-700/50"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          const input = e.currentTarget.value;
                          const newTags = input.split(/[\s,#]+/).map(t => t.trim()).filter(t => t && !paper.paperTags.includes(t));
                          if (newTags.length > 0) {
                            handleUpdate({ paperTags: [...paper.paperTags, ...newTags] });
                          }
                          e.currentTarget.value = '';
                        }
                      }}
                    />
                    <div className="flex flex-wrap gap-1.5 px-1 min-h-[20px]">
                      {paper.paperTags.map(t => (
                        <span
                          key={t}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-fuchsia-100 dark:bg-fuchsia-900/30 text-[10px] font-bold text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800/50 animate-in zoom-in-95"
                        >
                          #{t}
                          <button
                            onClick={() => handleUpdate({ paperTags: paper.paperTags.filter(x => x !== t) })}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {[
                  { id: 'group', label: 'Group', icon: FolderOpen },
                  { id: 'importance', label: 'Importance (0-5)', icon: Star, type: 'number' },
                  { id: 'relevance', label: 'Relevance (0-5)', icon: TrendingUp, type: 'number' },
                  { id: 'metrics', label: 'Metrics', icon: BarChart2 },
                  { id: 'dataset', label: 'Dataset', icon: Database },
                  { id: 'core', label: 'Core', icon: Zap },
                  { id: 'observations', label: 'Observations', icon: MessageSquare }
                ].map(({ id, label, icon: Icon, type }) => (
                  <div key={id} className="space-y-1">
                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 flex items-center gap-2 px-1 uppercase tracking-wider">
                      <Icon className="w-3 h-3" /> {label}
                    </label>
                    {type === 'number' ? (
                      <input
                        type="number" min="0" max="5"
                        className="input text-xs bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:bg-white dark:focus:bg-slate-800 shadow-inner border-slate-200/60 dark:border-slate-700/50"
                        value={(paper as any)[id] || 0}
                        onChange={e => handleUpdate({ [id]: parseInt(e.target.value) || 0 })}
                      />
                    ) : (
                      <textarea
                        className="input text-xs min-h-[70px] bg-slate-50 dark:bg-slate-800/50 dark:text-white focus:bg-white dark:focus:bg-slate-800 resize-none shadow-inner border-slate-200/60 dark:border-slate-700/50"
                        value={(paper as any)[id] || ''}
                        placeholder={`Enter ${label.toLowerCase()}...`}
                        onChange={e => handleUpdate({ [id]: e.target.value })}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 p-4 overflow-y-auto">
              <div className="flex items-center justify-between mb-4 px-1">
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">Paper Highlights</h3>
                <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-black">{paper.pdfHighlights.length}</span>
              </div>
              <div className="space-y-2">
                {paper.pdfHighlights.map(h => (
                  <div
                    key={h.id}
                    onClick={() => handleHighlightClick(h.id)}
                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all group"
                  >
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 italic mb-2 border-l-2 border-blue-200 dark:border-blue-800 pl-2">"{h.content.text}"</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter">PAGE {h.position.pageNumber}</span>
                      <span className="text-[10px] font-black text-blue-500 dark:text-blue-400 opacity-0 group-hover:opacity-100 uppercase tracking-tight">Focus PDF →</span>
                    </div>
                  </div>
                ))}
                {paper.pdfHighlights.length === 0 && (
                  <p className="text-xs text-slate-400 dark:text-slate-600 text-center py-10 bg-white dark:bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-100 dark:border-slate-800 italic font-medium">No highlights captured</p>
                )}
              </div>
            </div>
          </aside>
        )}

        <main className="flex-1 flex min-w-0 bg-slate-100 dark:bg-slate-950 gap-2 p-2 transition-colors">
          {/* CANVAS WORKSPACE */}
          {(layoutMode === 'pdf-canvas' || layoutMode === 'canvas-only') && (
            <div className={`relative bg-white dark:bg-slate-900 overflow-hidden rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm min-w-0 transition-all duration-500 ${layoutMode === 'canvas-only' ? 'flex-[1.5]' : 'flex-1'}`}>
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
                <div className="px-3 py-1.5 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm flex items-center gap-2">
                  <Layout size={14} className="text-blue-500 dark:text-blue-400" />
                  <span className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-[0.1em]">Visual Canvas</span>
                </div>
              </div>
              <ExcalidrawCanvas
                ref={canvasRef}
                paper={paper}
                onUpdate={handleUpdate}
                onHighlightClick={handleHighlightClick}
              />
            </div>
          )}

          {/* PDF ANNOTATOR */}
          {(layoutMode === 'pdf-form' || layoutMode === 'pdf-canvas') && (
            <div className={`relative bg-slate-800 dark:bg-slate-900/50 overflow-hidden rounded-[1.5rem] border border-slate-700 dark:border-slate-800 shadow-2xl min-w-0 transition-all duration-500 ${layoutMode === 'pdf-form' ? 'flex-[2]' : 'flex-1'}`}>
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 pointer-events-none">
                <div className="px-3 py-1.5 bg-slate-900/80 dark:bg-black/60 backdrop-blur-sm border border-slate-700 dark:border-slate-800 rounded-lg shadow-xl flex items-center gap-2">
                  <FileText size={14} className="text-blue-400" />
                  <span className="text-[10px] font-black text-white uppercase tracking-[0.1em]">PDF Document</span>
                </div>
              </div>
              {paper.pdfPath ? (
                <div className="h-full w-full">
                  <PDFViewer
                    url={getPdfUrl(paper.pdfPath)}
                    highlights={paper.pdfHighlights}
                    onHighlightsChange={h => handleUpdate({ pdfHighlights: h })}
                    onSendToCanvas={handleSendToCanvas}
                    scrollToHighlightId={scrollToHighlightId}
                  />
                </div>
              ) : (
                <div
                  className={`flex flex-col items-center justify-center h-full p-8 text-center transition-colors duration-200 ${isDragging ? 'bg-blue-950/60' : 'bg-slate-900 dark:bg-black/40'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-6 shadow-2xl transition-all duration-200 ${isDragging ? 'bg-blue-600/30 border-2 border-blue-500 scale-110' : 'bg-slate-800 dark:bg-slate-900 border border-slate-700 dark:border-slate-800'}`}>
                    <UploadCloud size={32} className={isDragging ? 'text-blue-400' : 'text-slate-500'} />
                  </div>
                  <h4 className={`text-lg font-black mb-2 tracking-tight uppercase transition-colors ${isDragging ? 'text-blue-300' : 'text-slate-200'}`}>
                    {isDragging ? 'Drop to Connect PDF' : 'PDF Connection Required'}
                  </h4>
                  <p className="text-sm text-slate-500 max-w-[200px] mb-8 leading-relaxed font-medium">
                    {isDragging ? 'Release to upload your PDF document.' : 'Drag & drop a PDF here, or click to browse.'}
                  </p>
                  {!isDragging && (
                    <label className="btn-primary cursor-pointer px-8 shadow-xl shadow-blue-900/20 active:scale-95 transition-all">
                      Upload Document
                      <input type="file" hidden accept="application/pdf" onChange={handleFileUpload} />
                    </label>
                  )}
                  {isDragging && (
                    <div className="border-2 border-dashed border-blue-500/50 rounded-2xl px-8 py-3 text-blue-400 text-xs font-black uppercase tracking-widest animate-pulse">
                      Release to Upload
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {leaveDialogOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm"
          role="presentation"
          onClick={() => closeLeaveDialog()}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="leave-dialog-title"
            className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="leave-dialog-title" className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                  ¿Guardar las notas de este paper?
                </h2>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Si escribiste en el lienzo (Excalidraw) o en los campos del formulario, puedes guardarlas en el servidor antes de volver a la tabla del proyecto.
                </p>
              </div>
              <button
                type="button"
                onClick={() => closeLeaveDialog()}
                disabled={leaveSaving}
                className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={leaveSaving}
                onClick={() => closeLeaveDialog()}
                className="btn-secondary h-11 justify-center"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={leaveSaving}
                onClick={() => handleLeaveDiscard()}
                className="h-11 px-4 rounded-xl font-bold text-sm border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50"
              >
                Salir sin guardar
              </button>
              <button
                type="button"
                disabled={leaveSaving}
                onClick={() => void handleLeaveSaveAndExit()}
                className="btn-primary h-11 justify-center min-w-[10rem]"
              >
                {leaveSaving ? (
                  <>
                    <Loader2 size={18} className="mr-2 animate-spin" /> Guardando…
                  </>
                ) : (
                  <>
                    <Save size={18} className="mr-2" /> Guardar y salir
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeEditor;