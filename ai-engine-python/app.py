"""Folia AI Engine — Flask server for plant disease prediction.

Accepts leaf images via POST /predict, runs MobileNetV2 classification
(or visual fallback), and returns disease diagnosis with cure recommendations.
"""

import os
import tempfile
import logging
from datetime import datetime, timezone

from flask import Flask, request, jsonify
from flask_cors import CORS

from model.preprocess import preprocess_image
from model.classifier import PlantDiseaseClassifier
from cure_engine.recommender import get_recommendations

# ── Logging ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("folia-ai")

# ── Flask app ──
app = Flask(__name__)
CORS(app)

# ── Load classifier once at startup ──
classifier = PlantDiseaseClassifier()


@app.route("/health", methods=["GET"])
def health():
    """Health check endpoint."""
    return jsonify({
        "status": "ok",
        "model_loaded": not classifier.use_fallback,
        "mode": "model" if not classifier.use_fallback else "visual_fallback",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    })


@app.route("/predict", methods=["POST"])
def predict():
    """Accept a leaf image and return disease diagnosis + cure plan.

    Form fields:
        image       – the leaf photo (required)
        cropName    – e.g. "Tomato" (optional, improves accuracy)
        growthStage – "Seedling" | "Vegetative" | "Flowering" | "Mature" (optional, default "Mature")
    """
    # ── Validate input ──
    if "image" not in request.files:
        return jsonify({"success": False, "error": "No image file provided."}), 400

    image_file = request.files["image"]
    crop_name = request.form.get("cropName", "")
    growth_stage = request.form.get("growthStage", "Mature")

    # ── Save to temp file ──
    suffix = os.path.splitext(image_file.filename or "leaf.jpg")[1] or ".jpg"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=suffix)
    try:
        image_file.save(tmp.name)
        tmp.close()

        logger.info("Received image: %s | crop=%s | stage=%s", image_file.filename, crop_name, growth_stage)

        # ── Preprocess ──
        image_tensor = preprocess_image(tmp.name)

        # ── Classify ──
        prediction = classifier.predict(image_tensor, crop_name=crop_name or None, image_path=tmp.name)

        # ── Get cure recommendations ──
        cure = get_recommendations(
            disease_name=prediction["disease_name"],
            crop_name=crop_name or prediction.get("crop_from_class", ""),
            growth_stage=growth_stage,
        )

        # ── Determine final urgency (cure engine may escalate) ──
        final_urgency = cure.get("urgency", prediction["urgency"])
        contagious = cure.get("contagious", prediction["contagious"])

        response = {
            "success": True,
            "diseaseName": prediction["disease_name"],
            "scientificName": prediction["scientific_name"],
            "confidence": round(prediction["confidence"], 1),
            "urgency": final_urgency,
            "contagious": contagious,
            "summary": prediction["summary"],
            "cure": {
                "pesticide": cure["pesticide"],
                "organic": cure["organic"],
                "pruning": cure["pruning"],
                "watering": cure["watering"],
            },
            "metadata": {
                "cropName": crop_name or prediction.get("crop_from_class", "Unknown"),
                "growthStage": growth_stage,
                "analyzedAt": datetime.now(timezone.utc).isoformat(),
                "inferenceMode": "model" if not classifier.use_fallback else "visual_fallback",
            },
        }

        logger.info(
            "Prediction: %s (%.1f%%) | Urgency: %s | Mode: %s",
            prediction["disease_name"],
            prediction["confidence"],
            final_urgency,
            "model" if not classifier.use_fallback else "fallback",
        )

        return jsonify(response)

    except Exception as exc:
        logger.exception("Prediction failed: %s", exc)
        return jsonify({"success": False, "error": str(exc)}), 500

    finally:
        # Clean up temp file
        try:
            os.unlink(tmp.name)
        except OSError:
            pass


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    logger.info("Starting Folia AI Engine on port %d", port)
    app.run(host="0.0.0.0", port=port, debug=False)
