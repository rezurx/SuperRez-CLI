"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startInteractiveMode = startInteractiveMode;
const chalk_1 = __importDefault(require("chalk"));
async function startInteractiveMode(context) {
    console.log(chalk_1.default.cyan('🚀 Interactive Mode'));
    console.log(chalk_1.default.gray('Implementation coming in next iteration'));
    console.log(chalk_1.default.yellow('Use individual commands for now:'));
    console.log('  superrez start        # Start session');
    console.log('  superrez analyze -a   # Run analysis');
    console.log('  superrez status       # Show status');
}
//# sourceMappingURL=interactive.js.map