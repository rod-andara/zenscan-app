/**
 * Edge Detection Utility
 *
 * Post-capture edge detection for document scanning
 * NO real-time processing, NO frame processors, NO worklets
 */

import { CropCorners, CornerPoint } from '../components/edit/TapCropOverlay';

export interface EdgeDetectionResult {
  corners: CropCorners;
  confidence: number; // 0-1
  method: 'auto' | 'default';
}

/**
 * Detect document edges in a captured image
 *
 * PHASE 1: Simple 10% inset default
 * PHASE 2: Can be upgraded with expo-image-manipulator or ML Kit
 *
 * @param imageUri - URI of the captured image
 * @param imageWidth - Width of the image
 * @param imageHeight - Height of the image
 * @returns Detected corners with confidence score
 */
export async function detectEdges(
  imageUri: string,
  imageWidth: number,
  imageHeight: number
): Promise<EdgeDetectionResult> {
  // PHASE 1: Simple default corners (10% inset from edges)
  // This provides a safe starting point for user adjustment
  const insetPercent = 0.05; // 5% inset

  const corners: CropCorners = {
    topLeft: {
      x: imageWidth * insetPercent,
      y: imageHeight * insetPercent,
    },
    topRight: {
      x: imageWidth * (1 - insetPercent),
      y: imageHeight * insetPercent,
    },
    bottomRight: {
      x: imageWidth * (1 - insetPercent),
      y: imageHeight * (1 - insetPercent),
    },
    bottomLeft: {
      x: imageWidth * insetPercent,
      y: imageHeight * (1 - insetPercent),
    },
  };

  return {
    corners,
    confidence: 0.5, // Low confidence since it's just a default
    method: 'default',
  };

  // TODO PHASE 2: Implement actual edge detection
  // Options:
  // 1. expo-image-manipulator for basic image processing
  // 2. @react-native-ml-kit/document-scanner (if available and stable)
  // 3. Custom algorithm using Canvas API
  //
  // Algorithm outline:
  // 1. Load image into canvas
  // 2. Convert to grayscale
  // 3. Apply Gaussian blur (reduce noise)
  // 4. Apply Canny edge detection
  // 5. Find contours
  // 6. Identify largest quadrilateral
  // 7. Return corners with high confidence (0.8+)
}

/**
 * Validate that corners form a proper quadrilateral
 *
 * Checks:
 * - All corners within image bounds
 * - Lines don't cross (proper convex shape)
 * - Minimum area threshold
 *
 * @param corners - Corner coordinates to validate
 * @param imageWidth - Image width
 * @param imageHeight - Image height
 * @returns True if corners are valid
 */
export function validateCorners(
  corners: CropCorners,
  imageWidth: number,
  imageHeight: number
): boolean {
  // Check all corners are within bounds
  const allPoints = [
    corners.topLeft,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft,
  ];

  for (const point of allPoints) {
    if (
      point.x < 0 ||
      point.x > imageWidth ||
      point.y < 0 ||
      point.y > imageHeight
    ) {
      return false;
    }
  }

  // Check lines don't cross (simple convexity check)
  // Top-left -> Top-right should have y1 ≈ y2
  // Top-right -> Bottom-right should have x1 ≈ x2
  // etc.

  // Calculate area using shoelace formula
  const area = calculatePolygonArea(corners);
  const imageArea = imageWidth * imageHeight;

  // Area should be at least 10% of image
  if (area < imageArea * 0.1) {
    return false;
  }

  return true;
}

/**
 * Calculate area of polygon defined by corners
 * Uses shoelace formula
 */
function calculatePolygonArea(corners: CropCorners): number {
  const points = [
    corners.topLeft,
    corners.topRight,
    corners.bottomRight,
    corners.bottomLeft,
  ];

  let area = 0;
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Order corners in standard format: TL, TR, BR, BL
 *
 * Takes unordered corner points and identifies which is which
 * based on position
 */
export function orderCorners(points: CornerPoint[]): CropCorners {
  if (points.length !== 4) {
    throw new Error('Exactly 4 corner points required');
  }

  // Sort by y-coordinate to separate top from bottom
  const sorted = [...points].sort((a, b) => a.y - b.y);

  const topPoints = sorted.slice(0, 2);
  const bottomPoints = sorted.slice(2, 4);

  // Sort top points by x-coordinate (left to right)
  topPoints.sort((a, b) => a.x - b.x);
  const topLeft = topPoints[0];
  const topRight = topPoints[1];

  // Sort bottom points by x-coordinate (left to right)
  bottomPoints.sort((a, b) => a.x - b.x);
  const bottomLeft = bottomPoints[0];
  const bottomRight = bottomPoints[1];

  return {
    topLeft,
    topRight,
    bottomRight,
    bottomLeft,
  };
}

/**
 * Calculate aspect ratio from corners
 *
 * Useful for detecting document type
 */
export function calculateAspectRatio(corners: CropCorners): number {
  const width =
    (distance(corners.topLeft, corners.topRight) +
      distance(corners.bottomLeft, corners.bottomRight)) /
    2;

  const height =
    (distance(corners.topLeft, corners.bottomLeft) +
      distance(corners.topRight, corners.bottomRight)) /
    2;

  return width / height;
}

/**
 * Calculate distance between two points
 */
function distance(p1: CornerPoint, p2: CornerPoint): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}
