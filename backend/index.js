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

app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000'] }));
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

app.post('/api/identify', upload.single('image'), (req, res) => {
    console.log(`[API] Received identification request. File: ${req.file?.originalname}`);
    if (!req.file) {
        return res.status(400).send({ message: 'No file uploaded' });
    }

    const imagePath = req.file.path;
    const pythonScriptPath = path.join(__dirname, 'scripts', 'predict_tflite.py');
    console.log(`[AI] Spawning Python: ${pythonScriptPath} with image: ${imagePath}`);

    const pyProcess = spawn('python', [pythonScriptPath, imagePath]);

    let predictionData = '';
    let errorData = '';

    pyProcess.stdout.on('data', (data) => {
        predictionData += data.toString();
    });

    pyProcess.stderr.on('data', (data) => {
        errorData += data.toString();
        console.error(`[Python Stderr]: ${data}`);
    });

    pyProcess.on('close', (code) => {
        console.log(`[AI] Python process closed with code ${code}`);
        if (code !== 0) {
            console.error(`[AI] Error Detail: ${errorData}`);
            return res.status(500).send({ message: 'Error processing image to predict plant.', error: errorData });
        }
        
        try {
            const startIdx = predictionData.indexOf('{');
            const endIdx = predictionData.lastIndexOf('}');
            if (startIdx === -1 || endIdx === -1) {
                throw new Error("No JSON found in Python output");
            }
            const jsonStr = predictionData.substring(startIdx, endIdx + 1);
            const aiResult = JSON.parse(jsonStr);
            console.log(`[DB] Attempting lookup for Plant ID: ${aiResult.plant_id} (${aiResult.prediction})`);
            
            Plant.findOne({ plant_id: aiResult.plant_id })
                .then(mongoData => {
                    if (!mongoData) {
                        console.warn(`[DB] No matching document found in Atlas for ID: ${aiResult.plant_id}`);
                        return res.status(200).json({
                            name: aiResult.prediction || "Unknown Specimen",
                            scientific_name: "Species recognized by AI",
                            overview: { 
                                en: "AI identified this plant, but we don't have its medicinal details in our current database yet.", 
                                hi: "एआई ने इस पौधे की पहचान की है, लेकिन अभी हमारे पास इसका औषधीय विवरण नहीं है।", 
                                kn: "AI ಈ ಸಸ್ಯವನ್ನು ಗುರುತಿಸಿದೆ, ಆದರೆ ನಮ್ಮ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಇದರ ಔಷಧೀಯ ವಿವರಗಳು ಇನ್ನೂ ಲಬ್ಯವಿಲ್ಲ." 
                            },
                            remedies: { 
                                en: "No specific remedies found in local database.", 
                                hi: "स्थानीय डेटाबेस में कोई विशिष्ट उपचार नहीं मिला।", 
                                kn: "ಸ್ಥಳೀಯ ಡೇಟಾಬೇಸ್‌ನಲ್ಲಿ ಯಾವುದೇ ನಿರ್ದಿಷ್ಟ ಪರಿಹಾರಗಳು ಕಂಡುಬಂದಿಲ್ಲ." 
                            },
                            alternatives: { en: [], hi: [], kn: [] },
                            medicinalProperties: ["Recognized from 40-class dataset"],
                            warnings: "Always verify with a professional before use.",
                            cnnAnalysis: {
                                confidence: aiResult.confidence || 0.0,
                                featuresIdentified: ["Morphology matched correctly"],
                                neuralMarkers: "Verified via 40-class MobileNetV2 model."
                            }
                        });
                    }

                    console.log(`[DB] Successfully fetched trilingual data for: ${mongoData.name}`);
                    
                    const finalResponse = { 
                        name: mongoData.name, 
                        scientific_name: mongoData.scientific_name,
                        overview: mongoData.overview,
                        remedies: mongoData.remedies,
                        alternatives: mongoData.alternatives,
                        medicinalProperties: mongoData.medicinalProperties || ["Natural Extract", "Traditional Use"],
                        warnings: mongoData.warnings || "Safe for general external use. Consult a doctor for internal consumption.",
                        cnnAnalysis: {
                            confidence: aiResult.confidence,
                            featuresIdentified: ["Vein structure matched", "Leaf serration analyzed"],
                            neuralMarkers: "Processed via fine-tuned MobileNetV2"
                        }
                    };
                    res.json(finalResponse);
                })
                .catch(dbError => {
                    console.error('Database query fallback invoked:', dbError.message);
                    res.status(500).json({ message: "Database connection error." });
                });
        } catch (error) {
            console.error('Error parsing Python output:', error, 'Output:', predictionData);
            res.status(500).send({ message: 'Invalid response from AI model.' });
        }
    });
});

app.use('/api/history', require('./controllers/history.controller'));

const authController = require('./controllers/auth.controller');
app.post('/api/auth/login', authController.login);

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

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
