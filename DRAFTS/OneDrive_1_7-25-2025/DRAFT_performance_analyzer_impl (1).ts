import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface PerformanceIssue {
  type: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  file: string;
  line?: number;
  recommendation: string;
  impact: string;
}

export interface PerformanceScanResult {
  issues: PerformanceIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  metrics: {
    totalFiles: number;
    totalLines: number;
    largeFiles: number;
    complexFunctions: number;
  };
  scanTime: number;
}

export class PerformanceAnalyzer {
  private readonly thresholds = {
    largeFileLines: 500,
    longFunctionLines: 50,
    deepNesting: 4,
    manyParameters: 6,
    longLineLength: 120
  };

  async analyzeDirectory(dirPath: string): Promise<PerformanceScanResult> {
    const startTime = Date.now();
    const issues: PerformanceIssue[] = [];
    const metrics = {
      totalFiles: 0,
      totalLines: 0,
      largeFiles: 0,
      complexFunctions: 0
    };
    
    // Get all code files
    const files = await this.getCodeFiles(dirPath);
    metrics.totalFiles = files.length;
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const lines = content.split('\n');
        metrics.totalLines += lines.length;
        
        if (lines.length > this.thresholds.largeFileLines) {
          metrics.largeFiles++;
        }
        
        const fileIssues = await this.analyzeFile(file, content);
        issues.push(...fileIssues);
        
        // Count complex functions
        metrics.complexFunctions += fileIssues.filter(
          issue => issue.category === 'Function Complexity'
        ).length;
        
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    // Analyze project structure
    const structureIssues = await this.analyzeProjectStructure(dirPath);
    issues.push(...structureIssues);
    
    const scanTime = Date.now() - startTime;
    const summary = this.createSummary(issues);
    
    return { issues, summary, metrics, scanTime };
  }

  private async getCodeFiles(dirPath: string): Promise<string[]> {
    const patterns = [
      '**/*.js',
      '**/*.ts',
      '**/*.py',
      '**/*.java',
      '**/*.go',
      '**/*.rs',
      '**/*.sol',
      '**/*.cpp',
      '**/*.c',
      '**/*.php',
      '**/*.rb'
    ];
    
    const allFiles: string[] = [];
    
    for (const pattern of patterns) {
      try {
        const files = await glob(pattern, { 
          cwd: dirPath,
          absolute: true,
          ignore: ['**/node_modules/**', '**/venv/**', '**/.git/**', '**/dist/**', '**/build/**']
        });
        allFiles.push(...files);
      } catch (error) {
        // Skip pattern if it fails
      }
    }
    
    return [...new Set(allFiles)];
  }

  private async analyzeFile(filePath: string, content: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    const lines = content.split('\n');
    const fileName = path.basename(filePath);
    const fileExt = path.extname(filePath);
    
    // File size analysis
    this.analyzeFileSize(fileName, lines, issues);
    
    // Line-by-line analysis
    this.analyzeLines(fileName, lines, issues);
    
    // Language-specific analysis
    if (['.js', '.ts'].includes(fileExt)) {
      this.analyzeJavaScript(fileName, lines, issues);
    } else if (fileExt === '.py') {
      this.analyzePython(fileName, lines, issues);
    } else if (fileExt === '.sol') {
      this.analyzeSolidity(fileName, lines, issues);
    }
    
    // Function complexity analysis
    this.analyzeFunctionComplexity(fileName, lines, issues, fileExt);
    
    return issues;
  }

  private analyzeFileSize(fileName: string, lines: string[], issues: PerformanceIssue[]): void {
    if (lines.length > this.thresholds.largeFileLines) {
      const severity = lines.length > 1000 ? 'high' : 'medium';
      issues.push({
        type: severity,
        category: 'File Size',
        description: `Large file with ${lines.length} lines`,
        file: fileName,
        recommendation: 'Consider breaking this file into smaller, more focused modules',
        impact: 'Large files are harder to maintain and can slow down IDE performance'
      });
    }
  }

  private analyzeLines(fileName: string, lines: string[], issues: PerformanceIssue[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Long lines
      if (line.length > this.thresholds.longLineLength) {
        issues.push({
          type: 'low',
          category: 'Code Style',
          description: `Long line (${line.length} characters)`,
          file: fileName,
          line: lineNumber,
          recommendation: 'Break long lines for better readability',
          impact: 'Long lines reduce code readability'
        });
      }
      
      // Excessive nesting
      const indentLevel = this.getIndentLevel(line);
      if (indentLevel > this.thresholds.deepNesting) {
        issues.push({
          type: 'medium',
          category: 'Code Complexity',
          description: `Deep nesting (${indentLevel} levels)`,
          file: fileName,
          line: lineNumber,
          recommendation: 'Reduce nesting by extracting functions or using early returns',
          impact: 'Deep nesting increases complexity and reduces readability'
        });
      }
      
      // Performance anti-patterns
      this.detectAntiPatterns(fileName, line, lineNumber, issues);
    }
  }

  private analyzeJavaScript(fileName: string, lines: string[], issues: PerformanceIssue[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Synchronous file operations
      if (line.includes('readFileSync') || line.includes('writeFileSync')) {
        issues.push({
          type: 'high',
          category: 'Blocking Operations',
          description: 'Synchronous file operation detected',
          file: fileName,
          line: lineNumber,
          recommendation: 'Use async file operations (readFile, writeFile) instead',
          impact: 'Synchronous operations block the event loop'
        });
      }
      
      // Console.log in production-like code
      if (line.includes('console.log') && !line.trim().startsWith('//')) {
        issues.push({
          type: 'low',
          category: 'Debug Code',
          description: 'Console.log statement found',
          file: fileName,
          line: lineNumber,
          recommendation: 'Use proper logging library or remove debug statements',
          impact: 'Console.log can impact performance in production'
        });
      }
      
      // Potential memory leaks
      if (line.includes('setInterval') && !this.hasMatchingClearInterval(lines, i)) {
        issues.push({
          type: 'medium',
          category: 'Memory Management',
          description: 'setInterval without corresponding clearInterval',
          file: fileName,
          line: lineNumber,
          recommendation: 'Always clear intervals to prevent memory leaks',
          impact: 'Uncleaned intervals can cause memory leaks'
        });
      }
    }
  }

  private analyzePython(fileName: string, lines: string[], issues: PerformanceIssue[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Global variables
      if (line.trim().startsWith('global ')) {
        issues.push({
          type: 'medium',
          category: 'Code Quality',
          description: 'Global variable usage detected',
          file: fileName,
          line: lineNumber,
          recommendation: 'Minimize global variable usage, prefer function parameters',
          impact: 'Global variables can cause naming conflicts and make testing difficult'
        });
      }
      
      // List comprehension vs loops
      if (line.includes('for ') && line.includes('.append(')) {
        issues.push({
          type: 'low',
          category: 'Performance',
          description: 'Consider using list comprehension instead of append in loop',
          file: fileName,
          line: lineNumber,
          recommendation: 'List comprehensions are typically faster than append in loops',
          impact: 'List comprehensions can be more efficient than manual loops'
        });
      }
      
      // Inefficient string concatenation
      if (line.includes('+=') && (line.includes('"') || line.includes("'"))) {
        issues.push({
          type: 'medium',
          category: 'Performance',
          description: 'String concatenation with += in loop may be inefficient',
          file: fileName,
          line: lineNumber,
          recommendation: 'Use join() for multiple string concatenations',
          impact: 'String concatenation can be O(n²) in loops'
        });
      }
    }
  }

  private analyzeSolidity(fileName: string, lines: string[], issues: PerformanceIssue[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      
      // Gas optimization issues
      if (line.includes('storage') && line.includes('[]')) {
        issues.push({
          type: 'medium',
          category: 'Gas Optimization',
          description: 'Storage array access may be expensive',
          file: fileName,
          line: lineNumber,
          recommendation: 'Consider caching array length or using memory arrays',
          impact: 'Storage operations consume more gas than memory operations'
        });
      }
      
      // Loops in contracts
      if (line.includes('for(') || line.includes('while(')) {
        issues.push({
          type: 'high',
          category: 'Gas Optimization',
          description: 'Loop detected in smart contract',
          file: fileName,
          line: lineNumber,
          recommendation: 'Avoid loops that could run out of gas, use mapping-based patterns',
          impact: 'Loops can consume unpredictable amounts of gas'
        });
      }
    }
  }

  private analyzeFunctionComplexity(fileName: string, lines: string[], issues: PerformanceIssue[], fileExt: string): void {
    let currentFunction = '';
    let functionStart = 0;
    let braceCount = 0;
    let inFunction = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Detect function start (simplified)
      if (this.isFunctionDeclaration(line, fileExt)) {
        currentFunction = this.extractFunctionName(line);
        functionStart = i;
        inFunction = true;
        braceCount = 0;
      }
      
      if (inFunction) {
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;
        
        // Function ended
        if (braceCount === 0 && line.includes('}')) {
          const functionLength = i - functionStart + 1;
          
          if (functionLength > this.thresholds.longFunctionLines) {
            const severity = functionLength > 100 ? 'high' : 'medium';
            issues.push({
              type: severity,
              category: 'Function Complexity',
              description: `Long function '${currentFunction}' (${functionLength} lines)`,
              file: fileName,
              line: functionStart + 1,
              recommendation: 'Break this function into smaller, more focused functions',
              impact: 'Long functions are harder to understand, test, and maintain'
            });
          }
          
          inFunction = false;
        }
      }
    }
  }

  private detectAntiPatterns(fileName: string, line: string, lineNumber: number, issues: PerformanceIssue[]): void {
    // N+1 query pattern
    if (line.includes('for') && (line.includes('query') || line.includes('find') || line.includes('get'))) {
      issues.push({
        type: 'high',
        category: 'Database Performance',
        description: 'Potential N+1 query pattern',
        file: fileName,
        line: lineNumber,
        recommendation: 'Use bulk operations or eager loading to avoid N+1 queries',
        impact: 'N+1 queries can severely impact database performance'
      });
    }
    
    // Inefficient DOM queries
    if (line.includes('document.getElementById') && line.includes('for')) {
      issues.push({
        type: 'medium',
        category: 'DOM Performance',
        description: 'DOM query inside loop',
        file: fileName,
        line: lineNumber,
        recommendation: 'Cache DOM queries outside loops',
        impact: 'Repeated DOM queries can slow down UI performance'
      });
    }
    
    // Large data structures in memory
    if (line.includes('new Array(') && /\d{4,}/.test(line)) {
      issues.push({
        type: 'medium',
        category: 'Memory Usage',
        description: 'Large array allocation detected',
        file: fileName,
        line: lineNumber,
        recommendation: 'Consider streaming or pagination for large datasets',
        impact: 'Large arrays can consume significant memory'
      });
    }
    
    // Inefficient string operations
    if (line.includes('.replace(') && line.includes('/g')) {
      const replaceCount = (line.match(/\.replace\(/g) || []).length;
      if (replaceCount > 2) {
        issues.push({
          type: 'low',
          category: 'String Performance',
          description: 'Multiple string replacements',
          file: fileName,
          line: lineNumber,
          recommendation: 'Consider using a single regex with multiple capture groups',
          impact: 'Multiple string replacements can be inefficient'
        });
      }
    }
  }

  private async analyzeProjectStructure(dirPath: string): Promise<PerformanceIssue[]> {
    const issues: PerformanceIssue[] = [];
    
    // Check for package.json dependencies
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJSON(packageJsonPath);
        
        // Check for heavy dependencies
        const heavyDeps = ['lodash', 'moment', 'jquery'];
        for (const dep of heavyDeps) {
          if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
            issues.push({
              type: 'low',
              category: 'Bundle Size',
              description: `Heavy dependency detected: ${dep}`,
              file: 'package.json',
              recommendation: `Consider lighter alternatives to ${dep}`,
              impact: 'Heavy dependencies increase bundle size and load time'
            });
          }
        }
        
        // Check for many dependencies
        const totalDeps = Object.keys(packageJson.dependencies || {}).length + 
                         Object.keys(packageJson.devDependencies || {}).length;
        if (totalDeps > 50) {
          issues.push({
            type: 'medium',
            category: 'Dependency Management',
            description: `High number of dependencies (${totalDeps})`,
            file: 'package.json',
            recommendation: 'Review dependencies and remove unused ones',
            impact: 'Many dependencies can slow down installation and increase security risks'
          });
        }
        
      } catch (error) {
        // Skip if package.json can't be parsed
      }
    }
    
    // Check for requirements.txt (Python)
    const requirementsPath = path.join(dirPath, 'requirements.txt');
    if (await fs.pathExists(requirementsPath)) {
      try {
        const content = await fs.readFile(requirementsPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
        
        if (lines.length > 30) {
          issues.push({
            type: 'medium',
            category: 'Dependency Management',
            description: `Many Python dependencies (${lines.length})`,
            file: 'requirements.txt',
            recommendation: 'Review dependencies and consider using virtual environments',
            impact: 'Many dependencies can slow down installation and cause conflicts'
          });
        }
        
        // Check for known heavy Python packages
        const heavyPythonDeps = ['tensorflow', 'pytorch', 'opencv-python', 'scipy'];
        for (const dep of heavyPythonDeps) {
          if (lines.some(line => line.includes(dep))) {
            issues.push({
              type: 'info',
              category: 'Bundle Size',
              description: `Heavy Python package detected: ${dep}`,
              file: 'requirements.txt',
              recommendation: `Consider if ${dep} is necessary or use lighter alternatives`,
              impact: 'Heavy packages increase installation time and memory usage'
            });
          }
        }
        
      } catch (error) {
        // Skip if requirements.txt can't be read
      }
    }
    
    // Check for large static files
    try {
      const staticDirs = ['static', 'public', 'assets', 'dist'];
      for (const dir of staticDirs) {
        const dirPath = path.join(dirPath, dir);
        if (await fs.pathExists(dirPath)) {
          const files = await glob('**/*', { cwd: dirPath, absolute: true });
          for (const file of files) {
            try {
              const stats = await fs.stat(file);
              if (stats.size > 1024 * 1024) { // 1MB
                issues.push({
                  type: 'medium',
                  category: 'Asset Optimization',
                  description: `Large static file: ${path.basename(file)} (${Math.round(stats.size / 1024 / 1024)}MB)`,
                  file: path.relative(dirPath, file),
                  recommendation: 'Optimize large assets or consider CDN delivery',
                  impact: 'Large static files slow down page load times'
                });
              }
            } catch (error) {
              // Skip files that can't be analyzed
            }
          }
        }
      }
    } catch (error) {
      // Skip if static analysis fails
    }
    
    return issues;
  }

  private getIndentLevel(line: string): number {
    const match = line.match(/^(\s*)/);
    if (!match) return 0;
    
    const whitespace = match[1];
    // Assume 2 spaces or 1 tab = 1 level
    return Math.floor(whitespace.replace(/\t/g, '  ').length / 2);
  }

  private isFunctionDeclaration(line: string, fileExt: string): boolean {
    if (['.js', '.ts'].includes(fileExt)) {
      return /function\s+\w+\s*\(/.test(line) || 
             /\w+\s*:\s*function\s*\(/.test(line) ||
             /\w+\s*=\s*\(.*\)\s*=>/.test(line) ||
             /async\s+function\s+\w+/.test(line);
    } else if (fileExt === '.py') {
      return /def\s+\w+\s*\(/.test(line);
    } else if (fileExt === '.sol') {
      return /function\s+\w+\s*\(/.test(line);
    } else if (fileExt === '.java') {
      return /\w+\s+\w+\s*\([^)]*\)\s*\{/.test(line);
    }
    
    return false;
  }

  private extractFunctionName(line: string): string {
    // Simple extraction - could be more sophisticated
    const match = line.match(/(?:function\s+|def\s+)(\w+)/);
    return match ? match[1] : 'unknown';
  }

  private hasMatchingClearInterval(lines: string[], startIndex: number): boolean {
    // Look for clearInterval in the next 20 lines (simple heuristic)
    const searchLines = lines.slice(startIndex, startIndex + 20);
    return searchLines.some(line => line.includes('clearInterval'));
  }

  private createSummary(issues: PerformanceIssue[]): PerformanceScanResult['summary'] {
    const summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0
    };
    
    for (const issue of issues) {
      summary[issue.type]++;
    }
    
    return summary;
  }
}