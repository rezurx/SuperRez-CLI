"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostTracker = void 0;
class CostTracker {
    constructor(configManager) {
        this.configManager = configManager;
    }
    async getCurrentUsage() {
        const limit = this.configManager.getMonthlyBudget();
        // For now, return placeholder data
        return { limit, spent: 0 };
    }
}
exports.CostTracker = CostTracker;
//# sourceMappingURL=CostTracker.js.map