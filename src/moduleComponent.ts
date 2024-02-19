type DeepRecord = {
  [key: string]: boolean | number | string | undefined | DeepRecord;
};

class Driver<T> {
  receivers: Receiver<T>[];
  dataFactory: (() => T) | ((data: T) => T);

  constructor(dataFactory: (() => T) | ((data: T) => T)) {
    this.receivers = [];
    this.dataFactory = dataFactory;
  }

  addReceiver(receiver: Receiver<T>): void {
    this.receivers.push(receiver);
  }

  transmit(data?: T): void {
    const dataFactory = this.dataFactory;
    if (this.isNoArgumentFactory(dataFactory)) {
      this.receivers.forEach((receiver) => receiver.capture(dataFactory()));
    } else {
      if (data !== undefined) {
        this.receivers.forEach((receiver) =>
          receiver.capture(dataFactory(data))
        );
      }
    }
  }

  private isNoArgumentFactory = (
    func: (() => T) | ((data: T) => T)
  ): func is () => T => {
    return func.length === 0;
  };
}

class Receiver<T> {
  captureFunction: (data: T) => void;

  constructor(captureFunction: (data: T) => void) {
    this.captureFunction = captureFunction;
  }

  capture(data: T): void {
    this.captureFunction(data);
  }

  collectFrom(driver: Driver<T>) {
    driver.addReceiver(this);
  }
}

class Filter<I, O> {
  driver: Driver<O>;
  receiver: Receiver<I>;

  constructor(adapter: (data: I) => O) {
    this.receiver = new Receiver((data) => {
      this.driver.transmit(adapter(data));
    });
    this.driver = new Driver((receivedData) => receivedData);
  }

  getReceiver = () => this.receiver;
  getDriver = () => this.driver;
}

class Collector<I, O> {
  driver: Driver<O>;
  receivers: Receiver<I>[];

  constructor() {
    this.driver = new Driver((receivedData) => receivedData);
    this.receivers = [];
  }

  addDriver = (driver: Driver<I>, adapter: (data: I) => O) => {
    const receiver = new Receiver((data: I) => {
      this.driver.transmit(adapter(data));
    });
    receiver.collectFrom(driver);
    this.receivers.push(receiver);
  };
}

function connect<T>(driver: Driver<T>, receiver: Receiver<T>) {
  driver.addReceiver(receiver);
}

class ComponentDescriptor<
  S extends DeepRecord,
  I extends DeepRecord,
  O extends DeepRecord,
  IPeriph extends DeepRecord,
  OPeriph extends DeepRecord
> {
  name: string;
  initialState: S;
  nextState: (state: S, input: I) => S;
  outputs: Record<string, (state: S) => O> = {};
  peripherals: Record<
    string,
    {
      name: string;
      block: Block<IPeriph, OPeriph>;
      inputAdapter: (state: S) => IPeriph;
      outputAdapter: (data: OPeriph) => I;
    }
  > = {};

  constructor(
    name: string,
    initialState: S,
    nextState: (state: S, input: I) => S
  ) {
    this.name = name;
    this.initialState = initialState;
    this.nextState = nextState;
  }

  useOutput = (name: string, adapter: (state: S) => O) => {
    this.outputs[name] = adapter;
    return this;
  };

  usePeripheral = (
    name: string,
    block: Block<IPeriph, OPeriph>,
    inputAdapter: (state: S) => IPeriph,
    outputAdapter: (data: OPeriph) => I
  ) => {
    this.peripherals[name] = {
      name: name,
      block: block,
      inputAdapter: inputAdapter,
      outputAdapter: outputAdapter,
    };
    return this;
  };

  build = () => {
    return new Component(this);
  };
}

function useInit<
  S extends DeepRecord,
  I extends DeepRecord,
  O extends DeepRecord,
  IPeriph extends DeepRecord,
  OPeriph extends DeepRecord
>(name: string, initialState: S, nextState: (state: S, input: I) => S) {
  return new ComponentDescriptor<S, I, O, IPeriph, OPeriph>(
    name,
    initialState,
    nextState
  );
}

type Block<I, O> = {
  getReceiver: () => Receiver<I>;
  getDriver: () => Driver<O>;
  reset: () => void;
};

class Component<
  S extends DeepRecord,
  I extends DeepRecord,
  O extends DeepRecord,
  IPeriph extends DeepRecord,
  OPeriph extends DeepRecord
> implements Block<I, O>
{
  name: string;

  stateMachine: StateMachine<S, I>;
  stateDriver: Driver<S>;
  stateReceiver: Receiver<I>;

  outputFilters: Record<string, Filter<S, O>> = {};
  outputCollector: Collector<O, O> = new Collector();

  constructor(descriptor: ComponentDescriptor<S, I, O, IPeriph, OPeriph>) {
    this.name = descriptor.name;
    this.stateMachine = new StateMachine(
      descriptor.initialState,
      descriptor.nextState
    );

    this.stateDriver = new Driver(() => this.stateMachine.state);
    this.stateReceiver = new Receiver((input) => {
      this.stateMachine.trigger(input);
      this.stateDriver.transmit();
    });

    for (const [name, adapter] of Object.entries(descriptor.outputs)) {
      const outputFilter = new Filter(adapter);
      connect(this.stateDriver, outputFilter.getReceiver());
      this.outputFilters[name] = outputFilter;
      this.outputCollector.addDriver(outputFilter.getDriver(), (data) => data);
    }
  }

  getDriver = () => this.outputCollector.driver;
  getReceiver = () => this.stateReceiver;
  reset = () => this.stateMachine.reset();
}

class StateMachine<S extends DeepRecord, I extends DeepRecord> {
  state: S;
  initialState: S;
  nextState: (state: S, input: I) => S;

  constructor(initialState: S, nextState: (state: S, input: I) => S) {
    this.initialState = initialState;
    this.nextState = nextState;
    this.state = this.initialState;
  }

  reset = () => {
    this.state = this.initialState;
  };

  trigger = (input: I): void => {
    this.state = this.nextState(this.state, input);
  };
}

class Peripheral<
  S extends DeepRecord,
  I extends DeepRecord,
  IPeriph extends DeepRecord,
  OPeriph extends DeepRecord
> {
  name: string;
  block: Block<IPeriph, OPeriph>;
  inputFilter: Filter<S, IPeriph>;
  outputFilter: Filter<OPeriph, I>;

  constructor(
    name: string,
    block: Block<IPeriph, OPeriph>,
    inputAdapter: (state: S) => IPeriph,
    outputAdapter: (data: OPeriph) => I
  ) {
    this.name = name;
    this.block = block;
    this.inputFilter = new Filter(inputAdapter);
    this.outputFilter = new Filter(outputAdapter);
  }

  getReceiver = () => this.inputFilter.getReceiver();
  getDriver = () => this.outputFilter.getDriver();
}

// Example usage
function MyComponent() {
  type State = { count: number };
  type Input = { source: string; data: { increment: number } };

  const name = MyComponent.name;
  const initialState = { count: 0 };

  const nextState = (state: State, input: Input) => {
    return { count: state.count + input.data.increment };
  };

  const outputAdapter1 = (state: State) => {
    return { source: name, data: state };
  };

  const outputAdapter2 = (state: State) => {
    return {
      source: name,
      data: {
        doubleCount: state.count * 2,
      },
    };
  };

  return useInit(name, initialState, nextState)
    .useOutput("output", outputAdapter1)
    .useOutput("output2", outputAdapter2)
    .build();
}

const myComp = MyComponent();
console.log(myComp);
