import { ConfigManager } from './ConfigManager';

export class CostTracker {
    private monthlySpent: number = 0;
    
    constructor(private configManager: ConfigManager) {}
    
    async getCurrentUsage(): Promise<{ limit: number; spent: number; remaining: number }> {
        const limit = this.configManager.getMonthlyBudget();
        const spent = this.monthlySpent;
        const remaining = Math.max(0, limit - spent);
        return { limit, spent, remaining };
    }
    
    async addUsage(cost: number, description: string): Promise<void> {
        this.monthlySpent += cost;
        // In a real implementation, this would persist to disk/database
        console.log(`💰 Added usage: $${cost.toFixed(4)} - ${description}`);
    }
    
    async resetMonthlyUsage(): Promise<void> {
        this.monthlySpent = 0;
    }
    
    async getUsageHistory(): Promise<Array<{ date: Date; cost: number; description: string }>> {
        // Placeholder for usage history
        return [];
    }
}