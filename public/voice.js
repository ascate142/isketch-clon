class VoiceRecognitionEngine {
  constructor({ onResult, onInterimResult, onStatusChange, onError }) {
    this.recognition = null;
    this.onResult = onResult;
    this.onInterimResult = onInterimResult;
    this.onStatusChange = onStatusChange;
    this.onError = onError;
    this.isListening = false;
    this.initRecognition();
  }

  initRecognition() {
    if (!("webkitSpeechRecognition" in window)) {
      console.warn("API de reconocimiento de voz no disponible en este navegador.");
      this.onStatusChange("not-supported");
      return;
    }

    this.recognition = new webkitSpeechRecognition();
    this.recognition.continuous = false; // Queremos que se detenga después de cada frase
    this.recognition.interimResults = true;
    this.recognition.lang = "es-ES"; // o el idioma deseado

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onStatusChange("listening");
      console.log("Reconocimiento de voz iniciado.");
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }
      if (this.onInterimResult) {
        this.onInterimResult(interimTranscript);
      }
      if (this.onResult && finalTranscript) {
        this.onResult(finalTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Error en reconocimiento de voz:", event.error);
      this.isListening = false;
      this.onStatusChange("error");
      if (this.onError) {
        this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onStatusChange("idle");
      console.log("Reconocimiento de voz finalizado.");
      // Si el audio está siendo monitoreado y no hay una interacción activa, reiniciar la escucha
      // Esto crea una escucha continua de bajo nivel
      if (this.monitorAudioInput && !this.isMuted) {
        this.start();
      }
    };
  }

  start() {
    if (this.recognition && !this.isListening) {
      try {
        this.recognition.start();
      } catch (e) {
        console.error("Error al intentar iniciar el reconocimiento de voz:", e);
        this.onStatusChange("error");
      }
    }
  }

  stop() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  // Nuevo método para alternar el monitoreo de audio
  toggleMonitoring(active) {
    this.monitorAudioInput = active;
    if (active && !this.isListening && !this.isMuted) {
      this.start();
    } else if (!active && this.isListening) {
      this.stop();
    }
  }

  // Nuevo método para mutear/desmutear
  setMute(muted) {
    this.isMuted = muted;
    if (muted && this.isListening) {
      this.stop();
    } else if (!muted && this.monitorAudioInput && !this.isListening) {
      this.start();
    }
  }
}

// ============================================================
//  GESTOR DE AUDIO - Para sonidos originales de iSketch
// ============================================================
// Archivos de sonido. Considera optimizar si hay muchos o son muy grandes.
const SOUND_FILES = {
  lobby_music: 'lobby_music.mp3',
  turn_start: 'turn_start.mp3',
  guessed: 'guessed.mp3',
  close: 'close.mp3',
  system: 'system.mp3',
  tick: 'tick.mp3',
  timeout: 'timeout.mp3',
  hint: 'hint.mp3',
  gameover: 'gameover.mp3',
  report: 'report.mp3',
  kick: 'kick.mp3',
  chat: 'chat.mp3',
  // Nuevos sonidos para interacciones y feedback de voz
  voice_start: 'voice_start.mp3',   // Cuando se activa el dictado de voz
  voice_end: 'voice_end.mp3',     // Cuando finaliza una captura de voz
  voice_error: 'voice_error.mp3',   // En caso de error de reconocimiento
  notification: 'notification.mp3'  // Sonido genérico de notificación
};

const audioState = {
  sounds: {},
  lobbyMusicPlaying: false,
  isSoundEnabled: true, // Nuevo estado global para control de sonido
  masterVolume: 0.7,    // Control de volumen general
  musicVolume: 0.3,     // Volumen específico para la música
  sfxVolume: 0.8        // Volumen específico para efectos de sonido
};

const audioManager = {
  init() {
    console.log('Cargando sonidos...');
    for (const key in SOUND_FILES) {
      const sound = new Audio(`/sounds/${SOUND_FILES[key]}`);
      sound.preload = 'auto';
      audioState.sounds[key] = sound;
    }
    this.updateVolumes(); // Aplicar volúmenes iniciales
    this.playLobbyMusic(); // Intentar reproducir la música inmediatamente

    // Desbloquear audio automáticamente en la primera interacción del usuario
    // (los navegadores bloquean la reproducción automática sin interacción)
    const unlockAudio = () => {
      this.playLobbyMusic();
      // Reproducir un sonido muy corto para "desbloquear" el contexto de audio
      const testSound = audioState.sounds.system;
      if (testSound) {
        testSound.volume = 0.01; // Volumen casi imperceptible
        testSound.play().catch(() => {});
        setTimeout(() => { testSound.volume = audioState.sfxVolume * audioState.masterVolume; }, 100); // Restaurar volumen
      }
      // Eliminar los listeners después del primer desbloqueo
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };

    document.addEventListener('click', unlockAudio, { once: true });
    document.addEventListener('keydown', unlockAudio, { once: true });
    document.addEventListener('touchstart', unlockAudio, { once: true });

    // Cargar preferencias del usuario (si existen) para el sonido
    this.loadPreferences();
  },

  // Cargar/Guardar preferencias de sonido del usuario
  loadPreferences() {
    const savedSoundState = localStorage.getItem('iSketchSoundState');
    if (savedSoundState) {
      const preferences = JSON.parse(savedSoundState);
      audioState.isSoundEnabled = preferences.isSoundEnabled ?? true;
      audioState.masterVolume = preferences.masterVolume ?? 0.7;
      audioState.musicVolume = preferences.musicVolume ?? 0.3;
      audioState.sfxVolume = preferences.sfxVolume ?? 0.8;
      this.updateVolumes();
      if (audioState.isSoundEnabled) {
        this.playLobbyMusic();
      } else {
        this.stopAllSounds();
      }
      this.updateSoundButtonUI();
    }
  },

  savePreferences() {
    localStorage.setItem('iSketchSoundState', JSON.stringify({
      isSoundEnabled: audioState.isSoundEnabled,
      masterVolume: audioState.masterVolume,
      musicVolume: audioState.musicVolume,
      sfxVolume: audioState.sfxVolume
    }));
  },

  updateVolumes() {
    for (const key in audioState.sounds) {
      const sound = audioState.sounds[key];
      if (key.includes('music')) {
        sound.volume = audioState.isSoundEnabled ? (audioState.musicVolume * audioState.masterVolume) : 0;
      } else {
        sound.volume = audioState.isSoundEnabled ? (audioState.sfxVolume * audioState.masterVolume) : 0;
      }
    }
  },

  toggleSound() {
    audioState.isSoundEnabled = !audioState.isSoundEnabled;
    if (audioState.isSoundEnabled) {
      this.updateVolumes();
      if (this.isLobbyScreen() && !audioState.lobbyMusicPlaying) {
        this.playLobbyMusic();
      }
    } else {
      this.stopAllSounds();
    }
    this.savePreferences();
    this.updateSoundButtonUI();
  },

  setMasterVolume(volume) {
    audioState.masterVolume = volume;
    this.updateVolumes();
    this.savePreferences();
  },

  setMusicVolume(volume) {
    audioState.musicVolume = volume;
    this.updateVolumes();
    this.savePreferences();
  },

  setSfxVolume(volume) {
    audioState.sfxVolume = volume;
    this.updateVolumes();
    this.savePreferences();
  },

  stopAllSounds() {
    for (const key in audioState.sounds) {
      const sound = audioState.sounds[key];
      if (!sound.paused) {
        sound.pause();
        sound.currentTime = 0;
      }
    }
    audioState.lobbyMusicPlaying = false;
  },

  isLobbyScreen() {
    const gameScreen = document.getElementById('gameScreen');
    return !gameScreen || gameScreen.style.display !== 'flex';
  },

  playLobbyMusic() {
    if (!audioState.isSoundEnabled || !this.isLobbyScreen()) {
      this.pauseLobbyMusic();
      return;
    }
    const music = audioState.sounds.lobby_music;
    if (!music) return;
    music.loop = true;
    if (!music.paused && audioState.lobbyMusicPlaying) return;
    music.volume = audioState.musicVolume * audioState.masterVolume;
    music.play().catch((e) => console.warn('No se pudo reproducir la música del lobby:', e));
    audioState.lobbyMusicPlaying = true;
  },

  pauseLobbyMusic() {
    const music = audioState.sounds.lobby_music;
    if (music && !music.paused) music.pause();
    audioState.lobbyMusicPlaying = false;
  },

  stopLobbyMusic() {
    const music = audioState.sounds.lobby_music;
    if (music) {
      music.pause();
      music.currentTime = 0;
    }
    audioState.lobbyMusicPlaying = false;
  },

  playSound(name) {
    if (!audioState.isSoundEnabled) return;
    const sound = audioState.sounds[name];
    if (!sound) return; // Asegurarse de que el sonido existe
    sound.currentTime = 0; // Reiniciar para poder reproducirlo rápidamente múltiples veces
    sound.volume = audioState.sfxVolume * audioState.masterVolume;
    sound.play().catch(e => console.warn(`No se pudo reproducir el sonido ${name}:`, e));
  },

  // Actualizar el icono del botón de sonido en la UI
  updateSoundButtonUI() {
    const soundButton = document.getElementById('globalSoundBtn');
    if (soundButton) {
      soundButton.textContent = audioState.isSoundEnabled ? '🔊' : '🔇';
    }
  }
};

// Notificaciones enriquecidas
const notificationManager = {
  // Muestra una notificación temporal en la parte superior/inferior de la pantalla
  showToast(message, type = 'info', duration = 3000) {
    let toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'toastContainer';
      toastContainer.className = 'toast-container top-right'; // Puede ser configurable
      document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Animación de entrada y salida
    setTimeout(() => toast.classList.add('show'), 10);
    audioManager.playSound('notification'); // Sonido para cada notificación

    setTimeout(() => {
      toast.classList.remove('show');
      toast.classList.add('hide'); // Para la animación de salida
      toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
  },

  // Muestra un banner grande y central (como el de iSketch original)
  showSplash(text, type = 'info', duration = 1800) {
    let banner = document.getElementById('splashBanner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'splashBanner';
      banner.className = 'splash-banner';
      document.body.appendChild(banner);
    }
    banner.textContent = text;
    banner.className = `splash-banner show ${type}`;
    clearTimeout(banner._timeout);
    banner._timeout = setTimeout(() => {
      banner.classList.remove('show');
    }, duration);
    audioManager.playSound(type === 'success' ? 'guessed' : (type === 'fail' ? 'kick' : 'system')); // Sonido contextual
  },

  // Otras interacciones: vibración, shake, etc.
  triggerScreenShake() {
    const gameScreen = document.getElementById('gameScreen');
    if (!gameScreen) return;
    gameScreen.classList.remove('screen-shake');
    void gameScreen.offsetWidth; // Reiniciar animación
    gameScreen.classList.add('screen-shake');
  },

  // Efecto de vibración extra sobre el chat
  vibrateChatPanel() {
    const chatPanel = document.getElementById('chatPanel');
    if (chatPanel) {
      chatPanel.classList.remove('chat-panel-vibrate');
      void chatPanel.offsetWidth;
      chatPanel.classList.add('chat-panel-vibrate');
      setTimeout(() => chatPanel.classList.remove('chat-panel-vibrate'), 600);
    }
  }
};
