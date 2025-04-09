const socket = io();
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scale = 20;
let playerId = null;
let gameState = {};

// On connection init
socket.on('init', (data) => {
  playerId = data.id;
});

// Game state update from server
socket.on('gameState', (state) => {
  gameState = state;
});

// Draw everything
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw fruit
  if (gameState.fruit) {
    ctx.fillStyle = 'yellow';
    ctx.fillRect(gameState.fruit.x * scale, gameState.fruit.y * scale, scale, scale);
  }

  // Draw players
  for (const id in gameState.players) {
    const p = gameState.players[id];

    // Draw head
    ctx.fillStyle = id === playerId ? '#0f0' : '#f00';
    ctx.fillRect(p.x * scale, p.y * scale, scale, scale);

    // Draw tail
    ctx.fillStyle = id === playerId ? '#0a0' : '#800';
    for (const segment of p.tail) {
      ctx.fillRect(segment.x * scale, segment.y * scale, scale, scale);
    }
  }

  requestAnimationFrame(draw);
}

draw();

// Keyboard input
window.addEventListener('keydown', (e) => {
  const dir = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
  }[e.key];

  if (dir) socket.emit('move', dir);
});

// Optional: latency test
setInterval(() => {
  socket.emit('pingCheck', Date.now());
}, 1000);

socket.on('pongCheck', (sentTime) => {
  const ping = Date.now() - sentTime;
  console.log('Ping:', ping, 'ms');
});
