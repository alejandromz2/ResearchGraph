import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { paperApi, edgeApi, groupApi } from '../api';
import type { Paper, Edge, Group } from '../types/index';
import {
  Link2, Trash2, Edit2, X, Tag, Plus, Minimize2,
  Eye, MousePointer, Layers, GitMerge, Folder,
  Filter, Check, Hash, Info, Zap, Share2, GitBranch, Book
} from 'lucide-react';

// ─── Color palette keyed by label ───────────────────────────────────────────
const PALETTE = [
  '#60a5fa', '#34d399', '#f59e0b', '#f87171',
  '#a78bfa', '#22d3ee', '#fb923c', '#e879f9', '#86efac', '#818cf8',
];
const labelColor = (label: string) => {
  let h = 0;
  for (let i = 0; i < label.length; i++) h = label.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
};

interface GNode {
  id: string;
  name: string;
  labels?: string[];
  paperTags?: string[];
  type: 'paper' | 'super' | 'group' | 'tag' | 'paper-tag';
  x?: number; y?: number;
  vx?: number; vy?: number;
  fx?: number; fy?: number;
}
interface GLink {
  id: string;
  source: string | GNode;
  target: string | GNode;
  label: string;
  type?: 'default' | 'grouping' | 'tagging' | 'paper-tagging';
}

type Mode = 'view' | 'connect' | 'select';

// ─── PaperTagsModal ──────────────────────────────────────────────────────────
const PaperTagsModal = ({
  paper,
  onClose,
  onSuccess,
}: {
  paper: Paper;
  onClose: () => void;
  onSuccess: (updatedPaper: Paper) => void;
}) => {
  const [labels, setLabels] = useState<string[]>(paper.labels || []);
  const [paperTags, setPaperTags] = useState<string[]>(paper.paperTags || []);
  const [bulkInput, setBulkInput] = useState('');
  const [tagType, setTagType] = useState<'manual' | 'paper'>('manual');

  const handleAddBulk = () => {
    const newTags = bulkInput
      .split(/[\s,#]+/)
      .map(t => t.trim())
      .filter(t => t);
    
    if (tagType === 'manual') {
      const unique = newTags.filter(t => !labels.includes(t));
      if (unique.length > 0) setLabels([...labels, ...unique]);
    } else {
      const unique = newTags.filter(t => !paperTags.includes(t));
      if (unique.length > 0) setPaperTags([...paperTags, ...unique]);
    }
    setBulkInput('');
  };

  const handleRemoveLabel = (t: string) => setLabels(labels.filter(x => x !== t));
  const handleRemovePaperTag = (t: string) => setPaperTags(paperTags.filter(x => x !== t));

  const handleSave = async () => {
    try {
      await paperApi.update(paper.id, { labels, paperTags });
      onSuccess({ ...paper, labels, paperTags });
      onClose();
    } catch (err) {
      alert('Failed to update tags');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 w-full max-w-md rounded-[2rem] border border-slate-800 shadow-2xl overflow-hidden p-8 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Tag size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white leading-tight">Manage Tags</h2>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.1em] truncate w-40">
                {paper.title}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-6">
          <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-slate-800/50">
            <button 
              onClick={() => setTagType('manual')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tagType === 'manual' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Manual Labels
            </button>
            <button 
              onClick={() => setTagType('paper')}
              className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${tagType === 'paper' ? 'bg-violet-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              Paper Tags
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Add {tagType === 'manual' ? 'Manual Labels' : 'Paper Tags'}</label>
            <div className="flex gap-2">
              <input
                autoFocus
                value={bulkInput}
                onChange={e => setBulkInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddBulk()}
                placeholder={tagType === 'manual' ? "Label name..." : "Paper source tag..."}
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
              <button
                onClick={handleAddBulk}
                disabled={!bulkInput.trim()}
                className={`px-4 rounded-xl transition-all font-black text-xs uppercase text-white ${tagType === 'manual' ? 'bg-blue-600 hover:bg-blue-500' : 'bg-violet-600 hover:bg-violet-500'}`}
              >
                Add
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Tag size={10} /> Manual Labels</label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-950/30 rounded-2xl border border-slate-800/50 content-start min-h-[60px]">
                {labels.length === 0 && <p className="text-[10px] text-slate-600 italic m-auto">None</p>}
                {labels.map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/10 border border-blue-500/30 text-[11px] font-bold text-blue-300">
                    #{t}
                    <button onClick={() => handleRemoveLabel(t)} className="hover:text-red-400 transition-colors"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-violet-500 uppercase tracking-widest ml-1 flex items-center gap-2"><Book size={10} /> Paper Tags</label>
              <div className="flex flex-wrap gap-2 p-3 bg-slate-950/30 rounded-2xl border border-slate-800/50 content-start min-h-[60px]">
                {paperTags.length === 0 && <p className="text-[10px] text-slate-600 italic m-auto">None</p>}
                {paperTags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/30 text-[11px] font-bold text-violet-300">
                    #{t}
                    <button onClick={() => handleRemovePaperTag(t)} className="hover:text-red-400 transition-colors"><X size={12} /></button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-800 transition-all">Cancel</button>
            <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 transition-all">Save Changes</button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────
const GraphView = ({ projectId }: { projectId: string }) => {
  const fgRef = useRef<any>(null);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [superNodes, setSuperNodes] = useState<GNode[]>([]);

  const [mode, setMode] = useState<Mode>('view');
  const [connectSrc, setConnectSrc] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<any>(null);
  const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set());
  const [activePaperTags, setActivePaperTags] = useState<Set<string>>(new Set());

  // clustering & layout toggles
  const [showGroups, setShowGroups] = useState(false);
  const [showTagHubs, setShowTagHubs] = useState(false);
  const [showPaperTagHubs, setShowPaperTagHubs] = useState(false);
  const [treeMode, setTreeLayout] = useState(false);

  const [ctxMenu, setCtxMenu] = useState<{ type: 'node' | 'link'; item: any; x: number; y: number } | null>(null);
  const [editEdge, setEditEdge] = useState<{ id: string; label: string } | null>(null);
  const [editTags, setEditTags] = useState<Paper | null>(null);
  const [superModal, setSuperModal] = useState(false);
  const [superName, setSuperName] = useState('');
  const [connectModal, setConnectModal] = useState<{ srcId: string; tgtId: string } | null>(null);
  const [edgeLabel, setEdgeLabel] = useState('');

  const refreshData = useCallback(() => {
    Promise.all([
      paperApi.list(projectId), 
      edgeApi.list(projectId),
      groupApi.list(projectId)
    ]).then(([p, e, g]) => { 
      setPapers(p); 
      setEdges(e); 
      setGroups(g);
    });
  }, [projectId]);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Tune forces after data loads
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !papers.length) return;
    const timer = setTimeout(() => {
      try {
        if (!treeMode) {
          fg.d3Force('charge').strength(-500).distanceMax(450);
          fg.d3Force('link').distance(l => (l.type === 'grouping' || l.type === 'tagging' || l.type === 'paper-tagging') ? 100 : 180).strength(0.4);
        }
        fg.d3ReheatSimulation();
      } catch {}
    }, 80);
    return () => clearTimeout(timer);
  }, [papers.length, showGroups, showTagHubs, showPaperTagHubs, treeMode]);

  const allLabels = useMemo(() => {
    const s = new Set<string>();
    papers.forEach(p => p.labels?.forEach(l => s.add(l)));
    return [...s].sort();
  }, [papers]);

  const allPaperTags = useMemo(() => {
    const s = new Set<string>();
    papers.forEach(p => p.paperTags?.forEach(l => s.add(l)));
    return [...s].sort();
  }, [papers]);

  const graphData = useMemo<{ nodes: GNode[]; links: GLink[] }>(() => {
    // 1. Filtered Papers
    const paperNodes: GNode[] = papers
      .filter(p => {
        const matchLabel = activeLabels.size === 0 || p.labels?.some(l => activeLabels.has(l));
        const matchPaperTag = activePaperTags.size === 0 || p.paperTags?.some(l => activePaperTags.has(l));
        return matchLabel && matchPaperTag;
      })
      .map(p => ({ id: p.id, name: p.title, labels: p.labels || [], paperTags: p.paperTags || [], type: 'paper' }));

    const paperIds = new Set(paperNodes.map(n => n.id));
    const nodes: GNode[] = [...paperNodes];
    const links: GLink[] = [];

    // 2. Persistent Edges
    edges.forEach(e => {
      if (paperIds.has(e.source) && paperIds.has(e.target)) {
        links.push({ id: e.id, source: e.source, target: e.target, label: e.label, type: 'default' });
      }
    });

    // 3. User-created Super Nodes
    superNodes.forEach(sn => { nodes.push(sn); });

    // 4. Macro Nodes: Folders (Groups)
    if (showGroups && !treeMode) {
      groups.forEach(g => {
        const gid = `group_${g.id}`;
        nodes.push({ id: gid, name: g.name, type: 'group' });
        papers.forEach(p => {
          if (p.group === g.name && paperIds.has(p.id)) {
            links.push({ id: `glink_${g.id}_${p.id}`, source: gid, target: p.id, label: '', type: 'grouping' });
          }
        });
      });
    }

    // 5. Macro Nodes: Tag Hubs (Labels)
    if (showTagHubs && !treeMode) {
      allLabels.forEach(l => {
        if (activeLabels.size > 0 && !activeLabels.has(l)) return;
        const tid = `tag_${l}`;
        nodes.push({ id: tid, name: l, type: 'tag' });
        papers.forEach(p => {
          if (p.labels?.includes(l) && paperIds.has(p.id)) {
            links.push({ id: `tlink_${l}_${p.id}`, source: tid, target: p.id, label: '', type: 'tagging' });
          }
        });
      });
    }

    // 6. Macro Nodes: Paper Tag Hubs
    if (showPaperTagHubs && !treeMode) {
      allPaperTags.forEach(l => {
        if (activePaperTags.size > 0 && !activePaperTags.has(l)) return;
        const tid = `ptag_${l}`;
        nodes.push({ id: tid, name: l, type: 'paper-tag' });
        papers.forEach(p => {
          if (p.paperTags?.includes(l) && paperIds.has(p.id)) {
            links.push({ id: `ptlink_${l}_${p.id}`, source: tid, target: p.id, label: '', type: 'paper-tagging' });
          }
        });
      });
    }

    return { nodes, links };
  }, [papers, edges, groups, superNodes, activeLabels, activePaperTags, showGroups, showTagHubs, showPaperTagHubs, allLabels, allPaperTags, treeMode]);

  // ── edge CRUD ────────────────────────────────────────────────────────────────
  const confirmCreateEdge = async () => {
    if (!connectModal) return;
    const newEdge = await edgeApi.create(projectId, connectModal.srcId, connectModal.tgtId, edgeLabel);
    setEdges(prev => [...prev, newEdge]);
    setConnectModal(null);
    setEdgeLabel('');
    setConnectSrc(null);
  };

  const deleteEdge = async (id: string) => {
    try { await edgeApi.delete(id); } catch {}
    setEdges(prev => prev.filter(e => e.id !== id));
    setCtxMenu(null);
  };

  const saveEdge = async () => {
    if (!editEdge) return;
    try { await edgeApi.update(editEdge.id, { label: editEdge.label }); } catch {}
    setEdges(prev => prev.map(e => e.id === editEdge.id ? { ...e, label: editEdge.label } : e));
    setEditEdge(null);
  };

  // ── super node ───────────────────────────────────────────────────────────────
  const createSuperNode = async () => {
    if (!superName.trim() || selectedIds.size < 2) return;
    const id = 'super_' + Math.random().toString(36).slice(2);
    const sn: GNode = { id, name: superName.trim(), labels: [], type: 'super' };
    setSuperNodes(prev => [...prev, sn]);
    const created = await Promise.all(
      [...selectedIds].map(nid => edgeApi.create(projectId, id, nid, 'groups'))
    );
    setEdges(prev => [...prev, ...created]);
    setSuperName('');
    setSuperModal(false);
    setSelectedIds(new Set());
    setMode('view');
  };

  // ── Auto Clustering ────────────────────────────────────────────────────────
  const handleLinkByTag = async (tag: string, type: 'label' | 'paperTag') => {
    const matchingPapers = papers.filter(p => (type === 'label' ? p.labels : p.paperTags)?.includes(tag));
    if (matchingPapers.length < 2) return;
    
    const existingEdges = new Set(edges.map(e => {
      const srcId = typeof e.source === 'object' ? (e.source as any).id : e.source;
      const tgtId = typeof e.target === 'object' ? (e.target as any).id : e.target;
      return `${srcId}_${tgtId}`;
    }));
    
    const created: Edge[] = [];
    
    for (let i = 0; i < matchingPapers.length; i++) {
      for (let j = i + 1; j < matchingPapers.length; j++) {
        const p1 = matchingPapers[i];
        const p2 = matchingPapers[j];
        const pair1 = `${p1.id}_${p2.id}`;
        const pair2 = `${p2.id}_${p1.id}`;

        if (!existingEdges.has(pair1) && !existingEdges.has(pair2)) {
          const label = type === 'label' ? `#${tag}` : `Paper: ${tag}`;
          const newEdge = await edgeApi.create(projectId, p1.id, p2.id, label);
          created.push(newEdge);
          existingEdges.add(pair1);
        }
      }
    }
    
    if (created.length > 0) {
      setEdges(prev => [...prev, ...created]);
      alert(`Created ${created.length} new links for #${tag}`);
    } else {
      alert(`All papers with #${tag} are already linked.`);
    }
  };

  const handleAutoCluster = async () => {
    if (!papers.length) return;
    
    const existingEdges = new Set(edges.map(e => {
      const srcId = typeof e.source === 'object' ? (e.source as any).id : e.source;
      const tgtId = typeof e.target === 'object' ? (e.target as any).id : e.target;
      return `${srcId}_${tgtId}`;
    }));
    
    const created: Edge[] = [];
    for (let i = 0; i < papers.length; i++) {
      for (let j = i + 1; j < papers.length; j++) {
        const p1 = papers[i];
        const p2 = papers[j];
        
        const commonLabels = p1.labels?.filter(t => p2.labels?.includes(t)) || [];
        const commonPaperTags = p1.paperTags?.filter(t => p2.paperTags?.includes(t)) || [];
        
        if (commonLabels.length > 0 || commonPaperTags.length > 0) {
          const pair1 = `${p1.id}_${p2.id}`;
          const pair2 = `${p2.id}_${p1.id}`;

          if (!existingEdges.has(pair1) && !existingEdges.has(pair2)) {
            const labelsStr = commonLabels.map(t => `#${t}`).join(', ');
            const paperTagsStr = commonPaperTags.map(t => `Paper:${t}`).join(', ');
            const label = `Auto: ${[labelsStr, paperTagsStr].filter(x => x).join(' | ')}`;
            
            const newEdge = await edgeApi.create(projectId, p1.id, p2.id, label);
            created.push(newEdge);
            existingEdges.add(pair1);
          }
        }
      }
    }
    
    if (created.length > 0) {
      setEdges(prev => [...prev, ...created]);
      alert(`Created ${created.length} new tag-based relationships!`);
    } else {
      alert('No new tag-based relationships found.');
    }
  };

  // ── interaction ──────────────────────────────────────────────────────────────
  const handleNodeClick = useCallback((node: GNode) => {
    setCtxMenu(null);
    if (mode === 'connect') {
      if (!connectSrc) setConnectSrc(node.id);
      else if (connectSrc !== node.id) setConnectModal({ srcId: connectSrc, tgtId: node.id });
    } else if (mode === 'select') {
      setSelectedIds(prev => {
        const n = new Set(prev);
        n.has(node.id) ? n.delete(node.id) : n.add(node.id);
        return n;
      });
    }
  }, [mode, connectSrc]);

  const handleNodeRightClick = useCallback((node: GNode, e: MouseEvent) => {
    e.preventDefault();
    setCtxMenu({ type: 'node', item: node, x: e.clientX, y: e.clientY });
  }, []);

  const handleLinkClick = useCallback((link: GLink, e: MouseEvent) => {
    if (link.type !== 'default') return;
    setCtxMenu({ type: 'link', item: link, x: e.clientX, y: e.clientY });
  }, []);

  // ── canvas: nodes ────────────────────────────────────────────────────────────
  const drawNode = useCallback((node: GNode, ctx: CanvasRenderingContext2D, scale: number) => {
    const x = node.x ?? 0, y = node.y ?? 0;
    const isSelected = selectedIds.has(node.id) || connectSrc === node.id;
    const isHovered = hoveredNode === node.id;
    
    let r = 14;
    let color = '#818cf8';
    if (node.type === 'super') { r = 20; color = '#f59e0b'; }
    else if (node.type === 'group') { r = 24; color = '#10b981'; }
    else if (node.type === 'tag') { r = 18; color = '#8b5cf6'; }
    else if (node.type === 'paper-tag') { r = 18; color = '#d946ef'; }
    else if (node.labels && node.labels.length > 0) { color = labelColor(node.labels[0]); }
    else if (node.paperTags && node.paperTags.length > 0) { color = '#d946ef'; }

    // Ambient glow
    if (isHovered || isSelected) {
      const spread = r + (isSelected ? 20 : 14);
      const grd = ctx.createRadialGradient(x, y, r * 0.5, x, y, spread);
      grd.addColorStop(0, color + (isSelected ? 'cc' : '88'));
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, spread, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Outer selection ring
    if (isSelected) {
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.strokeStyle = color + 'cc';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Body
    ctx.beginPath();
    if (node.type === 'group') {
      const s = r * 1.5, rad = 6;
      ctx.roundRect ? (ctx as any).roundRect(x - s/2, y - s/2, s, s, rad) : ctx.rect(x - s/2, y - s/2, s, s);
    } else if (node.type === 'super') {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 6;
        const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    } else if (node.type === 'tag' || node.type === 'paper-tag') {
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
    } else { ctx.arc(x, y, r, 0, Math.PI * 2); }
    ctx.closePath();
    ctx.fillStyle = '#0f172a';
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#ffffff' : color + 'cc';
    ctx.lineWidth = isHovered ? 2.5 : 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = color + (isHovered ? 'ff' : '88');
    ctx.fill();

    // Label
    const fs = Math.max(11 / scale, 2.5);
    ctx.font = `600 ${fs}px 'DM Sans', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const label = node.name.length > 25 ? node.name.slice(0, 23) + '…' : node.name;
    const tw = ctx.measureText(label).width;
    const ty = y + r + 5;
    
    ctx.fillStyle = 'rgba(2,6,23,0.85)';
    const pad = 6;
    ctx.beginPath();
    ctx.roundRect ? (ctx as any).roundRect(x - tw/2 - pad, ty - 2, tw + pad * 2, fs + 6, 6) : ctx.rect(x - tw/2 - pad, ty - 2, tw + pad * 2, fs + 6);
    ctx.fill();

    ctx.fillStyle = isSelected ? '#ffffff' : (isHovered ? color : '#94a3b8');
    if (node.type === 'group' || node.type === 'tag' || node.type === 'paper-tag') ctx.fillStyle = color;
    ctx.fillText(label, x, ty + 1);
  }, [selectedIds, connectSrc, hoveredNode]);

  // ── canvas: links ────────────────────────────────────────────────────────────
  const drawLink = useCallback((link: GLink, ctx: CanvasRenderingContext2D, scale: number) => {
    const s = link.source as GNode, t = link.target as GNode;
    if (!s.x || !t.x) return;
    const dx = t.x - s.x, dy = t.y - s.y, dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const angle = Math.atan2(dy, dx);
    const getR = (n: GNode) => (n.type === 'group' ? 24 : n.type === 'super' ? 20 : (n.type === 'tag' || n.type === 'paper-tag') ? 18 : 14);
    const sx = s.x + getR(s) * Math.cos(angle), sy = s.y + getR(s) * Math.sin(angle);
    const ex = t.x - (getR(t) + (link.type === 'default' ? 7 : 0)) * Math.cos(angle), ey = t.y - (getR(t) + (link.type === 'default' ? 7 : 0)) * Math.sin(angle);

    let lineColor = '#1e3a5f', lineDash: number[] = [], lineWidth = 1;
    if (link.type === 'grouping') { lineColor = '#10b98122'; lineDash = [2, 4]; }
    else if (link.type === 'tagging') { lineColor = '#8b5cf622'; lineDash = [2, 4]; }
    else if (link.type === 'paper-tagging') { lineColor = '#d946ef22'; lineDash = [2, 4]; }
    else if (hoveredLink === link) { lineColor = '#60a5fa'; lineWidth = 2; }

    ctx.beginPath();
    ctx.moveTo(sx, sy); ctx.lineTo(ex, ey);
    ctx.strokeStyle = lineColor; ctx.lineWidth = lineWidth;
    if (lineDash.length) ctx.setLineDash(lineDash);
    ctx.stroke(); ctx.setLineDash([]);

    if (link.type === 'default') {
      ctx.beginPath();
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - 7 * Math.cos(angle - 0.45), ey - 7 * Math.sin(angle - 0.45));
      ctx.lineTo(ex - 7 * Math.cos(angle + 0.45), ey - 7 * Math.sin(angle + 0.45));
      ctx.closePath(); ctx.fillStyle = lineColor; ctx.fill();
      if (link.label) {
        const mx = (sx + ex) / 2, my = (sy + ey) / 2, fs = Math.max(9 / scale, 2);
        ctx.font = `500 ${fs}px 'DM Sans', sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(link.label).width;
        ctx.fillStyle = 'rgba(2,6,23,0.92)'; ctx.fillRect(mx - tw/2 - 3, my - fs/2 - 2, tw + 6, fs + 4);
        ctx.fillStyle = (hoveredLink === link) ? '#93c5fd' : '#475569'; ctx.fillText(link.label, mx, my);
      }
    }
  }, [hoveredLink]);

  return (
    <div
      className="relative h-full w-full rounded-[2.5rem] overflow-hidden border border-slate-800 shadow-2xl"
      style={{ background: 'radial-gradient(circle at 50% 50%, #0f172a 0%, #020617 100%)' }}
      onClick={() => setCtxMenu(null)}
    >
      <div style={{ cursor: mode === 'connect' ? 'crosshair' : mode === 'select' ? 'cell' : 'grab' }}>
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          backgroundColor="transparent"
          nodeCanvasObject={drawNode}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={drawLink}
          linkCanvasObjectMode={() => 'replace'}
          onNodeClick={handleNodeClick}
          onNodeRightClick={handleNodeRightClick}
          onLinkClick={handleLinkClick}
          onNodeHover={n => setHoveredNode(n?.id ?? null)}
          onLinkHover={l => setHoveredLink(l)}
          onBackgroundClick={() => { setCtxMenu(null); if (mode === 'connect') setConnectSrc(null); }}
          enableNodeDrag={mode === 'view'}
          dagMode={treeMode ? 'td' : undefined}
          dagLevelDistance={200}
          d3AlphaDecay={0.012}
          d3VelocityDecay={0.3}
          cooldownTicks={400}
        />
      </div>

      {/* ── Side panel ─────────────────────────────────────────────────────── */}
      <div className="absolute left-6 top-6 flex flex-col gap-4 z-20 w-64 max-h-[90%] overflow-y-auto pr-2 custom-scrollbar" onClick={e => e.stopPropagation()}>
        {/* Mode */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-2 flex flex-col gap-1 shadow-2xl shrink-0">
          {([
            { id: 'view',    Icon: MousePointer, label: 'Explore View' },
            { id: 'connect', Icon: Link2,         label: 'Link Relationship' },
            { id: 'select',  Icon: Layers,        label: 'Batch Select' },
          ] as const).map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => { setMode(id); setConnectSrc(null); setSelectedIds(new Set()); }}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all ${
                mode === id ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-500 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Icon size={14} strokeWidth={2.5} /> {label}
            </button>
          ))}
        </div>

        {/* Layout & Hierarchy */}
        <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3 shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
            <GitBranch size={10} /> Layout & Hierarchy
          </p>
          <button
            onClick={() => setTreeLayout(!treeMode)}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold transition-all border ${
              treeMode ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center gap-2">
              <Share2 size={14} />
              <span>Reference Tree</span>
            </div>
            {treeMode && <Check size={12} />}
          </button>
        </div>

        {/* Macro Structures */}
        {!treeMode && (
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3 shrink-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
              <Zap size={10} /> Macro Structures
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowGroups(!showGroups)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                  showGroups ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2"><Folder size={14} /> <span>Group Macro Nodes</span></div>
                {showGroups && <Check size={12} />}
              </button>
              <button
                onClick={() => setShowTagHubs(!showTagHubs)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                  showTagHubs ? 'bg-violet-500/10 border-violet-500/40 text-violet-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2"><Tag size={14} /> <span>Manual Label Hubs</span></div>
                {showTagHubs && <Check size={12} />}
              </button>
              <button
                onClick={() => setShowPaperTagHubs(!showPaperTagHubs)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                  showPaperTagHubs ? 'bg-fuchsia-500/10 border-fuchsia-500/40 text-fuchsia-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2"><Book size={14} /> <span>Paper Tag Hubs</span></div>
                {showPaperTagHubs && <Check size={12} />}
              </button>
              <button
                onClick={handleAutoCluster}
                className="flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all border bg-blue-500/10 border-blue-500/40 text-blue-400 hover:bg-blue-500/20"
              >
                <div className="flex items-center gap-2"><GitMerge size={14} /> <span>Auto-link All Tags</span></div>
              </button>
            </div>
          </div>
        )}

        {/* Manual Labels filters */}
        {allLabels.length > 0 && (
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col max-h-[260px] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-500 flex items-center gap-2"><Filter size={10} /> Filter Labels</p>
              {activeLabels.size > 0 && <button onClick={() => setActiveLabels(new Set())} className="text-[9px] font-black uppercase tracking-widest text-blue-400">Clear</button>}
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">
              {allLabels.map(l => (
                <div key={l} className="group relative flex items-center gap-1">
                  <button
                    onClick={() => setActiveLabels(prev => { const n = new Set(prev); n.has(l) ? n.delete(l) : n.add(l); return n; })}
                    className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                      activeLabels.has(l) ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeLabels.has(l) ? labelColor(l) : '#334155' }} />
                    <span className="truncate">{l}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLinkByTag(l, 'label'); }}
                    className="absolute right-2 p-1.5 bg-blue-600/0 hover:bg-blue-600 text-blue-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title={`Link all papers with #${l}`}
                  >
                    <GitMerge size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Paper Tags filters */}
        {allPaperTags.length > 0 && (
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col max-h-[260px] shrink-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-500 flex items-center gap-2"><Filter size={10} /> Filter Paper Tags</p>
              {activePaperTags.size > 0 && <button onClick={() => setActivePaperTags(new Set())} className="text-[9px] font-black uppercase tracking-widest text-violet-400">Clear</button>}
            </div>
            <div className="flex flex-col gap-1 overflow-y-auto pr-1 custom-scrollbar">
              {allPaperTags.map(l => (
                <div key={l} className="group relative flex items-center gap-1">
                  <button
                    onClick={() => setActivePaperTags(prev => { const n = new Set(prev); n.has(l) ? n.delete(l) : n.add(l); return n; })}
                    className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-xl text-[11px] font-bold transition-all ${
                      activePaperTags.has(l) ? 'bg-slate-800 text-white shadow-inner' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activePaperTags.has(l) ? '#d946ef' : '#334155' }} />
                    <span className="truncate">{l}</span>
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleLinkByTag(l, 'paperTag'); }}
                    className="absolute right-2 p-1.5 bg-violet-600/0 hover:bg-violet-600 text-violet-400 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title={`Link all papers with paper tag #${l}`}
                  >
                    <GitMerge size={12} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Status Bar ── */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 pointer-events-none" onClick={e => e.stopPropagation()}>
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-full px-6 py-2.5 shadow-2xl flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <span className="text-[11px] font-black text-white uppercase tracking-wider">{graphData.nodes.length} <span className="text-slate-500 font-bold ml-0.5">Nodes</span></span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-black text-white uppercase tracking-wider">{graphData.links.length} <span className="text-slate-500 font-bold ml-0.5">Edges</span></span>
          </div>
          {selectedIds.size > 0 && (
            <>
              <div className="h-4 w-px bg-slate-800" />
              <div className="flex items-center gap-3 pointer-events-auto">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">{selectedIds.size} Selected</span>
                {selectedIds.size >= 2 && (
                  <button onClick={() => setSuperModal(true)} className="flex items-center gap-2 px-3 py-1 bg-amber-500 text-slate-950 rounded-full text-[10px] font-black hover:bg-amber-400 transition-all shadow-lg shadow-amber-500/20">
                    <GitMerge size={12} strokeWidth={3} /> Cluster
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Context Menu ── */}
      {ctxMenu && (
        <div
          className="fixed z-[60] bg-slate-900 border border-slate-800 rounded-[1.5rem] shadow-2xl overflow-hidden min-w-[220px] animate-in zoom-in-95 duration-100 origin-top-left"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-slate-800 bg-slate-800/30">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 mb-1">{ctxMenu.type === 'node' ? ctxMenu.item.type : 'Connection'}</p>
            <p className="text-sm font-black text-white truncate leading-tight">{ctxMenu.type === 'node' ? ctxMenu.item.name : (ctxMenu.item.label || 'Unlabeled')}</p>
          </div>
          <div className="p-1.5">
            {ctxMenu.type === 'node' && (
              <>
                <button className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-3 transition-colors" onClick={() => { setConnectSrc(ctxMenu.item.id); setMode('connect'); setCtxMenu(null); }}>
                  <Link2 size={14} className="text-blue-400" /> Create Relationship
                </button>
                {ctxMenu.item.type === 'paper' && (
                  <button className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-3 transition-colors" onClick={() => { 
                      const p = papers.find(x => x.id === ctxMenu.item.id);
                      if (p) setEditTags(p);
                      setCtxMenu(null); 
                    }}>
                    <Tag size={14} className="text-violet-400" /> Manage Tags
                  </button>
                )}
                <button className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-3 transition-colors" onClick={() => { setSelectedIds(new Set([ctxMenu.item.id])); setMode('select'); setCtxMenu(null); }}>
                  <Layers size={14} className="text-amber-400" /> Focus Node
                </button>
                {(ctxMenu.item.type === 'super' || ctxMenu.item.type === 'tag' || ctxMenu.item.type === 'paper-tag') && (
                  <button className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors mt-1 border-t border-slate-800 pt-3" onClick={() => {
                      if (ctxMenu.item.type === 'super') {
                        setSuperNodes(prev => prev.filter(n => n.id !== ctxMenu.item.id));
                        setEdges(prev => prev.filter(e => e.source !== ctxMenu.item.id && e.target !== ctxMenu.item.id));
                      }
                      setCtxMenu(null);
                    }}>
                    <Trash2 size={14} /> Remove Structure
                  </button>
                )}
              </>
            )}
            {ctxMenu.type === 'link' && (
              <>
                <button className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-slate-300 hover:bg-slate-800 rounded-xl flex items-center gap-3 transition-colors" onClick={() => { setEditEdge({ id: ctxMenu.item.id, label: ctxMenu.item.label || '' }); setCtxMenu(null); }}>
                  <Edit2 size={14} className="text-blue-400" /> Rename Relation
                </button>
                <button className="w-full px-4 py-2.5 text-left text-[11px] font-bold text-red-400 hover:bg-red-500/10 rounded-xl flex items-center gap-3 transition-colors" onClick={() => deleteEdge(ctxMenu.item.id)}>
                  <Trash2 size={14} /> Sever Link
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Modals ── */}
      {editTags && (
        <PaperTagsModal paper={editTags} onClose={() => setEditTags(null)} onSuccess={(updated) => { setPapers(prev => prev.map(p => p.id === updated.id ? updated : p)); }} />
      )}

      {connectModal && (
        <Modal onClose={() => { setConnectModal(null); setEdgeLabel(''); setConnectSrc(null); }}>
          <div className="flex items-center gap-3 mb-1">
            <Link2 size={18} className="text-blue-400" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500">New Connection</p>
          </div>
          <h3 className="font-black text-white text-xl mb-4 leading-tight">Define this link</h3>
          <input autoFocus className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 mb-5 transition-all" value={edgeLabel} onChange={e => setEdgeLabel(e.target.value)} placeholder="e.g. references, refutes, implements…" onKeyDown={e => e.key === 'Enter' && confirmCreateEdge()} />
          <div className="flex gap-3"><button onClick={confirmCreateEdge} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20">Establish Link</button></div>
        </Modal>
      )}

      {superModal && (
        <Modal onClose={() => setSuperModal(false)}>
          <div className="flex items-center gap-3 mb-1"><GitMerge size={18} className="text-amber-400" /><p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500">Macro Cluster</p></div>
          <h3 className="font-black text-white text-xl mb-1 leading-tight">Create Central Hub</h3>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-5">Grouping <span className="text-amber-400">{selectedIds.size}</span> selected nodes</p>
          <input autoFocus className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-4 text-white text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 mb-5 transition-all" value={superName} onChange={e => setSuperName(e.target.value)} placeholder="Hub name (e.g. Core Concepts)..." onKeyDown={e => e.key === 'Enter' && createSuperNode()} />
          <div className="flex gap-3"><button onClick={createSuperNode} className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20">Create Hub</button></div>
        </Modal>
      )}

      {/* Zoom controls */}
      <div className="absolute right-6 bottom-6 flex flex-col gap-2 z-20" onClick={e => e.stopPropagation()}>
        {[
          { label: '+', action: () => fgRef.current?.zoom(1.5, 300) },
          { label: '−', action: () => fgRef.current?.zoom(0.67, 300) },
          { label: '⊡', action: () => fgRef.current?.zoomToFit(300, 80) },
        ].map(({ label, action }) => (
          <button key={label} onClick={action} className="w-10 h-10 bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center font-black shadow-2xl text-lg">{label}</button>
        ))}
      </div>
    </div>
  );
};

// ─── Reusable modal wrapper ───────────────────────────────────────────────────
const Modal = ({ children, onClose }: { children: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4" onClick={onClose}>
    <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>{children}</div>
  </div>
);

export default GraphView;
