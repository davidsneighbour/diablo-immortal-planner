import type {
  ActivityId,
  GoalId,
  ProgressionSystemId,
  ResourceId,
} from "./id.js";
import type { Scope } from "./scope.js";

/**
 * A player-defined objective, scoped to the account or to one character.
 * Different characters can pursue entirely independent goals. Goals are
 * player state (not a game definition) and are intended to feed the
 * future prioritisation engine (Milestone 14).
 */
export interface Goal {
  readonly id: GoalId;
  readonly scope: Scope;
  readonly name: string;
  readonly description?: string;
  readonly targetResourceId?: ResourceId;
  readonly targetQuantity?: number;
  readonly targetProgressionSystemId?: ProgressionSystemId;
  readonly targetLevel?: number;
  readonly relatedActivityIds?: readonly ActivityId[];
  readonly createdAt: string;
  readonly completedAt?: string;
}
