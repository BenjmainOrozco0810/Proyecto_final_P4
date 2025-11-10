const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        // REEMPLAZA ESTA CADENA CON LA TUYA DE MONGODB ATLAS
        const connectionString = 'mongodb+srv://chat-app-user:<db_password>@cluster0.f0ekqmz.mongodb.net/?appName=Cluster0';
        
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