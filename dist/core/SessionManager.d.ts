import { Project, SessionData } from '../interfaces';
export declare class SessionManager {
    private configManager?;
    private activeSession;
    private sessionFile;
    private configDir;
    constructor(configManager?: any | undefined);
    discoverProjects(searchPath?: string): Promise<Project[]>;
    startSession(project: Project | string): Promise<void>;
    endSession(): Promise<string | null>;
    getActiveSession(): SessionData | null;
    cleanup(): Promise<void>;
    private findProgressFile;
    private gatherContext;
    private getFileStructure;
    private isRelevantFile;
    private detectProjectType;
    private getDependencies;
    private generatePrompt;
    private loadSession;
    private saveSession;
}
