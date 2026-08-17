/**
 * Reproduce un sonido de confirmación agradable sintetizado mediante Web Audio API
 */
export function playSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // Primer tono (E5 - 659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Segundo tono (A5 - 880 Hz) con brillo armónico
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.12);
    gain2.gain.setValueAtTime(0.3, now + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.65);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.12);
    osc2.stop(now + 0.65);
  } catch (e) {
    // Si la política de audio del navegador lo bloquea, no interrumpe la app
    console.warn('Audio feedback failed:', e);
  }
}

/**
 * Sintetiza el sonido característico de sintonización de radio analógica antigua:
 * Ruido blanco filtrado en banda variable + silbido heterodino de onda corta intentando sintonizar sin fijar.
 */
let radioAudioCtx: AudioContext | null = null;

export function playRadioTuningStatic() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!radioAudioCtx || radioAudioCtx.state === 'closed') {
      radioAudioCtx = new AudioContextClass();
    }
    const ctx = radioAudioCtx;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 0.18; // Ráfaga de sintonización corta y reactiva al girar

    // 1. Buffer de Ruido Blanco / Estática
    const bufferSize = ctx.sampleRate * duration;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    // Filtro pasa banda para la estática analógica (barrido de frecuencia de dial)
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    const randomFreq = 800 + Math.random() * 2200;
    bandpass.frequency.setValueAtTime(randomFreq, now);
    bandpass.frequency.exponentialRampToValueAtTime(randomFreq * (0.6 + Math.random() * 0.8), now + duration);
    bandpass.Q.setValueAtTime(3.5, now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.18, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    whiteNoise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    whiteNoise.start(now);
    whiteNoise.stop(now + duration);

    // 2. Silbido Heterodino (Heterodyne whistle / onda corta de búsqueda)
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = 'triangle';
    
    const startPitch = 400 + Math.random() * 1800;
    const endPitch = startPitch + (Math.random() > 0.5 ? 600 : -500);
    osc.frequency.setValueAtTime(startPitch, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(150, endPitch), now + duration);

    oscGain.gain.setValueAtTime(0.08, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + duration);
  } catch (e) {
    console.warn('Radio sound failed:', e);
  }
}
