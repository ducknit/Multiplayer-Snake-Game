import  dotenv from 'dotenv';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 4000;

app.use(express.static('../client'));

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('move',(data) => {
        socket.broadcast.emit('playermoved', data);
    });

    socket.on('disconnect', () => {
      console.log('A user disconnected:', socket.id);  
    });
});

app.get('/', (req, res) => {
    res.send('Server is running! No frontend yet.');
});


server.listen(PORT,  () => {
  console.log(`Server running on http://localhost:${PORT}`);
});