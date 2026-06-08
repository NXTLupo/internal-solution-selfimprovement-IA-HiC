import type { PersonaArtifact } from './schemas/personaArtifact';
// LEGACY - scheduled for deletion in Task 15 (freeform-HTML migration). Do not
// build new code that depends on JourneyArtifact or OrgChartArtifact; use
// FreeformArtifact via #journey/#org/#arch/#roadmap/#blueprint hashtags.
import type { JourneyArtifact } from './schemas/journeyArtifact';
import type { OrgChartArtifact } from './schemas/orgChartArtifact';
import type { FreeformArtifact } from './schemas/freeformArtifact';

export type Artifact = PersonaArtifact | JourneyArtifact | OrgChartArtifact | FreeformArtifact;
export type ArtifactType = Artifact['type'];
