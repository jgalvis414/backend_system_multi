import express from 'express';
import 'dotenv/config';
import connect from './database/conn.js';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import User from './model/user.model.js';
import Post from './model/post.model.js';

const app = express();
app.use(express.json());
app.use(cors());

const port = process.env.PORT || 8080;

const JWT_SECRET = process.env.JWT_SECRET; 

// Configuración Multer para subir archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const userDir = `uploads/${req.userId}`;
        fs.mkdirSync(userDir, { recursive: true });
        cb(null, userDir);
    },
    filename: function (req, file, cb) {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});
const upload = multer({ storage });

// Middleware para verificar JWT
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: 'Token requerido' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.userId = decoded.id;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Token inválido' });
    }
};

//  Rutas
app.get('/', async (req, res) => {
    try {
        const data = await Post.find({});
        res.json(data);
    } catch (error) {
        res.status(408).json({ error });
    }
});

app.use('/uploads', express.static(path.resolve('uploads')));


app.post("/uploads", async (req, res) => {
    try {
        const newImage = await Post.create(req.body);
        await newImage.save();
        res.status(201).json({ msg: "New image uploaded...!" });
    } catch (error) {
        res.status(409).json({ message: error.message });
    }
});

//  Registro de usuario
app.post('/register', async (req, res) => {
    const { email, password } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Usuario ya registrado' });

    const hashed = await bcrypt.hash(password, 10);
    const user = new User({ email, password: hashed });
    await user.save();
    res.status(201).json({ message: 'Usuario registrado correctamente' });
});

//  Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Contraseña incorrecta' });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
});

//  Subir archivo
app.post('/upload', authenticate, upload.single('file'), async (req, res) => {
    const user = await User.findById(req.userId);
    user.files.push({
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        path: req.file.path
    });
    await user.save();
    res.status(200).json({ message: 'Archivo subido correctamente' });
});

//  Obtener archivos del usuario
app.get('/myfiles', authenticate, async (req, res) => {
    const user = await User.findById(req.userId);
    res.json(user.files);
});

//  Eliminar archivo del usuario
app.delete('/myfiles/:id', authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.userId);
        const fileId = req.params.id;
        const file = user.files.id(fileId);
        if (!file) return res.status(404).json({ message: "Archivo no encontrado" });

        // Eliminar archivo físico
        fs.unlinkSync(path.resolve(file.path));
        
        // Eliminar del arreglo de archivos del usuario
        file.remove();
        await user.save();

        res.status(200).json({ message: "Archivo eliminado correctamente" });
    } catch (error) {
        console.error("Error al eliminar archivo:", error);
        res.status(500).json({ message: "Error al eliminar archivo" });
    }
});

// Conexión a DB y arranque de servidor
connect().then(() => {
    app.listen(port, () => {
        console.log(`Server running on http://localhost:${port}`);
    });
}).catch((error) => {
    console.error("Error al conectar con la base de datos", error);
});
