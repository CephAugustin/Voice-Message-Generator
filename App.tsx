
import React, { useState, useEffect } from 'react';
import InstructionPanel from './components/InstructionPanel';
import OutreachForm from './components/OutreachForm';
import LibraryView from './components/LibraryView';
import { Sparkles, Bookmark, LayoutGrid, PenTool } from 'lucide-react';
import { SavedScript } from './types';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'library'>(() => {
    return (localStorage.getItem('app_active_tab') as 'create' | 'library') || 'create';
  });
  
  const [selectedReference, setSelectedReference] = useState<SavedScript | null>(() => {
    const saved = localStorage.getItem('app_active_reference');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    localStorage.setItem('app_active_tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (selectedReference) {
      localStorage.setItem('app_active_reference', JSON.stringify(selectedReference));
    } else {
      localStorage.removeItem('app_active_reference');
    }
  }, [selectedReference]);

  const handleUseAsReference = (script: SavedScript) => {
    setSelectedReference(script);
    setActiveTab('create');
  };

  return (
    <div className="flex h-screen w-full bg-slate-950 overflow-hidden text-slate-200">
      {/* Left Sidebar */}
      <InstructionPanel />

      {/* Main Content Area */}
      <main className="flex-1 h-full overflow-y-auto custom-scrollbar relative flex flex-col">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-600/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>
        
        {/* Tab Navigation */}
        <div className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <button 
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'create' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <PenTool size={18} />
              Generator
              {activeTab === 'create' && <div className="absolute -bottom-4 left-0 w-full h-0.5 bg-indigo-500 animate-in fade-in slide-in-from-left-2" />}
            </button>
            <button 
              onClick={() => setActiveTab('library')}
              className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider transition-all relative ${activeTab === 'library' ? 'text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
            >
              <LayoutGrid size={18} />
              Script Library
              {activeTab === 'library' && <div className="absolute -bottom-4 left-0 w-full h-0.5 bg-indigo-500 animate-in fade-in slide-in-from-left-2" />}
            </button>
          </div>
          
          <div className="hidden sm:flex items-center gap-3 bg-slate-900/50 px-3 py-1.5 rounded-full border border-slate-800">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI Engine Active</span>
          </div>
        </div>

        <div className="relative z-10 w-full flex-1">
          {activeTab === 'create' ? (
            <OutreachForm 
              initialReference={selectedReference} 
              onClearReference={() => setSelectedReference(null)} 
            />
          ) : (
            <LibraryView 
              onUseAsReference={handleUseAsReference}
              activeReferenceId={selectedReference?.id}
            />
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
