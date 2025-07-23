import chalk from 'chalk';
import { CLIContext } from '../interfaces';

export async function startInteractiveMode(context: CLIContext): Promise<void> {
    console.log(chalk.cyan('🚀 Interactive Mode'));
    console.log(chalk.gray('Implementation coming in next iteration'));
    console.log(chalk.yellow('Use individual commands for now:'));
    console.log('  superrez start        # Start session');
    console.log('  superrez analyze -a   # Run analysis');
    console.log('  superrez status       # Show status');
}