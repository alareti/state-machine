type DeepRecord = {
  [key: string]: boolean | number | string | undefined | DeepRecord;
};

type AddressedRecord = {
  source: string;
  destination: string;
  data: DeepRecord;
};

type Functional<S extends DeepRecord, I extends AddressedRecord> = (
  state: S,
  input: I
) => S;

type FactoryRegistry<S extends DeepRecord, I extends AddressedRecord> = Record<
  string,
  {
    stateMachineFactory: () => StateMachine<S, I>;
  }
>;

class FunctionRegistry {
  private registry: FactoryRegistry<any, any> = {};

  addFunctional<S extends DeepRecord, I extends AddressedRecord>(
    fn: Functional<S, I>,
    initialState: S
  ) {
    this.registry[fn.name] = {
      stateMachineFactory: () => new StateMachine(fn, initialState),
    };
  }

  getFunctional<S extends DeepRecord, I extends AddressedRecord>(
    fn: Functional<S, I>
  ) {
    // Get new State Machine
    const stateMachine = this.registry[fn.name].stateMachineFactory();

    // Assert that the state machine is of the correct type
    // I.e. that <X, Y> from stateMachine is the same as <S, I> from fn
    // and that <X, Y> extend DeepRecord and AddressedRecord respectively

    return this.registry[fn.name];
  }
}

const globalRegistry = new FunctionRegistry();

class StateMachine<S extends DeepRecord, I extends AddressedRecord> {
  private _resetState: () => S;
  private _nextState: (state: S, input: I) => S;

  state: S;
  input: I | undefined;

  constructor(nextState: (state: S, input: I) => S, initialState: S) {
    this._resetState = () => initialState;
    this._nextState = nextState;
    this.state = this._resetState();
  }

  reset = () => {
    this.state = this._resetState();
  };

  trigger = (input: I): void => {
    this.input = input;
    this.state = this._nextState(this.state, input);
    this.input = undefined;
  };
}

const useComponent = <S extends DeepRecord, I extends AddressedRecord>(
  fn: Functional<S, I>,
  initialState: S,
  registry = globalRegistry
) => {
  registry.addFunctional(fn, initialState);

  // const func = registry.getFunctional(fn);
  // if (!func) {
  //   throw new Error("Function not found in registry");
  // }
  // return func.functional();
};

const useOutput = <T extends DeepRecord>() => {};

// Example usage
const MySimpleFunctional = (input: { a: number }) => {
  return { a: input.a + 1 };
};

const myComp = useComponent(MySimpleFunctional, { a: 0 });
