import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(join(__dirname, '../client')));

const boardSize = 20;
let players = {};
let fruit = {
  x: Math.floor(Math.random() * boardSize),
  y: Math.floor(Math.random() * boardSize),
};

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  players[socket.id] = {
    x: Math.floor(boardSize / 2),
    y: Math.floor(boardSize / 2),
    dir: 'right',
    tail: [],
  };

  socket.emit('init', { id: socket.id, ...players[socket.id] });

  socket.on('move', (dir) => {
    if (['up', 'down', 'left', 'right'].includes(dir)) {
      players[socket.id].dir = dir;
    }
  });

  socket.on('pingCheck', (timestamp) => {
    socket.emit('pongCheck', timestamp);
  });

  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    delete players[socket.id];
  });
});

setInterval(() => {
  for (const id in players) {
    const p = players[id];
    const prevX = p.x;
    const prevY = p.y;

    if (p.dir === 'up') p.y--;
    if (p.dir === 'down') p.y++;
    if (p.dir === 'left') p.x--;
    if (p.dir === 'right') p.x++;

    // Move tail
    if (p.tail.length) {
      p.tail.unshift({ x: prevX, y: prevY });
      p.tail.pop();
    }

    // Fruit collision
    if (p.x === fruit.x && p.y === fruit.y) {
      p.tail.unshift({ x: prevX, y: prevY }); // grow
      fruit = {
        x: Math.floor(Math.random() * boardSize),
        y: Math.floor(Math.random() * boardSize),
      };
    }

    // Wall collision
    if (p.x < 0 || p.x >= boardSize || p.y < 0 || p.y >= boardSize) {
      console.log(`Player hit wall: ${id}`);
      delete players[id];
      continue;
    }

    // Self collision
    for (let i = 0; i < p.tail.length; i++) {
      if (p.x === p.tail[i].x && p.y === p.tail[i].y) {
        console.log(`Player hit self: ${id}`);
        delete players[id];
        break;
      }
    }
  }

  io.emit('gameState', { players, fruit });

}, 1000 / 60); // 60 FPS

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
