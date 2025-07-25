"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PerformanceAnalyzer = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const util_1 = require("util");
const chalk_1 = __importDefault(require("chalk"));
const readdir = (0, util_1.promisify)(fs.readdir);
const readFile = (0, util_1.promisify)(fs.readFile);
const stat = (0, util_1.promisify)(fs.stat);
class PerformanceAnalyzer {
    constructor() {
        this.scanStartTime = 0;
        this.excludePaths = [
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
    }
    async analyze(projectPath) {
        this.scanStartTime = Date.now();
        const results = {
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
        }
        catch (error) {
            console.error('Performance analysis error:', error);
        }
        return results;
    }
    async scanDirectory(dirPath, rootPath, results) {
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
                }
                else if (entry.isFile()) {
                    if (this.shouldAnalyzeFile(entry.name)) {
                        await this.analyzeFile(fullPath, relativePath, results);
                        results.filesScanned++;
                    }
                }
            }
        }
        catch (error) {
            // Skip directories we can't read
        }
    }
    shouldExclude(name, relativePath) {
        return this.excludePaths.some(exclude => name === exclude || relativePath.startsWith(exclude + path.sep));
    }
    shouldAnalyzeFile(filename) {
        const ext = path.extname(filename).toLowerCase();
        const performanceRelevantExtensions = [
            '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
            '.py', '.java', '.go', '.rb', '.php', '.cs',
            '.cpp', '.c', '.h', '.swift', '.kt', '.rs',
            '.json', '.yaml', '.yml', '.sql'
        ];
        return performanceRelevantExtensions.includes(ext);
    }
    async analyzeFile(filePath, relativePath, results) {
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
        }
        catch (error) {
            // Skip files we can't read
        }
    }
    async analyzeLine(line, lineNumber, filePath, results) {
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
                    type: type,
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
    analyzeComplexity(content, filePath, results) {
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
    async analyzeBundleSize(projectPath, results) {
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
        }
        catch (error) {
            // No package.json or parsing error
        }
    }
    async analyzeDependencies(projectPath, results) {
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
            }
            catch (error) {
                // File doesn't exist or can't be read
            }
        }
    }
    generateSummary(results) {
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
    formatResults(results) {
        let output = chalk_1.default.cyan.bold('📊 Performance Analysis Results\n');
        output += chalk_1.default.gray(`Scanned ${results.filesScanned} files in ${results.duration}ms\n\n`);
        // Summary
        output += chalk_1.default.white.bold('📈 Issues Summary:\n');
        output += chalk_1.default.red(`  Critical: ${results.summary.critical}\n`);
        output += chalk_1.default.yellow(`  High:     ${results.summary.high}\n`);
        output += chalk_1.default.blue(`  Medium:   ${results.summary.medium}\n`);
        output += chalk_1.default.gray(`  Low:      ${results.summary.low}\n`);
        output += chalk_1.default.white(`  Total:    ${results.summary.totalIssues}\n\n`);
        // Top issues
        if (results.issues.length > 0) {
            output += chalk_1.default.white.bold('🔍 Top Issues:\n');
            results.issues.slice(0, 10).forEach(issue => {
                const severityColor = issue.severity === 'critical' ? 'red' :
                    issue.severity === 'high' ? 'yellow' :
                        issue.severity === 'medium' ? 'blue' : 'gray';
                output += chalk_1.default[severityColor](`  ${issue.severity.toUpperCase()}: ${issue.message}\n`);
                output += chalk_1.default.gray(`    File: ${issue.file}${issue.line ? `:${issue.line}` : ''}\n`);
                output += chalk_1.default.gray(`    ${issue.suggestion}\n\n`);
            });
        }
        // Recommendations
        if (results.recommendations.length > 0) {
            output += chalk_1.default.white.bold('💡 Recommendations:\n');
            results.recommendations.forEach(rec => {
                output += chalk_1.default.green(`  ${rec}\n`);
            });
        }
        return output;
    }
}
exports.PerformanceAnalyzer = PerformanceAnalyzer;
//# sourceMappingURL=PerformanceAnalyzer.js.map