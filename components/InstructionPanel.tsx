
import React from 'react';
import { Mic, Zap, Smile, MessageSquare, ListChecks } from 'lucide-react';

const InstructionPanel: React.FC = () => {
  return (
    <div className="w-80 h-full border-r border-slate-800 bg-slate-950 p-6 flex flex-col gap-6 custom-scrollbar overflow-y-auto hidden lg:flex shrink-0">
      <div className="flex items-center justify-between text-slate-400">
        <span className="text-sm font-medium flex items-center gap-2">
          <Mic size={16} className="text-indigo-400" />
          Voice Script Engine
        </span>
      </div>

      <div className="space-y-6">
        <section>
          <h3 className="text-slate-200 text-xs font-bold mb-3 uppercase tracking-widest flex items-center gap-2">
            <ListChecks size={14} /> The Strategy
          </h3>
          <ul className="text-slate-400 text-sm space-y-3">
            <li className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
              <span className="text-indigo-300 font-semibold block mb-1">0-5s: Pattern Interrupt</span>
              Use their name immediately + mention a specific detail.
            </li>
            <li className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
              <span className="text-indigo-300 font-semibold block mb-1">5-15s: The Observation</span>
              Politely point out the "leaky hole" in their funnel.
            </li>
            <li className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
              <span className="text-indigo-300 font-semibold block mb-1">15-30s: The Work Done</span>
              Mention the value you ALREADY created for them.
            </li>
            <li className="p-3 bg-slate-900/50 rounded-lg border border-slate-800">
              <span className="text-indigo-300 font-semibold block mb-1">30-45s: Permission CTA</span>
              Ask to send the link. No sales pressure.
            </li>
          </ul>
        </section>

        <section>
          <h3 className="text-slate-200 text-xs font-bold mb-3 uppercase tracking-widest flex items-center gap-2">
            <Zap size={14} /> Delivery Tips
          </h3>
          <div className="space-y-4">
            <div className="flex gap-3">
              <Smile size={18} className="text-yellow-500 shrink-0" />
              <div>
                <p className="text-slate-200 text-sm font-medium">Smile while talking</p>
                <p className="text-slate-500 text-xs">It changes your vocal tonality instantly.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <MessageSquare size={18} className="text-blue-500 shrink-0" />
              <div>
                <p className="text-slate-200 text-sm font-medium">The Micro-Text</p>
                <p className="text-slate-500 text-xs">Send a text DM right after the voice note to trigger curiosity.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-auto pt-6 border-t border-slate-800">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
          <span>Framework V2.1 Optimized</span>
        </div>
      </div>
    </div>
  );
};

export default InstructionPanel;
