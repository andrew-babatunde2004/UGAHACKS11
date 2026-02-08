const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const WebSocket = require("ws");
const { WebSocketServer } = WebSocket;
const { chooseFoodstuffFromBarcode } = require("./deduceFoodBarcode");

require("ts-node/register");
const connectMongoDB = require("../db/mongodb").default;
const { createFoodstuffFromGeminiRow } = require("../services/foodstuffRowService");

// Create HTTP server
const server = http.createServer();

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({ server });

// no need for send on server, we're just receiving info
// Start HTTP server on port 8080
server.listen(8080, () => {
  console.log("HTTP + WS server listening on port 8080");
  console.log("ws://localhost:8080");
});

connectMongoDB();

// WebSocket connection handler
wss.on("connection", (ws, req) => {
  console.log("New client connected");

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "welcome", message: "Connected to barcode service" }));
  }

  // Listen for incoming messages
  ws.on("message", async (data) => {
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (err) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON payload" }));
      }
      return;
    }

    if (message?.type !== "barcode_scan") {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "error", message: "Unsupported message type" }));
      }
      return;
    }

    const barcode = String(message.barcode ?? "").trim();
    if (!barcode) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: "barcode_result", status: "error", message: "Missing barcode" }));
      }
      return;
    }

    const location = Number.isInteger(message.location) ? message.location : 0;
    const opened = typeof message.opened === "boolean" ? message.opened : false;
    const purchaseDate = message.purchaseDate ? new Date(message.purchaseDate) : new Date();

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ack", status: "received", barcode }));
    }

    try {
      if (typeof fetch !== "function") {
        throw new Error("Global fetch is not available in this Node runtime");
      }

      /**const res = await fetch(
        `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=brands,categories`
      );
      const barcodeJson = await res.json();*/

      const res = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${barcode}.json` +
      `?fields=brands,product_name,categories,categories_tags`);
      const barcodeJson = await res.json();


      const row = await chooseFoodstuffFromBarcode(barcodeJson);
      if (!row) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "barcode_result", status: "error", message: "No match found" }));
        }
        return;
      }

      const doc = await createFoodstuffFromGeminiRow(row, {
        location,
        opened,
        purchaseDate
      });

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "barcode_result",
          status: "ok",
          foodstuffId: doc._id?.toString(),
          name: doc.name,
          expirationDate: doc.expirationDate,
          location: doc.location,
          opened: doc.opened
        }));
      }
    } catch (err) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: "barcode_result",
          status: "error",
          message: err?.message ?? "Processing failed"
        }));
      }
    }
  });

  ws.on("close", () => {
    console.log("Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("WS error:", err);
  });
});
