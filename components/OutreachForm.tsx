
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Wand2, Loader2, Clipboard, Check, User, Building, AlertTriangle, Gift, Mic, Sparkles, MessageSquare, Gauge, Lightbulb, Bookmark, Volume2, X, Palette, Headset } from 'lucide-react';
import { generateVoiceNote, processAudioResearch, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { GenerationStatus, VoiceNoteInput, VoiceNoteResult, CustomTemplate, SavedScript, VoiceOption } from '../types';
import TemplateManager, { TemplateManagerHandle } from './TemplateManager';
import VoiceRecorder from './VoiceRecorder';

const TONE_VOICE_MAP: Record<string, VoiceOption> = {
  'Casual': 'Puck',
  'Professional': 'Charon',
  'Direct': 'Fenrir',
  'Warm': 'Kore'
};

interface OutreachFormProps {
  initialReference: SavedScript | null;
  onClearReference: () => void;
}

const OutreachForm: React.FC<OutreachFormProps> = ({ initialReference, onClearReference }) => {
  const templateManagerRef = useRef<TemplateManagerHandle>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  
  const [formData, setFormData] = useState<VoiceNoteInput>({
    ownerName: '',
    businessName: '',
    identifiedGap: '',
    freeValue: '',
    platform: 'Instagram',
    tone: 'Casual',
    goal: 'Permission to Send',
    selectedVoice: 'Puck'
  });

  const [activeTemplate, setActiveTemplate] = useState<CustomTemplate | null>(null);
  const [result, setResult] = useState<VoiceNoteResult | null>(null);
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedFollowUp, setCopiedFollowUp] = useState(false);
  const [isSavedInLibrary, setIsSavedInLibrary] = useState(false);

  useEffect(() => {
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (result) {
      setIsSavedInLibrary(false);
      setErrorMessage(null);
    }
  }, [result]);

  const estimatedDuration = useMemo(() => {
    if (!result?.script) return 0;
    const cleanScript = result.script.replace(/\[.*?\]/g, '');
    const words = cleanScript.trim().split(/\s+/).length;
    return Math.round((words / 140) * 60);
  }, [result]);

  const durationStatus = useMemo(() => {
    if (estimatedDuration < 30) return { label: 'Too Short', color: 'text-amber-400', bar: 'bg-amber-400' };
    if (estimatedDuration <= 55) return { label: 'Perfect Length', color: 'text-green-400', bar: 'bg-green-400' };
    return { label: 'A Bit Long', color: 'text-red-400', bar: 'bg-red-400' };
  }, [estimatedDuration]);

  const handleAudioCaptured = async (base64: string, mimeType: string) => {
    try {
      setErrorMessage(null);
      const data = await processAudioResearch(base64, mimeType);
      setFormData(prev => ({
        ...prev,
        ownerName: data.ownerName || prev.ownerName,
        businessName: data.businessName || prev.businessName,
        identifiedGap: data.identifiedGap || prev.identifiedGap,
        freeValue: data.freeValue || prev.freeValue,
      }));
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to process audio.");
    }
  };

  const validateFields = (): boolean => {
    const requiredFields: (keyof VoiceNoteInput)[] = ['ownerName', 'businessName', 'identifiedGap', 'freeValue'];
    for (const field of requiredFields) {
      if (!formData[field] || (formData[field] as string).trim().length < 2) {
        setErrorMessage(`Please provide a valid value for ${field.replace(/([A-Z])/g, ' $1').toLowerCase()}.`);
        return false;
      }
    }
    return true;
  };

  const handleGenerate = async () => {
    if (status === GenerationStatus.LOADING) return;
    setErrorMessage(null);
    
    if (!validateFields()) return;

    setStatus(GenerationStatus.LOADING);
    setResult(null);
    
    try {
      const data = await generateVoiceNote(formData, activeTemplate || undefined, initialReference || undefined);
      setResult(data);
      setStatus(GenerationStatus.SUCCESS);
    } catch (error: any) {
      setErrorMessage(error.message || "Something went wrong.");
      setStatus(GenerationStatus.ERROR);
    }
  };

  const handlePlayTTS = async () => {
    if (!result || ttsLoading || isPlaying) return;
    setTtsLoading(true);
    setErrorMessage(null);

    try {
      const base64Audio = await generateSpeech(result.script, formData.selectedVoice, formData.tone);
      
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioContextRef.current;
      const audioBytes = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioBytes, ctx);
      
      if (activeSourceRef.current) {
        activeSourceRef.current.stop();
      }

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        activeSourceRef.current = null;
      };
      
      activeSourceRef.current = source;
      setIsPlaying(true);
      source.start();
    } catch (error: any) {
      setErrorMessage(error.message || "Audio playback failed.");
      setTtsLoading(false);
    } finally {
      setTtsLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'script' | 'followup') => {
    navigator.clipboard.writeText(text);
    if (type === 'script') {
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    } else {
      setCopiedFollowUp(true);
      setTimeout(() => setCopiedFollowUp(false), 2000);
    }
  };

  const handleSaveToLibrary = () => {
    if (!result?.script) return;
    const newEntry: SavedScript = {
      id: Date.now().toString(),
      title: `${formData.ownerName} @ ${formData.businessName}`,
      content: result.script,
      ownerName: formData.ownerName,
      businessName: formData.businessName,
      createdAt: Date.now()
    };
    const existing = JSON.parse(localStorage.getItem('voice_note_library') || '[]');
    localStorage.setItem('voice_note_library', JSON.stringify([newEntry, ...existing]));
    setIsSavedInLibrary(true);
  };

  const updateField = (field: keyof VoiceNoteInput, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      if (field === 'tone') {
        newData.selectedVoice = TONE_VOICE_MAP[value] || 'Zephyr';
      }
      return newData;
    });
  };

  return (
    <div className="max-w-4xl w-full mx-auto p-6 flex flex-col gap-10 justify-start py-12">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
          Voice Note <span className="gradient-text">Script Engine</span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Personalized, value-first scripts designed to bypass the automation filter.
        </p>
      </div>

      <div className="glass-effect rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        {status === GenerationStatus.LOADING && (
          <div className="absolute top-0 left-0 h-1 bg-indigo-500 w-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-[shimmer_2s_infinite]"></div>
          </div>
        )}

        <div className="space-y-8">
          <div className="space-y-3">
             <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-indigo-400" />
                <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">Rapid Setup</span>
             </div>
             <VoiceRecorder onAudioCaptured={handleAudioCaptured} />
          </div>

          <TemplateManager 
            ref={templateManagerRef}
            activeTemplateId={activeTemplate?.id}
            onSelect={setActiveTemplate}
          />

          {initialReference && (
            <div className="animate-in slide-in-from-top-2 duration-300">
               <div className="flex items-center gap-3 px-4 py-3 bg-indigo-500/10 border border-indigo-500/30 rounded-xl">
                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <div className="flex-1">
                  <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest block">Active Style Reference</span>
                  <span className="text-xs text-white font-medium">Modeling after: <span className="font-black">{initialReference.ownerName} @ {initialReference.businessName}</span></span>
                </div>
                <button 
                  onClick={onClearReference} 
                  className="p-1.5 hover:bg-indigo-500/20 rounded-lg text-slate-400 hover:text-white transition-all"
                  title="Clear Reference"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                <User size={14} className="text-indigo-400" /> Owner's Name
              </label>
              <input
                type="text"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="e.g. Mike"
                value={formData.ownerName}
                onChange={(e) => updateField('ownerName', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                <Building size={14} className="text-indigo-400" /> Business Name
              </label>
              <input
                type="text"
                className="w-full bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                placeholder="e.g. Peak Fitness"
                value={formData.businessName}
                onChange={(e) => updateField('businessName', e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                <AlertTriangle size={14} className="text-orange-400" /> The Gap Identified
              </label>
              <textarea
                className="w-full h-20 bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                placeholder="e.g. Landing page copy is simple and leaving clients on the table."
                value={formData.identifiedGap}
                onChange={(e) => updateField('identifiedGap', e.target.value)}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                <Gift size={14} className="text-green-400" /> The Free Value (The Sidekick)
              </label>
              <textarea
                className="w-full h-20 bg-slate-950/50 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                placeholder="e.g. Rewrote the whole page and drafted a sidekick email sequence."
                value={formData.freeValue}
                onChange={(e) => updateField('freeValue', e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:col-span-2 mt-4 pt-6 border-t border-slate-800">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                  <Palette size={14} className="text-purple-400" /> Tone & Goal
                </label>
                <div className="flex gap-2">
                  <select 
                    value={formData.tone}
                    onChange={(e) => updateField('tone', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="Casual">Casual</option>
                    <option value="Professional">Professional</option>
                    <option value="Direct">Direct</option>
                    <option value="Warm">Warm</option>
                  </select>
                  <select 
                    value={formData.goal}
                    onChange={(e) => updateField('goal', e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
                  >
                    <option value="Permission to Send">Permission</option>
                    <option value="Testimonial/Feedback">Testimonial</option>
                    <option value="Book a Call">Book Call</option>
                  </select>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-400 uppercase flex items-center gap-2">
                  <Headset size={14} className="text-blue-400" /> AI Persona (Auto-Sync)
                </label>
                <select 
                  value={formData.selectedVoice}
                  onChange={(e) => updateField('selectedVoice', e.target.value as VoiceOption)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50"
                >
                  <option value="Zephyr">Zephyr (Balanced)</option>
                  <option value="Puck">Puck (Energetic)</option>
                  <option value="Kore">Kore (Cheerful)</option>
                  <option value="Fenrir">Fenrir (Steady)</option>
                  <option value="Charon">Charon (Deep)</option>
                </select>
              </div>
            </div>

            {errorMessage && (
              <div className="md:col-span-2 flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm animate-in fade-in slide-in-from-top-1">
                <X size={16} />
                {errorMessage}
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={status === GenerationStatus.LOADING}
              className="md:col-span-2 py-4 mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-slate-800 disabled:to-slate-800 text-white font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-2xl relative group"
            >
              {status === GenerationStatus.LOADING ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Generating tailored script...</span>
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  <span>Generate High-Converting Script</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-effect rounded-2xl p-6 border-indigo-500/30 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                    <Mic size={16} /> The Voice Note Script
                  </h3>
                  <div className={`text-[10px] font-bold mt-1 uppercase flex items-center gap-1.5 ${durationStatus.color}`}>
                     <Gauge size={12} /> {durationStatus.label} (~{estimatedDuration}s)
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={handlePlayTTS}
                    disabled={ttsLoading || isPlaying}
                    className={`transition-colors p-2 rounded-lg flex items-center gap-2 text-xs bg-indigo-600/10 border border-indigo-500/20 ${isPlaying ? 'text-indigo-400' : 'text-indigo-300 hover:bg-indigo-600/20'}`}
                  >
                    {ttsLoading ? <Loader2 className="animate-spin" size={16} /> : <Volume2 size={16} />}
                    <span className="hidden sm:inline">{isPlaying ? 'Playing...' : 'Voice Preview'}</span>
                  </button>
                  <button 
                    onClick={handleSaveToLibrary}
                    disabled={isSavedInLibrary}
                    className={`transition-colors p-2 rounded-lg flex items-center gap-2 text-xs ${isSavedInLibrary ? 'text-green-400 bg-green-500/10' : 'text-slate-400 hover:text-yellow-400 hover:bg-yellow-500/10'}`}
                  >
                    {isSavedInLibrary ? <Check size={16} /> : <Bookmark size={16} />}
                  </button>
                  <button 
                    onClick={() => copyToClipboard(result.script, 'script')}
                    className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800 flex items-center gap-2 text-xs border border-transparent hover:border-slate-700"
                  >
                    {copiedScript ? <Check size={16} className="text-green-500" /> : <Clipboard size={16} />}
                  </button>
                </div>
              </div>

              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden relative">
                <div 
                  className={`h-full transition-all duration-1000 ${durationStatus.bar}`} 
                  style={{ width: `${Math.min((estimatedDuration / 60) * 100, 100)}%` }}
                />
                <div className="absolute top-0 left-[58%] h-full w-[25%] bg-green-500/20 border-x border-green-500/30"></div>
              </div>

              <div className="p-6 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-200 leading-relaxed whitespace-pre-wrap font-medium text-lg min-h-[160px]">
                {result.script}
              </div>
            </div>

            <div className="flex flex-col gap-6">
              <div className="glass-effect rounded-2xl p-6 border-blue-500/20 flex flex-col shadow-lg shadow-blue-500/5">
                <h3 className="text-sm font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <MessageSquare size={16} /> Micro-Text
                </h3>
                <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 mb-2 relative group">
                  <p className="text-slate-200 text-sm italic leading-relaxed">"{result.followUp}"</p>
                  <button onClick={() => copyToClipboard(result.followUp, 'followup')} className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-white transition-opacity"><Clipboard size={14}/></button>
                </div>
              </div>

              <div className="glass-effect rounded-2xl p-6 border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
                <h3 className="text-sm font-bold text-purple-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                  <Lightbulb size={16} /> Delivery Tip
                </h3>
                <p className="text-slate-500 text-[11px] leading-snug">Modeling as <span className="text-purple-300 font-bold">{formData.selectedVoice}</span>. Remember to match their energy in your actual recording!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center opacity-40 mt-4">
        <span className="text-[10px] text-slate-500 uppercase tracking-[0.3em] font-bold">Optimized for Direct Outreach Efficiency</span>
      </div>
    </div>
  );
};

export default OutreachForm;
