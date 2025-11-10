// Conectar al servidor Socket.io
const socket = io();

// Elementos del DOM
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const usersList = document.getElementById('users-list');
const onlineCount = document.getElementById('online-count');
const currentUserElement = document.getElementById('current-user');
const typingIndicator = document.getElementById('typing-indicator');
const logoutBtn = document.getElementById('logout-btn');

// Variables de control
let typingTimer;

// Obtener usuario actual
const currentUser = localStorage.getItem('currentUser') || 'UsuarioAnónimo';
currentUserElement.textContent = currentUser;

// Notificar al servidor que el usuario se ha unido
socket.emit('user-login', { username: currentUser });

// Función para agregar mensaje al chat
function addMessage(messageData, isOwn = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <strong>${messageData.from}</strong> 
            <span>${messageData.timestamp}</span>
        </div>
        <div class="message-text">${messageData.text}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Función para actualizar lista de usuarios
function updateUsersList(users) {
    usersList.innerHTML = '';
    onlineCount.textContent = users.length;
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item user-online';
        userElement.textContent = `${user.username} 🟢`;
        usersList.appendChild(userElement);
    });
}

// Función para enviar mensaje - CORREGIDA
function sendMessage() {
    const messageText = messageInput.value.trim();
    
    if (messageText) {
        const messageData = {
            from: currentUser,
            to: 'all',
            text: messageText
        };
        
        // SOLO enviar al servidor - NO mostrar localmente
        socket.emit('send-message', messageData);
        messageInput.value = '';
        
        // Detener indicador de escritura
        clearTimeout(typingTimer);
        socket.emit('stop-typing');
    }
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

messageInput.addEventListener('input', () => {
    // Notificar que está escribiendo
    socket.emit('typing', { username: currentUser });
    
    // Limpiar timer anterior
    clearTimeout(typingTimer);
    
    // Configurar nuevo timer para detener indicador
    typingTimer = setTimeout(() => {
        socket.emit('stop-typing');
    }, 1000);
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('currentUser');
    window.location.href = '/';
});

// Socket Event Listeners
socket.on('new-message', (messageData) => {
    // SOLO agregar mensaje cuando llega del servidor
    const isOwnMessage = messageData.from === currentUser;
    addMessage(messageData, isOwnMessage);
});

socket.on('users-update', (users) => {
    updateUsersList(users);
});

socket.on('user-joined', (username) => {
    if (username !== currentUser) {
        const systemMessage = document.createElement('div');
        systemMessage.className = 'system-message';
        systemMessage.textContent = `🟢 ${username} se ha unido al chat`;
        messagesContainer.appendChild(systemMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});

socket.on('user-left', (username) => {
    if (username !== currentUser) {
        const systemMessage = document.createElement('div');
        systemMessage.className = 'system-message';
        systemMessage.textContent = `🔴 ${username} ha dejado el chat`;
        messagesContainer.appendChild(systemMessage);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
});

socket.on('user-typing', (data) => {
    if (data.username !== currentUser) {
        typingIndicator.style.display = 'block';
        typingIndicator.innerHTML = `<span>${data.username}</span> está escribiendo...`;
    }
});

socket.on('user-stop-typing', () => {
    typingIndicator.style.display = 'none';
});

// Inicializar
console.log('Chat inicializado para:', currentUser);