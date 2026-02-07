import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import Foodstuff from "../models/foodstuffSchema";

// sets up an in-memory MongoDB instance for testing
let mongo: MongoMemoryServer;

// Jest lifecycle hooks to manage the in-memory database
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

// Clean up and disconnect after tests
afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

//  Clean the database after each test to ensure isolation
afterEach(async () => {
  await mongoose.connection.db!.dropDatabase();
});

// Tests for Foodstuff model methods
// 1. Test for marking an item as opened
it("allows partial updates via applyUserUpdate", async () => {
  const item = await Foodstuff.create({
    name: "Milk",
    expirationDate: new Date("2026-01-01"),
    location: 1
  });

  // Only update ONE field
  await item.applyUserUpdate({ opened: true });

  const updated = await Foodstuff.findById(item._id);

  expect(updated).not.toBeNull();
  expect(updated!.opened).toBe(true);

  // These should remain unchanged
  expect(updated!.location).toBe(1);
  expect(updated!.name).toBe("Milk");
});

// 2. Test for rejecting a future purchase date 
it("rejects a purchase date in the future", async () => {
  const item = await Foodstuff.create({
    name: "Yogurt",
    expirationDate: new Date("2026-02-01"),
    location: 1
  });

  await expect(() => {
  item.updatePurchaseDate(new Date("2100-01-01"));
}).toThrow("Purchase date cannot be in the future");
});

// 3. Test marking food stuff as opened
it("marks a foodstuff as opened", async () => {
  const item = await Foodstuff.create({
    name: "Cheese",
    expirationDate: new Date("2026-03-01"),
    location: 1
  });

  await item.markOpened();

  const updated = await Foodstuff.findById(item._id);
  expect(updated!.opened).toBe(true);
});

// 4. Test for moving location with validation
it("moves location with valid input", async () => {
  const item = await Foodstuff.create({
    name: "Butter",
    expirationDate: new Date("2026-04-01"),
    location: 1
  });

  await item.moveLocation(2);

  const updated = await Foodstuff.findById(item._id);
  expect(updated!.location).toBe(2);
});

it("rejects invalid location", async () => {
  const item = await Foodstuff.create({
    name: "Eggs",
    expirationDate: new Date("2026-05-01"),
    location: 1
  });

  await expect(() => {
    item.moveLocation(5);
  }).toThrow("Invalid location");
}); 


