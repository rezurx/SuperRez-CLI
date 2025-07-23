"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeSecurity = analyzeSecurity;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
async function analyzeSecurity(securityScanner, sessionManager) {
    const activeSession = sessionManager.getActiveSession();
    const projectPath = activeSession?.projectPath || process.cwd();
    const spinner = (0, ora_1.default)('Running security analysis...').start();
    try {
        const results = await securityScanner.scan(projectPath);
        spinner.succeed(`Security scan completed in ${results.duration}ms`);
        const summary = securityScanner.getSummary(results);
        console.log('\n' + summary);
        // Cost savings message
        console.log(chalk_1.default.green('💰 Cost: FREE (local analysis)'));
        console.log(chalk_1.default.gray('   Cloud equivalent: ~$5-15 per scan'));
    }
    catch (error) {
        spinner.fail('Security analysis failed');
        console.error(chalk_1.default.red('Error:'), error);
    }
}
//# sourceMappingURL=security.js.map