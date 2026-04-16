const mongoose = require('mongoose');

const PlantSchema = new mongoose.Schema({
  plant_id: { type: Number, required: true },
  name: { type: String, required: true },
  scientific_name: { type: String, required: true },
  overview: {
    en: { type: String, required: true },
    hi: { type: String, required: true },
    kn: { type: String, required: true }
  },
  remedies: {
    en: { type: String, required: true },
    hi: { type: String, required: true },
    kn: { type: String, required: true }
  },
  alternatives: {
    en: { type: [String], default: [] },
    hi: { type: [String], default: [] },
    kn: { type: [String], default: [] }
  },
  medicinalProperties: [String],
  warnings: String,
  imageUrl: String,
  isVerified: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Plant', PlantSchema);
