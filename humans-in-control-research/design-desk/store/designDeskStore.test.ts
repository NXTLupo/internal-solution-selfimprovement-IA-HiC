import { describe, it, expect, beforeEach } from 'vitest';
import { useDesignDeskStore } from './designDeskStore';
import personaFixture from '../__fixtures__/persona.valid.json';
import journeyFixture from '../__fixtures__/journey.valid.json';
import type { PersonaArtifact } from '../schemas/personaArtifact';
import type { JourneyArtifact } from '../schemas/journeyArtifact';

describe('designDeskStore', () => {
    beforeEach(() => {
        useDesignDeskStore.getState().reset();
    });

    it('starts empty', () => {
        const s = useDesignDeskStore.getState();
        expect(s.artifacts).toEqual([]);
        expect(s.activeArtifactId).toBeNull();
    });

    it('addArtifact appends and activates', () => {
        useDesignDeskStore.getState().addArtifact(personaFixture as PersonaArtifact);
        const s = useDesignDeskStore.getState();
        expect(s.artifacts).toHaveLength(1);
        expect(s.activeArtifactId).toBe(personaFixture.id);
    });

    it('replaceArtifact swaps by id and pushes history', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        const updated = { ...personaFixture, name: 'Alex Chen' } as PersonaArtifact;
        store.replaceArtifact(updated);
        expect((useDesignDeskStore.getState().artifacts[0] as PersonaArtifact).name).toBe('Alex Chen');
        expect(useDesignDeskStore.getState().history).toHaveLength(1);
    });

    it('undo restores previous state', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        const updated = { ...personaFixture, name: 'Alex Chen' } as PersonaArtifact;
        store.replaceArtifact(updated);
        store.undo();
        expect((useDesignDeskStore.getState().artifacts[0] as PersonaArtifact).name).toBe('Sarah Chen');
    });

    it('undo is no-op when history empty', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        store.undo();
        expect(useDesignDeskStore.getState().artifacts).toHaveLength(1);
    });

    it('supports multiple artifacts of different types', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        store.addArtifact(journeyFixture as JourneyArtifact);
        expect(useDesignDeskStore.getState().artifacts).toHaveLength(2);
        expect(useDesignDeskStore.getState().activeArtifactId).toBe(journeyFixture.id);
    });

    it('setActiveArtifact switches focus', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        store.addArtifact(journeyFixture as JourneyArtifact);
        store.setActiveArtifact(personaFixture.id);
        expect(useDesignDeskStore.getState().activeArtifactId).toBe(personaFixture.id);
    });

    it('removeArtifact drops and updates active if needed', () => {
        const store = useDesignDeskStore.getState();
        store.addArtifact(personaFixture as PersonaArtifact);
        store.removeArtifact(personaFixture.id);
        expect(useDesignDeskStore.getState().artifacts).toHaveLength(0);
        expect(useDesignDeskStore.getState().activeArtifactId).toBeNull();
    });
});
