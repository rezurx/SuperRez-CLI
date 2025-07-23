import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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

export class ConfigManager {
    private config: SuperRezConfig;
    private configFile: string;
    private configDir: string;

    constructor() {
        this.configDir = path.join(os.homedir(), '.superrez');
        this.configFile = path.join(this.configDir, 'config.json');
        
        // Default configuration
        this.config = {
            monthlyBudget: 50,
            preferredAI: 'auto',
            showCostWarnings: true,
            apiKeys: {},
            colorOutput: true,
            verboseLogging: false
        };
    }

    async load(): Promise<void> {
        try {
            // Ensure config directory exists
            if (!fs.existsSync(this.configDir)) {
                fs.mkdirSync(this.configDir, { recursive: true });
            }

            // Load existing config if it exists
            if (fs.existsSync(this.configFile)) {
                const data = fs.readFileSync(this.configFile, 'utf8');
                const savedConfig = JSON.parse(data);
                
                // Merge with defaults
                this.config = { ...this.config, ...savedConfig };
            }

            // Load API keys from environment variables if not in config
            if (!this.config.apiKeys.moonshot && process.env.MOONSHOT_API_KEY) {
                this.config.apiKeys.moonshot = process.env.MOONSHOT_API_KEY;
            }
            
            if (!this.config.apiKeys.openai && process.env.OPENAI_API_KEY) {
                this.config.apiKeys.openai = process.env.OPENAI_API_KEY;
            }
            
            if (!this.config.apiKeys.anthropic && process.env.ANTHROPIC_API_KEY) {
                this.config.apiKeys.anthropic = process.env.ANTHROPIC_API_KEY;
            }

            // Save to persist any environment variables we picked up
            await this.save();
            
        } catch (error) {
            console.warn('Failed to load config, using defaults:', error);
            await this.save(); // Create default config file
        }
    }

    async save(): Promise<void> {
        try {
            const data = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(this.configFile, data, 'utf8');
        } catch (error) {
            throw new Error(`Failed to save config: ${error}`);
        }
    }

    get(key: keyof SuperRezConfig): any {
        return this.config[key];
    }

    async set(key: string, value: any): Promise<void> {
        // Handle nested keys like 'apiKeys.moonshot'
        const keys = key.split('.');
        let current: any = this.config;
        
        for (let i = 0; i < keys.length - 1; i++) {
            if (!(keys[i] in current)) {
                current[keys[i]] = {};
            }
            current = current[keys[i]];
        }
        
        const finalKey = keys[keys.length - 1];
        
        // Type conversion
        if (typeof current[finalKey] === 'number') {
            current[finalKey] = parseFloat(value);
        } else if (typeof current[finalKey] === 'boolean') {
            current[finalKey] = value === 'true' || value === true;
        } else {
            current[finalKey] = value;
        }
        
        await this.save();
    }

    getAll(): SuperRezConfig {
        return { ...this.config };
    }

    // Convenience methods
    getMonthlyBudget(): number {
        return this.config.monthlyBudget;
    }

    getPreferredAI(): string {
        return this.config.preferredAI;
    }

    shouldShowCostWarnings(): boolean {
        return this.config.showCostWarnings;
    }

    getAPIKey(provider: 'moonshot' | 'openai' | 'anthropic'): string | undefined {
        return this.config.apiKeys[provider];
    }

    hasColorOutput(): boolean {
        return this.config.colorOutput;
    }

    isVerbose(): boolean {
        return this.config.verboseLogging;
    }

    // Get config file path for user reference
    getConfigPath(): string {
        return this.configFile;
    }

    // Reset to defaults
    async reset(): Promise<void> {
        this.config = {
            monthlyBudget: 50,
            preferredAI: 'auto',
            showCostWarnings: true,
            apiKeys: {},
            colorOutput: true,
            verboseLogging: false
        };
        
        await this.save();
    }

    // Validate configuration
    validate(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (this.config.monthlyBudget < 0) {
            errors.push('Monthly budget cannot be negative');
        }
        
        if (this.config.monthlyBudget > 1000) {
            errors.push('Monthly budget seems unusually high (>$1000)');
        }
        
        const validAIs = ['claude-code', 'gemini-cli', 'copilot', 'ollama', 'kimi', 'auto'];
        if (!validAIs.includes(this.config.preferredAI)) {
            errors.push(`Invalid preferred AI: ${this.config.preferredAI}`);
        }
        
        return {
            valid: errors.length === 0,
            errors
        };
    }

    // Display configuration summary
    getSummary(): string {
        const validation = this.validate();
        
        let summary = `SuperRez Configuration:\n`;
        summary += `  Budget: $${this.config.monthlyBudget}/month\n`;
        summary += `  Preferred AI: ${this.config.preferredAI}\n`;
        summary += `  Cost Warnings: ${this.config.showCostWarnings ? 'enabled' : 'disabled'}\n`;
        summary += `  Color Output: ${this.config.colorOutput ? 'enabled' : 'disabled'}\n`;
        summary += `  Verbose Logging: ${this.config.verboseLogging ? 'enabled' : 'disabled'}\n`;
        summary += `  Config File: ${this.configFile}\n`;
        
        const apiKeyCount = Object.keys(this.config.apiKeys).filter(key => this.config.apiKeys[key as keyof typeof this.config.apiKeys]).length;
        summary += `  API Keys: ${apiKeyCount} configured\n`;
        
        if (!validation.valid) {
            summary += `\nConfiguration Issues:\n`;
            validation.errors.forEach(error => summary += `  ⚠️  ${error}\n`);
        }
        
        return summary;
    }
}