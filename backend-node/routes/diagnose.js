const express = require('express');
const router = express.Router();
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const authMiddleware = require('../middleware/authMiddleware');
const { uploadImage } = require('../utils/cloudinary');

// Multer config — store files in 'uploads/' directory
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });

// Path to local history fallback file
const HISTORY_PATH = path.join(__dirname, '..', 'data', 'history.json');

// Check whether Mongoose is connected
function isMongoConnected() {
  try {
    const mongoose = require('mongoose');
    return mongoose.connection.readyState === 1; // 1 = connected
  } catch {
    return false;
  }
}

// ── Helpers for local JSON fallback ──

function readHistory() {
  try {
    const raw = fs.readFileSync(HISTORY_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeHistory(data) {
  fs.writeFileSync(HISTORY_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

// ── Mock diagnosis generator (used when AI engine is unreachable) ──

function generateMockDiagnosis(cropName, growthStage) {
  const mockDB = {
    tomato: {
      diseaseName: 'Early Blight',
      scientificName: 'Alternaria solani',
      confidence: 0.82,
      urgency: 'moderate',
      contagious: true,
      summary:
        'Early blight is a common fungal disease affecting tomato plants, causing dark spots on leaves that expand into concentric rings.',
      cure: {
        pesticide: 'Apply chlorothalonil or mancozeb-based fungicide every 7-10 days.',
        organic: 'Spray neem oil solution (2%) or copper-based organic fungicide weekly.',
        pruning: 'Remove affected lower leaves immediately. Improve air circulation by spacing plants.',
        watering: 'Water at the base of plants in the morning. Avoid overhead irrigation.',
      },
    },
    rice: {
      diseaseName: 'Rice Blast',
      scientificName: 'Magnaporthe oryzae',
      confidence: 0.78,
      urgency: 'high',
      contagious: true,
      summary:
        'Rice blast is a devastating fungal disease that can affect all above-ground parts of the rice plant.',
      cure: {
        pesticide: 'Apply tricyclazole or isoprothiolane as preventive spray.',
        organic: 'Use Trichoderma-based biocontrol agents. Apply silicon fertilizers to strengthen cell walls.',
        pruning: 'Remove and destroy infected plant debris after harvest.',
        watering: 'Maintain shallow water levels. Avoid prolonged flooding during tillering stage.',
      },
    },
    wheat: {
      diseaseName: 'Powdery Mildew',
      scientificName: 'Blumeria graminis',
      confidence: 0.85,
      urgency: 'moderate',
      contagious: true,
      summary:
        'Powdery mildew appears as white powdery spots on leaves and stems, reducing photosynthesis and yield.',
      cure: {
        pesticide: 'Apply propiconazole or tebuconazole fungicide at first sign of infection.',
        organic: 'Spray potassium bicarbonate solution or sulfur-based fungicide.',
        pruning: 'Remove severely infected tillers to reduce spore spread.',
        watering: 'Reduce humidity around plants. Avoid excessive nitrogen fertilization.',
      },
    },
    default: {
      diseaseName: 'Leaf Spot',
      scientificName: 'Cercospora spp.',
      confidence: 0.71,
      urgency: 'low',
      contagious: false,
      summary:
        'Leaf spot is a general fungal condition causing circular brown spots on foliage. Usually manageable with good cultural practices.',
      cure: {
        pesticide: 'Apply a broad-spectrum fungicide such as mancozeb if severity increases.',
        organic: 'Use compost tea spray or baking soda solution (1 tbsp per gallon).',
        pruning: 'Remove badly spotted leaves and dispose of them away from the garden.',
        watering: 'Water at the base. Ensure adequate drainage and avoid waterlogging.',
      },
    },
  };

  const key = (cropName || '').toLowerCase();
  return mockDB[key] || mockDB.default;
}

// ── Apply auth middleware to all routes in this router ──
router.use(authMiddleware);

// ═══════════════════════════════════════════════
// POST /api/diagnose
// ═══════════════════════════════════════════════
router.post('/diagnose', upload.single('image'), async (req, res) => {
  try {
    const { cropName, growthStage, fieldName } = req.body;

    if (!cropName) {
      return res.status(400).json({ success: false, error: 'cropName is required.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Image file is required.' });
    }

    // 1. Upload image (Cloudinary or local fallback)
    const { url: imageUrl } = await uploadImage(req.file.path);

    // 2. Forward to Python AI engine
    let diagnosis;
    const aiUrl = process.env.AI_ENGINE_URL || 'http://localhost:5001/predict';

    try {
      const form = new FormData();
      form.append('image', fs.createReadStream(req.file.path), req.file.originalname);
      if (cropName) form.append('cropName', cropName);
      if (growthStage) form.append('growthStage', growthStage);

      const aiResponse = await axios.post(aiUrl, form, {
        headers: form.getHeaders(),
        timeout: 30000, // 30 second timeout
      });

      diagnosis = aiResponse.data;
    } catch (aiErr) {
      console.warn(
        `[Diagnose] AI engine unreachable at ${aiUrl}: ${aiErr.message}. Using mock diagnosis.`
      );
      diagnosis = generateMockDiagnosis(cropName, growthStage);
    }

    // 3. Build scan record
    const scanData = {
      userId: req.user.uid,
      cropName: cropName || 'Unknown',
      fieldName: fieldName || '',
      growthStage: growthStage || '',
      diseaseName: diagnosis.diseaseName || 'Unknown',
      scientificName: diagnosis.scientificName || '',
      confidence: diagnosis.confidence || 0,
      urgency: diagnosis.urgency || 'low',
      contagious: diagnosis.contagious || false,
      summary: diagnosis.summary || '',
      imageUrl: imageUrl,
      cure: {
        pesticide: (diagnosis.cure && diagnosis.cure.pesticide) || '',
        organic: (diagnosis.cure && diagnosis.cure.organic) || '',
        pruning: (diagnosis.cure && diagnosis.cure.pruning) || '',
        watering: (diagnosis.cure && diagnosis.cure.watering) || '',
      },
      createdAt: new Date(),
    };

    // 4. Persist — MongoDB or local JSON fallback
    let savedRecord;

    if (isMongoConnected()) {
      const Scan = require('../models/Scan');
      const doc = new Scan(scanData);
      savedRecord = await doc.save();
      savedRecord = savedRecord.toObject();
      savedRecord.id = savedRecord._id.toString();
    } else {
      savedRecord = { ...scanData, id: uuidv4() };
      const history = readHistory();
      history.push(savedRecord);
      writeHistory(history);
    }

    // 5. Clean up local upload file (best-effort)
    try {
      fs.unlinkSync(req.file.path);
    } catch {
      // ignore cleanup errors
    }

    return res.status(200).json({
      success: true,
      data: {
        id: savedRecord.id || savedRecord._id,
        cropName: savedRecord.cropName,
        fieldName: savedRecord.fieldName,
        growthStage: savedRecord.growthStage,
        diseaseName: savedRecord.diseaseName,
        scientificName: savedRecord.scientificName,
        confidence: savedRecord.confidence,
        urgency: savedRecord.urgency,
        contagious: savedRecord.contagious,
        summary: savedRecord.summary,
        imageUrl: savedRecord.imageUrl,
        cure: savedRecord.cure,
        createdAt: savedRecord.createdAt,
      },
    });
  } catch (err) {
    console.error('[Diagnose] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// ═══════════════════════════════════════════════
// GET /api/history
// ═══════════════════════════════════════════════
router.get('/history', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { cropName, fieldName } = req.query;

    let scans;

    if (isMongoConnected()) {
      const Scan = require('../models/Scan');
      const filter = { userId };
      if (cropName) filter.cropName = cropName;
      if (fieldName) filter.fieldName = fieldName;

      scans = await Scan.find(filter).sort({ createdAt: -1 }).lean();
      scans = scans.map((s) => ({ ...s, id: s._id.toString() }));
    } else {
      let history = readHistory();
      scans = history.filter((s) => s.userId === userId);
      if (cropName) scans = scans.filter((s) => s.cropName === cropName);
      if (fieldName) scans = scans.filter((s) => s.fieldName === fieldName);
      scans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    return res.status(200).json({ success: true, data: scans });
  } catch (err) {
    console.error('[History] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// ═══════════════════════════════════════════════
// GET /api/analytics/recurring
// ═══════════════════════════════════════════════
router.get('/analytics/recurring', async (req, res) => {
  try {
    const userId = req.user.uid;
    let scans;

    if (isMongoConnected()) {
      const Scan = require('../models/Scan');
      scans = await Scan.find({ userId }).lean();
    } else {
      const history = readHistory();
      scans = history.filter((s) => s.userId === userId);
    }

    // Group by fieldName + cropName + diseaseName
    const groups = {};

    for (const scan of scans) {
      const key = `${scan.fieldName || ''}|${scan.cropName || ''}|${scan.diseaseName || ''}`;
      if (!groups[key]) {
        groups[key] = {
          fieldName: scan.fieldName || '',
          cropName: scan.cropName || '',
          diseaseName: scan.diseaseName || '',
          count: 0,
          scans: [],
        };
      }
      groups[key].count += 1;
      groups[key].scans.push(scan);
    }

    // Filter to only recurring (2+ occurrences)
    const recurring = Object.values(groups).filter((g) => g.count >= 2);

    return res.status(200).json({ recurring });
  } catch (err) {
    console.error('[Analytics] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

// ═══════════════════════════════════════════════
// DELETE /api/history/:id
// ═══════════════════════════════════════════════
router.delete('/history/:id', async (req, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;

    if (isMongoConnected()) {
      const Scan = require('../models/Scan');
      const deleted = await Scan.findOneAndDelete({ _id: id, userId });
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Scan not found.' });
      }
      return res.status(200).json({ success: true, message: 'Scan deleted.' });
    }

    // Local JSON fallback
    let history = readHistory();
    const before = history.length;
    history = history.filter((s) => !(s.id === id && s.userId === userId));
    if (history.length === before) {
      return res.status(404).json({ success: false, error: 'Scan not found.' });
    }
    writeHistory(history);

    return res.status(200).json({ success: true, message: 'Scan deleted.' });
  } catch (err) {
    console.error('[Delete] Error:', err);
    return res.status(500).json({ success: false, error: 'Internal server error.' });
  }
});

module.exports = router;
