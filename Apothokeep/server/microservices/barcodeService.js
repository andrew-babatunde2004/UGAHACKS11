import http from "http";
import WebSocket, { WebSocketServer } from "ws";

// Create HTTP server
const server = http.createServer();

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({ server });

// Start HTTP server on port 8080
server.listen(8080, () => {
  console.log("HTTP + WS server listening on port 8080");
  console.log("ws://localhost:8080");
});

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  console.log("New client connected");

  ws.send("Welcome to the WebSocket server!");

  // Listen for incoming messages
  ws.on("message", (data) => {
    const msg = data.toString();
    console.log("Received:", msg);

    ws.send(`Server received: ${msg}`);
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("WS error:", err);
  });
});
