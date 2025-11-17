const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const User = require('./models/User');
const Message = require('./models/Message');

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
app.use(express.static(path.join(__dirname, 'frontend')));

// Conectar a MongoDB
const connectDB = async () => {
    try {
        const connectionString = process.env.MONGODB_URI || 'mongodb+srv://chat-app-user:gMM9DKypRhNVHjg9@cluster0.f0ekqmz.mongodb.net/chat-app?retryWrites=true&w=majority';
        
        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Conectado a MongoDB Atlas exitosamente');
        
        // Estadísticas
        const userCount = await User.countDocuments();
        const messageCount = await Message.countDocuments();
        console.log(`📊 Usuarios: ${userCount}, Mensajes: ${messageCount}`);
        
    } catch (error) {
        console.log('❌ Error conectando a MongoDB Atlas:', error.message);
    }
};

connectDB();

// Almacenamiento en memoria de usuarios conectados
let connectedUsers = [];

// Rutas
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/login.html'));
});

app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/chat.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/register.html'));
});

// Servir archivos estáticos
app.get('/css/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/css', req.params.filename));
});

app.get('/js/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend/js', req.params.filename));
});

// API Routes
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Usuario y contraseña requeridos' 
        });
    }
    
    try {
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ username: username });
        if (existingUser) {
            return res.json({ 
                success: false, 
                message: 'El usuario ya existe' 
            });
        }

        // Crear nuevo usuario
        const newUser = new User({
            username: username,
            password: password
        });

        await newUser.save();
        
        res.json({ 
            success: true, 
            message: 'Usuario registrado exitosamente',
            user: {
                username: newUser.username,
                id: newUser._id
            }
        });
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor' 
        });
    }
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Usuario y contraseña requeridos' 
        });
    }
    
    try {
        const user = await User.findOne({ 
            username: username, 
            password: password 
        });
        
        if (user) {
            // Actualizar último login
            user.lastLogin = new Date();
            await user.save();
            
            res.json({ 
                success: true, 
                user: {
                    username: user.username,
                    id: user._id
                }
            });
        } else {
            res.json({ 
                success: false, 
                message: 'Usuario o contraseña incorrectos' 
            });
        }
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error del servidor' 
        });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'Servidor funcionando ✅',
        project: 'ChatApp UP - Programación IV',
        users_online: connectedUsers.length,
        environment: process.env.NODE_ENV || 'development'
    });
});

// Socket.io
io.on('connection', (socket) => {
    console.log('🟢 Usuario conectado:', socket.id);

    socket.on('user-login', (userData) => {
        const user = {
            id: socket.id,
            username: userData.username,
            socketId: socket.id,
            status: 'online'
        };
        
        // Remover si ya existe y agregar nuevo
        connectedUsers = connectedUsers.filter(u => u.username !== userData.username);
        connectedUsers.push(user);
        
        console.log(`👤 Usuario ${userData.username} ha iniciado sesión`);
        
        // Unir al usuario a una sala con su nombre
        socket.join(userData.username);
        
        // Notificar a todos los usuarios
        io.emit('users-update', connectedUsers);
    });

    // Mensajes privados
    socket.on('send-private-message', async (messageData) => {
        try {
            console.log('📨 Mensaje privado:', {
                from: messageData.from,
                to: messageData.to,
                text: messageData.text
            });
            
            // Guardar en MongoDB
            const message = new Message({
                from: messageData.from,
                to: messageData.to,
                text: messageData.text,
                timestamp: new Date().toLocaleTimeString(),
                date: new Date().toLocaleDateString()
            });
            
            const savedMessage = await message.save();
            console.log('💾 Mensaje guardado en MongoDB');
            
            const messageResponse = {
                id: savedMessage._id,
                from: savedMessage.from,
                to: savedMessage.to,
                text: savedMessage.text,
                timestamp: savedMessage.timestamp,
                date: savedMessage.date
            };
            
            // Enviar al remitente (confirmación)
            socket.emit('new-private-message', messageResponse);
            
            // Enviar al destinatario
            socket.to(messageData.to).emit('new-private-message', messageResponse);
            
        } catch (error) {
            console.error('❌ Error guardando mensaje:', error);
            socket.emit('message-error', { 
                error: 'No se pudo guardar el mensaje' 
            });
        }
    });

    // Obtener historial de chat
    socket.on('get-chat-history', async (data) => {
        try {
            const { currentUser, otherUser } = data;
            
            const history = await Message.find({
                $or: [
                    { from: currentUser, to: otherUser },
                    { from: otherUser, to: currentUser }
                ]
            })
            .sort({ createdAt: 1 })
            .limit(100)
            .lean();
            
            const formattedHistory = history.map(msg => ({
                id: msg._id,
                from: msg.from,
                to: msg.to,
                text: msg.text,
                timestamp: msg.timestamp,
                date: msg.date
            }));
            
            socket.emit('chat-history', {
                withUser: otherUser,
                messages: formattedHistory
            });
            
        } catch (error) {
            console.error('❌ Error obteniendo historial:', error);
            socket.emit('chat-history', {
                withUser: data.otherUser,
                messages: []
            });
        }
    });

    socket.on('disconnect', () => {
        console.log('🔴 Usuario desconectado:', socket.id);
        
        const userIndex = connectedUsers.findIndex(user => user.socketId === socket.id);
        if (userIndex !== -1) {
            const disconnectedUser = connectedUsers[userIndex];
            connectedUsers.splice(userIndex, 1);
            
            io.emit('users-update', connectedUsers);
        }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log('🚀 SERVIDOR INICIADO CORRECTAMENTE');
    console.log('📍 Puerto:', PORT);
    console.log('🌐 URL: http://localhost:' + PORT);
    console.log('💬 Proyecto: Sistema de Chat en Tiempo Real');
    console.log('🎓 Universidad Panamericana - Programación IV');
    console.log('=========================================');
});