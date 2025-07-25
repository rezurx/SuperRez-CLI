export interface PerformanceIssue {
    type: 'memory' | 'cpu' | 'io' | 'network' | 'bundle' | 'code-smell';
    severity: 'low' | 'medium' | 'high' | 'critical';
    file: string;
    line?: number;
    column?: number;
    message: string;
    description: string;
    suggestion: string;
    estimatedImpact: string;
}
export interface PerformanceResults {
    issues: PerformanceIssue[];
    filesScanned: number;
    duration: number;
    summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        totalIssues: number;
    };
    recommendations: string[];
}
export declare class PerformanceAnalyzer {
    private scanStartTime;
    private excludePaths;
    analyze(projectPath: string): Promise<PerformanceResults>;
    private scanDirectory;
    private shouldExclude;
    private shouldAnalyzeFile;
    private analyzeFile;
    private analyzeLine;
    private analyzeComplexity;
    private analyzeBundleSize;
    private analyzeDependencies;
    private generateSummary;
    formatResults(results: PerformanceResults): string;
}
