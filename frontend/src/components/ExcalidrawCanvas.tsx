import React, { useState, useMemo, useImperativeHandle, forwardRef } from 'react';
import { Excalidraw, MainMenu } from '@excalidraw/excalidraw';
import { Save } from 'lucide-react';
import type { Paper, Highlight } from '../types/index';
import { useTheme } from '../hooks/useTheme';

// Ensure styles are imported
import "@excalidraw/excalidraw/index.css";

interface ExcalidrawCanvasProps {
  paper: Paper;
  onUpdate: (updates: Partial<Paper>) => void;
  onHighlightClick?: (id: string) => void;
}

export interface ExcalidrawCanvasHandle {
  addSnippet: (highlight: Highlight) => void;
}

const ExcalidrawCanvas = forwardRef<ExcalidrawCanvasHandle, ExcalidrawCanvasProps>(({ paper, onUpdate, onHighlightClick }, ref) => {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);
  const { theme } = useTheme();

  useImperativeHandle(ref, () => ({
    addSnippet: async (highlight: Highlight) => {
      if (!excalidrawAPI) return;
      
      const id = highlight.id;
      const isImage = !!highlight.content.image;
      
      if (isImage && highlight.content.image) {
        // Handle Image Snippet
        const fileId = `img-${id}`;
        const files = {
          [fileId]: {
            id: fileId,
            mimeType: "image/png",
            dataURL: highlight.content.image,
            created: Date.now(),
          }
        };

        const elements = [
          {
            type: "image",
            x: 150,
            y: 150,
            width: highlight.position.boundingRect.width * 2, // Scale up for visibility
            height: highlight.position.boundingRect.height * 2,
            fileId: fileId,
            strokeColor: "transparent",
            backgroundColor: "transparent",
            link: `#highlight-${id}`,
          }
        ];

        excalidrawAPI.addFiles(Object.values(files));
        excalidrawAPI.addElements(elements);
        excalidrawAPI.scrollToContent(elements[0]);
      } else {
        // Handle Text Snippet
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
          }
        ];
        excalidrawAPI.addElements(elements);
        excalidrawAPI.scrollToContent(elements[0]);
      }
    }
  }));

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
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    const files = excalidrawAPI.getFiles();
    const { collaborators, ...persistentAppState } = appState;

    onUpdate({ 
      canvasData: { 
        elements: elements.filter((el: any) => !el.isDeleted), 
        appState: persistentAppState,
        files 
      } 
    });
  };

  const onLinkOpen = (element: any, event: CustomEvent<{ nativeEvent: MouseEvent }>) => {
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
        excalidrawAPI={(api) => setExcalidrawAPI(api)}
        initialData={initialData}
        onLinkOpen={onLinkOpen}
        theme={theme}
        detectScroll={true}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: true,
            clearCanvas: true,
            theme: false,
            saveAsScene: false,
            loadScene: false,
            export: false
          }
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
