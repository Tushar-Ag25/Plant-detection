const mongoose = require('mongoose');

const scanSchema = new mongoose.Schema({
  userId: {
    type: String,
    index: true,
  },
  cropName: {
    type: String,
    required: true,
  },
  fieldName: {
    type: String,
  },
  growthStage: {
    type: String,
    enum: ['Seedling', 'Vegetative', 'Flowering', 'Mature'],
  },
  diseaseName: {
    type: String,
  },
  scientificName: {
    type: String,
  },
  confidence: {
    type: Number,
  },
  urgency: {
    type: String,
  },
  contagious: {
    type: Boolean,
  },
  summary: {
    type: String,
  },
  imageUrl: {
    type: String,
  },
  cure: {
    pesticide: { type: String },
    organic: { type: String },
    pruning: { type: String },
    watering: { type: String },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Scan', scanSchema);
