import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import ForceGraph2D from 'react-force-graph-2d';
import { paperApi, edgeApi, projectApi } from '../api';
import type { Paper, Edge, Project } from '../types/index';
import {
  Link2, Trash2, Edit2, X, Tag, Plus, Minimize2,
  Eye, MousePointer, Layers, GitMerge, Folder,
  Filter, Check, Hash, Info, Zap, Share2, GitBranch, Layout, ChevronLeft, Book
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
  type: 'paper' | 'project' | 'tag' | 'paper-tag';
  projectId?: string;
  x?: number; y?: number;
  vx?: number; vy?: number;
  fx?: number; fy?: number;
}
interface GLink {
  id: string;
  source: string | GNode;
  target: string | GNode;
  label: string;
  type?: 'default' | 'project-containment' | 'tagging' | 'paper-tagging';
}

const GlobalGraphView = () => {
  const navigate = useNavigate();
  const fgRef = useRef<any>(null);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [papers, setPapers] = useState<Paper[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [hoveredLink, setHoveredLink] = useState<any>(null);
  const [activeLabels, setActiveLabels] = useState<Set<string>>(new Set());
  const [activePaperTags, setActivePaperTags] = useState<Set<string>>(new Set());

  // clustering & layout toggles
  const [showProjects, setShowProjects] = useState(true);
  const [showTagHubs, setShowTagHubs] = useState(false);
  const [showPaperTagHubs, setShowPaperTagHubs] = useState(false);
  const [showDirectTagLinks, setShowDirectTagLinks] = useState(false);

  const refreshData = useCallback(() => {
    Promise.all([
      projectApi.list(),
      paperApi.listAll(), 
      edgeApi.listAll()
    ]).then(([pr, pa, e]) => { 
      setProjects(pr);
      setPapers(pa); 
      setEdges(e); 
    });
  }, []);

  useEffect(() => { refreshData(); }, [refreshData]);

  // Tune forces
  useEffect(() => {
    const fg = fgRef.current;
    if (!fg || !papers.length) return;
    const timer = setTimeout(() => {
      try {
        fg.d3Force('charge').strength(-400).distanceMax(500);
        fg.d3Force('link').distance(l => {
          if (l.type === 'project-containment' || l.type === 'tagging' || l.type === 'paper-tagging') return 120;
          if (l.type === 'virtual-tagging') return 250;
          return 200;
        }).strength(l => l.type === 'virtual-tagging' ? 0.05 : 0.3);
        fg.d3ReheatSimulation();
      } catch {}
    }, 100);
    return () => clearTimeout(timer);
  }, [papers.length, showProjects, showTagHubs, showPaperTagHubs, showDirectTagLinks]);

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
    const paperNodes: GNode[] = papers
      .filter(p => {
        const matchLabel = activeLabels.size === 0 || p.labels?.some(l => activeLabels.has(l));
        const matchPaperTag = activePaperTags.size === 0 || p.paperTags?.some(l => activePaperTags.has(l));
        return matchLabel && matchPaperTag;
      })
      .map(p => ({ id: p.id, name: p.title, labels: p.labels || [], paperTags: p.paperTags || [], type: 'paper', projectId: p.projectId }));

    const paperIds = new Set(paperNodes.map(n => n.id));
    const nodes: GNode[] = [...paperNodes];
    const links: GLink[] = [];

    // 1. Papers edges
    edges.forEach(e => {
      if (paperIds.has(e.source) && paperIds.has(e.target)) {
        links.push({ id: e.id, source: e.source, target: e.target, label: e.label, type: 'default' });
      }
    });

    // 2. Project Nodes
    if (showProjects) {
      projects.forEach(prj => {
        const pid = `prj_${prj.id}`;
        nodes.push({ id: pid, name: prj.name, type: 'project' });
        papers.forEach(p => {
          if (p.projectId === prj.id && paperIds.has(p.id)) {
            links.push({ id: `plink_${prj.id}_${p.id}`, source: pid, target: p.id, label: '', type: 'project-containment' });
          }
        });
      });
    }

    // 3. Tag Hubs (Manual Labels)
    if (showTagHubs) {
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

    // 4. Paper Tag Hubs
    if (showPaperTagHubs) {
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

    // 5. Direct Visual Tag Links (Virtual)
    if (showDirectTagLinks) {
      const activePapers = papers.filter(p => paperIds.has(p.id));
      for (let i = 0; i < activePapers.length; i++) {
        for (let j = i + 1; j < activePapers.length; j++) {
          const p1 = activePapers[i];
          const p2 = activePapers[j];
          const common = [...(p1.labels.filter(t => p2.labels.includes(t))), ...(p1.paperTags.filter(t => p2.paperTags.includes(t)))];
          if (common.length > 0) {
            links.push({ 
              id: `vlink_${p1.id}_${p2.id}`, 
              source: p1.id, 
              target: p2.id, 
              label: '', 
              type: 'virtual-tagging' as any
            });
          }
        }
      }
    }

    return { nodes, links };
  }, [papers, edges, projects, activeLabels, activePaperTags, showProjects, showTagHubs, showPaperTagHubs, showDirectTagLinks, allLabels, allPaperTags]);

  const handleLinkByTag = async (tag: string, type: 'label' | 'paperTag') => {
    const matchingPapers = papers.filter(p => (type === 'label' ? p.labels : p.paperTags).includes(tag));
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
          const newEdge = await edgeApi.create(p1.projectId, p1.id, p2.id, label);
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
            
            const newEdge = await edgeApi.create(p1.projectId, p1.id, p2.id, label);
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

  const drawNode = useCallback((node: GNode, ctx: CanvasRenderingContext2D, scale: number) => {
    const x = node.x ?? 0, y = node.y ?? 0;
    const isHovered = hoveredNode === node.id;
    
    let r = 14;
    let color = '#818cf8';
    if (node.type === 'project') { r = 26; color = '#3b82f6'; }
    else if (node.type === 'tag') { r = 18; color = '#8b5cf6'; }
    else if (node.type === 'paper-tag') { r = 18; color = '#d946ef'; }
    else if (node.labels && node.labels.length > 0) { color = labelColor(node.labels[0]); }
    else if (node.paperTags && node.paperTags.length > 0) { color = '#d946ef'; }

    // Ambient glow
    if (isHovered) {
      const spread = r + 14;
      const grd = ctx.createRadialGradient(x, y, r * 0.5, x, y, spread);
      grd.addColorStop(0, color + '88');
      grd.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.arc(x, y, spread, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    // Body
    ctx.beginPath();
    if (node.type === 'project') {
      const s = r * 1.5, rad = 12;
      ctx.roundRect ? (ctx as any).roundRect(x - s/2, y - s/2, s, s, rad) : ctx.rect(x - s/2, y - s/2, s, s);
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

    ctx.fillStyle = isHovered ? color : '#94a3b8';
    if (node.type === 'project' || node.type === 'tag' || node.type === 'paper-tag') ctx.fillStyle = color;
    ctx.fillText(label, x, ty + 1);
  }, [hoveredNode]);

  const drawLink = useCallback((link: GLink, ctx: CanvasRenderingContext2D, scale: number) => {
    const s = link.source as GNode, t = link.target as GNode;
    if (!s.x || !t.x) return;
    const dx = t.x - s.x, dy = t.y - s.y, dist = Math.hypot(dx, dy);
    if (dist === 0) return;
    const angle = Math.atan2(dy, dx);
    const getR = (n: GNode) => (n.type === 'project' ? 26 : (n.type === 'tag' || n.type === 'paper-tag') ? 18 : 14);
    const sx = s.x + getR(s) * Math.cos(angle), sy = s.y + getR(s) * Math.sin(angle);
    const ex = t.x - (getR(t) + (link.type === 'default' ? 7 : 0)) * Math.cos(angle), ey = t.y - (getR(t) + (link.type === 'default' ? 7 : 0)) * Math.sin(angle);

    let lineColor = '#1e3a5f', lineDash: number[] = [], lineWidth = 1;
    if (link.type === 'project-containment') { lineColor = '#3b82f622'; lineDash = [4, 4]; }
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
    }
  }, [hoveredLink]);

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden">
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-xl shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/')}
            className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          <div className="h-6 w-px bg-slate-800"></div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              <Layout size={18} className="text-blue-500" />
              Global Research Universe
            </h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Across {projects.length} Workspaces</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={handleAutoCluster}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-600/20"
          >
            <GitMerge size={14} /> Auto-Cluster All
          </button>
        </div>
      </header>

      <div className="flex-1 relative">
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          backgroundColor="#020617"
          nodeCanvasObject={drawNode}
          nodeCanvasObjectMode={() => 'replace'}
          linkCanvasObject={drawLink}
          linkCanvasObjectMode={() => 'replace'}
          onNodeClick={n => {
            if (n.type === 'paper') navigate(`/project/${n.projectId}/paper/${n.id}`);
            if (n.type === 'project') navigate(`/project/${n.id.replace('prj_', '')}`);
          }}
          onNodeHover={n => setHoveredNode(n?.id ?? null)}
          onLinkHover={l => setHoveredLink(l)}
          d3AlphaDecay={0.01}
          d3VelocityDecay={0.3}
          cooldownTicks={200}
        />

        {/* ── Overlay Panels ── */}
        <div className="absolute left-6 top-6 flex flex-col gap-4 pointer-events-none w-64 max-h-[90%] overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-2xl space-y-3 pointer-events-auto shrink-0">
            <p className="text-[9px] font-black uppercase tracking-[0.25em] text-slate-500 flex items-center gap-2">
              <Zap size={10} /> Visualization
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowProjects(!showProjects)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                  showProjects ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2"><Folder size={14} /> <span>Show Workspace Hubs</span></div>
                {showProjects && <Check size={12} />}
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
                onClick={() => setShowDirectTagLinks(!showDirectTagLinks)}
                className={`flex items-center justify-between px-3 py-2 rounded-xl text-[11px] font-bold transition-all border ${
                  showDirectTagLinks ? 'bg-amber-500/10 border-amber-500/40 text-amber-400' : 'bg-slate-800/40 border-slate-700 text-slate-500 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center gap-2"><Link2 size={14} /> <span>Visual Tag-Links</span></div>
                {showDirectTagLinks && <Check size={12} />}
              </button>
            </div>
          </div>

          {allLabels.length > 0 && (
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col max-h-[300px] pointer-events-auto shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-blue-500 flex items-center gap-2"><Filter size={10} /> Filter Global Labels</p>
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

          {allPaperTags.length > 0 && (
            <div className="bg-slate-900/80 backdrop-blur-2xl border border-slate-800 rounded-3xl p-4 shadow-2xl flex flex-col max-h-[300px] pointer-events-auto shrink-0">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[9px] font-black uppercase tracking-[0.25em] text-violet-500 flex items-center gap-2"><Filter size={10} /> Filter Global Paper Tags</p>
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

        <div className="absolute right-6 bottom-6 flex flex-col gap-2">
           {[
            { label: '+', action: () => fgRef.current?.zoom(1.5, 300) },
            { label: '−', action: () => fgRef.current?.zoom(0.67, 300) },
            { label: '⊡', action: () => fgRef.current?.zoomToFit(300, 80) },
          ].map(({ label, action }) => (
            <button key={label} onClick={action} className="w-10 h-10 bg-slate-900/90 backdrop-blur-2xl border border-slate-800 rounded-xl text-slate-400 hover:text-white hover:border-slate-500 transition-all flex items-center justify-center font-black shadow-2xl text-lg">{label}</button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GlobalGraphView;
