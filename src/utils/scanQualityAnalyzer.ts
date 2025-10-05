/**
 * Scan Quality Analysis
 * Calculates quality score (0-100) for document scans
 */

import { DocumentCorners } from './documentTypeDetector';
import { calculateFillPercentage, isValidQuadrilateral } from './documentTypeDetector';

export interface QualityScore {
  overall: number; // 0-100
  fillScore: number; // 0-100
  stabilityScore: number; // 0-100
  sharpnessScore: number; // 0-100
  confidenceScore: number; // 0-100
  level: 'poor' | 'fair' | 'good'; // Based on overall score
  color: string; // Visual indicator color
  recommendation: string; // User guidance
}

interface CornerHistory {
  corners: DocumentCorners;
  timestamp: number;
}

const OPTIMAL_FILL_MIN = 0.60; // 60% of frame
const OPTIMAL_FILL_MAX = 0.90; // 90% of frame
const STABILITY_WINDOW_MS = 500; // Track corners for 500ms
const STABILITY_THRESHOLD_PX = 10; // Max movement in pixels

/**
 * Calculate fill percentage score
 * Optimal range: 60-90% of frame
 */
function calculateFillScore(fillPercentage: number): number {
  if (fillPercentage < OPTIMAL_FILL_MIN) {
    // Too small - score based on how close to minimum
    return Math.max(0, (fillPercentage / OPTIMAL_FILL_MIN) * 70);
  } else if (fillPercentage > OPTIMAL_FILL_MAX) {
    // Too large - score based on how close to maximum
    const overflow = fillPercentage - OPTIMAL_FILL_MAX;
    return Math.max(40, 100 - (overflow / 0.10) * 60);
  } else {
    // In optimal range - full score
    return 100;
  }
}

/**
 * Calculate stability score from corner history
 * Returns 100 if corners stable for 500ms within 10px threshold
 */
function calculateStabilityScore(
  currentCorners: DocumentCorners,
  history: CornerHistory[]
): number {
  if (history.length === 0) {
    return 0; // No history yet
  }

  const now = Date.now();
  const recentHistory = history.filter(
    (h) => now - h.timestamp <= STABILITY_WINDOW_MS
  );

  if (recentHistory.length < 5) {
    // Need at least 5 samples in window for stability
    return (recentHistory.length / 5) * 50;
  }

  // Calculate max movement across all corners
  let maxMovement = 0;
  recentHistory.forEach((h) => {
    const movements = [
      distance(currentCorners.topLeft, h.corners.topLeft),
      distance(currentCorners.topRight, h.corners.topRight),
      distance(currentCorners.bottomRight, h.corners.bottomRight),
      distance(currentCorners.bottomLeft, h.corners.bottomLeft),
    ];
    maxMovement = Math.max(maxMovement, ...movements);
  });

  if (maxMovement <= STABILITY_THRESHOLD_PX) {
    return 100; // Perfectly stable
  } else if (maxMovement <= STABILITY_THRESHOLD_PX * 2) {
    return 70; // Mostly stable
  } else if (maxMovement <= STABILITY_THRESHOLD_PX * 3) {
    return 40; // Somewhat stable
  } else {
    return 20; // Unstable
  }
}

/**
 * Calculate distance between two points
 */
function distance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Estimate sharpness score
 * Uses corner angle consistency as proxy for sharpness
 * (Simple heuristic - real edge detection would require pixel access)
 */
function calculateSharpnessScore(corners: DocumentCorners): number {
  // Check if corners form ~90 degree angles (rectangular document)
  const angles = calculateCornerAngles(corners);

  // Calculate deviation from 90 degrees
  const deviations = angles.map((angle) => Math.abs(angle - 90));
  const avgDeviation = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;

  if (avgDeviation < 5) {
    return 100; // Sharp, clear corners
  } else if (avgDeviation < 10) {
    return 80; // Good corners
  } else if (avgDeviation < 20) {
    return 60; // Fair corners
  } else {
    return 40; // Blurry or distorted
  }
}

/**
 * Calculate angles at each corner
 */
function calculateCornerAngles(corners: DocumentCorners): number[] {
  return [
    calculateAngle(corners.bottomLeft, corners.topLeft, corners.topRight),
    calculateAngle(corners.topLeft, corners.topRight, corners.bottomRight),
    calculateAngle(corners.topRight, corners.bottomRight, corners.bottomLeft),
    calculateAngle(corners.bottomRight, corners.bottomLeft, corners.topLeft),
  ];
}

/**
 * Calculate angle between three points
 */
function calculateAngle(
  p1: { x: number; y: number },
  vertex: { x: number; y: number },
  p2: { x: number; y: number }
): number {
  const v1 = { x: p1.x - vertex.x, y: p1.y - vertex.y };
  const v2 = { x: p2.x - vertex.x, y: p2.y - vertex.y };

  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);

  const cosAngle = dot / (mag1 * mag2);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
}

/**
 * Calculate confidence score from quadrilateral validation
 */
function calculateConfidenceScore(corners: DocumentCorners): number {
  if (!isValidQuadrilateral(corners)) {
    return 20; // Invalid quadrilateral
  }

  // Additional checks for confidence
  const angles = calculateCornerAngles(corners);
  const avgAngle = angles.reduce((sum, a) => sum + a, 0) / angles.length;

  // Should be close to 90 degrees for rectangular documents
  const angleDeviation = Math.abs(avgAngle - 90);

  if (angleDeviation < 5) {
    return 100;
  } else if (angleDeviation < 10) {
    return 85;
  } else if (angleDeviation < 20) {
    return 70;
  } else {
    return 50;
  }
}

/**
 * Analyze scan quality
 */
export function analyzeScanQuality(
  corners: DocumentCorners,
  frameWidth: number,
  frameHeight: number,
  history: CornerHistory[] = []
): QualityScore {
  const fillPercentage = calculateFillPercentage(corners, frameWidth, frameHeight);
  const fillScore = calculateFillScore(fillPercentage);
  const stabilityScore = calculateStabilityScore(corners, history);
  const sharpnessScore = calculateSharpnessScore(corners);
  const confidenceScore = calculateConfidenceScore(corners);

  // Weighted average for overall score
  const overall = Math.round(
    fillScore * 0.25 +
    stabilityScore * 0.30 +
    sharpnessScore * 0.25 +
    confidenceScore * 0.20
  );

  // Determine quality level and color
  let level: 'poor' | 'fair' | 'good';
  let color: string;
  let recommendation: string;

  if (overall >= 70) {
    level = 'good';
    color = '#22C55E'; // Green
    recommendation = stabilityScore === 100 ? 'Hold steady - ready to capture!' : 'Keep steady...';
  } else if (overall >= 40) {
    level = 'fair';
    color = '#EAB308'; // Yellow
    if (fillScore < 60) {
      recommendation = fillPercentage < OPTIMAL_FILL_MIN ? 'Move closer to document' : 'Move back from document';
    } else if (stabilityScore < 60) {
      recommendation = 'Hold device steady';
    } else {
      recommendation = 'Improve lighting or focus';
    }
  } else {
    level = 'poor';
    color = '#EF4444'; // Red
    if (fillScore < 40) {
      recommendation = fillPercentage < OPTIMAL_FILL_MIN ? 'Document too small - move closer' : 'Document too large - move back';
    } else if (confidenceScore < 40) {
      recommendation = 'Position document in frame';
    } else {
      recommendation = 'Hold device steady and ensure good lighting';
    }
  }

  return {
    overall,
    fillScore,
    stabilityScore,
    sharpnessScore,
    confidenceScore,
    level,
    color,
    recommendation,
  };
}

/**
 * Track corner history for stability analysis
 */
export class CornerHistoryTracker {
  private history: CornerHistory[] = [];
  private maxHistory = 20; // Keep last 20 samples

  add(corners: DocumentCorners): void {
    this.history.push({
      corners,
      timestamp: Date.now(),
    });

    // Trim old history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Remove samples older than 1 second
    const cutoff = Date.now() - 1000;
    this.history = this.history.filter((h) => h.timestamp >= cutoff);
  }

  getHistory(): CornerHistory[] {
    return this.history;
  }

  clear(): void {
    this.history = [];
  }
}
