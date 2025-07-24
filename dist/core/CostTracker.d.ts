import { ConfigManager } from './ConfigManager';
export declare class CostTracker {
    private configManager;
    constructor(configManager: ConfigManager);
    getCurrentUsage(): Promise<{
        limit: number;
        spent: number;
        remaining: number;
    } | null>;
}
