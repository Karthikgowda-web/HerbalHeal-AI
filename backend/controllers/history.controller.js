const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

// Define History Schema inline to avoid modifying 'models/' directory
const historySchema = new mongoose.Schema({
  commonName: { type: String, required: true },
  scientificName: { type: String, required: true },
  remedies: { type: Object, required: true }, // Store language map
  timestamp: { type: Date, default: Date.now },
  imagePath: { type: String, required: false }
}, { collection: 'savedspecimens' });

// Use existing model if it somehow exists, otherwise create it
const History = mongoose.models.History || mongoose.model('History', historySchema);

// POST / - Auto-save history entry upon identification
router.post('/', async (req, res) => {
    try {
        const { commonName, scientificName, remedies, timestamp, imagePath } = req.body;
        
        if (!commonName) {
            return res.status(400).json({ message: 'Missing commonName' });
        }

        const newHistory = new History({
            commonName,
            scientificName: scientificName || 'Unknown',
            remedies: remedies || {},
            timestamp: timestamp || new Date(),
            imagePath: imagePath || ''
        });

        const savedHistory = await newHistory.save();
        res.status(201).json({ success: true, historyId: savedHistory._id, data: savedHistory });
    } catch (error) {
        console.error('Error auto-saving history:', error);
        res.status(500).json({ message: 'Server error while saving history', error: error.message });
    }
});

// GET / - Fetch all history entries
router.get('/', async (req, res) => {
    try {
        const history = await History.find().sort({ timestamp: -1 });
        res.json(history);
    } catch (error) {
        res.status(500).json({ message: 'Server error while fetching history', error: error.message });
    }
});

module.exports = router;
