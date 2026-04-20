import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useParams, useLocation, useNavigate } from 'react-router-dom';
import { Table, Network, Plus, FolderOpen, Search, Settings, Home, Sun, Moon, ChevronRight, Layout } from 'lucide-react';
import { projectApi } from './api';
import type { Project } from './types/index';
import TableView from './components/TableView';
import GraphView from './components/GraphView';
import GlobalGraphView from './components/GlobalGraphView';
import NodeEditor from './components/NodeEditor';
import { ThemeProvider, useTheme } from './hooks/useTheme';
import './index.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button 
      onClick={toggleTheme}
      className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-blue-600 hover:text-white transition-all shadow-inner"
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
};

const ProjectCard = ({ project }: { project: Project }) => (
  <Link 
    to={`/project/${project.id}`}
    className="group bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all duration-300 flex flex-col gap-6"
  >
    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white transition-all duration-300 shadow-inner">
      <FolderOpen size={32} />
    </div>
    <div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.name}</h3>
      <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed line-clamp-2">
        {project.description || 'No description provided for this research workspace.'}
      </p>
    </div>
    <div className="mt-auto flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 group-hover:text-blue-500">
      Open Project <ChevronRight size={14} />
    </div>
  </Link>
);

const Dashboard = ({ projects, onProjectCreate }: { projects: Project[], onProjectCreate: () => void }) => {
  const navigate = useNavigate();
  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-auto">
      <header className="h-24 px-12 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Network className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">ResearchGraph</h1>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Workspace Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <button onClick={() => navigate('/global-graph')} className="btn-secondary py-3 px-8 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
            <Layout size={20} className="text-blue-500" /> View Global Graph
          </button>
          <button onClick={onProjectCreate} className="btn-primary py-3 px-8 rounded-2xl shadow-xl shadow-blue-500/20 hover:scale-105 active:scale-95 transition-all">
            <Plus size={20} className="mr-2" /> New Project
          </button>
        </div>
      </header>

      <main className="px-12 pb-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 p-12 bg-blue-600 dark:bg-blue-700 rounded-[3rem] text-white relative overflow-hidden shadow-2xl shadow-blue-200 dark:shadow-blue-900/20">
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-4xl font-black mb-4 leading-tight">Your Research Universe</h2>
              <p className="text-blue-100 dark:text-blue-50 text-lg font-medium opacity-90 leading-relaxed mb-8">
                Organize papers, visualize connections, and build deep insights within your dedicated projects.
              </p>
              <div className="flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="text-3xl font-black">{projects.length}</span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Active Projects</span>
                </div>
                <div className="w-px h-10 bg-white/20"></div>
                <div className="flex flex-col">
                  <span className="text-3xl font-black">∞</span>
                  <span className="text-[10px] font-black uppercase tracking-widest opacity-60">Connections</span>
                </div>
              </div>
            </div>
            <Network size={300} className="absolute -right-20 -bottom-20 text-white/10 rotate-12" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {projects.map(p => (
              <ProjectCard key={p.id} project={p} />
            ))}
            <button 
              onClick={onProjectCreate}
              className="group border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-8 flex flex-col items-center justify-center gap-4 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-white dark:hover:bg-slate-900 transition-all duration-300"
            >
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 group-hover:text-blue-500 transition-all">
                <Plus size={32} />
              </div>
              <p className="font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-blue-500 transition-colors">Create Project</p>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

const ProjectLayout = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const isGraph = location.pathname.includes('/graph');
  const isEditor = location.pathname.includes('/paper/');

  if (!projectId) return null;

  if (isEditor) {
    return (
      <div className="flex-1 h-full overflow-hidden">
        <Routes>
          <Route path="paper/:paperId" element={<NodeEditor projectId={projectId} />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden transition-colors">
      <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-blue-600 dark:hover:bg-blue-500 hover:text-white transition-all shadow-inner"
            title="Back to Projects"
          >
            <Home size={20} />
          </button>
          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800"></div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Project Dashboard</h2>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Workspace ID: {projectId.slice(0,8)}</p>
          </div>
          <nav className="ml-4 flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-inner">
            <Link 
              to={`/project/${projectId}`} 
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                !isGraph ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Table size={14} strokeWidth={3} /> Table
            </Link>
            <Link 
              to={`/project/${projectId}/graph`} 
              className={`flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                isGraph ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <Network size={14} strokeWidth={3} /> Graph
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search papers..." 
              className="pl-12 pr-6 py-3 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500/20 w-80 transition-all focus:bg-white dark:focus:bg-slate-700 focus:shadow-inner"
            />
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-auto p-12">
        <div className="max-w-7xl mx-auto h-full">
          <Routes>
            <Route index element={<TableView projectId={projectId} />} />
            <Route path="graph" element={<GraphView projectId={projectId} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

function App() {
  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    projectApi.list().then(setProjects);
  }, []);

  const handleCreateProject = async () => {
    const name = prompt('Enter project name:');
    if (!name) return;
    try {
      const newProject = await projectApi.create(name, '');
      setProjects([...projects, newProject]);
    } catch (err) {
      alert('Failed to create project');
    }
  };

  return (
    <ThemeProvider>
      <div className="flex h-screen w-full bg-white dark:bg-slate-950 overflow-hidden font-sans transition-colors duration-300">
        <Routes>
          <Route path="/" element={<Dashboard projects={projects} onProjectCreate={handleCreateProject} />} />
          <Route path="/global-graph" element={<GlobalGraphView />} />
          <Route path="/project/:projectId/*" element={<ProjectLayout />} />
        </Routes>
      </div>
    </ThemeProvider>
  );
}

const AppWrapper = () => (
  <Router>
    <App />
  </Router>
);

export default AppWrapper;
