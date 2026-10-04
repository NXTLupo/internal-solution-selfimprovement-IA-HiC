/** The one-outcome splitter on the 2026-10-02 live #prd sentences that it used to garble. */
import { describe, it, expect } from 'vitest';
import { splitCompound } from './prdRulesContract';

describe('one-outcome split (live regressions)', () => {
    it('never splits a shared object, a noun list or a noun that ends in s', () => {
        expect(splitCompound('A co-op advisor reviews and approves each answer in the companion content base before any student can receive that answer.')).toBeNull();
        expect(splitCompound('The First-Year Onboarding Companion gives incoming students guidance, navigation help, and answers to questions from approved university content.')).toBeNull();
        // "readiness" ends in s but is not the verb; with no object opener after "keeps" the pair stays unsplit.
        expect(splitCompound('The readiness experience keeps progress continuous from the first term, and grows each term across every later co-op.')).toBeNull();
    });
    it('splits a real pair of outcomes into two whole sentences', () => {
        expect(splitCompound('The experience shows each student the assigned advisor, and tells the student when no assignment is available.')).toEqual([
            'The experience shows each student the assigned advisor.',
            'The experience tells the student when no assignment is available.',
        ]);
    });
});

describe('one-outcome split: relative clauses (run 3)', () => {
    it('does not read a plural noun with a relative clause as a second verb', () => {
        expect(splitCompound('The Hub shows each student the current deadline, and resources that apply to the student stage.')).toBeNull();
    });
});

describe('one-outcome split: noun pairs (second project, 2026-10-03)', () => {
    it('does not split a plural noun pair joined by a bare "and"', () => {
        expect(splitCompound('The plan builder has the farmer record alternative suppliers and vendors the farm could use if a supplier fails.')).toBeNull();
        expect(splitCompound('The plan builder has the farmer identify the threats and risks the farm faces across every category.')).toBeNull();
    });
    it('still splits a comma-joined verb pair', () => {
        expect(splitCompound('The experience shows each student the assigned advisor, and tells the student when no assignment is available.')).not.toBeNull();
    });
});
