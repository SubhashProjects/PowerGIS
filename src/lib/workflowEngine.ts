export class WorkflowTransitionError extends Error {
  readonly code = 'INVALID_WORKFLOW_TRANSITION';
  constructor(public readonly entity: string, public readonly from: string, public readonly to: string) {
    super(`${entity} cannot transition from ${from} to ${to}.`);
  }
}

export type WorkflowDefinition = Record<string, readonly string[]>;

export const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  work_order: {
    assigned: ['in_progress'],
    in_progress: ['completed'],
    completed: ['verified'],
    verified: ['closed'],
    closed: [],
  },
  fault: {
    new: ['assigned'],
    assigned: ['acknowledged', 'in_progress'],
    acknowledged: ['in_progress'],
    in_progress: ['material_required', 'completed'],
    material_required: ['in_progress'],
    awaiting_approval: ['completed'],
    completed: ['verified'],
    verified: ['closed', 'reopened'],
    closed: ['reopened'],
    reopened: ['assigned'],
  },
  outage: { active: ['restored'], restored: [] },
};

export function assertWorkflowTransition(entity: string, from: string, to: string): void {
  if (from === to) return;
  const allowed = WORKFLOW_DEFINITIONS[entity]?.[from] ?? [];
  if (!allowed.includes(to)) throw new WorkflowTransitionError(entity, from, to);
}

export function canTransition(entity: string, from: string, to: string): boolean {
  try { assertWorkflowTransition(entity, from, to); return true; } catch { return false; }
}
