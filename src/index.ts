#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { version } from '../package.json';
import { SessionManager } from './core/SessionManager';
import { SecurityScanner } from './core/SecurityScanner';
import { PerformanceAnalyzer } from './core/PerformanceAnalyzer';
import { AIOrchestrator } from './core/AIOrchestrator';
import { CostTracker } from './core/CostTracker';
import { ConfigManager } from './core/ConfigManager';
import { startInteractiveMode } from './commands/interactive';
import { startSession, endSession, showStatus, discoverProjects } from './commands/session';
import { analyzeSecurity } from './commands/security';
import { analyzePerformance } from './commands/performance';
import { showAITools, generatePrompt, routeTask } from './commands/ai';

const program = new Command();

// Global instances
let sessionManager: SessionManager;
let securityScanner: SecurityScanner;
let performanceAnalyzer: PerformanceAnalyzer;
let aiOrchestrator: AIOrchestrator;
let costTracker: CostTracker;
let configManager: ConfigManager;

async function initializeCore() {
    try {
        configManager = new ConfigManager();
        await configManager.load();
        
        sessionManager = new SessionManager(configManager);
        securityScanner = new SecurityScanner();
        performanceAnalyzer = new PerformanceAnalyzer();
        aiOrchestrator = new AIOrchestrator();
        costTracker = new CostTracker(configManager);
        
        console.log(chalk.gray('✓ SuperRez CLI initialized'));
    } catch (error) {
        console.error(chalk.red('Failed to initialize SuperRez CLI:'), error);
        process.exit(1);
    }
}

// CLI Configuration
program
    .name('superrez')
    .description('Cost-aware AI development assistant - Superior alternative to Claude Code CLI')
    .version(version)
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
        await startSession(sessionManager, project, options);
    });

program
    .command('end')
    .description('End current session and generate AI prompt')
    .option('-c, --copy', 'Copy prompt to clipboard')
    .action(async (options) => {
        await endSession(sessionManager, costTracker, options);
    });

program
    .command('status')
    .description('Show current session and budget status')
    .action(async () => {
        await showStatus(sessionManager, costTracker);
    });

program
    .command('discover')
    .description('Discover available projects')
    .action(async () => {
        await discoverProjects(sessionManager);
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
            await analyzeSecurity(securityScanner, sessionManager);
        }
        if (options.all || options.performance) {
            await analyzePerformance(performanceAnalyzer, sessionManager);
        }
        if (!options.security && !options.performance && !options.all) {
            console.log(chalk.yellow('Please specify analysis type: --security, --performance, or --all'));
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
            await showAITools(aiOrchestrator);
        }
        if (options.route) {
            await routeTask(aiOrchestrator, costTracker, options.route);
        }
        if (options.prompt) {
            await generatePrompt(sessionManager, aiOrchestrator, costTracker, options.prompt);
        }
        if (!options.tools && !options.route && !options.prompt) {
            console.log(chalk.yellow('Please specify AI operation: --tools, --route <task>, or --prompt <request>'));
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
            console.log(chalk.green(`✓ Set ${key} = ${value}`));
        }
        if (options.get) {
            const value = configManager.get(options.get);
            console.log(`${options.get}: ${value}`);
        }
        if (options.list) {
            const config = configManager.getAll();
            console.log(chalk.cyan('SuperRez Configuration:'));
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
        await startInteractiveMode({
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
    console.log(chalk.cyan.bold('🚀 SuperRez CLI v' + version));
    console.log(chalk.gray('Cost-aware AI development assistant\n'));
    
    const activeSession = sessionManager?.getActiveSession();
    if (activeSession) {
        console.log(chalk.green(`📁 Active session: ${activeSession.projectName}`));
        const budget = await costTracker?.getCurrentUsage();
        if (budget) {
            console.log(chalk.blue(`💰 Budget: $${budget.spent.toFixed(2)}/$${budget.limit.toFixed(2)} (${((1 - budget.spent / budget.limit) * 100).toFixed(1)}% remaining)`));
        }
        console.log();
    }
    
    console.log(chalk.yellow('Quick commands:'));
    console.log('  superrez start        # Start project session');
    console.log('  superrez analyze -a   # Run all local analysis (FREE)');
    console.log('  superrez ai --tools    # Show available AI tools');
    console.log('  superrez interactive   # Interactive mode');
    console.log('  superrez --help        # Full command reference');
    console.log();
    console.log(chalk.gray('💡 Tip: Run "superrez interactive" for guided usage'));
});

// Error handling
program.configureOutput({
    writeErr: (str) => process.stderr.write(chalk.red(str))
});

process.on('uncaughtException', (error) => {
    console.error(chalk.red('Uncaught exception:'), error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error(chalk.red('Unhandled rejection at:'), promise, chalk.red('reason:'), reason);
    process.exit(1);
});

// Parse command line arguments
program.parse();