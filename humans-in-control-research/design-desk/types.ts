import type { PersonaArtifact } from './schemas/personaArtifact';
import type { JourneyArtifact } from './schemas/journeyArtifact';
import type { OrgChartArtifact } from './schemas/orgChartArtifact';

export type Artifact = PersonaArtifact | JourneyArtifact | OrgChartArtifact;
export type ArtifactType = Artifact['type'];
