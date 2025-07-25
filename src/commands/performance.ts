import chalk from 'chalk';
import ora from 'ora';
import { PerformanceAnalyzer } from '../core/PerformanceAnalyzer';
import { SessionManager } from '../core/SessionManager';

export async function analyzePerformance(performanceAnalyzer: PerformanceAnalyzer, sessionManager: SessionManager): Promise<void> {
    const activeSession = sessionManager.getActiveSession();
    
    const spinner = ora('Running performance analysis...').start();
    
    try {
        const projectPath = activeSession?.projectPath || process.cwd();
        const results = await performanceAnalyzer.analyze(projectPath);
        
        spinner.succeed('Performance analysis completed');
        
        // Display formatted results
        console.log('\n' + performanceAnalyzer.formatResults(results));
        
        console.log(chalk.green('💰 Cost Savings:'));
        console.log(chalk.white('   Performance Analysis: FREE (SuperRez local engine)'));
        console.log(chalk.gray('   Cloud equivalent: ~$3-10 per scan'));
        
    } catch (error) {
        spinner.fail('Performance analysis failed');
        console.error(chalk.red('Error:'), error);
    }
}