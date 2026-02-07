import { Router } from "express";
import Foodstuff from "../models/foodstuffSchema";

const router = Router();

// CREATE
router.post("/", async (req, res) => {
  try {
    const item = await Foodstuff.create(req.body);
    res.status(201).json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// READ ALL
router.get("/", async (_req, res) => {
  const items = await Foodstuff.find().sort({ purchaseDate: -1 });
  res.json(items);
});

// UPDATE (partial)
router.patch("/:id", async (req, res) => {
  try {
    const item = await Foodstuff.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Not found" });
    }

    await item.applyUserUpdate(req.body);
    res.json(item);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  await Foodstuff.findByIdAndDelete(req.params.id);
  res.status(204).send();
});

export default router;
