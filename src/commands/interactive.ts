import readline from 'readline';
import chalk from 'chalk';
import path from 'path';
import { CLIContext } from '../interfaces';
import { analyzeSecurity } from './security';
import { analyzePerformance } from './performance';
import { executeAIRequest } from './ai';
import { listTemplates, generateFromTemplate } from './template';

export class InteractiveMode {
  private rl: readline.Interface;
  private context: CLIContext;
  private isRunning: boolean = false;

  constructor(context: CLIContext) {
    this.context = context;
    
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: this.getPrompt(),
      completer: this.completer.bind(this)
    });

    this.setupEventHandlers();
  }

  private getPrompt(): string {
    const currentDir = path.basename(process.cwd());
    const activeSession = this.context.sessionManager?.getActiveSession();
    
    // Get budget info synchronously (simplified for now)
    let budgetDisplay = '';
    try {
      budgetDisplay = ' [$50.00]';
    } catch (error) {
      budgetDisplay = ' [--]';
    }
    
    return chalk.cyan('SuperRez') + 
           chalk.gray(` (${activeSession?.projectName || currentDir})`) + 
           chalk.green(budgetDisplay) + 
           chalk.white(' > ');
  }

  private setupEventHandlers(): void {
    this.rl.on('line', async (input: string) => {
      const trimmedInput = input.trim();
      
      if (!trimmedInput) {
        this.rl.prompt();
        return;
      }

      await this.handleInput(trimmedInput);
      
      // Update prompt with latest info
      this.rl.setPrompt(this.getPrompt());
      this.rl.prompt();
    });

    this.rl.on('close', () => {
      console.log(chalk.gray('\nGoodbye! 👋'));
      process.exit(0);
    });

    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      console.log(chalk.yellow('\n\nUse "exit" or "quit" to leave, Ctrl+D to force quit'));
      this.rl.prompt();
    });
  }

  private completer(line: string): [string[], string] {
    const commands = [
      // Core commands
      'help', 'exit', 'quit', 'clear', 'status',
      
      // Analysis commands (FREE)
      'analyze', 'security', 'performance', 'scan',
      
      // Template commands (FREE)
      'template', 'generate', 'scaffold',
      
      // AI commands
      'ai', 'ask', 'explain', 'debug', 'refactor', 'optimize',
      
      // Project commands
      'project', 'session', 'context',
      
      // Configuration
      'config', 'budget', 'settings'
    ];

    const hits = commands.filter(cmd => cmd.startsWith(line));
    return [hits.length ? hits : commands, line];
  }

  public async start(): Promise<void> {
    this.isRunning = true;
    
    // Welcome message
    console.log(chalk.cyan.bold('🚀 SuperRez CLI v2.0.0'));
    console.log(chalk.gray('Enterprise-Grade AI Development Assistant'));
    console.log(chalk.gray('Type "help" for commands, or just start typing your request...\n'));

    // Auto-detect and setup session
    await this.autoSetupSession();

    this.rl.prompt();
  }

  private async autoSetupSession(): Promise<void> {
    const currentDir = process.cwd();
    const projectName = path.basename(currentDir);
    
    // Auto-start session without user intervention
    try {
      await this.context.sessionManager.startSession(currentDir);
      console.log(chalk.green(`📁 Session active: ${projectName}`));
      
      // Show budget status
      const budget = await this.context.costTracker?.getCurrentUsage();
      if (budget) {
        const remaining = budget.limit - budget.spent;
        const color = remaining > 20 ? 'green' : remaining > 5 ? 'yellow' : 'red';
        console.log(chalk[color](`💰 Budget: $${budget.spent.toFixed(2)}/$${budget.limit.toFixed(2)} (${((remaining / budget.limit) * 100).toFixed(1)}% remaining)\n`));
      }
    } catch (error) {
      console.log(chalk.yellow(`📂 Working in: ${projectName} (no session started)\n`));
    }
  }

  private async handleInput(input: string): Promise<void> {
    const parts = input.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (command) {
        case 'help':
        case '?':
          this.showHelp();
          break;

        case 'exit':
        case 'quit':
        case 'q':
          await this.context.sessionManager?.endSession();
          this.rl.close();
          break;

        case 'clear':
        case 'cls':
          console.clear();
          console.log(chalk.cyan.bold('🚀 SuperRez CLI v2.0.0'));
          break;

        case 'status':
          await this.showStatus();
          break;

        // Analysis commands (FREE)
        case 'analyze':
        case 'scan':
          await this.runAnalysis(args);
          break;

        case 'security':
          await this.runSecurityScan();
          break;

        case 'performance':
        case 'perf':
          await this.runPerformanceAnalysis();
          break;

        // Template commands (FREE)
        case 'template':
        case 'generate':
        case 'scaffold':
          await this.runTemplateGeneration(args);
          break;

        // AI commands
        case 'ai':
        case 'ask':
          await this.handleAIRequest(args.join(' '));
          break;

        case 'explain':
          await this.handleAIRequest(`Explain: ${args.join(' ')}`);
          break;

        case 'debug':
          await this.handleAIRequest(`Help me debug: ${args.join(' ')}`);
          break;

        case 'refactor':
          await this.handleAIRequest(`Suggest refactoring for: ${args.join(' ')}`);
          break;

        case 'optimize':
          await this.handleAIRequest(`How can I optimize: ${args.join(' ')}`);
          break;

        // Configuration
        case 'config':
        case 'settings':
          await this.showConfig();
          break;

        case 'budget':
          await this.showBudget();
          break;

        // Default: treat as AI request
        default:
          await this.handleAIRequest(input);
          break;
      }
    } catch (error) {
      console.log(chalk.red('❌ Error:'), error.message);
    }
  }

  private showHelp(): void {
    console.log(chalk.cyan.bold('\n📋 SuperRez CLI Commands\n'));
    
    console.log(chalk.white.bold('🆓 FREE Commands (Local Analysis):'));
    console.log(chalk.gray('  analyze, scan     - Run all analysis'));
    console.log(chalk.gray('  security          - Security vulnerability scan'));
    console.log(chalk.gray('  performance, perf - Performance analysis'));
    console.log(chalk.gray('  template, generate- Generate code from templates'));
    
    console.log(chalk.white.bold('\n🤖 AI Commands (Uses Budget):'));
    console.log(chalk.gray('  ask <question>    - Ask AI anything'));
    console.log(chalk.gray('  explain <code>    - Explain code or concept'));
    console.log(chalk.gray('  debug <issue>     - Get debugging help'));
    console.log(chalk.gray('  refactor <code>   - Get refactoring suggestions'));
    console.log(chalk.gray('  optimize <code>   - Get optimization advice'));
    
    console.log(chalk.white.bold('\n⚙️ Utility Commands:'));
    console.log(chalk.gray('  status            - Show session and budget status'));
    console.log(chalk.gray('  config, settings  - Show configuration'));
    console.log(chalk.gray('  budget            - Show budget details'));
    console.log(chalk.gray('  clear, cls        - Clear screen'));
    console.log(chalk.gray('  help, ?           - Show this help'));
    console.log(chalk.gray('  exit, quit, q     - Exit SuperRez'));
    
    console.log(chalk.yellow('\n💡 Pro Tip: You can type natural language requests directly!'));
    console.log(chalk.gray('   Example: "How do I optimize this React component?"'));
    console.log();
  }

  private async showStatus(): Promise<void> {
    const session = this.context.sessionManager?.getActiveSession();
    const budget = await this.context.costTracker?.getCurrentUsage();
    
    console.log(chalk.cyan('\n📊 SuperRez Status\n'));
    console.log(chalk.white(`📁 Project: ${session?.projectName || 'None'}`));
    console.log(chalk.white(`📍 Directory: ${process.cwd()}`));
    
    if (budget) {
      console.log(chalk.white(`💰 Budget Remaining: $${(budget.limit - budget.spent).toFixed(2)}`));
      console.log(chalk.white(`💸 Total Spent: $${budget.spent.toFixed(2)}`));
    }
    console.log();
  }

  private async runAnalysis(args: string[]): Promise<void> {
    console.log(chalk.cyan('🔍 Running Analysis...\n'));
    
    if (args.includes('--security') || args.length === 0) {
      console.log(chalk.blue('🔒 Security Analysis'));
      await analyzeSecurity(this.context.securityScanner, this.context.sessionManager);
    }
    
    if (args.includes('--performance') || args.length === 0) {
      console.log(chalk.blue('⚡ Performance Analysis'));
      await analyzePerformance(this.context.performanceAnalyzer, this.context.sessionManager);
    }
    
    console.log(chalk.green('✓ Analysis complete (100% FREE)\n'));
  }

  private async runSecurityScan(): Promise<void> {
    console.log(chalk.blue('🔒 Running Security Scan...\n'));
    await analyzeSecurity(this.context.securityScanner, this.context.sessionManager);
    console.log(chalk.green('✓ Security scan complete (100% FREE)\n'));
  }

  private async runPerformanceAnalysis(): Promise<void> {
    console.log(chalk.blue('⚡ Running Performance Analysis...\n'));
    await analyzePerformance(this.context.performanceAnalyzer, this.context.sessionManager);
    console.log(chalk.green('✓ Performance analysis complete (100% FREE)\n'));
  }

  private async runTemplateGeneration(args: string[]): Promise<void> {
    if (args.length === 0) {
      console.log(chalk.cyan('📝 Available Templates:\n'));
      await listTemplates(this.context.templateEngine);
      console.log(chalk.yellow('\nUsage: template <name> or generate <name>'));
      console.log();
    } else {
      const templateName = args[0];
      console.log(chalk.cyan(`📝 Generating template: ${templateName}...\n`));
      await generateFromTemplate(this.context.templateEngine, this.context.sessionManager, templateName);
      console.log(chalk.green('✓ Template generated successfully (100% FREE)\n'));
    }
  }

  private async handleAIRequest(prompt: string): Promise<void> {
    if (!prompt || prompt.trim().length === 0) {
      console.log(chalk.yellow('Please provide a prompt for the AI.\n'));
      return;
    }

    console.log(chalk.cyan('🤖 Processing AI request...\n'));
    
    try {
      await executeAIRequest(this.context.sessionManager, this.context.aiOrchestrator, this.context.costTracker, prompt);
      
      // Update budget display
      const budget = await this.context.costTracker?.getCurrentUsage();
      if (budget) {
        const remaining = budget.limit - budget.spent;
        console.log(chalk.gray(`💰 Budget remaining: $${remaining.toFixed(2)}\n`));
      }
      
    } catch (error) {
      console.log(chalk.red('❌ Error processing AI request:'), error.message);
      console.log();
    }
  }

  private async showConfig(): Promise<void> {
    console.log(chalk.cyan('⚙️ Configuration\n'));
    const config = this.context.configManager?.getAll();
    if (config) {
      console.log(chalk.white(JSON.stringify(config, null, 2)));
    }
    console.log();
  }

  private async showBudget(): Promise<void> {
    const budget = await this.context.costTracker?.getCurrentUsage();
    
    console.log(chalk.cyan('\n💰 Budget Status\n'));
    if (budget) {
      const remaining = budget.limit - budget.spent;
      console.log(chalk.white(`Total Budget: $${budget.limit.toFixed(2)}`));
      console.log(chalk.white(`Spent: $${budget.spent.toFixed(2)}`));
      console.log(chalk.white(`Remaining: $${remaining.toFixed(2)}`));
      
      const percentage = (remaining / budget.limit) * 100;
      const color = percentage > 50 ? 'green' : percentage > 20 ? 'yellow' : 'red';
      console.log(chalk[color](`Usage: ${(100 - percentage).toFixed(1)}%\n`));
    } else {
      console.log(chalk.gray('Budget information not available\n'));
    }
  }
}

// Export function to start interactive mode
export async function startInteractiveMode(context: CLIContext): Promise<void> {
  const interactive = new InteractiveMode(context);
  await interactive.start();
}