import chalk from 'chalk';
import ora from 'ora';
import { SecurityScanner } from '../core/SecurityScanner';
import { SessionManager } from '../core/SessionManager';

export async function analyzeSecurity(securityScanner: SecurityScanner, sessionManager: SessionManager): Promise<void> {
    const activeSession = sessionManager.getActiveSession();
    const projectPath = activeSession?.projectPath || process.cwd();
    
    const spinner = ora('Running security analysis...').start();
    
    try {
        const results = await securityScanner.scan(projectPath);
        spinner.succeed(`Security scan completed in ${results.duration}ms`);
        
        const summary = securityScanner.getSummary(results);
        console.log('\n' + summary);
        
        // Cost savings message
        console.log(chalk.green('💰 Cost: FREE (local analysis)'));
        console.log(chalk.gray('   Cloud equivalent: ~$5-15 per scan'));
        
    } catch (error) {
        spinner.fail('Security analysis failed');
        console.error(chalk.red('Error:'), error);
    }
}