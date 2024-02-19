import { html, render, TemplateResult } from "lit-html";
import { Map } from "immutable";

type ImmutableMap = Map<string, any>;

type Directive<O> = (data: O) => void;

class Receiver<T> {
  captureFunction: (data: T) => void;

  constructor(captureFunction: (data: T) => void) {
    this.captureFunction = captureFunction;
  }

  capture(data: T): void {
    this.captureFunction(data);
  }
}

class Driver<T> {
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

interface Connectable<I, O> {
  getReceiver: () => Receiver<I>;
  getDriver: () => Driver<O>;
}

function pipe<T>(driver: Driver<T>, receiver: Receiver<T>) {
  driver.addReceiver(receiver);
}

class Component<I, O, S> implements Connectable<I, O> {
  private _stateMachine: StateMachine<S, ImmutableMap>;
  private _stateMachineDrivers: Driver<any>[];
  private _stateMachineReceivers: Receiver<any>[];
  private _peripherals: Peripheral<S, any, any>[];

  externalDriver: Driver<O>;
  externalReceiver: Receiver<I>;

  constructor({
    initialState = {} as S,
    nextState = (state, input) => state,
    output = (state) => ({} as O),
    peripherals = [],
  }: {
    initialState?: S;
    nextState?: (state: S, input: ImmutableMap) => S;
    output?: (state: S) => O;
    peripherals?: Peripheral<S, any, any>[];
  }) {
    this._stateMachine = new StateMachine(initialState, nextState);

    // Add peripherals to component
    this._peripherals = peripherals;

    // Connect state machine driver to peripheral receivers
    this._stateMachineDrivers = [];
    this._peripherals.forEach((peripheral) => {
      const receiver = peripheral.block.getReceiver();
      const driver = new Driver(() =>
        peripheral.interpret(this._stateMachine.state)
      );
      pipe(driver, receiver);
      this._stateMachineDrivers.push(driver);
    });

    // Connect peripheral drivers to state machine receiver
    this._stateMachineReceivers = [];
    this._peripherals.forEach((peripheral) => {
      const peripheralDriver = peripheral.block.getDriver();
      const stateMachineReceiver = new Receiver((data: any) => {
        this._stateMachine.trigger(
          Map<string, any>({ source: peripheral.name, data: data })
        );
        this._stateMachineDrivers.forEach((driver) => driver.transmit());
        this.externalDriver.transmit();
      });
      pipe(peripheralDriver, stateMachineReceiver);
      this._stateMachineReceivers.push(stateMachineReceiver);
    });

    // Make external connections
    this.externalDriver = new Driver(() => output(this._stateMachine.state));
    this.externalReceiver = new Receiver((data: I) => {
      this._stateMachine.trigger(
        Map<string, any>({ source: "__external__", data: data })
      );
      this._stateMachineDrivers.forEach((driver) => driver.transmit());
      this.externalDriver.transmit();
    });

    this.reset();
  }

  reset = () => {
    this._stateMachine.reset();
    this._stateMachineDrivers.forEach((driver) => driver.transmit());
    this.externalDriver.transmit();
  };

  getReceiver = () => this.externalReceiver;
  getDriver = () => this.externalDriver;
}

export class StateMachine<S, I> {
  private _resetState: () => S;
  private _nextState: (state: S, input: I) => S;

  state: S;
  input: I | undefined;

  constructor(initialState: S, nextState: (state: S, input: I) => S) {
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

class Peripheral<I, O, S> implements Connectable<I, O> {
  name: string;
  block: Connectable<I, O>;
  interpret: (state: S) => I;

  constructor(
    name: string,
    block: Connectable<I, O>,
    interpret: (state: S) => I
  ) {
    this.name = name;
    this.block = block;
    this.interpret = interpret;
  }

  getReceiver = () => this.block.getReceiver();
  getDriver = () => this.block.getDriver();
}

class ViewPeripheral<I, O> implements Connectable<I, O> {
  private _output!: O;
  private _templateFactory: (input: I, dir: Directive<O>) => TemplateResult;
  private _container: HTMLElement;

  driver: Driver<O>;
  receiver: Receiver<I>;

  constructor(
    templateFactory: (input: I, dir: Directive<O>) => TemplateResult,
    container: HTMLElement
  ) {
    this._templateFactory = templateFactory;
    this._container = container;

    this.driver = new Driver(() => this._output);
    this.receiver = new Receiver((data) => this.trigger(data));
  }

  trigger = (input: I): void => {
    const template = this._templateFactory(input, (data: O) => {
      this._output = data;
      this.driver.transmit();
    });
    render(template, this._container);
  };

  getReceiver = () => this.receiver;
  getDriver = () => this.driver;
}

// // Example usage
// const view = new ViewPeripheral((input, d) => {
//   return html`<button @click=${d} @wheel=${d}>My Button</button>`;
// }, document.body);

// const component = new Component({
//   nextState: (state, input) => {
//     console.log(input.toString());
//   },
//   peripherals: [new Peripheral("ViewPeripheral", view, (state) => state)],
// });
