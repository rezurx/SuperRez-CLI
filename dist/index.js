#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const package_json_1 = require("../package.json");
const SessionManager_1 = require("./core/SessionManager");
const SecurityScanner_1 = require("./core/SecurityScanner");
const PerformanceAnalyzer_1 = require("./core/PerformanceAnalyzer");
const AIOrchestrator_1 = require("./core/AIOrchestrator");
const CostTracker_1 = require("./core/CostTracker");
const ConfigManager_1 = require("./core/ConfigManager");
const interactive_1 = require("./commands/interactive");
const session_1 = require("./commands/session");
const security_1 = require("./commands/security");
const performance_1 = require("./commands/performance");
const ai_1 = require("./commands/ai");
const program = new commander_1.Command();
// Global instances
let sessionManager;
let securityScanner;
let performanceAnalyzer;
let aiOrchestrator;
let costTracker;
let configManager;
async function initializeCore() {
    try {
        configManager = new ConfigManager_1.ConfigManager();
        await configManager.load();
        sessionManager = new SessionManager_1.SessionManager(configManager);
        securityScanner = new SecurityScanner_1.SecurityScanner();
        performanceAnalyzer = new PerformanceAnalyzer_1.PerformanceAnalyzer();
        aiOrchestrator = new AIOrchestrator_1.AIOrchestrator();
        costTracker = new CostTracker_1.CostTracker(configManager);
        console.log(chalk_1.default.gray('✓ SuperRez CLI initialized'));
    }
    catch (error) {
        console.error(chalk_1.default.red('Failed to initialize SuperRez CLI:'), error);
        process.exit(1);
    }
}
// CLI Configuration
program
    .name('superrez')
    .description('Cost-aware AI development assistant - Superior alternative to Claude Code CLI')
    .version(package_json_1.version)
    .option('-v, --verbose', 'Enable verbose output')
    .option('--no-color', 'Disable colored output')
    .hook('preAction', async () => {
    await initializeCore();
});
// Session Management Commands
program
    .command('start [project]')
    .description('Start a development session')
    .option('-p, --project <name>', 'Project name or path')
    .action(async (project, options) => {
    await (0, session_1.startSession)(sessionManager, project, options);
});
program
    .command('end')
    .description('End current session and generate AI prompt')
    .option('-c, --copy', 'Copy prompt to clipboard')
    .action(async (options) => {
    await (0, session_1.endSession)(sessionManager, costTracker, options);
});
program
    .command('status')
    .description('Show current session and budget status')
    .action(async () => {
    await (0, session_1.showStatus)(sessionManager, costTracker);
});
program
    .command('discover')
    .description('Discover available projects')
    .action(async () => {
    await (0, session_1.discoverProjects)(sessionManager);
});
// Local Analysis Commands (FREE)
program
    .command('analyze')
    .description('Run local analysis')
    .option('-s, --security', 'Run security analysis')
    .option('-p, --performance', 'Run performance analysis')
    .option('-a, --all', 'Run all analyses')
    .action(async (options) => {
    if (options.all || options.security) {
        await (0, security_1.analyzeSecurity)(securityScanner, sessionManager);
    }
    if (options.all || options.performance) {
        await (0, performance_1.analyzePerformance)(performanceAnalyzer, sessionManager);
    }
    if (!options.security && !options.performance && !options.all) {
        console.log(chalk_1.default.yellow('Please specify analysis type: --security, --performance, or --all'));
    }
});
// AI Orchestration Commands
program
    .command('ai')
    .description('AI tool management and routing')
    .option('-t, --tools', 'Show available AI tools')
    .option('-r, --route <task>', 'Get AI tool recommendation for task')
    .option('-p, --prompt <request>', 'Generate smart prompt for request')
    .action(async (options) => {
    if (options.tools) {
        await (0, ai_1.showAITools)(aiOrchestrator);
    }
    if (options.route) {
        await (0, ai_1.routeTask)(aiOrchestrator, costTracker, options.route);
    }
    if (options.prompt) {
        await (0, ai_1.generatePrompt)(sessionManager, aiOrchestrator, costTracker, options.prompt);
    }
    if (!options.tools && !options.route && !options.prompt) {
        console.log(chalk_1.default.yellow('Please specify AI operation: --tools, --route <task>, or --prompt <request>'));
    }
});
// Configuration Commands
program
    .command('config')
    .description('Manage SuperRez configuration')
    .option('-s, --set <key=value>', 'Set configuration value')
    .option('-g, --get <key>', 'Get configuration value')
    .option('-l, --list', 'List all configuration')
    .action(async (options) => {
    if (options.set) {
        const [key, value] = options.set.split('=');
        await configManager.set(key, value);
        console.log(chalk_1.default.green(`✓ Set ${key} = ${value}`));
    }
    if (options.get) {
        const value = configManager.get(options.get);
        console.log(`${options.get}: ${value}`);
    }
    if (options.list) {
        const config = configManager.getAll();
        console.log(chalk_1.default.cyan('SuperRez Configuration:'));
        Object.entries(config).forEach(([key, value]) => {
            console.log(`  ${key}: ${value}`);
        });
    }
});
// Interactive Mode (Default)
program
    .command('interactive', { isDefault: false })
    .alias('i')
    .description('Start interactive REPL mode')
    .action(async () => {
    await (0, interactive_1.startInteractiveMode)({
        sessionManager,
        securityScanner,
        performanceAnalyzer,
        aiOrchestrator,
        costTracker,
        configManager
    });
});
// Default action - show help or interactive mode
program.action(async () => {
    console.log(chalk_1.default.cyan.bold('🚀 SuperRez CLI v' + package_json_1.version));
    console.log(chalk_1.default.gray('Cost-aware AI development assistant\n'));
    const activeSession = sessionManager?.getActiveSession();
    if (activeSession) {
        console.log(chalk_1.default.green(`📁 Active session: ${activeSession.projectName}`));
        const budget = await costTracker?.getCurrentUsage();
        if (budget) {
            console.log(chalk_1.default.blue(`💰 Budget: $${budget.spent.toFixed(2)}/$${budget.limit.toFixed(2)} (${((1 - budget.spent / budget.limit) * 100).toFixed(1)}% remaining)`));
        }
        console.log();
    }
    console.log(chalk_1.default.yellow('Quick commands:'));
    console.log('  superrez start        # Start project session');
    console.log('  superrez analyze -a   # Run all local analysis (FREE)');
    console.log('  superrez ai --tools    # Show available AI tools');
    console.log('  superrez interactive   # Interactive mode');
    console.log('  superrez --help        # Full command reference');
    console.log();
    console.log(chalk_1.default.gray('💡 Tip: Run "superrez interactive" for guided usage'));
});
// Error handling
program.configureOutput({
    writeErr: (str) => process.stderr.write(chalk_1.default.red(str))
});
process.on('uncaughtException', (error) => {
    console.error(chalk_1.default.red('Uncaught exception:'), error.message);
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk_1.default.red('Unhandled rejection at:'), promise, chalk_1.default.red('reason:'), reason);
    process.exit(1);
});
// Parse command line arguments
program.parse();
//# sourceMappingURL=index.js.map