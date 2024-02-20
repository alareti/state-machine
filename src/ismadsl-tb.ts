import { Receiver, Driver, useInit } from "./ismadsl-core";
import { produce } from "immer";

type Data = {
  a: number;
};

const init = { a: 0 };

const nextState = (s: Data, i: Data) =>
  produce(s, (draft) => {
    draft.a = draft.a + i.a;
  });

const outputAdapter = (s: Data) =>
  produce(s, (draft) => {
    draft.a = draft.a + 1;
  });

const comp = useInit("bruh", init, nextState, outputAdapter).build();

const rx = new Receiver((data: Data) => console.log(data));
const tx = new Driver<Data>();

comp.connectReceiver(rx);
tx.connectReceiver(comp.getReceiver());

tx.transmit({ a: 1 });
tx.transmit({ a: 2 });
tx.transmit({ a: 3 });
