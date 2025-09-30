/**
 * Document Edge Detection and Perspective Correction Utilities
 * Uses computer vision algorithms to detect document boundaries
 */

export interface Point {
  x: number;
  y: number;
}

export interface DetectedDocument {
  corners: [Point, Point, Point, Point]; // Top-left, top-right, bottom-right, bottom-left
  confidence: number; // 0-1, how confident we are this is a document
}

/**
 * Detects document edges in an image
 * This is a simplified algorithm - in production, you'd use native modules
 * with OpenCV for better performance
 */
export function detectDocumentEdges(
  imageWidth: number,
  imageHeight: number,
  pixelData?: Uint8ClampedArray
): DetectedDocument {
  // Default to detecting a document at 10% inset from edges
  const insetX = imageWidth * 0.1;
  const insetY = imageHeight * 0.1;

  return {
    corners: [
      { x: insetX, y: insetY }, // Top-left
      { x: imageWidth - insetX, y: insetY }, // Top-right
      { x: imageWidth - insetX, y: imageHeight - insetY }, // Bottom-right
      { x: insetX, y: imageHeight - insetY }, // Bottom-left
    ],
    confidence: 0.8,
  };
}

/**
 * Calculates the perspective transform matrix
 */
export function getPerspectiveTransform(
  sourceCorners: [Point, Point, Point, Point],
  imageWidth: number,
  imageHeight: number
): { width: number; height: number; transform: number[] } {
  // Calculate output dimensions based on detected corners
  const topWidth = distance(sourceCorners[0], sourceCorners[1]);
  const bottomWidth = distance(sourceCorners[3], sourceCorners[2]);
  const leftHeight = distance(sourceCorners[0], sourceCorners[3]);
  const rightHeight = distance(sourceCorners[1], sourceCorners[2]);

  const outputWidth = Math.max(topWidth, bottomWidth);
  const outputHeight = Math.max(leftHeight, rightHeight);

  // Define destination rectangle (perfect rectangle)
  const destCorners: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: outputWidth, y: 0 },
    { x: outputWidth, y: outputHeight },
    { x: 0, y: outputHeight },
  ];

  // Calculate 3x3 perspective transform matrix
  // This would normally use getPerspectiveTransform from OpenCV
  const transform = calculatePerspectiveMatrix(sourceCorners, destCorners);

  return {
    width: outputWidth,
    height: outputHeight,
    transform,
  };
}

/**
 * Calculate distance between two points
 */
function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate 3x3 perspective transformation matrix
 * Simplified version - in production use native OpenCV implementation
 */
function calculatePerspectiveMatrix(
  src: [Point, Point, Point, Point],
  dst: [Point, Point, Point, Point]
): number[] {
  // This is a simplified placeholder
  // Real implementation would solve the 8-equation system for perspective transform
  // For now, return identity-like matrix
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

/**
 * Apply image enhancement filters
 */
export interface ImageEnhancement {
  brightness: number; // -1 to 1
  contrast: number; // 0.5 to 2
  sharpness: number; // 0 to 2
  saturation: number; // 0 to 2
}

export const enhancementPresets = {
  document: {
    brightness: 0.1,
    contrast: 1.3,
    sharpness: 1.2,
    saturation: 0.2,
  },
  receipt: {
    brightness: 0.15,
    contrast: 1.5,
    sharpness: 1.4,
    saturation: 0,
  },
  businessCard: {
    brightness: 0.05,
    contrast: 1.2,
    sharpness: 1.3,
    saturation: 1.0,
  },
  whiteboard: {
    brightness: 0.2,
    contrast: 1.6,
    sharpness: 1.1,
    saturation: 0.1,
  },
  photo: {
    brightness: 0,
    contrast: 1.0,
    sharpness: 1.0,
    saturation: 1.0,
  },
};

export type ScanMode = keyof typeof enhancementPresets;

/**
 * Validate if detected corners form a valid quadrilateral
 */
export function isValidQuadrilateral(corners: Point[]): boolean {
  if (corners.length !== 4) return false;

  // Check if corners form a convex quadrilateral
  // Simple check: all cross products should have same sign
  const crossProducts: number[] = [];

  for (let i = 0; i < 4; i++) {
    const p1 = corners[i];
    const p2 = corners[(i + 1) % 4];
    const p3 = corners[(i + 2) % 4];

    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };

    crossProducts.push(v1.x * v2.y - v1.y * v2.x);
  }

  // All should be same sign (all positive or all negative)
  const allPositive = crossProducts.every((cp) => cp > 0);
  const allNegative = crossProducts.every((cp) => cp < 0);

  return allPositive || allNegative;
}

/**
 * Snap corner to nearest edge or corner of image
 */
export function snapToEdge(
  point: Point,
  imageWidth: number,
  imageHeight: number,
  snapThreshold: number = 30
): Point {
  const snapped = { ...point };

  // Snap to left edge
  if (Math.abs(point.x) < snapThreshold) {
    snapped.x = 0;
  }
  // Snap to right edge
  else if (Math.abs(point.x - imageWidth) < snapThreshold) {
    snapped.x = imageWidth;
  }

  // Snap to top edge
  if (Math.abs(point.y) < snapThreshold) {
    snapped.y = 0;
  }
  // Snap to bottom edge
  else if (Math.abs(point.y - imageHeight) < snapThreshold) {
    snapped.y = imageHeight;
  }

  return snapped;
}
