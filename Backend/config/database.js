const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const connectionString = process.env.MONGODB_URI || 'mongodb+srv://chat-app-user:gMM9DKypRhNVHjg9@cluster0.tucluster.mongodb.net/chat-app?retryWrites=true&w=majority';
        
        await mongoose.connect(connectionString, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        console.log('✅ Conectado a MongoDB Atlas exitosamente');
    } catch (error) {
        console.log('❌ Error conectando a MongoDB Atlas:', error.message);
    }
};

module.exports = connectDB;