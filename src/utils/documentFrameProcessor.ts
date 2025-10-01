/**
 * Vision Camera Frame Processor for Real-time Document Detection
 * Uses Worklets to process frames on the native side
 */

import { Frame } from 'react-native-vision-camera';
import { Point } from './documentDetection';

export interface DetectedRectangle {
  corners: [Point, Point, Point, Point]; // Top-left, top-right, bottom-right, bottom-left
  confidence: number;
  timestamp: number;
}

/**
 * Detect rectangle in frame using native processing
 * This runs on the native worklet thread for performance
 */
export function detectRectangleInFrame(frame: Frame): DetectedRectangle | null {
  'worklet';

  const width = frame.width;
  const height = frame.height;

  // TODO: This will be replaced with native Vision API (iOS) or OpenCV/MLKit (Android)
  // For now, return a simple detection based on frame dimensions
  // In production, this should use:
  // - iOS: VNDetectRectanglesRequest from Vision framework
  // - Android: OpenCV findContours or MLKit document scanner

  // Simulate detection with 10% inset (placeholder)
  const insetX = width * 0.1;
  const insetY = height * 0.1;

  return {
    corners: [
      { x: insetX, y: insetY },
      { x: width - insetX, y: insetY },
      { x: width - insetX, y: height - insetY },
      { x: insetX, y: height - insetY },
    ],
    confidence: 0.8,
    timestamp: Date.now(),
  };
}

/**
 * Check if detected rectangle is stable (hasn't moved significantly)
 */
export function isRectangleStable(
  current: DetectedRectangle | null,
  previous: DetectedRectangle | null,
  threshold: number = 20
): boolean {
  'worklet';

  if (!current || !previous) return false;

  // Check if all corners are within threshold distance
  for (let i = 0; i < 4; i++) {
    const dx = current.corners[i].x - previous.corners[i].x;
    const dy = current.corners[i].y - previous.corners[i].y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > threshold) {
      return false;
    }
  }

  return true;
}

/**
 * Calculate area of quadrilateral using Shoelace formula
 */
export function calculateRectangleArea(corners: [Point, Point, Point, Point]): number {
  'worklet';

  let area = 0;
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    area += corners[i].x * corners[j].y;
    area -= corners[j].x * corners[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Check if rectangle is large enough to be a document
 */
export function isRectangleLargeEnough(
  corners: [Point, Point, Point, Point],
  frameWidth: number,
  frameHeight: number,
  minAreaRatio: number = 0.2
): boolean {
  'worklet';

  const area = calculateRectangleArea(corners);
  const frameArea = frameWidth * frameHeight;
  const areaRatio = area / frameArea;

  return areaRatio >= minAreaRatio;
}
