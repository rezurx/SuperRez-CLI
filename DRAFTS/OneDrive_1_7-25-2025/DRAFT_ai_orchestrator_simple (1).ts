import chalk from 'chalk';
import { CostTracker } from './CostTracker';

export interface AITool {
  name: string;
  description: string;
  costPerK: number;
  available: boolean;
  priority: number; // Lower = higher priority
}

export class AIOrchestrator {
  private costTracker: CostTracker;
  private availableTools: AITool[];

  constructor() {
    this.costTracker = new CostTracker();
    this.availableTools = [
      {
        name: 'mock',
        description: 'Mock AI responses for testing',
        costPerK: 0,
        available: true,
        priority: 1
      },
      {
        name: 'ollama',
        description: 'Local Ollama models (free)',
        costPerK: 0,
        available: false, // Would need to check if Ollama is installed
        priority: 2
      },
      {
        name: 'gemini',
        description: 'Google Gemini (cost-effective)',
        costPerK: 0.25,
        available: false, // Would need API key check
        priority: 3
      },
      {
        name: 'claude',
        description: 'Anthropic Claude (premium)',
        costPerK: 3.0,
        available: false, // Would need API key check
        priority: 4
      },
      {
        name: 'gpt-4',
        description: 'OpenAI GPT-4 (premium)',
        costPerK: 30.0,
        available: false, // Would need API key check
        priority: 5
      }
    ];
  }

  async executePrompt(prompt: string, preferredTool?: string): Promise<string> {
    const tool = this.selectBestTool(prompt, preferredTool);
    const estimatedCost = this.costTracker.estimateCost(prompt, tool.name);

    // Check budget before proceeding
    if (estimatedCost > 0) {
      const canAfford = await this.costTracker.checkBudget(estimatedCost);
      if (!canAfford) {
        throw new Error('Insufficient budget for this request');
      }

      // Warn if using expensive tool
      if (estimatedCost > 0.10) {
        console.log(chalk.yellow(`⚠️ This request will cost ~$${estimatedCost.toFixed(3)} using ${tool.name}`));
      }
    }

    try {
      const response = await this.callAI(prompt, tool);
      
      // Record actual cost (for now, use estimate)
      if (estimatedCost > 0) {
        await this.costTracker.recordCost(
          estimatedCost,
          `AI request via ${tool.name}`,
          tool.name
        );
      }

      return response;
    } catch (error) {
      throw new Error(`AI request failed: ${error.message}`);
    }
  }

  private selectBestTool(prompt: string, preferredTool?: string): AITool {
    // If user specified a preferred tool and it's available
    if (preferredTool) {
      const tool = this.availableTools.find(t => 
        t.name === preferredTool && t.available
      );
      if (tool) return tool;
    }

    // Otherwise, select best available tool by priority
    const availableTools = this.availableTools
      .filter(t => t.available)
      .sort((a, b) => a.priority - b.priority);

    if (availableTools.length === 0) {
      // Fallback to mock if nothing else available
      return this.availableTools.find(t => t.name === 'mock')!;
    }

    return availableTools[0];
  }

  private async callAI(prompt: string, tool: AITool): Promise<string> {
    switch (tool.name) {
      case 'mock':
        return this.generateMockResponse(prompt);
      
      case 'ollama':
        return this.callOllama(prompt);
      
      case 'gemini':
        return this.callGemini(prompt);
      
      case 'claude':
        return this.callClaude(prompt);
      
      case 'gpt-4':
        return this.callGPT4(prompt);
      
      default:
        throw new Error(`Unknown AI tool: ${tool.name}`);
    }
  }

  private generateMockResponse(prompt: string): string {
    // Generate intelligent mock responses based on prompt content
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('explain') || lowerPrompt.includes('what is')) {
      return this.getMockExplanation(prompt);
    }
    
    if (lowerPrompt.includes('debug') || lowerPrompt.includes('error') || lowerPrompt.includes('fix')) {
      return this.getMockDebuggingAdvice(prompt);
    }
    
    if (lowerPrompt.includes('optimize') || lowerPrompt.includes('improve') || lowerPrompt.includes('performance')) {
      return this.getMockOptimizationAdvice(prompt);
    }
    
    if (lowerPrompt.includes('refactor') || lowerPrompt.includes('restructure')) {
      return this.getMockRefactoringAdvice(prompt);
    }

    if (lowerPrompt.includes('memecoin') || lowerPrompt.includes('trading') || lowerPrompt.includes('crypto')) {
      return this.getMockCryptoAdvice(prompt);
    }

    // Default response
    return `I understand you're asking about: "${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}"\n\n` +
           `This is a mock response from SuperRez CLI. In the full version, I would:\n\n` +
           `• Analyze your request in detail\n` +
           `• Provide specific, actionable advice\n` +
           `• Include code examples if relevant\n` +
           `• Suggest best practices\n\n` +
           `To enable real AI responses, configure your API keys with:\n` +
           `superrez config --set geminiApiKey=your_key\n\n` +
           `💡 Pro tip: Use the FREE analysis commands like "analyze" or "security" for immediate value!`;
  }

  private getMockExplanation(prompt: string): string {
    return `Here's an explanation of your request:\n\n` +
           `**Overview:** This appears to be asking for clarification on a technical concept.\n\n` +
           `**Key Points:**\n` +
           `• The topic involves understanding core principles\n` +
           `• There are likely multiple approaches to consider\n` +
           `• Best practices should be followed\n\n` +
           `**Recommendation:** For detailed explanations, consider enabling real AI integration.\n\n` +
           `Use \`superrez config\` to set up your preferred AI tool.`;
  }

  private getMockDebuggingAdvice(prompt: string): string {
    return `🐛 **Debugging Analysis**\n\n` +
           `Based on your request, here's a systematic debugging approach:\n\n` +
           `**1. Problem Identification**\n` +
           `• Check logs for error messages\n` +
           `• Identify when the issue started\n` +
           `• Reproduce the issue consistently\n\n` +
           `**2. Common Solutions**\n` +
           `• Verify dependencies are installed\n` +
           `• Check environment variables\n` +
           `• Review recent changes\n\n` +
           `**3. Next Steps**\n` +
           `• Use \`superrez analyze\` for FREE code analysis\n` +
           `• Enable real AI for detailed debugging help\n\n` +
           `💡 The FREE security and performance analysis might catch your issue!`;
  }

  private getMockOptimizationAdvice(prompt: string): string {
    return `⚡ **Optimization Recommendations**\n\n` +
           `For optimization requests, I typically analyze:\n\n` +
           `**Performance Areas:**\n` +
           `• Algorithm efficiency (O notation)\n` +
           `• Memory usage patterns\n` +
           `• I/O operations and caching\n` +
           `• Database query optimization\n\n` +
           `**Quick Wins:**\n` +
           `• Use \`superrez performance\` for FREE analysis\n` +
           `• Profile your code to find bottlenecks\n` +
           `• Consider async/await for I/O operations\n\n` +
           `**Pro Tip:** The built-in performance analyzer can identify many issues without any cost!`;
  }

  private getMockRefactoringAdvice(prompt: string): string {
    return `🔧 **Refactoring Suggestions**\n\n` +
           `Good refactoring focuses on:\n\n` +
           `**Code Structure:**\n` +
           `• Single Responsibility Principle\n` +
           `• DRY (Don't Repeat Yourself)\n` +
           `• Clear naming conventions\n\n` +
           `**Recommended Approach:**\n` +
           `• Start with \`superrez analyze\` to identify issues\n` +
           `• Break large functions into smaller ones\n` +
           `• Extract common logic into utilities\n\n` +
           `**Templates Available:**\n` +
           `Use \`superrez template\` to see refactoring patterns and clean code templates.`;
  }

  private getMockCryptoAdvice(prompt: string): string {
    return `🚀 **Crypto/Trading Analysis**\n\n` +
           `For cryptocurrency and trading projects:\n\n` +
           `**Security First:**\n` +
           `• Never expose private keys\n` +
           `• Use testnet for development\n` +
           `• Implement proper error handling\n\n` +
           `**Trading Bot Best Practices:**\n` +
           `• Start with paper trading\n` +
           `• Implement risk management\n` +
           `• Monitor API rate limits\n\n` +
           `**Memecoin Specific:**\n` +
           `• High volatility requires careful position sizing\n` +
           `• Real-time data is crucial\n` +
           `• Consider slippage in calculations\n\n` +
           `💡 I can see this might be related to your memecoin_sniper project! Use real AI for detailed trading strategy advice.`;
  }

  private async callOllama(prompt: string): Promise<string> {
    // In a real implementation, this would call the local Ollama API
    throw new Error('Ollama integration not implemented yet');
  }

  private async callGemini(prompt: string): Promise<string> {
    // In a real implementation, this would call the Gemini API
    throw new Error('Gemini integration not implemented yet. Use `superrez config` to set up.');
  }

  private async callClaude(prompt: string): Promise<string> {
    // In a real implementation, this would call the Claude API
    throw new Error('Claude integration not implemented yet. Use `superrez config` to set up.');
  }

  private async callGPT4(prompt: string): Promise<string> {
    // In a real implementation, this would call the OpenAI API
    throw new Error('GPT-4 integration not implemented yet. Use `superrez config` to set up.');
  }

  // Utility methods
  getAvailableTools(): AITool[] {
    return [...this.availableTools];
  }

  async routeRequest(request: string): Promise<string> {
    const lowerRequest = request.toLowerCase();
    
    if (lowerRequest.includes('free') || lowerRequest.includes('local') || lowerRequest.includes('cost')) {
      return 'For cost-free analysis, use: analyze, security, performance, or template commands';
    }
    
    if (lowerRequest.includes('best') || lowerRequest.includes('cheapest')) {
      const available = this.availableTools.filter(t => t.available);
      if (available.length === 0) {
        return 'No AI tools configured. Use `superrez config` to set up API keys.';
      }
      
      const cheapest = available.reduce((prev, curr) => 
        prev.costPerK < curr.costPerK ? prev : curr
      );
      
      return `Best available tool: ${cheapest.name} (${cheapest.costPerK}/1K tokens)`;
    }
    
    return 'Use specific commands like "analyze", "template", or natural language requests.';
  }

  // Check if specific AI tools are available
  async checkAvailability(): Promise<{ [key: string]: boolean }> {
    const status: { [key: string]: boolean } = {};
    
    // Mock is always available
    status['mock'] = true;
    
    // Check for Ollama (would check if process is running)
    status['ollama'] = false; // await this.checkOllamaRunning();
    
    // Check for API keys (would check environment variables or config)
    status['gemini'] = false; // await this.checkGeminiKey();
    status['claude'] = false; // await this.checkClaudeKey();
    status['gpt-4'] = false; // await this.checkOpenAIKey();
    
    // Update availability in tools array
    this.availableTools.forEach(tool => {
      tool.available = status[tool.name] || false;
    });
    
    return status;
  }

  // Get routing suggestions for different types of requests
  getRoutingSuggestions(request: string): { tool: string; reason: string; cost: string }[] {
    const suggestions = [];
    
    // Always suggest free options first
    suggestions.push({
      tool: 'Free Analysis',
      reason: 'Use built-in security/performance scanners',
      cost: '$0.00'
    });
    
    if (this.availableTools.find(t => t.name === 'ollama' && t.available)) {
      suggestions.push({
        tool: 'Ollama (Local)',
        reason: 'Free local AI, good for general questions',
        cost: '$0.00'
      });
    }
    
    if (this.availableTools.find(t => t.name === 'gemini' && t.available)) {
      suggestions.push({
        tool: 'Gemini',
        reason: 'Cost-effective for most AI tasks',
        cost: '~$0.001'
      });
    }
    
    if (this.availableTools.find(t => t.name === 'claude' && t.available)) {
      suggestions.push({
        tool: 'Claude',
        reason: 'Premium quality, best for complex coding',
        cost: '~$0.01'
      });
    }
    
    return suggestions;
  }
}