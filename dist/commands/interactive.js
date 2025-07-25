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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startInteractiveMode = startInteractiveMode;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const readline = __importStar(require("readline"));
const session_1 = require("./session");
const security_1 = require("./security");
const performance_1 = require("./performance");
const ai_1 = require("./ai");
const template_1 = require("./template");
// Rate limiting for AI commands to prevent 529 errors
let lastAICommandTime = 0;
const AI_COMMAND_COOLDOWN = 2000; // 2 seconds between AI commands
function getCompletions(line, context) {
    const commands = [
        'start', 'end', 'status', 'discover', 'analyze', 'ai', 'template', 'clear', 'help', 'exit', 'quit'
    ];
    const analyzeSubs = ['security', 'performance', 'all'];
    const aiSubs = ['tools', 'route', 'prompt'];
    const templateSubs = ['list', 'generate', 'info'];
    const words = line.split(' ');
    const lastWord = words[words.length - 1];
    let completions = [];
    if (words.length === 1) {
        // Complete command names
        completions = commands.filter(cmd => cmd.startsWith(lastWord));
    }
    else if (words.length === 2) {
        const command = words[0];
        if (command === 'analyze') {
            completions = analyzeSubs.filter(sub => sub.startsWith(lastWord));
        }
        else if (command === 'ai') {
            completions = aiSubs.filter(sub => sub.startsWith(lastWord));
        }
        else if (command === 'start') {
            // Get project names for completion (simplified for now)
            try {
                const projects = context.sessionManager?.discoverProjects?.() || [];
                if (projects && projects.length) {
                    completions = projects
                        .map((p) => p.name)
                        .filter((name) => name.startsWith(lastWord));
                }
            }
            catch {
                // Fallback to no completions if project discovery fails
                completions = [];
            }
        }
    }
    return [completions, lastWord];
}
async function startInteractiveMode(context) {
    console.clear();
    displayWelcome();
    // Display initial status
    await displaySessionStatus(context);
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: (line) => getCompletions(line, context),
        prompt: chalk_1.default.cyan('SuperRez > ')
    });
    const commands = [
        'start', 'end', 'status', 'discover', 'analyze', 'ai', 'clear', 'help', 'exit', 'quit'
    ];
    rl.prompt();
    rl.on('line', async (input) => {
        const command = input.trim();
        if (!command) {
            rl.prompt();
            return;
        }
        const [cmd, ...args] = command.split(' ');
        if (cmd === 'exit' || cmd === 'quit' || cmd === 'q') {
            console.log(chalk_1.default.green('👋 Goodbye! SuperRez session ended.'));
            rl.close();
            return;
        }
        try {
            await executeCommand(cmd, args, context);
        }
        catch (error) {
            console.error(chalk_1.default.red('Error:'), error.message || error);
        }
        rl.prompt();
    });
    rl.on('close', () => {
        console.log(chalk_1.default.green('👋 SuperRez session ended.'));
        process.exit(0);
    });
    // Handle Ctrl+C gracefully
    rl.on('SIGINT', () => {
        console.log(chalk_1.default.yellow('\n⚠️  Use "exit" to quit SuperRez'));
        rl.prompt();
    });
}
function displayWelcome() {
    console.log(chalk_1.default.cyan.bold('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk_1.default.cyan.bold('║') + chalk_1.default.white.bold('               🚀 SuperRez Interactive Mode                   ') + chalk_1.default.cyan.bold('║'));
    console.log(chalk_1.default.cyan.bold('║') + chalk_1.default.gray('     Cost-aware AI development assistant CLI v1.0.0          ') + chalk_1.default.cyan.bold('║'));
    console.log(chalk_1.default.cyan.bold('╚══════════════════════════════════════════════════════════════╝'));
    console.log();
    console.log(chalk_1.default.yellow('📋 Available Commands:'));
    console.log(chalk_1.default.white('  start [project]     ') + chalk_1.default.gray('# Start development session'));
    console.log(chalk_1.default.white('  end                 ') + chalk_1.default.gray('# End session with AI prompt'));
    console.log(chalk_1.default.white('  status              ') + chalk_1.default.gray('# Show session and budget status'));
    console.log(chalk_1.default.white('  discover            ') + chalk_1.default.gray('# List available projects'));
    console.log(chalk_1.default.white('  analyze [type]      ') + chalk_1.default.gray('# Run local analysis (security/performance/all)'));
    console.log(chalk_1.default.white('  ai tools            ') + chalk_1.default.gray('# Show available AI tools'));
    console.log(chalk_1.default.white('  ai route <task>     ') + chalk_1.default.gray('# Get AI tool recommendation'));
    console.log(chalk_1.default.white('  ai prompt <request> ') + chalk_1.default.gray('# Generate smart prompt'));
    console.log(chalk_1.default.white('  ai execute <request>') + chalk_1.default.gray('# Execute AI request directly'));
    console.log(chalk_1.default.white('  template list       ') + chalk_1.default.gray('# List available templates'));
    console.log(chalk_1.default.white('  template generate   ') + chalk_1.default.gray('# Generate code from template'));
    console.log(chalk_1.default.white('  template info <name>') + chalk_1.default.gray('# Show template information'));
    console.log(chalk_1.default.white('  clear               ') + chalk_1.default.gray('# Clear screen'));
    console.log(chalk_1.default.white('  help                ') + chalk_1.default.gray('# Show this help'));
    console.log(chalk_1.default.white('  exit                ') + chalk_1.default.gray('# Exit interactive mode'));
    console.log();
    console.log(chalk_1.default.gray('💡 Tips:'));
    console.log(chalk_1.default.gray('   • Most operations are FREE through local analysis!'));
    console.log(chalk_1.default.gray('   • AI commands have 2s cooldown to prevent rate limiting'));
}
async function displaySessionStatus(context) {
    const spinner = (0, ora_1.default)('Loading session status...').start();
    try {
        const activeSession = context.sessionManager?.getActiveSession();
        const budget = await context.costTracker?.getCurrentUsage();
        spinner.stop();
        if (activeSession) {
            console.log(chalk_1.default.green('📁 Active Session'));
            console.log(chalk_1.default.white(`   Project: ${activeSession.projectName}`));
            console.log(chalk_1.default.gray(`   Path: ${activeSession.projectPath}`));
            console.log(chalk_1.default.gray(`   Started: ${new Date(activeSession.startTime).toLocaleString()}`));
        }
        else {
            console.log(chalk_1.default.yellow('📁 No Active Session'));
            console.log(chalk_1.default.gray('   Use "start" command to begin working on a project'));
        }
        if (budget) {
            const percentage = ((budget.limit - budget.spent) / budget.limit * 100);
            const color = percentage > 50 ? 'green' : percentage > 20 ? 'yellow' : 'red';
            console.log(chalk_1.default[color]('💰 Budget Status'));
            console.log(chalk_1.default.white(`   Spent: $${budget.spent.toFixed(2)} / $${budget.limit.toFixed(2)}`));
            console.log(chalk_1.default.gray(`   Remaining: ${percentage.toFixed(1)}% ($${budget.remaining.toFixed(2)})`));
        }
    }
    catch (error) {
        spinner.fail('Failed to load session status');
        console.error(chalk_1.default.red('Status error:'), error.message || error);
    }
}
async function executeCommand(cmd, args, context) {
    const spinner = (0, ora_1.default)();
    try {
        switch (cmd.toLowerCase()) {
            case 'start':
                await handleStart(args, context, spinner);
                break;
            case 'end':
                await handleEnd(context, spinner);
                break;
            case 'status':
                await handleStatus(context);
                break;
            case 'discover':
                await handleDiscover(context, spinner);
                break;
            case 'analyze':
                await handleAnalyze(args, context, spinner);
                break;
            case 'ai':
                await handleAI(args, context, spinner);
                break;
            case 'template':
                await handleTemplate(args, context, spinner);
                break;
            case 'clear':
                console.clear();
                displayWelcome();
                await displaySessionStatus(context);
                break;
            case 'help':
                displayWelcome();
                break;
            default:
                console.log(chalk_1.default.red(`❌ Unknown command: ${cmd}`));
                console.log(chalk_1.default.gray('   Type "help" to see available commands'));
        }
    }
    catch (error) {
        spinner.fail(`Command "${cmd}" failed`);
        throw error;
    }
}
async function handleStart(args, context, spinner) {
    spinner.start('Starting session...');
    try {
        const projectArg = args[0];
        await (0, session_1.startSession)(context.sessionManager, projectArg, {});
        spinner.succeed('Session started successfully');
        // Refresh status display
        await displaySessionStatus(context);
    }
    catch (error) {
        spinner.fail('Failed to start session');
        throw error;
    }
}
async function handleEnd(context, spinner) {
    const activeSession = context.sessionManager?.getActiveSession();
    if (!activeSession) {
        console.log(chalk_1.default.yellow('⚠️  No active session to end'));
        return;
    }
    spinner.start('Ending session and generating AI prompt...');
    try {
        await (0, session_1.endSession)(context.sessionManager, context.costTracker, {});
        spinner.succeed('Session ended successfully');
        // Refresh status display
        await displaySessionStatus(context);
    }
    catch (error) {
        spinner.fail('Failed to end session');
        throw error;
    }
}
async function handleStatus(context) {
    await displaySessionStatus(context);
}
async function handleDiscover(context, spinner) {
    spinner.start('Discovering projects...');
    try {
        await (0, session_1.discoverProjects)(context.sessionManager);
        spinner.stop();
    }
    catch (error) {
        spinner.fail('Failed to discover projects');
        throw error;
    }
}
async function handleAnalyze(args, context, spinner) {
    const type = args[0] || 'all';
    switch (type.toLowerCase()) {
        case 'security':
            spinner.start('Running security analysis...');
            await (0, security_1.analyzeSecurity)(context.securityScanner, context.sessionManager);
            spinner.succeed('Security analysis completed');
            break;
        case 'performance':
            spinner.start('Running performance analysis...');
            await (0, performance_1.analyzePerformance)(context.performanceAnalyzer, context.sessionManager);
            spinner.succeed('Performance analysis completed');
            break;
        case 'all':
            spinner.start('Running comprehensive analysis...');
            await (0, security_1.analyzeSecurity)(context.securityScanner, context.sessionManager);
            await (0, performance_1.analyzePerformance)(context.performanceAnalyzer, context.sessionManager);
            spinner.succeed('All analyses completed');
            break;
        default:
            console.log(chalk_1.default.red(`❌ Unknown analysis type: ${type}`));
            console.log(chalk_1.default.gray('   Available types: security, performance, all'));
    }
}
async function handleTemplate(args, context, spinner) {
    if (args.length === 0) {
        console.log(chalk_1.default.red('❌ Template command requires a subcommand'));
        console.log(chalk_1.default.gray('   Available: list, generate [name], info <name>'));
        return;
    }
    const subcommand = args[0];
    const subArgs = args.slice(1);
    try {
        switch (subcommand.toLowerCase()) {
            case 'list':
                spinner.start('Loading templates...');
                await (0, template_1.listTemplates)(context.templateEngine);
                spinner.stop();
                break;
            case 'generate':
                const templateName = subArgs[0];
                spinner.start('Generating from template...');
                await (0, template_1.generateFromTemplate)(context.templateEngine, context.sessionManager, templateName);
                spinner.stop();
                break;
            case 'info':
                if (subArgs.length === 0) {
                    console.log(chalk_1.default.red('❌ "template info" requires a template name'));
                    return;
                }
                const infoTemplateName = subArgs[0];
                await (0, template_1.showTemplateInfo)(context.templateEngine, infoTemplateName);
                break;
            default:
                console.log(chalk_1.default.red(`❌ Unknown template subcommand: ${subcommand}`));
                console.log(chalk_1.default.gray('   Available: list, generate [name], info <name>'));
        }
    }
    catch (error) {
        spinner.fail(`Template command failed`);
        console.error(chalk_1.default.red('Error:'), error.message || error);
    }
}
async function handleAI(args, context, spinner) {
    // Check rate limiting to prevent rapid AI command calls
    const now = Date.now();
    if (now - lastAICommandTime < AI_COMMAND_COOLDOWN) {
        const remaining = Math.ceil((AI_COMMAND_COOLDOWN - (now - lastAICommandTime)) / 1000);
        console.log(chalk_1.default.yellow(`⚠️  Please wait ${remaining}s before running another AI command`));
        console.log(chalk_1.default.gray('   This prevents rate limiting and 529 errors'));
        return;
    }
    lastAICommandTime = now;
    if (args.length === 0) {
        console.log(chalk_1.default.red('❌ AI command requires a subcommand'));
        console.log(chalk_1.default.gray('   Available: tools, route <task>, prompt <request>, execute <request>'));
        return;
    }
    const subcommand = args[0];
    const subArgs = args.slice(1);
    try {
        switch (subcommand.toLowerCase()) {
            case 'tools':
                spinner.start('Loading AI tools...');
                await (0, ai_1.showAITools)(context.aiOrchestrator);
                spinner.stop();
                break;
            case 'route':
                if (subArgs.length === 0) {
                    console.log(chalk_1.default.red('❌ "ai route" requires a task description'));
                    return;
                }
                const task = subArgs.join(' ');
                spinner.start('Finding optimal AI tool...');
                await (0, ai_1.routeTask)(context.aiOrchestrator, context.costTracker, task);
                spinner.stop();
                break;
            case 'prompt':
                if (subArgs.length === 0) {
                    console.log(chalk_1.default.red('❌ "ai prompt" requires a request description'));
                    return;
                }
                const request = subArgs.join(' ');
                spinner.start('Generating smart prompt...');
                await (0, ai_1.generatePrompt)(context.sessionManager, context.aiOrchestrator, context.costTracker, request);
                spinner.stop();
                break;
            case 'execute':
            case 'exec':
                if (subArgs.length === 0) {
                    console.log(chalk_1.default.red('❌ "ai execute" requires a request description'));
                    return;
                }
                const execRequest = subArgs.join(' ');
                await (0, ai_1.executeAIRequest)(context.sessionManager, context.aiOrchestrator, context.costTracker, execRequest);
                break;
            default:
                console.log(chalk_1.default.red(`❌ Unknown AI subcommand: ${subcommand}`));
                console.log(chalk_1.default.gray('   Available: tools, route <task>, prompt <request>, execute <request>'));
        }
    }
    catch (error) {
        spinner.fail(`AI command failed`);
        // Check for rate limiting errors
        if (error.message && (error.message.includes('529') ||
            error.message.includes('429') ||
            error.message.toLowerCase().includes('rate limit') ||
            error.message.toLowerCase().includes('too many requests'))) {
            console.log(chalk_1.default.yellow('⚠️  Rate limit detected. AI tool detection will retry in 30 seconds.'));
            console.log(chalk_1.default.gray('   Tip: Use "analyze" commands for FREE local analysis instead'));
        }
        else {
            console.error(chalk_1.default.red('Error:'), error.message || error);
        }
    }
}
//# sourceMappingURL=interactive.js.map