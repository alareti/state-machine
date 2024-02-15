export class Receiver<T> {
  captureFunction: (data: T) => void;

  constructor(captureFunction: (data: T) => void) {
    this.captureFunction = captureFunction;
  }

  capture(data: T): void {
    this.captureFunction(data);
  }
}

export class Driver<T> {
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

// export class Simplex<T> {
//   driver: Driver<T>;
//   receiver: Receiver<T>;

//   constructor(driver: Driver<T>, receiver: Receiver<T>) {
//     this.driver = driver;
//     this.receiver = receiver;
//     driver.addReceiver(receiver);
//   }
// }

// export class Socket<D, R> {
//   driver: Driver<D>;
//   receiver: Receiver<R>;

//   constructor(driver: Driver<D>, receiver: Receiver<R>) {
//     this.driver = driver;
//     this.receiver = receiver;
//   }

//   addReceiver(receiver: Receiver<D>): void {
//     this.driver.addReceiver(receiver);
//   }

//   transmit(): void {
//     this.driver.transmit();
//   }

//   capture(data: R): void {
//     this.receiver.capture(data);
//   }
// }

// export class Duplex<T, U> {
//   sockets: [Socket<T, U>, Socket<U, T>];

//   constructor(socket1: Socket<T, U>, socket2: Socket<U, T>) {
//     socket1.addReceiver(socket2.receiver);
//     socket2.addReceiver(socket1.receiver);

//     this.sockets = [socket1, socket2];
//   }
// }

// export class Broadcast<T> {
//   driver: Driver<T>;
//   receivers: Receiver<T>[];

//   constructor(driver: Driver<T>, receivers: Receiver<T>[]) {
//     this.driver = driver;
//     this.receivers = receivers;
//     receivers.forEach((receiver) => driver.addReceiver(receiver));
//   }
// }
