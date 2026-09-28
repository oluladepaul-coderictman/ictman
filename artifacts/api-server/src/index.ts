import app from "./app";
import { loadModelOnce } from "./lib/paulina-model.js";
import { startKeepalive } from "./lib/keepalive.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
  // Start self-ping to keep server alive 24/7
  startKeepalive(port);
  // Load local phi model in background if available
  loadModelOnce().catch(() => {});
});
