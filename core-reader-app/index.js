import Hyperswarm from "hyperswarm";
import Corestore from "corestore";
import b4a from "b4a";
import process from "bare-process";

import { Node } from "hyperbee/lib/messages.js";
console.log("process.argv[2]", process.argv[3]);
// creation of a corestore instance
const store = new Corestore("./reader-storage");

const swarm = new Hyperswarm();
Pear.teardown(() => swarm.destroy());

// replication of the corestore instance on connection with other peers
swarm.on("connection", (conn) => store.replicate(conn));

// create or get the hypercore using the public key supplied as command-line argument
const core = store.get({ key: b4a.from(process.argv[3], "hex") });
// wait till the properties of the hypercore instance are initialized
await core.ready();

const foundPeers = store.findingPeers();
// join a topic
swarm.join(core.discoveryKey);
swarm.flush().then(() => foundPeers());

// update the meta-data information of the hypercore instance
await core.update();

const seq = core.length - 1;
const lastBlock = await core.get(core.length - 1);

// Print the information about the last block or the latest block of the hypercore instance
console.log(`Raw Block ${seq}:`, lastBlock);
console.log(`Decoded Block ${seq}`, Node.decode(lastBlock))
try {
  const decodedNode = Node.decode(lastBlock);
  console.log(`Decoded Key ${seq}:`, decodedNode.key.toString("utf-8"));
  console.log(`Decoded Value ${seq}:`, decodedNode.value.toString("utf-8"));
} catch (error) {
  console.error("Error decoding the block:", error);
}