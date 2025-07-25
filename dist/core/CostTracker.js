"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CostTracker = void 0;
class CostTracker {
    constructor(configManager) {
        this.configManager = configManager;
        this.monthlySpent = 0;
    }
    async getCurrentUsage() {
        const limit = this.configManager.getMonthlyBudget();
        const spent = this.monthlySpent;
        const remaining = Math.max(0, limit - spent);
        return { limit, spent, remaining };
    }
    async addUsage(cost, description) {
        this.monthlySpent += cost;
        // In a real implementation, this would persist to disk/database
        console.log(`💰 Added usage: $${cost.toFixed(4)} - ${description}`);
    }
    async resetMonthlyUsage() {
        this.monthlySpent = 0;
    }
    async getUsageHistory() {
        // Placeholder for usage history
        return [];
    }
}
exports.CostTracker = CostTracker;
//# sourceMappingURL=CostTracker.js.map