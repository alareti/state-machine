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

interface Peripheral<S, I, O> {
  combinator: (state: S, input: O) => I;
  block: Connectable<I, O>;
}

class Component<S> {
  private _stateMachine: StateMachine<S, ImmutableMap>;

  constructor(
    initialState: S,
    nextState: (state: S, input: ImmutableMap) => S,
    peripherals: Peripheral<S, any, any>[]
  ) {
    this._stateMachine = new StateMachine(initialState, nextState);
    this._stateMachine.reset();
  }
}

class StateMachine<S, I> {
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
  };
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

// const stateMachine = new StateMachine(null, (state, input: Event) => {
//   return state;
// });

// const template = (input: any, d: Directive<Event>) => {
//   return html`<button @click=${d} @wheel=${d}>My Button</button>`;
// };

// const view = new View(template, document.body);

// connectSimplex(stateMachine.getDriver(), view.getReceiver());
// connectSimplex(view.getDriver(), stateMachine.getReceiver());

// stateMachine.reset();
