type Functional<I = DeepRecord, S = DeepRecord> = (input: I, state: S) => S;

type StateInterpreter<S extends DeepRecord, O extends DeepRecord> = (
  state: S
) => O;

type DeepRecord = {
  [key: string]: boolean | number | string | undefined | DeepRecord;
};

const __ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__: Record<
  string,
  any
  // {
  // base: () => Component<DeepRecord, DeepRecord, DeepRecord>;
  // outputs: <O extends DeepRecord, S extends DeepRecord>() => Record<
  //   string,
  //   StateInterpreter<S, O>
  // >;
  // }
> = {};

class Component<
  I extends DeepRecord,
  O extends DeepRecord,
  S extends DeepRecord
> {
  componentName: string;
  private _stateMachine: StateMachine<I, S>;
  private _outputs: Record<string, Driver<O>> = {};

  input = new Receiver((data: I) => {
    // Compute next state
    this._stateMachine.trigger(data);

    // TODO: Drive peripheral outputs

    // Drive external outputs
    for (const driver of Object.values(this._outputs)) {
      driver.transmit();
    }
  });

  constructor(name: string, stateMachine: StateMachine<I, S>) {
    this.componentName = name;
    this._stateMachine = stateMachine;

    // Initialize the state machine
    this.reset();
  }

  addOutput = (name: string, output: StateInterpreter<S, O>) => {
    const driver = new Driver<O>(() => output(this._stateMachine.state));
    this._outputs[name] = driver;
  };

  reset = () => {
    this._stateMachine.reset();
  };
}

class StateMachine<I extends DeepRecord, S extends DeepRecord> {
  private _resetState: () => S;
  private _nextState: (input: I, state: S) => S;

  state: S;
  input: I | undefined;

  constructor(initialState: S, nextState: (input: I, state: S) => S) {
    this._resetState = () => initialState;
    this._nextState = nextState;
    this.state = this._resetState();
  }

  reset = () => {
    this.state = this._resetState();
  };

  trigger = (input: I): void => {
    this.input = input;
    this.state = this._nextState(input, this.state);
    this.input = undefined;
  };
}

class Driver<T extends DeepRecord> {
  receivers: Receiver<T>[];
  dataFactory: () => T;

  constructor(dataFactory: () => T) {
    this.receivers = [];
    this.dataFactory = dataFactory;
  }

  addReceiver(receiver: Receiver<T>): void {
    this.receivers.push(receiver);
  }

  transmit(): void {
    this.receivers.forEach((receiver) => receiver.capture(this.dataFactory()));
  }
}

class Receiver<T extends DeepRecord> {
  captureFunction: (data: T) => void;

  constructor(captureFunction: (data: T) => void) {
    this.captureFunction = captureFunction;
  }

  capture(data: T): void {
    this.captureFunction(data);
  }
}

// // useInit needs to create a Component Factory, stored in a global registry
// // that can be used to create a new component instance. The function itself
// // is the key as it is unique, even among different functionals with the same name.
const useInit = (
  fn: Functional<DeepRecord, DeepRecord>,
  initialState: DeepRecord
) => {
  if (fn.name in __ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__) return;
  const componentFactory = () =>
    new Component<DeepRecord, DeepRecord, DeepRecord>(
      fn.name,
      new StateMachine<DeepRecord, DeepRecord>(initialState, fn)
    );

  __ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__[fn.name] = {
    base: componentFactory,
    // outputs: new Map(),
  };
};

const useComponent = <I extends DeepRecord, S extends DeepRecord>(
  fn: Functional<I, S>
) => {
  if (!(fn.name in __ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__)) {
    fn({ source: "__registry__", data: "registering" } as any, {} as any);
  }

  const registryEntry = __ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__[fn.name];
  const component = registryEntry?.base() ?? undefined;
  if (component === undefined || registryEntry === undefined) return undefined;

  return component;
};

console.log(__ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__);
const MyComponent = (input, state: { a: number }) => {
  useInit(MyComponent, { a: 1 });

  return { a: 1 };
};

const myComp = useComponent(MyComponent);
console.log(__ALARETI_GLOBAL_COMPONENT_FACTORY_REGISTRY__);
