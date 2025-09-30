import { create } from 'zustand';
import { SubscriptionState } from '../types';

interface SubscriptionStore extends SubscriptionState {
  setSubscription: (subscription: Partial<SubscriptionState>) => void;
  checkFeatureAccess: (feature: 'batch' | 'handwriting' | 'cloud') => boolean;
}

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  isPremium: false,
  trialActive: false,
  subscriptionType: undefined,

  setSubscription: (subscription) =>
    set((state) => ({
      ...state,
      ...subscription,
    })),

  checkFeatureAccess: (feature) => {
    const state = get();
    // For now, all features require premium
    return state.isPremium || state.trialActive;
  },
}));
