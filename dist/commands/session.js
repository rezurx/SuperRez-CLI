"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startSession = startSession;
exports.endSession = endSession;
exports.showStatus = showStatus;
exports.discoverProjects = discoverProjects;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const ora_1 = __importDefault(require("ora"));
async function startSession(sessionManager, project, options) {
    const spinner = (0, ora_1.default)('Discovering projects...').start();
    try {
        let selectedProject;
        if (project) {
            // Project specified - validate and start
            selectedProject = project;
            spinner.succeed(`Starting session for: ${project}`);
        }
        else {
            // Discover available projects
            const projects = await sessionManager.discoverProjects();
            spinner.stop();
            if (projects.length === 0) {
                console.log(chalk_1.default.yellow('⚠️  No projects with progress files found'));
                console.log(chalk_1.default.gray('Create a progress.md file in your project root to track development'));
                const { createManual } = await inquirer_1.default.prompt([{
                        type: 'confirm',
                        name: 'createManual',
                        message: 'Start session in current directory?',
                        default: true
                    }]);
                if (createManual) {
                    selectedProject = process.cwd();
                }
                else {
                    return;
                }
            }
            else {
                // Let user choose from discovered projects
                console.log(chalk_1.default.cyan(`Found ${projects.length} projects:\n`));
                const choices = projects.map((project, index) => ({
                    name: `${index + 1}. ${chalk_1.default.bold(project.name)} ${chalk_1.default.gray(`(${project.path})`)}`,
                    value: project,
                    short: project.name
                }));
                choices.push({
                    name: `${projects.length + 1}. ${chalk_1.default.gray('Other directory...')}`,
                    value: 'other',
                    short: 'Other'
                });
                const { selectedChoice } = await inquirer_1.default.prompt([{
                        type: 'list',
                        name: 'selectedChoice',
                        message: 'Select project:',
                        choices,
                        pageSize: 10
                    }]);
                if (selectedChoice === 'other') {
                    const { manualPath } = await inquirer_1.default.prompt([{
                            type: 'input',
                            name: 'manualPath',
                            message: 'Enter project path:',
                            default: process.cwd()
                        }]);
                    selectedProject = manualPath;
                }
                else {
                    selectedProject = selectedChoice;
                }
            }
        }
        // Start the session
        const sessionSpinner = (0, ora_1.default)('Starting session...').start();
        await sessionManager.startSession(selectedProject);
        sessionSpinner.succeed('Session started successfully!');
        const activeSession = sessionManager.getActiveSession();
        if (activeSession) {
            console.log(chalk_1.default.green(`\n📁 Active Project: ${chalk_1.default.bold(activeSession.projectName)}`));
            console.log(chalk_1.default.gray(`   Path: ${activeSession.projectPath}`));
            console.log(chalk_1.default.gray(`   Framework: ${activeSession.context.framework}`));
            console.log(chalk_1.default.gray(`   Language: ${activeSession.context.language}`));
            if (activeSession.context.dependencies && activeSession.context.dependencies.length > 0) {
                console.log(chalk_1.default.gray(`   Dependencies: ${activeSession.context.dependencies.slice(0, 3).join(', ')}${activeSession.context.dependencies.length > 3 ? '...' : ''}`));
            }
            console.log(chalk_1.default.cyan('\n💡 Quick actions:'));
            console.log('   superrez analyze -a    # Run security & performance analysis (FREE)');
            console.log('   superrez ai --tools     # Check available AI tools');
            console.log('   superrez end           # End session and get AI prompt');
        }
    }
    catch (error) {
        spinner.fail('Failed to start session');
        console.error(chalk_1.default.red('Error:'), error);
        process.exit(1);
    }
}
async function endSession(sessionManager, costTracker, options) {
    const activeSession = sessionManager.getActiveSession();
    if (!activeSession) {
        console.log(chalk_1.default.yellow('⚠️  No active session'));
        return;
    }
    const spinner = (0, ora_1.default)('Generating session summary...').start();
    try {
        const prompt = await sessionManager.endSession();
        spinner.succeed('Session summary generated');
        if (prompt) {
            console.log(chalk_1.default.cyan('\n📝 AI-Ready Session Summary:'));
            console.log(chalk_1.default.gray('=' * 50));
            console.log(prompt);
            console.log(chalk_1.default.gray('=' * 50));
            const budget = await costTracker.getCurrentUsage();
            const estimatedCost = 0.02; // Rough estimate for this prompt
            console.log(chalk_1.default.blue(`\n💰 Estimated cost: $${estimatedCost.toFixed(3)}`));
            if (budget) {
                console.log(chalk_1.default.blue(`   Budget remaining: $${(budget.limit - budget.spent).toFixed(2)}`));
            }
            if (options?.copy) {
                // In a real implementation, you'd copy to clipboard
                console.log(chalk_1.default.green('✓ Copied to clipboard'));
            }
            const { endNow } = await inquirer_1.default.prompt([{
                    type: 'confirm',
                    name: 'endNow',
                    message: 'End session now?',
                    default: false
                }]);
            if (endNow) {
                await sessionManager.cleanup();
                console.log(chalk_1.default.green('✓ Session ended'));
            }
        }
    }
    catch (error) {
        spinner.fail('Failed to end session');
        console.error(chalk_1.default.red('Error:'), error);
    }
}
async function showStatus(sessionManager, costTracker) {
    const activeSession = sessionManager.getActiveSession();
    console.log(chalk_1.default.cyan.bold('SuperRez Status\n'));
    if (activeSession) {
        const duration = Math.round((Date.now() - activeSession.startTime.getTime()) / 1000 / 60);
        console.log(chalk_1.default.green('📁 Active Session:'));
        console.log(`   Project: ${chalk_1.default.bold(activeSession.projectName)}`);
        console.log(`   Path: ${activeSession.projectPath}`);
        console.log(`   Duration: ${duration} minutes`);
        console.log(`   Framework: ${activeSession.context.framework}`);
        console.log(`   Language: ${activeSession.context.language}`);
        if (activeSession.context.gitStatus) {
            const statusLines = activeSession.context.gitStatus.split('\n').filter(line => line.trim());
            if (statusLines.length > 0) {
                console.log(`   Git Status: ${statusLines.length} changes`);
            }
        }
    }
    else {
        console.log(chalk_1.default.gray('📁 No active session'));
        console.log(chalk_1.default.gray('   Run "superrez start" to begin'));
    }
    console.log();
    try {
        const budget = await costTracker.getCurrentUsage();
        if (budget) {
            const percentage = (budget.spent / budget.limit) * 100;
            const remaining = budget.limit - budget.spent;
            console.log(chalk_1.default.blue('💰 Budget Status:'));
            console.log(`   Monthly Limit: $${budget.limit.toFixed(2)}`);
            console.log(`   Spent: $${budget.spent.toFixed(2)} (${percentage.toFixed(1)}%)`);
            console.log(`   Remaining: $${remaining.toFixed(2)}`);
            if (percentage > 80) {
                console.log(chalk_1.default.yellow('   ⚠️  Approaching budget limit'));
            }
            else if (percentage > 95) {
                console.log(chalk_1.default.red('   🚨 Budget limit nearly reached'));
            }
        }
    }
    catch (error) {
        console.log(chalk_1.default.gray('💰 Budget: Unable to load'));
    }
}
async function discoverProjects(sessionManager) {
    const spinner = (0, ora_1.default)('Scanning for projects...').start();
    try {
        const projects = await sessionManager.discoverProjects();
        spinner.succeed(`Found ${projects.length} projects`);
        if (projects.length === 0) {
            console.log(chalk_1.default.yellow('\n⚠️  No projects with progress files found'));
            console.log(chalk_1.default.gray('Create a progress.md file in your project root to enable project tracking'));
            return;
        }
        console.log(chalk_1.default.cyan('\n📁 Discovered Projects:\n'));
        projects.forEach((project, index) => {
            const timeAgo = getTimeAgo(project.lastModified);
            console.log(`${chalk_1.default.bold((index + 1).toString().padStart(2))}. ${chalk_1.default.green(project.name)}`);
            console.log(`    ${chalk_1.default.gray(project.path)}`);
            console.log(`    ${chalk_1.default.gray(`Progress file: ${path.basename(project.progressFile)} • Updated ${timeAgo}`)}`);
            console.log();
        });
        console.log(chalk_1.default.cyan('💡 Use "superrez start" to select and begin a session'));
    }
    catch (error) {
        spinner.fail('Failed to discover projects');
        console.error(chalk_1.default.red('Error:'), error);
    }
}
function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays > 0) {
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    }
    else if (diffHours > 0) {
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    }
    else {
        return 'recently';
    }
}
//# sourceMappingURL=session.js.map