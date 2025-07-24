"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostTracker = void 0;
class CostTracker {
    constructor(configManager) {
        this.configManager = configManager;
    }
    async getCurrentUsage() {
        const limit = this.configManager.getMonthlyBudget();
        const spent = 0; // For now, return placeholder data
        const remaining = limit - spent;
        return { limit, spent, remaining };
    }
}
exports.CostTracker = CostTracker;
//# sourceMappingURL=CostTracker.js.map