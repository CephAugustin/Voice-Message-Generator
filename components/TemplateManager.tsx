
import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { Plus, Save, Trash2, Edit3, X, FileText } from 'lucide-react';
import { CustomTemplate } from '../types';

interface TemplateManagerProps {
  onSelect: (template: CustomTemplate | null) => void;
  activeTemplateId?: string;
}

export interface TemplateManagerHandle {
  initNewTemplate: (content: string) => void;
}

const TemplateManager = forwardRef<TemplateManagerHandle, TemplateManagerProps>(({ onSelect, activeTemplateId }, ref) => {
  const [templates, setTemplates] = useState<CustomTemplate[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<Partial<CustomTemplate>>({ name: '', content: '' });

  // Expose method to parent to trigger "Save as Template" from results
  useImperativeHandle(ref, () => ({
    initNewTemplate: (content: string) => {
      setCurrentTemplate({ name: '', content });
      setIsEditing(true);
      // Scroll to top or template area if needed
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }));

  useEffect(() => {
    const saved = localStorage.getItem('voice_note_templates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    }

    const handlePageShow = (event: PageTransitionEvent) => {
      onSelect(null);
    };

    window.addEventListener('pageshow', handlePageShow);
    onSelect(null);

    return () => {
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [onSelect]);

  const saveTemplates = (newTemplates: CustomTemplate[]) => {
    setTemplates(newTemplates);
    localStorage.setItem('voice_note_templates', JSON.stringify(newTemplates));
  };

  const handleSave = () => {
    if (!currentTemplate.name || !currentTemplate.content) {
      alert("Please provide both a name and template content.");
      return;
    }

    if (currentTemplate.id) {
      const updated = templates.map(t => t.id === currentTemplate.id ? (currentTemplate as CustomTemplate) : t);
      saveTemplates(updated);
    } else {
      const newTemplate: CustomTemplate = {
        id: Date.now().toString(),
        name: currentTemplate.name!,
        content: currentTemplate.content!
      };
      saveTemplates([...templates, newTemplate]);
      onSelect(newTemplate); // Automatically select the newly created template
    }
    setIsEditing(false);
    setCurrentTemplate({ name: '', content: '' });
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;
    const updated = templates.filter(t => t.id !== id);
    saveTemplates(updated);
    if (activeTemplateId === id) onSelect(null);
  };

  const handleEdit = (template: CustomTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentTemplate(template);
    setIsEditing(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <FileText size={14} className="text-indigo-400" /> Script Templates
        </h3>
        {!isEditing && (
          <button 
            onClick={() => {
              setCurrentTemplate({ name: '', content: '' });
              setIsEditing(true);
            }}
            className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors font-medium"
          >
            <Plus size={14} /> Create New
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="p-5 bg-slate-900/80 rounded-xl border border-indigo-500/40 shadow-xl animate-in fade-in zoom-in-95 duration-200">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              {currentTemplate.id ? 'Edit Template' : 'New Template'}
            </span>
            <button onClick={() => setIsEditing(false)} className="text-slate-500 hover:text-white transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-3">
            <input 
              type="text"
              placeholder="Template Name (e.g. Testimonial Outreach)"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 transition-all"
              value={currentTemplate.name}
              onChange={e => setCurrentTemplate({...currentTemplate, name: e.target.value})}
              autoFocus
            />
            <textarea 
              placeholder="Write your template style here... Use [ownerName], [businessName], [identifiedGap], [freeValue] as placeholders for the AI to fill."
              className="w-full h-32 bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:ring-1 focus:ring-indigo-500 resize-none font-mono text-xs leading-relaxed"
              value={currentTemplate.content}
              onChange={e => setCurrentTemplate({...currentTemplate, content: e.target.value})}
            />
            <div className="flex gap-2 justify-end pt-2">
              <button 
                onClick={() => { setIsEditing(false); setCurrentTemplate({ name: '', content: '' }); }}
                className="px-4 py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
              >
                <Save size={14} /> {currentTemplate.id ? 'Update Template' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onSelect(null)}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold border transition-all ${
              !activeTemplateId 
                ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700'
            }`}
          >
            Default AI
          </button>
          {templates.map(template => (
            <div 
              key={template.id}
              onClick={() => onSelect(template)}
              className={`group flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
                activeTemplateId === template.id 
                  ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-500/10' 
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="max-w-[120px] truncate">{template.name}</span>
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 border-l border-slate-700 pl-2">
                <button 
                  onClick={(e) => handleEdit(template, e)} 
                  className="p-1 hover:text-indigo-400 transition-colors"
                  title="Edit"
                >
                  <Edit3 size={12} />
                </button>
                <button 
                  onClick={(e) => handleDelete(template.id, e)} 
                  className="p-1 hover:text-red-400 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

export default TemplateManager;
