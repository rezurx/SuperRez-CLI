import { AIOrchestrator } from '../core/AIOrchestrator';
import { SessionManager } from '../core/SessionManager';
import { CostTracker } from '../core/CostTracker';
export declare function showAITools(aiOrchestrator: AIOrchestrator): Promise<void>;
export declare function routeTask(aiOrchestrator: AIOrchestrator, costTracker: CostTracker, task: string): Promise<void>;
export declare function generatePrompt(sessionManager: SessionManager, aiOrchestrator: AIOrchestrator, costTracker: CostTracker, request: string): Promise<void>;
export declare function executeAIRequest(sessionManager: SessionManager, aiOrchestrator: AIOrchestrator, costTracker: CostTracker, request: string, toolName?: string): Promise<void>;
