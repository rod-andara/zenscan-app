export interface Document {
  id: string;
  title: string;
  pages: Page[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Page {
  id: string;
  uri: string;
  thumbnail?: string;
  originalUri?: string;
  width: number;
  height: number;
  order: number;
}

export interface CropCorner {
  x: number;
  y: number;
}

export interface ImageEdits {
  rotation: number;
  brightness: number;
  contrast: number;
  cropCorners: CropCorner[];
}

export type Theme = 'light' | 'dark';

export interface SubscriptionState {
  isPremium: boolean;
  trialActive: boolean;
  subscriptionType?: 'monthly' | 'yearly';
}
