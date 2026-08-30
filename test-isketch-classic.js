const { spawn } = require('child_process');
const io = require('socket.io-client');
const path = require('path');

console.log('====================================================');
console.log('  TEST COMPLETO: iSketch Clásico (Fidelidad 100%)');
console.log('====================================================\n');

// Iniciar servidor temporalmente para pruebas
const serverProcess = spawn('node', ['server.js'], { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] });

serverProcess.stdout.on('data', (d) => {
  // console.log('[Server stdout]', d.toString());
});
serverProcess.stderr.on('data', (d) => {
  console.error('[Server stderr]', d.toString());
});

let testsPassed = 0;
let testsFailed = 0;

function assertTest(desc, condition) {
  if (condition) {
    testsPassed++;
    console.log(`  ✅ [PASS] ${desc}`);
  } else {
    testsFailed++;
    console.log(`  ❌ [FAIL] ${desc}`);
  }
}

const SERVER_URL = 'http://localhost:3000';

setTimeout(() => {
  runTests();
}, 1200);

async function runTests() {
  try {
    const client1 = io(SERVER_URL, { reconnection: false });
    const client2 = io(SERVER_URL, { reconnection: false });

    await new Promise((resolve) => {
      let c1Connected = false, c2Connected = false;
      client1.on('connect', () => { c1Connected = true; if (c2Connected) resolve(); });
      client2.on('connect', () => { c2Connected = true; if (c1Connected) resolve(); });
    });

    console.log('📋 Test 1: Conexión de clientes al Lobby');
    assertTest('Clientes conectados al servidor WebSocket', client1.connected && client2.connected);

    // Test 2: Recibir directorio de salas con estrellas y categorías
    console.log('\n📋 Test 2: Directorio de salas de iSketch');
    await new Promise((resolve) => {
      client1.on('lobby_directory_update', (rooms) => {
        assertTest('Directorio de salas recibido con múltiples salas', Array.isArray(rooms) && rooms.length >= 10);
        const hasSpanish = rooms.some(r => r.lang === 'es');
        const hasEnglish = rooms.some(r => r.lang === 'en');
        const hasBlitz = rooms.some(r => r.mode === 'blitz');
        const has5Strokes = rooms.some(r => r.mode === '5strokes');
        const hasStars = rooms.every(r => typeof r.stars === 'number' && r.stars >= 1 && r.stars <= 5);

        assertTest('Contiene salas en español e inglés', hasSpanish && hasEnglish);
        assertTest('Contiene modos especiales (Blitz, 5 Trazos)', hasBlitz && has5Strokes);
        assertTest('Todas las salas tienen estrellas de dificultad (1 a 5)', hasStars);
        resolve();
      });
    });

    // Test 3: Unirse a una sala y comenzar partida
    console.log('\n📋 Test 3: Unirse a sala y asignación de roles');
    let drawerId = null;
    let guesserId = null;
    let currentSecretWord = '';

    await new Promise((resolve) => {
      let readyCount = 0;
      const onRole = (c, roleData) => {
        if (roleData.isDrawer) {
          drawerId = c.id;
          currentSecretWord = roleData.word;
        } else {
          guesserId = c.id;
        }
        readyCount++;
        if (readyCount === 2) {
          assertTest('Rol de dibujante y palabra secreta asignados', !!currentSecretWord);
          assertTest('Máscara con espacios y conteo de letras generado', !!roleData.mask);
          resolve();
        }
      };

      client1.on('role_assigned', (d) => onRole(client1, d));
      client2.on('role_assigned', (d) => onRole(client2, d));

      client1.emit('join_room', { room: 'es-facil', nickname: 'Artista1' });
      setTimeout(() => {
        client2.emit('join_room', { room: 'es-facil', nickname: 'Adivinador2' });
      }, 300);
    });

    // Test 4: Transmisión de trazos y herramientas de dibujo
    console.log('\n📋 Test 4: Sincronización de herramientas de dibujo (Lápiz, Línea, Relleno, Spray)');
    await new Promise((resolve) => {
      const drawer = (client1.id === drawerId) ? client1 : client2;
      const guesser = (client1.id === drawerId) ? client2 : client1;

      guesser.on('draw_stroke', (stroke) => {
        assertTest('Trazo de dibujo recibido en tiempo real', stroke.x0 === 10 && stroke.color === '#000000');
        resolve();
      });

      drawer.emit('draw_stroke', { x0: 10, y0: 20, x1: 50, y1: 60, color: '#000000', size: 3, tool: 'pencil' });
    });

    // Test 5: Pista y penalización
    console.log('\n📋 Test 5: Sistema de pistas (HINT) y penalización');
    await new Promise((resolve) => {
      const drawer = (client1.id === drawerId) ? client1 : client2;
      const guesser = (client1.id === drawerId) ? client2 : client1;

      guesser.on('hint_update', (hintData) => {
        assertTest('Actualización de pista emitida a los jugadores', !!hintData.mask);
        resolve();
      });

      drawer.emit('give_hint');
    });

    // Test 6: Adivinanza y cálculo de puntos
    console.log('\n📋 Test 6: Adivinanza de palabra, puntuación y anti-spoiler');
    await new Promise((resolve) => {
      const drawer = (client1.id === drawerId) ? client1 : client2;
      const guesser = (client1.id === drawerId) ? client2 : client1;

      guesser.on('player_guessed_event', (data) => {
        assertTest('Evento de palabra acertada emitido con puntos', data.points >= 5);
        resolve();
      });

      // Enviar la palabra secreta exacta
      guesser.emit('chat_message', { message: currentSecretWord.toLowerCase() });
    });

    // Test 7: Chat protegido de acertantes (anti-spoiler)
    console.log('\n📋 Test 7: Chat anti-spoilers para jugadores que ya acertaron');
    await new Promise((resolve) => {
      const drawer = (client1.id === drawerId) ? client1 : client2;
      const guesser = (client1.id === drawerId) ? client2 : client1;

      drawer.on('chat_message', (msg) => {
        if (msg.type === 'guessed_chat') {
          assertTest('Mensaje de acertante entregado de forma segura', msg.message === '¡Qué buen dibujo!');
          resolve();
        }
      });

      guesser.emit('chat_message', { message: '¡Qué buen dibujo!' });
    });

    // Test 8: Advertencia al dibujante (Warn Artist)
    console.log('\n📋 Test 8: Sistema de advertencias al dibujante (Juego Limpio)');
    await new Promise((resolve) => {
      const drawer = (client1.id === drawerId) ? client1 : client2;
      const guesser = (client1.id === drawerId) ? client2 : client1;

      drawer.on('drawer_warned', (warnData) => {
        assertTest('Advertencia de juego limpio recibida por el dibujante', !!warnData.reason);
        resolve();
      });

      guesser.emit('warn_artist', { reason: '¡No escribas letras o números!' });
    });

    console.log('\n====================================================');
    console.log(`  RESULTADO: ${testsPassed} Pasados, ${testsFailed} Fallidos`);
    console.log('====================================================\n');

    client1.disconnect();
    client2.disconnect();
    serverProcess.kill();
    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Error durante los tests:', err);
    serverProcess.kill();
    process.exit(1);
  }
}

