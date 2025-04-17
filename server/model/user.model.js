// models/user.model.js
import mongoose from 'mongoose';

const FileSchema = new mongoose.Schema({
    filename: String,
    originalname: String,
    mimetype: String,
    path: String,
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    files: [FileSchema]
});

export default mongoose.model('User', UserSchema);
