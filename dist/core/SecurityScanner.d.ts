import { SecurityIssue } from '../interfaces';
export interface SecurityResults {
    timestamp: string;
    issues: SecurityIssue[];
    filesScanned: number;
    duration: number;
}
export declare class SecurityScanner {
    private scanStartTime;
    scan(projectPath: string): Promise<SecurityResults>;
    private findFiles;
    private scanFile;
    private checkSecrets;
    private checkSQLInjection;
    private checkXSS;
    private checkWeakCrypto;
    private checkPathTraversal;
    getSummary(results: SecurityResults): string;
}
