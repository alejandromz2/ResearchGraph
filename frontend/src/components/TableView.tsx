import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Edit2, Trash2, FileText, BarChart2, Database, Zap,
  MessageSquare, ChevronDown, ChevronRight, Layers, ArrowUpDown,
  ArrowUp, ArrowDown, Star, TrendingUp, FolderOpen, GripVertical,
  PenLine, Check, X, Info, Tag, Book
} from 'lucide-react';
import { paperApi, groupApi } from '../api';
import type { Paper, Group } from '../types/index';
import AddPaperModal from './AddPaperModal';

type Mode = 'general' | 'research';
type SortField = 'none' | 'importance' | 'relevance' | 'score';
type SortDir = 'asc' | 'desc';

// ─── AddGroupModal ───────────────────────────────────────────────────────────

const AddGroupModal = ({
  projectId,
  onClose,
  onSuccess,
}: {
  projectId: string;
  onClose: () => void;
  onSuccess: (group: Group) => void;
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const group = await groupApi.create(projectId, name.trim(), description.trim());
      onSuccess(group);
      onClose();
    } catch (err) {
      alert('Failed to create group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-8 pt-8 pb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <FolderOpen size={20} />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Create Group</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Group Name</label>
              <input
                autoFocus
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Methodology, Literature Review..."
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Description (Optional)</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="What is this group about?"
                rows={3}
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all dark:text-white resize-none"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!name.trim() || loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all"
              >
                {loading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const RESEARCH_COLS = [
  { key: 'metrics',      label: 'Metrics',      icon: BarChart2,     accent: 'text-blue-500 dark:text-blue-400',    bg: 'bg-blue-50 dark:bg-blue-900/20',    border: 'border-blue-100 dark:border-blue-900/40'   },
  { key: 'dataset',      label: 'Dataset',      icon: Database,      accent: 'text-emerald-500 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-900/40' },
  { key: 'core',         label: 'Core',         icon: Zap,           accent: 'text-amber-500 dark:text-amber-400',  bg: 'bg-amber-50 dark:bg-amber-900/20',  border: 'border-amber-100 dark:border-amber-900/40' },
  { key: 'observations', label: 'Observations', icon: MessageSquare, accent: 'text-violet-500 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-900/20', border: 'border-violet-100 dark:border-violet-900/40' },
] as const;

// ─── Score utilities ──────────────────────────────────────────────────────────

const getCompositeScore = (p: Paper): number => {
  const imp = (p as any).importance ?? 0;
  const rel = (p as any).relevance ?? 0;
  return imp * 0.6 + rel * 0.4;
};

const getRowAccent = (p: Paper) => {
  const score = getCompositeScore(p);
  if (score >= 4.2) return {
    border: 'border-l-4 border-l-emerald-400 dark:border-l-emerald-500',
    bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
    badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300',
    label: 'Critical',
  };
  if (score >= 3) return {
    border: 'border-l-4 border-l-blue-400 dark:border-l-blue-500',
    bg: 'bg-blue-50/40 dark:bg-blue-900/10',
    badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300',
    label: 'High',
  };
  if (score >= 1.5) return {
    border: 'border-l-4 border-l-amber-400 dark:border-l-amber-500',
    bg: 'bg-amber-50/40 dark:bg-amber-900/10',
    badge: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300',
    label: 'Medium',
  };
  return {
    border: 'border-l-4 border-l-slate-200 dark:border-l-slate-700',
    bg: '',
    badge: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
    label: 'Low',
  };
};

// ─── Inline score editor ──────────────────────────────────────────────────────

const InlineScoreDots = ({
  value,
  type,
  paperId,
  onUpdate,
}: {
  value: number | undefined;
  type: 'importance' | 'relevance';
  paperId: string;
  onUpdate: (id: string, field: 'importance' | 'relevance', val: number) => void;
}) => {
  const v = value ?? 0;
  const [hovered, setHovered] = useState<number | null>(null);

  const display = hovered ?? v;

  const filledColor =
    type === 'importance'
      ? display >= 4 ? 'bg-red-400 dark:bg-red-500'
        : display >= 2 ? 'bg-amber-400 dark:bg-amber-500'
        : 'bg-slate-400 dark:bg-slate-500'
      : display >= 4 ? 'bg-blue-500 dark:bg-blue-400'
        : display >= 2 ? 'bg-sky-400 dark:bg-sky-500'
        : 'bg-slate-400 dark:bg-slate-500';

  return (
    <div className="flex flex-col gap-1 min-w-[80px] group/score">
      <div className="flex gap-0.5 items-center" title={`Click a dot to set ${type}`}>
        {[1, 2, 3, 4, 5].map(i => (
          <button
            key={i}
            type="button"
            className={`w-3 h-3 rounded-full transition-all hover:scale-125 cursor-pointer focus:outline-none ${
              i <= display ? filledColor : 'bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600'
            }`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onUpdate(paperId, type, i === v ? 0 : i)}
          />
        ))}
        <span className="ml-1.5 text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums w-6">
          {v}/5
        </span>
      </div>
      <span className="text-[9px] text-slate-300 dark:text-slate-600 opacity-0 group-hover/score:opacity-100 transition-opacity font-medium">
        click to edit
      </span>
    </div>
  );
};

// ─── Research cell ────────────────────────────────────────────────────────────

const ResearchCell = ({
  value,
  col,
}: {
  value: string | undefined;
  col: (typeof RESEARCH_COLS)[number];
}) => (
  <td className="px-4 py-4 align-top" style={{ minWidth: '180px', maxWidth: '240px' }}>
    <div className={`rounded-xl border ${col.border} ${col.bg} p-3 h-full flex flex-col gap-1.5`}>
      {!value ? (
        <p className="text-[11px] text-slate-300 dark:text-slate-700 italic font-medium leading-snug">—</p>
      ) : (
        <p className="text-[12px] text-slate-700 dark:text-slate-300 font-medium leading-snug line-clamp-12 whitespace-pre-line">
          {value}
        </p>
      )}
    </div>
  </td>
);

// ─── Sort header button ───────────────────────────────────────────────────────

const SortButton = ({
  field,
  label,
  active,
  dir,
  onClick,
}: {
  field: SortField;
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
      active
        ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900 shadow-lg'
        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
    }`}
  >
    {label}
    {active ? (
      dir === 'desc' ? <ArrowDown size={10} strokeWidth={3} /> : <ArrowUp size={10} strokeWidth={3} />
    ) : (
      <ArrowUpDown size={10} strokeWidth={2} />
    )}
  </button>
);

// ─── Group header row ─────────────────────────────────────────────────────────

const GroupHeader = ({
  name,
  count,
  isOpen,
  colSpan,
  description,
  onToggle,
  onRename,
  onDescriptionChange,
  isDragOver,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
}: {
  name: string;
  count: number;
  isOpen: boolean;
  colSpan: number;
  description: string;
  onToggle: () => void;
  onRename: (newName: string) => void;
  onDescriptionChange: (desc: string) => void;
  isDragOver: boolean;
  onDragEnter: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) => {
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [nameVal, setNameVal] = useState(name);
  const [descVal, setDescVal] = useState(description);
  const nameRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setNameVal(name); }, [name]);
  useEffect(() => { setDescVal(description); }, [description]);

  const commitName = () => {
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== name) onRename(trimmed);
    else setNameVal(name);
    setEditingName(false);
  };

  const commitDesc = () => {
    onDescriptionChange(descVal.trim());
    setEditingDesc(false);
  };

  return (
    <tr 
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`select-none transition-all duration-200 ${
        isDragOver 
          ? 'bg-blue-50/80 dark:bg-blue-900/30 scale-[1.01] ring-2 ring-blue-400 dark:ring-blue-500 ring-inset z-10' 
          : 'bg-slate-50/50 dark:bg-slate-800/20'
      }`}
    >
      <td colSpan={colSpan} className="px-6 py-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Collapse toggle */}
          <button
            onClick={onToggle}
            className="w-6 h-6 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            {isOpen ? <ChevronDown size={12} strokeWidth={3} /> : <ChevronRight size={12} strokeWidth={3} />}
          </button>

          <div className={`p-1.5 rounded-lg ${isDragOver ? 'bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'} transition-colors`}>
            <FolderOpen size={14} className="shrink-0" />
          </div>

          {/* Editable group name */}
          {editingName ? (
            <div className="flex items-center gap-1">
              <input
                ref={nameRef}
                value={nameVal}
                onChange={e => setNameVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitName(); if (e.key === 'Escape') { setNameVal(name); setEditingName(false); } }}
                autoFocus
                className="text-[11px] font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-500 rounded-md px-2 py-0.5 outline-none w-32"
              />
              <button onClick={commitName} className="text-emerald-500 hover:text-emerald-600"><Check size={12} /></button>
              <button onClick={() => { setNameVal(name); setEditingName(false); }} className="text-slate-400 hover:text-red-500"><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => { if (name !== 'Ungrouped') setEditingName(true); }}
              className={`text-[11px] font-black uppercase tracking-widest transition-colors flex items-center gap-1 group/name ${
                name === 'Ungrouped' 
                  ? 'text-slate-400 dark:text-slate-500 cursor-default' 
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer'
              }`}
            >
              {name}
              {name !== 'Ungrouped' && <PenLine size={9} className="opacity-0 group-hover/name:opacity-60 transition-opacity" />}
            </button>
          )}

          <span className={`px-2 py-0.5 text-[9px] font-black rounded-full transition-colors ${
            isDragOver ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400'
          }`}>
            {count}
          </span>

          {/* Description */}
          {editingDesc ? (
            <div className="flex items-center gap-1 flex-1 max-w-sm">
              <input
                ref={descRef}
                value={descVal}
                onChange={e => setDescVal(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') commitDesc(); if (e.key === 'Escape') { setDescVal(description); setEditingDesc(false); } }}
                autoFocus
                placeholder="Group description..."
                className="text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-500 rounded-md px-2 py-0.5 outline-none flex-1 font-medium"
              />
              <button onClick={commitDesc} className="text-emerald-500 hover:text-emerald-600 shrink-0"><Check size={12} /></button>
              <button onClick={() => { setDescVal(description); setEditingDesc(false); }} className="text-slate-400 hover:text-red-500 shrink-0"><X size={12} /></button>
            </div>
          ) : (
            <button
              onClick={() => setEditingDesc(true)}
              className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600 italic hover:text-slate-600 dark:hover:text-slate-400 transition-colors group/desc"
            >
              <Info size={10} className="shrink-0" />
              <span>{description || <span className="opacity-50">Add description…</span>}</span>
              <PenLine size={9} className="opacity-0 group-hover/desc:opacity-60 transition-opacity shrink-0" />
            </button>
          )}

          {isDragOver && (
            <span className="ml-auto text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest animate-bounce">
              Release to move here
            </span>
          )}

          <div className={`flex-1 h-px ml-1 min-w-[20px] transition-colors ${isDragOver ? 'bg-blue-200 dark:bg-blue-800' : 'bg-slate-100 dark:bg-slate-800'}`} />
        </div>
      </td>
    </tr>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

const TableView = ({ projectId }: { projectId: string }) => {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [mode, setMode] = useState<Mode>('general');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [sortField, setSortField] = useState<SortField>('none');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [groupingEnabled, setGroupingEnabled] = useState(true);

  // Drag state
  const [draggingPaperId, setDraggingPaperId] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const dragCounter = useRef<Record<string, number>>({});

  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      paperApi.list(projectId),
      groupApi.list(projectId)
    ]).then(([papersData, groupsData]) => {
      setPapers(papersData);
      setGroups(groupsData);
    });
  }, [projectId]);

  const handleAddSuccess = (newPaper: Paper) => setPapers(prev => [...prev, newPaper]);
  
  const handleCreateGroupSuccess = (newGroup: Group) => {
    setGroups(prev => [...prev, newGroup]);
  };

  const handleCreateGroup = () => {
    setIsGroupModalOpen(true);
  };

  const handleRenameGroup = async (oldName: string, newName: string) => {
    const group = groups.find(g => g.name === oldName);
    if (!group) return;
    
    try {
      const updatedGroup = await groupApi.update(group.id, { name: newName });
      setGroups(prev => prev.map(g => g.id === group.id ? updatedGroup : g));
      
      // Update all papers in that group
      setPapers(prev => prev.map(p => {
        if ((p as any).group === oldName) {
          const updated = { ...p, group: newName } as any;
          paperApi.update(p.id, { group: newName }).catch(console.error);
          return updated;
        }
        return p;
      }));
    } catch (err) {
      alert('Failed to rename group');
    }
  };

  const handleGroupDescriptionChange = async (groupName: string, description: string) => {
    const group = groups.find(g => g.name === groupName);
    if (!group) return;

    try {
      const updatedGroup = await groupApi.update(group.id, { description });
      setGroups(prev => prev.map(g => g.id === group.id ? updatedGroup : g));
    } catch (err) {
      console.error('Failed to update group description');
    }
  };

  const handleDeletePaper = async (e: React.MouseEvent, id: string, title: string) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      await paperApi.delete(id);
      setPapers(prev => prev.filter(p => p.id !== id));
    } catch {
      alert('Failed to delete paper');
    }
  };

  // ─── Inline score update ─────────────────────────────────────────────────

  const handleScoreUpdate = useCallback(async (id: string, field: 'importance' | 'relevance', val: number) => {
    setPapers(prev => prev.map(p => p.id === id ? { ...p, [field]: val } as any : p));
    try {
      await paperApi.update(id, { [field]: val });
    } catch {
      console.error('Failed to update score');
    }
  }, []);

  // ─── Drag handlers ────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, paperId: string) => {
    setDraggingPaperId(paperId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', paperId);
  };

  const handleDragEnd = () => {
    setDraggingPaperId(null);
    setDragOverGroup(null);
    dragCounter.current = {};
  };

  const handleGroupDragEnter = (e: React.DragEvent, groupName: string) => {
    e.preventDefault();
    dragCounter.current[groupName] = (dragCounter.current[groupName] || 0) + 1;
    setDragOverGroup(groupName);
  };

  const handleGroupDragLeave = (e: React.DragEvent, groupName: string) => {
    dragCounter.current[groupName] = (dragCounter.current[groupName] || 0) - 1;
    if (dragCounter.current[groupName] <= 0) {
      dragCounter.current[groupName] = 0;
      setDragOverGroup(prev => prev === groupName ? null : prev);
    }
  };

  const handleGroupDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnGroup = async (e: React.DragEvent, targetGroup: string) => {
    e.preventDefault();
    const paperId = e.dataTransfer.getData('text/plain') || draggingPaperId;
    if (!paperId) return;

    const paper = papers.find(p => p.id === paperId);
    if (!paper || (paper as any).group === targetGroup) {
      setDragOverGroup(null);
      setDraggingPaperId(null);
      return;
    }

    setPapers(prev => prev.map(p =>
      p.id === paperId ? { ...p, group: targetGroup } as any : p
    ));
    setDragOverGroup(null);
    setDraggingPaperId(null);

    try {
      await paperApi.update(paperId, { group: targetGroup });
    } catch {
      console.error('Failed to update group');
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'desc') setSortDir('asc');
      else { setSortField('none'); setSortDir('desc'); }
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const toggleGroup = (name: string) =>
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });

  const sortedPapers = useMemo(() => {
    if (sortField === 'none') return [...papers];
    return [...papers].sort((a, b) => {
      let aVal = 0, bVal = 0;
      if (sortField === 'importance') { aVal = (a as any).importance ?? 0; bVal = (b as any).importance ?? 0; }
      else if (sortField === 'relevance') { aVal = (a as any).relevance ?? 0; bVal = (b as any).relevance ?? 0; }
      else if (sortField === 'score') { aVal = getCompositeScore(a); bVal = getCompositeScore(b); }
      return sortDir === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [papers, sortField, sortDir]);

  const groupedPapers = useMemo(() => {
    if (!groupingEnabled) return [{ name: '__all__', papers: sortedPapers }];

    const map = new Map<string, Paper[]>();
    
    // 1. Add all persistent groups from the database first
    groups.forEach(g => map.set(g.name, []));
    
    // 2. Add 'Ungrouped' as a default
    if (!map.has('Ungrouped')) map.set('Ungrouped', []);

    // 3. Populate with papers
    for (const p of sortedPapers) {
      const g = (p as any).group || 'Ungrouped';
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(p);
    }

    const entries = [...map.entries()].sort(([a], [b]) => {
      if (a === 'Ungrouped') return 1;
      if (b === 'Ungrouped') return -1;
      return a.localeCompare(b);
    });
    return entries.map(([name, papers]) => ({ 
      name, 
      papers,
      description: groups.find(g => g.name === name)?.description || ''
    }));
  }, [sortedPapers, groupingEnabled, groups]);

  // Create a lookup for group descriptions
  const groupMeta = useMemo(() => {
    const meta: Record<string, { description: string }> = {};
    groups.forEach(g => {
      meta[g.name] = { description: g.description || '' };
    });
    // Ensure Ungrouped has a description
    if (!meta['Ungrouped']) {
      meta['Ungrouped'] = { description: '' };
    }
    return meta;
  }, [groups]);

  const colSpan = mode === 'general' ? 8 : 7;

  return (
    <div className="space-y-6">
      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Mode toggle */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm inline-flex">
            {(['general', 'research'] as Mode[]).map(m => (
              <button
                key={m}
                className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                  mode === m
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
                onClick={() => setMode(m)}
              >
                {m === 'general' ? 'General' : 'Research'}
              </button>
            ))}
          </div>

          {/* Sort controls */}
          <div className="bg-white dark:bg-slate-900 px-2 py-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm inline-flex items-center gap-1">
            <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest px-1.5">Sort</span>
            <SortButton field="importance" label="Importance" active={sortField === 'importance'} dir={sortDir} onClick={() => toggleSort('importance')} />
            <SortButton field="relevance"  label="Relevance"  active={sortField === 'relevance'}  dir={sortDir} onClick={() => toggleSort('relevance')} />
            <SortButton field="score"      label="Score"      active={sortField === 'score'}      dir={sortDir} onClick={() => toggleSort('score')} />
          </div>

          {/* Grouping toggle */}
          <button
            onClick={() => setGroupingEnabled(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-[10px] font-black uppercase tracking-wider transition-all shadow-sm ${
              groupingEnabled
                ? 'bg-slate-800 dark:bg-white border-slate-800 dark:border-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-600'
            }`}
          >
            <Layers size={12} strokeWidth={2.5} />
            Groups
          </button>

          {/* Create group button */}
          {groupingEnabled && (
            <button
              onClick={handleCreateGroup}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:border-slate-400 dark:hover:border-slate-600 transition-all bg-white dark:bg-slate-900 shadow-sm"
            >
              <Plus size={12} strokeWidth={2.5} />
              New Group
            </button>
          )}
        </div>

        <button
          className="btn-primary py-3 px-6 rounded-2xl shadow-xl shadow-blue-500/20 flex items-center"
          onClick={() => setIsModalOpen(true)}
        >
          <Plus size={20} className="mr-2" /> Add New Paper
        </button>
      </div>

      {/* ── Score legend + drag hint ── */}
      <div className="flex items-center gap-2 flex-wrap justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase tracking-widest">Priority</span>
          {[
            { label: 'Critical', cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' },
            { label: 'High',     cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800' },
            { label: 'Medium',   cls: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800' },
            { label: 'Low',      cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700' },
          ].map(({ label, cls }) => (
            <span key={label} className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${cls}`}>
              {label}
            </span>
          ))}
          <span className="text-[9px] text-slate-300 dark:text-slate-700 font-medium ml-1">
            score = importance × 0.6 + relevance × 0.4
          </span>
        </div>
        {groupingEnabled && (
          <span className="text-[9px] text-slate-300 dark:text-slate-600 font-medium flex items-center gap-1">
            <GripVertical size={10} /> drag rows to reassign group
          </span>
        )}
      </div>

      {/* ── Table ── */}
      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                {groupingEnabled && <th className="w-8" />}
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]" style={{ minWidth: '220px' }}>
                  Title
                </th>
                <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ minWidth: '110px' }}>
                  <div className="flex items-center gap-1.5 text-red-400 dark:text-red-500">
                    <Star size={11} strokeWidth={3} />
                    <span>Import.</span>
                  </div>
                </th>
                <th className="px-5 py-5 text-[10px] font-black uppercase tracking-[0.2em]" style={{ minWidth: '110px' }}>
                  <div className="flex items-center gap-1.5 text-blue-400 dark:text-blue-500">
                    <TrendingUp size={11} strokeWidth={3} />
                    <span>Relev.</span>
                  </div>
                </th>

                {mode === 'general' ? (
                  <>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Year</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Authors</th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                        <div className="flex items-center gap-1.5 text-blue-500">
                            <Tag size={12} />
                            <span>Labels</span>
                        </div>
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                         <div className="flex items-center gap-1.5 text-fuchsia-500">
                            <Book size={12} />
                            <span>Source Tags</span>
                        </div>
                    </th>
                  </>
                ) : (
                  RESEARCH_COLS.map(col => {
                    const Icon = col.icon;
                    return (
                      <th key={col.key} className="px-4 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]" style={{ minWidth: '180px' }}>
                        <div className={`flex items-center gap-1.5 ${col.accent}`}>
                          <Icon size={12} strokeWidth={2.5} />
                          <span>{col.label}</span>
                        </div>
                      </th>
                    );
                  })
                )}

                <th className="px-8 py-5 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] text-right">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {papers.length === 0 ? (
                <tr>
                  <td colSpan={colSpan + (groupingEnabled ? 1 : 0)} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center mb-4 text-slate-300 dark:text-slate-700 border border-slate-100 dark:border-slate-800">
                        <FileText size={32} />
                      </div>
                      <p className="text-slate-400 dark:text-slate-600 font-medium italic mb-1">Your library is empty</p>
                      <p className="text-xs text-slate-300 dark:text-slate-700">Click "Add New Paper" to populate your project</p>
                    </div>
                  </td>
                </tr>
              ) : (
                groupedPapers.map(({ name, papers: groupPapers }) => {
                  const isCollapsed = collapsedGroups.has(name);
                  const showHeader = groupingEnabled && name !== '__all__';
                  const isDragOver = dragOverGroup === name;

                  return (
                    <React.Fragment key={name}>
                      {showHeader && (
                        <GroupHeader
                          name={name}
                          count={groupPapers.length}
                          isOpen={!isCollapsed}
                          colSpan={colSpan + 1}
                          description={groupMeta[name]?.description || ''}
                          onToggle={() => toggleGroup(name)}
                          onRename={(newName) => handleRenameGroup(name, newName)}
                          onDescriptionChange={(desc) => handleGroupDescriptionChange(name, desc)}
                          isDragOver={isDragOver}
                          onDragEnter={e => handleGroupDragEnter(e, name)}
                          onDragLeave={e => handleGroupDragLeave(e, name)}
                          onDragOver={handleGroupDragOver}
                          onDrop={e => handleDropOnGroup(e, name)}
                        />
                      )}

                      {!isCollapsed && groupPapers.map(p => {
                        const accent = getRowAccent(p);
                        const isDragging = draggingPaperId === p.id;

                        return (
                          <tr
                            key={p.id}
                            draggable={groupingEnabled}
                            onDragStart={e => handleDragStart(e, p.id)}
                            onDragEnd={handleDragEnd}
                            className={`hover:brightness-95 dark:hover:brightness-110 transition-all group ${accent.border} ${accent.bg} ${isDragging ? 'opacity-40 scale-95' : ''}`}
                          >
                            {/* Drag handle */}
                            {groupingEnabled && (
                              <td className="pl-3 pr-0 py-5 align-top w-8">
                                <div className="flex items-center justify-center h-full pt-1 cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <GripVertical size={14} strokeWidth={2} />
                                </div>
                              </td>
                            )}

                            {/* Title */}
                            <td className="px-8 py-5 align-top">
                              <div className="flex items-start gap-3">
                                <div className={`w-9 h-9 mt-0.5 rounded-xl flex items-center justify-center shrink-0 shadow-inner text-[10px] font-black ${accent.badge}`}>
                                  <FileText size={15} />
                                </div>
                                <div>
                                  <span className="font-bold text-slate-900 dark:text-white text-sm leading-snug line-clamp-2 block">
                                    {p.title}
                                  </span>
                                  <span className={`mt-1 inline-block px-2 py-0.5 text-[8px] font-black uppercase tracking-wider rounded-md ${accent.badge}`}>
                                    {accent.label}
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* Importance — inline editable */}
                            <td className="px-5 py-5 align-top">
                              <InlineScoreDots
                                value={(p as any).importance}
                                type="importance"
                                paperId={p.id}
                                onUpdate={handleScoreUpdate}
                              />
                            </td>

                            {/* Relevance — inline editable */}
                            <td className="px-5 py-5 align-top">
                              <InlineScoreDots
                                value={(p as any).relevance}
                                type="relevance"
                                paperId={p.id}
                                onUpdate={handleScoreUpdate}
                              />
                            </td>

                            {mode === 'general' ? (
                              <>
                                <td className="px-8 py-5 align-top text-sm font-medium text-slate-500 dark:text-slate-400">
                                  {p.year || <span className="text-slate-300 dark:text-slate-700 italic">—</span>}
                                </td>
                                <td className="px-8 py-5 align-top text-sm font-medium text-slate-500 dark:text-slate-400 max-w-[200px]">
                                  <span className="line-clamp-2">
                                    {p.authors.join(', ') || <span className="text-slate-300 dark:text-slate-700 italic">—</span>}
                                  </span>
                                </td>
                                <td className="px-8 py-5 align-top">
                                  <div className="flex gap-1.5 flex-wrap">
                                    {p.labels.length > 0 ? (
                                      p.labels.map(l => (
                                        <span key={l} className="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] font-black uppercase rounded-lg tracking-wider border border-blue-200 dark:border-blue-800/50">
                                          {l}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-700 italic text-xs font-medium">None</span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-8 py-5 align-top">
                                  <div className="flex gap-1.5 flex-wrap">
                                    {p.paperTags && p.paperTags.length > 0 ? (
                                      p.paperTags.map(l => (
                                        <span key={l} className="px-2.5 py-1 bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-300 text-[10px] font-black uppercase rounded-lg tracking-wider border border-fuchsia-200 dark:border-fuchsia-800/50">
                                          {l}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-slate-300 dark:text-slate-700 italic text-xs font-medium">None</span>
                                    )}
                                  </div>
                                </td>
                              </>
                            ) : (
                              RESEARCH_COLS.map(col => (
                                <ResearchCell key={col.key} value={(p as any)[col.key]} col={col} />
                              ))
                            )}

                            {/* Actions */}
                            <td className="px-8 py-5 text-right align-top">
                              <div className="flex justify-end gap-2 pt-0.5">
                                <button
                                  className="p-2.5 text-slate-400 dark:text-slate-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                  onClick={() => navigate(`/project/${projectId}/paper/${p.id}`)}
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  className="p-2.5 text-slate-400 dark:text-slate-600 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all opacity-0 group-hover:opacity-100 shadow-sm"
                                  onClick={e => handleDeletePaper(e, p.id, p.title)}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <AddPaperModal
          projectId={projectId}
          onClose={() => setIsModalOpen(false)}
          onSuccess={handleAddSuccess}
        />
      )}

      {isGroupModalOpen && (
        <AddGroupModal
          projectId={projectId}
          onClose={() => setIsGroupModalOpen(false)}
          onSuccess={handleCreateGroupSuccess}
        />
      )}
    </div>
  );
};

export default TableView;