"""Image preprocessing pipeline for plant disease detection.

Handles image loading, resizing, normalization, and feature extraction
for the MobileNetV2 classifier and visual fallback analyzer.
"""

from typing import Dict

import numpy as np
from PIL import Image
import torch
from torchvision import transforms


# ImageNet normalization statistics
IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]

# Standard input size for MobileNetV2
INPUT_SIZE = 224

# Compose the preprocessing transform pipeline once at module level
_transform = transforms.Compose([
    transforms.Resize((INPUT_SIZE, INPUT_SIZE)),
    transforms.ToTensor(),
    transforms.Normalize(mean=IMAGENET_MEAN, std=IMAGENET_STD),
])


def preprocess_image(image_path: str) -> torch.Tensor:
    """Open an image file and preprocess it for MobileNetV2 inference.

    1. Opens the image with PIL and converts to RGB.
    2. Resizes to 224×224.
    3. Normalizes pixel values with ImageNet statistics.
    4. Returns a batched PyTorch tensor of shape (1, 3, 224, 224).

    Args:
        image_path: Absolute or relative path to the image file.

    Returns:
        A float32 tensor of shape (1, 3, 224, 224) ready for model inference.

    Raises:
        FileNotFoundError: If the image file does not exist.
        PIL.UnidentifiedImageError: If the file is not a valid image.
    """
    image = Image.open(image_path).convert("RGB")
    tensor = _transform(image)
    # Add batch dimension: (3, 224, 224) → (1, 3, 224, 224)
    return tensor.unsqueeze(0)


def extract_leaf_features(image_path: str) -> Dict[str, float]:
    """Extract color-based features from a leaf image for the visual fallback analyzer.

    Computes statistical summaries of the RGB channels that correlate with
    plant health indicators:
      - High green_ratio + low brown_ratio → healthy leaf
      - High brown_ratio → likely disease / necrosis
      - Low brightness + high std → complex lesion patterns

    Args:
        image_path: Absolute or relative path to the image file.

    Returns:
        A dictionary with the following float keys:
            mean_r, mean_g, mean_b   – per-channel mean (0-255 scale)
            green_ratio              – G channel contribution relative to total
            brown_ratio              – fraction of pixels where R > G and R > B
            std_r, std_g, std_b      – per-channel standard deviation
            brightness               – average pixel intensity across all channels
    """
    image = Image.open(image_path).convert("RGB")
    pixels = np.array(image, dtype=np.float64)

    # Per-channel statistics
    mean_r = float(np.mean(pixels[:, :, 0]))
    mean_g = float(np.mean(pixels[:, :, 1]))
    mean_b = float(np.mean(pixels[:, :, 2]))

    std_r = float(np.std(pixels[:, :, 0]))
    std_g = float(np.std(pixels[:, :, 1]))
    std_b = float(np.std(pixels[:, :, 2]))

    # Green ratio: how dominant the green channel is
    channel_sum = mean_r + mean_g + mean_b
    green_ratio = mean_g / channel_sum if channel_sum > 0 else 0.0

    # Brown ratio: fraction of pixels where R > G AND R > B (brownish / necrotic)
    r_channel = pixels[:, :, 0]
    g_channel = pixels[:, :, 1]
    b_channel = pixels[:, :, 2]
    brown_mask = (r_channel > g_channel) & (r_channel > b_channel)
    total_pixels = pixels.shape[0] * pixels.shape[1]
    brown_ratio = float(np.sum(brown_mask)) / total_pixels if total_pixels > 0 else 0.0

    # Overall brightness
    brightness = float(np.mean(pixels))

    return {
        "mean_r": round(mean_r, 2),
        "mean_g": round(mean_g, 2),
        "mean_b": round(mean_b, 2),
        "green_ratio": round(green_ratio, 4),
        "brown_ratio": round(brown_ratio, 4),
        "std_r": round(std_r, 2),
        "std_g": round(std_g, 2),
        "std_b": round(std_b, 2),
        "brightness": round(brightness, 2),
    }
