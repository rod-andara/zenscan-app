/**
 * Auto-Capture Controller
 * Automatically triggers capture when quality is consistently high
 */

import { QualityScore } from './scanQualityAnalyzer';

export interface AutoCaptureConfig {
  enabled: boolean;
  minQualityScore: number; // Default: 80
  holdDurationMs: number; // Default: 1500ms
  vibrateFeedback: boolean; // Default: true
}

export interface AutoCaptureState {
  isReady: boolean; // Quality threshold met
  progress: number; // 0-1, progress toward auto-capture
  timeRemaining: number; // Milliseconds until capture
  shouldCapture: boolean; // Trigger capture now
}

interface QualityHistory {
  score: number;
  timestamp: number;
}

/**
 * Auto-Capture Controller
 * Monitors quality over time and triggers capture when conditions are met
 */
export class AutoCaptureController {
  private config: AutoCaptureConfig;
  private qualityHistory: QualityHistory[] = [];
  private readyStartTime: number | null = null;
  private lastCaptureTime: number = 0;
  private minTimeBetweenCaptures = 2000; // 2 seconds minimum

  constructor(config: Partial<AutoCaptureConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? true,
      minQualityScore: config.minQualityScore ?? 80,
      holdDurationMs: config.holdDurationMs ?? 1500,
      vibrateFeedback: config.vibrateFeedback ?? true,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<AutoCaptureConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): AutoCaptureConfig {
    return { ...this.config };
  }

  /**
   * Process new quality score and return auto-capture state
   */
  processQuality(quality: QualityScore): AutoCaptureState {
    if (!this.config.enabled) {
      return {
        isReady: false,
        progress: 0,
        timeRemaining: 0,
        shouldCapture: false,
      };
    }

    const now = Date.now();

    // Add to history
    this.qualityHistory.push({
      score: quality.overall,
      timestamp: now,
    });

    // Trim old history (keep last 3 seconds)
    const cutoff = now - 3000;
    this.qualityHistory = this.qualityHistory.filter((h) => h.timestamp >= cutoff);

    // Check if quality meets threshold
    const meetsThreshold = quality.overall >= this.config.minQualityScore;

    if (meetsThreshold && quality.level === 'good') {
      // Start or continue ready timer
      if (this.readyStartTime === null) {
        this.readyStartTime = now;
      }

      const elapsed = now - this.readyStartTime;
      const progress = Math.min(1, elapsed / this.config.holdDurationMs);
      const timeRemaining = Math.max(0, this.config.holdDurationMs - elapsed);

      // Check if ready to capture
      const shouldCapture =
        elapsed >= this.config.holdDurationMs &&
        now - this.lastCaptureTime >= this.minTimeBetweenCaptures;

      if (shouldCapture) {
        this.lastCaptureTime = now;
        this.reset(); // Reset for next capture
      }

      return {
        isReady: true,
        progress,
        timeRemaining,
        shouldCapture,
      };
    } else {
      // Quality dropped below threshold - reset
      this.readyStartTime = null;

      return {
        isReady: false,
        progress: 0,
        timeRemaining: this.config.holdDurationMs,
        shouldCapture: false,
      };
    }
  }

  /**
   * Reset the controller state
   */
  reset(): void {
    this.readyStartTime = null;
    this.qualityHistory = [];
  }

  /**
   * Manually trigger a capture (bypass auto-capture)
   */
  manualCapture(): void {
    this.lastCaptureTime = Date.now();
    this.reset();
  }

  /**
   * Check if auto-capture is currently in progress
   */
  isInProgress(): boolean {
    return this.readyStartTime !== null;
  }

  /**
   * Get average quality over recent history
   */
  getAverageQuality(windowMs: number = 1000): number {
    const now = Date.now();
    const cutoff = now - windowMs;
    const recentScores = this.qualityHistory
      .filter((h) => h.timestamp >= cutoff)
      .map((h) => h.score);

    if (recentScores.length === 0) {
      return 0;
    }

    return recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
  }

  /**
   * Check if quality has been stable
   */
  isQualityStable(windowMs: number = 1000, maxVariance: number = 10): boolean {
    const now = Date.now();
    const cutoff = now - windowMs;
    const recentScores = this.qualityHistory
      .filter((h) => h.timestamp >= cutoff)
      .map((h) => h.score);

    if (recentScores.length < 3) {
      return false; // Not enough data
    }

    const avg = recentScores.reduce((sum, score) => sum + score, 0) / recentScores.length;
    const variance = recentScores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / recentScores.length;

    return variance <= maxVariance;
  }
}

/**
 * Calculate countdown display values
 */
export function formatCountdown(timeRemaining: number): {
  seconds: number;
  display: string;
} {
  const seconds = Math.ceil(timeRemaining / 1000);
  const display = seconds > 0 ? `${seconds}s` : 'Capturing...';

  return { seconds, display };
}

/**
 * Get haptic feedback pattern based on auto-capture state
 */
export function getHapticPattern(state: AutoCaptureState): 'light' | 'medium' | 'heavy' | null {
  if (state.shouldCapture) {
    return 'heavy'; // Strong feedback when capturing
  } else if (state.isReady && state.progress >= 0.5) {
    return 'medium'; // Medium feedback when halfway
  } else if (state.isReady && state.progress === 0) {
    return 'light'; // Light feedback when quality first meets threshold
  }
  return null;
}
