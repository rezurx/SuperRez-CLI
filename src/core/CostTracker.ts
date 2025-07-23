import { ConfigManager } from './ConfigManager';

export class CostTracker {
    constructor(private configManager: ConfigManager) {}
    
    async getCurrentUsage(): Promise<{ limit: number; spent: number } | null> {
        const limit = this.configManager.getMonthlyBudget();
        // For now, return placeholder data
        return { limit, spent: 0 };
    }
}