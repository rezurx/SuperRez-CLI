export interface Project {
    name: string;
    path: string;
    progressFile: string;
    type: 'detected' | 'manual';
    lastModified: Date;
}

export interface SessionData {
    projectName: string;
    projectPath: string;
    startTime: Date;
    context: ProjectContext;
}

export interface ProjectContext {
    fileStructure: string[];
    gitStatus?: string;
    recentChanges?: string[];
    dependencies?: string[];
    framework?: string;
    language?: string;
}

export interface AITool {
    name: string;
    available: boolean;
    costPerToken: number;
    strengths: string[];
    command?: string;
    setupInstructions?: string;
}

export interface SecurityIssue {
    file: string;
    line: number;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    type: string;
    message: string;
    suggestion: string;
}

export interface PerformanceIssue {
    file: string;
    line: number;
    type: string;
    severity: 'HIGH' | 'MEDIUM' | 'LOW';
    message: string;
    suggestion: string;
}

export interface BudgetInfo {
    limit: number;
    spent: number;
    remaining: number;
    monthlyReset: Date;
}

export interface TaskRoute {
    recommendedTool: AITool;
    alternatives: AITool[];
    estimatedCost: number;
    reasoning: string;
}

export interface Template {
    name: string;
    description: string;
    category: 'component' | 'api' | 'utility' | 'test' | 'config';
    language: string;
    framework?: string;
    template: string;
    variables: TemplateVariable[];
}

export interface TemplateVariable {
    name: string;
    type: 'string' | 'boolean' | 'array' | 'object';
    description: string;
    required: boolean;
    defaultValue?: any;
}

export interface SmartPrompt {
    prompt: string;
    context: string;
    estimatedTokens: number;
    estimatedCost: number;
    recommendedTool: string;
}

export interface CLIContext {
    sessionManager: any;
    securityScanner: any;
    performanceAnalyzer: any;
    aiOrchestrator: any;
    costTracker: any;
    configManager: any;
    templateEngine: any;
}