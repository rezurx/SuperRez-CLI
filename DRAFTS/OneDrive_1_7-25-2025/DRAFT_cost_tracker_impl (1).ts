import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface CostEntry {
  timestamp: Date;
  amount: number;
  description: string;
  aiTool: string;
  tokens?: number;
}

export interface BudgetConfig {
  monthlyBudget: number;
  currentMonth: string;
  totalSpent: number;
  entries: CostEntry[];
}

export class CostTracker {
  private configPath: string;
  private budget: BudgetConfig;

  constructor() {
    this.configPath = path.join(os.homedir(), '.superrez', 'budget.json');
    this.budget = this.getDefaultBudget();
    this.loadBudget();
  }

  private getDefaultBudget(): BudgetConfig {
    return {
      monthlyBudget: 50.0,
      currentMonth: this.getCurrentMonth(),
      totalSpent: 0,
      entries: []
    };
  }

  private getCurrentMonth(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async checkBudget(estimatedCost: number): Promise<boolean> {
    await this.resetIfNewMonth();
    return (this.budget.totalSpent + estimatedCost) <= this.budget.monthlyBudget;
  }

  async recordCost(amount: number, description: string, aiTool: string, tokens?: number): Promise<void> {
    await this.resetIfNewMonth();
    
    const entry: CostEntry = {
      timestamp: new Date(),
      amount,
      description,
      aiTool,
      tokens
    };

    this.budget.entries.push(entry);
    this.budget.totalSpent += amount;
    
    await this.saveBudget();
  }

  getRemainingBudget(): number {
    return Math.max(0, this.budget.monthlyBudget - this.budget.totalSpent);
  }

  getTotalSpent(): number {
    return this.budget.totalSpent;
  }

  getMonthlyBudget(): number {
    return this.budget.monthlyBudget;
  }

  async setMonthlyBudget(amount: number): Promise<void> {
    this.budget.monthlyBudget = amount;
    await this.saveBudget();
  }

  getBudgetStatus(): { 
    total: number; 
    spent: number; 
    remaining: number; 
    percentage: number;
    entries: CostEntry[];
  } {
    const remaining = this.getRemainingBudget();
    const percentage = (this.budget.totalSpent / this.budget.monthlyBudget) * 100;
    
    return {
      total: this.budget.monthlyBudget,
      spent: this.budget.totalSpent,
      remaining,
      percentage,
      entries: [...this.budget.entries].reverse() // Most recent first
    };
  }

  // Cost estimation for different AI tools
  estimateCost(prompt: string, aiTool: string = 'claude'): number {
    const tokens = this.estimateTokens(prompt);
    
    const pricing = {
      'claude': { input: 0.003, output: 0.015 }, // per 1K tokens
      'gpt-4': { input: 0.030, output: 0.060 },
      'gpt-3.5': { input: 0.0015, output: 0.002 },
      'gemini': { input: 0.00025, output: 0.0005 },
      'ollama': { input: 0, output: 0 }, // Free local
      'mock': { input: 0, output: 0 } // Free mock responses
    };

    const tool = pricing[aiTool] || pricing['claude'];
    const inputCost = (tokens / 1000) * tool.input;
    const outputCost = (tokens / 1000) * tool.output; // Assume similar output length
    
    return inputCost + outputCost;
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  private async resetIfNewMonth(): Promise<void> {
    const currentMonth = this.getCurrentMonth();
    
    if (this.budget.currentMonth !== currentMonth) {
      // Archive previous month's data
      await this.archiveMonth(this.budget.currentMonth);
      
      // Reset for new month
      this.budget = {
        monthlyBudget: this.budget.monthlyBudget, // Keep same budget
        currentMonth,
        totalSpent: 0,
        entries: []
      };
      
      await this.saveBudget();
    }
  }

  private async archiveMonth(month: string): Promise<void> {
    try {
      const archivePath = path.join(os.homedir(), '.superrez', 'archive');
      await fs.ensureDir(archivePath);
      
      const archiveFile = path.join(archivePath, `budget-${month}.json`);
      await fs.writeJSON(archiveFile, this.budget, { spaces: 2 });
    } catch (error) {
      // Ignore archive errors
    }
  }

  private async loadBudget(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      
      if (await fs.pathExists(this.configPath)) {
        const data = await fs.readJSON(this.configPath);
        this.budget = {
          ...data,
          entries: data.entries.map((entry: any) => ({
            ...entry,
            timestamp: new Date(entry.timestamp)
          }))
        };
        
        // Check if we need to reset for new month
        await this.resetIfNewMonth();
      } else {
        // Create default budget file
        await this.saveBudget();
      }
    } catch (error) {
      // Use default budget if loading fails
      this.budget = this.getDefaultBudget();
    }
  }

  private async saveBudget(): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(this.configPath));
      await fs.writeJSON(this.configPath, this.budget, { spaces: 2 });
    } catch (error) {
      // Ignore save errors
    }
  }

  // Get cost breakdown by AI tool
  getCostBreakdown(): Record<string, { total: number; count: number; average: number }> {
    const breakdown: Record<string, { total: number; count: number; average: number }> = {};
    
    for (const entry of this.budget.entries) {
      if (!breakdown[entry.aiTool]) {
        breakdown[entry.aiTool] = { total: 0, count: 0, average: 0 };
      }
      
      breakdown[entry.aiTool].total += entry.amount;
      breakdown[entry.aiTool].count += 1;
    }
    
    // Calculate averages
    for (const tool in breakdown) {
      breakdown[tool].average = breakdown[tool].total / breakdown[tool].count;
    }
    
    return breakdown;
  }

  // Warning thresholds
  shouldWarnBudget(): boolean {
    const percentage = (this.budget.totalSpent / this.budget.monthlyBudget) * 100;
    return percentage >= 80; // Warn at 80%
  }

  shouldBlockBudget(): boolean {
    const percentage = (this.budget.totalSpent / this.budget.monthlyBudget) * 100;
    return percentage >= 95; // Block at 95%
  }
}