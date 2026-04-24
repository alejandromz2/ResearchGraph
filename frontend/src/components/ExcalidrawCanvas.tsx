import {
  useMemo,
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
  type MutableRefObject,
} from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { Save } from 'lucide-react';
import type { Paper, Highlight } from '../types/index';
import { useTheme } from '../hooks/useTheme';

// Ensure styles are imported
import "@excalidraw/excalidraw/index.css";

interface ExcalidrawCanvasProps {
  paper: Paper;
  onUpdate: (updates: Partial<Paper>) => void | Promise<void>;
  onHighlightClick?: (id: string) => void;
}

export interface ExcalidrawCanvasHandle {
  addSnippet: (highlight: Highlight) => void;
  flushSave: () => Promise<void>;
}

/** Guardado automático del lienzo cada 2 minutos (sin interrumpir la edición de texto). */
const AUTOSAVE_INTERVAL_MS = 2 * 60 * 1000;

/** Espera a que Excalidraw exponga la API (callback asíncrono). */
async function waitForApi(apiRef: MutableRefObject<any>, maxMs = 3000) {
  const start = Date.now();
  while (!apiRef.current && Date.now() - start < maxMs) {
    await new Promise((r) => setTimeout(r, 32));
  }
}

/** Tras editar texto en el lienzo, el WYSIWYG confirma al perder foco; forzamos antes de leer la escena. */
async function commitExcalidrawDomEdits() {
  (document.activeElement as HTMLElement | null)?.blur?.();
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

const ExcalidrawCanvas = forwardRef<ExcalidrawCanvasHandle, ExcalidrawCanvasProps>(({ paper, onUpdate, onHighlightClick }, ref) => {
  const apiRef = useRef<any>(null);
  const onUpdateRef = useRef(onUpdate);
  const { theme } = useTheme();

  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  const persistCanvasData = useCallback(
    async (elements: readonly any[], appState: any, files: any) => {
      const { collaborators: _c, ...persistentAppState } = appState;
      await Promise.resolve(
        onUpdateRef.current({
          canvasData: {
            elements: elements.filter((el: any) => !el.isDeleted),
            appState: persistentAppState,
            files,
          },
        })
      );
    },
    []
  );

  const flushSave = useCallback(async () => {
    await waitForApi(apiRef);
    const api = apiRef.current;
    if (!api) return;
    await commitExcalidrawDomEdits();
    await persistCanvasData(api.getSceneElements(), api.getAppState(), api.getFiles());
  }, [persistCanvasData]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        const api = apiRef.current;
        if (!api) return;
        try {
          await persistCanvasData(api.getSceneElements(), api.getAppState(), api.getFiles());
        } catch (e) {
          console.error('Autosave del lienzo:', e);
        }
      })();
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [paper.id, persistCanvasData]);

  useImperativeHandle(
    ref,
    () => ({
      flushSave,
      addSnippet: async (highlight: Highlight) => {
        const api = apiRef.current;
        if (!api) return;

        const id = highlight.id;
        const isImage = !!highlight.content.image;

        if (isImage && highlight.content.image) {
          const fileId = `img-${id}`;
          const files = {
            [fileId]: {
              id: fileId,
              mimeType: "image/png",
              dataURL: highlight.content.image,
              created: Date.now(),
            },
          };

          const elements = [
            {
              type: "image",
              x: 150,
              y: 150,
              width: highlight.position.boundingRect.width * 2,
              height: highlight.position.boundingRect.height * 2,
              fileId: fileId,
              strokeColor: "transparent",
              backgroundColor: "transparent",
              link: `#highlight-${id}`,
            },
          ];

          api.addFiles(Object.values(files));
          api.addElements(elements);
          api.scrollToContent(elements[0]);
        } else {
          const text = highlight.content.text || 'Reference';
          const elements = [
            {
              type: "text",
              x: 100,
              y: 100,
              text: `(p.${highlight.position.pageNumber}):\n"${text.substring(0, 150)}${text.length > 150 ? '...' : ''}"`,
              fontSize: 16,
              fontFamily: 1,
              strokeColor: theme === 'dark' ? '#3b82f6' : '#2563eb',
              link: `#highlight-${id}`,
            },
          ];
          api.addElements(elements);
          api.scrollToContent(elements[0]);
        }
      },
    }),
    [flushSave, theme]
  );

  const initialData = useMemo(() => {
    const defaultData = {
      elements: [],
      appState: { 
        theme, 
        viewBackgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff',
        currentItemStrokeColor: theme === 'dark' ? '#ffffff' : '#000000',
      },
      files: {},
    };

    if (paper.canvasData && typeof paper.canvasData === 'object') {
      const savedAppState = paper.canvasData.appState || {};
      const { collaborators, ...cleanAppState } = savedAppState;

      return {
        elements: paper.canvasData.elements || [],
        appState: { 
          ...defaultData.appState,
          ...cleanAppState,
          theme
        },
        files: paper.canvasData.files || {},
      };
    }
    return defaultData;
  }, [paper.id, theme]);

  const handleSave = () => {
    void flushSave();
  };

  const onLinkOpen = (
    element: any,
    event: CustomEvent<{ nativeEvent: MouseEvent | PointerEvent }>
  ) => {
    const link = element.link;
    if (link?.startsWith('#highlight-')) {
      event.preventDefault();
      onHighlightClick?.(link.replace('#highlight-', ''));
    }
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-white dark:bg-slate-900">
      <Excalidraw 
        key={`${paper.id}-${theme}`}
        excalidrawAPI={(api) => {
          apiRef.current = api;
        }}
        initialData={initialData}
        onLinkOpen={onLinkOpen}
        theme={theme}
        detectScroll={true}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            toggleTheme: false,
            loadScene: false,
            saveToActiveFile: false,
            export: false,
          },
        }}
      >
        <MainMenu>
          <MainMenu.DefaultItems.ClearCanvas />
          <MainMenu.DefaultItems.SaveAsImage />
          <MainMenu.DefaultItems.ChangeCanvasBackground />
        </MainMenu>
        
        <div style={{ position: 'absolute', top: '12px', right: '12px', zIndex: 9999 }}>
          <button 
            className="btn-primary shadow-xl shadow-blue-600/40 px-6 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] active:scale-95 transition-all hover:bg-blue-500" 
            onClick={handleSave} 
          >
            <Save size={16} className="mr-2" strokeWidth={3} /> Save Scene
          </button>
        </div>
      </Excalidraw>
    </div>
  );
});

export default ExcalidrawCanvas;
