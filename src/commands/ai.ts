import chalk from 'chalk';
import ora from 'ora';
import { AIOrchestrator } from '../core/AIOrchestrator';
import { SessionManager } from '../core/SessionManager';
import { CostTracker } from '../core/CostTracker';

export async function showAITools(aiOrchestrator: AIOrchestrator): Promise<void> {
    const spinner = ora('Detecting AI tools...').start();
    
    try {
        const summary = await aiOrchestrator.getSummary();
        spinner.stop();
        console.log(summary);
    } catch (error) {
        spinner.fail('Failed to detect AI tools');
        console.error(chalk.red(`Error: ${error}`));
    }
}

export async function routeTask(aiOrchestrator: AIOrchestrator, costTracker: CostTracker, task: string): Promise<void> {
    const spinner = ora(`Analyzing task: ${task}`).start();
    
    try {
        const route = await aiOrchestrator.routeTask(task);
        spinner.stop();
        
        console.log(chalk.cyan.bold('\n🎯 AI Tool Recommendation\n'));
        
        // Primary recommendation
        console.log(chalk.green('✅ Recommended Tool:'));
        const cost = route.recommendedTool.costPerToken === 0 ? 'FREE' : `$${route.estimatedCost.toFixed(3)}`;
        console.log(`  • ${chalk.bold(route.recommendedTool.name)} (${cost})`);
        console.log(`  • Strengths: ${route.recommendedTool.strengths.join(', ')}`);
        console.log(`  • Reasoning: ${route.reasoning}\n`);
        
        // Budget warning
        if (route.estimatedCost > 0) {
            const budget = await costTracker.getCurrentUsage();
            const percentOfBudget = (route.estimatedCost / budget.remaining) * 100;
            
            if (percentOfBudget > 10) {
                console.log(chalk.yellow(`⚠️  This task will use ${percentOfBudget.toFixed(1)}% of your remaining budget\n`));
            }
        }
        
        // Alternatives
        if (route.alternatives.length > 0) {
            console.log(chalk.blue('🔄 Alternative Tools:'));
            route.alternatives.forEach(tool => {
                const altCost = tool.costPerToken === 0 ? 'FREE' : `$${((task.length * 3 / 1000) * tool.costPerToken).toFixed(3)}`;
                console.log(`  • ${tool.name} (${altCost}) - ${tool.strengths.slice(0, 2).join(', ')}`);
            });
        }
        
        console.log(chalk.gray('\n💡 Tip: Use "superrez ai --prompt" to generate an optimized prompt'));
        
    } catch (error) {
        spinner.fail('Failed to route task');
        console.error(chalk.red(`Error: ${error}`));
    }
}

export async function generatePrompt(sessionManager: SessionManager, aiOrchestrator: AIOrchestrator, costTracker: CostTracker, request: string): Promise<void> {
    const spinner = ora('Generating context-aware prompt...').start();
    
    try {
        const activeSession = sessionManager.getActiveSession();
        if (!activeSession) {
            spinner.warn('No active session - generating basic prompt');
            console.log(chalk.yellow('\n⚠️  No active session. Start a session with "superrez start" for better context.\n'));
        }
        
        const result = await aiOrchestrator.generateContextPrompt(activeSession, request);
        spinner.stop();
        
        console.log(chalk.cyan.bold('\n📝 Smart Prompt Generated\n'));
        
        // Cost and tool info
        console.log(chalk.blue('📊 Prompt Info:'));
        console.log(`  • Estimated tokens: ${result.estimatedTokens}`);
        console.log(`  • Estimated cost: $${result.estimatedCost.toFixed(3)}`);
        console.log(`  • Recommended tool: ${result.recommendedTool}\n`);
        
        // Budget check
        const budget = await costTracker.getCurrentUsage();
        if (result.estimatedCost > budget.remaining) {
            console.log(chalk.red('❌ Warning: This prompt exceeds your remaining budget!'));
            console.log(chalk.yellow('💡 Consider using a free tool like Ollama or Local AI\n'));
        }
        
        // The actual prompt
        console.log(chalk.green('✅ Copy this prompt to your AI tool:\n'));
        console.log(chalk.dim('─'.repeat(60)));
        console.log(result.prompt);
        console.log(chalk.dim('─'.repeat(60)));
        
        console.log(chalk.gray('\n💡 Tips:'));
        console.log(chalk.gray('  • Copy the prompt above to your preferred AI tool'));
        console.log(chalk.gray('  • Use "superrez ai --route" to see tool recommendations'));
        console.log(chalk.gray('  • Local tools (Ollama) offer zero-cost alternatives'));
        
    } catch (error) {
        spinner.fail('Failed to generate prompt');
        console.error(chalk.red(`Error: ${error}`));
    }
}

export async function executeAIRequest(sessionManager: SessionManager, aiOrchestrator: AIOrchestrator, costTracker: CostTracker, request: string, toolName?: string): Promise<void> {
    const spinner = ora('Processing AI request...').start();
    
    try {
        const activeSession = sessionManager.getActiveSession();
        
        // Generate context-aware prompt
        const promptResult = await aiOrchestrator.generateContextPrompt(activeSession, request);
        
        // Determine which tool to use
        const selectedTool = toolName || promptResult.recommendedTool;
        
        spinner.text = `Executing with ${selectedTool}...`;
        
        // Show cost estimation before execution
        console.log(`\n${chalk.yellow('💰 Cost Estimation:')}`);
        console.log(`   Tool: ${selectedTool}`);
        console.log(`   Estimated tokens: ${promptResult.estimatedTokens}`);
        console.log(`   Estimated cost: $${promptResult.estimatedCost.toFixed(4)}`);
        
        // Execute the AI command
        const result = await aiOrchestrator.executeAICommand(selectedTool, promptResult.prompt);
        
        if (result.success) {
            spinner.succeed(`AI request completed using ${selectedTool}`);
            
            // Display the response
            console.log('\n' + chalk.cyan.bold('🤖 AI Response:'));
            console.log(chalk.dim('─'.repeat(60)));
            console.log(result.output);
            console.log(chalk.dim('─'.repeat(60)));
            
            // Track the cost
            if (result.cost > 0) {
                await costTracker.addUsage(result.cost, `AI request via ${selectedTool}`);
                console.log(chalk.green(`\n💰 Actual cost: $${result.cost.toFixed(4)}`));
            } else {
                console.log(chalk.green('\n💰 Cost: FREE (Local execution)'));
            }
            
        } else {
            spinner.fail('AI request failed');
            console.error(chalk.red(`Error: ${result.error}`));
        }
        
    } catch (error) {
        spinner.fail('AI request failed');
        console.error(chalk.red(`Error: ${error}`));
    }
}