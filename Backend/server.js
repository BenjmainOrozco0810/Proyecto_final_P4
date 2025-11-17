const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/database'); // ← SOLO UNA IMPORTACIÓN
const User = require('./models/User');
require('dotenv').config();

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
app.use(express.static(path.join(__dirname, '../frontend')));
// Middleware para verificar autenticación en rutas protegidas
const requireAuth = (req, res, next) => {
    // En una aplicación real usaríamos sessions o JWT
    // Por ahora, permitimos el acceso pero verificamos en el frontend
    next();
};

// Aplicar a rutas protegidas
app.get('/chat', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/chat.html'));
});

// Conectar a la base de datos (SOLO UNA VEZ)
connectDB();

// Almacenamiento en memoria como respaldo
let usersInMemory = [];
let messagesInMemory = [];

// Función para registrar usuario
const registerUser = async (userData) => {
    try {
        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({ username: userData.username });
        if (existingUser) {
            return { success: false, message: 'El usuario ya existe' };
        }

        // Crear nuevo usuario
        const newUser = new User({
            username: userData.username,
            password: userData.password // En un proyecto real, esto debería estar encriptado
        });

        await newUser.save();
        return { success: true, message: 'Usuario registrado exitosamente', user: newUser };
    } catch (error) {
        console.log('Error en registro MongoDB:', error);
        // Respaldo en memoria
        const existingUser = usersInMemory.find(u => u.username === userData.username);
        if (existingUser) {
            return { success: false, message: 'El usuario ya existe' };
        }
        
        usersInMemory.push({
            id: Date.now().toString(),
            username: userData.username,
            password: userData.password
        });
        
        return { success: true, message: 'Usuario registrado (modo respaldo)' };
    }
};

// Función para login - VERSIÓN CORREGIDA (sin modo respaldo)
const loginUser = async (userData) => {
    try {
        console.log('🔐 Intentando login para:', userData.username);
        
        const user = await User.findOne({ 
            username: userData.username, 
            password: userData.password 
        });
        
        if (user) {
            // Actualizar último login
            user.lastLogin = new Date();
            await user.save();
            
            console.log('✅ Login exitoso para:', userData.username);
            return { 
                success: true, 
                user: {
                    username: user.username,
                    id: user._id
                } 
            };
        } else {
            console.log('❌ Login fallido para:', userData.username);
            return { 
                success: false, 
                message: 'Usuario o contraseña incorrectos' 
            };
        }
    } catch (error) {
        console.log('❌ Error en login MongoDB:', error);
        return { 
            success: false, 
            message: 'Error del servidor. Intenta más tarde.' 
        };
    }
};
// Ruta para registro de usuarios
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ success: false, message: 'Usuario y contraseña requeridos' });
    }
    
    const result = await registerUser({ username, password });
    res.json(result);
});

// Ruta para login
// Ruta para login - MEJORADA
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    console.log('📨 Solicitud de login recibida:', { username });
    
    if (!username || !password) {
        return res.status(400).json({ 
            success: false, 
            message: 'Usuario y contraseña requeridos' 
        });
    }
    
    try {
        const result = await loginUser({ username, password });
        res.json(result);
    } catch (error) {
        console.error('💥 Error en endpoint login:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error interno del servidor' 
        });
    }
});

// Ruta principal - Login
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});7
// Ruta para página de registro
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/register.html'));
});

// Ruta del chat
app.get('/chat', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/chat.html'));
});

// Servir archivos CSS y JS
app.get('/css/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/css', req.params.filename));
});

app.get('/js/:filename', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/js', req.params.filename));
});

// API de prueba
app.get('/api/status', (req, res) => {
    res.json({ 
        status: 'Servidor funcionando ✅',
        project: 'ChatApp UP - Programación IV',
        timestamp: new Date().toISOString()
    });
});

// Almacenamiento de usuarios conectados y mensajes
let connectedUsers = [];
let privateMessages = [];

// Manejo de conexiones Socket.io
io.on('connection', (socket) => {
    console.log('🟢 Nueva conexión:', socket.id);

    // Evento cuando un usuario se logea
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
        
        console.log(`👤 Usuario conectado: ${userData.username}`);
        
        // Unir al usuario a una sala con su nombre de usuario
        socket.join(userData.username);
        
        // Notificar a todos los usuarios
        io.emit('users-update', connectedUsers);
    });

    // Evento para mensajes PRIVADOS
    socket.on('send-private-message', (messageData) => {
        console.log('📨 Mensaje privado:', {
            from: messageData.from,
            to: messageData.to,
            text: messageData.text
        });
        
        const message = {
            id: Date.now(),
            from: messageData.from,
            to: messageData.to,
            text: messageData.text,
            timestamp: new Date().toLocaleTimeString(),
            date: new Date().toLocaleDateString()
        };
        
        // Guardar mensaje
        privateMessages.push(message);
        
        // Enviar mensaje al REMITENTE (para confirmación)
        socket.emit('new-private-message', message);
        
        // Enviar mensaje al DESTINATARIO (si está conectado)
        socket.to(messageData.to).emit('new-private-message', message);
        
        console.log(`✅ Mensaje enviado de ${messageData.from} a ${messageData.to}`);
    });

    // Evento para obtener historial de chat con un usuario
    socket.on('get-chat-history', (data) => {
        const { currentUser, otherUser } = data;
        
        const history = privateMessages.filter(msg => 
            (msg.from === currentUser && msg.to === otherUser) ||
            (msg.from === otherUser && msg.to === currentUser)
        ).sort((a, b) => a.id - b.id); // Ordenar por timestamp
        
        socket.emit('chat-history', {
            withUser: otherUser,
            messages: history
        });
    });

    socket.on('disconnect', () => {
        console.log('🔴 Desconexión:', socket.id);
        
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
    console.log('SERVIDOR INICIADO CORRECTAMENTE');
    console.log('Puerto:', PORT);
    console.log('URL: http://localhost:' + PORT);
    console.log('Proyecto: Sistema de Chat en Tiempo Real');
    console.log('Universidad Panamericana - Programación IV');
    console.log('=========================================');
});