import { ConfigManager } from './ConfigManager';

export class CostTracker {
    constructor(private configManager: ConfigManager) {}
    
    async getCurrentUsage(): Promise<{ limit: number; spent: number; remaining: number } | null> {
        const limit = this.configManager.getMonthlyBudget();
        const spent = 0; // For now, return placeholder data
        const remaining = limit - spent;
        return { limit, spent, remaining };
    }
}