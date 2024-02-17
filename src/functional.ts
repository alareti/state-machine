const __ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__ = new Map<
  Functional,
  { base: () => Component; outputs: Map<string, StateInterpreter> }
>();

type Functional = (input: any, state: any) => any;
type StateInterpreter = (state: any) => any;

class Driver {
  receivers: Receiver[];
  dataFactory: () => any;

  constructor(dataFactory: () => any) {
    this.receivers = [];
    this.dataFactory = dataFactory;
  }

  addReceiver(receiver: Receiver): void {
    this.receivers.push(receiver);
  }

  transmit(): void {
    this.receivers.forEach((receiver) => receiver.capture(this.dataFactory()));
  }
}

class Receiver {
  captureFunction: (data: any) => void;

  constructor(captureFunction: (data: any) => void) {
    this.captureFunction = captureFunction;
  }

  capture(data: any): void {
    this.captureFunction(data);
  }
}

class Component {
  componentName: string;
  private _stateMachine: StateMachine;

  private _outputs: Map<string, Driver> = new Map();
  input: Receiver = new Receiver((data) => {
    // Compute next state
    this._stateMachine.trigger({ source: "__external__", data: data });

    // TODO: Drive peripheral outputs

    // Drive external outputs
    this._outputs.forEach((driver) => {
      driver.transmit();
    });
  });

  constructor(name: string, stateMachine: StateMachine) {
    this.componentName = name;
    this._stateMachine = stateMachine;

    // Initialize the state machine
    this.reset();
  }

  addOutput = (name: string, output: StateInterpreter) => {
    const driver = new Driver(() => output(this._stateMachine.state));
    this._outputs.set(name, driver);
  };

  reset = () => {
    this._stateMachine.reset();
  };
}

class StateMachine {
  private _resetState: () => any;
  private _nextState: (state: any, input: any) => any;

  state: any;
  input: any | undefined;

  constructor(initialState: any, nextState: (state: any, input: any) => any) {
    this._resetState = () => initialState;
    this._nextState = nextState;
    this.state = this._resetState();
  }

  reset = () => {
    this.state = this._resetState();
  };

  trigger = (input: any): void => {
    this.input = input;
    this.state = this._nextState(this.state, input);
    this.input = undefined;
  };
}

// useInit needs to create a Component Factory, stored in a global registry
// that can be used to create a new component instance. The function itself
// is the key as it is unique, even among different functionals with the same name.
const useInit = (fn: Functional, initialState: any) => {
  if (__ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__.has(fn)) return;

  const componentName = fn.name;
  const componentStateMachine = new StateMachine(initialState, fn);

  const componentFactory = () =>
    new Component(componentName, componentStateMachine);

  __ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__.set(fn, {
    base: componentFactory,
    outputs: new Map(),
  });
};

const useOutput = (fn: Functional, name: string, output: StateInterpreter) => {
  const registryEntry = __ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__.get(fn);
  if (!registryEntry) return;

  const outputMap = registryEntry["outputs"];
  outputMap.set(name, output);
};

const useComponent = (fn: Functional) => {
  if (!__ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__.has(fn)) {
    fn({ source: "__registry__", data: "registering" }, undefined);
  }

  const registryEntry = __ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__.get(fn);
  if (!registryEntry) return null;

  const component = registryEntry["base"]();
  registryEntry["outputs"].forEach((output, name) => {
    component.addOutput(name, output);
  });

  return component;
};

const regGuard = (
  input: Record<string, any> | undefined,
  regLogic: () => void
) => {
  if (!input) return;
  if (input["source"] == "__registry__" && input["data"] == "registering") {
    regLogic();
  }
};

// Example usage
function MyComponent(
  input: Record<string, any>,
  currentState: boolean | undefined
) {
  useInit(MyComponent, false);
  useOutput(MyComponent, "output", (state) => state);

  return !currentState;
}

const myComponent = useComponent(MyComponent);
console.log("Component:", myComponent);
