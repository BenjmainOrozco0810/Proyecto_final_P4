// Conectar al servidor Socket.io
const socket = io();

// Variables de estado
let currentUser = localStorage.getItem('currentUser') || 'UsuarioAnónimo';
let selectedUser = null;

// Inicializar
document.getElementById('current-user').textContent = currentUser;

// Notificar al servidor que el usuario se ha unido
socket.emit('user-login', { username: currentUser });

// Función para actualizar lista de usuarios
function updateUsersList(users) {
    const usersList = document.getElementById('users-list');
    const onlineCount = document.getElementById('online-count');
    
    usersList.innerHTML = '';
    const otherUsers = users.filter(user => user.username !== currentUser);
    onlineCount.textContent = otherUsers.length;
    
    if (otherUsers.length === 0) {
        usersList.innerHTML = '<div class="no-users">No hay otros usuarios conectados</div>';
        return;
    }
    
    otherUsers.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = `user-item ${selectedUser === user.username ? 'selected' : ''}`;
        userElement.innerHTML = `
            <div class="user-avatar">👤</div>
            <div class="user-info">
                <div class="user-name">${user.username}</div>
                <div class="user-status">🟢 En línea</div>
            </div>
        `;
        
        userElement.addEventListener('click', () => {
            selectUser(user.username);
        });
        
        usersList.appendChild(userElement);
    });
}

// Función para seleccionar un usuario para chatear
function selectUser(username) {
    selectedUser = username;
    
    // Actualizar UI de usuarios
    document.querySelectorAll('.user-item').forEach(item => {
        item.classList.remove('selected');
    });
    
    // Agregar selected al usuario clickeado
    const userItems = document.querySelectorAll('.user-item');
    userItems.forEach(item => {
        if (item.querySelector('.user-name').textContent === username) {
            item.classList.add('selected');
        }
    });
    
    // Actualizar título del chat
    const chatHeader = document.querySelector('.chat-area .chat-header h3');
    if (chatHeader) {
        chatHeader.textContent = `Chat con ${username}`;
    }
    
    // Limpiar mensajes actuales
    const messagesContainer = document.getElementById('messages-container');
    messagesContainer.innerHTML = '<div class="system-message">Cargando conversación...</div>';
    
    // Habilitar input
    enableChatInput();
    
    // Solicitar historial del chat
    socket.emit('get-chat-history', {
        currentUser: currentUser,
        otherUser: username
    });
}

// Función para habilitar el input de mensaje
function enableChatInput() {
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    
    messageInput.disabled = false;
    messageInput.placeholder = `Escribe un mensaje para ${selectedUser}...`;
    sendBtn.disabled = false;
    messageInput.focus();
}

// Función para agregar mensaje al chat
function addMessage(messageData, isOwn = false) {
    const messagesContainer = document.getElementById('messages-container');
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <strong>${messageData.from}</strong> 
            <span>${messageData.timestamp}</span>
        </div>
        <div class="message-text">${messageData.text}</div>
    `;
    
    // Si es el primer mensaje (system message), reemplazarlo
    const systemMessage = messagesContainer.querySelector('.system-message');
    if (systemMessage) {
        systemMessage.remove();
    }
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Función para enviar mensaje
function sendMessage() {
    if (!selectedUser) {
        alert('⚠️ Selecciona un usuario para chatear');
        return;
    }
    
    const messageInput = document.getElementById('message-input');
    const messageText = messageInput.value.trim();
    
    if (messageText) {
        const messageData = {
            from: currentUser,
            to: selectedUser,
            text: messageText
        };
        
        socket.emit('send-private-message', messageData);
        messageInput.value = '';
        messageInput.focus();
    }
}

// Configurar event listeners una sola vez
function setupEventListeners() {
    const sendBtn = document.getElementById('send-btn');
    const messageInput = document.getElementById('message-input');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Event listener para enviar mensaje
    sendBtn.addEventListener('click', sendMessage);
    
    // Event listener para Enter en el input
    messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });
    
    // Event listener para logout
    logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    });
}

// Socket Event Listeners
socket.on('users-update', (users) => {
    updateUsersList(users);
});

socket.on('new-private-message', (messageData) => {
    console.log('📨 Mensaje privado recibido:', messageData);
    
    // Solo mostrar si el mensaje es para la conversación actual
    if ((messageData.to === currentUser && messageData.from === selectedUser) ||
        (messageData.from === currentUser && messageData.to === selectedUser)) {
        
        const isOwn = messageData.from === currentUser;
        addMessage(messageData, isOwn);
    }
});

socket.on('chat-history', (data) => {
    console.log('📜 Historial recibido para:', data.withUser);
    
    if (data.withUser === selectedUser) {
        const messagesContainer = document.getElementById('messages-container');
        messagesContainer.innerHTML = '';
        
        if (data.messages.length === 0) {
            messagesContainer.innerHTML = '<div class="system-message">Inicia la conversación con ' + selectedUser + '</div>';
        } else {
            data.messages.forEach(message => {
                const isOwn = message.from === currentUser;
                addMessage(message, isOwn);
            });
        }
    }
});

// Inicializar cuando la página cargue
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación
    if (!currentUser || currentUser === 'UsuarioAnónimo') {
        alert('❌ Debes iniciar sesión primero');
        window.location.href = '/';
        return;
    }
    
    // Configurar event listeners
    setupEventListeners();
    
    console.log('Chat inicializado para:', currentUser);
});