"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.showAITools = showAITools;
exports.routeTask = routeTask;
exports.generatePrompt = generatePrompt;
exports.executeAIRequest = executeAIRequest;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
async function showAITools(aiOrchestrator) {
    const spinner = (0, ora_1.default)('Detecting AI tools...').start();
    try {
        const summary = await aiOrchestrator.getSummary();
        spinner.stop();
        console.log(summary);
    }
    catch (error) {
        spinner.fail('Failed to detect AI tools');
        console.error(chalk_1.default.red(`Error: ${error}`));
    }
}
async function routeTask(aiOrchestrator, costTracker, task) {
    const spinner = (0, ora_1.default)(`Analyzing task: ${task}`).start();
    try {
        const route = await aiOrchestrator.routeTask(task);
        spinner.stop();
        console.log(chalk_1.default.cyan.bold('\n🎯 AI Tool Recommendation\n'));
        // Primary recommendation
        console.log(chalk_1.default.green('✅ Recommended Tool:'));
        const cost = route.recommendedTool.costPerToken === 0 ? 'FREE' : `$${route.estimatedCost.toFixed(3)}`;
        console.log(`  • ${chalk_1.default.bold(route.recommendedTool.name)} (${cost})`);
        console.log(`  • Strengths: ${route.recommendedTool.strengths.join(', ')}`);
        console.log(`  • Reasoning: ${route.reasoning}\n`);
        // Budget warning
        if (route.estimatedCost > 0) {
            const budget = await costTracker.getCurrentUsage();
            const percentOfBudget = (route.estimatedCost / budget.remaining) * 100;
            if (percentOfBudget > 10) {
                console.log(chalk_1.default.yellow(`⚠️  This task will use ${percentOfBudget.toFixed(1)}% of your remaining budget\n`));
            }
        }
        // Alternatives
        if (route.alternatives.length > 0) {
            console.log(chalk_1.default.blue('🔄 Alternative Tools:'));
            route.alternatives.forEach(tool => {
                const altCost = tool.costPerToken === 0 ? 'FREE' : `$${((task.length * 3 / 1000) * tool.costPerToken).toFixed(3)}`;
                console.log(`  • ${tool.name} (${altCost}) - ${tool.strengths.slice(0, 2).join(', ')}`);
            });
        }
        console.log(chalk_1.default.gray('\n💡 Tip: Use "superrez ai --prompt" to generate an optimized prompt'));
    }
    catch (error) {
        spinner.fail('Failed to route task');
        console.error(chalk_1.default.red(`Error: ${error}`));
    }
}
async function generatePrompt(sessionManager, aiOrchestrator, costTracker, request) {
    const spinner = (0, ora_1.default)('Generating context-aware prompt...').start();
    try {
        const activeSession = sessionManager.getActiveSession();
        if (!activeSession) {
            spinner.warn('No active session - generating basic prompt');
            console.log(chalk_1.default.yellow('\n⚠️  No active session. Start a session with "superrez start" for better context.\n'));
        }
        const result = await aiOrchestrator.generateContextPrompt(activeSession, request);
        spinner.stop();
        console.log(chalk_1.default.cyan.bold('\n📝 Smart Prompt Generated\n'));
        // Cost and tool info
        console.log(chalk_1.default.blue('📊 Prompt Info:'));
        console.log(`  • Estimated tokens: ${result.estimatedTokens}`);
        console.log(`  • Estimated cost: $${result.estimatedCost.toFixed(3)}`);
        console.log(`  • Recommended tool: ${result.recommendedTool}\n`);
        // Budget check
        const budget = await costTracker.getCurrentUsage();
        if (result.estimatedCost > budget.remaining) {
            console.log(chalk_1.default.red('❌ Warning: This prompt exceeds your remaining budget!'));
            console.log(chalk_1.default.yellow('💡 Consider using a free tool like Ollama or Local AI\n'));
        }
        // The actual prompt
        console.log(chalk_1.default.green('✅ Copy this prompt to your AI tool:\n'));
        console.log(chalk_1.default.dim('─'.repeat(60)));
        console.log(result.prompt);
        console.log(chalk_1.default.dim('─'.repeat(60)));
        console.log(chalk_1.default.gray('\n💡 Tips:'));
        console.log(chalk_1.default.gray('  • Copy the prompt above to your preferred AI tool'));
        console.log(chalk_1.default.gray('  • Use "superrez ai --route" to see tool recommendations'));
        console.log(chalk_1.default.gray('  • Local tools (Ollama) offer zero-cost alternatives'));
    }
    catch (error) {
        spinner.fail('Failed to generate prompt');
        console.error(chalk_1.default.red(`Error: ${error}`));
    }
}
async function executeAIRequest(sessionManager, aiOrchestrator, costTracker, request, toolName) {
    const spinner = (0, ora_1.default)('Processing AI request...').start();
    try {
        const activeSession = sessionManager.getActiveSession();
        // Generate context-aware prompt
        const promptResult = await aiOrchestrator.generateContextPrompt(activeSession, request);
        // Determine which tool to use
        const selectedTool = toolName || promptResult.recommendedTool;
        spinner.text = `Executing with ${selectedTool}...`;
        // Show cost estimation before execution
        console.log(`\n${chalk_1.default.yellow('💰 Cost Estimation:')}`);
        console.log(`   Tool: ${selectedTool}`);
        console.log(`   Estimated tokens: ${promptResult.estimatedTokens}`);
        console.log(`   Estimated cost: $${promptResult.estimatedCost.toFixed(4)}`);
        // Execute the AI command
        const result = await aiOrchestrator.executeAICommand(selectedTool, promptResult.prompt);
        if (result.success) {
            spinner.succeed(`AI request completed using ${selectedTool}`);
            // Display the response
            console.log('\n' + chalk_1.default.cyan.bold('🤖 AI Response:'));
            console.log(chalk_1.default.dim('─'.repeat(60)));
            console.log(result.output);
            console.log(chalk_1.default.dim('─'.repeat(60)));
            // Track the cost
            if (result.cost > 0) {
                await costTracker.addUsage(result.cost, `AI request via ${selectedTool}`);
                console.log(chalk_1.default.green(`\n💰 Actual cost: $${result.cost.toFixed(4)}`));
            }
            else {
                console.log(chalk_1.default.green('\n💰 Cost: FREE (Local execution)'));
            }
        }
        else {
            spinner.fail('AI request failed');
            console.error(chalk_1.default.red(`Error: ${result.error}`));
        }
    }
    catch (error) {
        spinner.fail('AI request failed');
        console.error(chalk_1.default.red(`Error: ${error}`));
    }
}
//# sourceMappingURL=ai.js.map