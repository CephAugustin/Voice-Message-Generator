
import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface VoiceRecorderProps {
  onAudioCaptured: (base64: string, mimeType: string) => Promise<void>;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onAudioCaptured }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup Visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setIsProcessing(true);
          try {
            await onAudioCaptured(base64Audio, 'audio/webm');
          } catch (e) {
            setError("Failed to process audio. Try speaking more clearly.");
          } finally {
            setIsProcessing(false);
          }
        };
        // Clean up stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      drawWaveform();
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setError("Microphone access denied or not available.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const render = () => {
      animationFrameRef.current = requestAnimationFrame(render);
      analyser.getByteFrequencyData(dataArray);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const width = canvas.width;
      const height = canvas.height;
      const barWidth = (width / bufferLength) * 2.5;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * height;
        ctx.fillStyle = `rgb(129, 140, 248, ${dataArray[i] / 255 + 0.2})`;
        ctx.fillRect(x, height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    
    render();
  };

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 p-4 bg-slate-900/50 rounded-xl border border-slate-800 relative overflow-hidden">
        <div className="relative z-10">
          {!isRecording ? (
            <button
              onClick={startRecording}
              disabled={isProcessing}
              className="w-12 h-12 flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-all shadow-lg disabled:bg-slate-800"
            >
              {isProcessing ? <Loader2 className="animate-spin" /> : <Mic size={20} />}
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-12 h-12 flex items-center justify-center bg-red-600 hover:bg-red-500 text-white rounded-full transition-all shadow-lg animate-pulse"
            >
              <Square size={20} />
            </button>
          )}
        </div>
        
        <div className="flex-1 flex flex-col justify-center">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
              {isRecording ? "Listening..." : isProcessing ? "Extracting insights..." : "Record Research"}
            </span>
            {isRecording && <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping"></span>}
          </div>
          
          <div className="h-8 w-full bg-slate-950/50 rounded flex items-center px-2">
            {isRecording ? (
              <canvas ref={canvasRef} className="w-full h-full" width={300} height={32} />
            ) : isProcessing ? (
              <div className="text-[10px] text-indigo-400 flex items-center gap-2 italic">
                <Sparkles size={10} className="animate-pulse" /> AI is parsing your thoughts...
              </div>
            ) : (
              <span className="text-[10px] text-slate-600 italic">Click the mic and describe your research findings aloud</span>
            )}
          </div>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-400 bg-red-400/10 p-2 rounded-lg border border-red-400/20">
          <AlertCircle size={14} />
          {error}
        </div>
      )}
    </div>
  );
};

export default VoiceRecorder;
