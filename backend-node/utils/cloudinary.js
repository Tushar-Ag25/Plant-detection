const cloudinary = require('cloudinary').v2;
const path = require('path');

// Configure Cloudinary if env vars are set
const isConfigured =
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET;

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  console.log('[Cloudinary] Configured successfully.');
} else {
  console.warn('[Cloudinary] Not configured — uploads will use local file paths.');
}

/**
 * Upload an image file to Cloudinary's 'folia-scans' folder.
 * Falls back to returning the local file path if Cloudinary is not configured.
 *
 * @param {string} filePath - Absolute or relative path to the image file.
 * @returns {Promise<{ url: string, publicId: string | null }>}
 */
async function uploadImage(filePath) {
  if (!isConfigured) {
    return { url: filePath, publicId: null };
  }

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'folia-scans',
      resource_type: 'image',
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (err) {
    console.error('[Cloudinary] Upload failed:', err.message);
    // Fall back to local path on upload failure
    return { url: filePath, publicId: null };
  }
}

module.exports = { uploadImage };
