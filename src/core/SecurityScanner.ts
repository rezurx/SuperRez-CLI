import * as fs from 'fs';
import * as path from 'path';
import { SecurityIssue } from '../interfaces';

export interface SecurityResults {
    timestamp: string;
    issues: SecurityIssue[];
    filesScanned: number;
    duration: number;
}

export class SecurityScanner {
    private scanStartTime: number = 0;

    async scan(projectPath: string): Promise<SecurityResults> {
        this.scanStartTime = Date.now();
        
        const results: SecurityResults = {
            timestamp: new Date().toISOString(),
            issues: [],
            filesScanned: 0,
            duration: 0
        };

        try {
            // Find all relevant files
            const files = this.findFiles(projectPath);
            results.filesScanned = files.length;

            // Scan each file
            for (const file of files) {
                const fileIssues = await this.scanFile(file);
                results.issues.push(...fileIssues);
            }

            results.duration = Date.now() - this.scanStartTime;

        } catch (error) {
            console.error('Security scan error:', error);
        }

        return results;
    }

    private findFiles(dir: string): string[] {
        const files: string[] = [];
        const filePattern = /\.(js|ts|jsx|tsx|py|php|java|rb|go|rs|sol|c|cpp|h|hpp)$/;
        
        const scanDirectory = (currentDir: string, depth: number = 0): void => {
            if (depth > 5) return; // Limit depth
            
            try {
                const entries = fs.readdirSync(currentDir, { withFileTypes: true });
                
                for (const entry of entries) {
                    // Skip hidden directories and common build/dependency folders
                    if (entry.name.startsWith('.') || 
                        ['node_modules', 'dist', 'build', 'target', '__pycache__', 'vendor', '.git'].includes(entry.name)) {
                        continue;
                    }
                    
                    const fullPath = path.join(currentDir, entry.name);
                    
                    if (entry.isDirectory()) {
                        scanDirectory(fullPath, depth + 1);
                    } else if (filePattern.test(entry.name)) {
                        files.push(fullPath);
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };

        scanDirectory(dir);
        return files;
    }

    private async scanFile(filePath: string): Promise<SecurityIssue[]> {
        const issues: SecurityIssue[] = [];
        
        try {
            const content = await fs.promises.readFile(filePath, 'utf8');
            const lines = content.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const lineNumber = i + 1;
                
                // Check for hardcoded secrets
                const secretIssues = this.checkSecrets(line, filePath, lineNumber);
                issues.push(...secretIssues);
                
                // Check for SQL injection
                const sqlIssues = this.checkSQLInjection(line, filePath, lineNumber);
                issues.push(...sqlIssues);
                
                // Check for XSS vulnerabilities
                const xssIssues = this.checkXSS(line, filePath, lineNumber);
                issues.push(...xssIssues);
                
                // Check for weak cryptography
                const cryptoIssues = this.checkWeakCrypto(line, filePath, lineNumber);
                issues.push(...cryptoIssues);
                
                // Check for path traversal
                const pathIssues = this.checkPathTraversal(line, filePath, lineNumber);
                issues.push(...pathIssues);
            }
            
        } catch (error) {
            // Skip files we can't read
        }
        
        return issues;
    }

    private checkSecrets(line: string, file: string, lineNumber: number): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        
        const secretPatterns = [
            { pattern: /(api[_-]?key|apikey)\s*[:=]\s*["'][^"']{10,}["']/i, type: 'API Key' },
            { pattern: /(secret|password|passwd|pwd)\s*[:=]\s*["'][^"']{8,}["']/i, type: 'Password/Secret' },
            { pattern: /(token|auth[_-]?token)\s*[:=]\s*["'][^"']{10,}["']/i, type: 'Auth Token' },
            { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/i, type: 'Private Key' },
            { pattern: /AKIA[0-9A-Z]{16}/i, type: 'AWS Access Key' },
            { pattern: /ghp_[a-zA-Z0-9]{36}/i, type: 'GitHub Token' },
            { pattern: /sk-[a-zA-Z0-9]{48}/i, type: 'OpenAI API Key' },
        ];

        for (const { pattern, type } of secretPatterns) {
            if (pattern.test(line)) {
                issues.push({
                    file,
                    line: lineNumber,
                    severity: 'HIGH',
                    type: `Hardcoded ${type}`,
                    message: `Potential hardcoded ${type.toLowerCase()} detected`,
                    suggestion: `Move ${type.toLowerCase()} to environment variables or secure configuration`
                });
            }
        }

        return issues;
    }

    private checkSQLInjection(line: string, file: string, lineNumber: number): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        
        const sqlPatterns = [
            { pattern: /query\s*\+\s*["']|["']\s*\+\s*\w+\s*\+\s*["']/i, desc: 'String concatenation in SQL query' },
            { pattern: /execute\(.*\+.*\)/i, desc: 'Dynamic SQL execution' },
            { pattern: /["']SELECT.*\+.*FROM/i, desc: 'Concatenated SELECT statement' },
            { pattern: /["']INSERT.*\+.*VALUES/i, desc: 'Concatenated INSERT statement' },
            { pattern: /["']UPDATE.*\+.*SET/i, desc: 'Concatenated UPDATE statement' },
            { pattern: /["']DELETE.*\+.*FROM/i, desc: 'Concatenated DELETE statement' }
        ];

        for (const { pattern, desc } of sqlPatterns) {
            if (pattern.test(line)) {
                issues.push({
                    file,
                    line: lineNumber,
                    severity: 'HIGH',
                    type: 'SQL Injection',
                    message: desc,
                    suggestion: 'Use parameterized queries or prepared statements'
                });
            }
        }

        return issues;
    }

    private checkXSS(line: string, file: string, lineNumber: number): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        
        const xssPatterns = [
            { pattern: /\.innerHTML\s*=\s*[^"']|\+.*innerHTML/i, desc: 'Potential XSS via innerHTML' },
            { pattern: /document\.write\s*\(/i, desc: 'Potentially dangerous document.write' },
            { pattern: /eval\s*\(/i, desc: 'Use of eval() function' },
            { pattern: /dangerouslySetInnerHTML/i, desc: 'React dangerouslySetInnerHTML usage' },
            { pattern: /v-html\s*=/i, desc: 'Vue.js v-html directive usage' }
        ];

        for (const { pattern, desc } of xssPatterns) {
            if (pattern.test(line)) {
                issues.push({
                    file,
                    line: lineNumber,
                    severity: 'MEDIUM',
                    type: 'XSS Vulnerability',
                    message: desc,
                    suggestion: 'Sanitize user input and use safe DOM manipulation methods'
                });
            }
        }

        return issues;
    }

    private checkWeakCrypto(line: string, file: string, lineNumber: number): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        
        const cryptoPatterns = [
            { pattern: /md5\s*\(/i, type: 'MD5', severity: 'HIGH' as const },
            { pattern: /sha1\s*\(/i, type: 'SHA1', severity: 'MEDIUM' as const },
            { pattern: /Math\.random\s*\(/i, type: 'Math.random', severity: 'MEDIUM' as const },
            { pattern: /DES|3DES/i, type: 'DES/3DES', severity: 'HIGH' as const },
            { pattern: /RC4/i, type: 'RC4', severity: 'HIGH' as const }
        ];

        for (const { pattern, type, severity } of cryptoPatterns) {
            if (pattern.test(line)) {
                issues.push({
                    file,
                    line: lineNumber,
                    severity,
                    type: 'Weak Cryptography',
                    message: `Use of weak ${type} algorithm`,
                    suggestion: `Replace ${type} with stronger alternatives (e.g., SHA-256, crypto.randomBytes)`
                });
            }
        }

        return issues;
    }

    private checkPathTraversal(line: string, file: string, lineNumber: number): SecurityIssue[] {
        const issues: SecurityIssue[] = [];
        
        const pathPatterns = [
            { pattern: /\.\.\//g, desc: 'Potential path traversal with ../' },
            { pattern: /\.\.\\\\|\.\.\/\//g, desc: 'Potential path traversal sequence' },
            { pattern: /path\.join\([^)]*\.\.\//i, desc: 'Path.join with potential traversal' }
        ];

        for (const { pattern, desc } of pathPatterns) {
            if (pattern.test(line)) {
                issues.push({
                    file,
                    line: lineNumber,
                    severity: 'MEDIUM',
                    type: 'Path Traversal',
                    message: desc,
                    suggestion: 'Validate and sanitize file paths, use allowlist approach'
                });
            }
        }

        return issues;
    }

    // Generate summary report
    getSummary(results: SecurityResults): string {
        const { issues, filesScanned, duration } = results;
        const severityCounts = {
            HIGH: issues.filter(i => i.severity === 'HIGH').length,
            MEDIUM: issues.filter(i => i.severity === 'MEDIUM').length,
            LOW: issues.filter(i => i.severity === 'LOW').length
        };

        let summary = `Security Scan Results\n`;
        summary += `=====================\n`;
        summary += `Files Scanned: ${filesScanned}\n`;
        summary += `Duration: ${duration}ms\n`;
        summary += `Total Issues: ${issues.length}\n`;
        summary += `  • HIGH: ${severityCounts.HIGH}\n`;
        summary += `  • MEDIUM: ${severityCounts.MEDIUM}\n`;
        summary += `  • LOW: ${severityCounts.LOW}\n\n`;

        if (issues.length > 0) {
            summary += `Issue Details:\n`;
            issues.slice(0, 10).forEach(issue => {
                const relativePath = path.relative(process.cwd(), issue.file);
                summary += `[${issue.severity}] ${issue.type} in ${relativePath}:${issue.line}\n`;
                summary += `  ${issue.message}\n`;
                summary += `  💡 ${issue.suggestion}\n\n`;
            });

            if (issues.length > 10) {
                summary += `... and ${issues.length - 10} more issues\n`;
            }
        } else {
            summary += `🎉 No security issues detected!\n`;
        }

        return summary;
    }
}