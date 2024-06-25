import path from "bare-path";
import Hyperswarm from "hyperswarm";
import Hypercore from "hypercore";

const swarm = new Hyperswarm();
Pear.teardown(() => swarm.destroy());

const core = new Hypercore(
  path.join(Pear.config.storage, "reader-storage"),
  Pear.config.args[0]
);
await core.ready();

const foundPeers = core.findingPeers();
swarm.join(core.discoveryKey);
swarm.on("connection", (conn) => core.replicate(conn));

// swarm.flush() will wait until *all* discoverable peers have been connected to
// It might take a while, so don't await it
// Instead, use core.findingPeers() to mark when the discovery process is completed
swarm.flush().then(() => foundPeers());

// This won't resolve until either
//    a) the first peer is found
// or b) no peers could be found
await core.update();

// Read from byte 3, and from there read 50 bytes
const partialStream = core.createByteStream({ byteOffset: 0, byteLength: 3 });

// Function to read and print data from the stream
async function readAndPrintStream(stream) {
  let data = Buffer.alloc(0); // Buffer to store the chunks
  for await (const chunk of stream) {
    data = Buffer.concat([data, chunk]);
    console.log(`Received chunk: ${chunk.toString()}`);
  }
  console.log(`Complete data: ${data.toString()}`);
}

await readAndPrintStream(partialStream);
let position = 0;
// console.log(`Reading earlier blocks up to ${core.length}...`);
// for await (const block of core.createReadStream({
//   start: 0,
//   end: core.length,
// })) {
//   console.log(`Block ${position++}: ${block}`);
// }

position = core.length;
console.log(`Skipping ${core.length} earlier blocks...`);
for await (const block of core.createReadStream({
  start: core.length,
  live: true,
})) {
  console.log(`Block ${position++}: ${block}`);
}
