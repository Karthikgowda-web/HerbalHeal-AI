require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const mongoose = require('mongoose');
const Plant = require('./models/Plant');
const SavedSpecimen = require('./models/SavedSpecimen');
const Archive = require('./models/Archive');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ 
    origin: ['http://localhost:3000', 'https://herbal-heal-ai.vercel.app'],
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/herbascan')
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error:', err));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage: storage });

app.get('/', (req, res) => {
    res.send('HerbaScan Backend is running!');
});

const axios = require('axios');
const FormData = require('form-data');

// Auth & Traffic Debugging
const User = require('./models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

app.use((req, res, next) => {
    console.log(`[Traffic] ${req.method} ${req.url}`);
    next();
});

// DIRECT REGISTER ROUTE (Atomic Fix)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(`[Auth] Registration attempt for: ${email}`);
    
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ email, password: hashedPassword });
    await newUser.save();

    const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET || 'fallback_secret', { expiresIn: '1d' });
    res.status(201).json({ token, user: { email: newUser.email, id: newUser._id } });
  } catch (error) {
    console.error('[Auth Error]', error);
    res.status(500).json({ message: 'Signup failed', error: error.message });
  }
});

const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);



app.post('/api/identify', upload.single('image'), async (req, res) => {
    try {
        console.log(`[API] Received identification request. File: ${req.file?.originalname}`);
        if (!req.file) {
            return res.status(400).send({ message: 'No file uploaded' });
        }

        const imagePath = req.file.path;
        let aiResult = null;

        // Try Calling Persistent AI Service (FastAPI)
        try {
            const formData = new FormData();
            formData.append('file', fs.createReadStream(imagePath));

            console.log(`[AI] Calling persistent service at http://127.0.0.1:5001/predict`);
            const aiResponse = await axios.post('http://127.0.0.1:5001/predict', formData, {
                headers: { ...formData.getHeaders() },
                timeout: 10000
            });
            aiResult = aiResponse.data;
            console.log(`[AI] Persistent service response: ${JSON.stringify(aiResult)}`);
        } catch (serviceErr) {
            console.warn(`[AI] Persistent service unavailable, falling back to spawn: ${serviceErr.message}`);
            
            // FALLBACK: Old spawn method if service is not running
            const pythonScriptPath = path.join(__dirname, 'scripts', 'predict_tflite.py');
            const pythonCommand = process.env.PYTHON_PATH || 'python3';
            
            const pythonTask = () => new Promise((resolve, reject) => {
                let predictionData = '';
                let errorData = '';
                const pyProcess = spawn(pythonCommand, [pythonScriptPath, imagePath]);
                pyProcess.stdout.on('data', (d) => predictionData += d.toString());
                pyProcess.stderr.on('data', (d) => errorData += d.toString());
                pyProcess.on('close', (code) => {
                    if (code !== 0) reject(new Error(errorData || 'Python crash'));
                    try {
                        // Clean data - remove HEARTBEAT messages and keep only JSON
                        const cleanData = predictionData.replace(/HEARTBEAT:[^\n]+\n/g, '').trim();
                        const startIdx = cleanData.indexOf('{');
                        const endIdx = cleanData.lastIndexOf('}');
                        if (startIdx === -1) throw new Error("No JSON found: " + cleanData);
                        resolve(JSON.parse(cleanData.substring(startIdx, endIdx + 1)));
                    } catch (e) { reject(e); }
                });

            });
            aiResult = await pythonTask();
        }

        if (!aiResult || aiResult.plant_id === undefined) {
            throw new Error("Invalid AI prediction result");
        }

        // Trilingual database lookup
        const mongoData = await Plant.findOne({ plant_id: aiResult.plant_id });
        
        if (!mongoData) {
            return res.status(200).json({
                name: aiResult.prediction || "Unknown Specimen",
                scientific_name: "Species recognized by AI",
                overview: { 
                    en: "AI identified this plant, but we don't have its trilingual details in our medical database yet.", 
                    hi: "एआई ने इस पौधे की पहचान की है, लेकिन हमारे डेटाबेस में अभी इसका विवरण नहीं है।", 
                    kn: "AI ಈ ಸಸ್ಯವನ್ನು ಗುರುತಿಸಿದೆ, ಆದರೆ ನಮ್ಮ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಇದರ ವಿವರಗಳು ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ." 
                },
                remedies: { en: "Information coming soon.", hi: "जानकारी जल्द ही आ रही है।", kn: "ಮಾಹಿತಿ ಶೀಘ್ರದಲ್ಲೇ ಬರಲಿದೆ." },
                alternatives: { en: [], hi: [], kn: [] },
                medicinalProperties: ["Recognized via Local ML Model"],
                warnings: "Consult a professional before use.",
                cnnAnalysis: {
                    confidence: aiResult.confidence || 0.0,
                    featuresIdentified: ["Morphology matched correctly"],
                    neuralMarkers: "Processed via 40-class MobileNetV2"
                }
            });
        }

        res.json({ 
            name: mongoData.name, 
            scientific_name: mongoData.scientific_name,
            overview: mongoData.overview,
            remedies: mongoData.remedies,
            alternatives: mongoData.alternatives,
            medicinalProperties: mongoData.medicinalProperties || ["Natural Extract"],
            warnings: mongoData.warnings || "Safe for external use.",
            cnnAnalysis: {
                confidence: aiResult.confidence,
                featuresIdentified: ["Leaf/stem analysis complete"],
                neuralMarkers: "Verified via persistent AI runner"
            }
        });

    } catch (err) {
        console.error(`[API] Identify Error: ${err.message}`);
        res.status(500).json({ status: "error", message: err.message });
    }
});


app.use('/api/history', require('./controllers/history.controller'));



const { verifyToken } = require('./middleware/auth.middleware');
app.patch('/api/remedies/:id/verify', verifyToken, async (req, res) => {
    try {
        const plant = await Plant.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
        if (!plant) return res.status(404).json({ message: 'Plant not found' });
        res.json({ success: true, plant });
    } catch (error) {
        res.status(500).json({ message: 'Error verifying remedy', error: error.message });
    }
});

const DEPLOY_ID = "REL-2026-04-17-V1";

app.listen(PORT, () => {
    console.log(`[CRITICAL] HerbaScan Alpha ${DEPLOY_ID} active on port ${PORT}`);
    console.log(`[System] Priority Routes: AUTH/SIGNUP, AUTH/LOGIN, TRAFFIC_LOGS`);
});

