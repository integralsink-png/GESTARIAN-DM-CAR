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
 * Reproduce un sonido de éxito prolongado durante la animación de transición de parada (0.5s)
 */
export function playLongSuccessChime() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const duration = 0.55;

    // Acorde mayor brillante: C5, E5, G5, C6
    const freqs = [523.25, 659.25, 783.99, 1046.50];
    freqs.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = i === 3 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);
      gain.gain.setValueAtTime(0.18, now + i * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.04);
      osc.stop(now + duration);
    });
  } catch (e) {
    console.warn('Long success chime failed:', e);
  }
}

/**
 * Sonido sutil y elegante de mecanismo de reloj / ajuste horario (Precision Timepiece Clockwork Tick).
 * Genera un micro-clic acústico de escape de reloj suizo muy agradable y discreto.
 */
let clockAudioCtx: AudioContext | null = null;

export function playTimepickerTickSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    
    if (!clockAudioCtx || clockAudioCtx.state === 'closed') {
      clockAudioCtx = new AudioContextClass();
    }
    const ctx = clockAudioCtx;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const duration = 0.04; // 40ms micro-clic de reloj

    // 1. Clic metálico sutil de escape de reloj (agudo nítido)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(2400, now);
    osc1.frequency.exponentialRampToValueAtTime(1600, now + duration);
    
    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + duration);

    // 2. Micro-impulso resonante de mecanismo (cuerpo de rueda horaria dentada)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(920, now);
    osc2.frequency.exponentialRampToValueAtTime(420, now + duration * 0.7);

    gain2.gain.setValueAtTime(0.05, now);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + duration * 0.7);

    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now);
    osc2.stop(now + duration * 0.7);
  } catch (e) {
    console.warn('Clock tick sound failed:', e);
  }
}

/**
 * Sintetiza el sonido característico de sintonización de radio analógica antigua
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

/**
 * Sonido de clic sutil de obturador de cámara fotográfica
 */
export function playCameraShutterSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // 1. Clic inicial mecánico del obturador (primer impulso agudo)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(1400, now);
    osc1.frequency.exponentialRampToValueAtTime(300, now + 0.04);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.04);

    // 2. Ruido sutil del paso de cortinilla
    const bufferSize = ctx.sampleRate * 0.06;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const bandpass = ctx.createBiquadFilter();
    bandpass.type = 'bandpass';
    bandpass.frequency.setValueAtTime(2500, now + 0.02);
    bandpass.Q.setValueAtTime(1.5, now + 0.02);
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.2, now + 0.02);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    noise.connect(bandpass);
    bandpass.connect(noiseGain);
    noiseGain.connect(ctx.destination);
    noise.start(now + 0.02);
    noise.stop(now + 0.08);

    // 3. Clic final de cierre
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(800, now + 0.06);
    osc2.frequency.exponentialRampToValueAtTime(180, now + 0.09);
    gain2.gain.setValueAtTime(0.25, now + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.06);
    osc2.stop(now + 0.09);
  } catch (e) {
    console.warn('Camera shutter sound failed:', e);
  }
}
