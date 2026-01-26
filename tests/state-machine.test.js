const {
  States,
  Events,
  WorkflowStateMachine,
  isSuccessState,
  isFailureState,
  requiresUserAction,
  isInProgress,
  getNextRecommendedEvent,
  validateTransition,
} = require('../src/workflow/state-machine');

describe('Workflow State Machine', () => {
  describe('States and Events', () => {
    test('should have all required states defined', () => {
      expect(States.TEAM_CREATED).toBe('TEAM_CREATED');
      expect(States.PROTOTYPE_RUNNING).toBe('PROTOTYPE_RUNNING');
      expect(States.AWAITING_APPROVAL).toBe('AWAITING_APPROVAL');
      expect(States.APPROVED).toBe('APPROVED');
      expect(States.PREMIUM_RUNNING).toBe('PREMIUM_RUNNING');
      expect(States.COMPLETED).toBe('COMPLETED');
      expect(States.REJECTED).toBe('REJECTED');
      expect(States.PARTIAL).toBe('PARTIAL');
      expect(States.SKIPPED).toBe('SKIPPED');
      expect(States.FAILED).toBe('FAILED');
    });

    test('should have all required events defined', () => {
      expect(Events.START_PROTOTYPE).toBe('START_PROTOTYPE');
      expect(Events.PROTOTYPE_COMPLETE).toBe('PROTOTYPE_COMPLETE');
      expect(Events.PROTOTYPE_FAILED).toBe('PROTOTYPE_FAILED');
      expect(Events.APPROVE).toBe('APPROVE');
      expect(Events.REJECT).toBe('REJECT');
      expect(Events.SKIP_PREMIUM).toBe('SKIP_PREMIUM');
      expect(Events.START_PREMIUM).toBe('START_PREMIUM');
      expect(Events.PREMIUM_COMPLETE).toBe('PREMIUM_COMPLETE');
      expect(Events.PREMIUM_FAILED).toBe('PREMIUM_FAILED');
    });
  });

  describe('WorkflowStateMachine - Initialization', () => {
    test('should initialize with TEAM_CREATED state', () => {
      const machine = new WorkflowStateMachine();
      expect(machine.getState()).toBe(States.TEAM_CREATED);
    });

    test('should initialize with custom state', () => {
      const machine = new WorkflowStateMachine(States.PROTOTYPE_RUNNING);
      expect(machine.getState()).toBe(States.PROTOTYPE_RUNNING);
    });

    test('should have initial history entry', () => {
      const machine = new WorkflowStateMachine();
      const history = machine.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].state).toBe(States.TEAM_CREATED);
      expect(history[0].event).toBeNull();
    });

    test('should not be terminal initially', () => {
      const machine = new WorkflowStateMachine();
      expect(machine.isTerminal()).toBe(false);
    });
  });

  describe('WorkflowStateMachine - Transitions', () => {
    test('should transition from TEAM_CREATED to PROTOTYPE_RUNNING', () => {
      const machine = new WorkflowStateMachine();
      const result = machine.transition(Events.START_PROTOTYPE);

      expect(result.previousState).toBe(States.TEAM_CREATED);
      expect(result.currentState).toBe(States.PROTOTYPE_RUNNING);
      expect(result.event).toBe(Events.START_PROTOTYPE);
      expect(machine.getState()).toBe(States.PROTOTYPE_RUNNING);
    });

    test('should transition from PROTOTYPE_RUNNING to AWAITING_APPROVAL', () => {
      const machine = new WorkflowStateMachine(States.PROTOTYPE_RUNNING);
      machine.transition(Events.PROTOTYPE_COMPLETE);

      expect(machine.getState()).toBe(States.AWAITING_APPROVAL);
    });

    test('should transition from AWAITING_APPROVAL to APPROVED', () => {
      const machine = new WorkflowStateMachine(States.AWAITING_APPROVAL);
      machine.transition(Events.APPROVE);

      expect(machine.getState()).toBe(States.APPROVED);
    });

    test('should transition from AWAITING_APPROVAL to REJECTED', () => {
      const machine = new WorkflowStateMachine(States.AWAITING_APPROVAL);
      machine.transition(Events.REJECT);

      expect(machine.getState()).toBe(States.REJECTED);
    });

    test('should transition from AWAITING_APPROVAL to PARTIAL', () => {
      const machine = new WorkflowStateMachine(States.AWAITING_APPROVAL);
      machine.transition(Events.SKIP_PREMIUM);

      expect(machine.getState()).toBe(States.PARTIAL);
    });

    test('should transition from APPROVED to PREMIUM_RUNNING', () => {
      const machine = new WorkflowStateMachine(States.APPROVED);
      machine.transition(Events.START_PREMIUM);

      expect(machine.getState()).toBe(States.PREMIUM_RUNNING);
    });

    test('should transition from PREMIUM_RUNNING to COMPLETED', () => {
      const machine = new WorkflowStateMachine(States.PREMIUM_RUNNING);
      machine.transition(Events.PREMIUM_COMPLETE);

      expect(machine.getState()).toBe(States.COMPLETED);
    });

    test('should transition from PROTOTYPE_RUNNING to FAILED', () => {
      const machine = new WorkflowStateMachine(States.PROTOTYPE_RUNNING);
      machine.transition(Events.PROTOTYPE_FAILED);

      expect(machine.getState()).toBe(States.FAILED);
    });

    test('should transition from PREMIUM_RUNNING to FAILED', () => {
      const machine = new WorkflowStateMachine(States.PREMIUM_RUNNING);
      machine.transition(Events.PREMIUM_FAILED);

      expect(machine.getState()).toBe(States.FAILED);
    });
  });

  describe('WorkflowStateMachine - Invalid Transitions', () => {
    test('should throw error for invalid transition', () => {
      const machine = new WorkflowStateMachine();
      expect(() => {
        machine.transition(Events.APPROVE); // Cannot approve from TEAM_CREATED
      }).toThrow('Invalid transition');
    });

    test('should throw error for transition from terminal state', () => {
      const machine = new WorkflowStateMachine(States.COMPLETED);
      expect(() => {
        machine.transition(Events.START_PROTOTYPE);
      }).toThrow('Cannot transition from terminal state');
    });

    test('should not allow transitions from REJECTED', () => {
      const machine = new WorkflowStateMachine(States.REJECTED);
      expect(machine.isTerminal()).toBe(true);
      expect(() => {
        machine.transition(Events.START_PROTOTYPE);
      }).toThrow();
    });

    test('should not allow transitions from PARTIAL', () => {
      const machine = new WorkflowStateMachine(States.PARTIAL);
      expect(machine.isTerminal()).toBe(true);
      expect(() => {
        machine.transition(Events.START_PREMIUM);
      }).toThrow();
    });
  });

  describe('WorkflowStateMachine - History', () => {
    test('should track transition history', () => {
      const machine = new WorkflowStateMachine();
      machine.transition(Events.START_PROTOTYPE);
      machine.transition(Events.PROTOTYPE_COMPLETE);

      const history = machine.getHistory();
      expect(history).toHaveLength(3); // Initial + 2 transitions
      expect(history[1].state).toBe(States.PROTOTYPE_RUNNING);
      expect(history[2].state).toBe(States.AWAITING_APPROVAL);
    });

    test('should include event in history', () => {
      const machine = new WorkflowStateMachine();
      machine.transition(Events.START_PROTOTYPE);

      const history = machine.getHistory();
      expect(history[1].event).toBe(Events.START_PROTOTYPE);
      expect(history[1].previousState).toBe(States.TEAM_CREATED);
    });

    test('should include metadata in history', () => {
      const machine = new WorkflowStateMachine();
      const metadata = { userId: 'test-user', reason: 'test' };
      machine.transition(Events.START_PROTOTYPE, metadata);

      const history = machine.getHistory();
      expect(history[1].metadata).toEqual(metadata);
    });

    test('should include timestamp in history', () => {
      const machine = new WorkflowStateMachine();
      machine.transition(Events.START_PROTOTYPE);

      const history = machine.getHistory();
      expect(history[1].timestamp).toBeDefined();
      expect(new Date(history[1].timestamp)).toBeInstanceOf(Date);
    });
  });

  describe('WorkflowStateMachine - State Queries', () => {
    test('should check if state can transition', () => {
      const machine = new WorkflowStateMachine();
      expect(machine.canTransition(Events.START_PROTOTYPE)).toBe(true);
      expect(machine.canTransition(Events.APPROVE)).toBe(false);
    });

    test('should get available transitions', () => {
      const machine = new WorkflowStateMachine();
      const transitions = machine.getAvailableTransitions();
      expect(transitions).toContain(Events.START_PROTOTYPE);
      expect(transitions).toHaveLength(1);
    });

    test('should get available transitions for AWAITING_APPROVAL', () => {
      const machine = new WorkflowStateMachine(States.AWAITING_APPROVAL);
      const transitions = machine.getAvailableTransitions();
      expect(transitions).toContain(Events.APPROVE);
      expect(transitions).toContain(Events.REJECT);
      expect(transitions).toContain(Events.SKIP_PREMIUM);
      expect(transitions).toHaveLength(3);
    });

    test('should get current phase', () => {
      const machine = new WorkflowStateMachine(States.PROTOTYPE_RUNNING);
      expect(machine.getCurrentPhase()).toBe('prototype');
    });

    test('should identify terminal states', () => {
      expect(new WorkflowStateMachine(States.COMPLETED).isTerminal()).toBe(true);
      expect(new WorkflowStateMachine(States.REJECTED).isTerminal()).toBe(true);
      expect(new WorkflowStateMachine(States.PARTIAL).isTerminal()).toBe(true);
      expect(new WorkflowStateMachine(States.FAILED).isTerminal()).toBe(true);
      expect(new WorkflowStateMachine(States.PROTOTYPE_RUNNING).isTerminal()).toBe(false);
    });
  });

  describe('WorkflowStateMachine - JSON Serialization', () => {
    test('should serialize to JSON', () => {
      const machine = new WorkflowStateMachine();
      machine.transition(Events.START_PROTOTYPE);

      const json = machine.toJSON();
      expect(json.currentState).toBe(States.PROTOTYPE_RUNNING);
      expect(json.isTerminal).toBe(false);
      expect(json.currentPhase).toBe('prototype');
      expect(json.history).toHaveLength(2);
    });

    test('should deserialize from JSON', () => {
      const originalMachine = new WorkflowStateMachine();
      originalMachine.transition(Events.START_PROTOTYPE);

      const json = originalMachine.toJSON();
      const restoredMachine = WorkflowStateMachine.fromJSON(json);

      expect(restoredMachine.getState()).toBe(originalMachine.getState());
      expect(restoredMachine.getHistory()).toEqual(originalMachine.getHistory());
    });
  });

  describe('Helper Functions', () => {
    test('isSuccessState should identify success states', () => {
      expect(isSuccessState(States.COMPLETED)).toBe(true);
      expect(isSuccessState(States.PARTIAL)).toBe(true);
      expect(isSuccessState(States.FAILED)).toBe(false);
      expect(isSuccessState(States.REJECTED)).toBe(false);
    });

    test('isFailureState should identify failure states', () => {
      expect(isFailureState(States.FAILED)).toBe(true);
      expect(isFailureState(States.REJECTED)).toBe(true);
      expect(isFailureState(States.COMPLETED)).toBe(false);
      expect(isFailureState(States.PARTIAL)).toBe(false);
    });

    test('requiresUserAction should identify states needing user input', () => {
      expect(requiresUserAction(States.AWAITING_APPROVAL)).toBe(true);
      expect(requiresUserAction(States.PROTOTYPE_RUNNING)).toBe(false);
      expect(requiresUserAction(States.COMPLETED)).toBe(false);
    });

    test('isInProgress should identify running states', () => {
      expect(isInProgress(States.PROTOTYPE_RUNNING)).toBe(true);
      expect(isInProgress(States.PREMIUM_RUNNING)).toBe(true);
      expect(isInProgress(States.APPROVED)).toBe(true);
      expect(isInProgress(States.COMPLETED)).toBe(false);
    });

    test('getNextRecommendedEvent should suggest next action', () => {
      expect(getNextRecommendedEvent(States.TEAM_CREATED)).toBe(Events.START_PROTOTYPE);
      expect(getNextRecommendedEvent(States.APPROVED)).toBe(Events.START_PREMIUM);
      expect(getNextRecommendedEvent(States.AWAITING_APPROVAL)).toBeNull(); // User must decide
      expect(getNextRecommendedEvent(States.COMPLETED)).toBeNull(); // Terminal
    });
  });

  describe('Validation', () => {
    test('validateTransition should validate allowed transitions', () => {
      const result = validateTransition(States.TEAM_CREATED, Events.START_PROTOTYPE);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('validateTransition should reject invalid transitions', () => {
      const result = validateTransition(States.TEAM_CREATED, Events.APPROVE);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('validateTransition should enforce business rules', () => {
      const result = validateTransition(States.TEAM_CREATED, Events.APPROVE);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('awaiting approval'))).toBe(true);
    });

    test('validateTransition should prevent transitions from terminal states', () => {
      const result = validateTransition(States.COMPLETED, Events.START_PROTOTYPE);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('terminal'))).toBe(true);
    });
  });

  describe('Complete Workflows', () => {
    test('should complete successful prototype-to-premium workflow', () => {
      const machine = new WorkflowStateMachine();

      // Start prototype
      machine.transition(Events.START_PROTOTYPE);
      expect(machine.getState()).toBe(States.PROTOTYPE_RUNNING);

      // Complete prototype
      machine.transition(Events.PROTOTYPE_COMPLETE);
      expect(machine.getState()).toBe(States.AWAITING_APPROVAL);

      // Approve
      machine.transition(Events.APPROVE);
      expect(machine.getState()).toBe(States.APPROVED);

      // Start premium
      machine.transition(Events.START_PREMIUM);
      expect(machine.getState()).toBe(States.PREMIUM_RUNNING);

      // Complete premium
      machine.transition(Events.PREMIUM_COMPLETE);
      expect(machine.getState()).toBe(States.COMPLETED);

      expect(machine.isTerminal()).toBe(true);
      expect(isSuccessState(machine.getState())).toBe(true);
    });

    test('should complete prototype-only workflow (PARTIAL)', () => {
      const machine = new WorkflowStateMachine();

      machine.transition(Events.START_PROTOTYPE);
      machine.transition(Events.PROTOTYPE_COMPLETE);
      machine.transition(Events.SKIP_PREMIUM);

      expect(machine.getState()).toBe(States.PARTIAL);
      expect(machine.isTerminal()).toBe(true);
      expect(isSuccessState(machine.getState())).toBe(true);
    });

    test('should handle prototype rejection workflow', () => {
      const machine = new WorkflowStateMachine();

      machine.transition(Events.START_PROTOTYPE);
      machine.transition(Events.PROTOTYPE_COMPLETE);
      machine.transition(Events.REJECT);

      expect(machine.getState()).toBe(States.REJECTED);
      expect(machine.isTerminal()).toBe(true);
      expect(isFailureState(machine.getState())).toBe(true);
    });

    test('should handle prototype failure workflow', () => {
      const machine = new WorkflowStateMachine();

      machine.transition(Events.START_PROTOTYPE);
      machine.transition(Events.PROTOTYPE_FAILED);

      expect(machine.getState()).toBe(States.FAILED);
      expect(machine.isTerminal()).toBe(true);
      expect(isFailureState(machine.getState())).toBe(true);
    });

    test('should handle premium failure workflow', () => {
      const machine = new WorkflowStateMachine();

      machine.transition(Events.START_PROTOTYPE);
      machine.transition(Events.PROTOTYPE_COMPLETE);
      machine.transition(Events.APPROVE);
      machine.transition(Events.START_PREMIUM);
      machine.transition(Events.PREMIUM_FAILED);

      expect(machine.getState()).toBe(States.FAILED);
      expect(machine.isTerminal()).toBe(true);
      expect(isFailureState(machine.getState())).toBe(true);
    });
  });
});
