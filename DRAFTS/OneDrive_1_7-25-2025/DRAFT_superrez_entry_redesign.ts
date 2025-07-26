#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { SessionManager } from './core/SessionManager';
import { ConfigManager } from './core/ConfigManager';
import { AIOrchestrator } from './core/AIOrchestrator';
import { TemplateEngine } from './core/TemplateEngine';
import { SecurityScanner } from './core/SecurityScanner';
import { PerformanceAnalyzer } from './core/PerformanceAnalyzer';
import { startInteractiveMode } from './interactive/InteractiveMode';
import path from 'path';
import fs from 'fs';

const program = new Command();
const sessionManager = new SessionManager();
const configManager = new ConfigManager();
const aiOrchestrator = new AIOrchestrator();

// Version and description
program
  .name('superrez')
  .description('Enterprise-Grade AI CLI - Superior alternative to Claude Code CLI')
  .version('2.0.0');

// Main entry point - when no command is specified, start interactive mode
program
  .action(async () => {
    await startDirectMode();
  });

// Alternative explicit commands for specific actions
program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode explicitly')
  .action(async () => {
    await startInteractiveMode();
  });

program
  .command('analyze')
  .description('Run analysis on current directory')
  .option('--security', 'Run security analysis')
  .option('--performance', 'Run performance analysis')
  .option('--all', 'Run all analyses')
  .action(async (options) => {
    await runQuickAnalysis(options);
  });

program
  .command('template')
  .description('Generate code from templates')
  .action(async () => {
    await runTemplateGeneration();
  });

program
  .command('ai')
  .description('Direct AI interaction')
  .argument('[prompt...]', 'AI prompt to execute')
  .action(async (prompt) => {
    if (prompt && prompt.length > 0) {
      await runDirectAI(prompt.join(' '));
    } else {
      await runInteractiveAI();
    }
  });

async function startDirectMode() {
  console.log(chalk.cyan('🚀 SuperRez CLI v2.0.0'));
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
      await startInteractiveMode();
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

async function detectProjectContext(dir: string): Promise<{ isProject: boolean; type: string }> {
  const indicators = [
    { file: 'package.json', type: 'Node.js/JavaScript' },
    { file: 'requirements.txt', type: 'Python' },
    { file: 'Cargo.toml', type: 'Rust' },
    { file: 'go.mod', type: 'Go' },
    { file: 'pom.xml', type: 'Java/Maven' },
    { file: 'build.gradle', type: 'Java/Gradle' },
    { file: '.git', type: 'Git Repository' },
    { file: 'hardhat.config.js', type: 'Blockchain/Hardhat' },
    { file: 'truffle-config.js', type: 'Blockchain/Truffle' },
    { file: 'main.py', type: 'Python Script' },
    { file: 'main.js', type: 'JavaScript' },
    { file: 'index.js', type: 'JavaScript' },
    { file: 'src/', type: 'Source Code Project' },
    // Your progress tracking files
    { file: 'progress_tracker.md', type: 'SuperRez Project' },
    { file: 'claude_project_docs.md', type: 'Claude Project' },
    { file: 'final_progress_tracker.md', type: 'Completed Project' }
  ];

  for (const indicator of indicators) {
    const fullPath = path.join(dir, indicator.file);
    if (fs.existsSync(fullPath)) {
      return { isProject: true, type: indicator.type };
    }
  }

  return { isProject: false, type: 'Unknown' };
}

async function runQuickAnalysis(options: any) {
  console.log(chalk.cyan('🔍 Running Analysis...\n'));
  
  const scanner = new SecurityScanner();
  const analyzer = new PerformanceAnalyzer();
  
  if (options.security || options.all) {
    console.log(chalk.blue('🔒 Security Analysis'));
    const securityResults = await scanner.scanDirectory(process.cwd());
    displayResults('Security', securityResults);
  }
  
  if (options.performance || options.all) {
    console.log(chalk.blue('⚡ Performance Analysis'));
    const performanceResults = await analyzer.analyzeDirectory(process.cwd());
    displayResults('Performance', performanceResults);
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
  
  const templateEngine = new TemplateEngine();
  const templates = await templateEngine.listTemplates();
  
  const templateChoice = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: 'Choose a template:',
      choices: templates.map(t => ({ name: `${t.name} - ${t.description}`, value: t.name }))
    }
  ]);
  
  await templateEngine.generateFromTemplate(templateChoice.template);
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

async function runDirectAI(prompt: string) {
  console.log(chalk.cyan('🤖 Processing AI Request...\n'));
  
  // Get context from current session if available
  const context = await sessionManager.getCurrentContext();
  const fullPrompt = context ? `${context}\n\nUser request: ${prompt}` : prompt;
  
  try {
    const response = await aiOrchestrator.executePrompt(fullPrompt);
    console.log(chalk.white(response));
  } catch (error) {
    console.log(chalk.red('❌ Error executing AI request:'), error);
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
  
  await runDirectAI(promptInput.prompt);
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
      const config = await configManager.getConfig();
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
      await configManager.setConfig('monthlyBudget', budgetInput.budget);
      console.log(chalk.green(`✓ Monthly budget set to $${budgetInput.budget}`));
      break;
    case 'back':
      await startDirectMode();
      return;
    // Add other configuration options as needed
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

function displayResults(type: string, results: any) {
  console.log(chalk.white(`  Found ${results.issues?.length || 0} ${type.toLowerCase()} issues`));
  if (results.issues && results.issues.length > 0) {
    results.issues.slice(0, 3).forEach((issue: any, index: number) => {
      console.log(chalk.gray(`    ${index + 1}. ${issue.description}`));
    });
    if (results.issues.length > 3) {
      console.log(chalk.gray(`    ... and ${results.issues.length - 3} more`));
    }
  }
  console.log();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log(chalk.yellow('\n🛑 Shutting down gracefully...'));
  await sessionManager.endSession();
  process.exit(0);
});

program.parse();