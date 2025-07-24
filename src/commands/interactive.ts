import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import * as readline from 'readline';
import { CLIContext, Project, SessionData, BudgetInfo } from '../interfaces';
import { startSession, endSession, showStatus, discoverProjects } from './session';
import { analyzeSecurity } from './security';
import { analyzePerformance } from './performance';
import { showAITools, generatePrompt, routeTask } from './ai';

interface REPLCommand {
    name: string;
    description: string;
    aliases?: string[];
    handler: (args: string[], context: CLIContext) => Promise<void>;
}

function getCompletions(line: string, context: CLIContext): [string[], string] {
    const commands = [
        'start', 'end', 'status', 'discover', 'analyze', 'ai', 'clear', 'help', 'exit', 'quit'
    ];
    
    const analyzeSubs = ['security', 'performance', 'all'];
    const aiSubs = ['tools', 'route', 'prompt'];
    
    const words = line.split(' ');
    const lastWord = words[words.length - 1];
    
    let completions: string[] = [];
    
    if (words.length === 1) {
        // Complete command names
        completions = commands.filter(cmd => cmd.startsWith(lastWord));
    } else if (words.length === 2) {
        const command = words[0];
        if (command === 'analyze') {
            completions = analyzeSubs.filter(sub => sub.startsWith(lastWord));
        } else if (command === 'ai') {
            completions = aiSubs.filter(sub => sub.startsWith(lastWord));
        } else if (command === 'start') {
            // Get project names for completion (simplified for now)
            try {
                const projects = context.sessionManager?.discoverProjects?.() || [];
                if (projects && projects.length) {
                    completions = projects
                        .map((p: any) => p.name)
                        .filter((name: string) => name.startsWith(lastWord));
                }
            } catch {
                // Fallback to no completions if project discovery fails
                completions = [];
            }
        }
    }
    
    return [completions, lastWord];
}

export async function startInteractiveMode(context: CLIContext): Promise<void> {
    console.clear();
    displayWelcome();
    
    // Display initial status
    await displaySessionStatus(context);
    
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
        completer: (line: string) => getCompletions(line, context),
        prompt: chalk.cyan('SuperRez > ')
    });
    
    const commands = [
        'start', 'end', 'status', 'discover', 'analyze', 'ai', 'clear', 'help', 'exit', 'quit'
    ];
    
    rl.prompt();
    
    rl.on('line', async (input: string) => {
        const command = input.trim();
        
        if (!command) {
            rl.prompt();
            return;
        }
        
        const [cmd, ...args] = command.split(' ');
        
        if (cmd === 'exit' || cmd === 'quit' || cmd === 'q') {
            console.log(chalk.green('👋 Goodbye! SuperRez session ended.'));
            rl.close();
            return;
        }
        
        try {
            await executeCommand(cmd, args, context);
        } catch (error: any) {
            console.error(chalk.red('Error:'), error.message || error);
        }
        
        rl.prompt();
    });
    
    rl.on('close', () => {
        console.log(chalk.green('👋 SuperRez session ended.'));
        process.exit(0);
    });
    
    // Handle Ctrl+C gracefully
    rl.on('SIGINT', () => {
        console.log(chalk.yellow('\n⚠️  Use "exit" to quit SuperRez'));
        rl.prompt();
    });
}

function displayWelcome(): void {
    console.log(chalk.cyan.bold('╔══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║') + chalk.white.bold('               🚀 SuperRez Interactive Mode                   ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('║') + chalk.gray('     Cost-aware AI development assistant CLI v1.0.0          ') + chalk.cyan.bold('║'));
    console.log(chalk.cyan.bold('╚══════════════════════════════════════════════════════════════╝'));
    console.log();
    console.log(chalk.yellow('📋 Available Commands:'));
    console.log(chalk.white('  start [project]     ') + chalk.gray('# Start development session'));
    console.log(chalk.white('  end                 ') + chalk.gray('# End session with AI prompt'));
    console.log(chalk.white('  status              ') + chalk.gray('# Show session and budget status'));
    console.log(chalk.white('  discover            ') + chalk.gray('# List available projects'));
    console.log(chalk.white('  analyze [type]      ') + chalk.gray('# Run local analysis (security/performance/all)'));
    console.log(chalk.white('  ai tools            ') + chalk.gray('# Show available AI tools'));
    console.log(chalk.white('  ai route <task>     ') + chalk.gray('# Get AI tool recommendation'));
    console.log(chalk.white('  ai prompt <request> ') + chalk.gray('# Generate smart prompt'));
    console.log(chalk.white('  clear               ') + chalk.gray('# Clear screen'));
    console.log(chalk.white('  help                ') + chalk.gray('# Show this help'));
    console.log(chalk.white('  exit                ') + chalk.gray('# Exit interactive mode'));
    console.log();
    console.log(chalk.gray('💡 Tip: Most operations are FREE through local analysis!'));
}

async function displaySessionStatus(context: CLIContext): Promise<void> {
    const spinner = ora('Loading session status...').start();
    
    try {
        const activeSession = context.sessionManager?.getActiveSession();
        const budget = await context.costTracker?.getCurrentUsage();
        
        spinner.stop();
        
        if (activeSession) {
            console.log(chalk.green('📁 Active Session'));
            console.log(chalk.white(`   Project: ${activeSession.projectName}`));
            console.log(chalk.gray(`   Path: ${activeSession.projectPath}`));
            console.log(chalk.gray(`   Started: ${new Date(activeSession.startTime).toLocaleString()}`));
        } else {
            console.log(chalk.yellow('📁 No Active Session'));
            console.log(chalk.gray('   Use "start" command to begin working on a project'));
        }
        
        if (budget) {
            const percentage = ((budget.limit - budget.spent) / budget.limit * 100);
            const color = percentage > 50 ? 'green' : percentage > 20 ? 'yellow' : 'red';
            console.log(chalk[color]('💰 Budget Status'));
            console.log(chalk.white(`   Spent: $${budget.spent.toFixed(2)} / $${budget.limit.toFixed(2)}`));
            console.log(chalk.gray(`   Remaining: ${percentage.toFixed(1)}% ($${budget.remaining.toFixed(2)})`));
        }
        
    } catch (error: any) {
        spinner.fail('Failed to load session status');
        console.error(chalk.red('Status error:'), error.message || error);
    }
}

async function executeCommand(cmd: string, args: string[], context: CLIContext): Promise<void> {
    const spinner = ora();
    
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
                
            case 'clear':
                console.clear();
                displayWelcome();
                await displaySessionStatus(context);
                break;
                
            case 'help':
                displayWelcome();
                break;
                
            default:
                console.log(chalk.red(`❌ Unknown command: ${cmd}`));
                console.log(chalk.gray('   Type "help" to see available commands'));
        }
    } catch (error) {
        spinner.fail(`Command "${cmd}" failed`);
        throw error;
    }
}

async function handleStart(args: string[], context: CLIContext, spinner: ora.Ora): Promise<void> {
    spinner.start('Starting session...');
    
    try {
        const projectArg = args[0];
        await startSession(context.sessionManager, projectArg, {});
        spinner.succeed('Session started successfully');
        
        // Refresh status display
        await displaySessionStatus(context);
    } catch (error) {
        spinner.fail('Failed to start session');
        throw error;
    }
}

async function handleEnd(context: CLIContext, spinner: ora.Ora): Promise<void> {
    const activeSession = context.sessionManager?.getActiveSession();
    if (!activeSession) {
        console.log(chalk.yellow('⚠️  No active session to end'));
        return;
    }
    
    spinner.start('Ending session and generating AI prompt...');
    
    try {
        await endSession(context.sessionManager, context.costTracker, {});
        spinner.succeed('Session ended successfully');
        
        // Refresh status display
        await displaySessionStatus(context);
    } catch (error) {
        spinner.fail('Failed to end session');
        throw error;
    }
}

async function handleStatus(context: CLIContext): Promise<void> {
    await displaySessionStatus(context);
}

async function handleDiscover(context: CLIContext, spinner: ora.Ora): Promise<void> {
    spinner.start('Discovering projects...');
    
    try {
        await discoverProjects(context.sessionManager);
        spinner.stop();
    } catch (error) {
        spinner.fail('Failed to discover projects');
        throw error;
    }
}

async function handleAnalyze(args: string[], context: CLIContext, spinner: ora.Ora): Promise<void> {
    const type = args[0] || 'all';
    
    switch (type.toLowerCase()) {
        case 'security':
            spinner.start('Running security analysis...');
            await analyzeSecurity(context.securityScanner, context.sessionManager);
            spinner.succeed('Security analysis completed');
            break;
            
        case 'performance':
            spinner.start('Running performance analysis...');
            await analyzePerformance(context.performanceAnalyzer, context.sessionManager);
            spinner.succeed('Performance analysis completed');
            break;
            
        case 'all':
            spinner.start('Running comprehensive analysis...');
            await analyzeSecurity(context.securityScanner, context.sessionManager);
            await analyzePerformance(context.performanceAnalyzer, context.sessionManager);
            spinner.succeed('All analyses completed');
            break;
            
        default:
            console.log(chalk.red(`❌ Unknown analysis type: ${type}`));
            console.log(chalk.gray('   Available types: security, performance, all'));
    }
}

async function handleAI(args: string[], context: CLIContext, spinner: ora.Ora): Promise<void> {
    if (args.length === 0) {
        console.log(chalk.red('❌ AI command requires a subcommand'));
        console.log(chalk.gray('   Available: tools, route <task>, prompt <request>'));
        return;
    }
    
    const subcommand = args[0];
    const subArgs = args.slice(1);
    
    switch (subcommand.toLowerCase()) {
        case 'tools':
            spinner.start('Loading AI tools...');
            await showAITools(context.aiOrchestrator);
            spinner.stop();
            break;
            
        case 'route':
            if (subArgs.length === 0) {
                console.log(chalk.red('❌ "ai route" requires a task description'));
                return;
            }
            const task = subArgs.join(' ');
            spinner.start('Finding optimal AI tool...');
            await routeTask(context.aiOrchestrator, context.costTracker, task);
            spinner.stop();
            break;
            
        case 'prompt':
            if (subArgs.length === 0) {
                console.log(chalk.red('❌ "ai prompt" requires a request description'));
                return;
            }
            const request = subArgs.join(' ');
            spinner.start('Generating smart prompt...');
            await generatePrompt(context.sessionManager, context.aiOrchestrator, context.costTracker, request);
            spinner.stop();
            break;
            
        default:
            console.log(chalk.red(`❌ Unknown AI subcommand: ${subcommand}`));
            console.log(chalk.gray('   Available: tools, route <task>, prompt <request>'));
    }
}