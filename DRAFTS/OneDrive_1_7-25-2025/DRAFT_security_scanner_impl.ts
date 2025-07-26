import fs from 'fs-extra';
import path from 'path';
import { glob } from 'glob';

export interface SecurityIssue {
  type: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  description: string;
  file: string;
  line?: number;
  recommendation: string;
}

export interface SecurityScanResult {
  issues: SecurityIssue[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    info: number;
  };
  scanTime: number;
}

export class SecurityScanner {
  private readonly patterns = {
    // API Keys and Secrets
    apiKeys: [
      { pattern: /sk-[a-zA-Z0-9]{48}/, desc: 'OpenAI API Key' },
      { pattern: /xoxb-[0-9]+-[0-9]+-[0-9]+-[a-fA-F0-9]+/, desc: 'Slack Bot Token' },
      { pattern: /AKIA[0-9A-Z]{16}/, desc: 'AWS Access Key' },
      { pattern: /AIza[0-9A-Za-z\\-_]{35}/, desc: 'Google API Key' },
      { pattern: /ya29\\.[0-9A-Za-z\\-_]+/, desc: 'Google OAuth Access Token' },
      { pattern: /ghp_[a-zA-Z0-9]{36}/, desc: 'GitHub Personal Access Token' },
      { pattern: /ghs_[a-zA-Z0-9]{36}/, desc: 'GitHub App Token' }
    ],
    
    // Cryptocurrency Private Keys
    cryptoKeys: [
      { pattern: /[0-9a-fA-F]{64}/, desc: 'Potential Private Key (64 hex chars)' },
      { pattern: /[13][a-km-zA-HJ-NP-Z1-9]{25,34}/, desc: 'Bitcoin Address' },
      { pattern: /0x[a-fA-F0-9]{40}/, desc: 'Ethereum Address' },
      { pattern: /[a-km-zA-HJ-NP-Z1-9]{44}/, desc: 'Solana Address Pattern' }
    ],
    
    // Dangerous Functions
    dangerousFunctions: [
      { pattern: /eval\s*\(/, desc: 'Use of eval() function' },
      { pattern: /exec\s*\(/, desc: 'Use of exec() function' },
      { pattern: /system\s*\(/, desc: 'System command execution' },
      { pattern: /shell_exec\s*\(/, desc: 'Shell execution' },
      { pattern: /innerHTML\s*=/, desc: 'Potential XSS via innerHTML' }
    ],
    
    // Insecure Protocols
    insecureProtocols: [
      { pattern: /http:\/\/(?!localhost|127\.0\.0\.1)/, desc: 'Insecure HTTP protocol' },
      { pattern: /ftp:\/\//, desc: 'Insecure FTP protocol' },
      { pattern: /telnet:\/\//, desc: 'Insecure Telnet protocol' }
    ],
    
    // SQL Injection Patterns
    sqlInjection: [
      { pattern: /SELECT\s+.*\s+FROM\s+.*\s+WHERE\s+.*\+/, desc: 'Potential SQL injection' },
      { pattern: /query\s*=\s*["'].*\+.*["']/, desc: 'String concatenation in SQL query' },
      { pattern: /\$_GET\[.*\].*SELECT/, desc: 'GET parameter directly in SQL' }
    ]
  };

  async scanDirectory(dirPath: string): Promise<SecurityScanResult> {
    const startTime = Date.now();
    const issues: SecurityIssue[] = [];
    
    // Get all code files
    const files = await this.getCodeFiles(dirPath);
    
    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const fileIssues = await this.scanFile(file, content);
        issues.push(...fileIssues);
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    // Check for configuration issues
    const configIssues = await this.scanConfiguration(dirPath);
    issues.push(...configIssues);
    
    const scanTime = Date.now() - startTime;
    const summary = this.createSummary(issues);
    
    return { issues, summary, scanTime };
  }

  private async getCodeFiles(dirPath: string): Promise<string[]> {
    const patterns = [
      '**/*.js',
      '**/*.ts',
      '**/*.py',
      '**/*.java',
      '**/*.go',
      '**/*.rs',
      '**/*.sol', // Solidity files
      '**/*.php',
      '**/*.rb',
      '**/*.env*',
      '**/*.config.js',
      '**/*.json'
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
    
    return [...new Set(allFiles)]; // Remove duplicates
  }

  private async scanFile(filePath: string, content: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    const lines = content.split('\n');
    const fileName = path.basename(filePath);
    
    // Check each pattern category
    this.scanForApiKeys(fileName, lines, issues);
    this.scanForCryptoKeys(fileName, lines, issues);
    this.scanForDangerousFunctions(fileName, lines, issues);
    this.scanForInsecureProtocols(fileName, lines, issues);
    this.scanForSqlInjection(fileName, lines, issues);
    
    // File-specific checks
    if (fileName.includes('.env')) {
      this.scanEnvFile(fileName, lines, issues);
    }
    
    if (fileName.endsWith('.sol')) {
      this.scanSolidityFile(fileName, lines, issues);
    }
    
    return issues;
  }

  private scanForApiKeys(fileName: string, lines: string[], issues: SecurityIssue[]): void {
    for (const { pattern, desc } of this.patterns.apiKeys) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line) && !this.isCommentedOut(line)) {
          issues.push({
            type: 'critical',
            category: 'Exposed Secrets',
            description: `${desc} found in code`,
            file: fileName,
            line: i + 1,
            recommendation: 'Move sensitive keys to environment variables or secure vault'
          });
        }
      }
    }
  }

  private scanForCryptoKeys(fileName: string, lines: string[], issues: SecurityIssue[]): void {
    for (const { pattern, desc } of this.patterns.cryptoKeys) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line) && !this.isCommentedOut(line)) {
          // Additional checks to reduce false positives
          if (line.includes('example') || line.includes('test') || line.includes('placeholder')) {
            continue;
          }
          
          issues.push({
            type: 'high',
            category: 'Cryptocurrency Security',
            description: `${desc} detected`,
            file: fileName,
            line: i + 1,
            recommendation: 'Never hardcode private keys or addresses. Use environment variables.'
          });
        }
      }
    }
  }

  private scanForDangerousFunctions(fileName: string, lines: string[], issues: SecurityIssue[]): void {
    for (const { pattern, desc } of this.patterns.dangerousFunctions) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line) && !this.isCommentedOut(line)) {
          issues.push({
            type: 'high',
            category: 'Code Injection',
            description: `${desc} detected`,
            file: fileName,
            line: i + 1,
            recommendation: 'Avoid dynamic code execution. Use safer alternatives.'
          });
        }
      }
    }
  }

  private scanForInsecureProtocols(fileName: string, lines: string[], issues: SecurityIssue[]): void {
    for (const { pattern, desc } of this.patterns.insecureProtocols) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line) && !this.isCommentedOut(line)) {
          issues.push({
            type: 'medium',
            category: 'Insecure Communication',
            description: `${desc} used`,
            file: fileName,
            line: i + 1,
            recommendation: 'Use HTTPS/secure protocols for external communications'
          });
        }
      }
    }
  }

  private scanForSqlInjection(fileName: string, lines: string[], issues: SecurityIssue[]): void {
    for (const { pattern, desc } of this.patterns.sqlInjection) {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (pattern.test(line) && !this.isCommentedOut(line)) {
          issues.push({
            type: 'high',
            category: 'SQL Injection',
            description: `${desc}`,
            file: fileName,
            line: i + 1,
            recommendation: 'Use parameterized queries or prepared statements'
          });
        }
      }
    }
  }

  private scanEnvFile(fileName: string, lines: string[], issues: SecurityIssue[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check for empty values
      if (line.includes('=') && !line.startsWith('#')) {
        const [key, value] = line.split('=', 2);
        if (!value || value.trim() === '') {
          issues.push({
            type: 'low',
            category: 'Configuration',
            description: `Empty environment variable: ${key}`,
            file: fileName,
            line: i + 1,
            recommendation: 'Ensure all required environment variables have values'
          });
        }
      }
    }
  }

  private scanSolidityFile(fileName: string, lines: string[], issues: SecurityIssue[]): void {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for old Solidity version
      if (line.includes('pragma solidity') && line.includes('^0.4')) {
        issues.push({
          type: 'medium',
          category: 'Smart Contract Security',
          description: 'Old Solidity version detected',
          file: fileName,
          line: i + 1,
          recommendation: 'Update to Solidity 0.8.x for better security features'
        });
      }
      
      // Check for potential reentrancy
      if (line.includes('.call(') && !this.isCommentedOut(line)) {
        issues.push({
          type: 'high',
          category: 'Smart Contract Security',
          description: 'Low-level call detected - potential reentrancy risk',
          file: fileName,
          line: i + 1,
          recommendation: 'Use ReentrancyGuard or checks-effects-interactions pattern'
        });
      }
    }
  }

  private async scanConfiguration(dirPath: string): Promise<SecurityIssue[]> {
    const issues: SecurityIssue[] = [];
    
    // Check for .env files in public directories
    const envFiles = await glob('**/.env*', { cwd: dirPath, absolute: true });
    for (const envFile of envFiles) {
      if (envFile.includes('/public/') || envFile.includes('/static/')) {
        issues.push({
          type: 'critical',
          category: 'Configuration',
          description: 'Environment file in public directory',
          file: path.basename(envFile),
          recommendation: 'Move .env files out of public directories'
        });
      }
    }
    
    // Check for package.json security
    const packageJsonPath = path.join(dirPath, 'package.json');
    if (await fs.pathExists(packageJsonPath)) {
      try {
        const packageJson = await fs.readJSON(packageJsonPath);
        if (packageJson.scripts) {
          for (const [scriptName, script] of Object.entries(packageJson.scripts)) {
            if (typeof script === 'string' && script.includes('curl') && script.includes('|')) {
              issues.push({
                type: 'high',
                category: 'Configuration',
                description: `Potentially dangerous script: ${scriptName}`,
                file: 'package.json',
                recommendation: 'Avoid piping curl output directly to shell'
              });
            }
          }
        }
      } catch (error) {
        // Skip if package.json can't be parsed
      }
    }
    
    return issues;
  }

  private isCommentedOut(line: string): boolean {
    const trimmed = line.trim();
    return trimmed.startsWith('//') || 
           trimmed.startsWith('#') || 
           trimmed.startsWith('/*') ||
           trimmed.startsWith('*');
  }

  private createSummary(issues: SecurityIssue[]): SecurityScanResult['summary'] {
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