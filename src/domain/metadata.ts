/**
 * Optional provenance metadata for game-definition records. The Diablo
 * Immortal dataset is built incrementally from external observation, so
 * definitions must be able to carry how confident we are in them without
 * every record being required to.
 */
export interface GameDefinitionMetadata {
  readonly source?: string;
  readonly verifiedAt?: string;
  readonly confidence?: "confirmed" | "likely" | "unknown";
  readonly gameVersion?: string;
  readonly notes?: string;
}
