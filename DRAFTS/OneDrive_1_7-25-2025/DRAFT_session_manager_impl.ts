import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export interface SessionData {
  projectName: string;
  projectPath: string;
  startTime: Date;
  lastActivity: Date;
  projectType: string;
  contextFiles: string[];
  metadata: Record<string, any>;
}

export class SessionManager {
  private currentSession: SessionData | null = null;
  private readonly sessionFile = path.join(process.cwd(), '.superrez-session.json');

  async startSession(projectPath: string): Promise<SessionData> {
    const projectName = path.basename(projectPath);
    const projectType = await this.detectProjectType(projectPath);
    const contextFiles = await this.gatherContextFiles(projectPath);

    this.currentSession = {
      projectName,
      projectPath,
      startTime: new Date(),
      lastActivity: new Date(),
      projectType,
      contextFiles,
      metadata: {}
    };

    // Save session to file
    await this.saveSession();
    
    return this.currentSession;
  }

  async getCurrentSession(): Promise<SessionData | null> {
    if (!this.currentSession) {
      // Try to load from file
      await this.loadSession();
    }
    return this.currentSession;
  }

  async getCurrentContext(): Promise<string | null> {
    if (!this.currentSession) return null;

    const context = [];
    
    // Add project information
    context.push(`Project: ${this.currentSession.projectName}`);
    context.push(`Type: ${this.currentSession.projectType}`);
    context.push(`Path: ${this.currentSession.projectPath}`);
    
    // Add relevant file contents
    for (const file of this.currentSession.contextFiles.slice(0, 3)) { // Limit to first 3 files
      try {
        const fullPath = path.join(this.currentSession.projectPath, file);
        if (await fs.pathExists(fullPath)) {
          const content = await fs.readFile(fullPath, 'utf-8');
          // Limit file content to prevent context overflow
          const truncatedContent = content.length > 1000 
            ? content.substring(0, 1000) + '...[truncated]'
            : content;
          context.push(`\n--- ${file} ---\n${truncatedContent}`);
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    return context.join('\n');
  }

  async endSession(): Promise<void> {
    if (this.currentSession) {
      console.log(chalk.gray(`Session ended: ${this.currentSession.projectName}`));
      
      // Remove session file
      try {
        await fs.remove(this.sessionFile);
      } catch (error) {
        // Ignore errors when removing session file
      }
      
      this.currentSession = null;
    }
  }

  private async detectProjectType(projectPath: string): Promise<string> {
    const indicators = [
      { file: 'package.json', type: 'Node.js/JavaScript' },
      { file: 'requirements.txt', type: 'Python' },
      { file: 'pyproject.toml', type: 'Python (Modern)' },
      { file: 'Cargo.toml', type: 'Rust' },
      { file: 'go.mod', type: 'Go' },
      { file: 'pom.xml', type: 'Java/Maven' },
      { file: 'build.gradle', type: 'Java/Gradle' },
      { file: 'hardhat.config.js', type: 'Blockchain/Hardhat' },
      { file: 'truffle-config.js', type: 'Blockchain/Truffle' },
      { file: 'Dockerfile', type: 'Docker Project' },
      { file: '.git', type: 'Git Repository' },
      // Your progress files
      { file: 'progress_tracker.md', type: 'SuperRez Project' },
      { file: 'claude_project_docs.md', type: 'Claude Project' },
      { file: 'final_progress_tracker.md', type: 'Completed Project' },
      { file: 'memecoin_sniper.py', type: 'Memecoin Bot' },
      { file: 'main_memecoin_sniper.py', type: 'Memecoin Sniper' }
    ];

    for (const indicator of indicators) {
      const fullPath = path.join(projectPath, indicator.file);
      if (await fs.pathExists(fullPath)) {
        return indicator.type;
      }
    }

    // Check for common file extensions
    const files = await fs.readdir(projectPath).catch(() => []);
    if (files.some(f => f.endsWith('.py'))) return 'Python Script';
    if (files.some(f => f.endsWith('.js') || f.endsWith('.ts'))) return 'JavaScript/TypeScript';
    if (files.some(f => f.endsWith('.sol'))) return 'Solidity/Blockchain';
    if (files.some(f => f.endsWith('.rs'))) return 'Rust';
    if (files.some(f => f.endsWith('.go'))) return 'Go';

    return 'Unknown';
  }

  private async gatherContextFiles(projectPath: string): Promise<string[]> {
    const contextFiles: string[] = [];
    
    // Important files to include in context
    const importantFiles = [
      'README.md',
      'readme.md',
      'README.txt',
      'package.json',
      'requirements.txt',
      'pyproject.toml',
      'main.py',
      'index.js',
      'app.py',
      'main_memecoin_sniper.py',
      'progress_tracker.md',
      'claude_project_docs.md',
      'final_progress_tracker.md',
      '.env.example',
      'config.py',
      'settings.py'
    ];

    for (const file of importantFiles) {
      const fullPath = path.join(projectPath, file);
      if (await fs.pathExists(fullPath)) {
        contextFiles.push(file);
      }
    }

    // Look for recent Python/JS files (last 5)
    try {
      const files = await fs.readdir(projectPath);
      const recentFiles = files
        .filter(f => f.endsWith('.py') || f.endsWith('.js') || f.endsWith('.ts'))
        .filter(f => !importantFiles.includes(f))
        .slice(0, 5);
      
      contextFiles.push(...recentFiles);
    } catch (error) {
      // Ignore errors reading directory
    }

    return contextFiles;
  }

  private async saveSession(): Promise<void> {
    if (this.currentSession) {
      try {
        await fs.writeJSON(this.sessionFile, this.currentSession, { spaces: 2 });
      } catch (error) {
        // Ignore errors saving session
      }
    }
  }

  private async loadSession(): Promise<void> {
    try {
      if (await fs.pathExists(this.sessionFile)) {
        const data = await fs.readJSON(this.sessionFile);
        this.currentSession = {
          ...data,
          startTime: new Date(data.startTime),
          lastActivity: new Date(data.lastActivity)
        };
      }
    } catch (error) {
      // Ignore errors loading session
      this.currentSession = null;
    }
  }
}