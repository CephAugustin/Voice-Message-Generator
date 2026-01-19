
import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, Trash2, Calendar, User, Search, Play, Copy, Check, Wand2, MessageSquare, Building, Volume2, Loader2 } from 'lucide-react';
import { SavedScript } from '../types';
import { generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';

interface LibraryViewProps {
  onUseAsReference: (script: SavedScript) => void;
  activeReferenceId?: string;
}

const LibraryView: React.FC<LibraryViewProps> = ({ onUseAsReference, activeReferenceId }) => {
  const [scripts, setScripts] = useState<SavedScript[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const loadScripts = () => {
      const saved = localStorage.getItem('voice_note_library');
      if (saved) {
        setScripts(JSON.parse(saved));
      }
    };
    loadScripts();
    window.addEventListener('storage', loadScripts);
    return () => window.removeEventListener('storage', loadScripts);
  }, []);

  const handleDelete = (id: string) => {
    if (!confirm("Remove this script from your library?")) return;
    const updated = scripts.filter(s => s.id !== id);
    setScripts(updated);
    localStorage.setItem('voice_note_library', JSON.stringify(updated));
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePlayVoice = async (script: SavedScript) => {
    if (loadingId || playingId) return;
    
    setLoadingId(script.id);
    try {
      // Default to Zephyr for library playback of old scripts
      const base64Audio = await generateSpeech(script.content, 'Zephyr', 'Professional');
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      setLoadingId(null);
      setPlayingId(script.id);
      
      source.onended = () => setPlayingId(null);
      source.start();
    } catch (error) {
      console.error("Library playback error:", error);
      setLoadingId(null);
      setPlayingId(null);
      alert("Failed to generate audio. Please try again.");
    }
  };

  const filteredScripts = scripts.filter(s => 
    s.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
        <div>
          <h2 className="text-3xl font-bold text-white flex items-center gap-3">
            <Bookmark className="text-yellow-400" />
            Your <span className="gradient-text">Success Library</span>
          </h2>
          <p className="text-slate-400 text-sm mt-1">Manage and reuse your highest-converting voice note scripts.</p>
        </div>

        <div className="relative group w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
          <input 
            type="text"
            placeholder="Search leads, companies, or scripts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-3 pl-10 pr-4 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all outline-none"
          />
        </div>
      </div>

      {filteredScripts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 glass-effect rounded-3xl border-dashed border-2 border-slate-800">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mb-4 text-slate-600">
            <Bookmark size={32} />
          </div>
          <h3 className="text-xl font-bold text-slate-300">No scripts found</h3>
          <p className="text-slate-500 text-sm mt-2">Generate and save scripts to build your personal library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredScripts.map(script => (
            <div 
              key={script.id}
              className={`glass-effect rounded-2xl p-6 border transition-all flex flex-col group relative ${
                activeReferenceId === script.id 
                ? 'border-indigo-500 shadow-xl shadow-indigo-500/10 bg-indigo-500/5' 
                : 'border-slate-800 hover:border-slate-700 shadow-lg'
              }`}
            >
              {activeReferenceId === script.id && (
                <div className="absolute -top-3 left-6 bg-indigo-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest shadow-lg z-10">
                  Active Style
                </div>
              )}

              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2 text-white font-bold text-lg">
                    <User size={16} className="text-indigo-400" />
                    {script.ownerName}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs mt-1">
                    <Building size={14} />
                    {script.businessName}
                  </div>
                </div>
                <div className="flex gap-1">
                   <button 
                    onClick={() => handlePlayVoice(script)}
                    disabled={!!loadingId || !!playingId}
                    className={`p-2 rounded-lg transition-colors ${
                      playingId === script.id 
                        ? 'text-indigo-400 bg-indigo-500/20' 
                        : 'text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10'
                    }`}
                  >
                    {loadingId === script.id ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
                  </button>
                  <button 
                    onClick={() => handleDelete(script.id)}
                    className="p-2 text-slate-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex-1 bg-slate-950/50 rounded-xl p-4 border border-slate-800 mb-6 relative group/content overflow-hidden">
                <p className="text-slate-300 text-sm leading-relaxed italic line-clamp-6">
                  "{script.content.replace(/\[.*?\]/g, '')}"
                </p>
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent opacity-0 group-hover/content:opacity-100 transition-opacity flex items-end justify-center pb-4">
                   <button 
                    onClick={() => handleCopy(script.content, script.id)}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-700 shadow-xl"
                   >
                     {copiedId === script.id ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
                     {copiedId === script.id ? 'Copied' : 'Copy Text'}
                   </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
                  <Calendar size={12} />
                  {formatDate(script.createdAt)}
                </div>
                
                <button 
                  onClick={() => onUseAsReference(script)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeReferenceId === script.id
                    ? 'bg-indigo-500 text-white shadow-lg'
                    : 'bg-indigo-600/10 text-indigo-400 hover:bg-indigo-600/20'
                  }`}
                >
                  <Wand2 size={14} />
                  {activeReferenceId === script.id ? 'Active Style' : 'Use as Style'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryView;
