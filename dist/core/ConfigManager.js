"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class ConfigManager {
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
    async load() {
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
        }
        catch (error) {
            console.warn('Failed to load config, using defaults:', error);
            await this.save(); // Create default config file
        }
    }
    async save() {
        try {
            const data = JSON.stringify(this.config, null, 2);
            fs.writeFileSync(this.configFile, data, 'utf8');
        }
        catch (error) {
            throw new Error(`Failed to save config: ${error}`);
        }
    }
    get(key) {
        return this.config[key];
    }
    async set(key, value) {
        // Handle nested keys like 'apiKeys.moonshot'
        const keys = key.split('.');
        let current = this.config;
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
        }
        else if (typeof current[finalKey] === 'boolean') {
            current[finalKey] = value === 'true' || value === true;
        }
        else {
            current[finalKey] = value;
        }
        await this.save();
    }
    getAll() {
        return { ...this.config };
    }
    // Convenience methods
    getMonthlyBudget() {
        return this.config.monthlyBudget;
    }
    getPreferredAI() {
        return this.config.preferredAI;
    }
    shouldShowCostWarnings() {
        return this.config.showCostWarnings;
    }
    getAPIKey(provider) {
        return this.config.apiKeys[provider];
    }
    hasColorOutput() {
        return this.config.colorOutput;
    }
    isVerbose() {
        return this.config.verboseLogging;
    }
    // Get config file path for user reference
    getConfigPath() {
        return this.configFile;
    }
    // Reset to defaults
    async reset() {
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
    validate() {
        const errors = [];
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
    getSummary() {
        const validation = this.validate();
        let summary = `SuperRez Configuration:\n`;
        summary += `  Budget: $${this.config.monthlyBudget}/month\n`;
        summary += `  Preferred AI: ${this.config.preferredAI}\n`;
        summary += `  Cost Warnings: ${this.config.showCostWarnings ? 'enabled' : 'disabled'}\n`;
        summary += `  Color Output: ${this.config.colorOutput ? 'enabled' : 'disabled'}\n`;
        summary += `  Verbose Logging: ${this.config.verboseLogging ? 'enabled' : 'disabled'}\n`;
        summary += `  Config File: ${this.configFile}\n`;
        const apiKeyCount = Object.keys(this.config.apiKeys).filter(key => this.config.apiKeys[key]).length;
        summary += `  API Keys: ${apiKeyCount} configured\n`;
        if (!validation.valid) {
            summary += `\nConfiguration Issues:\n`;
            validation.errors.forEach(error => summary += `  ⚠️  ${error}\n`);
        }
        return summary;
    }
}
exports.ConfigManager = ConfigManager;
//# sourceMappingURL=ConfigManager.js.map