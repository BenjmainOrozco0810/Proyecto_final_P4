const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());

// Ruta básica de prueba
app.get('/', (req, res) => {
    res.json({ 
        message: 'Servidor del Chat App funcionando!',
        project: 'Proyecto Final - Programación IV',
        university: 'Universidad Panamericana'
    });
});

// Manejo de conexiones Socket.io
io.on('connection', (socket) => {
    console.log('Nuevo usuario conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });

    // Evento para mensajes de chat
    socket.on('send-message', (data) => {
        console.log('Mensaje recibido:', data);
        // Reenviar el mensaje a todos los clientes
        io.emit('new-message', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Servidor ejecutándose en puerto ${PORT}`);
    console.log(`Proyecto: Sistema de Chat en Tiempo Real`);
    console.log(`Universidad Panamericana - Programación IV`);
});