const fs = require("fs");
const path = require("path");
const Hypercore = require("hypercore");
const Hyperswarm = require("hyperswarm");

(async () => {
  const filePath = path.resolve(__dirname, "example.txt");

  // storage should be set to a directory where to store the data and core metadata.
  const core = new Hypercore("./my-file-feed");

  // Read the file and append its chunks to the feed
  const CHUNK_SIZE = 1024 * 1024; // 1MB chunk size (adjust as needed)

  fs.readFile(filePath, async (err, data) => {
    if (err) throw err;

    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);
    console.log(`Total chunks to append: ${totalChunks}`);

    for (let i = 0; i < totalChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, data.length);
      const chunk = data.slice(start, end);

      await core.append(chunk, (err) => {
        if (err) throw err;
        console.log(`Appended chunk ${i + 1}/${totalChunks}`);
      });
    }

    try {
      // simple call append with a new block of data
      console.log("Server key:", core.key.toString("hex"));
      // Create a Hyperswarm instance
      const swarm = new Hyperswarm();

      // Join the swarm using the feed discovery key
      const torrentFile = "hyperswarm-torrent";
      const topic = Buffer.alloc(32).fill(torrentFile);

      swarm.join(topic, {
        server: true,
        client: false,
      });

      // Handle new peer connections
      swarm.on("connection", (socket, details) => {
        console.log("New peer connected:");

        // Replicate the Hypercore feed over the socket
        core.replicate(socket);
      });

      core.on("error", (err) => {
        console.error("Error initializing feed:", err);
      });

      // Clean up on exit
      process.on("SIGINT", () => {
        swarm.destroy(() => {
          console.log("Swarm destroyed");
          process.exit(0);
        });
      });

      core.on("ready", (socket) => {
        console.log("core update", socket);
      });
    } catch (err) {
      console.error("Error updating feed:", err);
    }
  });
})();
