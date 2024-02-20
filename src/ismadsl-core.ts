type DeepRecord =
  | {
      [key: string]:
        | boolean
        | number
        | string
        | DeepRecord
        | DeepRecordArray
        | object;
    }
  | undefined;
type DeepRecordArray = Array<boolean | number | string | DeepRecord | object>;

export type Block<I, O> = {
  connectReceiver: (receiver: Receiver<O>) => void;
  getReceiver: () => Receiver<I>;
  reset: () => void;
};

export class Driver<T> {
  private receivers: Receiver<T>[] = [];

  constructor() {}

  transmit(data: T): void {
    this.receivers.forEach((receiver) => receiver.receive(data));
  }

  connectReceiver(receiver: Receiver<T>): void {
    this.receivers.push(receiver);
  }
}

export class Receiver<T> {
  private callback: (data: T) => void;

  constructor(callback: (data: T) => void) {
    this.callback = callback;
  }

  receive(data: T): void {
    this.callback(data);
  }
}

export class Adapter<I, O> {
  private receiver: Receiver<I>;
  private driver: Driver<O>;

  constructor(transform: (data: I) => O) {
    this.driver = new Driver();
    this.receiver = new Receiver((data) => {
      this.driver.transmit(transform(data));
    });
  }

  connectReceiver(receiver: Receiver<O>) {
    this.driver.connectReceiver(receiver);
  }

  getReceiver() {
    return this.receiver;
  }
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
  outputAdapter: (state: S) => O;

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
    nextState: (state: S, input: I) => S,
    outputAdapter: (state: S) => O
  ) {
    this.name = name;
    this.initialState = initialState;
    this.nextState = nextState;

    this.outputAdapter = outputAdapter;
  }

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

class Component<
  S extends DeepRecord,
  I extends DeepRecord,
  O extends DeepRecord,
  IPeriph extends DeepRecord,
  OPeriph extends DeepRecord
> implements Block<I, O>
{
  name: string;
  private stateMachine: StateMachine<S, I>;
  private outputAdapter: Adapter<S, O>;

  constructor(descriptor: ComponentDescriptor<S, I, O, IPeriph, OPeriph>) {
    this.name = descriptor.name;
    this.stateMachine = new StateMachine(
      descriptor.initialState,
      descriptor.nextState
    );

    this.outputAdapter = new Adapter(descriptor.outputAdapter);
    this.stateMachine.connectReceiver(this.outputAdapter.getReceiver());
  }

  reset = () => this.stateMachine.reset();

  connectReceiver = (receiver: Receiver<O>) =>
    this.outputAdapter.connectReceiver(receiver);

  getReceiver = () => this.stateMachine.receiver;
}

export class StateMachine<S extends DeepRecord, I extends DeepRecord>
  implements Block<I, S>
{
  private state: S;
  private initialState: S;
  private nextState: (state: S, input: I) => S;

  driver: Driver<S> = new Driver();
  receiver: Receiver<I> = new Receiver((input) => {
    this.state = this.nextState(this.state, input);
    this.driver.transmit(this.state);
  });

  constructor(initialState: S, nextState: (state: S, input: I) => S) {
    this.initialState = initialState;
    this.nextState = nextState;
    this.state = this.initialState;
  }

  reset = () => {
    this.state = this.initialState;
  };

  connectReceiver = (receiver: Receiver<S>) => {
    this.driver.connectReceiver(receiver);
  };

  getReceiver = () => this.receiver;
}

export class Peripheral<
  S extends DeepRecord,
  I extends DeepRecord,
  IPeriph extends DeepRecord,
  OPeriph extends DeepRecord
> {
  name: string;
  block: Block<IPeriph, OPeriph>;
  inputAdapter: Adapter<S, IPeriph>;
  outputAdapter: Adapter<OPeriph, I>;

  constructor(
    name: string,
    block: Block<IPeriph, OPeriph>,
    inputAdapter: (state: S) => IPeriph,
    outputAdapter: (data: OPeriph) => I
  ) {
    this.name = name;
    this.block = block;
    this.inputAdapter = new Adapter(inputAdapter);
    this.outputAdapter = new Adapter(outputAdapter);
  }

  connectReceiver = (receiver: Receiver<I>) =>
    this.outputAdapter.connectReceiver(receiver);

  getReceiver = () => this.inputAdapter.getReceiver();
}

export function useInit<
  S extends DeepRecord,
  I extends DeepRecord,
  O extends DeepRecord,
  IPeriph extends DeepRecord,
  OPeriph extends DeepRecord
>(
  name: string,
  initialState: S,
  nextState: (state: S, input: I) => S,
  outputAdapter: (state: S) => O
) {
  return new ComponentDescriptor<S, I, O, IPeriph, OPeriph>(
    name,
    initialState,
    nextState,
    outputAdapter
  );
}

// // Example usage
// function MyComponent() {
//   type State = { count: number };
//   type Input = { source: string; data: { increment: number } };

//   const name = MyComponent.name;
//   const initialState = { count: 0 };

//   const nextState = (state: State, input: Input) => {
//     return { count: state.count + input.data.increment };
//   };

//   const outputAdapter = (state: State) => {
//     return { source: name, data: state };
//   };

//   return useInit(name, initialState, nextState, outputAdapter).build();
// }

// const myComp = MyComponent();
// console.log(myComp);
