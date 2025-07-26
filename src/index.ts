#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { version } from '../package.json';
import { SessionManager } from './core/SessionManager';
import { SecurityScanner } from './core/SecurityScanner';
import { PerformanceAnalyzer } from './core/PerformanceAnalyzer';
import { AIOrchestrator } from './core/AIOrchestrator';
import { CostTracker } from './core/CostTracker';
import { ConfigManager } from './core/ConfigManager';
import { TemplateEngine } from './core/TemplateEngine';
import { startInteractiveMode } from './commands/interactive';
import { startSession, endSession, showStatus, discoverProjects } from './commands/session';
import { analyzeSecurity } from './commands/security';
import { analyzePerformance } from './commands/performance';
import { showAITools, generatePrompt, routeTask } from './commands/ai';
import { listTemplates, generateFromTemplate, showTemplateInfo, manageTemplates } from './commands/template';
import path from 'path';
import fs from 'fs';

const program = new Command();

// Global instances
let sessionManager: SessionManager;
let securityScanner: SecurityScanner;
let performanceAnalyzer: PerformanceAnalyzer;
let aiOrchestrator: AIOrchestrator;
let costTracker: CostTracker;
let configManager: ConfigManager;
let templateEngine: TemplateEngine;

async function initializeCore() {
    try {
        configManager = new ConfigManager();
        await configManager.load();
        
        sessionManager = new SessionManager(configManager);
        securityScanner = new SecurityScanner();
        performanceAnalyzer = new PerformanceAnalyzer();
        aiOrchestrator = new AIOrchestrator();
        costTracker = new CostTracker(configManager);
        templateEngine = new TemplateEngine(sessionManager, aiOrchestrator);
        
    } catch (error) {
        console.error(chalk.red('Failed to initialize SuperRez CLI:'), error);
        process.exit(1);
    }
}

async function detectProjectContext(dir: string): Promise<{ isProject: boolean; type: string }> {
    const indicators = [
        { file: 'package.json', type: 'Node.js/JavaScript' },
        { file: 'requirements.txt', type: 'Python' },
        { file: 'pyproject.toml', type: 'Python (Modern)' },
        { file: 'Cargo.toml', type: 'Rust' },
        { file: 'go.mod', type: 'Go' },
        { file: 'pom.xml', type: 'Java/Maven' },
        { file: 'build.gradle', type: 'Java/Gradle' },
        { file: 'hardhat.config.js', type: 'Blockchain/Hardhat' },
        { file: 'truffle-config.js', type: 'Blockchain/Truffle' },
        { file: 'Dockerfile', type: 'Docker Project' },
        { file: '.git', type: 'Git Repository' },
        { file: 'progress_tracker.md', type: 'SuperRez Project' },
        { file: 'claude_project_docs.md', type: 'Claude Project' },
        { file: 'final_progress_tracker.md', type: 'Completed Project' },
        { file: 'memecoin_sniper.py', type: 'Memecoin Bot' },
        { file: 'main_memecoin_sniper.py', type: 'Memecoin Sniper' }
    ];

    for (const indicator of indicators) {
        const fullPath = path.join(dir, indicator.file);
        if (fs.existsSync(fullPath)) {
            return { isProject: true, type: indicator.type };
        }
    }

    return { isProject: false, type: 'Unknown' };
}

async function startDirectMode() {
    console.log(chalk.cyan.bold('🚀 SuperRez CLI v' + version));
    console.log(chalk.gray('Enterprise-Grade AI Development Assistant\n'));

    // Auto-detect current directory context
    const currentDir = process.cwd();
    const projectName = path.basename(currentDir);
    
    // Check if we're in a project directory
    const hasProjectFiles = await detectProjectContext(currentDir);
    
    if (hasProjectFiles.isProject) {
        console.log(chalk.green(`📁 Detected project: ${projectName}`));
        console.log(chalk.gray(`   Type: ${hasProjectFiles.type}`));
        
        // Auto-start session in current directory
        await sessionManager.startSession(currentDir);
        console.log(chalk.green('✓ Session started automatically\n'));
    } else {
        console.log(chalk.yellow(`📂 Current directory: ${projectName}`));
        console.log(chalk.gray('   No project detected - you can still use all features\n'));
    }

    // Show budget status
    const budget = await costTracker.getCurrentUsage();
    if (budget) {
        const remaining = budget.limit - budget.spent;
        const color = remaining > 20 ? 'green' : remaining > 5 ? 'yellow' : 'red';
        console.log(chalk[color](`💰 Budget: $${budget.spent.toFixed(2)}/$${budget.limit.toFixed(2)} (${((remaining / budget.limit) * 100).toFixed(1)}% remaining)\n`));
    }

    // Show quick action menu
    const action = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: 'What would you like to do?',
            choices: [
                { name: '💬 Start interactive AI session', value: 'interactive' },
                { name: '🔍 Analyze current directory (FREE)', value: 'analyze' },
                { name: '📝 Generate code from templates (FREE)', value: 'template' },
                { name: '🤖 Quick AI prompt', value: 'ai' },
                { name: '⚙️  Configuration', value: 'config' },
                { name: '❌ Exit', value: 'exit' }
            ]
        }
    ]);

    switch (action.choice) {
        case 'interactive':
            await startInteractiveMode({
                sessionManager,
                securityScanner,
                performanceAnalyzer,
                aiOrchestrator,
                costTracker,
                configManager,
                templateEngine
            });
            break;
        case 'analyze':
            await runQuickAnalysis({ all: true });
            break;
        case 'template':
            await runTemplateGeneration();
            break;
        case 'ai':
            await runInteractiveAI();
            break;
        case 'config':
            await runConfiguration();
            break;
        case 'exit':
            console.log(chalk.gray('Goodbye! 👋'));
            process.exit(0);
    }
}

async function runQuickAnalysis(options: any) {
    console.log(chalk.cyan('🔍 Running Analysis...\n'));
    
    if (options.security || options.all) {
        console.log(chalk.blue('🔒 Security Analysis'));
        await analyzeSecurity(securityScanner, sessionManager);
    }
    
    if (options.performance || options.all) {
        console.log(chalk.blue('⚡ Performance Analysis'));
        await analyzePerformance(performanceAnalyzer, sessionManager);
    }
    
    console.log(chalk.green('\n✓ Analysis complete (100% FREE)'));
    
    // Ask if they want to continue with other actions
    const continueAction = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'continue',
            message: 'Would you like to do something else?',
            default: true
        }
    ]);
    
    if (continueAction.continue) {
        await startDirectMode();
    }
}

async function runTemplateGeneration() {
    console.log(chalk.cyan('📝 Template Generation\n'));
    
    const templates = await templateEngine.listTemplates();
    
    const templateChoice = await inquirer.prompt([
        {
            type: 'list',
            name: 'template',
            message: 'Choose a template:',
            choices: templates.map(t => ({ name: `${t.name} - ${t.description}`, value: t.name }))
        }
    ]);
    
    await generateFromTemplate(templateEngine, sessionManager, templateChoice.template);
    console.log(chalk.green('✓ Template generated successfully'));
    
    const continueAction = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'continue',
            message: 'Generate another template or do something else?',
            default: true
        }
    ]);
    
    if (continueAction.continue) {
        await startDirectMode();
    }
}

async function runInteractiveAI() {
    const promptInput = await inquirer.prompt([
        {
            type: 'input',
            name: 'prompt',
            message: 'Enter your AI prompt:',
            validate: (input) => input.length > 0 || 'Please enter a prompt'
        }
    ]);
    
    console.log(chalk.cyan('🤖 Processing AI Request...\n'));
    
    // Get context from current session if available
    const activeSession = sessionManager.getActiveSession();
    const context = activeSession ? await sessionManager.getSessionContext(activeSession.id) : null;
    const fullPrompt = context ? `${context}\n\nUser request: ${promptInput.prompt}` : promptInput.prompt;
    
    try {
        const { executeAIRequest } = await import('./commands/ai');
        await executeAIRequest(sessionManager, aiOrchestrator, costTracker, fullPrompt);
    } catch (error) {
        console.log(chalk.red('❌ Error executing AI request:'), error.message);
    }
}

async function runConfiguration() {
    console.log(chalk.cyan('⚙️ Configuration\n'));
    
    const configAction = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'Configuration options:',
            choices: [
                { name: '📊 View current settings', value: 'view' },
                { name: '💰 Set monthly budget', value: 'budget' },
                { name: '🤖 Set preferred AI tool', value: 'ai' },
                { name: '🔑 Manage API keys', value: 'keys' },
                { name: '🔄 Reset to defaults', value: 'reset' },
                { name: '← Back to main menu', value: 'back' }
            ]
        }
    ]);
    
    switch (configAction.action) {
        case 'view':
            const config = configManager.getAll();
            console.log(chalk.white(JSON.stringify(config, null, 2)));
            break;
        case 'budget':
            const budgetInput = await inquirer.prompt([
                {
                    type: 'number',
                    name: 'budget',
                    message: 'Enter monthly budget ($):',
                    default: 50,
                    validate: (input) => input > 0 || 'Budget must be greater than 0'
                }
            ]);
            await configManager.set('monthlyBudget', budgetInput.budget);
            console.log(chalk.green(`✓ Monthly budget set to $${budgetInput.budget}`));
            break;
        case 'back':
            await startDirectMode();
            return;
    }
    
    const continueConfig = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'continue',
            message: 'Configure something else?',
            default: false
        }
    ]);
    
    if (continueConfig.continue) {
        await runConfiguration();
    } else {
        await startDirectMode();
    }
}

// CLI Configuration
program
    .name('superrez')
    .description('Enterprise-grade AI development assistant with 95% cost reduction - Advanced analysis, templates, and AI integration')
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
    .description('Run comprehensive local analysis (5+ security categories, 6+ performance categories)')
    .option('-s, --security', 'Run security vulnerability scan (5+ categories)')
    .option('-p, --performance', 'Run performance analysis (6+ categories)')
    .option('-a, --all', 'Run all analysis engines')
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
    .description('AI tool management, routing, and direct execution')
    .option('-t, --tools', 'Show available AI tools')
    .option('-r, --route <task>', 'Get AI tool recommendation for task')
    .option('-p, --prompt <request>', 'Generate smart prompt for request')
    .option('-e, --execute <request>', 'Execute AI request directly with cost tracking')
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
        if (options.execute) {
            const { executeAIRequest } = await import('./commands/ai');
            await executeAIRequest(sessionManager, aiOrchestrator, costTracker, options.execute);
        }
        if (!options.tools && !options.route && !options.prompt && !options.execute) {
            console.log(chalk.yellow('Please specify AI operation: --tools, --route <task>, --prompt <request>, or --execute <request>'));
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

// Template Engine Commands
program
    .command('template')
    .description('Intelligent code generation with 8+ built-in templates')
    .option('-l, --list', 'List all available templates (React, Vue, Express, FastAPI, Go, Python, Jest, Docker)')
    .option('-g, --generate <name>', 'Generate code from template with interactive configuration')
    .option('-i, --info <name>', 'Show detailed template information and variables')
    .option('-m, --manage', 'Interactive template management interface')
    .action(async (options) => {
        if (options.list) {
            await listTemplates(templateEngine);
        } else if (options.generate) {
            await generateFromTemplate(templateEngine, sessionManager, options.generate);
        } else if (options.info) {
            await showTemplateInfo(templateEngine, options.info);
        } else if (options.manage) {
            await manageTemplates(templateEngine);
        } else {
            await manageTemplates(templateEngine);
        }
    });

// Interactive Mode (Default)
program
    .command('interactive', { isDefault: false })
    .alias('i')
    .description('Start interactive REPL mode with tab completion and rich terminal UI')
    .action(async () => {
        await startInteractiveMode({
            sessionManager,
            securityScanner,
            performanceAnalyzer,
            aiOrchestrator,
            costTracker,
            configManager,
            templateEngine
        });
    });

// Default action - start the enhanced direct mode
program.action(async () => {
    await startDirectMode();
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