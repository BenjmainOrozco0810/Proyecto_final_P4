// Simulación de autenticación - Para desarrollo
document.getElementById('login-form').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    // Validación simple
    if (username && password) {
        // Guardar usuario en localStorage
        localStorage.setItem('currentUser', username);
        
        // Redirigir al chat
        window.location.href = 'chat.html';
    } else {
        alert('Por favor ingresa usuario y contraseña');
    }
});