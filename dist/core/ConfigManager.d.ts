export interface SuperRezConfig {
    monthlyBudget: number;
    preferredAI: 'claude-code' | 'gemini-cli' | 'copilot' | 'ollama' | 'kimi' | 'auto';
    showCostWarnings: boolean;
    defaultProjectPath?: string;
    apiKeys: {
        moonshot?: string;
        openai?: string;
        anthropic?: string;
    };
    colorOutput: boolean;
    verboseLogging: boolean;
}
export declare class ConfigManager {
    private config;
    private configFile;
    private configDir;
    constructor();
    load(): Promise<void>;
    save(): Promise<void>;
    get(key: keyof SuperRezConfig): any;
    set(key: string, value: any): Promise<void>;
    getAll(): SuperRezConfig;
    getMonthlyBudget(): number;
    getPreferredAI(): string;
    shouldShowCostWarnings(): boolean;
    getAPIKey(provider: 'moonshot' | 'openai' | 'anthropic'): string | undefined;
    hasColorOutput(): boolean;
    isVerbose(): boolean;
    getConfigPath(): string;
    reset(): Promise<void>;
    validate(): {
        valid: boolean;
        errors: string[];
    };
    getSummary(): string;
}
