"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzePerformance = analyzePerformance;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
async function analyzePerformance(performanceAnalyzer, sessionManager) {
    const activeSession = sessionManager.getActiveSession();
    const spinner = (0, ora_1.default)('Running performance analysis...').start();
    try {
        const projectPath = activeSession?.projectPath || process.cwd();
        const results = await performanceAnalyzer.analyze(projectPath);
        spinner.succeed('Performance analysis completed');
        // Display formatted results
        console.log('\n' + performanceAnalyzer.formatResults(results));
        console.log(chalk_1.default.green('💰 Cost Savings:'));
        console.log(chalk_1.default.white('   Performance Analysis: FREE (SuperRez local engine)'));
        console.log(chalk_1.default.gray('   Cloud equivalent: ~$3-10 per scan'));
    }
    catch (error) {
        spinner.fail('Performance analysis failed');
        console.error(chalk_1.default.red('Error:'), error);
    }
}
//# sourceMappingURL=performance.js.map