import { describe, it, expect } from 'vitest';
import { findOverBudgetFields, budgetFor } from './slideFieldBudgets';

// P8a: the single source of per-field budgets that both the corpusChatService
// summarize-to-budget re-ask and validate_no_truncation.py read. These pin the
// budget resolution + over-budget detection that drive the no-truncation contract.

describe('slideFieldBudgets', () => {
    it('resolves template-specific budgets, falling back to __common', () => {
        expect(budgetFor('theme-cluster', 'insight')).toBe(180);
        expect(budgetFor('theme-spotlight', 'insight')).toBe(400);
        expect(budgetFor('anything', 'title')).toBe(120); // __common
        expect(budgetFor('theme-cluster', 'nonexistent')).toBeNull();
    });

    it('flags an over-budget field, ignores within-budget + skip keys', () => {
        const longInsight = 'A'.repeat(200); // theme-cluster insight cap is 180
        const over = findOverBudgetFields([
            { template: 'theme-cluster', title: 'fine', themeCluster: { themes: [
                { name: 'ok', insight: longInsight, source: 'X'.repeat(500) /* skip key, ignored */ },
                { name: 'ok2', insight: 'short complete thought.' },
            ] } },
        ]);
        expect(over).toHaveLength(1);
        expect(over[0].field).toBe('insight');
        expect(over[0].budget).toBe(180);
        expect(over[0].len).toBe(200);
    });

    it('returns nothing for a fully within-budget deck', () => {
        const over = findOverBudgetFields([
            { template: 'section-divider', title: 'A complete action title', sectionDivider: { subtitle: 'Short subtitle.' } },
        ]);
        expect(over).toHaveLength(0);
    });
});
