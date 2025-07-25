import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import chalk from 'chalk';

const readdir = promisify(fs.readdir);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);

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

export class PerformanceAnalyzer {
    private scanStartTime: number = 0;
    private excludePaths = [
        'node_modules',
        '.git',
        'dist',
        'build',
        'coverage',
        '.next',
        'out',
        'tmp',
        'temp',
        '.cache'
    ];

    async analyze(projectPath: string): Promise<PerformanceResults> {
        this.scanStartTime = Date.now();
        
        const results: PerformanceResults = {
            issues: [],
            filesScanned: 0,
            duration: 0,
            summary: { critical: 0, high: 0, medium: 0, low: 0, totalIssues: 0 },
            recommendations: []
        };

        try {
            // Scan project files
            await this.scanDirectory(projectPath, projectPath, results);
            
            // Analyze bundle and dependency issues
            await this.analyzeBundleSize(projectPath, results);
            await this.analyzeDependencies(projectPath, results);
            
            // Generate summary
            this.generateSummary(results);
            results.duration = Date.now() - this.scanStartTime;

        } catch (error) {
            console.error('Performance analysis error:', error);
        }

        return results;
    }

    private async scanDirectory(dirPath: string, rootPath: string, results: PerformanceResults): Promise<void> {
        try {
            const entries = await readdir(dirPath, { withFileTypes: true });
            
            for (const entry of entries) {
                const fullPath = path.join(dirPath, entry.name);
                const relativePath = path.relative(rootPath, fullPath);
                
                // Skip excluded directories
                if (entry.isDirectory()) {
                    if (!this.shouldExclude(entry.name, relativePath)) {
                        await this.scanDirectory(fullPath, rootPath, results);
                    }
                } else if (entry.isFile()) {
                    if (this.shouldAnalyzeFile(entry.name)) {
                        await this.analyzeFile(fullPath, relativePath, results);
                        results.filesScanned++;
                    }
                }
            }
        } catch (error) {
            // Skip directories we can't read
        }
    }

    private shouldExclude(name: string, relativePath: string): boolean {
        return this.excludePaths.some(exclude => 
            name === exclude || relativePath.startsWith(exclude + path.sep)
        );
    }

    private shouldAnalyzeFile(filename: string): boolean {
        const ext = path.extname(filename).toLowerCase();
        const performanceRelevantExtensions = [
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
            '.py', '.java', '.go', '.rb', '.php', '.cs',
            '.cpp', '.c', '.h', '.swift', '.kt', '.rs',
            '.json', '.yaml', '.yml', '.sql'
        ];
        return performanceRelevantExtensions.includes(ext);
    }

    private async analyzeFile(filePath: string, relativePath: string, results: PerformanceResults): Promise<void> {
        try {
            const content = await readFile(filePath, 'utf8');
            const lines = content.split('\n');
            const fileStats = await stat(filePath);
            
            // File size analysis
            if (fileStats.size > 1024 * 1024) { // > 1MB
                results.issues.push({
                    type: 'bundle',
                    severity: fileStats.size > 5 * 1024 * 1024 ? 'critical' : 'high',
                    file: relativePath,
                    message: `Large file size: ${Math.round(fileStats.size / 1024)}KB`,
                    description: 'Large files can slow down loading and compilation',
                    suggestion: 'Consider splitting into smaller modules or lazy loading',
                    estimatedImpact: 'Bundle size and load time impact'
                });
            }

            // Line-by-line analysis
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNumber = i + 1;
                
                await this.analyzeLine(line, lineNumber, relativePath, results);
            }

            // Function and complexity analysis
            this.analyzeComplexity(content, relativePath, results);
            
        } catch (error) {
            // Skip files we can't read
        }
    }

    private async analyzeLine(line: string, lineNumber: number, filePath: string, results: PerformanceResults): Promise<void> {
        const trimmedLine = line.trim();
        
        // Database query issues
        const sqlPatterns = [
            { pattern: /SELECT\s+\*\s+FROM/i, desc: 'SELECT * queries can be inefficient' },
            { pattern: /WHERE.*LIKE\s+['"][^'"]*%/i, desc: 'Leading wildcard LIKE queries are slow' },
            { pattern: /(?:JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN)(?![^(]*\))/gi, desc: 'Multiple JOINs can impact performance' }
        ];

        for (const { pattern, desc } of sqlPatterns) {
            if (pattern.test(trimmedLine)) {
                results.issues.push({
                    type: 'io',
                    severity: 'medium',
                    file: filePath,
                    line: lineNumber,
                    message: desc,
                    description: 'Database query optimization needed',
                    suggestion: 'Optimize query structure and indexing',
                    estimatedImpact: 'Database performance impact'
                });
            }
        }

        // Memory leak patterns
        const memoryPatterns = [
            { pattern: /setInterval|setTimeout/, desc: 'Timer not cleared', type: 'memory' },
            { pattern: /addEventListener/, desc: 'Event listener not removed', type: 'memory' },
            { pattern: /new\s+Array\(\d{4,}\)/, desc: 'Large array allocation', type: 'memory' }
        ];

        for (const { pattern, desc, type } of memoryPatterns) {
            if (pattern.test(trimmedLine)) {
                results.issues.push({
                    type: type as any,
                    severity: 'medium',
                    file: filePath,
                    line: lineNumber,
                    message: desc,
                    description: 'Potential memory leak or excessive allocation',
                    suggestion: 'Ensure proper cleanup and resource management',
                    estimatedImpact: 'Memory usage impact'
                });
            }
        }

        // CPU-intensive patterns
        const cpuPatterns = [
            { pattern: /for\s*\([^)]*\)\s*{\s*for\s*\([^)]*\)\s*{\s*for/, desc: 'Triple nested loop detected' },
            { pattern: /while\s*\(\s*true\s*\)/, desc: 'Infinite loop detected' },
            { pattern: /\.sort\(\s*\).*\.sort\(\s*\)/, desc: 'Multiple sorts on same data' }
        ];

        for (const { pattern, desc } of cpuPatterns) {
            if (pattern.test(trimmedLine)) {
                results.issues.push({
                    type: 'cpu',
                    severity: 'high',
                    file: filePath,
                    line: lineNumber,
                    message: desc,
                    description: 'CPU-intensive operation detected',
                    suggestion: 'Consider algorithm optimization or caching',
                    estimatedImpact: 'CPU performance impact'
                });
            }
        }

        // Network performance issues
        const networkPatterns = [
            { pattern: /fetch\(.*\)\.then\(.*\)\.then\(.*\)\.then/, desc: 'Chained API calls' },
            { pattern: /axios\.get.*await.*axios\.get/, desc: 'Sequential API calls' },
            { pattern: /for.*await.*fetch|for.*await.*axios/, desc: 'API calls in loop' }
        ];

        for (const { pattern, desc } of networkPatterns) {
            if (pattern.test(trimmedLine)) {
                results.issues.push({
                    type: 'network',
                    severity: 'medium',
                    file: filePath,
                    line: lineNumber,
                    message: desc,
                    description: 'Network performance could be optimized',
                    suggestion: 'Consider parallel requests or request batching',
                    estimatedImpact: 'Network latency impact'
                });
            }
        }
    }

    private analyzeComplexity(content: string, filePath: string, results: PerformanceResults): void {
        // Cyclomatic complexity analysis
        const complexityIndicators = [
            /if\s*\(/g,
            /else\s+if\s*\(/g,
            /while\s*\(/g,
            /for\s*\(/g,
            /catch\s*\(/g,
            /case\s+.*:/g,
            /&&|\|\|/g
        ];

        let complexity = 1; // Base complexity
        for (const pattern of complexityIndicators) {
            const matches = content.match(pattern);
            if (matches) {
                complexity += matches.length;
            }
        }

        // Function length analysis
        const functionMatches = content.match(/function\s+\w+\s*\([^)]*\)\s*{[^}]*}/g) || [];
        for (const func of functionMatches) {
            const lines = func.split('\n').length;
            if (lines > 50) {
                results.issues.push({
                    type: 'code-smell',
                    severity: lines > 100 ? 'high' : 'medium',
                    file: filePath,
                    message: `Long function: ${lines} lines`,
                    description: 'Long functions are harder to maintain and test',
                    suggestion: 'Consider breaking into smaller functions',
                    estimatedImpact: 'Maintainability and performance impact'
                });
            }
        }

        if (complexity > 15) {
            results.issues.push({
                type: 'code-smell',
                severity: complexity > 30 ? 'critical' : 'high',
                file: filePath,
                message: `High cyclomatic complexity: ${complexity}`,
                description: 'Complex code is harder to understand and maintain',
                suggestion: 'Refactor to reduce conditional complexity',
                estimatedImpact: 'Code quality and performance impact'
            });
        }
    }

    private async analyzeBundleSize(projectPath: string, results: PerformanceResults): Promise<void> {
        const packageJsonPath = path.join(projectPath, 'package.json');
        
        try {
            const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8'));
            const dependencies = Object.keys(packageJson.dependencies || {});
            const devDependencies = Object.keys(packageJson.devDependencies || {});
            
            // Check for heavy dependencies
            const heavyDeps = [
                'lodash', 'moment', 'rxjs', 'firebase', 'aws-sdk',
                'electron', 'puppeteer', 'selenium-webdriver'
            ];
            
            for (const dep of dependencies) {
                if (heavyDeps.includes(dep)) {
                    results.issues.push({
                        type: 'bundle',
                        severity: 'medium',
                        file: 'package.json',
                        message: `Heavy dependency: ${dep}`,
                        description: 'Large dependencies increase bundle size',
                        suggestion: 'Consider lighter alternatives or tree shaking',
                        estimatedImpact: 'Bundle size and load time impact'
                    });
                }
            }

            // Check for unused dependencies
            if (dependencies.length > 20) {
                results.issues.push({
                    type: 'bundle',
                    severity: 'low',
                    file: 'package.json',
                    message: `Many dependencies: ${dependencies.length}`,
                    description: 'Large number of dependencies can impact performance',
                    suggestion: 'Audit dependencies and remove unused ones',
                    estimatedImpact: 'Bundle size impact'
                });
            }

        } catch (error) {
            // No package.json or parsing error
        }
    }

    private async analyzeDependencies(projectPath: string, results: PerformanceResults): Promise<void> {
        // Check for common performance anti-patterns in config files
        const configFiles = [
            'webpack.config.js',
            'vite.config.js',
            'rollup.config.js',
            'tsconfig.json'
        ];

        for (const configFile of configFiles) {
            const configPath = path.join(projectPath, configFile);
            try {
                const content = await readFile(configPath, 'utf8');
                
                if (configFile.includes('webpack') && !content.includes('optimization')) {
                    results.issues.push({
                        type: 'bundle',
                        severity: 'medium',
                        file: configFile,
                        message: 'Webpack optimization not configured',
                        description: 'Missing optimization settings can impact bundle size',
                        suggestion: 'Add optimization configuration for production builds',
                        estimatedImpact: 'Bundle optimization impact'
                    });
                }

                if (content.includes('source-map') && content.includes('production')) {
                    results.issues.push({
                        type: 'bundle',
                        severity: 'low',
                        file: configFile,
                        message: 'Source maps in production',
                        description: 'Source maps increase bundle size in production',
                        suggestion: 'Disable source maps for production builds',
                        estimatedImpact: 'Bundle size impact'
                    });
                }

            } catch (error) {
                // File doesn't exist or can't be read
            }
        }
    }

    private generateSummary(results: PerformanceResults): void {
        // Count issues by severity
        for (const issue of results.issues) {
            results.summary[issue.severity]++;
            results.summary.totalIssues++;
        }

        // Generate recommendations
        if (results.summary.critical > 0) {
            results.recommendations.push('🚨 Critical performance issues found - immediate attention required');
        }
        
        if (results.summary.high > 5) {
            results.recommendations.push('⚠️ Multiple high-impact issues detected - prioritize optimization');
        }

        if (results.issues.some(i => i.type === 'memory')) {
            results.recommendations.push('🧠 Memory optimization needed - review resource management');
        }

        if (results.issues.some(i => i.type === 'bundle')) {
            results.recommendations.push('📦 Bundle size optimization needed - review dependencies');
        }

        if (results.issues.some(i => i.type === 'cpu')) {
            results.recommendations.push('⚡ CPU optimization needed - review algorithms');
        }

        if (results.summary.totalIssues === 0) {
            results.recommendations.push('✅ No major performance issues detected - good job!');
        }
    }

    formatResults(results: PerformanceResults): string {
        let output = chalk.cyan.bold('📊 Performance Analysis Results\n');
        output += chalk.gray(`Scanned ${results.filesScanned} files in ${results.duration}ms\n\n`);

        // Summary
        output += chalk.white.bold('📈 Issues Summary:\n');
        output += chalk.red(`  Critical: ${results.summary.critical}\n`);
        output += chalk.yellow(`  High:     ${results.summary.high}\n`);
        output += chalk.blue(`  Medium:   ${results.summary.medium}\n`);
        output += chalk.gray(`  Low:      ${results.summary.low}\n`);
        output += chalk.white(`  Total:    ${results.summary.totalIssues}\n\n`);

        // Top issues
        if (results.issues.length > 0) {
            output += chalk.white.bold('🔍 Top Issues:\n');
            results.issues.slice(0, 10).forEach(issue => {
                const severityColor = issue.severity === 'critical' ? 'red' : 
                                    issue.severity === 'high' ? 'yellow' : 
                                    issue.severity === 'medium' ? 'blue' : 'gray';
                
                output += chalk[severityColor](`  ${issue.severity.toUpperCase()}: ${issue.message}\n`);
                output += chalk.gray(`    File: ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`);
                output += chalk.gray(`    ${issue.suggestion}\n\n`);
            });
        }

        // Recommendations
        if (results.recommendations.length > 0) {
            output += chalk.white.bold('💡 Recommendations:\n');
            results.recommendations.forEach(rec => {
                output += chalk.green(`  ${rec}\n`);
            });
        }

        return output;
    }
}