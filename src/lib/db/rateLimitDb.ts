// Rate Limiting Database Layer - P0-6 requirement
import type { UserQuota } from '../types/financial';

export class RateLimitDb {
  // In-memory storage for MVP (will be replaced with Supabase)
  private quotas: Map<string, UserQuota> = new Map();

  private readonly TIER_LIMITS = {
    free: { conversations: 10, messages: 20 },
    plus: { conversations: Infinity, messages: Infinity },
    pro: { conversations: Infinity, messages: Infinity },
  };

  async getOrCreateQuota(userId: string, tier: 'free' | 'plus' | 'pro' = 'free'): Promise<UserQuota> {
    let quota = this.quotas.get(userId);

    if (!quota) {
      const now = new Date();
      const resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      quota = {
        userId,
        tier,
        conversationsUsedThisMonth: 0,
        conversationsLimit: this.TIER_LIMITS[tier].conversations,
        messagesUsedThisMonth: 0,
        messagesLimit: this.TIER_LIMITS[tier].messages,
        resetDate,
      };

      this.quotas.set(userId, quota);
    }

    // Reset if month has changed
    if (quota.resetDate < new Date()) {
      quota.conversationsUsedThisMonth = 0;
      quota.messagesUsedThisMonth = 0;
      const now = new Date();
      quota.resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      this.quotas.set(userId, quota);
    }

    return quota;
  }

  async incrementConversationCount(userId: string): Promise<boolean> {
    const quota = await this.getOrCreateQuota(userId);

    if (quota.conversationsUsedThisMonth >= quota.conversationsLimit) {
      return false; // Quota exceeded
    }

    quota.conversationsUsedThisMonth += 1;
    this.quotas.set(userId, quota);
    return true;
  }

  async incrementMessageCount(userId: string): Promise<boolean> {
    const quota = await this.getOrCreateQuota(userId);

    if (quota.messagesUsedThisMonth >= quota.messagesLimit) {
      return false; // Quota exceeded
    }

    quota.messagesUsedThisMonth += 1;
    this.quotas.set(userId, quota);
    return true;
  }

  async canStartConversation(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const quota = await this.getOrCreateQuota(userId);
    const allowed = quota.conversationsUsedThisMonth < quota.conversationsLimit;
    const remaining = Math.max(0, quota.conversationsLimit - quota.conversationsUsedThisMonth);

    return { allowed, remaining };
  }

  async canSendMessage(userId: string): Promise<{ allowed: boolean; remaining: number }> {
    const quota = await this.getOrCreateQuota(userId);
    const allowed = quota.messagesUsedThisMonth < quota.messagesLimit;
    const remaining = Math.max(0, quota.messagesLimit - quota.messagesUsedThisMonth);

    return { allowed, remaining };
  }

  async upgradeTier(userId: string, newTier: 'free' | 'plus' | 'pro'): Promise<UserQuota> {
    const quota = await this.getOrCreateQuota(userId);
    quota.tier = newTier;
    quota.conversationsLimit = this.TIER_LIMITS[newTier].conversations;
    quota.messagesLimit = this.TIER_LIMITS[newTier].messages;
    this.quotas.set(userId, quota);
    return quota;
  }
}
