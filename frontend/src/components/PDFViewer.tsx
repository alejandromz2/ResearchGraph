import React, { useState, useEffect, useRef } from 'react';
import {
  PdfLoader,
  PdfHighlighter,
  Tip,
  Highlight,
  Popup,
  AreaHighlight,
} from 'react-pdf-highlighter';
import { MessageSquare, Send, Trash2, X, Check, Sparkles, Hash, Copy, Pencil, ChevronRight } from 'lucide-react';
import type { Highlight as IHighlight } from '../types/index';

import "react-pdf-highlighter/dist/style.css";

interface PDFViewerProps {
  url: string;
  highlights: IHighlight[];
  onHighlightsChange: (highlights: IHighlight[]) => void;
  onSendToCanvas?: (highlight: IHighlight) => void;
  scrollToHighlightId?: string | null;
}

const COLORS = [
  { name: 'Yellow',  value: '#fff3bf', borderColor: '#f59e0b', dot: '#f59e0b' },
  { name: 'Green',   value: '#d3f9d8', borderColor: '#10b981', dot: '#10b981' },
  { name: 'Blue',    value: '#d0ebff', borderColor: '#3b82f6', dot: '#3b82f6' },
  { name: 'Red',     value: '#ffc9c9', borderColor: '#ef4444', dot: '#ef4444' },
  { name: 'Purple',  value: '#eebefa', borderColor: '#8b5cf6', dot: '#8b5cf6' },
];

const TAGS = [
  { name: 'Important', icon: '⭐', color: '#f59e0b' },
  { name: 'Question',  icon: '❓', color: '#3b82f6' },
  { name: 'Idea',      icon: '💡', color: '#10b981' },
  { name: 'Reference', icon: '📚', color: '#8b5cf6' },
  { name: 'To Do',     icon: '✅', color: '#ef4444' },
];

// ─── Inline Selection Tip ────────────────────────────────────────────────────
interface SelectionTipProps {
  onCopy: () => void;
  onQuickHighlight: (color: string) => void;
  onAddNote: () => void;
  copied: boolean;
}

const SelectionTip = ({ onCopy, onQuickHighlight, onAddNote, copied }: SelectionTipProps) => (
  <div className="flex items-center gap-1 bg-slate-900 dark:bg-slate-800 rounded-2xl px-2 py-1.5 shadow-2xl border border-slate-700 dark:border-slate-600 animate-in zoom-in-95 duration-150">
    {/* Copy */}
    <button
      onClick={onCopy}
      title="Copy text"
      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-all ${
        copied
          ? 'bg-green-500 text-white'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      {copied ? <Check size={12} strokeWidth={3} /> : <Copy size={12} strokeWidth={2.5} />}
      <span>{copied ? 'Copied' : 'Copy'}</span>
    </button>

    {/* Divider */}
    <div className="w-px h-5 bg-slate-700 dark:bg-slate-600 mx-0.5" />

    {/* Color swatches — quick highlight */}
    <div className="flex items-center gap-1 px-1">
      {COLORS.map(c => (
        <button
          key={c.value}
          title={`Highlight ${c.name}`}
          onClick={() => onQuickHighlight(c.value)}
          className="w-5 h-5 rounded-full border-2 border-slate-600 hover:border-white hover:scale-125 transition-all duration-150 shadow-sm"
          style={{ backgroundColor: c.dot }}
        />
      ))}
    </div>

    {/* Divider */}
    <div className="w-px h-5 bg-slate-700 dark:bg-slate-600 mx-0.5" />

    {/* Add note → opens full modal */}
    <button
      onClick={onAddNote}
      title="Add note & highlight"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
    >
      <Pencil size={12} strokeWidth={2.5} />
      <span>Add Note</span>
      <ChevronRight size={10} strokeWidth={3} className="opacity-50" />
    </button>
  </div>
);

// ─── Highlight Modal ─────────────────────────────────────────────────────────
interface HighlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  title: string;
  text: string;
  onTextChange: (v: string) => void;
  color: string;
  onColorChange: (v: string) => void;
  tags: string[];
  onTagsChange: (tag: string) => void;
  showSendToCanvas?: boolean;
  onSendToCanvas?: () => void;
  onDelete?: () => void;
}

const HighlightModal = ({
  isOpen, onClose, onSave, title, text, onTextChange,
  color, onColorChange, tags, onTagsChange,
  showSendToCanvas, onSendToCanvas, onDelete,
}: HighlightModalProps) => {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 w-96 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-slate-700 dark:text-slate-200">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4">
          {/* Color */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button
                  key={c.value}
                  onClick={() => onColorChange(c.value)}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${color === c.value ? 'border-blue-500 scale-110 shadow-lg' : 'border-transparent'}`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">Tags</label>
            <div className="flex flex-wrap gap-2">
              {TAGS.map(tag => (
                <button
                  key={tag.name}
                  onClick={() => onTagsChange(tag.name)}
                  className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
                    tags.includes(tag.name)
                      ? 'bg-slate-900 dark:bg-blue-500 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{tag.icon}</span>
                  <span>{tag.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">Comment</label>
            <div className="relative">
              <MessageSquare size={14} className="absolute left-3 top-3 text-slate-400" />
              <textarea
                autoFocus
                className="w-full bg-slate-50 dark:bg-slate-800 rounded-xl p-3 pl-9 text-sm dark:text-white border-none focus:ring-2 focus:ring-blue-500/20 min-h-[100px] resize-none"
                placeholder="Add your thoughts..."
                value={text}
                onChange={e => onTextChange(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={onSave}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <Check size={14} /> {title === 'Edit Highlight' ? 'Save Changes' : 'Add Highlight'}
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            )}
          </div>

          {showSendToCanvas && onSendToCanvas && (
            <button
              onClick={onSendToCanvas}
              className="w-full bg-slate-900 dark:bg-blue-500 hover:bg-black dark:hover:bg-blue-600 text-white py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
            >
              <Send size={14} /> Send to Canvas
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const PDFViewer = ({ url, highlights, onHighlightsChange, onSendToCanvas, scrollToHighlightId }: PDFViewerProps) => {
  const scrollViewerTo = useRef<(highlight: any) => void>(() => {});

  // Editing existing highlight
  const [editingHighlight, setEditingHighlight] = useState<IHighlight | null>(null);
  const [editText, setEditText]   = useState('');
  const [editColor, setEditColor] = useState(COLORS[0].value);
  const [editTags, setEditTags]   = useState<string[]>([]);

  // Adding new highlight (via "Add Note" in the tip)
  const [isAddingHighlight, setIsAddingHighlight] = useState(false);
  const [pendingSelection, setPendingSelection] = useState<{
    position: any;
    content: any;
    hideTip: () => void;
  } | null>(null);

  // Copy flash state
  const [copiedTipId, setCopiedTipId] = useState(false);

  useEffect(() => {
    if (scrollToHighlightId) {
      const h = highlights.find(x => x.id === scrollToHighlightId);
      if (h) setTimeout(() => { try { scrollViewerTo.current(h); } catch {} }, 150);
    }
  }, [scrollToHighlightId, highlights]);

  // ── helpers ────────────────────────────────────────────────────────────────

  const makeHighlight = (position: any, content: any, color: string, text = '', tags: string[] = []): IHighlight => ({
    content,
    position,
    comment: { text, emoji: tags.includes('Idea') ? '💡' : '📌' },
    color,
    id: Math.random().toString(36).slice(2),
    createdAt: new Date().toISOString(),
    tags,
  });

  const dismissPending = () => {
    if (pendingSelection) { pendingSelection.hideTip(); setPendingSelection(null); }
    setIsAddingHighlight(false);
    setEditText('');
    setEditColor(COLORS[0].value);
    setEditTags([]);
    setCopiedTipId(false);
  };

  // Quick highlight (no modal, just colour)
  const handleQuickHighlight = (color: string) => {
    if (!pendingSelection) return;
    onHighlightsChange([...highlights, makeHighlight(pendingSelection.position, pendingSelection.content, color)]);
    dismissPending();
  };

  // Copy selected text
  const handleCopy = () => {
    if (!pendingSelection) return;
    const text = pendingSelection.content?.text || '';
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedTipId(true);
    setTimeout(() => setCopiedTipId(false), 1500);
  };

  // Confirm add via modal
  const addHighlight = () => {
    if (!pendingSelection) return;
    onHighlightsChange([...highlights, makeHighlight(pendingSelection.position, pendingSelection.content, editColor, editText, editTags)]);
    dismissPending();
  };

  const updateHighlight = (id: string, updates: Partial<IHighlight>) => {
    onHighlightsChange(highlights.map(h => h.id === id ? { ...h, ...updates } : h));
    setEditingHighlight(null);
  };

  const deleteHighlight = (id: string) => {
    onHighlightsChange(highlights.filter(h => h.id !== id));
    setEditingHighlight(null);
  };

  const handleHighlightClick = (highlight: IHighlight) => {
    setEditingHighlight(highlight);
    setEditText(highlight.comment?.text || '');
    setEditColor(highlight.color || COLORS[0].value);
    setEditTags(highlight.tags || []);
  };

  const addTagToHighlight = (highlightId: string, tag: string) => {
    const h = highlights.find(x => x.id === highlightId);
    if (!h) return;
    const tags = (h.tags || []).includes(tag)
      ? (h.tags || []).filter(t => t !== tag)
      : [...(h.tags || []), tag];
    updateHighlight(highlightId, { tags });
  };

  const toggleTag = (tag: string) =>
    setEditTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-full w-full relative bg-slate-900 dark:bg-black overflow-hidden">
      {/* Stats Bar */}
      <div className="absolute top-4 right-4 z-20 flex gap-2 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
          <Hash size={12} /><span>{highlights.length}</span>
        </div>
        <div className="w-px h-4 bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-center gap-1 text-xs font-bold text-slate-600 dark:text-slate-300">
          <Sparkles size={12} /><span>{highlights.filter(h => h.tags?.includes('Idea')).length}</span>
        </div>
      </div>

      {/* Add Note Modal */}
      <HighlightModal
        isOpen={isAddingHighlight}
        onClose={dismissPending}
        onSave={addHighlight}
        title="Add Highlight"
        text={editText}
        onTextChange={setEditText}
        color={editColor}
        onColorChange={setEditColor}
        tags={editTags}
        onTagsChange={toggleTag}
        showSendToCanvas={!!onSendToCanvas}
        onSendToCanvas={() => {
          if (pendingSelection) {
            const h = makeHighlight(pendingSelection.position, pendingSelection.content, editColor, editText, editTags);
            onSendToCanvas?.(h);
          }
          dismissPending();
        }}
      />

      {/* Edit Modal */}
      {editingHighlight && (
        <HighlightModal
          isOpen
          onClose={() => setEditingHighlight(null)}
          onSave={() => updateHighlight(editingHighlight.id, {
            comment: { ...editingHighlight.comment, text: editText },
            color: editColor,
            tags: editTags,
          })}
          title="Edit Highlight"
          text={editText}
          onTextChange={setEditText}
          color={editColor}
          onColorChange={setEditColor}
          tags={editTags}
          onTagsChange={toggleTag}
          showSendToCanvas={!!onSendToCanvas}
          onSendToCanvas={() => {
            onSendToCanvas?.({ ...editingHighlight, comment: { ...editingHighlight.comment, text: editText }, color: editColor, tags: editTags });
            setEditingHighlight(null);
          }}
          onDelete={() => deleteHighlight(editingHighlight.id)}
        />
      )}

      <PdfLoader
        url={url}
        beforeLoad={
          <div className="flex items-center justify-center h-full text-slate-400 font-bold uppercase tracking-widest animate-pulse italic">
            Initializing PDF engine...
          </div>
        }
      >
        {(pdfDocument) => (
          <PdfHighlighter
            pdfDocument={pdfDocument}
            enableAreaSelection={(event) => event.altKey}
            onScrollChange={() => {}}
            scrollRef={(scrollTo) => { scrollViewerTo.current = scrollTo; }}
            onSelectionFinished={(position, content, hideTipAndSelection, transformSelection) => {
              transformSelection();
              setPendingSelection({ position, content, hideTip: hideTipAndSelection });
              setCopiedTipId(false);

              // Return the inline tip
              return (
                <SelectionTip
                  onCopy={handleCopy}
                  onQuickHighlight={handleQuickHighlight}
                  onAddNote={() => setIsAddingHighlight(true)}
                  copied={copiedTipId}
                />
              );
            }}
            highlightTransform={(highlight, index, setTip, hideTip, viewportToScaled, screenshot, isScrolledTo) => {
              const isText = !(highlight.content && highlight.content.image);

              const inner = isText ? (
                <Highlight isScrolledTo={isScrolledTo} position={highlight.position} comment={highlight.comment} />
              ) : (
                <AreaHighlight isScrolledTo={isScrolledTo} highlight={highlight} onChange={() => {}} />
              );

              const wrapped = (
                <div
                  style={{ '--highlight-bg-color': highlight.color || '#fff3bf' } as any}
                  className="custom-highlight-wrapper cursor-pointer transition-all hover:opacity-90 hover:scale-[1.01] group relative"
                  onClick={() => handleHighlightClick(highlight)}
                >
                  {inner}
                  {highlight.tags && highlight.tags.length > 0 && (
                    <div className="absolute -top-2 -right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {highlight.tags.slice(0, 2).map(tag => {
                        const t = TAGS.find(x => x.name === tag);
                        return t ? (
                          <div key={tag} className="text-[10px] bg-white dark:bg-slate-800 rounded-full px-1.5 py-0.5 shadow-md" style={{ color: t.color }}>
                            {t.icon}
                          </div>
                        ) : null;
                      })}
                    </div>
                  )}
                </div>
              );

              return (
                <Popup
                  popupContent={<HighlightPopup comment={highlight.comment} tags={highlight.tags} onTagClick={tag => addTagToHighlight(highlight.id, tag)} />}
                  onMouseOver={popupContent => setTip(highlight.position, () => popupContent)}
                  onMouseOut={hideTip}
                  key={index}
                >
                  {wrapped}
                </Popup>
              );
            }}
            highlights={highlights}
          />
        )}
      </PdfLoader>
    </div>
  );
};

// ─── Hover Popup ─────────────────────────────────────────────────────────────
const HighlightPopup = ({
  comment, tags, onTagClick,
}: {
  comment: { text: string; emoji: string };
  tags?: string[];
  onTagClick?: (tag: string) => void;
}) => (
  <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 min-w-[200px] max-w-xs">
    <div className="space-y-3">
      {tags && tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
          {tags.map(tag => {
            const t = TAGS.find(x => x.name === tag);
            return t ? (
              <button
                key={tag}
                onClick={() => onTagClick?.(tag)}
                className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 dark:bg-slate-800"
                style={{ color: t.color }}
              >
                {t.icon} {t.name}
              </button>
            ) : null;
          })}
        </div>
      )}
      {comment.text && (
        <div className="flex items-start gap-2 font-medium text-slate-700 dark:text-slate-200 leading-relaxed">
          <span className="text-lg leading-none">{comment.emoji || '💬'}</span>
          <span className="text-sm">"{comment.text}"</span>
        </div>
      )}
    </div>
  </div>
);

export default PDFViewer;