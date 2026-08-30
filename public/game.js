// ============================================================
//  iSKETCH CLÁSICO - CLIENTE OFICIAL (Estilo Shockwave 1999-2010)
// ============================================================
const socket = io();

// 20 Colores Oficiales de iSketch Shockwave
const ISKETCH_20_COLORS = [
  '#000000', '#444444', '#888888', '#cccccc', '#ffffff',
  '#663300', '#996633', '#cc9966', '#e6b88a', '#fdf0cd',
  '#990000', '#ff0000', '#ff6600', '#ffcc00', '#ffff00',
  '#006600', '#00cc00', '#99cc00', '#0066cc', '#00ccff'
];

// Mapeo automático de Zona Horaria / Idioma a Bandera de País
function detectCountryFlagAuto() {
  const saved = localStorage.getItem('isketch_country');
  if (saved) return saved;

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const lang = (navigator.language || '').toLowerCase();

    if (tz.includes('Mexico') || tz.includes('Monterrey') || tz.includes('Tijuana') || tz.includes('Cancun')) return '🇲🇽';
    if (tz.includes('Madrid') || tz.includes('Ceuta') || tz.includes('Canary') || lang === 'es-es') return '🇪🇸';
    if (tz.includes('Buenos_Aires') || tz.includes('Cordoba') || tz.includes('Argentina')) return '🇦🇷';
    if (tz.includes('Bogota') || lang === 'es-co') return '🇨🇴';
    if (tz.includes('Santiago') || lang === 'es-cl') return '🇨🇱';
    if (tz.includes('Lima') || lang === 'es-pe') return '🇵🇪';
    if (tz.includes('Caracas') || lang === 'es-ve') return '🇻🇪';
    if (tz.includes('Guayaquil') || lang === 'es-ec') return '🇪🇨';
    if (tz.includes('Guatemala') || lang === 'es-gt') return '🇬🇹';
    if (tz.includes('Havana') || lang === 'es-cu') return '🇨🇺';
    if (tz.includes('La_Paz') || lang === 'es-bo') return '🇧🇴';
    if (tz.includes('Montevideo') || lang === 'es-uy') return '🇺🇾';
    if (tz.includes('Asuncion') || lang === 'es-py') return '🇵🇾';
    if (tz.includes('Costa_Rica') || lang === 'es-cr') return '🇨🇷';
    if (tz.includes('Panama') || lang === 'es-pa') return '🇵🇦';
    if (tz.includes('Sao_Paulo') || tz.includes('Rio') || lang.startsWith('pt')) return '🇧🇷';
    if (tz.includes('New_York') || tz.includes('Chicago') || tz.includes('Los_Angeles') || tz.includes('America')) return '🇺🇸';
    if (tz.includes('London')) return '🇬🇧';
    if (tz.includes('Paris')) return '🇫🇷';
    if (tz.includes('Berlin')) return '🇩🇪';
    if (tz.includes('Rome')) return '🇮🇹';
    if (tz.includes('Lisbon')) return '🇵🇹';
  } catch (e) {}

  return '🇪🇸';
}

// Estado global del cliente
const gameState = {
  nickname: localStorage.getItem('isketch_nickname') || '',
  country: detectCountryFlagAuto(),
  currentRoomId: '',
  currentRoomMeta: null,
  isDrawer: false,
  hasGuessed: false,
  currentWord: '',
  wordMask: '',
  letterCounts: '',
  currentRound: 1,
  maxRounds: 10,
  timeLeft: 80,
  players: [],
  activeTool: 'pencil',
  currentColor: '#000000',
  currentBrushSize: 3,
  is5StrokesMode: false,
  strokesLeft: 5,
  isDoneState: false,
  soundEnabled: localStorage.getItem('isketch_sound') !== 'false'
};

// Intento opcional de detección por IP
fetch('https://api.country.is/')
  .then(res => res.json())
  .then(data => {
    if (data && data.country && !localStorage.getItem('isketch_country')) {
      const code = data.country.toUpperCase();
      const codeMap = {
        MX: '🇲🇽', ES: '🇪🇸', AR: '🇦🇷', CO: '🇨🇴', CL: '🇨🇱', PE: '🇵🇪',
        VE: '🇻🇪', EC: '🇪🇨', GT: '🇬🇹', CU: '🇨🇺', BO: '🇧🇴', UY: '🇺🇾',
        PY: '🇵🇾', CR: '🇨🇷', PA: '🇵🇦', US: '🇺🇸', BR: '🇧🇷', GB: '🇬🇧',
        FR: '🇫🇷', DE: '🇩🇪', IT: '🇮🇹', PT: '🇵🇹'
      };
      if (codeMap[code]) {
        gameState.country = codeMap[code];
        const countrySelect = document.getElementById('lobbyCountrySelect');
        if (countrySelect) countrySelect.value = gameState.country;
      }
    }
  })
  .catch(() => {});

// ============================================================
//  SISTEMA PERSISTENTE DE LOGROS Y ESTADÍSTICAS (iSketch Badges)
// ============================================================
const ACHIEVEMENTS_DEFINITIONS = [
  { id: 'first_game', icon: '🏆', title: 'Primer Trazo', desc: 'Completa tu primera partida de iSketch.' },
  { id: 'speed_demon', icon: '⚡', title: 'Rayo Veloz', desc: 'Adivina una palabra en los primeros 10 segundos de la ronda.' },
  { id: 'streak_master', icon: '🎯', title: 'Racha Imparable', desc: 'Adivina 3 palabras consecutivas en 1.º lugar.' },
  { id: 'master_artist', icon: '🎨', title: 'Maestro del Lienzo', desc: 'Dibuja y logra que todos los jugadores acierten sin dar pistas.' },
  { id: 'fair_play', icon: '🛡️', title: 'Juego Limpio', desc: 'Juega 5 partidas completas sin recibir ninguna advertencia.' },
  { id: 'room_champion', icon: '👑', title: 'Campeón de la Sala', desc: 'Gana el 1.º lugar (Medalla de Oro) en una partida completa.' },
  { id: 'minimalist', icon: '✏️', title: 'Genio Minimalista', desc: 'Gana una ronda en la modalidad 5 Trazos.' },
  { id: 'polyglot', icon: '🌐', title: 'Políglota', desc: 'Juega en salas de al menos 2 idiomas distintos.' }
];

const achievementsManager = {
  getAchievements() {
    try {
      return JSON.parse(localStorage.getItem('isketch_achievements_v1')) || {};
    } catch (e) {
      return {};
    }
  },

  getStats() {
    try {
      return JSON.parse(localStorage.getItem('isketch_stats_v1')) || {
        gamesPlayed: 0,
        gamesWon: 0,
        totalPoints: 0,
        firstPlaceStreak: 0,
        cleanGamesCount: 0,
        languagesPlayed: []
      };
    } catch (e) {
      return { gamesPlayed: 0, gamesWon: 0, totalPoints: 0, firstPlaceStreak: 0, cleanGamesCount: 0, languagesPlayed: [] };
    }
  },

  saveStats(stats) {
    localStorage.setItem('isketch_stats_v1', JSON.stringify(stats));
  },

  getUnlockedBadgesIcons() {
    const achs = this.getAchievements();
    const icons = [];
    ACHIEVEMENTS_DEFINITIONS.forEach(def => {
      if (achs[def.id]) {
        icons.push(def.icon);
      }
    });
    return icons;
  },

  unlock(id) {
    const achs = this.getAchievements();
    if (achs[id]) return;

    const def = ACHIEVEMENTS_DEFINITIONS.find(a => a.id === id);
    if (!def) return;

    achs[id] = { unlockedAt: Date.now() };
    localStorage.setItem('isketch_achievements_v1', JSON.stringify(achs));

    soundEngine.playSfx('sweep');
    showSplashBanner(`🏆 ¡Logro Desbloqueado!: ${def.title}`, 'guessed', 3000);
  },

  onGuess(pointsWon, timeLeft) {
    const stats = this.getStats();
    stats.totalPoints += pointsWon;

    if (timeLeft >= 70) {
      this.unlock('speed_demon');
    }

    if (pointsWon >= 10) {
      stats.firstPlaceStreak += 1;
      if (stats.firstPlaceStreak >= 3) {
        this.unlock('streak_master');
      }
    } else {
      stats.firstPlaceStreak = 0;
    }

    if (gameState.is5StrokesMode && pointsWon >= 8) {
      this.unlock('minimalist');
    }

    this.saveStats(stats);
  },

  onRoomJoin(lang) {
    const stats = this.getStats();
    if (!stats.languagesPlayed.includes(lang)) {
      stats.languagesPlayed.push(lang);
      if (stats.languagesPlayed.length >= 2) {
        this.unlock('polyglot');
      }
      this.saveStats(stats);
    }
  },

  onGameOver(isWinner, warningsCount) {
    const stats = this.getStats();
    stats.gamesPlayed += 1;
    this.unlock('first_game');

    if (isWinner) {
      stats.gamesWon += 1;
      this.unlock('room_champion');
    }

    if (warningsCount === 0) {
      stats.cleanGamesCount += 1;
      if (stats.cleanGamesCount >= 5) {
        this.unlock('fair_play');
      }
    } else {
      stats.cleanGamesCount = 0;
    }

    this.saveStats(stats);
  },

  renderModal() {
    const achs = this.getAchievements();
    const stats = this.getStats();
    const listContainer = document.getElementById('achievementsGridList');
    const countText = document.getElementById('achievementsCountText');
    const percentText = document.getElementById('achievementsPercentText');
    const fillBar = document.getElementById('achievementsProgressBarFill');
    const statsSummary = document.getElementById('playerStatsSummaryText');

    if (!listContainer) return;

    const total = ACHIEVEMENTS_DEFINITIONS.length;
    const unlockedCount = Object.keys(achs).length;
    const percent = Math.round((unlockedCount / total) * 100);

    if (countText) countText.textContent = `${unlockedCount} / ${total} Logros Desbloqueados`;
    if (percentText) percentText.textContent = `${percent}%`;
    if (fillBar) fillBar.style.width = `${percent}%`;
    if (statsSummary) {
      statsSummary.textContent = `Partidas: ${stats.gamesPlayed} | Victorias: ${stats.gamesWon} | Puntos acumulados: ${stats.totalPoints}`;
    }

    listContainer.innerHTML = '';
    ACHIEVEMENTS_DEFINITIONS.forEach(def => {
      const isUnlocked = !!achs[def.id];
      const card = document.createElement('div');
      card.className = `achievement-card-item ${isUnlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <div class="achievement-icon-circle">${def.icon}</div>
        <div class="achievement-info-texts">
          <div class="achievement-title-text">${def.title}</div>
          <div class="achievement-desc-text">${def.desc}</div>
        </div>
        <span class="achievement-status-tag">${isUnlocked ? '✓ Desbloqueado' : '🔒 Bloqueado'}</span>
      `;
      listContainer.appendChild(card);
    });
  }
};

// ============================================================
//  MOTOR DE AUDIO SINTETIZADO RETRO (Web Audio API)
// ============================================================
let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

const soundEngine = {
  lobbyMusicPlaying: false,
  musicTimer: null,

  playLobbyMusic() {
    if (!gameState.soundEnabled || this.lobbyMusicPlaying) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    this.lobbyMusicPlaying = true;

    const bpm = 124;
    const stepDuration = 60 / bpm / 2;

    const leadNotes = [
      { n: 523.25, d: 2 }, { n: 659.25, d: 2 }, { n: 783.99, d: 2 }, { n: 659.25, d: 2 },
      { n: 587.33, d: 2 }, { n: 659.25, d: 2 }, { n: 523.25, d: 4 },
      { n: 440.00, d: 2 }, { n: 523.25, d: 2 }, { n: 659.25, d: 2 }, { n: 523.25, d: 2 },
      { n: 493.88, d: 2 }, { n: 587.33, d: 2 }, { n: 392.00, d: 4 }
    ];

    const bassNotes = [
      { n: 130.81, d: 2 }, { n: 130.81, d: 2 }, { n: 164.81, d: 2 }, { n: 196.00, d: 2 },
      { n: 110.00, d: 2 }, { n: 110.00, d: 2 }, { n: 130.81, d: 2 }, { n: 164.81, d: 2 },
      { n: 87.31, d: 2 }, { n: 87.31, d: 2 }, { n: 110.00, d: 2 }, { n: 130.81, d: 2 },
      { n: 98.00, d: 2 }, { n: 98.00, d: 2 }, { n: 123.47, d: 2 }, { n: 146.83, d: 2 }
    ];

    let startTime = ctx.currentTime + 0.05;

    let currTime = startTime;
    leadNotes.forEach(item => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = item.n;

      const dur = item.d * stepDuration;
      gain.gain.setValueAtTime(0.001, currTime);
      gain.gain.linearRampToValueAtTime(0.045, currTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, currTime + dur * 0.95);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(currTime);
      osc.stop(currTime + dur);

      currTime += dur;
    });

    let bassTime = startTime;
    bassNotes.forEach(item => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = item.n;

      const dur = item.d * stepDuration;
      gain.gain.setValueAtTime(0.001, bassTime);
      gain.gain.linearRampToValueAtTime(0.035, bassTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, bassTime + dur * 0.9);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(bassTime);
      osc.stop(bassTime + dur);

      bassTime += dur;
    });

    const loopDuration = Math.max(currTime, bassTime) - startTime;

    this.musicTimer = setTimeout(() => {
      this.lobbyMusicPlaying = false;
      const gameScreen = document.getElementById('gameScreen');
      if (gameScreen && gameScreen.style.display !== 'flex') {
        this.playLobbyMusic();
      }
    }, loopDuration * 1000);
  },

  stopLobbyMusic() {
    this.lobbyMusicPlaying = false;
    clearTimeout(this.musicTimer);
  },

  playSfx(type) {
    if (!gameState.soundEnabled) return;
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'click') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(250, now + 0.035);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'close') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(780, now + 0.12);
      osc.frequency.exponentialRampToValueAtTime(1180, now + 0.24);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'guessed') {
      [1318.51, 1975.53, 2637.02].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.03);

        const startTime = now + idx * 0.03;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.12 / (idx + 1), startTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 1.25);
      });
    } else if (type === 'sweep') {
      [523.25, 659.25, 783.99, 987.77, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        const startTime = now + idx * 0.07;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.09, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.65);
      });
    } else if (type === 'turn_start') {
      [523.25, 783.99, 1046.50].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        const startTime = now + idx * 0.07;
        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.08, startTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } else if (type === 'tick') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'tock') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, now);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.03);
    } else if (type === 'heartbeat') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(75, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.12);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'timeout') {
      [0, 0.18].forEach(offset => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(115, now + offset);
        gain.gain.setValueAtTime(0.13, now + offset);
        gain.gain.linearRampToValueAtTime(0.001, now + offset + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + offset);
        osc.stop(now + offset + 0.16);
      });
    } else if (type === 'foul') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.setValueAtTime(220, now + 0.12);
      gain.gain.setValueAtTime(0.14, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.38);
    } else if (type === 'warn') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(370, now + 0.1);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.28);
    } else if (type === 'hint') {
      [783.99, 987.77, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.04);
        gain.gain.setValueAtTime(0.08, now + idx * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.04 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.04);
        osc.stop(now + idx * 0.04 + 0.28);
      });
    } else if (type === 'chat') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.025);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (type === 'bucket') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.exponentialRampToValueAtTime(540, now + 0.07);
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.11);
    } else if (type === 'spray') {
      const bufferSize = ctx.sampleRate * 0.08;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 2500;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      whiteNoise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      whiteNoise.start(now);
    } else if (type === 'gameover') {
      const notes = [
        { f: 523.25, t: 0, d: 0.15 },
        { f: 659.25, t: 0.15, d: 0.15 },
        { f: 783.99, t: 0.30, d: 0.15 },
        { f: 1046.50, t: 0.45, d: 0.55 }
      ];
      notes.forEach(item => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(item.f, now + item.t);
        gain.gain.setValueAtTime(0.001, now + item.t);
        gain.gain.linearRampToValueAtTime(0.12, now + item.t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + item.t + item.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + item.t);
        osc.stop(now + item.t + item.d + 0.05);
      });
    }
  }
};

// ============================================================
//  BANNER FLOTANTE DE ALERTA Y EMOCIÓN
// ============================================================
function showSplashBanner(text, type = 'close-guess', duration = 2000) {
  const banner = document.getElementById('splashAlertBanner');
  if (!banner) return;

  banner.textContent = text;
  banner.className = `splash-alert-banner show ${type}`;

  clearTimeout(banner._timer);
  banner._timer = setTimeout(() => {
    banner.classList.remove('show');
  }, duration);
}

function triggerScreenShake() {
  const screen = document.getElementById('gameScreen');
  if (!screen) return;
  screen.classList.remove('screen-shake-anim');
  void screen.offsetWidth;
  screen.classList.add('screen-shake-anim');
  setTimeout(() => screen.classList.remove('screen-shake-anim'), 450);
}

// ============================================================
//  CANVAS Y HERRAMIENTAS DE DIBUJO
// ============================================================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
let canvas, ctx;
let isDrawing = false;
let startX = 0, startY = 0;
let lastX = 0, lastY = 0;
let previewSnapshot = null;
const undoStack = [];
const MAX_UNDO = 20;

function initCanvas() {
  canvas = document.getElementById('paintCanvas');
  if (!canvas) return;

  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  ctx = canvas.getContext('2d', { willReadFrequently: true });
  clearCanvasLocal();

  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);

  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handlePointerDown({
        clientX: touch.clientX,
        clientY: touch.clientY,
        preventDefault: () => {}
      });
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      handlePointerMove({
        clientX: touch.clientX,
        clientY: touch.clientY
      });
    }
  }, { passive: false });

  window.addEventListener('touchend', () => {
    handlePointerUp();
  });
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_WIDTH / rect.width;
  const scaleY = CANVAS_HEIGHT / rect.height;
  return {
    x: Math.round((e.clientX - rect.left) * scaleX),
    y: Math.round((e.clientY - rect.top) * scaleY)
  };
}

function saveUndoState() {
  if (!ctx) return;
  if (undoStack.length >= MAX_UNDO) {
    undoStack.shift();
  }
  undoStack.push(ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT));
}

function clearCanvasLocal() {
  if (!ctx) return;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function handlePointerDown(e) {
  if (!gameState.isDrawer) return;
  if (gameState.is5StrokesMode && gameState.strokesLeft <= 0) return;

  const { x, y } = getCanvasCoords(e);
  startX = x;
  startY = y;
  lastX = x;
  lastY = y;
  isDrawing = true;

  saveUndoState();
  socket.emit('stroke_started');

  if (gameState.activeTool === 'bucket') {
    floodFillLocal(x, y, gameState.currentColor);
    socket.emit('flood_fill', { x, y, color: gameState.currentColor });
    soundEngine.playSfx('bucket');
    isDrawing = false;
    return;
  }

  if (gameState.activeTool === 'spray') {
    sprayParticles(x, y, gameState.currentColor, gameState.currentBrushSize);
    soundEngine.playSfx('spray');
    return;
  }

  if (['line', 'rect', 'rectFill', 'circle', 'circleFill'].includes(gameState.activeTool)) {
    previewSnapshot = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    return;
  }

  const drawColor = gameState.activeTool === 'eraser' ? '#ffffff' : gameState.currentColor;
  drawStrokeLocal(x, y, x, y, drawColor, gameState.currentBrushSize, gameState.activeTool);
  socket.emit('draw_stroke', {
    x0: x, y0: y, x1: x, y1: y,
    color: drawColor,
    size: gameState.currentBrushSize,
    tool: gameState.activeTool
  });
}

function handlePointerMove(e) {
  if (!isDrawing || !gameState.isDrawer) return;
  const { x, y } = getCanvasCoords(e);

  if (gameState.activeTool === 'spray') {
    sprayParticles(x, y, gameState.currentColor, gameState.currentBrushSize);
    if (Math.random() < 0.3) soundEngine.playSfx('spray');
    lastX = x;
    lastY = y;
    return;
  }

  if (['line', 'rect', 'rectFill', 'circle', 'circleFill'].includes(gameState.activeTool)) {
    if (previewSnapshot) {
      ctx.putImageData(previewSnapshot, 0, 0);
    }
    drawShapeLocal(gameState.activeTool, startX, startY, x, y, gameState.currentColor, gameState.currentBrushSize);
    return;
  }

  const drawColor = gameState.activeTool === 'eraser' ? '#ffffff' : gameState.currentColor;
  drawStrokeLocal(lastX, lastY, x, y, drawColor, gameState.currentBrushSize, gameState.activeTool);
  socket.emit('draw_stroke', {
    x0: lastX, y0: lastY, x1: x, y1: y,
    color: drawColor,
    size: gameState.currentBrushSize,
    tool: gameState.activeTool
  });

  lastX = x;
  lastY = y;
}

function handlePointerUp() {
  if (!isDrawing || !gameState.isDrawer) return;
  isDrawing = false;

  if (['line', 'rect', 'rectFill', 'circle', 'circleFill'].includes(gameState.activeTool)) {
    if (previewSnapshot) {
      ctx.putImageData(previewSnapshot, 0, 0);
    }
    drawShapeLocal(gameState.activeTool, startX, startY, lastX, lastY, gameState.currentColor, gameState.currentBrushSize);
    socket.emit('draw_shape', {
      type: gameState.activeTool,
      x0: startX, y0: startY, x1: lastX, y1: lastY,
      color: gameState.currentColor,
      size: gameState.currentBrushSize
    });
    previewSnapshot = null;
    soundEngine.playSfx('click');
  }
}

function drawStrokeLocal(x0, y0, x1, y1, color, size, tool) {
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (tool === 'brush') {
    ctx.globalAlpha = 0.9;
  } else {
    ctx.globalAlpha = 1.0;
  }

  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.restore();
}

function drawShapeLocal(type, x0, y0, x1, y1, color, size) {
  if (!ctx) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;

  const minX = Math.min(x0, x1);
  const minY = Math.min(y0, y1);
  const width = Math.abs(x1 - x0);
  const height = Math.abs(y1 - y0);

  if (type === 'line') {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  } else if (type === 'rect') {
    ctx.strokeRect(minX, minY, width, height);
  } else if (type === 'rectFill') {
    ctx.fillRect(minX, minY, width, height);
  } else if (type === 'circle' || type === 'circleFill') {
    const rx = width / 2;
    const ry = height / 2;
    const cx = minX + rx;
    const cy = minY + ry;
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
    if (type === 'circleFill') {
      ctx.fill();
    } else {
      ctx.stroke();
    }
  }
  ctx.restore();
}

function sprayParticles(x, y, color, size) {
  if (!ctx) return;
  const radius = size * 3 + 6;
  const density = size * 4 + 10;
  const points = [];

  ctx.save();
  ctx.fillStyle = color;

  for (let i = 0; i < density; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    const px = Math.round(x + Math.cos(angle) * r);
    const py = Math.round(y + Math.sin(angle) * r);

    if (px >= 0 && px < CANVAS_WIDTH && py >= 0 && py < CANVAS_HEIGHT) {
      ctx.fillRect(px, py, 1, 1);
      points.push({ x: px, y: py });
    }
  }
  ctx.restore();

  socket.emit('spray_particles', { points, color });
}

function floodFillLocal(startX, startY, hexColor) {
  if (!ctx) return;
  const imgData = ctx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  const data = imgData.data;

  const targetIdx = (startY * CANVAS_WIDTH + startX) * 4;
  const tR = data[targetIdx];
  const tG = data[targetIdx + 1];
  const tB = data[targetIdx + 2];
  const tA = data[targetIdx + 3];

  const rgb = hexToRgb(hexColor);
  if (rgb.r === tR && rgb.g === tG && rgb.b === tB && tA === 255) return;

  const pixelStack = [[startX, startY]];
  const matchColor = (idx) => {
    return Math.abs(data[idx] - tR) < 30 &&
           Math.abs(data[idx + 1] - tG) < 30 &&
           Math.abs(data[idx + 2] - tB) < 30 &&
           Math.abs(data[idx + 3] - tA) < 30;
  };

  const setPixel = (idx) => {
    data[idx] = rgb.r;
    data[idx + 1] = rgb.g;
    data[idx + 2] = rgb.b;
    data[idx + 3] = 255;
  };

  while (pixelStack.length > 0) {
    const [x, y] = pixelStack.pop();
    let currentY = y;
    let idx = (currentY * CANVAS_WIDTH + x) * 4;

    while (currentY >= 0 && matchColor(idx)) {
      currentY--;
      idx -= CANVAS_WIDTH * 4;
    }

    currentY++;
    idx += CANVAS_WIDTH * 4;
    let reachLeft = false;
    let reachRight = false;

    while (currentY < CANVAS_HEIGHT && matchColor(idx)) {
      setPixel(idx);

      if (x > 0) {
        if (matchColor(idx - 4)) {
          if (!reachLeft) {
            pixelStack.push([x - 1, currentY]);
            reachLeft = true;
          }
        } else if (reachLeft) {
          reachLeft = false;
        }
      }

      if (x < CANVAS_WIDTH - 1) {
        if (matchColor(idx + 4)) {
          if (!reachRight) {
            pixelStack.push([x + 1, currentY]);
            reachRight = true;
          }
        } else if (reachRight) {
          reachRight = false;
        }
      }

      currentY++;
      idx += CANVAS_WIDTH * 4;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function hexToRgb(hex) {
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function adjustColorBrightness(hex, percent) {
  const rgb = hexToRgb(hex);
  const factor = 1 + (percent / 100);
  const r = Math.min(255, Math.max(0, Math.round(rgb.r * factor)));
  const g = Math.min(255, Math.max(0, Math.round(rgb.g * factor)));
  const b = Math.min(255, Math.max(0, Math.round(rgb.b * factor)));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// ============================================================
//  PALETA DE COLORES RETRO (20 Colores)
// ============================================================
function initPaletteUI() {
  const container = document.getElementById('palette20');
  if (!container) return;
  container.innerHTML = '';

  ISKETCH_20_COLORS.forEach((color, idx) => {
    const swatch = document.createElement('div');
    swatch.className = `color-swatch-item ${idx === 0 ? 'active' : ''}`;
    swatch.style.backgroundColor = color;
    swatch.dataset.color = color;
    swatch.title = color;

    swatch.addEventListener('click', () => {
      document.querySelectorAll('.color-swatch-item').forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      gameState.currentColor = color;
      soundEngine.playSfx('click');
    });

    container.appendChild(swatch);
  });

  const btnLighten = document.getElementById('btnLightenShade');
  if (btnLighten) {
    btnLighten.addEventListener('click', () => {
      gameState.currentColor = adjustColorBrightness(gameState.currentColor, 25);
      updateActiveSwatchColor(gameState.currentColor);
      soundEngine.playSfx('click');
    });
  }

  const btnDarken = document.getElementById('btnDarkenShade');
  if (btnDarken) {
    btnDarken.addEventListener('click', () => {
      gameState.currentColor = adjustColorBrightness(gameState.currentColor, -25);
      updateActiveSwatchColor(gameState.currentColor);
      soundEngine.playSfx('click');
    });
  }

  const customColorInput = document.getElementById('customColorPicker');
  if (customColorInput) {
    customColorInput.addEventListener('input', (e) => {
      gameState.currentColor = e.target.value;
      updateActiveSwatchColor(gameState.currentColor);
    });
  }
}

function updateActiveSwatchColor(color) {
  const activeSwatch = document.querySelector('.color-swatch-item.active');
  if (activeSwatch) {
    activeSwatch.style.backgroundColor = color;
  }
}

// ============================================================
//  UI Y CONTROLADORES DE EVENTOS
// ============================================================
let allDirectoryRooms = [];
let selectedLangFilter = 'all';
let selectedCategoryFilter = 'all';

function initUI() {
  initCanvas();
  initPaletteUI();

  const nickInput = document.getElementById('lobbyNicknameInput');
  if (nickInput) {
    nickInput.value = gameState.nickname;
    nickInput.addEventListener('change', () => {
      gameState.nickname = nickInput.value.trim().slice(0, 15);
      localStorage.setItem('isketch_nickname', gameState.nickname);
    });
  }

  const countrySelect = document.getElementById('lobbyCountrySelect');
  if (countrySelect) {
    countrySelect.value = gameState.country;
    countrySelect.addEventListener('change', () => {
      gameState.country = countrySelect.value;
      localStorage.setItem('isketch_country', gameState.country);
      soundEngine.playSfx('click');
    });
  }

  const soundBtn = document.getElementById('btnSoundToggle');
  const gameSoundBtn = document.getElementById('btnGameSoundToggle');
  const updateSoundUI = () => {
    const text = gameState.soundEnabled ? '🔊 Sonido: ON' : '🔇 Sonido: OFF';
    if (soundBtn) soundBtn.textContent = text;
    if (gameSoundBtn) gameSoundBtn.textContent = gameState.soundEnabled ? '🔊' : '🔇';
    localStorage.setItem('isketch_sound', gameState.soundEnabled);
    if (gameState.soundEnabled) {
      soundEngine.playLobbyMusic();
    } else {
      soundEngine.stopLobbyMusic();
    }
  };

  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      gameState.soundEnabled = !gameState.soundEnabled;
      updateSoundUI();
    });
  }
  if (gameSoundBtn) {
    gameSoundBtn.addEventListener('click', () => {
      gameState.soundEnabled = !gameState.soundEnabled;
      updateSoundUI();
    });
  }
  updateSoundUI();

  // Modal de Logros
  const btnOpenAchievements = document.getElementById('btnOpenAchievements');
  const modalAchievements = document.getElementById('achievementsModal');
  const btnCloseAchievements = document.getElementById('btnCloseAchievementsModal');
  const btnOkAchievements = document.getElementById('btnOkAchievements');

  if (btnOpenAchievements && modalAchievements) {
    btnOpenAchievements.addEventListener('click', () => {
      achievementsManager.renderModal();
      modalAchievements.classList.add('show');
      soundEngine.playSfx('click');
    });
  }
  const hideAchievements = () => { if (modalAchievements) modalAchievements.classList.remove('show'); };
  if (btnCloseAchievements) btnCloseAchievements.addEventListener('click', hideAchievements);
  if (btnOkAchievements) btnOkAchievements.addEventListener('click', hideAchievements);

  // PWA Install Prompt & Modal de Instalación (Aptoide, Huawei, PWA, APK)
  let deferredInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const pwaBtn = document.getElementById('btnPwaTriggerInstall');
    if (pwaBtn) {
      pwaBtn.textContent = '⚡ ¡Instalar Ahora!';
    }
  });

  const btnOpenInstall = document.getElementById('btnOpenInstallModal');
  const modalInstall = document.getElementById('installAppModal');
  const btnCloseInstall = document.getElementById('btnCloseInstallModal');
  const btnCancelInstall = document.getElementById('btnCancelInstallModal');
  const btnPwaTrigger = document.getElementById('btnPwaTriggerInstall');

  if (btnOpenInstall && modalInstall) {
    btnOpenInstall.addEventListener('click', () => {
      modalInstall.classList.add('show');
      soundEngine.playSfx('click');
    });
  }
  const hideInstallModal = () => { if (modalInstall) modalInstall.classList.remove('show'); };
  if (btnCloseInstall) btnCloseInstall.addEventListener('click', hideInstallModal);
  if (btnCancelInstall) btnCancelInstall.addEventListener('click', hideInstallModal);

  if (btnPwaTrigger) {
    btnPwaTrigger.addEventListener('click', async () => {
      if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const choiceResult = await deferredInstallPrompt.userChoice;
        if (choiceResult.outcome === 'accepted') {
          showSplashBanner('🎉 ¡iSketch se ha instalado con éxito!', 'guessed', 3000);
        }
        deferredInstallPrompt = null;
        hideInstallModal();
      } else {
        alert('Para instalar iSketch:\n\n• En Chrome/Edge (PC): Haz clic en el icono 📥 en la barra de direcciones.\n• En Móvil (Android/iPhone): Toca en el menú (⋮) y selecciona "Añadir a la pantalla de inicio".');
      }
    });
  }

  // Pestañas de idioma
  const langTabs = document.querySelectorAll('.lang-tab-btn');
  langTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      langTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      selectedLangFilter = tab.dataset.lang;
      renderRoomsDirectory();
      soundEngine.playSfx('click');
    });
  });

  // Filtros de categoría
  const catPills = document.querySelectorAll('.cat-pill-btn');
  catPills.forEach(pill => {
    pill.addEventListener('click', () => {
      catPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      selectedCategoryFilter = pill.dataset.cat;
      renderRoomsDirectory();
      soundEngine.playSfx('click');
    });
  });

  // Herramientas de dibujo
  document.querySelectorAll('.tool-icon-btn[data-tool]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tool-icon-btn[data-tool]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.activeTool = btn.dataset.tool;
      soundEngine.playSfx('click');
    });
  });

  // Tamaños de trazo
  document.querySelectorAll('.brush-size-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.brush-size-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      gameState.currentBrushSize = parseInt(btn.dataset.size);
      soundEngine.playSfx('click');
    });
  });

  // Deshacer
  const btnUndo = document.getElementById('toolUndo');
  if (btnUndo) {
    btnUndo.addEventListener('click', () => {
      if (!gameState.isDrawer || undoStack.length === 0) return;
      const previousState = undoStack.pop();
      ctx.putImageData(previousState, 0, 0);
      socket.emit('undo_canvas');
      soundEngine.playSfx('click');
    });
  }

  // Limpiar lienzo
  const btnClear = document.getElementById('toolClear');
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      if (!gameState.isDrawer) return;
      saveUndoState();
      clearCanvasLocal();
      socket.emit('clear_canvas');
      soundEngine.playSfx('click');
    });
  }

  // Pista
  const btnHint = document.getElementById('btnGiveHint');
  if (btnHint) {
    btnHint.addEventListener('click', () => {
      if (!gameState.isDrawer) return;
      socket.emit('give_hint');
      soundEngine.playSfx('hint');
    });
  }

  // SKIP / DONE
  const btnPass = document.getElementById('btnSkipOrDone');
  if (btnPass) {
    btnPass.addEventListener('click', () => {
      if (!gameState.isDrawer) return;
      socket.emit('skip_or_done');
      soundEngine.playSfx('click');
    });
  }

  // Salir al Lobby
  const btnLeave = document.getElementById('btnLeaveToLobby');
  if (btnLeave) {
    btnLeave.addEventListener('click', () => {
      socket.emit('leave_room');
      showLobbyScreen();
      soundEngine.playSfx('click');
    });
  }

  // Chat del Juego
  const gameChatForm = document.getElementById('gameChatForm');
  const gameChatInput = document.getElementById('gameChatInput');
  if (gameChatForm && gameChatInput) {
    gameChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = gameChatInput.value.trim();
      if (!text) return;
      socket.emit('chat_message', { message: text });
      gameChatInput.value = '';
    });
  }

  // Chat del Lobby
  const lobbyChatForm = document.getElementById('lobbyChatForm');
  const lobbyChatInput = document.getElementById('lobbyChatInput');
  if (lobbyChatForm && lobbyChatInput) {
    lobbyChatForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = lobbyChatInput.value.trim();
      if (!text) return;
      const nick = getValidNickname();
      const badges = achievementsManager.getUnlockedBadgesIcons();
      socket.emit('lobby_chat_message', {
        nickname: nick,
        country: gameState.country || '🇪🇸',
        badges: badges,
        message: text
      });
      lobbyChatInput.value = '';
    });
  }

  // Modal Crear Sala
  const modalCreate = document.getElementById('createRoomModal');
  const btnOpenCreate = document.getElementById('btnOpenCreateModal');
  const btnCloseCreate = document.getElementById('btnCloseCreateModal');
  const btnCancelCreate = document.getElementById('btnCancelCreate');
  const createForm = document.getElementById('createRoomForm');

  if (btnOpenCreate && modalCreate) {
    btnOpenCreate.addEventListener('click', () => {
      modalCreate.classList.add('show');
      soundEngine.playSfx('click');
    });
  }
  const hideCreateModal = () => { if (modalCreate) modalCreate.classList.remove('show'); };
  if (btnCloseCreate) btnCloseCreate.addEventListener('click', hideCreateModal);
  if (btnCancelCreate) btnCancelCreate.addEventListener('click', hideCreateModal);

  if (createForm) {
    createForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('createInputName').value.trim();
      const lang = document.getElementById('createSelectLang').value;
      const mode = document.getElementById('createSelectMode').value;
      const maxRounds = document.getElementById('createSelectRounds').value;
      const nick = getValidNickname();
      const badges = achievementsManager.getUnlockedBadgesIcons();

      socket.emit('create_room', {
        name,
        lang,
        mode,
        maxRounds,
        nickname: nick,
        country: gameState.country || '🇪🇸',
        badges: badges
      });
      hideCreateModal();
    });
  }

  // Sala Aleatoria
  const btnRandom = document.getElementById('btnQuickJoinRandom');
  if (btnRandom) {
    btnRandom.addEventListener('click', () => {
      if (allDirectoryRooms.length === 0) return;
      const randomRoom = allDirectoryRooms[Math.floor(Math.random() * allDirectoryRooms.length)];
      joinRoom(randomRoom.id);
      soundEngine.playSfx('click');
    });
  }

  // Modal Advertir al Artista (Warn Artist)
  const modalWarn = document.getElementById('warnArtistModal');
  const btnOpenWarn = document.getElementById('btnWarnArtistModal');
  const btnCloseWarn = document.getElementById('btnCloseWarnModal');
  const btnCancelWarn = document.getElementById('btnCancelWarn');

  if (btnOpenWarn && modalWarn) {
    btnOpenWarn.addEventListener('click', () => {
      modalWarn.classList.add('show');
      soundEngine.playSfx('click');
    });
  }
  const hideWarnModal = () => { if (modalWarn) modalWarn.classList.remove('show'); };
  if (btnCloseWarn) btnCloseWarn.addEventListener('click', hideWarnModal);
  if (btnCancelWarn) btnCancelWarn.addEventListener('click', hideWarnModal);

  document.querySelectorAll('.warn-reason-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const reason = btn.dataset.reason;
      socket.emit('warn_artist', { reason });
      hideWarnModal();
      soundEngine.playSfx('foul');
    });
  });

  // Modal Fin de Partida
  const btnGameOverBack = document.getElementById('btnGameOverBackToLobby');
  if (btnGameOverBack) {
    btnGameOverBack.addEventListener('click', () => {
      document.getElementById('gameOverModal').classList.remove('show');
      socket.emit('leave_room');
      showLobbyScreen();
      soundEngine.playSfx('click');
    });
  }
}

function getValidNickname() {
  const input = document.getElementById('lobbyNicknameInput');
  let nick = (input ? input.value : gameState.nickname).trim().slice(0, 15);
  if (!nick) {
    nick = 'Jugador_' + Math.floor(Math.random() * 900 + 100);
    if (input) input.value = nick;
  }
  gameState.nickname = nick;
  localStorage.setItem('isketch_nickname', nick);
  return nick;
}

function joinRoom(roomId) {
  const nick = getValidNickname();
  const badges = achievementsManager.getUnlockedBadgesIcons();
  socket.emit('join_room', {
    room: roomId,
    nickname: nick,
    country: gameState.country || '🇪🇸',
    badges: badges
  });
}

function renderRoomsDirectory() {
  const tbody = document.getElementById('roomsTableBody');
  const counter = document.getElementById('lobbyRoomCounterText');
  if (!tbody) return;

  tbody.innerHTML = '';

  const filtered = allDirectoryRooms.filter(room => {
    if (selectedLangFilter !== 'all' && room.lang !== selectedLangFilter) return false;
    if (selectedCategoryFilter === 'easy' && room.stars !== 1) return false;
    if (selectedCategoryFilter === 'standard' && room.stars !== 3) return false;
    if (selectedCategoryFilter === 'hard' && room.stars !== 5) return false;
    if (selectedCategoryFilter === 'blitz' && room.mode !== 'blitz') return false;
    if (selectedCategoryFilter === '5strokes' && room.mode !== '5strokes') return false;
    if (selectedCategoryFilter === 'bigpicture' && room.mode !== 'bigpicture') return false;
    if (selectedCategoryFilter === 'connections' && room.mode !== 'connections') return false;
    if (selectedCategoryFilter === 'tandem' && room.mode !== 'tandem') return false;
    if (selectedCategoryFilter === 'themed' && room.category !== 'Temáticas') return false;

    return true;
  });

  if (counter) {
    counter.textContent = `${filtered.length} salas disponibles`;
  }

  filtered.forEach(room => {
    const tr = document.createElement('tr');
    const starIcons = '★'.repeat(room.stars) + '☆'.repeat(5 - room.stars);
    const langFlag = {
      es: '🇪🇸', en: '🇬🇧', fr: '🇫🇷', de: '🇩🇪', it: '🇮🇹', pt: '🇵🇹'
    }[room.lang] || '🌐';

    tr.innerHTML = `
      <td class="room-name-cell">${room.name}</td>
      <td>${langFlag} ${room.lang.toUpperCase()}</td>
      <td>${room.category}</td>
      <td class="difficulty-stars">${starIcons}</td>
      <td><strong>${room.playerCount}</strong> / ${room.maxPlayers}</td>
      <td>${room.inGame ? room.currentDrawer : '—'}</td>
      <td><button class="btn-join-row" type="button">Entrar</button></td>
    `;

    tr.querySelector('.btn-join-row').addEventListener('click', (e) => {
      e.stopPropagation();
      joinRoom(room.id);
      soundEngine.playSfx('click');
    });

    tr.addEventListener('click', () => {
      joinRoom(room.id);
      soundEngine.playSfx('click');
    });

    tbody.appendChild(tr);
  });
}

function showLobbyScreen() {
  document.getElementById('lobbyScreen').style.display = 'flex';
  document.getElementById('gameScreen').style.display = 'none';
  soundEngine.playLobbyMusic();
}

function showGameScreen() {
  document.getElementById('lobbyScreen').style.display = 'none';
  document.getElementById('gameScreen').style.display = 'flex';
  soundEngine.stopLobbyMusic();
}

function addGameChatMessage(data) {
  const log = document.getElementById('gameChatLog');
  if (!log) return;

  const row = document.createElement('div');
  row.className = `game-msg-row ${data.type || 'normal'}`;

  if (data.type === 'guessed' || data.type === 'double_guessed') {
    row.innerHTML = `<strong>${data.message}</strong>`;
  } else if (data.type === 'system' || data.type === 'warning' || data.type === 'close' || data.type === 'hint') {
    row.textContent = data.message;
  } else {
    row.innerHTML = `<strong>${data.nickname}:</strong> ${data.message}`;
    soundEngine.playSfx('chat');
  }

  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function addLobbyChatMessage(data) {
  const log = document.getElementById('lobbyChatLog');
  if (!log) return;

  const item = document.createElement('div');
  item.className = 'lobby-msg-item';
  const flag = data.country || '🌐';
  const badgesStr = (data.badges && data.badges.length > 0) ? ` <span style="font-size:11px;">[${data.badges.slice(0, 3).join('')}]</span>` : '';
  item.innerHTML = `<strong>${flag} ${data.nickname}${badgesStr}:</strong> ${data.message}`;
  log.appendChild(item);
  log.scrollTop = log.scrollHeight;
}

function updateScoreboardUI(players) {
  const list = document.getElementById('gamePlayersList');
  const countBadge = document.getElementById('gamePlayerCountBadge');
  if (!list) return;

  list.innerHTML = '';
  if (countBadge) countBadge.textContent = players.length;

  const sorted = [...players].sort((a, b) => b.score - a.score);

  sorted.forEach(p => {
    const card = document.createElement('div');
    let extraClass = '';
    if (p.isDrawer) extraClass = 'drawer-active';
    else if (p.hasGuessed) extraClass = 'guessed-active';

    card.className = `player-row-card ${extraClass}`;

    let icon = '👤';
    if (p.isDrawer) icon = '✏️';
    else if (p.hasGuessed) icon = '✅';

    const flag = p.country || '🌐';
    const badgesHtml = (p.badges && p.badges.length > 0)
      ? `<span style="font-size:11px; margin-left:3px;" title="Insignias ganadas">[${p.badges.slice(0, 3).join('')}]</span>`
      : '';

    card.innerHTML = `
      <div style="display:flex;align-items:center;gap:4px;overflow:hidden;text-overflow:ellipsis;">
        <span>${icon}</span>
        <span>${flag}</span>
        <span>${p.nickname}</span>
        ${badgesHtml}
      </div>
      <span class="player-score-tag">${p.score} pts</span>
    `;

    list.appendChild(card);
  });
}

// ============================================================
//  EVENTOS SOCKET.IO
// ============================================================
socket.on('lobby_directory_update', (roomsList) => {
  allDirectoryRooms = roomsList;
  renderRoomsDirectory();
});

socket.on('lobby_chat_history', (history) => {
  const log = document.getElementById('lobbyChatLog');
  if (!log) return;
  log.innerHTML = '';
  history.forEach(addLobbyChatMessage);
});

socket.on('lobby_chat_message', (msg) => {
  addLobbyChatMessage(msg);
});

socket.on('join_room_success', (meta) => {
  gameState.currentRoomId = meta.roomId;
  gameState.currentRoomMeta = meta;

  const roomBadge = document.getElementById('gameRoomBadge');
  if (roomBadge) roomBadge.textContent = `Sala: ${meta.roomName}`;

  if (meta.lang) {
    achievementsManager.onRoomJoin(meta.lang);
  }

  showGameScreen();
  soundEngine.playSfx('turn_start');
});

socket.on('join_room_error', (data) => {
  alert(data.message || 'No se pudo unir a la sala.');
});

socket.on('update_players', (players) => {
  gameState.players = players;
  updateScoreboardUI(players);
});

socket.on('role_assigned', (data) => {
  gameState.isDrawer = data.isDrawer;
  gameState.currentWord = data.word || '';
  gameState.wordMask = data.mask || '';
  gameState.letterCounts = data.letterCounts || '';
  gameState.is5StrokesMode = !!data.is5Strokes;
  gameState.strokesLeft = data.strokesLeft || 5;
  gameState.hasGuessed = false;

  const banner = document.getElementById('wordDisplayBanner');
  const maskText = document.getElementById('wordMaskText');
  const countTag = document.getElementById('wordLetterCountTag');
  const roundBadge = document.getElementById('gameRoundBadge');
  const btnPass = document.getElementById('btnSkipOrDone');
  const strokeBadge = document.getElementById('strokeCountBadge');

  if (roundBadge) roundBadge.textContent = `Ronda ${data.round}/${data.maxRounds}`;

  if (data.isDrawer) {
    if (banner) banner.className = 'word-display-banner drawer-mode';
    if (maskText) maskText.textContent = `Tu palabra: ${data.word}`;
    if (countTag) countTag.textContent = '';
    if (btnPass) btnPass.textContent = '⏭️ SKIP';
    soundEngine.playSfx('turn_start');
    showSplashBanner(`🎨 ¡Es tu turno de dibujar!`, 'guessed', 1800);
  } else {
    if (banner) banner.className = 'word-display-banner';
    if (maskText) maskText.textContent = data.mask;
    if (countTag) countTag.textContent = `(${data.letterCounts})`;
    soundEngine.playSfx('turn_start');
  }

  if (strokeBadge) {
    if (gameState.is5StrokesMode) {
      strokeBadge.style.display = 'inline-block';
      strokeBadge.textContent = `Trazos: ${data.strokesLeft}/5`;
    } else {
      strokeBadge.style.display = 'none';
    }
  }
});

socket.on('hint_update', (data) => {
  if (!gameState.isDrawer) {
    const maskText = document.getElementById('wordMaskText');
    const countTag = document.getElementById('wordLetterCountTag');
    if (maskText) maskText.textContent = data.mask;
    if (countTag) countTag.textContent = `(${data.letterCounts})`;
    soundEngine.playSfx('hint');
  }
});

socket.on('stroke_count_update', (data) => {
  gameState.strokesLeft = data.strokesLeft;
  const strokeBadge = document.getElementById('strokeCountBadge');
  if (strokeBadge && gameState.is5StrokesMode) {
    strokeBadge.textContent = `Trazos: ${data.strokesLeft}/5`;
    if (data.strokesLeft <= 0) {
      strokeBadge.style.color = '#ff4444';
    }
  }
});

socket.on('drawer_done_available', () => {
  const btnPass = document.getElementById('btnSkipOrDone');
  if (btnPass && gameState.isDrawer) {
    btnPass.textContent = '✅ DONE';
  }
});

// CASI-ACIERTO
socket.on('close_guess_event', (data) => {
  soundEngine.playSfx('close');
  const flag = data.country || '🌐';
  if (data.playerId === socket.id) {
    showSplashBanner('🔥 ¡ESTÁS MUY CERCA!', 'close-guess', 1600);
  } else {
    showSplashBanner(`🔥 ¡${flag} ${data.nickname} ESTÁ MUY CERCA!`, 'close-guess', 1600);
  }
});

// ACIERTO (Con detección de puntuación doble por acentuación exacta)
socket.on('player_guessed_event', (data) => {
  const flag = data.country || '🌐';
  const badgesStr = (data.badges && data.badges.length > 0) ? ` [${data.badges.slice(0, 3).join('')}]` : '';

  if (data.isDoublePoints) {
    soundEngine.playSfx('sweep');
    if (data.playerId === socket.id) {
      gameState.hasGuessed = true;
      showSplashBanner(`🌟 ¡PUNTUACIÓN DOBLE POR ORTOGRAFÍA EXACTA! (+${data.points} pts)`, 'guessed', 3200);
      achievementsManager.onGuess(data.points, data.timeLeft || 40);
    } else {
      showSplashBanner(`🌟 ¡${flag} ${data.nickname}${badgesStr} obtuvo PUNTUACIÓN DOBLE! (+${data.points} pts)`, 'guessed', 2400);
    }
  } else {
    soundEngine.playSfx('guessed');
    if (data.playerId === socket.id) {
      gameState.hasGuessed = true;
      showSplashBanner(`🎉 ¡ACERTASTE! (+${data.points} pts)`, 'guessed', 2000);
      achievementsManager.onGuess(data.points, data.timeLeft || 40);
    } else {
      showSplashBanner(`🎉 ¡${flag} ${data.nickname}${badgesStr} acertó la palabra!`, 'guessed', 1600);
    }
  }
});

// BARRIDA TOTAL
socket.on('room_sweep_event', () => {
  soundEngine.playSfx('sweep');
  showSplashBanner('🌟 ¡TODOS HAN ADIVINADO!', 'guessed', 2200);
  if (gameState.isDrawer) {
    achievementsManager.unlock('master_artist');
  }
});

// ADVERTENCIA AL DIBUJANTE
socket.on('artist_warned_event', (data) => {
  soundEngine.playSfx('foul');
  triggerScreenShake();
  showSplashBanner(`⚠️ FALTA: ${data.drawer} fue advertido`, 'foul', 2500);
});

socket.on('update_timer', (timeLeft) => {
  gameState.timeLeft = timeLeft;
  const timerText = document.getElementById('timerSecondsText');
  const timerClock = document.getElementById('retroTimerClock');
  const boardFrame = document.getElementById('drawingBoardFrame');

  if (timerText) timerText.textContent = timeLeft;

  if (timerClock && boardFrame) {
    if (timeLeft <= 5 && timeLeft > 0) {
      timerClock.className = 'retro-timer-clock panic-time';
      boardFrame.classList.add('panic-vignette');
      soundEngine.playSfx('heartbeat');
      soundEngine.playSfx('tick');
    } else if (timeLeft <= 15 && timeLeft > 5) {
      timerClock.className = 'retro-timer-clock warning-time';
      boardFrame.classList.remove('panic-vignette');
      if (timeLeft % 2 === 0) {
        soundEngine.playSfx('tock');
      } else {
        soundEngine.playSfx('tick');
      }
    } else {
      timerClock.className = 'retro-timer-clock';
      boardFrame.classList.remove('panic-vignette');
    }
  }
});

socket.on('chat_message', (data) => {
  addGameChatMessage(data);
});

socket.on('drawer_warned', (data) => {
  soundEngine.playSfx('foul');
  triggerScreenShake();
  showSplashBanner('🚨 ¡HAS SIDO ADVERTIDO!', 'foul', 2500);
});

socket.on('drawer_typing_detected', (data) => {
  soundEngine.playSfx('foul');
  triggerScreenShake();
  showSplashBanner('🚨 ¡FALTA! ¡NO ESCRIBAS EN EL CHAT!', 'foul', 2800);
});

// Eventos de Dibujo Remoto
socket.on('draw_stroke', (data) => {
  drawStrokeLocal(data.x0, data.y0, data.x1, data.y1, data.color, data.size, data.tool);
});

socket.on('draw_shape', (data) => {
  drawShapeLocal(data.type, data.x0, data.y0, data.x1, data.y1, data.color, data.size);
});

socket.on('spray_particles', (data) => {
  if (!ctx) return;
  ctx.save();
  ctx.fillStyle = data.color;
  data.points.forEach(pt => {
    ctx.fillRect(pt.x, pt.y, 1, 1);
  });
  ctx.restore();
});

socket.on('flood_fill', (data) => {
  floodFillLocal(data.x, data.y, data.color);
});

socket.on('clear_canvas', () => {
  clearCanvasLocal();
  undoStack.length = 0;
});

socket.on('undo_canvas', () => {
  if (undoStack.length > 0) {
    const prev = undoStack.pop();
    ctx.putImageData(prev, 0, 0);
  }
});

socket.on('round_ended', (data) => {
  soundEngine.playSfx('timeout');
  const banner = document.getElementById('wordDisplayBanner');
  const maskText = document.getElementById('wordMaskText');
  const boardFrame = document.getElementById('drawingBoardFrame');
  if (boardFrame) boardFrame.classList.remove('panic-vignette');
  if (maskText) maskText.textContent = `Palabra: ${data.word}`;
  if (banner) banner.className = 'word-display-banner';
});

socket.on('game_over', (data) => {
  soundEngine.playSfx('gameover');
  const modal = document.getElementById('gameOverModal');
  const winnerBox = document.getElementById('gameOverWinnerBox');
  const tableBody = document.getElementById('gameOverTableBody');

  const winnerFlag = data.winnerCountry || '🌐';
  const winnerBadges = (data.winnerBadges && data.winnerBadges.length > 0) ? ` [${data.winnerBadges.slice(0, 3).join('')}]` : '';
  if (winnerBox) winnerBox.textContent = `🥇 Ganador: ${winnerFlag} ${data.winner}${winnerBadges} (${data.winnerScore} pts)`;

  const myNick = getValidNickname();
  const isWinner = (data.winner === myNick);
  achievementsManager.onGameOver(isWinner, 0);

  if (tableBody) {
    tableBody.innerHTML = '';
    data.finalScores.forEach(item => {
      const tr = document.createElement('tr');
      const medal = item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : `#${item.rank}`;
      const flag = item.country || '🌐';
      const badgesStr = (item.badges && item.badges.length > 0) ? ` [${item.badges.slice(0, 3).join('')}]` : '';
      tr.innerHTML = `
        <td>${medal}</td>
        <td>${flag} ${item.nickname}${badgesStr}</td>
        <td>${item.score} pts</td>
      `;
      tableBody.appendChild(tr);
    });
  }

  if (modal) modal.classList.add('show');
});

// Inicializar cuando el DOM esté listo
window.addEventListener('DOMContentLoaded', () => {
  initUI();
});
