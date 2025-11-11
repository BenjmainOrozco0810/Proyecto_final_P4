const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // PEGA AQUÍ TU CADENA REAL DE MONGODB ATLAS
        const connectionString = 'mongodb+srv://chat-app-user:gMM9DKypRhNVHjg9@cluster0.f0ekqmz.mongodb.net/?appName=Cluster0';
        
        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        console.log('✅ Conectado a MongoDB Atlas exitosamente');
        console.log('📍 Base de datos: chat-app');
        console.log('👤 Usuario: chat-app-user');
    } catch (error) {
        console.log('❌ Error conectando a MongoDB Atlas:', error.message);
        console.log('🔄 Usando almacenamiento local como respaldo...');
    }
};

module.exports = connectDB;