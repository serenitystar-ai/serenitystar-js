import type { PricingPlan } from '../types.js';

export async function fetchPricingData(): Promise<PricingPlan[]> {
  try {
    const response = await fetch('https://api.serenitystar.ai/api/SubscriptionPlan');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch pricing data:', error);
    // Return empty array as fallback
    return [];
  }
}
