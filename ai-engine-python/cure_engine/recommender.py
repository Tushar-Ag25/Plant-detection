"""Cure recommendation engine for Folia Plant Disease Detection.

Loads the diseases knowledge base and returns stage-aware treatment
recommendations across four pillars: Pesticide, Organic, Pruning, Watering.
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict

logger = logging.getLogger(__name__)

# ── Load diseases knowledge base ──
_DB_PATH = os.path.join(os.path.dirname(__file__), "diseases_db.json")
_diseases_cache: list | None = None


def _load_db() -> list:
    """Load and cache the diseases knowledge base."""
    global _diseases_cache
    if _diseases_cache is None:
        with open(_DB_PATH, "r", encoding="utf-8") as f:
            data = json.load(f)
        _diseases_cache = data.get("diseases", [])
        logger.info("Loaded %d disease entries from knowledge base.", len(_diseases_cache))
    return _diseases_cache


def _find_disease(disease_name: str, crop_name: str = "") -> Dict[str, Any] | None:
    """Find a disease entry by name, with optional crop filtering."""
    diseases = _load_db()
    disease_lower = disease_name.lower().strip()

    # Direct name match
    for entry in diseases:
        if entry["name"].lower() == disease_lower:
            return entry

    # Partial / fuzzy match
    for entry in diseases:
        entry_name = entry["name"].lower()
        if disease_lower in entry_name or entry_name in disease_lower:
            return entry

    # Try matching by scientific name
    for entry in diseases:
        if entry.get("scientific", "").lower() == disease_lower:
            return entry

    # Match by crop + "healthy" if disease indicates healthy
    if "healthy" in disease_lower:
        for entry in diseases:
            if entry["name"].lower() == "healthy":
                return entry

    return None


def _map_stage(growth_stage: str) -> str:
    """Map growth stage to seedling/mature cure key.

    Seedling, Vegetative → "seedling"
    Flowering, Mature     → "mature"
    """
    stage_lower = growth_stage.lower().strip()
    if stage_lower in ("seedling", "vegetative"):
        return "seedling"
    return "mature"


def get_recommendations(
    disease_name: str,
    crop_name: str = "",
    growth_stage: str = "Mature",
) -> Dict[str, Any]:
    """Get stage-aware cure recommendations for a detected disease.

    Args:
        disease_name: The detected disease name (e.g. "Early Blight").
        crop_name: The crop being diagnosed (e.g. "Tomato").
        growth_stage: One of "Seedling", "Vegetative", "Flowering", "Mature".

    Returns:
        Dict with keys: pesticide, organic, pruning, watering, urgency,
        contagious, contagiousAlert
    """
    entry = _find_disease(disease_name, crop_name)

    if entry is None:
        logger.warning(
            "Disease '%s' not found in knowledge base. Returning generic recommendation.",
            disease_name,
        )
        return {
            "pesticide": "Disease not in database. Consult your local agricultural extension office for specific fungicide/pesticide recommendations.",
            "organic": "Apply a broad-spectrum organic fungicide (neem oil 5 ml/L or copper hydroxide). Remove visibly affected leaves and improve air circulation.",
            "pruning": "Remove affected leaves with clean, disinfected shears. Cut 2 cm below visible damage. Bag and dispose of removed material.",
            "watering": "Water at soil level in the morning. Avoid overhead irrigation. Improve drainage and air circulation around the plant.",
            "urgency": "Moderate Action",
            "contagious": False,
            "contagiousAlert": False,
        }

    stage_key = _map_stage(growth_stage)
    cure = entry.get("cure", {})

    # Extract stage-specific recommendations
    pesticide = cure.get("pesticide", {}).get(stage_key, cure.get("pesticide", {}).get("mature", "Consult agricultural extension."))
    organic = cure.get("organic", {}).get(stage_key, cure.get("organic", {}).get("mature", "Apply neem oil 5 ml/L weekly."))
    pruning = cure.get("pruning", {}).get(stage_key, cure.get("pruning", {}).get("mature", "Remove affected leaves with clean shears."))
    watering = cure.get("watering", {}).get(stage_key, cure.get("watering", {}).get("mature", "Water at soil level. Avoid overhead irrigation."))

    # Determine urgency
    urgency_base = entry.get("urgency_base", "Moderate Action")
    contagious = entry.get("contagious", False)

    # Escalate urgency if contagious + seedling
    if contagious and stage_key == "seedling":
        urgency = "Immediate Action"
    else:
        urgency = urgency_base

    # Set contagious alert for severe spreading diseases
    contagious_alert = contagious and urgency in ("Immediate Action", "Immediate Action Needed")

    return {
        "pesticide": pesticide,
        "organic": organic,
        "pruning": pruning,
        "watering": watering,
        "urgency": urgency,
        "contagious": contagious,
        "contagiousAlert": contagious_alert,
    }
