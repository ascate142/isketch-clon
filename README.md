# iSketch Clásico (1999-2010)

Recreación 100% fiel del legendario juego en línea **iSketch (isketch.net)** en su época dorada de Macromedia Shockwave: interfaz retro, caja de herramientas completa, modos de juego icónicos, reglas de juego limpio, sistema de puntuación auténtico, directorio de salas multilingüe y motor de audio sintetizado Web Audio API.

---

## 🎨 Características Principales

### 1. Estética e Interfaz Shockwave
- **Logotipo Oficial Retro:** La icónica `i` minúscula naranja y `Sketch` en relieve 3D con el lema *"the online sketching game"*.
- **Diseño Visual Clásico:** Paleta gris pizarra/azul metálico con biseles en relieve, tablero de dibujo enmarcado, reloj analógico/digital de cuenta regresiva y tipografía de la época.
- **Podio de Victoria:** Ceremonia de fin de partida con medallas 🥇 🥈 🥉 y tabla completa de puntuaciones.

### 2. Directorio de Salas y Navegación
- **Filtros por Idioma:** 🇪🇸 Español, 🇬🇧 English, 🇫🇷 Français, 🇩🇪 Deutsch, 🇮🇹 Italiano, 🇵🇹 Português.
- **Categorías y Dificultades:**
  - *General:* Fácil (★☆☆☆☆), Estándar (★★★☆☆), Difícil / Experto (★★★★★).
  - *Modos Especiales:*
    - **⚡ Blitz:** Partidas ultra-rápidas; el primer jugador que adivina gana la ronda inmediatamente.
    - **✏️ 5 Trazos (5 Strokes):** El dibujante solo tiene 5 trazos exactos para representar la palabra.
    - **🖼️ Big Picture:** Conceptos amplios y escenas compuestas.
    - **🔗 Connections:** Palabras compuestas y conceptos encadenados.
    - **⚡ Tandem:** Palabras cortas y ritmo dinámico.
  - *Salas Temáticas:* Reino Animal, Cine y Hollywood, Geografía Mundial, Gastronomía & Comida, Música y Artistas.
- **Creación de Salas Personalizadas:** Configuración de nombre, idioma, modalidad y número de rondas.
- **Chat Global del Lobby:** Comunicación en tiempo real y lista de jugadores en línea.

### 3. Caja de Herramientas de Dibujo Completa
- **Herramientas:** Lápiz (Pen), Pincel Suave (Brush), Línea Recta, Rectángulo (Borde y Relleno), Círculo/Elipse (Borde y Relleno), Aerógrafo/Spray estocástico, Bote de Pintura (Flood Fill 8-connected), Goma de Borrar, Deshacer (Undo) y Limpiar Lienzo (Clear).
- **4 Tamaños de Trazo Oficiales:** Fino (1px), Medio (3px), Grueso (7px) y Extra Grueso (18px).
- **Paleta de 20 Colores Clásicos:** Matriz 2x10 con modificadores de brillo **Aclarar (▲)** y **Oscurecer (▼)** más selector personalizado.

### 4. Reglas, Puntuación y Juego Limpio
- **Sistema de Puntuación Auténtico:**
  - 1er acertante: 10 pts; 2do: 9 pts; 3ro: 8 pts... (mínimo 5 pts).
  - Dibujante: Gana 10 pts si al menos un jugador acierta + 1 pt por cada acertante extra (menos 2 pts por cada pista usada).
- **Botón SKIP / DONE:** Cambia dinámicamente de "SKIP" (pasar turno) a "DONE" (finalizar ronda) cuando al menos un jugador ha acertado.
- **Botón Give HINT:** Revela letras ocultas con penalización de -2 pts para el dibujante.
- **Canal Protegido Anti-Spoilers:** Los acertantes pueden chatear entre sí sin revelar la palabra a los jugadores que aún están adivinando.
- **Advertencias al Dibujante (Warn Artist):** Sistema de alerta de juego limpio contra artistas que escriben letras/números o están inactivos.
- **Detección de Casi-Acierto:** Algoritmo de distancia Levenshtein (*"¡Estás muy cerca!"*).

### 5. Motor de Audio Sintetizado (Web Audio API)
- Sonidos retro integrados sin dependencias externas:
  - Música ambiental de lobby (arpegio nostálgico).
  - Clics de botones e interfaz.
  - Chime de inicio de turno.
  - Campana brillante de acierto (*Ding!*).
  - Tictac de reloj en los últimos 10 segundos.
  - Zumbador (*Buzzer*) de fin de tiempo.
  - Alerta de advertencia.
  - Fanfarria triunfal de fin de partida.
  - Botón de silenciar/activar sonido.

---

## 🚀 Instalación y Ejecución

```bash
# Instalar dependencias
npm install

# Iniciar servidor
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### Ejecutar Tests
```bash
npm test
```

---

## 📁 Estructura del Proyecto

```
isketch-clon/
├── server.js              # Servidor Express + Socket.IO (Salas, modos, palabras, reglas)
├── run-tests.js           # Suite de pruebas automatizadas
├── package.json
├── public/
│   ├── index.html         # Interfaz Shockwave clásica (Lobby, Tablero, Chat, Modales)
│   ├── game.js            # Cliente Canvas, audio Web Audio API y eventos en tiempo real
│   ├── manifest.json      # Manifiesto PWA
│   └── sw.js              # Service Worker
└── README.md
```

## 📜 Licencia



---

## 🚀 Despliegue en Producción

### Arquitectura

```
┌─────────────────────┐     WebSocket      ┌─────────────────────┐
│   GitHub Pages      │◄──────────────────►│   Oracle Cloud      │
│   (Frontend)        │    ws://IP:3000    │   (Node.js Server)  │
└─────────────────────┘                    └─────────────────────┘
```

### Paso 1: GitHub Pages

1. Ve a **Settings → Pages** en tu repositorio
2. Selecciona **GitHub Actions** como Source
3. El workflow `.github/workflows/pages.yml` desplegará automáticamente

### Paso 2: Oracle Cloud

#### Crear Instancia
```
1. cloud.oracle.com → Compute → Instances → "Create Instance"
2. Name: isketch-server
3. Shape: VM.Standard.A1.Flex (4 cores, 24GB RAM - Always Free)
4. Image: Ubuntu 22.04
5. VCN: Nueva "isketch-vcn"
6. SSH Keys: Guardar clave privada
7. Anotar IP pública
```

#### Abrir Puertos (Security List)
```
Networking → isketch-vcn → Security Lists → Default Security List
- SSH (22): Solo TU_IP/32
- HTTP (80): 0.0.0.0/0
- iSketch (3000): 0.0.0.0/0
```

#### Desplegar
```bash
ssh -i clave.pem ubuntu@TU_IP

# Instalar Docker
sudo apt update && sudo apt install -y docker.io docker-compose
sudo systemctl start docker
sudo usermod -aG docker ubuntu
exit

# Reconectar y clonar
ssh -i clave.pem ubuntu@TU_IP
mkdir -p ~/isketch && cd ~/isketch
git clone https://github.com/TU_USUARIO/isketch-clon.git .

# Crear .env
echo 'NODE_ENV=production
PORT=3000
ALLOWED_ORIGIN=https://tu-usuario.github.io' > .env

# Iniciar
docker compose up -d --build

# Verificar
docker ps
curl http://localhost:3000
```

### Paso 3: GitHub Actions (opcional)

**Settings → Secrets and variables → Actions:**
- `ORACLE_HOST`: Tu IP pública
- `ORACLE_USER`: `ubuntu`
- `ORACLE_SSH_KEY`: Tu clave SSH privada

### Guía Completa

Ver `GUIA_ORACLE_CLOUD.md`
---

## 🚀 Despliegue

### GitHub Pages (Frontend)

1. Ve a **Settings → Pages** en tu repositorio de GitHub
2. En "Source", selecciona **GitHub Actions**
3. El workflow `.github/workflows/pages.yml` desplegará automáticamente

### Oracle Cloud (Backend)

```bash
# 1. Conectar a tu instancia
ssh opc@tu-ip-publica

# 2. Instalar Docker
sudo yum install -y docker.io docker-compose
sudo systemctl start docker

# 3. Subir archivos del proyecto
scp -r Dockerfile docker-compose.yml server.js package.json public opc@tu-ip:/home/opc/isketch/

# 4. Iniciar el servicio
cd ~/isketch
docker-compose up -d --build

# 5. Configurar firewall
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### Arquitectura

```
┌─────────────────────┐     WebSocket      ┌─────────────────────┐
│   GitHub Pages      │◄──────────────────►│   Oracle Cloud      │
│   (Frontend)        │    wss://          │   (Node.js Server)  │
└─────────────────────┘                    └─────────────────────┘
```
ISC
