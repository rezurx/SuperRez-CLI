import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { AITool, TaskRoute } from '../interfaces';

const execAsync = promisify(exec);

export class AIOrchestrator {
    private availableTools: AITool[] = [];
    private detectionComplete: boolean = false;
    private lastDetectionTime: number = 0;
    private readonly DETECTION_COOLDOWN = 30000; // 30 seconds cooldown

    constructor() {
        this.initializeToolDefinitions();
    }

    private initializeToolDefinitions(): void {
        this.availableTools = [
            {
                name: 'Claude Code',
                available: false,
                costPerToken: 0.003,
                strengths: ['analysis', 'reasoning', 'code review', 'architecture'],
                command: 'claude',
                setupInstructions: 'Install Claude Code CLI from https://claude.ai/cli'
            },
            {
                name: 'Gemini CLI',
                available: false,
                costPerToken: 0.001,
                strengths: ['general purpose', 'fast responses', 'cost effective'],
                command: 'gemini',
                setupInstructions: 'Install Gemini CLI from Google AI Studio'
            },
            {
                name: 'GitHub Copilot CLI',
                available: false,
                costPerToken: 0.002,
                strengths: ['code completion', 'suggestions', 'inline help'],
                command: 'gh copilot',
                setupInstructions: 'Install with: gh extension install github/gh-copilot'
            },
            {
                name: 'Ollama',
                available: false,
                costPerToken: 0.0,
                strengths: ['privacy', 'offline', 'unlimited usage'],
                command: 'ollama',
                setupInstructions: 'Install Ollama from https://ollama.ai/'
            },
            {
                name: 'Kimi (Moonshot)',
                available: false,
                costPerToken: 0.0015,
                strengths: ['coding', 'algorithms', 'mathematical optimization'],
                command: './kimi',
                setupInstructions: 'Set MOONSHOT_API_KEY environment variable'
            },
            {
                name: 'Cursor',
                available: false,
                costPerToken: 0.002,
                strengths: ['IDE integration', 'context awareness', 'code editing'],
                command: 'cursor',
                setupInstructions: 'Install Cursor from https://cursor.sh/'
            },
            {
                name: 'Local AI (Mock)',
                available: true,
                costPerToken: 0.0,
                strengths: ['zero cost', 'privacy', 'instant response', 'testing'],
                command: 'mock-local',
                setupInstructions: 'Built-in - always available'
            }
        ];
    }

    async detectAvailableTools(): Promise<AITool[]> {
        const now = Date.now();
        
        // Check cooldown to prevent rapid retries after rate limiting
        if (this.detectionComplete && (now - this.lastDetectionTime) < this.DETECTION_COOLDOWN) {
            return this.availableTools.filter(tool => tool.available);
        }

        // If we hit rate limiting recently, return cached results
        if (this.detectionComplete) {
            return this.availableTools.filter(tool => tool.available);
        }

        console.log(chalk.gray('🔍 Detecting available AI tools...'));
        this.lastDetectionTime = now;

        for (const tool of this.availableTools) {
            if (tool.name === 'Local AI (Mock)') {
                continue; // Always available
            }

            try {
                let testCommand = '';
                
                switch (tool.command) {
                    case 'claude':
                        testCommand = 'claude --version';
                        break;
                    case 'gemini':
                        testCommand = 'gemini --version';
                        break;
                    case 'gh copilot':
                        testCommand = 'gh copilot --version';
                        break;
                    case 'ollama':
                        testCommand = 'ollama --version';
                        break;
                    case './kimi':
                        testCommand = './kimi --version';
                        break;
                    case 'cursor':
                        testCommand = 'cursor --version';
                        break;
                    default:
                        testCommand = `${tool.command} --version`;
                }

                await execAsync(testCommand, { timeout: 5000 });
                tool.available = true;
                console.log(chalk.green(`✓ ${tool.name} detected`));
            } catch (error: any) {
                tool.available = false;
                
                // Check for rate limiting errors (529, 429, etc.)
                if (error.message && (error.message.includes('529') || error.message.includes('429') || 
                    error.message.toLowerCase().includes('rate limit') || 
                    error.message.toLowerCase().includes('too many requests'))) {
                    console.log(chalk.yellow(`  ${tool.name} rate limited - will retry later`));
                    // Don't mark detection as complete if we hit rate limits
                    return this.availableTools.filter(tool => tool.available);
                } else {
                    console.log(chalk.gray(`  ${tool.name} not available`));
                }
            }
        }

        this.detectionComplete = true;
        return this.availableTools.filter(tool => tool.available);
    }

    async routeTask(taskDescription: string): Promise<TaskRoute> {
        const availableTools = await this.detectAvailableTools();
        
        if (availableTools.length === 0) {
            throw new Error('No AI tools available. Please install at least one AI tool.');
        }

        // Smart routing logic based on task type
        const taskLower = taskDescription.toLowerCase();
        
        let primaryTool: AITool;
        let alternatives: AITool[] = [];
        let reasoning = '';

        if (taskLower.includes('security') || taskLower.includes('vulnerability')) {
            // Security tasks: prefer analysis-focused tools
            primaryTool = this.findBestTool(availableTools, ['analysis', 'reasoning']) || availableTools[0];
            alternatives = availableTools.filter(t => t !== primaryTool && t.strengths.includes('analysis'));
            reasoning = 'Security analysis requires strong reasoning capabilities';
        } else if (taskLower.includes('performance') || taskLower.includes('optimize')) {
            // Performance tasks: prefer analysis tools
            primaryTool = this.findBestTool(availableTools, ['analysis', 'reasoning']) || availableTools[0];
            alternatives = availableTools.filter(t => t !== primaryTool);
            reasoning = 'Performance optimization requires analytical thinking';
        } else if (taskLower.includes('complete') || taskLower.includes('suggestion')) {
            // Code completion: prefer completion-focused tools
            primaryTool = this.findBestTool(availableTools, ['code completion', 'suggestions']) || availableTools[0];
            alternatives = availableTools.filter(t => t !== primaryTool);
            reasoning = 'Code completion task best suited for specialized completion tools';
        } else if (taskLower.includes('generate') || taskLower.includes('create')) {
            // Code generation: prefer cost-effective tools
            primaryTool = this.findCostEffectiveTool(availableTools) || availableTools[0];
            alternatives = availableTools.filter(t => t !== primaryTool);
            reasoning = 'Code generation optimized for cost-effectiveness';
        } else {
            // General tasks: prefer balanced cost/capability
            primaryTool = this.findBalancedTool(availableTools) || availableTools[0];
            alternatives = availableTools.filter(t => t !== primaryTool);
            reasoning = 'General task using balanced cost-capability tool';
        }

        const estimatedTokens = Math.max(100, taskDescription.length * 3);
        const estimatedCost = (estimatedTokens / 1000) * primaryTool.costPerToken;

        return {
            recommendedTool: primaryTool,
            alternatives: alternatives.slice(0, 3), // Top 3 alternatives
            estimatedCost,
            reasoning
        };
    }

    private findBestTool(tools: AITool[], preferredStrengths: string[]): AITool | undefined {
        return tools.find(tool => 
            preferredStrengths.some(strength => tool.strengths.includes(strength))
        );
    }

    private findCostEffectiveTool(tools: AITool[]): AITool | undefined {
        return tools.reduce((best, current) => 
            current.costPerToken < best.costPerToken ? current : best
        );
    }

    private findBalancedTool(tools: AITool[]): AITool | undefined {
        // Prefer mid-range cost tools with good general capabilities
        const midRangeTools = tools.filter(t => t.costPerToken > 0 && t.costPerToken <= 0.002);
        return midRangeTools.length > 0 ? midRangeTools[0] : tools[0];
    }

    async generateContextPrompt(sessionContext: any, request: string): Promise<{
        prompt: string;
        estimatedTokens: number;
        estimatedCost: number;
        recommendedTool: string;
    }> {
        const route = await this.routeTask(request);
        
        const contextString = this.buildContextString(sessionContext);
        
        // Enhanced prompt with better structure and guidance
        const prompt = `# SuperRez CLI Context-Aware Request

## Project Information
${contextString}

## User Request
${request}

## Task Context
- **Recommended AI Tool**: ${route.recommendedTool.name} (Cost: $${route.recommendedTool.costPerToken}/1K tokens)
- **Task Type**: ${this.categorizeRequest(request)}
- **Reasoning**: ${route.reasoning}

## Instructions
Please provide a comprehensive response that:
1. **Addresses the specific request** with actionable solutions
2. **Considers the project context** provided above
3. **Follows best practices** for the detected framework/language
4. **Includes code examples** where appropriate
5. **Suggests next steps** or follow-up actions

## Response Format
Please structure your response clearly with:
- **Summary**: Brief overview of the solution
- **Implementation**: Detailed steps or code
- **Considerations**: Important notes or warnings
- **Next Steps**: Recommended follow-up actions

---
*Generated by SuperRez CLI - Cost-optimized AI development assistant*`;
        
        const estimatedTokens = prompt.length / 4; // Rough estimation: ~4 chars per token
        const estimatedCost = (estimatedTokens / 1000) * route.recommendedTool.costPerToken;

        return {
            prompt,
            estimatedTokens: Math.ceil(estimatedTokens),
            estimatedCost,
            recommendedTool: route.recommendedTool.name
        };
    }

    private categorizeRequest(request: string): string {
        const requestLower = request.toLowerCase();
        
        if (requestLower.includes('security') || requestLower.includes('vulnerability')) {
            return 'Security Analysis';
        } else if (requestLower.includes('performance') || requestLower.includes('optimize')) {
            return 'Performance Optimization';
        } else if (requestLower.includes('test') || requestLower.includes('testing')) {
            return 'Testing & Quality Assurance';
        } else if (requestLower.includes('deploy') || requestLower.includes('ci/cd')) {
            return 'DevOps & Deployment';
        } else if (requestLower.includes('debug') || requestLower.includes('error') || requestLower.includes('bug')) {
            return 'Debugging & Troubleshooting';
        } else if (requestLower.includes('refactor') || requestLower.includes('clean')) {
            return 'Code Refactoring';
        } else if (requestLower.includes('api') || requestLower.includes('endpoint')) {
            return 'API Development';
        } else if (requestLower.includes('database') || requestLower.includes('sql')) {
            return 'Database Development';
        } else if (requestLower.includes('frontend') || requestLower.includes('ui') || requestLower.includes('component')) {
            return 'Frontend Development';
        } else if (requestLower.includes('backend') || requestLower.includes('server')) {
            return 'Backend Development';
        } else {
            return 'General Development';
        }
    }

    async executeAICommand(toolName: string, prompt: string): Promise<{
        success: boolean;
        output?: string;
        error?: string;
        cost: number;
    }> {
        const tool = this.availableTools.find(t => t.name === toolName || t.command === toolName);
        
        if (!tool || !tool.available) {
            return {
                success: false,
                error: `Tool '${toolName}' is not available`,
                cost: 0
            };
        }

        // For now, simulate AI tool execution
        // In a real implementation, this would make actual API calls or execute CLI commands
        try {
            const estimatedTokens = (prompt.length / 4) * 2; // Input + output estimation
            const cost = (estimatedTokens / 1000) * tool.costPerToken;

            // Mock response based on tool type
            let mockResponse = '';
            if (tool.name === 'Local AI (Mock)') {
                mockResponse = this.generateMockResponse(prompt);
            } else {
                mockResponse = `This would execute ${tool.name} with the provided prompt. Estimated cost: $${cost.toFixed(4)}`;
            }

            return {
                success: true,
                output: mockResponse,
                cost: cost
            };

        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Unknown error occurred',
                cost: 0
            };
        }
    }

    private generateMockResponse(prompt: string): string {
        // Simple mock response generator for testing
        const promptLower = prompt.toLowerCase();
        
        if (promptLower.includes('security')) {
            return `# Security Analysis Results

## Summary
Analyzed the provided context for security vulnerabilities and best practices.

## Key Findings
- Input validation recommendations
- Authentication/authorization considerations  
- Dependency security review needed

## Implementation
\`\`\`javascript
// Example security enhancement
const validateInput = (input) => {
  // Add proper validation logic
  return sanitize(input);
};
\`\`\`

## Next Steps
1. Run SuperRez security scanner: \`superrez analyze --security\`
2. Review authentication flows
3. Update dependencies to latest secure versions

*Note: This is a mock response from Local AI. Use actual AI tools for production analysis.*`;
        } else if (promptLower.includes('performance')) {
            return `# Performance Optimization Guide

## Summary
Performance analysis and optimization recommendations for your project.

## Key Areas
- Code efficiency improvements
- Bundle size optimization
- Database query optimization

## Implementation
\`\`\`javascript
// Example optimization
const optimizedFunction = useMemo(() => {
  return expensiveComputation(data);
}, [data]);
\`\`\`

## Next Steps
1. Run SuperRez performance analyzer: \`superrez analyze --performance\`
2. Profile critical code paths
3. Implement caching strategies

*Note: This is a mock response from Local AI. Use actual AI tools for production analysis.*`;
        } else {
            return `# Development Assistance

## Summary
General development guidance based on your request and project context.

## Recommendations
- Follow established patterns in your codebase
- Consider using SuperRez templates for consistency
- Implement proper error handling and logging

## Implementation
\`\`\`
// Your implementation here
// Following project conventions
\`\`\`

## Next Steps
1. Use SuperRez templates: \`superrez template list\`
2. Run comprehensive analysis: \`superrez analyze --all\`
3. Review code quality metrics

*Note: This is a mock response from Local AI. For detailed assistance, use actual AI tools.*`;
        }
    }

    private buildContextString(sessionContext: any): string {
        if (!sessionContext) {
            return 'No active session context';
        }

        let context = `Project: ${sessionContext.projectName || 'Unknown'}\n`;
        context += `Path: ${sessionContext.projectPath || 'Unknown'}\n`;
        
        if (sessionContext.context?.framework) {
            context += `Framework: ${sessionContext.context.framework}\n`;
        }
        
        if (sessionContext.context?.language) {
            context += `Language: ${sessionContext.context.language}\n`;
        }
        
        if (sessionContext.context?.fileStructure?.length > 0) {
            context += `\nKey Files:\n${sessionContext.context.fileStructure.slice(0, 20).join('\n')}\n`;
        }
        
        if (sessionContext.context?.recentChanges?.length > 0) {
            context += `\nRecent Changes:\n${sessionContext.context.recentChanges.join('\n')}\n`;
        }

        return context;
    }

    getAvailableTools(): AITool[] {
        return this.availableTools;
    }

    resetDetection(): void {
        this.detectionComplete = false;
        this.lastDetectionTime = 0;
        this.availableTools.forEach(tool => {
            if (tool.name !== 'Local AI (Mock)') {
                tool.available = false;
            }
        });
    }

    async getSummary(): Promise<string> {
        const available = await this.detectAvailableTools();
        const unavailable = this.availableTools.filter(t => !t.available);
        
        let summary = chalk.cyan.bold('🤖 AI Tools Status\n');
        
        if (available.length > 0) {
            summary += chalk.green('\n✅ Available Tools:\n');
            available.forEach(tool => {
                const cost = tool.costPerToken === 0 ? 'FREE' : `$${tool.costPerToken}/1K tokens`;
                summary += `  • ${chalk.bold(tool.name)} (${cost})\n`;
                summary += `    ${tool.strengths.join(', ')}\n`;
            });
        }
        
        if (unavailable.length > 0) {
            summary += chalk.yellow('\n⚠️  Unavailable Tools:\n');
            unavailable.forEach(tool => {
                summary += `  • ${chalk.dim(tool.name)}\n`;
                summary += `    ${chalk.dim(tool.setupInstructions)}\n`;
            });
        }

        return summary;
    }
}