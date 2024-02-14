import { Driver, Receiver } from "./communication";
import { Map } from "immutable";

export type ImmutableData = Map<string, any>;

export class StateMachine {
  private _state!: ImmutableData;
  private _output!: ImmutableData;

  private _resetState: () => ImmutableData;
  private _resetOutput: () => ImmutableData;

  private _combine: (
    input: ImmutableData,
    state: ImmutableData
  ) => { output: ImmutableData; state: ImmutableData };

  driver: Driver<ImmutableData>;
  receiver: Receiver<ImmutableData>;

  constructor(
    initialState = Map<string, any>(),
    initialOutput = initialState,
    combinator = (input: ImmutableData, state: ImmutableData) => {
      return {
        output: input,
        state: input,
      };
    }
  ) {
    this._resetState = () => initialState;
    this._resetOutput = () => initialOutput;
    this._combine = combinator;

    this.driver = new Driver(() => this._output);
    this.receiver = new Receiver((data: ImmutableData) => this.trigger(data));
    this.reset();
  }

  reset = () => {
    this._state = this._resetState();
    this._output = this._resetOutput();
  };

  trigger = (input: ImmutableData): void => {
    const { output, state } = this._combine(input, this._state);
    this._state = state;
    this._output = output;
    this.driver.transmit();
  };

  getDriver = () => this.driver;
  getReceiver = () => this.receiver;
}
