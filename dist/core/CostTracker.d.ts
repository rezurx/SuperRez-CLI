import { ConfigManager } from './ConfigManager';
export declare class CostTracker {
    private configManager;
    private monthlySpent;
    constructor(configManager: ConfigManager);
    getCurrentUsage(): Promise<{
        limit: number;
        spent: number;
        remaining: number;
    }>;
    addUsage(cost: number, description: string): Promise<void>;
    resetMonthlyUsage(): Promise<void>;
    getUsageHistory(): Promise<Array<{
        date: Date;
        cost: number;
        description: string;
    }>>;
}
