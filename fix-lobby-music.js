const fs = require('fs');
const filePath = 'public/game.js';
let content = fs.readFileSync(filePath, 'utf8');

// ============================================================
// Fix: Mejorar la música del lobby - arpegio musical en lugar de zumbido
// ============================================================

const oldMusic = `// M\u00FAsica de lobby: loop ambiental suave con modulaci\u00F3n lenta
function playLobbyMusicLoop() {
  if (!audioState.audioCtx || audioState.lobbyMusicPlaying) return;
  var ctx = audioState.audioCtx;

  // Oscilador principal con modulaci\u00F3n de frecuencia (LFO)
  var osc = ctx.createOscillator();
  var lfo = ctx.createOscillator();
  var lfoGain = ctx.createGain();
  var masterGain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.value = 110; // Nota grave
  lfo.type = 'sine';
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 3;
  masterGain.gain.value = 0.12 * audioState.masterVolume;

  lfo.connect(lfoGain);
  lfoGain.connect(osc.frequency);
  osc.connect(masterGain);
  masterGain.connect(ctx.destination);

  osc.start();
  lfo.start();

  // Capa secundaria: acorde suave
  var chordOsc = ctx.createOscillator();
  var chordGain = ctx.createGain();
  chordOsc.type = 'triangle';
  chordOsc.frequency.value = 220;
  chordGain.gain.value = 0.08 * audioState.masterVolume;
  chordOsc.connect(chordGain);
  chordGain.connect(ctx.destination);
  chordOsc.start();

  audioState.lobbyMusicPlaying = true;
  audioState.lobbyMusicTimer = setTimeout(function () {
    osc.stop();
    lfo.stop();
    chordOsc.stop();
    audioState.lobbyMusicPlaying = false;
    // Repetir el loop
    playLobbyMusicLoop();
  }, 8000);
}`;

const newMusic = `// M\u00FAsica de lobby: Arpegio musical de acordes (C-Am-F-G)
function playLobbyMusicLoop() {
  if (!audioState.audioCtx || audioState.lobbyMusicPlaying) return;
  var ctx = audioState.audioCtx;
  var vol = 0.12 * audioState.masterVolume;

  // Progresi\u00F3n de acordes: C - Am - F - G (estilo iSketch cl\u00E1sico)
  // Cada acorde se arpegia (notas tocadas secuencialmente)
  var chordProgressions = [
    // C mayor: C5, E5, G5, C6
    [noteToFreq('C', 5), noteToFreq('E', 5), noteToFreq('G', 5), noteToFreq('C', 6)],
    // Am (A menor): A4, C5, E5, A5
    [noteToFreq('A', 4), noteToFreq('C', 5), noteToFreq('E', 5), noteToFreq('A', 5)],
    // F mayor: F4, A4, C5, F5
    [noteToFreq('F', 4), noteToFreq('A', 4), noteToFreq('C', 5), noteToFreq('F', 5)],
    // G mayor: G4, B4, D5, G5
    [noteToFreq('G', 4), noteToFreq('B', 4), noteToFreq('D', 5), noteToFreq('G', 5)]
  ];

  var noteDuration = 0.4;  // Duraci\u00F3n de cada nota del arpegio
  var chordPause = 0.2;    // Pausa entre acordes
  var currentTime = ctx.currentTime;
  var chordIndex = 0;
  var noteIndex = 0;

  // Capa de bajo: nota ra\u00EDz grave (C3 o A3, etc.)
  var bassOsc = ctx.createOscillator();
  var bassGain = ctx.createGain();
  bassOsc.type = 'sine';
  bassGain.gain.value = vol * 0.4;
  bassOsc.frequency.value = noteToFreq('C', 3);
  bassOsc.connect(bassGain);
  bassGain.connect(ctx.destination);
  bassOsc.start();

  // Funci\u00F3n para tocar un arpegio de un acorde
  function playChordArpeggio(chord, startTime) {
    chord.forEach(function (freq, i) {
      var gain = ctx.createGain();
      var osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, startTime + i * noteDuration);
      gain.gain.linearRampToValueAtTime(vol * 0.7, startTime + i * noteDuration + noteDuration * 0.3);
      gain.gain.linearRampToValueAtTime(0.001, startTime + i * noteDuration + noteDuration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime + i * noteDuration);
      osc.stop(startTime + i * noteDuration + noteDuration + 0.1);
    });
  }

  // Programar 8 ciclos de la progresi\u00F3n (8 acordes = 2 repeticiones completas)
  var totalDuration = 0;
  for (var cycle = 0; cycle < 2; cycle++) {
    chordProgressions.forEach(function (chord, idx) {
      playChordArpeggio(chord, currentTime + totalDuration);
      // Actualizar el bajo
      var bassFreq = chord[0] / 2; // Mitad de frecuencia (una octava m\u00E1s grave)
      bassOsc.frequency.setValueAtTime(bassFreq, currentTime + totalDuration);
      totalDuration += chord.length * noteDuration + chordPause;
    });
  }

  audioState.lobbyMusicPlaying = true;
  var loopDuration = totalDuration * 1000;
  audioState.lobbyMusicTimer = setTimeout(function () {
    bassOsc.stop();
    audioState.lobbyMusicPlaying = false;
    playLobbyMusicLoop();
  }, loopDuration);
}`;

if (content.includes(oldMusic)) {
    content = content.replace(oldMusic, newMusic);
    console.log('\u2705 Fix aplicado: M\u00FAsica del lobby mejorada (arpegio musical)');
} else {
    console.log('\u274C FALL\u00F3: No se encontr\u00F3 playLobbyMusicLoop');
    // Debug: find the function
    var idx = content.indexOf('function playLobbyMusicLoop');
    if (idx >= 0) {
        var endIdx = content.indexOf('// Canvas & Undo History', idx);
        if (endIdx >= 0) {
            console.log('Funci\u00F3n encontrada. Extraída:', content.substring(idx, Math.min(idx + 200, endIdx)).replace(/\\n/g, '\\\\n'));
        }
    }
}

fs.writeFileSync(filePath, content, 'utf8');
console.log('Archivo guardado:', filePath);
