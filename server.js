const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

// --- Integración opcional de Gemini ---
let genAI = null;
try {
  require('dotenv').config();
  if (process.env.GEMINI_API_KEY) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    console.log('✨ Gemini AI inicializado correctamente.');
  }
} catch (e) {
  console.log('Gemini opcional no configurado.');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(express.static(path.join(__dirname, 'public')));

// Endpoint ligero de detección de IP / País
app.get('/api/geoip', (req) => {
  // Retorna respuesta rápida para clientes
  req.res.json({ status: 'ok' });
});

// ============================================================
//  BANCOS DE PALABRAS AUTÉNTICOS DE iSKETCH (Ortografía y Acentuación Estricta)
// ============================================================
const WORD_BANKS = {
  // ESPAÑOL (Con acentuación ortográfica completa)
  'es-facil': [
    'sol', 'luna', 'casa', 'perro', 'gato', 'árbol', 'flor', 'mesa', 'silla', 'pelota',
    'coche', 'barco', 'avión', 'pez', 'pájaro', 'manzana', 'plátano', 'pan', 'leche', 'huevo',
    'zapato', 'camisa', 'pantalón', 'sombrero', 'mano', 'ojo', 'boca', 'nariz', 'libro', 'lápiz',
    'reloj', 'cama', 'puerta', 'ventana', 'taza', 'plato', 'tenedor', 'cuchara', 'estrella', 'río'
  ],
  'es-estandar': [
    'guitarra', 'bicicleta', 'castillo', 'elefante', 'mariposa', 'teclado', 'helado', 'paraguas',
    'dinosaurio', 'cohete', 'fantasma', 'pirata', 'telescopio', 'submarino', 'camello', 'volcán',
    'hamburguesa', 'bruja', 'pingüino', 'microscopio', 'diamante', 'antorcha', 'esqueleto', 'molino',
    'candado', 'mochila', 'canguro', 'globo', 'tijeras', 'brújula', 'trompeta', 'escalera', 'farola',
    'cascada', 'semáforo', 'momia', 'pirámide', 'iglú', 'estatua', 'helicóptero', 'ancla', 'corona',
    'laberinto', 'espada', 'escudo', 'búmeran', 'cactus', 'palmera', 'arcoíris', 'espejo', 'linterna'
  ],
  'es-dificil': [
    'acueducto', 'anfibio', 'archipiélago', 'astrolabio', 'burbuja', 'caleidoscopio', 'camaleón',
    'centauro', 'constelación', 'crisálida', 'cronómetro', 'ecosistema', 'embudo', 'esfinge',
    'estalagmitas', 'fotosíntesis', 'gárgola', 'géiser', 'glaciar', 'holograma', 'ingravidez',
    'jeroglífico', 'catana', 'metamorfosis', 'monolito', 'nebulosa', 'periscopio', 'quimera',
    'sismógrafo', 'siderurgia', 'satélite', 'termostato', 'transbordador', 'tornado', 'tundra',
    'yunque', 'zodíaco', 'veleta', 'resorte', 'peonza', 'plomada', 'palanqueta', 'brujería'
  ],
  'es-animales': [
    'león', 'tigre', 'jirafa', 'cebra', 'rinoceronte', 'hipopótamo', 'koala', 'oso panda',
    'chimpancé', 'gorila', 'cocodrilo', 'caimán', 'tortuga', 'camaleón', 'iguana', 'serpiente',
    'águila', 'halcón', 'flamenco', 'pavo real', 'loro', 'tucán', 'búho', 'lechuza', 'pelícano',
    'tiburón', 'ballena', 'delfín', 'foca', 'morsa', 'pulpo', 'calamar', 'medusa', 'cangrejo',
    'langosta', 'erizo', 'castor', 'ardilla', 'mapache', 'zorrillo', 'nutria', 'ornitorrinco'
  ],
  'es-cine': [
    'palomitas', 'alfombra roja', 'proyector', 'claqueta', 'óscar', 'butaca', 'director',
    'pantalla gigante', 'efectos especiales', 'doble de acción', 'banda sonora', 'estreno',
    'cine mudo', 'títulos de crédito', 'guion', 'cámara de cine', 'autocine', 'hollywood',
    'gandalf', 'darth vader', 'batman', 'superman', 'spiderman', 'harry potter', 'jurassic park',
    'titanic', 'avatar', 'matrix', 'star wars', 'alien', 'terminator', 'indiana jones', 'godzilla'
  ],
  'es-geografia': [
    'torre eiffel', 'gran muralla', 'coliseo romano', 'torre de pisa', 'estatua de la libertad',
    'taj mahal', 'big ben', 'pirámides de giza', 'machu picchu', 'cristo redentor', 'monte everest',
    'cataratas del niágara', 'gran cañón', 'desierto del sáhara', 'río amazonas', 'antártida',
    'canal de panamá', 'polo norte', 'islas galápagos', 'monte fuji', 'cordillera de los andes'
  ],
  'es-comida': [
    'pizza', 'hamburguesa', 'tacos', 'paella', 'sushi', 'lasaña', 'burrito', 'espaguetis',
    'perrito caliente', 'ensalada', 'cruasán', 'dona', 'tarta de fresa', 'helado de vainilla',
    'churros', 'tortilla española', 'guacamole', 'palomitas de maíz', 'panqueques', 'gofres',
    'sándwich', 'ramen', 'fondue', 'brownie', 'quesadilla', 'pollo asado', 'gazpacho'
  ],
  'es-musica': [
    'guitarra eléctrica', 'batería', 'piano de cola', 'violín', 'saxofón', 'trompeta', 'flauta',
    'bajo eléctrico', 'arpa', 'acordeón', 'clarinete', 'micrófono', 'auriculares', 'altavoz',
    'tocadiscos', 'vinilo', 'partitura', 'batuta', 'concierto', 'coro', 'solfeo', 'orquesta'
  ],
  'es-blitz': [
    'sol', 'luz', 'pie', 'ojo', 'tren', 'pez', 'mar', 'pan', 'oro', 'rey',
    'bote', 'gato', 'perro', 'casa', 'flor', 'vaso', 'nube', 'cruz', 'sal', 'red',
    'rosa', 'toro', 'sapo', 'pato', 'loro', 'lobo', 'bola', 'mesa', 'bote', 'fuego'
  ],
  'es-5trazos': [
    'casa', 'árbol', 'sol', 'cara feliz', 'estrella', 'pez', 'bote', 'montaña', 'reloj',
    'taza', 'paraguas', 'escalera', 'bandera', 'sobre', 'cono', 'vela', 'gafas', 'caja',
    'libro', 'flor', 'avión de papel', 'helado', 'hongo', 'manzana', 'ojo', 'puerta'
  ],
  'es-bigpicture': [
    'fondo del océano', 'estación espacial', 'selva tropical', 'desierto de noche',
    'ciudad futurista', 'isla desierta', 'parque de diversiones', 'estadio de fútbol',
    'pirámides de egipto', 'laboratorio secreto', 'castillo embrujado', 'concierto de rock',
    'campo de girasoles', 'viaje en el tiempo', 'puerto pirata', 'polo norte', 'circo romano'
  ],
  'es-connections': [
    'ojo de buey', 'caballito de mar', 'estrella de mar', 'perro caliente', 'tren bala',
    'caja fuerte', 'gato negro', 'luna llena', 'hombre de nieve', 'arcoíris', 'pez espada',
    'llave inglesa', 'casa de campo', 'puente colgante', 'globo terráqueo', 'árbol de navidad'
  ],
  'es-tandem': [
    'sol', 'pan', 'pez', 'red', 'ola', 'luz', 'flor', 'tren', 'vaso', 'nube',
    'pie', 'ojo', 'río', 'mar', 'sal', 'miel', 'casa', 'león', 'sapo', 'pato'
  ],

  // ENGLISH
  'en-easy': [
    'sun', 'moon', 'house', 'dog', 'cat', 'tree', 'flower', 'table', 'chair', 'ball',
    'car', 'boat', 'plane', 'fish', 'bird', 'apple', 'banana', 'bread', 'milk', 'egg',
    'shoe', 'shirt', 'pants', 'hat', 'hand', 'eye', 'mouth', 'nose', 'book', 'pencil'
  ],
  'en-standard': [
    'guitar', 'bicycle', 'castle', 'elephant', 'butterfly', 'keyboard', 'ice cream', 'umbrella',
    'dinosaur', 'rocket', 'ghost', 'pirate', 'telescope', 'submarine', 'camel', 'volcano',
    'hamburger', 'witch', 'penguin', 'microscope', 'diamond', 'torch', 'skeleton', 'windmill',
    'padlock', 'backpack', 'kangaroo', 'balloon', 'scissors', 'compass', 'trumpet', 'ladder',
    'lighthouse', 'waterfall', 'traffic light', 'mummy', 'pyramid', 'igloo', 'statue', 'helicopter'
  ],
  'en-hard': [
    'aqueduct', 'amphibian', 'archipelago', 'astrolabe', 'kaleidoscope', 'chameleon',
    'centaur', 'constellation', 'chrysalis', 'chronometer', 'ecosystem', 'funnel', 'sphinx',
    'stalagmite', 'photosynthesis', 'gargoyle', 'geyser', 'glacier', 'hologram', 'weightlessness',
    'hieroglyphic', 'metamorphosis', 'monolith', 'nebula', 'periscope', 'chimera', 'seismograph'
  ],
  'en-animals': [
    'lion', 'tiger', 'giraffe', 'zebra', 'rhino', 'hippo', 'koala', 'panda',
    'chimpanzee', 'gorilla', 'crocodile', 'alligator', 'turtle', 'chameleon', 'iguana', 'snake',
    'eagle', 'falcon', 'flamingo', 'peacock', 'parrot', 'toucan', 'owl', 'pelican',
    'shark', 'whale', 'dolphin', 'seal', 'walrus', 'octopus', 'squid', 'jellyfish', 'crab'
  ],
  'en-movies': [
    'popcorn', 'red carpet', 'projector', 'clapperboard', 'oscar', 'director chair',
    'giant screen', 'special effects', 'stunt double', 'soundtrack', 'premiere', 'hollywood',
    'gandalf', 'darth vader', 'batman', 'superman', 'spiderman', 'harry potter', 'jurassic park',
    'titanic', 'avatar', 'matrix', 'star wars', 'alien', 'terminator', 'indiana jones', 'godzilla'
  ],
  'en-geography': [
    'eiffel tower', 'great wall', 'colosseum', 'leaning tower of pisa', 'statue of liberty',
    'taj mahal', 'big ben', 'pyramids of giza', 'machu picchu', 'christ the redeemer', 'mount everest',
    'niagara falls', 'grand canyon', 'sahara desert', 'amazon river', 'antarctica', 'mount fuji'
  ],
  'en-food': [
    'pizza', 'hamburger', 'tacos', 'paella', 'sushi', 'lasagna', 'burrito', 'spaghetti',
    'hot dog', 'salad', 'croissant', 'donut', 'strawberry cake', 'vanilla ice cream',
    'churros', 'guacamole', 'popcorn', 'pancakes', 'waffles', 'sandwich', 'ramen'
  ],
  'en-music': [
    'electric guitar', 'drums', 'grand piano', 'violin', 'saxophone', 'trumpet', 'flute',
    'bass guitar', 'harp', 'accordion', 'clarinet', 'microphone', 'headphones', 'speaker',
    'turntable', 'vinyl record', 'sheet music', 'conductor baton', 'concert', 'orchestra'
  ],
  'en-blitz': [
    'sun', 'car', 'dog', 'cat', 'hat', 'box', 'cup', 'pen', 'bed', 'key',
    'tree', 'star', 'door', 'fish', 'ship', 'shoe', 'ring', 'fork', 'ball', 'bell'
  ],
  'en-5strokes': [
    'house', 'tree', 'sun', 'smiley face', 'star', 'fish', 'boat', 'mountain', 'clock',
    'cup', 'umbrella', 'ladder', 'flag', 'envelope', 'cone', 'candle', 'glasses', 'box'
  ],
  'en-bigpicture': [
    'ocean floor', 'space station', 'tropical rainforest', 'desert at night',
    'futuristic city', 'deserted island', 'amusement park', 'soccer stadium',
    'egyptian pyramids', 'secret laboratory', 'haunted castle', 'rock concert'
  ],
  'en-connections': [
    'seahorse', 'starfish', 'hot dog', 'bullet train', 'black cat', 'full moon',
    'snowman', 'rainbow', 'swordfish', 'country house', 'suspension bridge', 'christmas tree'
  ],
  'en-tandem': [
    'sun', 'pie', 'pen', 'fox', 'box', 'cup', 'car', 'sky', 'sea', 'hat',
    'key', 'ant', 'bee', 'cow', 'pig', 'owl', 'bat', 'cat', 'dog', 'bus'
  ],

  // FRANÇAIS, DEUTSCH, ITALIANO, PORTUGUÊS
  'fr-standard': ['soleil', 'maison', 'chat', 'chien', 'arbre', 'fleur', 'voiture', 'bateau', 'avion', 'poisson', 'pomme', 'pain', 'fromage', 'chapeau', 'livre', 'stylo', 'guitare', 'vélo', 'château', 'étoile'],
  'de-standard': ['sonne', 'haus', 'katze', 'hund', 'baum', 'blume', 'auto', 'schiff', 'flugzeug', 'fisch', 'apfel', 'brot', 'käse', 'hut', 'buch', 'stift', 'gitarre', 'fahrrad', 'schloss', 'stern'],
  'it-standard': ['sole', 'casa', 'gatto', 'cane', 'albero', 'fiore', 'macchina', 'nave', 'aereo', 'pesce', 'mela', 'pane', 'formaggio', 'cappello', 'libro', 'penna', 'chitarra', 'bicicletta', 'castello', 'stella'],
  'pt-standard': ['sol', 'casa', 'gato', 'cachorro', 'árvore', 'flor', 'carro', 'barco', 'avião', 'peixe', 'maçã', 'pão', 'queijo', 'chapéu', 'livro', 'caneta', 'violão', 'bicicleta', 'castelo', 'estrela']
};

const DEFAULT_ROOMS = [
  // ESPAÑOL
  { id: 'es-facil', name: 'Fácil (Español)', lang: 'es', category: 'General', mode: 'classic', stars: 1, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-estandar', name: 'Estándar (Español)', lang: 'es', category: 'General', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-dificil', name: 'Difícil / Experto', lang: 'es', category: 'General', mode: 'classic', stars: 5, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-blitz', name: '⚡ Blitz Rápido', lang: 'es', category: 'Modos Especiales', mode: 'blitz', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-5trazos', name: '✏️ 5 Trazos Solamente', lang: 'es', category: 'Modos Especiales', mode: '5strokes', stars: 4, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-animales', name: '🦁 Reino Animal', lang: 'es', category: 'Temáticas', mode: 'classic', stars: 2, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-cine', name: '🎬 Cine y Hollywood', lang: 'es', category: 'Temáticas', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-geografia', name: '🌍 Geografía del Mundo', lang: 'es', category: 'Temáticas', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-comida', name: '🍕 Gastronomía & Comida', lang: 'es', category: 'Temáticas', mode: 'classic', stars: 2, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-musica', name: '🎵 Música y Artistas', lang: 'es', category: 'Temáticas', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-bigpicture', name: '🖼️ Big Picture', lang: 'es', category: 'Modos Especiales', mode: 'bigpicture', stars: 4, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-connections', name: '🔗 Connections', lang: 'es', category: 'Modos Especiales', mode: 'connections', stars: 4, maxPlayers: 10, maxRounds: 10 },
  { id: 'es-tandem', name: '⚡ Tandem Express', lang: 'es', category: 'Modos Especiales', mode: 'tandem', stars: 2, maxPlayers: 10, maxRounds: 10 },

  // ENGLISH
  { id: 'en-easy', name: 'Easy English', lang: 'en', category: 'General', mode: 'classic', stars: 1, maxPlayers: 10, maxRounds: 10 },
  { id: 'en-standard', name: 'Standard English', lang: 'en', category: 'General', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'en-hard', name: 'Hard / Expert', lang: 'en', category: 'General', mode: 'classic', stars: 5, maxPlayers: 10, maxRounds: 10 },
  { id: 'en-blitz', name: '⚡ Blitz Speed', lang: 'en', category: 'Modos Especiales', mode: 'blitz', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'en-5strokes', name: '✏️ 5 Strokes Only', lang: 'en', category: 'Modos Especiales', mode: '5strokes', stars: 4, maxPlayers: 10, maxRounds: 10 },
  { id: 'en-animals', name: '🦁 Animals & Wildlife', lang: 'en', category: 'Temáticas', mode: 'classic', stars: 2, maxPlayers: 10, maxRounds: 10 },
  { id: 'en-movies', name: '🎬 Movies & Cinema', lang: 'en', category: 'Temáticas', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'en-geography', name: '🌍 World Geography', lang: 'en', category: 'Temáticas', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'en-food', name: '🍕 Food & Cuisine', lang: 'en', category: 'Temáticas', mode: 'classic', stars: 2, maxPlayers: 10, maxRounds: 10 },
  { id: 'en-music', name: '🎵 Music & Legends', lang: 'en', category: 'Temáticas', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },

  // OTROS IDIOMAS
  { id: 'fr-standard', name: 'Standard (Français)', lang: 'fr', category: 'General', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'de-standard', name: 'Standard (Deutsch)', lang: 'de', category: 'General', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'it-standard', name: 'Standard (Italiano)', lang: 'it', category: 'General', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 },
  { id: 'pt-standard', name: 'Standard (Português)', lang: 'pt', category: 'General', mode: 'classic', stars: 3, maxPlayers: 10, maxRounds: 10 }
];

function levenshteinDistance(a, b) {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9 ]/g, '');
}

// ============================================================
//  CLASE GAME ROOM
// ============================================================
class GameRoom {
  constructor(roomId, options = {}) {
    this.id = roomId;
    this.name = options.name || roomId;
    this.lang = options.lang || 'es';
    this.category = options.category || 'General';
    this.mode = options.mode || 'classic';
    this.stars = options.stars || 3;
    this.maxRounds = options.maxRounds || 10;
    this.maxPlayers = options.maxPlayers || 10;

    this.players = new Map();
    this.playerOrder = [];
    this.drawerIndex = -1;
    this.currentRound = 1;
    this.currentDrawer = null;
    this.currentWord = '';
    this.maskedWord = [];
    this.revealedIndices = new Set();
    this.timeLeft = (this.mode === 'blitz' || this.mode === 'tandem') ? 45 : 80;
    this.roundDuration = this.timeLeft;
    this.gameStarted = false;
    this.playersGuessed = new Set();
    this.pointsAvailable = 10;
    this.hintsUsedByDrawer = 0;
    this.strokesUsed = 0;
    this.maxStrokes = 5;
    this.timer = null;
    this.usedWords = new Set();
    this.reports = new Map();
    this.warningsAgainstDrawer = 0;
    this.lastActivityTime = Date.now();
  }

  addPlayer(socketId, nickname, country = '🌐', badges = []) {
    if (this.players.has(socketId)) return;
    const finalNickname = String(nickname).trim().slice(0, 15);
    if (!finalNickname) return;

    this.players.set(socketId, {
      id: socketId,
      nickname: finalNickname,
      country: country || '🌐',
      badges: Array.isArray(badges) ? badges.slice(0, 5) : [],
      score: 0,
      isDrawer: false,
      hasGuessed: false
    });

    if (!this.playerOrder.includes(socketId)) {
      this.playerOrder.push(socketId);
    }
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    this.playerOrder = this.playerOrder.filter(id => id !== socketId);

    if (this.currentDrawer === socketId && this.gameStarted) {
      this.stopRound();
      io.to(this.id).emit('chat_message', {
        nickname: 'SISTEMA',
        message: '*** El dibujante ha abandonado la partida. Pasando a la siguiente ronda... ***',
        type: 'system'
      });

      setTimeout(() => {
        if (this.players.size >= 2) {
          this.playNextRound();
        } else {
          this.gameStarted = false;
          io.to(this.id).emit('chat_message', {
            nickname: 'SISTEMA',
            message: '*** Esperando al menos 2 jugadores para continuar... ***',
            type: 'system'
          });
        }
      }, 2000);
    }
  }

  getPlayersArray() {
    return Array.from(this.players.values()).map(player => ({
      id: player.id,
      nickname: player.nickname,
      country: player.country || '🌐',
      badges: player.badges || [],
      score: player.score,
      isDrawer: player.isDrawer,
      hasGuessed: player.hasGuessed
    }));
  }

  getWordPool() {
    const key = this.id;
    if (WORD_BANKS[key]) return WORD_BANKS[key];

    const langKey = `${this.lang}-${this.mode === 'classic' ? 'estandar' : this.mode}`;
    if (WORD_BANKS[langKey]) return WORD_BANKS[langKey];

    const fallbackKey = `${this.lang}-estandar`;
    if (WORD_BANKS[fallbackKey]) return WORD_BANKS[fallbackKey];

    return WORD_BANKS['es-estandar'];
  }

  getRandomWord() {
    const pool = this.getWordPool();
    const available = pool.filter(w => !this.usedWords.has(w));
    const wordList = available.length > 0 ? available : pool;

    if (available.length === 0) {
      this.usedWords.clear();
    }

    const selected = wordList[Math.floor(Math.random() * wordList.length)];
    this.usedWords.add(selected);
    return selected;
  }

  generateMask(word) {
    this.maskedWord = [];
    this.revealedIndices.clear();
    for (let i = 0; i < word.length; i++) {
      if (word[i] === ' ') {
        this.maskedWord.push(' ');
      } else if (word[i] === '-') {
        this.maskedWord.push('-');
      } else {
        this.maskedWord.push('_');
      }
    }
  }

  getMaskedString() {
    return this.maskedWord.join('');
  }

  getWordLetterCounts() {
    return this.currentWord.split(' ').map(w => w.length).join(', ');
  }

  revealRandomLetter() {
    if (!this.maskedWord || this.maskedWord.length === 0) return null;

    const available = [];
    for (let i = 0; i < this.maskedWord.length; i++) {
      const char = this.currentWord[i];
      if (this.maskedWord[i] === '_' && char !== ' ' && char !== '-') {
        available.push(i);
      }
    }

    if (available.length === 0) return null;

    const idx = available[Math.floor(Math.random() * available.length)];
    this.maskedWord[idx] = this.currentWord[idx].toUpperCase();
    this.revealedIndices.add(idx);

    io.to(this.id).emit('hint_update', {
      mask: this.getMaskedString(),
      letterCounts: this.getWordLetterCounts(),
      hintsUsed: this.hintsUsedByDrawer
    });

    return this.currentWord[idx];
  }

  startGame() {
    if (this.players.size < 2) return false;
    this.gameStarted = true;
    this.currentRound = 1;
    this.drawerIndex = -1;
    this.playNextRound();
    return true;
  }

  playNextRound() {
    if (this.currentRound > this.maxRounds) {
      this.endGame();
      return;
    }

    if (this.playerOrder.length === 0) {
      this.gameStarted = false;
      return;
    }

    this.drawerIndex = (this.drawerIndex + 1) % this.playerOrder.length;
    const drawerSocketId = this.playerOrder[this.drawerIndex];
    const drawer = this.players.get(drawerSocketId);

    if (!drawer) {
      this.playerOrder = this.playerOrder.filter(id => this.players.has(id));
      if (this.players.size < 2) {
        this.gameStarted = false;
        return;
      }
      this.playNextRound();
      return;
    }

    this.playersGuessed.clear();
    this.hintsUsedByDrawer = 0;
    this.strokesUsed = 0;
    this.warningsAgainstDrawer = 0;
    this.lastActivityTime = Date.now();

    this.players.forEach(player => {
      player.hasGuessed = false;
      player.isDrawer = (player.id === drawerSocketId);
    });

    this.currentDrawer = drawerSocketId;
    this.currentWord = this.getRandomWord();
    this.generateMask(this.currentWord);

    this.pointsAvailable = 10;
    this.timeLeft = (this.mode === 'blitz' || this.mode === 'tandem') ? 45 : 80;
    this.roundDuration = this.timeLeft;

    io.to(this.id).emit('clear_canvas');

    const is5Strokes = (this.mode === '5strokes');
    const drawerBadges = (drawer.badges && drawer.badges.length > 0) ? ` [${drawer.badges.slice(0, 3).join('')}]` : '';

    this.players.forEach(player => {
      const isDrawer = (player.id === drawerSocketId);

      io.to(player.id).emit('role_assigned', {
        isDrawer: isDrawer,
        word: isDrawer ? this.currentWord.toUpperCase() : '',
        mask: this.getMaskedString(),
        letterCounts: this.getWordLetterCounts(),
        round: this.currentRound,
        maxRounds: this.maxRounds,
        mode: this.mode,
        is5Strokes: is5Strokes,
        strokesLeft: 5,
        canPass: true,
        isDoneState: false
      });

      io.to(player.id).emit('chat_message', {
        nickname: 'SISTEMA',
        message: isDrawer
          ? `✏️ ¡Es tu turno de dibujar! Tu palabra secreta es: ${this.currentWord.toUpperCase()}`
          : `📢 Ronda ${this.currentRound} de ${this.maxRounds}: ${drawer.country} ${drawer.nickname}${drawerBadges} está dibujando.`,
        type: 'system'
      });
    });

    this.startTimer();
    this.updatePlayers();

    io.to(this.id).emit('game_started', {
      room: this.id,
      round: this.currentRound,
      maxRounds: this.maxRounds,
      mode: this.mode,
      players: this.getPlayersArray(),
      mask: this.getMaskedString(),
      letterCounts: this.getWordLetterCounts()
    });

    broadcastLobbyUpdate();
  }

  startTimer() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      this.timeLeft -= 1;
      io.to(this.id).emit('update_timer', this.timeLeft);

      const cleanLen = this.currentWord.replace(/[\s-]+/g, '').length;
      if (this.mode !== 'blitz' && this.mode !== '5strokes') {
        if (this.timeLeft === 50 && cleanLen >= 4) {
          this.revealRandomLetter();
        } else if (this.timeLeft === 30 && cleanLen >= 6) {
          this.revealRandomLetter();
        } else if (this.timeLeft === 15 && cleanLen >= 8) {
          this.revealRandomLetter();
        }
      }

      if (this.timeLeft === (this.roundDuration - 20) && this.strokesUsed === 0) {
        io.to(this.id).emit('chat_message', {
          nickname: 'SISTEMA',
          message: '⚠️ ¡Atención! El dibujante debe comenzar a dibujar.',
          type: 'warning'
        });
      }

      if (this.timeLeft <= 0) {
        clearInterval(this.timer);
        this.endRound(`⏰ ¡Se acabó el tiempo! La palabra era: ${this.currentWord.toUpperCase()}`);
      }
    }, 1000);
  }

  stopRound() {
    clearInterval(this.timer);
  }

  giveManualHint(socketId) {
    if (this.currentDrawer !== socketId || !this.gameStarted) return;
    this.hintsUsedByDrawer += 1;
    const revealed = this.revealRandomLetter();
    if (revealed) {
      io.to(this.id).emit('chat_message', {
        nickname: 'SISTEMA',
        message: `💡 El dibujante dio una pista (-2 pts de penalización al artista).`,
        type: 'hint'
      });
    }
  }

  skipOrDone(socketId) {
    if (this.currentDrawer !== socketId || !this.gameStarted) return;

    if (this.playersGuessed.size === 0) {
      clearInterval(this.timer);
      io.to(this.id).emit('chat_message', {
        nickname: 'SISTEMA',
        message: `El dibujante ha pasado su turno. La palabra era: ${this.currentWord.toUpperCase()}`,
        type: 'system'
      });
      this.endRound(`El dibujante pasó su turno. La palabra era: ${this.currentWord.toUpperCase()}`);
    } else {
      clearInterval(this.timer);
      this.endRound(`🎨 El dibujante ha marcado la ronda como terminada (DONE).`);
    }
  }

  warnArtist(reporterId, reason) {
    const reporter = this.players.get(reporterId);
    if (!reporter || !this.gameStarted || !this.currentDrawer) return;

    const drawer = this.players.get(this.currentDrawer);
    if (!drawer) return;

    this.warningsAgainstDrawer += 1;
    drawer.score = Math.max(0, drawer.score - 1);
    this.updatePlayers();

    io.to(this.id).emit('artist_warned_event', {
      reporter: `${reporter.country} ${reporter.nickname}`,
      drawer: `${drawer.country} ${drawer.nickname}`,
      reason: reason || '¡No se permite escribir letras, números o hacer trampas!'
    });

    io.to(this.id).emit('chat_message', {
      nickname: 'SISTEMA',
      message: `🚨 ¡ADVERTENCIA AL DIBUJANTE!: ${reporter.country} ${reporter.nickname} advirtió a ${drawer.country} ${drawer.nickname}. Motivo: ${reason || '¡No escribas letras o números!'} (-1 pt)`,
      type: 'warning'
    });

    const drawerSocket = io.sockets.sockets.get(this.currentDrawer);
    if (drawerSocket) {
      drawerSocket.emit('drawer_warned', {
        reason: reason || 'Regla de iSketch: ¡No escribas letras o números!',
        count: this.warningsAgainstDrawer
      });
    }
  }

  recordStroke(socketId) {
    this.lastActivityTime = Date.now();
    if (this.currentDrawer !== socketId || this.mode !== '5strokes') return true;
    this.strokesUsed += 1;
    const strokesLeft = Math.max(0, this.maxStrokes - this.strokesUsed);

    io.to(this.id).emit('stroke_count_update', {
      strokesUsed: this.strokesUsed,
      strokesLeft: strokesLeft
    });

    return strokesLeft > 0;
  }

  checkGuess(socketId, rawGuess) {
    const player = this.players.get(socketId);
    if (!player || player.isDrawer || this.playersGuessed.has(socketId) || !this.gameStarted) return;

    const normalizedGuess = normalize(rawGuess);
    const normalizedWord = normalize(this.currentWord);

    if (!normalizedGuess) return;

    // 1. Comprobación de acierto normalizado
    const distance = levenshteinDistance(normalizedGuess, normalizedWord);
    const isCorrect = (normalizedGuess === normalizedWord);

    if (isCorrect) {
      this.playersGuessed.add(socketId);
      player.hasGuessed = true;

      // REGLA: Doble puntuación si la palabra tiene acento y el usuario la escribió con acentuación exacta
      const cleanRawGuess = String(rawGuess || '').trim().toLowerCase();
      const cleanTargetWord = String(this.currentWord || '').trim().toLowerCase();
      const wordHasAccents = /[áéíóúüñ]/i.test(cleanTargetWord);
      const isExactAccentMatch = wordHasAccents && (cleanRawGuess === cleanTargetWord);

      const basePoints = this.pointsAvailable;
      const pointsWon = isExactAccentMatch ? (basePoints * 2) : basePoints;
      player.score += pointsWon;

      const drawer = this.players.get(this.currentDrawer);
      if (drawer) {
        if (this.playersGuessed.size === 1) {
          const drawerBase = 10;
          const hintPenalty = this.hintsUsedByDrawer * 2;
          const drawerPoints = Math.max(0, drawerBase - hintPenalty);
          drawer.score += drawerPoints;
        } else {
          drawer.score += 1;
        }
      }

      this.pointsAvailable = Math.max(5, this.pointsAvailable - 1);

      const badgesStr = (player.badges && player.badges.length > 0) ? ` [${player.badges.slice(0, 3).join('')}]` : '';

      io.to(this.id).emit('player_guessed_event', {
        playerId: player.id,
        nickname: player.nickname,
        country: player.country || '🌐',
        badges: player.badges || [],
        points: pointsWon,
        isDoublePoints: isExactAccentMatch,
        timeLeft: this.timeLeft
      });

      const messageText = isExactAccentMatch
        ? `🌟 ¡*** ${player.country} ${player.nickname}${badgesStr} adivinó con ORTOGRAFÍA EXACTA (+${pointsWon} pts - PUNTUACIÓN DOBLE)! ***`
        : `🎉 ¡*** ${player.country} ${player.nickname}${badgesStr} ha adivinado la palabra! *** (+${pointsWon} pts)`;

      io.to(this.id).emit('chat_message', {
        nickname: 'SISTEMA',
        message: messageText,
        type: isExactAccentMatch ? 'guessed' : 'guessed'
      });

      const drawerSocket = io.sockets.sockets.get(this.currentDrawer);
      if (drawerSocket) {
        drawerSocket.emit('drawer_done_available', {
          canPass: true,
          isDoneState: true
        });
      }

      this.updatePlayers();

      if (this.mode === 'blitz') {
        this.endRound(`⚡ ¡${player.country} ${player.nickname}${badgesStr} ganó la ronda Blitz! La palabra era: ${this.currentWord.toUpperCase()}`);
        return;
      }

      const guessersNeeded = this.players.size - 1;
      if (this.playersGuessed.size >= guessersNeeded) {
        io.to(this.id).emit('room_sweep_event', {
          message: `🌟 ¡Todos han adivinado la palabra: ${this.currentWord.toUpperCase()}!`
        });
        this.endRound(`🌟 ¡Todos han adivinado la palabra: ${this.currentWord.toUpperCase()}!`);
      }
      return;
    }

    // 2. Detección de "Casi / Muy Cerca" (Warm / Close Guess)
    const isSuperClose = (distance === 1);
    const isClose = isSuperClose || (distance === 2 && normalizedWord.length >= 6);

    const badgesStr = (player.badges && player.badges.length > 0) ? ` [${player.badges.slice(0, 3).join('')}]` : '';

    if (isClose) {
      io.to(this.id).emit('close_guess_event', {
        playerId: socketId,
        nickname: player.nickname,
        country: player.country || '🌐',
        badges: player.badges || [],
        isSuperClose: isSuperClose
      });

      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.emit('chat_message', {
          nickname: 'SISTEMA',
          message: `⚠️ ¡"${rawGuess}" está MUY CERCA! (${isSuperClose ? '¡A 1 sola letra!' : '¡Casi aciertas!'})`,
          type: 'close'
        });
      }

      io.to(this.id).emit('chat_message', {
        nickname: 'SISTEMA',
        message: `🔥 ¡*** ${player.country} ${player.nickname}${badgesStr} está MUY CERCA de adivinar! ***`,
        type: 'close'
      });
    }

    // 3. Emitir el intento en el chat con la bandera e insignias del remitente
    io.to(this.id).emit('chat_message', {
      nickname: `${player.country} ${player.nickname}${badgesStr}`,
      message: rawGuess,
      type: 'normal'
    });
  }

  handleGuessedChat(socketId, message) {
    const player = this.players.get(socketId);
    if (!player) return;

    const badgesStr = (player.badges && player.badges.length > 0) ? ` [${player.badges.slice(0, 3).join('')}]` : '';

    this.players.forEach(p => {
      const s = io.sockets.sockets.get(p.id);
      if (!s) return;

      if (p.hasGuessed || p.isDrawer) {
        s.emit('chat_message', {
          nickname: `🔒 ${player.country} ${player.nickname}${badgesStr}`,
          message: message,
          type: 'guessed_chat'
        });
      } else {
        s.emit('chat_message', {
          nickname: `${player.country} ${player.nickname}${badgesStr}`,
          message: '💬 *(comentario protegido)*',
          type: 'spoiler_hidden'
        });
      }
    });
  }

  endRound(message) {
    clearInterval(this.timer);
    io.to(this.id).emit('round_ended', {
      word: this.currentWord.toUpperCase(),
      message: message || `Fin de la ronda. La palabra era: ${this.currentWord.toUpperCase()}`
    });

    io.to(this.id).emit('chat_message', {
      nickname: 'SISTEMA',
      message: message || `La palabra era: ${this.currentWord.toUpperCase()}`,
      type: 'system'
    });

    this.currentRound += 1;
    setTimeout(() => {
      if (this.players.size >= 2) {
        this.playNextRound();
      } else {
        this.gameStarted = false;
        io.to(this.id).emit('chat_message', {
          nickname: 'SISTEMA',
          message: '*** Se necesitan al menos 2 jugadores para continuar. ***',
          type: 'system'
        });
      }
    }, 4000);
  }

  endGame() {
    clearInterval(this.timer);
    this.gameStarted = false;

    const ranking = Array.from(this.players.values()).sort((a, b) => b.score - a.score);
    const winner = ranking[0] || { nickname: 'Nadie', country: '🌐', score: 0, badges: [] };

    io.to(this.id).emit('game_over', {
      winner: winner.nickname,
      winnerCountry: winner.country || '🌐',
      winnerBadges: winner.badges || [],
      winnerScore: winner.score,
      finalScores: ranking.map((p, idx) => ({
        rank: idx + 1,
        nickname: p.nickname,
        country: p.country || '🌐',
        badges: p.badges || [],
        score: p.score
      }))
    });

    broadcastLobbyUpdate();
  }

  updatePlayers() {
    io.to(this.id).emit('update_players', this.getPlayersArray());
  }
}

// ============================================================
//  MAPA DE SALAS GLOBALES
// ============================================================
const rooms = new Map();

DEFAULT_ROOMS.forEach(def => {
  rooms.set(def.id, new GameRoom(def.id, def));
});

const lobbyMessages = [];
const MAX_LOBBY_MESSAGES = 60;

function addLobbyMessage(nickname, message, country = '🌐', badges = []) {
  const msg = {
    nickname: String(nickname).slice(0, 15),
    country: country || '🌐',
    badges: Array.isArray(badges) ? badges.slice(0, 3) : [],
    message: String(message).trim().slice(0, 200),
    type: 'normal',
    timestamp: Date.now()
  };
  lobbyMessages.push(msg);
  if (lobbyMessages.length > MAX_LOBBY_MESSAGES) lobbyMessages.shift();
  return msg;
}

function getOrCreateRoom(roomId, customOptions = {}) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new GameRoom(roomId, customOptions));
  }
  return rooms.get(roomId);
}

function getLobbyRoomsData() {
  const list = [];
  rooms.forEach(room => {
    let currentDrawerName = 'Ninguno';
    if (room.currentDrawer && room.players.has(room.currentDrawer)) {
      const d = room.players.get(room.currentDrawer);
      currentDrawerName = `${d.country} ${d.nickname}`;
    }

    list.push({
      id: room.id,
      name: room.name,
      lang: room.lang,
      category: room.category,
      mode: room.mode,
      stars: room.stars,
      playerCount: room.players.size,
      maxPlayers: room.maxPlayers,
      currentRound: room.currentRound,
      maxRounds: room.maxRounds,
      currentDrawer: currentDrawerName,
      inGame: room.gameStarted
    });
  });
  return list;
}

function broadcastLobbyUpdate() {
  io.to('lobby').emit('lobby_directory_update', getLobbyRoomsData());
}

// ============================================================
//  MANEJO DE CONEXIONES SOCKET.IO
// ============================================================
io.on('connection', (socket) => {
  let currentRoom = null;
  let currentGameRoom = null;

  socket.join('lobby');
  socket.emit('lobby_directory_update', getLobbyRoomsData());
  socket.emit('lobby_chat_history', lobbyMessages);

  socket.on('join_room', ({ room, nickname, country, badges }) => {
    const trimmedNick = String(nickname || '').trim();
    if (!room || !trimmedNick) {
      socket.emit('join_room_error', { message: 'El apodo no puede estar vacío.' });
      return;
    }

    currentGameRoom = getOrCreateRoom(room);
    if (currentGameRoom.players.size >= currentGameRoom.maxPlayers) {
      socket.emit('join_room_error', { message: 'La sala está completa (máximo de jugadores alcanzado).' });
      return;
    }

    const nameTaken = Array.from(currentGameRoom.players.values()).some(
      p => normalize(p.nickname) === normalize(trimmedNick)
    );
    if (nameTaken) {
      socket.emit('join_room_error', { message: `El apodo "${trimmedNick}" ya está en uso en esta sala.` });
      return;
    }

    socket.leave('lobby');
    currentRoom = room;

    currentGameRoom.addPlayer(socket.id, trimmedNick, country || '🌐', badges || []);
    socket.join(room);

    socket.emit('join_room_success', {
      roomId: room,
      roomName: currentGameRoom.name,
      category: currentGameRoom.category,
      mode: currentGameRoom.mode,
      stars: currentGameRoom.stars,
      maxRounds: currentGameRoom.maxRounds
    });

    broadcastLobbyUpdate();

    const player = currentGameRoom.players.get(socket.id);
    const badgesStr = (player.badges && player.badges.length > 0) ? ` [${player.badges.slice(0, 3).join('')}]` : '';

    io.to(room).emit('chat_message', {
      nickname: 'SISTEMA',
      message: `*** 👋 ${player.country} ${player.nickname}${badgesStr} se ha unido a la partida. ***`,
      type: 'system'
    });

    io.to(room).emit('update_players', currentGameRoom.getPlayersArray());

    if (!currentGameRoom.gameStarted && currentGameRoom.players.size >= 2) {
      setTimeout(() => {
        if (currentGameRoom && !currentGameRoom.gameStarted && currentGameRoom.players.size >= 2) {
          currentGameRoom.startGame();
        }
      }, 600);
    } else if (!currentGameRoom.gameStarted) {
      socket.emit('chat_message', {
        nickname: 'SISTEMA',
        message: 'Esperando a que se una al menos 1 jugador más para comenzar...',
        type: 'system'
      });
    }
  });

  socket.on('create_room', (data) => {
    if (!data || !data.name || !data.nickname) {
      socket.emit('join_room_error', { message: 'Datos incompletos para crear la sala.' });
      return;
    }

    const cleanName = String(data.name).trim();
    const cleanNick = String(data.nickname).trim();
    if (!cleanName || !cleanNick) {
      socket.emit('join_room_error', { message: 'El nombre de la sala y apodo son obligatorios.' });
      return;
    }

    const roomId = 'custom-' + cleanName.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now().toString(36).slice(-4);
    const roomOptions = {
      name: cleanName,
      lang: data.lang || 'es',
      category: data.category || 'Personalizada',
      mode: data.mode || 'classic',
      stars: parseInt(data.stars) || 3,
      maxRounds: parseInt(data.maxRounds) || 10,
      maxPlayers: parseInt(data.maxPlayers) || 10
    };

    const newRoom = new GameRoom(roomId, roomOptions);
    rooms.set(roomId, newRoom);

    socket.leave('lobby');
    currentRoom = roomId;
    currentGameRoom = newRoom;
    currentGameRoom.addPlayer(socket.id, cleanNick, data.country || '🌐', data.badges || []);
    socket.join(roomId);

    socket.emit('join_room_success', {
      roomId: roomId,
      roomName: newRoom.name,
      category: newRoom.category,
      mode: newRoom.mode,
      stars: newRoom.stars,
      maxRounds: newRoom.maxRounds
    });

    broadcastLobbyUpdate();

    const badgesStr = (data.badges && data.badges.length > 0) ? ` [${data.badges.slice(0, 3).join('')}]` : '';

    io.to(roomId).emit('chat_message', {
      nickname: 'SISTEMA',
      message: `*** 👋 ${data.country || '🌐'} ${cleanNick}${badgesStr} creó la sala "${cleanName}". ***`,
      type: 'system'
    });

    io.to(roomId).emit('update_players', currentGameRoom.getPlayersArray());
  });

  // Canvas drawing events
  socket.on('draw_stroke', (data) => {
    if (!currentGameRoom || currentGameRoom.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit('draw_stroke', data);
  });

  socket.on('draw_shape', (data) => {
    if (!currentGameRoom || currentGameRoom.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit('draw_shape', data);
  });

  socket.on('spray_particles', (data) => {
    if (!currentGameRoom || currentGameRoom.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit('spray_particles', data);
  });

  socket.on('flood_fill', (data) => {
    if (!currentGameRoom || currentGameRoom.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit('flood_fill', data);
  });

  socket.on('undo_canvas', (data) => {
    if (!currentGameRoom || currentGameRoom.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit('undo_canvas', data);
  });

  socket.on('clear_canvas', () => {
    if (!currentGameRoom || currentGameRoom.currentDrawer !== socket.id) return;
    socket.to(currentRoom).emit('clear_canvas');
  });

  socket.on('stroke_started', () => {
    if (!currentGameRoom || currentGameRoom.currentDrawer !== socket.id) return;
    currentGameRoom.recordStroke(socket.id);
  });

  // Chat, Guessing & Anti-Cheat
  socket.on('chat_message', (data) => {
    if (!currentGameRoom || !data || !data.message) return;

    const player = currentGameRoom.players.get(socket.id);
    if (!player) return;

    const badgesStr = (player.badges && player.badges.length > 0) ? ` [${player.badges.slice(0, 3).join('')}]` : '';

    // Regla de iSketch: El dibujante NO puede escribir en el chat
    if (player.isDrawer) {
      socket.emit('drawer_typing_detected', {
        message: '🚨 ¡FALTA EN iSKETCH!: Eres el dibujante. ¡Está prohibido escribir letras o dar pistas en el chat!'
      });

      io.to(currentRoom).emit('chat_message', {
        nickname: 'SISTEMA',
        message: `🚨 ¡FALTA!: ${player.country} ${player.nickname}${badgesStr} intentó escribir en el chat en su turno de dibujo.`,
        type: 'warning'
      });
      return;
    }

    if (player.hasGuessed) {
      currentGameRoom.handleGuessedChat(socket.id, data.message);
      return;
    }

    currentGameRoom.checkGuess(socket.id, data.message);
  });

  socket.on('give_hint', () => {
    if (!currentGameRoom) return;
    currentGameRoom.giveManualHint(socket.id);
  });

  socket.on('skip_or_done', () => {
    if (!currentGameRoom) return;
    currentGameRoom.skipOrDone(socket.id);
  });

  socket.on('warn_artist', (data) => {
    if (!currentGameRoom) return;
    currentGameRoom.warnArtist(socket.id, data ? data.reason : null);
  });

  socket.on('leave_room', () => {
    if (!currentGameRoom) return;
    socket.leave(currentRoom);
    currentGameRoom.removePlayer(socket.id);
    io.to(currentRoom).emit('update_players', currentGameRoom.getPlayersArray());

    broadcastLobbyUpdate();
    currentGameRoom = null;
    currentRoom = null;

    socket.join('lobby');
    socket.emit('lobby_directory_update', getLobbyRoomsData());
    socket.emit('lobby_chat_history', lobbyMessages);
  });

  socket.on('lobby_chat_message', (data) => {
    if (!data || !data.message || !data.nickname) return;
    const savedMsg = addLobbyMessage(data.nickname, data.message, data.country || '🌐', data.badges || []);
    io.to('lobby').emit('lobby_chat_message', savedMsg);
  });

  socket.on('disconnect', () => {
    if (currentGameRoom) {
      currentGameRoom.removePlayer(socket.id);
      io.to(currentRoom).emit('update_players', currentGameRoom.getPlayersArray());
      broadcastLobbyUpdate();
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`===========================================`);
  console.log(`🎨 Servidor iSketch Clásico (Shockwave 1999-2010)`);
  console.log(`🚀 Ejecutándose en: http://localhost:${PORT}`);
  console.log(`===========================================`);
});
