import dotenv from "dotenv";
import http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { createLogger } from "../utils/logger";
import { chooseFoodstuffFromBarcode } from "./deduceFoodBarcode";
import { writeRowDirect } from "./dbWriteRow";

dotenv.config();

const logger = createLogger("BarcodeService");

// Create HTTP server
const server = http.createServer();

// Attach WebSocket server to HTTP server
const wss = new WebSocketServer({ server });

// Start HTTP server on port 8080
const PORT = process.env.WS_PORT || 8080;
server.listen(PORT, () => {
  logger.info(`WebSocket server listening on port ${PORT}`);
  logger.info(`ws://localhost:${PORT}`);
});

interface BarcodeScanMessage {
  type: "barcode_scan";
  barcode: string;
  location?: number;
  opened?: boolean;
  purchaseDate?: string;
}

// WebSocket connection handler
wss.on("connection", (ws: WebSocket, req: http.IncomingMessage) => {
  logger.info("New client connected", { ip: req.socket.remoteAddress });

  if (ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "welcome",
        message: "Connected to barcode service",
      })
    );
  }

  // Listen for incoming messages
  ws.on("message", async (data: WebSocket.RawData) => {
    let message: BarcodeScanMessage;
    try {
      message = JSON.parse(data.toString());
    } catch (err) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Invalid JSON payload",
          })
        );
      }
      return;
    }

    if (message?.type !== "barcode_scan") {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "error",
            message: "Unsupported message type",
          })
        );
      }
      return;
    }

    const barcode = String(message.barcode ?? "").trim();
    if (!barcode) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "barcode_result",
            status: "error",
            message: "Missing barcode",
          })
        );
      }
      return;
    }

    const location = Number.isInteger(message.location) ? message.location : 0;
    const opened =
      typeof message.opened === "boolean" ? message.opened : false;
    const purchaseDate = message.purchaseDate
      ? new Date(message.purchaseDate)
      : new Date();

    logger.info("Processing barcode scan", { barcode, location, opened });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({ type: "ack", status: "received", barcode })
      );
    }

    try {
      // Fetch product info from Open Food Facts
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json` +
          `?fields=brands,product_name,categories,categories_tags`
      );
      const barcodeJson = await res.json();

      logger.debug("Open Food Facts response", {
        barcode,
        productName: barcodeJson.product?.product_name,
      });

      const row = await chooseFoodstuffFromBarcode(barcodeJson);
      if (!row) {
        logger.warn("No match found for barcode", { barcode });
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: "barcode_result",
              status: "error",
              message: "No match found",
            })
          );
        }
        return;
      }

      // Write to database with location, opened status, and purchase date
      const result = await writeRowDirect(row, location, opened, purchaseDate);
      logger.info("Inserted new foodstuff", {
        insertedId: result.insertedId,
        expirationDate: result.document.expirationDate,
        location,
        opened
      });

      // Send success response with inserted document
      if (ws.readyState === WebSocket.OPEN) {
        const doc = result.document as any;
        ws.send(
          JSON.stringify({
            type: "barcode_result",
            status: "ok",
            foodstuffId: result.insertedId.toString(),
            name: doc.Name || "Unknown",
            expirationDate: doc.expirationDate,
            location: doc.location,
            opened: doc.opened,
          })
        );
      }
    } catch (err: any) {
      logger.error("Barcode processing failed", {
        barcode,
        error: err?.message,
      });
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "barcode_result",
            status: "error",
            message: err?.message ?? "Processing failed",
          })
        );
      }
    }
  });

  ws.on("close", () => {
    logger.info("Client disconnected");
  });

  ws.on("error", (err: Error) => {
    logger.error("WebSocket error", { error: err.message });
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, closing server...");
  wss.close(() => {
    server.close(() => {
      logger.info("Server closed");
      process.exit(0);
    });
  });
});
