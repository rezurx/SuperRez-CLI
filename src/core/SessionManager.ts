import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Project, SessionData, ProjectContext } from '../interfaces';

const execAsync = promisify(exec);

export class SessionManager {
    private activeSession: SessionData | null = null;
    private sessionFile: string;
    private configDir: string;

    constructor(private configManager?: any) {
        // Create SuperRez config directory
        this.configDir = path.join(os.homedir(), '.superrez');
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
        
        this.sessionFile = path.join(this.configDir, 'session.json');
        this.loadSession();
    }

    async discoverProjects(searchPath?: string): Promise<Project[]> {
        const projects: Project[] = [];
        const searchRoot = searchPath || process.cwd();
        
        const progressFiles = [
            'progress.md',
            'PROGRESS.md', 
            'progress_tracking.md',
            'DEVELOPMENT_PROGRESS.md',
            'PROJECT_PROGRESS.md'
        ];

        const findProjects = (dir: string, depth: number = 0): void => {
            if (depth > 3) return; // Limit search depth
            
            try {
                const items = fs.readdirSync(dir);
                
                // Check for progress files in current directory
                for (const progressFile of progressFiles) {
                    if (items.includes(progressFile)) {
                        const projectPath = dir;
                        const projectName = path.basename(projectPath);
                        
                        projects.push({
                            name: projectName,
                            path: projectPath,
                            progressFile: path.join(projectPath, progressFile),
                            type: 'detected',
                            lastModified: fs.statSync(path.join(projectPath, progressFile)).mtime
                        });
                        break; // Only add once per directory
                    }
                }
                
                // Search subdirectories
                for (const item of items) {
                    if (item.startsWith('.') || item === 'node_modules') continue;
                    
                    const itemPath = path.join(dir, item);
                    const stat = fs.statSync(itemPath);
                    
                    if (stat.isDirectory()) {
                        findProjects(itemPath, depth + 1);
                    }
                }
            } catch (error) {
                // Skip directories we can't read
            }
        };

        findProjects(searchRoot);
        
        // Sort by last modified (most recent first)
        return projects.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    }

    async startSession(project: Project | string): Promise<void> {
        let projectData: Project;
        
        if (typeof project === 'string') {
            // Handle string input - could be path or project name
            const projectPath = path.isAbsolute(project) ? project : path.resolve(project);
            
            if (!fs.existsSync(projectPath)) {
                throw new Error(`Project path does not exist: ${projectPath}`);
            }
            
            projectData = {
                name: path.basename(projectPath),
                path: projectPath,
                progressFile: this.findProgressFile(projectPath) || '',
                type: 'manual',
                lastModified: new Date()
            };
        } else {
            projectData = project;
        }

        const context = await this.gatherContext(projectData.path);
        
        this.activeSession = {
            projectName: projectData.name,
            projectPath: projectData.path,
            startTime: new Date(),
            context
        };
        
        await this.saveSession();
        
        // Change working directory to project
        process.chdir(projectData.path);
    }

    async endSession(): Promise<string | null> {
        if (!this.activeSession) {
            throw new Error('No active session');
        }

        const context = await this.gatherContext(this.activeSession.projectPath);
        const prompt = this.generatePrompt({
            ...this.activeSession,
            context
        });
        
        return prompt;
    }

    getActiveSession(): SessionData | null {
        return this.activeSession;
    }

    async cleanup(): Promise<void> {
        this.activeSession = null;
        await this.saveSession();
    }

    private findProgressFile(projectPath: string): string | null {
        const progressFiles = [
            'progress.md',
            'PROGRESS.md',
            'progress_tracking.md',
            'DEVELOPMENT_PROGRESS.md',
            'PROJECT_PROGRESS.md'
        ];

        for (const file of progressFiles) {
            const filePath = path.join(projectPath, file);
            if (fs.existsSync(filePath)) {
                return filePath;
            }
        }
        
        return null;
    }

    private async gatherContext(projectPath: string): Promise<ProjectContext> {
        const context: ProjectContext = {
            fileStructure: [],
            framework: 'unknown',
            language: 'unknown'
        };

        try {
            // Get basic file structure
            context.fileStructure = this.getFileStructure(projectPath);
            
            // Detect framework and language
            const detection = this.detectProjectType(projectPath);
            context.framework = detection.framework;
            context.language = detection.language;

            // Get git information if available
            try {
                const { stdout: gitCheck } = await execAsync('git rev-parse --git-dir', { cwd: projectPath });
                if (gitCheck) {
                    const { stdout: status } = await execAsync('git status --porcelain', { cwd: projectPath });
                    context.gitStatus = status.trim();

                    const { stdout: commits } = await execAsync('git log --oneline -3', { cwd: projectPath });
                    context.recentChanges = commits.trim().split('\n').filter(line => line.length > 0);
                }
            } catch (error) {
                // Not a git repo or git error - continue without git info
            }

            // Get dependencies
            context.dependencies = this.getDependencies(projectPath);
            
        } catch (error) {
            console.error('Error gathering context:', error);
        }

        return context;
    }

    private getFileStructure(projectPath: string, depth: number = 0): string[] {
        const files: string[] = [];
        if (depth > 2) return files; // Limit depth
        
        try {
            const items = fs.readdirSync(projectPath);
            
            for (const item of items) {
                if (item.startsWith('.') || item === 'node_modules' || item === 'dist' || item === 'build') {
                    continue;
                }
                
                const itemPath = path.join(projectPath, item);
                const relativePath = path.relative(process.cwd(), itemPath);
                const stat = fs.statSync(itemPath);
                
                if (stat.isDirectory()) {
                    files.push(`${relativePath}/`);
                    if (depth < 2) {
                        files.push(...this.getFileStructure(itemPath, depth + 1));
                    }
                } else if (this.isRelevantFile(item)) {
                    files.push(relativePath);
                }
            }
        } catch (error) {
            // Skip directories we can't read
        }
        
        return files.slice(0, 50); // Limit to 50 files for context
    }

    private isRelevantFile(filename: string): boolean {
        const extensions = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.rs', '.java', '.c', '.cpp', '.h', '.md', '.json', '.yaml', '.yml'];
        const important = ['package.json', 'tsconfig.json', 'requirements.txt', 'Cargo.toml', 'go.mod', 'pom.xml'];
        
        return extensions.some(ext => filename.endsWith(ext)) || important.includes(filename);
    }

    private detectProjectType(projectPath: string): { framework: string; language: string } {
        const files = fs.readdirSync(projectPath);
        
        // Check for specific files
        if (files.includes('package.json')) {
            const packageJson = JSON.parse(fs.readFileSync(path.join(projectPath, 'package.json'), 'utf8'));
            const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
            
            if (deps.react) return { framework: 'React', language: 'JavaScript/TypeScript' };
            if (deps.express) return { framework: 'Express', language: 'JavaScript/TypeScript' };
            if (deps['@angular/core']) return { framework: 'Angular', language: 'TypeScript' };
            if (deps.vue) return { framework: 'Vue.js', language: 'JavaScript/TypeScript' };
            if (deps.next) return { framework: 'Next.js', language: 'JavaScript/TypeScript' };
            
            return { framework: 'Node.js', language: 'JavaScript/TypeScript' };
        }
        
        if (files.includes('requirements.txt') || files.includes('setup.py')) {
            return { framework: 'Python', language: 'Python' };
        }
        
        if (files.includes('Cargo.toml')) {
            return { framework: 'Rust', language: 'Rust' };
        }
        
        if (files.includes('go.mod')) {
            return { framework: 'Go', language: 'Go' };
        }
        
        if (files.includes('pom.xml')) {
            return { framework: 'Java/Maven', language: 'Java' };
        }
        
        return { framework: 'Unknown', language: 'Unknown' };
    }

    private getDependencies(projectPath: string): string[] {
        const deps: string[] = [];
        
        try {
            // Node.js projects
            const packageJsonPath = path.join(projectPath, 'package.json');
            if (fs.existsSync(packageJsonPath)) {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                deps.push(...Object.keys(allDeps).slice(0, 10)); // Limit to top 10
            }
            
            // Python projects
            const requirementsPath = path.join(projectPath, 'requirements.txt');
            if (fs.existsSync(requirementsPath)) {
                const requirements = fs.readFileSync(requirementsPath, 'utf8');
                const pythonDeps = requirements.split('\n')
                    .filter(line => line.trim() && !line.startsWith('#'))
                    .map(line => line.split('==')[0].split('>=')[0].split('<=')[0].trim())
                    .slice(0, 10);
                deps.push(...pythonDeps);
            }
        } catch (error) {
            // Error reading dependencies
        }
        
        return deps;
    }

    private generatePrompt(sessionData: SessionData): string {
        const { projectName, projectPath, startTime, context } = sessionData;
        const duration = Math.round((Date.now() - startTime.getTime()) / 1000 / 60); // minutes
        
        let prompt = `# ${projectName} Development Session Summary\n\n`;
        prompt += `**Session Duration:** ${duration} minutes\n`;
        prompt += `**Project Path:** ${projectPath}\n`;
        prompt += `**Framework:** ${context.framework}\n`;
        prompt += `**Language:** ${context.language}\n\n`;
        
        if (context.gitStatus) {
            prompt += `## Git Status\n\`\`\`\n${context.gitStatus}\n\`\`\`\n\n`;
        }
        
        if (context.recentChanges && context.recentChanges.length > 0) {
            prompt += `## Recent Commits\n`;
            context.recentChanges.forEach(change => prompt += `- ${change}\n`);
            prompt += '\n';
        }
        
        if (context.dependencies && context.dependencies.length > 0) {
            prompt += `## Key Dependencies\n`;
            context.dependencies.slice(0, 8).forEach(dep => prompt += `- ${dep}\n`);
            prompt += '\n';
        }
        
        prompt += `## Project Structure\n`;
        context.fileStructure.slice(0, 20).forEach(file => prompt += `- ${file}\n`);
        
        prompt += `\n## Request\n`;
        prompt += `Please analyze this development session and suggest next steps, improvements, or code reviews based on the project context.\n\n`;
        prompt += `**Focus areas:**\n`;
        prompt += `- Code quality and best practices\n`;
        prompt += `- Performance optimizations\n`;
        prompt += `- Security considerations\n`;
        prompt += `- Architecture improvements\n`;
        prompt += `- Development workflow enhancements\n`;
        
        return prompt;
    }

    private loadSession(): void {
        try {
            if (fs.existsSync(this.sessionFile)) {
                const data = fs.readFileSync(this.sessionFile, 'utf8');
                const sessionData = JSON.parse(data);
                
                if (sessionData.startTime) {
                    sessionData.startTime = new Date(sessionData.startTime);
                }
                
                this.activeSession = sessionData;
            }
        } catch (error) {
            // Invalid session file - start fresh
            this.activeSession = null;
        }
    }

    private async saveSession(): Promise<void> {
        try {
            const data = JSON.stringify(this.activeSession, null, 2);
            fs.writeFileSync(this.sessionFile, data, 'utf8');
        } catch (error) {
            console.error('Failed to save session:', error);
        }
    }
}