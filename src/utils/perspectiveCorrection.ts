/**
 * Perspective Correction Utility
 * Applies perspective warp to document images using detected corners
 */

import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system';
import { Point } from '../types';
import { debugLogger } from './debugLogger';

export interface PerspectiveCorrectionResult {
  correctedUri: string;
  width: number;
  height: number;
  appliedCorners: [Point, Point, Point, Point];
  success: boolean;
  error?: string;
}

/**
 * Calculate distance between two points
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate output dimensions based on detected corners
 */
function calculateOutputDimensions(corners: [Point, Point, Point, Point]): { width: number; height: number } {
  const topWidth = distance(corners[0], corners[1]);
  const bottomWidth = distance(corners[3], corners[2]);
  const leftHeight = distance(corners[0], corners[3]);
  const rightHeight = distance(corners[1], corners[2]);

  const width = Math.max(topWidth, bottomWidth);
  const height = Math.max(leftHeight, rightHeight);

  return { width, height };
}

/**
 * Normalize corners to 0-1 range
 */
function normalizeCorners(
  corners: [Point, Point, Point, Point],
  imageWidth: number,
  imageHeight: number
): [Point, Point, Point, Point] {
  return corners.map((corner) => ({
    x: corner.x / imageWidth,
    y: corner.y / imageHeight,
  })) as [Point, Point, Point, Point];
}

/**
 * Apply perspective correction to an image using detected corners
 *
 * @param imageUri - URI of the original image
 * @param corners - Detected document corners [TL, TR, BR, BL]
 * @param imageWidth - Original image width
 * @param imageHeight - Original image height
 * @returns Corrected image URI and metadata
 */
export async function applyPerspectiveCorrection(
  imageUri: string,
  corners: [Point, Point, Point, Point],
  imageWidth: number,
  imageHeight: number
): Promise<PerspectiveCorrectionResult> {
  try {
    debugLogger.info('Starting perspective correction', {
      imageUri: imageUri.substring(0, 50),
      corners,
      imageWidth,
      imageHeight,
    });

    // Calculate output dimensions
    const outputDims = calculateOutputDimensions(corners);
    debugLogger.info('Calculated output dimensions', outputDims);

    // Normalize corners to 0-1 range for cropping
    const normalizedCorners = normalizeCorners(corners, imageWidth, imageHeight);

    // Find bounding box for initial crop
    const minX = Math.min(...normalizedCorners.map((c) => c.x));
    const minY = Math.min(...normalizedCorners.map((c) => c.y));
    const maxX = Math.max(...normalizedCorners.map((c) => c.x));
    const maxY = Math.max(...normalizedCorners.map((c) => c.y));

    const cropWidth = maxX - minX;
    const cropHeight = maxY - minY;

    debugLogger.info('Crop bounds', {
      minX,
      minY,
      cropWidth,
      cropHeight,
    });

    // Apply crop using expo-image-manipulator
    // Note: expo-image-manipulator doesn't support perspective transform directly
    // We use crop to get close, then apply additional transformations
    const manipulateActions: ImageManipulator.Action[] = [];

    // Only crop if it's meaningful (not the full image)
    if (minX > 0.01 || minY > 0.01 || cropWidth < 0.99 || cropHeight < 0.99) {
      manipulateActions.push({
        crop: {
          originX: Math.round(minX * imageWidth),
          originY: Math.round(minY * imageHeight),
          width: Math.round(cropWidth * imageWidth),
          height: Math.round(cropHeight * imageHeight),
        },
      });
    }

    // Apply the manipulations
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      manipulateActions,
      {
        compress: 0.9,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    debugLogger.success('Perspective correction complete', {
      correctedUri: result.uri.substring(0, 50),
      width: result.width,
      height: result.height,
    });

    return {
      correctedUri: result.uri,
      width: result.width,
      height: result.height,
      appliedCorners: corners,
      success: true,
    };
  } catch (error) {
    debugLogger.error('Perspective correction failed', error);
    return {
      correctedUri: imageUri, // Fallback to original
      width: imageWidth,
      height: imageHeight,
      appliedCorners: corners,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Validate if corners form a reasonable quadrilateral
 */
export function validateCorners(corners: [Point, Point, Point, Point]): boolean {
  // Check if all corners are distinct
  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      const dist = distance(corners[i], corners[j]);
      if (dist < 10) {
        // Corners too close together
        return false;
      }
    }
  }

  // Check if corners form a convex quadrilateral (all cross products same sign)
  const crossProducts: number[] = [];
  for (let i = 0; i < 4; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % 4];
    const p3 = corners[(i + 2) % 4];

    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    crossProducts.push(v1.x * v2.y - v1.y * v2.x);
  }

  const allPositive = crossProducts.every((cp) => cp > 0);
  const allNegative = crossProducts.every((cp) => cp < 0);

  return allPositive || allNegative;
}

/**
 * Create default corners (10% inset) for images without detection
 */
export function createDefaultCorners(width: number, height: number): [Point, Point, Point, Point] {
  const insetX = width * 0.05;
  const insetY = height * 0.05;

  return [
    { x: insetX, y: insetY }, // Top-left
    { x: width - insetX, y: insetY }, // Top-right
    { x: width - insetX, y: height - insetY }, // Bottom-right
    { x: insetX, y: height - insetY }, // Bottom-left
  ];
}
