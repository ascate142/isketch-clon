const io = require('socket.io-client');
const http = require('http');
const fs = require('fs');
const path = require('path');

const url = 'http://localhost:3000';
let testsPassed = 0;
let testsFailed = 0;

function test(name, condition) {
  if (condition) {
    testsPassed++;
    console.log(`  ✅ ${name}`);
  } else {
    testsFailed++;
    console.log(`  ❌ ${name}`);
  }
}

console.log('========================================');
console.log('  TEST DE FUNCIONALIDAD - iSketch Clon');
console.log('========================================\n');

// ============================================================
// TEST 1: Verificar que los archivos HTML contienen los títulos
// ============================================================
console.log('📋 TEST 1: Un solo Lobby (Lobby Principal)');
try {
  const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  test('El Lobby se llama "Lobby Principal"', html.includes('Lobby Principal'));
  test('La pantalla de "Recepción" fue eliminada', !html.includes('introScreen'));
  test('El Lobby Principal es la pantalla inicial', html.includes('id="lobbyScreen" style="display: flex;"'));
  test('Existe campo de apodo (nicknameInput)', html.includes('nicknameInput'));
} catch (err) {
  test('Se pudo leer index.html', false);
  console.error('Error:', err.message);
}

// ============================================================
// TEST 2: Verificar que game.js tiene el audio habilitado por defecto
// ============================================================
console.log('\n📋 TEST 2: Audio habilitado por defecto');
try {
  const gameJs = fs.readFileSync(path.join(__dirname, 'public', 'game.js'), 'utf8');
  test('audioManager.init() existe en DOMContentLoaded', gameJs.includes('audioManager.init();'));
  test('playLobbyMusic() se llama desde init()', gameJs.includes('this.playLobbyMusic();'));
  test('No hay botón de silencio/mute', !gameJs.includes('toggleSound'));
} catch (err) {
  test('Se pudo leer game.js', false);
  console.error('Error:', err.message);
}

// ============================================================
// TEST 3: Verificar lógica del chat del lobby en el servidor
// ============================================================
console.log('\n📋 TEST 3: Chat del Lobby - Lógica del servidor');
try {
  const serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');
  test('Existe historial de mensajes del lobby', serverJs.includes('lobbyMessages'));
  test('Historial se guarda con addLobbyMessage()', serverJs.includes('function addLobbyMessage'));
  test('Se envía el historial al conectar (lobby_chat_history)', serverJs.includes("socket.emit('lobby_chat_history', lobbyMessages)"));
  test('Se envía el historial al volver del juego', serverJs.includes("// Enviar el historial de mensajes del lobby al jugador que vuelve"));
  test('Los mensajes del lobby se guardan en el historial', serverJs.includes('const savedMsg = addLobbyMessage(data.nickname, data.message);'));
} catch (err) {
  test('Se pudo leer server.js', false);
  console.error('Error:', err.message);
}

// ============================================================
// TEST 4: Verificar que game.js maneja el historial del lobby
// ============================================================
console.log('\n📋 TEST 4: Chat del Lobby - Lógica del cliente');
try {
  const gameJs = fs.readFileSync(path.join(__dirname, 'public', 'game.js'), 'utf8');
  test('Cliente escucha lobby_chat_history', gameJs.includes("socket.on('lobby_chat_history'"));
  test('Cliente muestra mensajes históricos', gameJs.includes('history.forEach((data)'));
  test('Botón Enviar del chat del lobby conectado', gameJs.includes('btnSendLobbyChat'));
} catch (err) {
  test('Se pudo leer game.js', false);
  console.error('Error:', err.message);
}

// ============================================================
// TEST 5: Verificar funcionalidad del botón Crear Sala
// ============================================================
console.log('\n📋 TEST 5: Botón Crear Sala');
try {
  const gameJs = fs.readFileSync(path.join(__dirname, 'public', 'game.js'), 'utf8');
  const html = fs.readFileSync(path.join(__dirname, 'public', 'index.html'), 'utf8');
  test('Botón btnCreateRoom existe en HTML', html.includes('btnCreateRoom'));
  test('Modal de crear sala existe (createRoomModal)', html.includes('createRoomModal'));
  test('Handler del botón Crear Sala existe', gameJs.includes("document.getElementById('btnCreateRoom')?.addEventListener"));
  test('Al hacer clic valida el apodo antes de abrir', gameJs.includes("alert('Por favor, introduce tu apodo en el Lobby Principal antes de crear una sala.')"));
  test('Se emite el evento create_room al servidor', gameJs.includes("socket.emit('create_room', roomData)"));
} catch (err) {
  test('Se pudo leer los archivos', false);
  console.error('Error:', err.message);
}

// ============================================================
// TEST 6: Prueba en vivo con Socket.IO (requiere servidor corriendo)
// ============================================================
console.log('\n📋 TEST 6: Prueba en vivo con Socket.IO (si el servidor está corriendo)');

function runLiveTest(callback) {
  const clients = [];
  let liveTestsPassed = 0;
  let liveTestsFailed = 0;
  let done = false;

  function liveTest(name, condition) {
    if (condition) {
      liveTestsPassed++;
      console.log(`  ✅ [LIVE] ${name}`);
    } else {
      liveTestsFailed++;
      console.log(`  ❌ [LIVE] ${name}`);
    }
  }

  const timeout = setTimeout(() => {
    if (!done) {
      console.log('  ⚠️ Servidor no responde. Omitiendo tests en vivo.');
      clients.forEach(c => c.disconnect());
      done = true;
      callback(0, 0, true);
    }
  }, 8000);

  const client1 = io(url);
  clients.push(client1);
  let lobbyHistoryCount = 0;
  let lobbyMsgReceived = false;
  let leftRoomToLobby = false;

  client1.on('connect', () => {
    console.log('  [Client] Conectado al servidor');

    // Test de historia del lobby al conectar
    client1.on('lobby_chat_history', (history) => {
      lobbyHistoryCount++;
      liveTest(`Historial del lobby recibido (${lobbyHistoryCount}ª vez)`, Array.isArray(history));
      console.log(`  [Client] Historial del lobby: ${history.length} mensajes`);

      // Si es la segunda vez (al volver del juego), verificar que el historial se conserva
      if (lobbyHistoryCount === 2) {
        liveTest('El historial se conserva al volver del juego', history.length >= 1);
      }
    });

    // Enviar un mensaje al lobby
    setTimeout(() => {
      client1.emit('lobby_chat_message', { nickname: 'TestBot', message: '¡Hola desde el test! 🎮' });
      console.log('  [Client] Mensaje enviado al lobby');
    }, 300);

    // Unirse a una sala
    setTimeout(() => {
      console.log('  [Client] Uniéndose a la sala classic...');
      client1.emit('join_room', { room: 'classic', nickname: 'TestPlayer1' });
    }, 800);

    // Al recibir join_room_success, salir de la sala
    client1.on('join_room_success', () => {
      console.log('  [Client] Unido a la sala, saliendo al lobby...');
      setTimeout(() => {
        client1.emit('leave_room');
      }, 300);
    });

    // Al volver al lobby, esperar el historial
    client1.on('chat_message', (data) => {
      if (data.message && data.message.includes('Has vuelto al Lobby Principal')) {
        leftRoomToLobby = true;
        console.log('  [Client] Volvió al lobby correctamente');
      }
    });

    // Verificar los resultados
    setTimeout(() => {
      liveTest('Jugador volvió al Lobby Principal', leftRoomToLobby);
      liveTest('Historial del lobby recibido al menos 2 veces', lobbyHistoryCount >= 2);

      done = true;
      clearTimeout(timeout);
      clients.forEach(c => c.disconnect());
      callback(liveTestsPassed, liveTestsFailed, false);
    }, 3500);
  });

  client1.on('connect_error', () => {
    clearTimeout(timeout);
    console.log('  ⚠️ No se pudo conectar al servidor. ¿Está corriendo en el puerto 3000?');
    console.log('  💡 Ejecuta: node server.js');
    done = true;
    callback(0, 0, true);
  });
}

// Esperar un momento y luego ejecutar el test en vivo
setTimeout(() => {
  runLiveTest((livePassed, liveFailed, skipped) => {
    if (skipped) {
      console.log('\n========================================');
      console.log('  RESULTADO FINAL (sin test en vivo)');
      console.log('========================================');
    } else {
      console.log('\n========================================');
      console.log('  RESULTADO FINAL');
      console.log('========================================');
      testsPassed += livePassed;
      testsFailed += liveFailed;
    }
    console.log(`  ✅ Tests pasados: ${testsPassed}`);
    console.log(`  ❌ Tests fallidos: ${testsFailed}`);
    console.log('========================================');
    process.exit(testsFailed > 0 ? 1 : 0);
  });
}, 100);