// Conectar al servidor Socket.io
const socket = io({
    transports: ['websocket', 'polling']
});

// Elementos del DOM
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const usersList = document.getElementById('users-list');
const onlineCount = document.getElementById('online-count');
const currentUserElement = document.getElementById('current-user');
const activeChatTitle = document.getElementById('active-chat-title');
const activeChatStatus = document.getElementById('active-chat-status');
const typingIndicator = document.getElementById('typing-indicator');
const logoutBtn = document.getElementById('logout-btn');
const searchInput = document.getElementById('search-users');

// Variables de estado
let currentUser = localStorage.getItem('currentUser') || 'UsuarioAnónimo';
let selectedUser = null;
let typingTimer;
let allUsers = [];

// Inicializar
currentUserElement.textContent = currentUser;

// Notificar al servidor que el usuario se ha unido
socket.emit('user-login', { username: currentUser });

// Función para actualizar lista de usuarios
function updateUsersList(users) {
    allUsers = users.filter(user => user.username !== currentUser);
    usersList.innerHTML = '';
    onlineCount.textContent = allUsers.length;
    
    if (allUsers.length === 0) {
        usersList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-users"></i>
                <p>No hay otros usuarios conectados</p>
            </div>
        `;
        return;
    }
    
    allUsers.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = `user-item ${selectedUser === user.username ? 'selected' : ''}`;
        userElement.innerHTML = `
            <div class="user-item-avatar">
                <i class="fas fa-user"></i>
            </div>
            <div class="user-item-info">
                <div class="user-item-name">${user.username}</div>
                <div class="user-item-status">🟢 En línea</div>
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
        if (item.querySelector('.user-item-name').textContent === username) {
            item.classList.add('selected');
        }
    });
    
    // Actualizar header del chat
    activeChatTitle.textContent = username;
    activeChatStatus.textContent = 'En línea - Chateando';
    
    // Limpiar mensajes actuales
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
    messageInput.disabled = false;
    messageInput.placeholder = `Escribe un mensaje para ${selectedUser}...`;
    sendBtn.disabled = false;
    messageInput.focus();
}

// Función para agregar mensaje al chat
function addMessage(messageData, isOwn = false) {
    // Remover mensaje de bienvenida si existe
    const welcomeMessage = messagesContainer.querySelector('.welcome-message');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    // Remover system message de carga
    const systemMessage = messagesContainer.querySelector('.system-message');
    if (systemMessage && systemMessage.textContent.includes('Cargando')) {
        systemMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    const timestamp = new Date().toLocaleTimeString('es-ES', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <strong>${messageData.from}</strong>
            <span>${messageData.timestamp || timestamp}</span>
        </div>
        <div class="message-text">${messageData.text}</div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Función para enviar mensaje
function sendMessage() {
    if (!selectedUser) {
        showNotification('⚠️ Selecciona un usuario para chatear', 'warning');
        return;
    }
    
    const messageText = messageInput.value.trim();
    
    if (messageText) {
        const messageData = {
            from: currentUser,
            to: selectedUser,
            text: messageText
        };
        
        // Animación de envío
        sendBtn.style.background = '#10b981';
        sendBtn.innerHTML = '<i class="fas fa-check"></i>';
        
        socket.emit('send-private-message', messageData);
        messageInput.value = '';
        
        setTimeout(() => {
            sendBtn.style.background = '';
            sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
        }, 1000);
        
        clearTimeout(typingTimer);
    }
}

// Función para mostrar notificaciones
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : type === 'warning' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animación de entrada
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remover después de 4 segundos
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => notification.remove(), 300);
    }, 4000);
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

messageInput.addEventListener('input', () => {
    if (selectedUser) {
        // Notificar que está escribiendo
        socket.emit('typing', { 
            username: currentUser, 
            to: selectedUser 
        });
        
        // Limpiar timer anterior
        clearTimeout(typingTimer);
        
        // Configurar nuevo timer para detener indicador
        typingTimer = setTimeout(() => {
            socket.emit('stop-typing', { to: selectedUser });
        }, 1000);
    }
});

logoutBtn.addEventListener('click', () => {
    if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
        localStorage.removeItem('currentUser');
        window.location.href = '/';
    }
});

searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const userItems = document.querySelectorAll('.user-item');
    
    userItems.forEach(item => {
        const userName = item.querySelector('.user-item-name').textContent.toLowerCase();
        if (userName.includes(searchTerm)) {
            item.style.display = 'flex';
        } else {
            item.style.display = 'none';
        }
    });
});

// Socket Event Listeners
socket.on('users-update', (users) => {
    updateUsersList(users);
});

socket.on('new-private-message', (messageData) => {
    // Solo mostrar si el mensaje es para la conversación actual
    if ((messageData.to === currentUser && messageData.from === selectedUser) ||
        (messageData.from === currentUser && messageData.to === selectedUser)) {
        
        const isOwn = messageData.from === currentUser;
        addMessage(messageData, isOwn);
        
        // Notificación para mensajes nuevos (si no está en foco)
        if (!isOwn && document.hidden) {
            showNotification(`Nuevo mensaje de ${messageData.from}`, 'info');
        }
    }
});

socket.on('chat-history', (data) => {
    if (data.withUser === selectedUser) {
        messagesContainer.innerHTML = '';
        
        if (data.messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="system-message">
                    💬 Inicia la conversación con ${selectedUser}
                </div>
            `;
        } else {
            data.messages.forEach(message => {
                const isOwn = message.from === currentUser;
                addMessage(message, isOwn);
            });
        }
    }
});

socket.on('user-typing', (data) => {
    if (data.to === currentUser && data.username === selectedUser) {
        typingIndicator.style.display = 'flex';
        typingIndicator.innerHTML = `
            <div class="typing-dots">
                <span></span>
                <span></span>
                <span></span>
            </div>
            <span>${data.username} está escribiendo...</span>
        `;
    }
});

socket.on('user-stop-typing', (data) => {
    if (data.to === currentUser && data.username === selectedUser) {
        typingIndicator.style.display = 'none';
    }
});

socket.on('user-joined', (username) => {
    if (username !== currentUser) {
        showNotification(`🟢 ${username} se ha conectado`, 'info');
    }
});

socket.on('user-left', (username) => {
    if (username !== currentUser) {
        showNotification(`🔴 ${username} se ha desconectado`, 'warning');
    }
});

socket.on('message-error', (data) => {
    showNotification(`❌ ${data.error}`, 'error');
});

// Verificar autenticación al cargar
if (!currentUser || currentUser === 'UsuarioAnónimo') {
    showNotification('❌ Debes iniciar sesión primero', 'error');
    setTimeout(() => {
        window.location.href = '/';
    }, 2000);
}

// Notificación de conexión exitosa
showNotification('✅ Conectado al chat exitosamente', 'info');

// Estilos para notificaciones (agregar al CSS)
const notificationStyles = document.createElement('style');
notificationStyles.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: white;
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        border-left: 4px solid #667eea;
        transform: translateX(400px);
        opacity: 0;
        transition: all 0.3s ease;
        z-index: 10000;
        max-width: 300px;
    }
    
    .notification.show {
        transform: translateX(0);
        opacity: 1;
    }
    
    .notification.error {
        border-left-color: #ef4444;
        background: #fef2f2;
    }
    
    .notification.warning {
        border-left-color: #f59e0b;
        background: #fffbeb;
    }
    
    .notification.info {
        border-left-color: #667eea;
        background: #f0f4ff;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 0.9rem;
        font-weight: 500;
    }
    
    .notification-content i {
        font-size: 1.1rem;
    }
    
    .notification.error i { color: #ef4444; }
    .notification.warning i { color: #f59e0b; }
    .notification.info i { color: #667eea; }
`;
document.head.appendChild(notificationStyles);

console.log('💬 Chat profesional inicializado para:', currentUser);