import { SessionManager } from '../core/SessionManager';
import { CostTracker } from '../core/CostTracker';
export declare function startSession(sessionManager: SessionManager, project?: string, options?: any): Promise<void>;
export declare function endSession(sessionManager: SessionManager, costTracker: CostTracker, options?: any): Promise<void>;
export declare function showStatus(sessionManager: SessionManager, costTracker: CostTracker): Promise<void>;
export declare function discoverProjects(sessionManager: SessionManager): Promise<void>;
