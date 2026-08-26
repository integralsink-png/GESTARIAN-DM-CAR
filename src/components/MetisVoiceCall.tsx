import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Radio, Mic, MicOff, Volume2, Loader2, Sparkles, PhoneOff } from 'lucide-react';
import { processMetisMessage } from '../lib/metisAiEngine';
import { transcribeAudio } from '../services/aiProviderService';
import { speakSpanish, stopSpanishSpeech, initSpanishVoice } from '../services/voiceService';

export const MetisVoiceCall: React.FC = () => {
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState<'idle' | 'listening' | 'processing' | 'speaking'>('idle');
  const [showModal, setShowModal] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isActiveRef = useRef(isActive);

  useEffect(() => {
    isActiveRef.current = isActive;
  }, [isActive]);

  const stopAudioTracks = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (vadIntervalRef.current) clearInterval(vadIntervalRef.current);
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
  }, []);

  const stopCall = useCallback(() => {
    setIsActive(false);
    setStatus('idle');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null; // Prevent triggering transcription
      mediaRecorderRef.current.stop();
    }
    stopSpanishSpeech();
    stopAudioTracks();
  }, [stopAudioTracks]);

  useEffect(() => {
    return () => {
      stopCall();
    };
  }, [stopCall]);

  const processAudioBlob = async (blob: Blob) => {
    if (!isActiveRef.current) return;
    setStatus('processing');
    try {
      const transcript = await transcribeAudio(blob);
      if (!transcript || transcript.length < 2) {
        // Ignorar ruidos o silencios cortos
        if (isActiveRef.current) startListening();
        return;
      }
      
      const promptBreve = transcript + " [INSTRUCCIÓN INVISIBLE: Eres METIS. Responde de forma muy directa y oral en 1 o 2 frases máximo.]";
      const response = await processMetisMessage(promptBreve);
      
      if (isActiveRef.current) {
        speakResponse(response.text);
      }
    } catch (e) {
      console.error("Error transcribiendo / procesando audio en MetisVoiceCall", e);
      if (isActiveRef.current) speakResponse("Ha habido un error de conexión al transcribir. Repítelo por favor.");
    }
  };

  const startListening = async () => {
    if (!isActiveRef.current) return;
    try {
      if (!streamRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        streamRef.current = stream;
      }

      const stream = streamRef.current;
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        if (!isActiveRef.current) return;
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudioBlob(blob);
      };

      // VAD (Voice Activity Detection) simplificado para móviles
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const audioCtx = new AudioCtx();
        audioContextRef.current = audioCtx;
        const analyser = audioCtx.createAnalyser();
        analyserRef.current = analyser;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        analyser.fftSize = 512;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let isSpeaking = false;
        
        vadIntervalRef.current = setInterval(() => {
          if (!isActiveRef.current || status !== 'listening') return;
          analyser.getByteFrequencyData(dataArray);
          const sum = dataArray.reduce((a, b) => a + b, 0);
          const avg = sum / dataArray.length;

          // Umbral de ruido bajo para taller (ajustable)
          if (avg > 15) {
            isSpeaking = true;
            if (silenceTimerRef.current) {
              clearTimeout(silenceTimerRef.current);
              silenceTimerRef.current = null;
            }
          } else {
            if (isSpeaking && !silenceTimerRef.current) {
              // 2.5 segundos de silencio tras hablar -> Cortar y enviar
              silenceTimerRef.current = setTimeout(() => {
                if (mediaRecorderRef.current?.state === 'recording') {
                  mediaRecorderRef.current.stop();
                }
              }, 2500);
            }
          }
        }, 100);
      }

      mediaRecorder.start();
      setStatus('listening');

    } catch (e: any) {
      console.error("Error accediendo al micrófono (MediaRecorder)", e);
      setStatus('idle');
      const isSecure = window.isSecureContext || window.location.hostname === 'localhost' || window.location.protocol === 'https:';
      if (!isSecure) {
        alert('Para usar el micrófono en el móvil, el navegador requiere HTTPS (Contexto Seguro). Usa "npm run dev:mobile" (con HTTPS) o accede por https://');
      } else {
        alert('Permiso de micrófono denegado en el navegador móvil. Revisa los permisos de la página.');
      }
      stopCall();
    }
  };

  const speakResponse = (text: string) => {
    setStatus('speaking');

    const onTTSFinished = () => {
      if (isActiveRef.current) {
        setStatus('listening');
        setTimeout(() => startListening(), 300);
      }
    };

    speakSpanish(text, {
      rate: 1.05,
      pitch: 1.0,
      volume: 1.0,
      onEnd: onTTSFinished,
      onError: onTTSFinished
    });
  };

  const toggleCall = () => {
    if (isActive) {
      stopCall();
      setShowModal(false);
    } else {
      setIsActive(true);
      setShowModal(true);
      setStatus('listening');
      stopSpanishSpeech();
      // Inicializar micrófono y MediaRecorder
      setTimeout(() => startListening(), 100);
    }
  };

  return (
    <>
      <button
        onClick={toggleCall}
        className="w-16 h-16 rounded-full bg-transparent border border-white/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95 flex-shrink-0 relative group overflow-hidden"
        title="METIS Conversación Continua"
        aria-label="METIS Conversación Continua"
      >
        {/* Animación del cometa arcoíris: cabeza más ancha, mayor brillo y glow sutil en cabeza */}
        <div 
          className={`absolute inset-0 rounded-full animate-[spin_1.4s_linear_infinite] bg-[conic-gradient(from_0deg,transparent_0%,transparent_35%,rgba(239,68,68,0.15)_45%,rgba(234,179,8,0.35)_58%,rgba(34,197,94,0.6)_70%,rgba(59,130,246,0.85)_82%,rgba(168,85,247,1)_94%,#ffffff_100%)] ${
            isActive ? 'opacity-100 drop-shadow-[0_0_8px_rgba(168,85,247,0.9)]' : 'opacity-80 group-hover:opacity-100 drop-shadow-[0_0_5px_rgba(255,255,255,0.7)] transition-all'
          }`}
          style={{ 
            WebkitMask: 'radial-gradient(circle, transparent 58%, black 60%)',
            mask: 'radial-gradient(circle, transparent 58%, black 60%)' 
          }}
        ></div>

        {/* Nuevo icono representativo: Radio / Frecuencia de voz en vivo con trazo de 1px y color gris claro #d3d3d3 */}
        <div className="relative z-10 flex items-center justify-center w-full h-full bg-transparent">
          {isActive ? (
            <Radio className="w-7 h-7 text-red-400 animate-pulse" strokeWidth={1} />
          ) : (
            <Radio className="w-7 h-7 text-[#d3d3d3] group-hover:text-white transition-colors" strokeWidth={1} />
          )}
        </div>

        {/* Ping de estado activo */}
        {isActive && status === 'listening' && (
          <span className="absolute top-1 right-1 flex h-3 w-3 z-20">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
          </span>
        )}
      </button>

      {/* Modal flotante al estilo llamada */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center shadow-2xl relative overflow-hidden">
            
            {/* Efectos de fondo */}
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none"></div>
            
            <div className="relative z-10 flex flex-col items-center">
              <div className={`w-24 h-24 rounded-full flex items-center justify-center mb-6 ${
                status === 'listening' ? 'bg-cyan-500/20 text-cyan-400 animate-pulse' : 
                status === 'speaking' ? 'bg-emerald-500/20 text-emerald-400' : 
                status === 'processing' ? 'bg-amber-500/20 text-amber-400' : 
                'bg-slate-800 text-slate-500'
              }`}>
                {status === 'listening' ? <Mic className="w-12 h-12" /> : 
                 status === 'speaking' ? <Volume2 className="w-12 h-12 animate-bounce" /> :
                 status === 'processing' ? <Loader2 className="w-12 h-12 animate-spin" /> :
                 <Sparkles className="w-12 h-12" />}
              </div>

              <h3 className="text-2xl font-black text-white mb-2">METIS AI</h3>
              
              <p className="text-slate-400 font-medium mb-12 h-6 flex items-center justify-center">
                {status === 'listening' ? 'Escuchando al taller...' : 
                 status === 'speaking' ? 'METIS está hablando...' : 
                 status === 'processing' ? 'Procesando consulta...' : 
                 'Conectando...'}
              </p>

              <button 
                onClick={toggleCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-lg shadow-red-500/30 transition-all hover:scale-105"
              >
                <PhoneOff className="w-8 h-8" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
