const fs = require("fs");
const path = require("path");
const Hypercore = require("hypercore");
const Hyperswarm = require("hyperswarm");

(async () => {
  try {
    // The feed key shared by the original script
    const coreServerKey =
      "066f84812117992ea1182ffc249c1d89bfa511cfbb89ae8e3c17b9d774eeb5d3"; // Replace with the actual feed key

    // storage should be set to a directory where to store the data and core metadata.
    const core = new Hypercore("./replicated-file-feed", coreServerKey);

    // Create a Hyperswarm instance
    const swarm = new Hyperswarm();

    // Define the topic for the swarm
    const torrentFile = "hyperswarm-torrent";
    const topic = Buffer.alloc(32).fill(torrentFile);

    // Join the swarm using the topic
    swarm.join(topic, {
      server: false,
      client: true,
    });

    // Handle new peer connections
    swarm.on("connection", (socket) => {
      console.log("New peer connected:");

      // Replicate the Hypercore feed over the socket
      core.replicate(socket);
    });

    // Path to save the replicated file
    const savePath = path.resolve("replicated_example.txt");

    const writeStream = fs.createWriteStream(savePath);

    // read the full core
    const fullStream = core.createReadStream({ live: true });

    for await (const data of fullStream) {
      writeStream.write(data);
      console.log("Received chunk:", data.length);
    }
    // Wait for the feed to be fully ready
    // await new Promise((resolve) => {
    //   feed.ready(() => {
    //     console.log("Feed is ready");

    //     feed
    //       .createReadStream()
    //       .on("data", (chunk) => {
    //         writeStream.write(chunk);
    //         console.log("Received chunk:", chunk.length);
    //       })
    //       .on("end", () => {
    //         writeStream.end();
    //         console.log("File replication completed.");
    //       });

    //     resolve();
    //   });
    //   feed.on("ready", () => {
    //     console.log("PEER IS READY TO SYNC");
    //     feed
    //       .createReadStream()
    //       .on("data", (chunk) => {
    //         console.log("chunk", chunk);
    //         writeStream.write(chunk);
    //         console.log("Received chunk:", chunk.length);
    //       })
    //       .on("end", () => {
    //         writeStream.end();
    //         console.log("File replication completed.");
    //       });
    //     resolve();
    //   });
    // });

    // Clean up on exit
    process.on("SIGINT", () => {
      swarm.destroy(() => {
        console.log("Swarm destroyed");
        process.exit(0);
      });
    });
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
})();
