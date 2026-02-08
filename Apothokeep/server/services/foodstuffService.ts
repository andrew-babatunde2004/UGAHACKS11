/**
 * Shared business logic layer for foodstuff operations
 * Used by both REST API and WebSocket services
 */

import Foodstuff, { FoodstuffDoc } from "../models/foodstuffSchema";
import { createLogger } from "../utils/logger";

const logger = createLogger("FoodstuffService");

export interface CreateFoodstuffDTO {
  name: string;
  opened?: boolean;
  purchaseDate?: Date | string;
  expirationDate: Date | string;
  location?: number;
}

export interface UpdateFoodstuffDTO {
  name?: string;
  opened?: boolean;
  purchaseDate?: Date | string;
  expirationDate?: Date | string;
  location?: number;
}

export class FoodstuffService {
  /**
   * Create a new foodstuff item
   */
  static async create(data: CreateFoodstuffDTO): Promise<FoodstuffDoc> {
    try {
      logger.info("Creating foodstuff", { name: data.name });
      const item = await Foodstuff.create(data);
      logger.info("Foodstuff created", { id: item._id, name: item.name });
      return item;
    } catch (error: any) {
      logger.error("Failed to create foodstuff", { error: error.message, data });
      throw error;
    }
  }

  /**
   * Get all foodstuff items, sorted by purchase date (newest first)
   */
  static async getAll(): Promise<FoodstuffDoc[]> {
    try {
      const items = await Foodstuff.find().sort({ purchaseDate: -1 });
      logger.debug("Retrieved all foodstuff", { count: items.length });
      return items;
    } catch (error: any) {
      logger.error("Failed to retrieve foodstuff", { error: error.message });
      throw error;
    }
  }

  /**
   * Get a single foodstuff item by ID
   */
  static async getById(id: string): Promise<FoodstuffDoc | null> {
    try {
      const item = await Foodstuff.findById(id);
      if (!item) {
        logger.warn("Foodstuff not found", { id });
      }
      return item;
    } catch (error: any) {
      logger.error("Failed to get foodstuff by ID", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Update a foodstuff item
   */
  static async update(id: string, data: UpdateFoodstuffDTO): Promise<FoodstuffDoc> {
    try {
      const item = await Foodstuff.findById(id);
      if (!item) {
        throw new Error("Foodstuff not found");
      }

      logger.info("Updating foodstuff", { id, updates: Object.keys(data) });
      await item.applyUserUpdate(data);
      logger.info("Foodstuff updated", { id, name: item.name });
      return item;
    } catch (error: any) {
      logger.error("Failed to update foodstuff", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Delete a foodstuff item
   */
  static async delete(id: string): Promise<boolean> {
    try {
      const result = await Foodstuff.findByIdAndDelete(id);
      if (!result) {
        logger.warn("Foodstuff not found for deletion", { id });
        return false;
      }
      logger.info("Foodstuff deleted", { id });
      return true;
    } catch (error: any) {
      logger.error("Failed to delete foodstuff", { id, error: error.message });
      throw error;
    }
  }

  /**
   * Get items expiring soon (within days threshold)
   */
  static async getExpiringSoon(daysThreshold: number = 7): Promise<FoodstuffDoc[]> {
    try {
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + daysThreshold);

      const items = await Foodstuff.find({
        expirationDate: {
          $gte: new Date(),
          $lte: thresholdDate,
        },
      }).sort({ expirationDate: 1 });

      logger.debug("Retrieved expiring items", { count: items.length, daysThreshold });
      return items;
    } catch (error: any) {
      logger.error("Failed to get expiring items", { error: error.message });
      throw error;
    }
  }

  /**
   * Get expired items
   */
  static async getExpired(): Promise<FoodstuffDoc[]> {
    try {
      const items = await Foodstuff.find({
        expirationDate: { $lt: new Date() },
      }).sort({ expirationDate: -1 });

      logger.debug("Retrieved expired items", { count: items.length });
      return items;
    } catch (error: any) {
      logger.error("Failed to get expired items", { error: error.message });
      throw error;
    }
  }

  /**
   * Get items by location
   */
  static async getByLocation(location: 0 | 1 | 2): Promise<FoodstuffDoc[]> {
    try {
      const items = await Foodstuff.find({ location }).sort({ purchaseDate: -1 });
      logger.debug("Retrieved items by location", { location, count: items.length });
      return items;
    } catch (error: any) {
      logger.error("Failed to get items by location", { location, error: error.message });
      throw error;
    }
  }

  /**
   * Mark an item as opened
   */
  static async markAsOpened(id: string): Promise<FoodstuffDoc> {
    try {
      const item = await Foodstuff.findById(id);
      if (!item) {
        throw new Error("Foodstuff not found");
      }

      logger.info("Marking foodstuff as opened", { id });
      await item.markOpened();
      return item;
    } catch (error: any) {
      logger.error("Failed to mark as opened", { id, error: error.message });
      throw error;
    }
  }
}
