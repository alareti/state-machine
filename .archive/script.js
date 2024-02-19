import { html, render } from "lit-html";

// A simple lit-html directive to drive events from a driver
const drive = (driver) => (event) => {
  driver.transmit({ view: event });
};

class Receiver {
  constructor(captureFunction) {
    this.captureFunction = captureFunction;
  }

  capture(data) {
    this.captureFunction(data);
  }
}

class Driver {
  constructor() {
    this.receivers = [];
  }

  addReceiver(receiver) {
    this.receivers.push(receiver);
  }

  transmit(data) {
    this.receivers.forEach((receiver) => receiver(data));
  }
}

class Pipe {
  constructor(driver, receiver) {
    driver.addReceiver((data) => receiver.capture(data));
  }
}

class StateMachine {
  constructor(
    initialState,
    combineFunction = (input, state) => {
      return {
        output: input,
        state: input,
      };
    },
    initialOutput
  ) {
    this.resetState = () => initialState;
    this.state = this.resetState();

    this.resetOutput = () => initialOutput || initialState;
    this.output = this.resetOutput();

    this.combine = combineFunction;
  }

  reset = () => {
    this.state = this.resetState();
    this.output = this.resetOutput();
  };

  trigger = (input) => {
    const { output, state } = this.combine(input, this.state);
    this.state = state;
    this.output = output;
  };

  getState = () => this.state;
  getOutput = () => this.output;
}

class Controller {
  constructor(stateMachine, triggerFunction = (input, state) => true) {
    this.stateMachine = stateMachine;
    this.triggerFunction = triggerFunction;
    this.driver = new Driver();
  }

  reset = () => {
    this.stateMachine.reset();
    this.driver.transmit(this.stateMachine.getOutput());
  };

  receive = (input) => {
    if (this.triggerFunction(input, this.stateMachine.getState())) {
      this.stateMachine.trigger(input);
      this.driver.transmit(this.stateMachine.getOutput());
    }
  };

  getDriver = () => this.driver;
}

class View {
  constructor(template, container = document.body) {
    this.container = container;
    this.driver = new Driver();
    this.template = template;
  }

  receive = (input) => {
    render(this.template(input, this.getDriver()), this.container);
  };

  getDriver = () => this.driver;
}

class Component {
  constructor(viewTemplate, stateMachine) {
    this.controller = new Controller(stateMachine);
    this.view = new View(viewTemplate);
    this.driver = new Driver();

    const viewDriver = this.view.getDriver();
    const controllerDriver = this.controller.getDriver();

    viewDriver.addReceiver(this.controller.receive);
    controllerDriver.addReceiver(this.view.receive);

    controllerDriver.addReceiver(this.forward);
    this.reset();
  }

  reset = () => {
    this.controller.reset();
  };

  receive = (input) => {
    this.controller.receive({ input: input });
  };

  forward = (output) => {
    this.driver.transmit(output);
  };

  getDriver = () => this.driver;
}

const stateMachine = new StateMachine({ isActive: false }, (input, state) => {
  const newState = { isActive: !state.isActive };
  return {
    output: newState,
    state: newState,
  };
});

// Example template function
const template = (input, driver) => {
  const d = drive(driver);
  return html`<button @click=${d} @wheel=${d}>
    Toggle : ${input.isActive}
  </button>`;
};

const component = new Component(template, stateMachine);
