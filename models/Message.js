const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    from: {
        type: String,
        required: true,
        trim: true
    },
    to: {
        type: String,
        required: true,
        trim: true
    },
    text: {
        type: String,
        required: true,
        trim: true
    },
    timestamp: {
        type: String,
        default: () => new Date().toLocaleTimeString()
    },
    date: {
        type: String,
        default: () => new Date().toLocaleDateString()
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

messageSchema.index({ from: 1, to: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);