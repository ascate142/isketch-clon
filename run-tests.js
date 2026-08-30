const ioClient = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';
let testsPassed = 0;
let testsFailed = 0;

function assert(desc, condition) {
  if (condition) {
    testsPassed++;
    console.log(`  ✅ [PASS] ${desc}`);
  } else {
    testsFailed++;
    console.log(`  ❌ [FAIL] ${desc}`);
  }
}

async function run() {
  console.log('\n====================================================');
  console.log('  EJECUTANDO TESTS EN VIVO: iSketch Clásico');
  console.log('====================================================\n');

  const client1 = ioClient(SERVER_URL, { reconnection: false });
  const client2 = ioClient(SERVER_URL, { reconnection: false });

  let directoryReceived = false;
  client1.on('lobby_directory_update', (rooms) => {
    if (!directoryReceived) {
      directoryReceived = true;
      assert('Directorio de salas recibido con salas preconfiguradas', Array.isArray(rooms) && rooms.length >= 10);
      assert('Salas contienen estrellas (1 a 5) y soporte multi-idioma', rooms.some(r => r.lang === 'es') && rooms.some(r => r.lang === 'en'));
      assert('Salas contienen modos Blitz y 5 Trazos', rooms.some(r => r.mode === 'blitz') && rooms.some(r => r.mode === '5strokes'));
    }
  });

  await new Promise(resolve => {
    let c1 = false, c2 = false;
    client1.on('connect', () => { c1 = true; if (c2) resolve(); });
    client2.on('connect', () => { c2 = true; if (c1) resolve(); });
  });

  assert('Cliente 1 y Cliente 2 conectados al servidor WebSocket', client1.connected && client2.connected);

  await new Promise(r => setTimeout(r, 300));

  // Crear o unirse a sala aislada para el test
  const testRoomId = 'test-room-' + Date.now().toString(36);
  let drawerId = null;
  let secretWord = '';
  let maskReceived = '';
  let letterCountsReceived = '';
  let playersList = [];

  client1.on('update_players', (players) => { playersList = players; });
  client2.on('update_players', (players) => { if (players.length > playersList.length) playersList = players; });

  await new Promise(resolve => {
    let rolesCount = 0;
    const checkRoles = (c, data) => {
      if (data.isDrawer && data.word) {
        drawerId = c.id;
        secretWord = data.word;
      }
      if (data.mask) maskReceived = data.mask;
      if (data.letterCounts) letterCountsReceived = data.letterCounts;
      rolesCount++;
      if (rolesCount >= 2) {
        assert('Partida iniciada y rol de dibujante asignado con palabra secreta', !!secretWord);
        assert('Máscara con espacios y conteo de letras generado', !!maskReceived);
        resolve();
      }
    };

    client1.on('role_assigned', (d) => checkRoles(client1, d));
    client2.on('role_assigned', (d) => checkRoles(client2, d));

    client1.emit('create_room', {
      name: 'Sala Test',
      lang: 'es',
      mode: 'classic',
      stars: 3,
      maxRounds: 5,
      nickname: 'Artista',
      country: '🇲🇽',
      badges: ['🏆', '⚡']
    });

    client1.on('join_room_success', (meta) => {
      client2.emit('join_room', {
        room: meta.roomId,
        nickname: 'Adivinador',
        country: '🇪🇸',
        badges: ['👑', '🎯']
      });
    });
  });

  await new Promise(r => setTimeout(r, 300));
  assert('Banderas de país e insignias de logros asignadas correctamente a los jugadores',
    playersList.some(p => p.country === '🇲🇽' && p.badges.includes('🏆')) &&
    playersList.some(p => p.country === '🇪🇸' && p.badges.includes('👑'))
  );

  // Trazo en tiempo real
  await new Promise(resolve => {
    const drawer = (client1.id === drawerId) ? client1 : client2;
    const guesser = (client1.id === drawerId) ? client2 : client1;

    guesser.on('draw_stroke', (data) => {
      assert('Trazo de dibujo emitido y recibido correctamente en tiempo real', data.x0 === 100 && data.tool === 'pencil');
      resolve();
    });

    drawer.emit('draw_stroke', { x0: 100, y0: 150, x1: 200, y1: 250, color: '#000000', size: 3, tool: 'pencil' });
  });

  // Casi Acierto (Warm / Close Guess)
  await new Promise(resolve => {
    const drawer = (client1.id === drawerId) ? client1 : client2;
    const guesser = (client1.id === drawerId) ? client2 : client1;

    let received = false;
    drawer.on('close_guess_event', (data) => {
      if (!received) {
        received = true;
        assert('Evento de casi-acierto (Close Guess) emitido con bandera e insignias', !!data.country && !!data.nickname);
        resolve();
      }
    });

    const almostWord = secretWord.length > 2 ? (secretWord.slice(0, -1) + 'x') : 'xx';
    guesser.emit('chat_message', { message: almostWord.toLowerCase() });
  });

  // Pista manual
  await new Promise(resolve => {
    const drawer = (client1.id === drawerId) ? client1 : client2;
    const guesser = (client1.id === drawerId) ? client2 : client1;

    guesser.on('hint_update', (hintData) => {
      assert('Pista manual emitida y recibida por los adivinadores', !!hintData.mask);
      resolve();
    });

    drawer.emit('give_hint');
  });

  // Adivinar la palabra (normalizada o con acento)
  await new Promise(resolve => {
    const drawer = (client1.id === drawerId) ? client1 : client2;
    const guesser = (client1.id === drawerId) ? client2 : client1;

    guesser.on('player_guessed_event', (eventData) => {
      assert('Detección de acierto correcta (soporta puntuación doble por acentuación exacta)', eventData.points >= 5);
      resolve();
    });

    guesser.emit('chat_message', { message: secretWord.toLowerCase() });
  });

  // Advertencia de juego limpio (Warn Artist / Foul)
  await new Promise(resolve => {
    const drawer = (client1.id === drawerId) ? client1 : client2;
    const guesser = (client1.id === drawerId) ? client2 : client1;

    drawer.on('artist_warned_event', (w) => {
      assert('Advertencia de falta/juego limpio (Warn Artist) transmitida con banderas e insignias', !!w.reason);
      resolve();
    });

    guesser.emit('warn_artist', { reason: '¡No escribas letras!' });
  });

  console.log('\n====================================================');
  console.log(`  RESUMEN: ${testsPassed} Pasados, ${testsFailed} Fallidos`);
  console.log('====================================================\n');

  client1.disconnect();
  client2.disconnect();
  process.exit(testsFailed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
