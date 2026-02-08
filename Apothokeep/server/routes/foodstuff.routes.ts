import { Router } from "express";
import { FoodstuffService } from "../services/foodstuffService";
import { createLogger } from "../utils/logger";

const router = Router();
const logger = createLogger("FoodstuffRoutes");

// CREATE
router.post("/", async (req, res) => {
  try {
    const item = await FoodstuffService.create(req.body);
    res.status(201).json(item);
  } catch (err: any) {
    logger.error("POST /foodstuff failed", { error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// READ ALL
router.get("/", async (_req, res) => {
  try {
    const items = await FoodstuffService.getAll();
    res.json(items);
  } catch (err: any) {
    logger.error("GET /foodstuff failed", { error: err.message });
    res.status(500).json({ error: "Failed to retrieve items" });
  }
});

// READ ONE
router.get("/:id", async (req, res) => {
  try {
    const item = await FoodstuffService.getById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Not found" });
    }
    res.json(item);
  } catch (err: any) {
    logger.error("GET /foodstuff/:id failed", { id: req.params.id, error: err.message });
    res.status(500).json({ error: "Failed to retrieve item" });
  }
});

// UPDATE (partial)
router.patch("/:id", async (req, res) => {
  try {
    const item = await FoodstuffService.update(req.params.id, req.body);
    res.json(item);
  } catch (err: any) {
    if (err.message === "Foodstuff not found") {
      return res.status(404).json({ error: "Not found" });
    }
    logger.error("PATCH /foodstuff/:id failed", { id: req.params.id, error: err.message });
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  try {
    const deleted = await FoodstuffService.delete(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: "Not found" });
    }
    res.status(204).send();
  } catch (err: any) {
    logger.error("DELETE /foodstuff/:id failed", { id: req.params.id, error: err.message });
    res.status(500).json({ error: "Failed to delete item" });
  }
});

// GET EXPIRING SOON
router.get("/expiring/soon", async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days as string) : 7;
    const items = await FoodstuffService.getExpiringSoon(days);
    res.json(items);
  } catch (err: any) {
    logger.error("GET /foodstuff/expiring/soon failed", { error: err.message });
    res.status(500).json({ error: "Failed to retrieve expiring items" });
  }
});

// GET EXPIRED
router.get("/expired/all", async (_req, res) => {
  try {
    const items = await FoodstuffService.getExpired();
    res.json(items);
  } catch (err: any) {
    logger.error("GET /foodstuff/expired/all failed", { error: err.message });
    res.status(500).json({ error: "Failed to retrieve expired items" });
  }
});

export default router;
