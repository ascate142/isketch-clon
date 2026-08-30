const io = require('socket.io-client');

const url = 'http://localhost:3000';

// Crear primer cliente
const client1 = io(url);
const client2 = io(url);

client1.on('connect', () => {
  console.log('[Client1] Conectado:', client1.id);
  setTimeout(() => {
    console.log('[Client1] Entrando a sala classic con nombre Player1');
    client1.emit('join_room', { room: 'classic', nickname: 'Player1' });
  }, 500);
});

client1.on('game_started', (data) => {
  console.log('[Client1] ¡Juego iniciado!', data);
});

client1.on('role_assigned', (data) => {
  console.log('[Client1] Rol asignado:', data);
});

client1.on('update_players', (players) => {
  console.log('[Client1] Jugadores actualizados:', players.map(p => `${p.nickname} (${p.score}pts)`));
});

client1.on('chat_message', (data) => {
  console.log(`[Client1] Mensaje: ${data.nickname}: ${data.message}`);
});

client2.on('connect', () => {
  console.log('[Client2] Conectado:', client2.id);
  setTimeout(() => {
    console.log('[Client2] Entrando a sala classic con nombre Player2');
    client2.emit('join_room', { room: 'classic', nickname: 'Player2' });
  }, 1000);
});

client2.on('game_started', (data) => {
  console.log('[Client2] ¡Juego iniciado!', data);
});

client2.on('role_assigned', (data) => {
  console.log('[Client2] Rol asignado:', data);
  if (data.isDrawer) {
    console.log('[Client2] ¡Soy el dibujante! Palabra:', data.word);
  }
});

client2.on('update_players', (players) => {
  console.log('[Client2] Jugadores actualizados:', players.map(p => `${p.nickname} (${p.score}pts)`));
});

client2.on('chat_message', (data) => {
  console.log(`[Client2] Mensaje: ${data.nickname}: ${data.message}`);
});

// Desconectar después de 5 segundos
setTimeout(() => {
  console.log('\n[Test] Desconectando...');
  client1.disconnect();
  client2.disconnect();
  process.exit(0);
}, 5000);
