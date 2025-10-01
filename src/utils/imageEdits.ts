/**
 * Image Edits Utilities
 * Default values and presets for image editing
 */

import { ImageEdits, CropCorner, Point } from '../types';

/**
 * Create default image edits
 */
export function createDefaultEdits(corners?: [Point, Point, Point, Point]): ImageEdits {
  // Default crop corners (5% inset)
  const defaultCropCorners: [CropCorner, CropCorner, CropCorner, CropCorner] = [
    { x: 0.05, y: 0.05 }, // Top-left
    { x: 0.95, y: 0.05 }, // Top-right
    { x: 0.95, y: 0.95 }, // Bottom-right
    { x: 0.05, y: 0.95 }, // Bottom-left
  ];

  return {
    rotation: 0,
    brightness: 0,
    contrast: 1,
    saturation: 1,
    sharpness: 1,
    cropCorners: defaultCropCorners,
    preset: 'none',
  };
}

/**
 * Edit presets for different document types
 */
export const EDIT_PRESETS: Record<'none' | 'blackAndWhite' | 'grayscale' | 'enhance', Partial<ImageEdits>> = {
  none: {
    brightness: 0,
    contrast: 1,
    saturation: 1,
    sharpness: 1,
    preset: 'none',
  },
  blackAndWhite: {
    brightness: 0.1,
    contrast: 1.5,
    saturation: 0,
    sharpness: 1.2,
    preset: 'blackAndWhite',
  },
  grayscale: {
    brightness: 0,
    contrast: 1.2,
    saturation: 0,
    sharpness: 1,
    preset: 'grayscale',
  },
  enhance: {
    brightness: 0.1,
    contrast: 1.3,
    saturation: 1.1,
    sharpness: 1.2,
    preset: 'enhance',
  },
};

/**
 * Apply a preset to existing edits
 */
export function applyPreset(
  currentEdits: ImageEdits,
  preset: 'none' | 'blackAndWhite' | 'grayscale' | 'enhance'
): ImageEdits {
  return {
    ...currentEdits,
    ...EDIT_PRESETS[preset],
  };
}

/**
 * Check if edits have been modified from defaults
 */
export function hasModifiedEdits(edits: ImageEdits): boolean {
  const defaults = createDefaultEdits();

  return (
    edits.rotation !== defaults.rotation ||
    edits.brightness !== defaults.brightness ||
    edits.contrast !== defaults.contrast ||
    edits.saturation !== defaults.saturation ||
    edits.sharpness !== defaults.sharpness ||
    edits.preset !== 'none'
  );
}
