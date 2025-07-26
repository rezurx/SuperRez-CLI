import readline from 'readline';
import chalk from 'chalk';
import { SessionManager } from '../core/SessionManager';
import { AIOrchestrator } from '../core/AIOrchestrator';
import { SecurityScanner } from '../core/SecurityScanner';
import { PerformanceAnalyzer } from '../core/PerformanceAnalyzer';
import { TemplateEngine } from '../core/TemplateEngine';
import { CostTracker } from '../core/CostTracker';
import path from 'path';

export class InteractiveMode {
  private rl: readline.Interface;
  private sessionManager: SessionManager;
  private aiOrchestrator: AIOrchestrator;
  private costTracker: CostTracker;
  private isRunning: boolean = false;

  constructor() {
    this.sessionManager = new SessionManager();
    this.aiOrchestrator = new AIOrchestrator();
    this.costTracker = new CostTracker();
    
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
    const budget = this.costTracker.getRemainingBudget();
    const budgetColor = budget > 20 ? 'green' : budget > 5 ? 'yellow' : 'red';
    
    return chalk.cyan('SuperRez') + 
           chalk.gray(` (${currentDir})`) + 
           chalk[budgetColor](` [$${budget.toFixed(2)}]`) + 
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
      
      // Update prompt with latest budget
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

    // Show budget status
    const budget = this.costTracker.getRemainingBudget();
    console.log(chalk.gray(`💰 Monthly Budget: $${budget.toFixed(2)} remaining\n`));

    this.rl.prompt();
  }

  private async autoSetupSession(): Promise<void> {
    const currentDir = process.cwd();
    const projectName = path.basename(currentDir);
    
    // Auto-start session without user intervention
    await this.sessionManager.startSession(currentDir);
    console.log(chalk.green(`📁 Session active: ${projectName}`));
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
          await this.sessionManager.endSession();
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
    const session = await this.sessionManager.getCurrentSession();
    const budget = this.costTracker.getRemainingBudget();
    const totalSpent = this.costTracker.getTotalSpent();
    
    console.log(chalk.cyan('\n📊 SuperRez Status\n'));
    console.log(chalk.white(`📁 Project: ${session?.projectName || 'None'}`));
    console.log(chalk.white(`📍 Directory: ${process.cwd()}`));
    console.log(chalk.white(`💰 Budget Remaining: $${budget.toFixed(2)}`));
    console.log(chalk.white(`💸 Total Spent: $${totalSpent.toFixed(2)}`));
    console.log();
  }

  private async runAnalysis(args: string[]): Promise<void> {
    console.log(chalk.cyan('🔍 Running Analysis...\n'));
    
    const scanner = new SecurityScanner();
    const analyzer = new PerformanceAnalyzer();
    
    if (args.includes('--security') || args.length === 0) {
      console.log(chalk.blue('🔒 Security Analysis'));
      const securityResults = await scanner.scanDirectory(process.cwd());
      this.displayAnalysisResults('Security', securityResults);
    }
    
    if (args.includes('--performance') || args.length === 0) {
      console.log(chalk.blue('⚡ Performance Analysis'));
      const performanceResults = await analyzer.analyzeDirectory(process.cwd());
      this.displayAnalysisResults('Performance', performanceResults);
    }
    
    console.log(chalk.green('✓ Analysis complete (100% FREE)\n'));
  }

  private async runSecurityScan(): Promise<void> {
    console.log(chalk.blue('🔒 Running Security Scan...\n'));
    const scanner = new SecurityScanner();
    const results = await scanner.scanDirectory(process.cwd());
    this.displayAnalysisResults('Security', results);
    console.log(chalk.green('✓ Security scan complete (100% FREE)\n'));
  }

  private async runPerformanceAnalysis(): Promise<void> {
    console.log(chalk.blue('⚡ Running Performance Analysis...\n'));
    const analyzer = new PerformanceAnalyzer();
    const results = await analyzer.analyzeDirectory(process.cwd());
    this.displayAnalysisResults('Performance', results);
    console.log(chalk.green('✓ Performance analysis complete (100% FREE)\n'));
  }

  private async runTemplateGeneration(args: string[]): Promise<void> {
    const templateEngine = new TemplateEngine();
    
    if (args.length === 0) {
      console.log(chalk.cyan('📝 Available Templates:\n'));
      const templates = await templateEngine.listTemplates();
      templates.forEach((template, index) => {
        console.log(chalk.white(`  ${index + 1}. ${template.name}`));
        console.log(chalk.gray(`     ${template.description}`));
      });
      console.log(chalk.yellow('\nUsage: template <name> or generate <name>'));
      console.log();
    } else {
      const templateName = args[0];
      console.log(chalk.cyan(`📝 Generating template: ${templateName}...\n`));
      await templateEngine.generateFromTemplate(templateName);
      console.log(chalk.green('✓ Template generated successfully (100% FREE)\n'));
    }
  }

  private async handleAIRequest(prompt: string): Promise<void> {
    if (!prompt || prompt.trim().length === 0) {
      console.log(chalk.yellow('Please provide a prompt for the AI.\n'));
      return;
    }

    // Check budget before making AI request
    const canAfford = await this.costTracker.checkBudget(0.01); // Estimate
    if (!canAfford) {
      console.log(chalk.red('❌ Insufficient budget for AI request.'));
      console.log(chalk.gray('Consider using FREE commands like "analyze" or "template"\n'));
      return;
    }

    console.log(chalk.cyan('🤖 Processing AI request...\n'));
    
    try {
      // Get current context
      const context = await this.sessionManager.getCurrentContext();
      const fullPrompt = context ? `${context}\n\nUser request: ${prompt}` : prompt;
      
      const response = await this.aiOrchestrator.executePrompt(fullPrompt);
      console.log(chalk.white(response));
      console.log();
      
      // Update budget display
      const remaining = this.costTracker.getRemainingBudget();
      console.log(chalk.gray(`💰 Budget remaining: $${remaining.toFixed(2)}\n`));
      
    } catch (error) {
      console.log(chalk.red('❌ Error processing AI request:'), error.message);
      console.log();
    }
  }

  private async showConfig(): Promise<void> {
    // Implementation depends on your ConfigManager
    console.log(chalk.cyan('⚙️ Configuration (placeholder)\n'));
  }

  private async showBudget(): Promise<void> {
    const remaining = this.costTracker.getRemainingBudget();
    const spent = this.costTracker.getTotalSpent();
    const total = remaining + spent;
    
    console.log(chalk.cyan('\n💰 Budget Status\n'));
    console.log(chalk.white(`Total Budget: $${total.toFixed(2)}`));
    console.log(chalk.white(`Spent: $${spent.toFixed(2)}`));
    console.log(chalk.white(`Remaining: $${remaining.toFixed(2)}`));
    
    const percentage = (remaining / total) * 100;
    const color = percentage > 50 ? 'green' : percentage > 20 ? 'yellow' : 'red';
    console.log(chalk[color](`Usage: ${(100 - percentage).toFixed(1)}%\n`));
  }

  private displayAnalysisResults(type: string, results: any): void {
    const count = results.issues?.length || 0;
    if (count === 0) {
      console.log(chalk.green(`  ✓ No ${type.toLowerCase()} issues found`));
    } else {
      console.log(chalk.yellow(`  ⚠️  Found ${count} ${type.toLowerCase()} issue${count > 1 ? 's' : ''}`));
      if (results.issues) {
        results.issues.slice(0, 3).forEach((issue: any, index: number) => {
          console.log(chalk.gray(`    ${index + 1}. ${issue.description}`));
        });
        if (count > 3) {
          console.log(chalk.gray(`    ... and ${count - 3} more`));
        }
      }
    }
    console.log();
  }
}

// Export function to start interactive mode
export async function startInteractiveMode(): Promise<void> {
  const interactive = new InteractiveMode();
  await interactive.start();
}