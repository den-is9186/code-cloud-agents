/**
 * Workflow State Machine for Code Cloud Agents
 *
 * Manages the lifecycle of team builds with two-phase approval workflow:
 * - Phase 1: Prototype (Budget ~$8)
 * - Approval Gate
 * - Phase 2: Premium (Budget ~$130) - Optional
 */

// State Definitions
const States = {
  TEAM_CREATED: 'TEAM_CREATED',
  PROTOTYPE_RUNNING: 'PROTOTYPE_RUNNING',
  AWAITING_APPROVAL: 'AWAITING_APPROVAL',
  APPROVED: 'APPROVED',
  PREMIUM_RUNNING: 'PREMIUM_RUNNING',
  COMPLETED: 'COMPLETED',
  REJECTED: 'REJECTED',
  PARTIAL: 'PARTIAL',
  SKIPPED: 'SKIPPED',
  FAILED: 'FAILED',
};

// Event Definitions
const Events = {
  START_PROTOTYPE: 'START_PROTOTYPE',
  PROTOTYPE_COMPLETE: 'PROTOTYPE_COMPLETE',
  PROTOTYPE_FAILED: 'PROTOTYPE_FAILED',
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  SKIP_PREMIUM: 'SKIP_PREMIUM',
  START_PREMIUM: 'START_PREMIUM',
  PREMIUM_COMPLETE: 'PREMIUM_COMPLETE',
  PREMIUM_FAILED: 'PREMIUM_FAILED',
};

// State Machine Transitions
const Transitions = {
  [States.TEAM_CREATED]: {
    [Events.START_PROTOTYPE]: States.PROTOTYPE_RUNNING,
  },
  [States.PROTOTYPE_RUNNING]: {
    [Events.PROTOTYPE_COMPLETE]: States.AWAITING_APPROVAL,
    [Events.PROTOTYPE_FAILED]: States.FAILED,
  },
  [States.AWAITING_APPROVAL]: {
    [Events.APPROVE]: States.APPROVED,
    [Events.REJECT]: States.REJECTED,
    [Events.SKIP_PREMIUM]: States.PARTIAL,
  },
  [States.APPROVED]: {
    [Events.START_PREMIUM]: States.PREMIUM_RUNNING,
  },
  [States.PREMIUM_RUNNING]: {
    [Events.PREMIUM_COMPLETE]: States.COMPLETED,
    [Events.PREMIUM_FAILED]: States.FAILED,
  },
  // Terminal states have no transitions
  [States.COMPLETED]: {},
  [States.REJECTED]: {},
  [States.PARTIAL]: {},
  [States.FAILED]: {},
  [States.SKIPPED]: {}, // Legacy support
};

// State metadata
const StateMetadata = {
  [States.TEAM_CREATED]: {
    description: 'Team created, ready to start prototype phase',
    isTerminal: false,
    phase: null,
  },
  [States.PROTOTYPE_RUNNING]: {
    description: 'Prototype phase in progress',
    isTerminal: false,
    phase: 'prototype',
  },
  [States.AWAITING_APPROVAL]: {
    description: 'Prototype complete, awaiting user approval',
    isTerminal: false,
    phase: 'approval',
  },
  [States.APPROVED]: {
    description: 'Prototype approved, ready for premium phase',
    isTerminal: false,
    phase: 'approval',
  },
  [States.PREMIUM_RUNNING]: {
    description: 'Premium phase in progress',
    isTerminal: false,
    phase: 'premium',
  },
  [States.COMPLETED]: {
    description: 'All phases completed successfully',
    isTerminal: true,
    phase: 'complete',
  },
  [States.REJECTED]: {
    description: 'Prototype rejected by user',
    isTerminal: true,
    phase: 'approval',
  },
  [States.PARTIAL]: {
    description: 'Prototype completed, premium phase skipped',
    isTerminal: true,
    phase: 'approval',
  },
  [States.SKIPPED]: {
    description: 'Premium phase skipped (legacy)',
    isTerminal: true,
    phase: 'approval',
  },
  [States.FAILED]: {
    description: 'Build failed',
    isTerminal: true,
    phase: 'error',
  },
};

/**
 * State Machine Class
 */
class WorkflowStateMachine {
  constructor(initialState = States.TEAM_CREATED) {
    this.currentState = initialState;
    this.history = [
      {
        state: initialState,
        timestamp: new Date().toISOString(),
        event: null,
      },
    ];
  }

  /**
   * Get current state
   */
  getState() {
    return this.currentState;
  }

  /**
   * Get state history
   */
  getHistory() {
    return this.history;
  }

  /**
   * Check if current state is terminal
   */
  isTerminal() {
    return StateMetadata[this.currentState]?.isTerminal || false;
  }

  /**
   * Get current phase
   */
  getCurrentPhase() {
    return StateMetadata[this.currentState]?.phase || null;
  }

  /**
   * Get available transitions from current state
   */
  getAvailableTransitions() {
    return Object.keys(Transitions[this.currentState] || {});
  }

  /**
   * Check if a transition is valid
   */
  canTransition(event) {
    const transitions = Transitions[this.currentState];
    return transitions && transitions[event] !== undefined;
  }

  /**
   * Perform a state transition
   */
  transition(event, metadata = {}) {
    if (this.isTerminal()) {
      throw new Error(
        `Cannot transition from terminal state '${this.currentState}'`
      );
    }

    if (!this.canTransition(event)) {
      throw new Error(
        `Invalid transition: cannot apply event '${event}' in state '${this.currentState}'`
      );
    }

    const previousState = this.currentState;
    const nextState = Transitions[this.currentState][event];

    this.currentState = nextState;
    this.history.push({
      state: nextState,
      previousState,
      event,
      timestamp: new Date().toISOString(),
      metadata,
    });

    return {
      previousState,
      currentState: nextState,
      event,
      timestamp: this.history[this.history.length - 1].timestamp,
    };
  }

  /**
   * Get state machine as JSON
   */
  toJSON() {
    return {
      currentState: this.currentState,
      isTerminal: this.isTerminal(),
      currentPhase: this.getCurrentPhase(),
      availableTransitions: this.getAvailableTransitions(),
      history: this.history,
    };
  }

  /**
   * Create state machine from JSON
   */
  static fromJSON(data) {
    const machine = new WorkflowStateMachine(data.currentState);
    machine.history = data.history || [];
    return machine;
  }
}

/**
 * Helper: Check if state is a success state
 */
function isSuccessState(state) {
  return state === States.COMPLETED || state === States.PARTIAL;
}

/**
 * Helper: Check if state is a failure state
 */
function isFailureState(state) {
  return state === States.FAILED || state === States.REJECTED;
}

/**
 * Helper: Check if state requires user action
 */
function requiresUserAction(state) {
  return state === States.AWAITING_APPROVAL;
}

/**
 * Helper: Check if state is in progress
 */
function isInProgress(state) {
  return (
    state === States.PROTOTYPE_RUNNING ||
    state === States.PREMIUM_RUNNING ||
    state === States.APPROVED
  );
}

/**
 * Get next recommended event for a state
 */
function getNextRecommendedEvent(state) {
  switch (state) {
    case States.TEAM_CREATED:
      return Events.START_PROTOTYPE;
    case States.APPROVED:
      return Events.START_PREMIUM;
    case States.PROTOTYPE_RUNNING:
      return Events.PROTOTYPE_COMPLETE;
    case States.PREMIUM_RUNNING:
      return Events.PREMIUM_COMPLETE;
    case States.AWAITING_APPROVAL:
      return null; // User must decide
    default:
      return null;
  }
}

/**
 * Validate state transition with business rules
 */
function validateTransition(currentState, event, context = {}) {
  const errors = [];

  // Check if transition is allowed
  if (!Transitions[currentState] || !Transitions[currentState][event]) {
    errors.push(`Transition '${event}' not allowed from state '${currentState}'`);
  }

  // Business rule: Cannot approve/reject if not in AWAITING_APPROVAL
  if (
    [Events.APPROVE, Events.REJECT, Events.SKIP_PREMIUM].includes(event) &&
    currentState !== States.AWAITING_APPROVAL
  ) {
    errors.push('Can only approve/reject/skip when awaiting approval');
  }

  // Business rule: Cannot start premium if not approved
  if (event === Events.START_PREMIUM && currentState !== States.APPROVED) {
    errors.push('Can only start premium phase after approval');
  }

  // Business rule: Check if terminal state
  if (StateMetadata[currentState]?.isTerminal) {
    errors.push(`Cannot transition from terminal state '${currentState}'`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// Export all components
module.exports = {
  States,
  Events,
  Transitions,
  StateMetadata,
  WorkflowStateMachine,
  isSuccessState,
  isFailureState,
  requiresUserAction,
  isInProgress,
  getNextRecommendedEvent,
  validateTransition,
};
