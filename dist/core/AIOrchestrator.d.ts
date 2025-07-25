import { AITool, TaskRoute } from '../interfaces';
export declare class AIOrchestrator {
    private availableTools;
    private detectionComplete;
    private lastDetectionTime;
    private readonly DETECTION_COOLDOWN;
    constructor();
    private initializeToolDefinitions;
    detectAvailableTools(): Promise<AITool[]>;
    routeTask(taskDescription: string): Promise<TaskRoute>;
    private findBestTool;
    private findCostEffectiveTool;
    private findBalancedTool;
    generateContextPrompt(sessionContext: any, request: string): Promise<{
        prompt: string;
        estimatedTokens: number;
        estimatedCost: number;
        recommendedTool: string;
    }>;
    private categorizeRequest;
    executeAICommand(toolName: string, prompt: string): Promise<{
        success: boolean;
        output?: string;
        error?: string;
        cost: number;
    }>;
    private generateMockResponse;
    private buildContextString;
    getAvailableTools(): AITool[];
    resetDetection(): void;
    getSummary(): Promise<string>;
}
