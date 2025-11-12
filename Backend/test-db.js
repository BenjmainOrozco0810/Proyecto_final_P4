const mongoose = require('mongoose');

async function testConnection() {
    try {
        // USA TU CADENA REAL AQUÍ
        const connectionString = 'mongodb+srv://chat-app-user:gMM9DKypRhNVHjg9@cluster0.f0ekqmz.mongodb.net/chat-app?retryWrites=true&w=majority';
        
        await mongoose.connect(connectionString);
        console.log('✅ Conexión exitosa a MongoDB Atlas');
        
        // Crear un usuario de prueba
        const User = require('./models/User');
        const testUser = new User({
            username: 'usuario_prueba',
            password: 'password123'
        });
        
        await testUser.save();
        console.log('✅ Usuario de prueba creado exitosamente');
        
        // Verificar que se guardó
        const users = await User.find();
        console.log('📊 Usuarios en la base de datos:', users);
        
        process.exit(0);
    } catch (error) {
        console.log('❌ Error:', error.message);
        process.exit(1);
    }
}

testConnection();