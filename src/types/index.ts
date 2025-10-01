export interface Document {
  id: string;
  title: string;
  pages: Page[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Point {
  x: number;
  y: number;
}

export interface CropCorner {
  x: number;
  y: number;
}

export interface ImageEdits {
  rotation: number;
  brightness: number;
  contrast: number;
  saturation: number;
  sharpness: number;
  cropCorners: [CropCorner, CropCorner, CropCorner, CropCorner];
  preset?: 'none' | 'blackAndWhite' | 'grayscale' | 'enhance';
}

export interface Page {
  id: string;
  uri: string; // Current processed URI
  processedUri?: string; // Latest processed version
  originalUri: string; // Untouched original from camera
  thumbnail?: string;
  width: number;
  height: number;
  order: number;
  detectedCorners?: [Point, Point, Point, Point]; // From document detection
  confidence?: number; // Detection confidence
  edits: ImageEdits; // Current edit state
}

export type Theme = 'light' | 'dark';

export interface SubscriptionState {
  isPremium: boolean;
  trialActive: boolean;
  subscriptionType?: 'monthly' | 'yearly';
}
