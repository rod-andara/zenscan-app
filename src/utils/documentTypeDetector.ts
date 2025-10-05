/**
 * Document Type Detection
 * Detects document type from aspect ratio and size
 */

export type DocumentType =
  | 'letter'
  | 'a4'
  | 'receipt'
  | 'business_card'
  | 'id_card'
  | 'photo'
  | 'unknown';

export interface DocumentTypeResult {
  type: DocumentType;
  confidence: number; // 0-1
  displayName: string;
}

export interface DocumentCorners {
  topLeft: { x: number; y: number };
  topRight: { x: number; y: number };
  bottomRight: { x: number; y: number };
  bottomLeft: { x: number; y: number };
}

/**
 * Calculate distance between two points
 */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate aspect ratio from corners
 */
function calculateAspectRatio(corners: DocumentCorners): number {
  const width = (
    distance(corners.topLeft, corners.topRight) +
    distance(corners.bottomLeft, corners.bottomRight)
  ) / 2;

  const height = (
    distance(corners.topLeft, corners.bottomLeft) +
    distance(corners.topRight, corners.bottomRight)
  ) / 2;

  return width / height;
}

/**
 * Detect document type from corner positions
 */
export function detectDocumentType(corners: DocumentCorners): DocumentTypeResult {
  const aspectRatio = calculateAspectRatio(corners);

  // Letter/A4 paper (8.5x11 or 210x297mm)
  // Aspect ratio: ~1.29 (portrait) or ~0.77 (landscape)
  if (
    (aspectRatio >= 1.20 && aspectRatio <= 1.40) ||
    (aspectRatio >= 0.70 && aspectRatio <= 0.85)
  ) {
    return {
      type: 'letter',
      confidence: 0.9,
      displayName: 'Letter/A4',
    };
  }

  // Receipt (tall and narrow)
  // Aspect ratio: < 0.5
  if (aspectRatio < 0.5) {
    return {
      type: 'receipt',
      confidence: 0.85,
      displayName: 'Receipt',
    };
  }

  // Business card (3.5" x 2")
  // Aspect ratio: ~1.75 (landscape) or ~0.57 (portrait)
  if (
    (aspectRatio >= 1.65 && aspectRatio <= 1.85) ||
    (aspectRatio >= 0.54 && aspectRatio <= 0.60)
  ) {
    return {
      type: 'business_card',
      confidence: 0.8,
      displayName: 'Business Card',
    };
  }

  // ID Card / Credit Card (85.6mm x 53.98mm)
  // Aspect ratio: ~1.586
  if (aspectRatio >= 1.55 && aspectRatio <= 1.65) {
    return {
      type: 'id_card',
      confidence: 0.85,
      displayName: 'ID Card',
    };
  }

  // Photo (4" x 6" typical)
  // Aspect ratio: ~1.5
  if (aspectRatio >= 1.40 && aspectRatio <= 1.60) {
    return {
      type: 'photo',
      confidence: 0.7,
      displayName: 'Photo',
    };
  }

  // Unknown
  return {
    type: 'unknown',
    confidence: 0.5,
    displayName: 'Document',
  };
}

/**
 * Calculate document fill percentage in frame
 * Returns 0-1 representing how much of the frame the document occupies
 */
export function calculateFillPercentage(
  corners: DocumentCorners,
  frameWidth: number,
  frameHeight: number
): number {
  // Calculate document area using shoelace formula
  const area = Math.abs(
    (corners.topLeft.x * (corners.topRight.y - corners.bottomLeft.y) +
      corners.topRight.x * (corners.bottomRight.y - corners.topLeft.y) +
      corners.bottomRight.x * (corners.bottomLeft.y - corners.topRight.y) +
      corners.bottomLeft.x * (corners.topLeft.y - corners.bottomRight.y)) / 2
  );

  const frameArea = frameWidth * frameHeight;
  return Math.min(1, area / frameArea);
}

/**
 * Check if corners form a valid quadrilateral
 */
export function isValidQuadrilateral(corners: DocumentCorners): boolean {
  // Check that corners are ordered correctly (clockwise or counter-clockwise)
  // and that no sides intersect

  // Simple validation: check that it's reasonably rectangular
  const width1 = distance(corners.topLeft, corners.topRight);
  const width2 = distance(corners.bottomLeft, corners.bottomRight);
  const height1 = distance(corners.topLeft, corners.bottomLeft);
  const height2 = distance(corners.topRight, corners.bottomRight);

  // Widths and heights should be similar
  const widthRatio = Math.min(width1, width2) / Math.max(width1, width2);
  const heightRatio = Math.min(height1, height2) / Math.max(height1, height2);

  // At least 80% similarity
  return widthRatio > 0.8 && heightRatio > 0.8;
}
