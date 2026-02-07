import mongoose, { Document, Model } from "mongoose";

const { Schema } = mongoose;

export interface FoodstuffDoc extends Document {
  name: string;
  opened: boolean;
  purchaseDate: Date;
  expirationDate: Date;
  location: number;

  markOpened(): Promise<FoodstuffDoc>;
  updatePurchaseDate(newDate: Date): Promise<FoodstuffDoc>;
  moveLocation(newLocation: number): Promise<FoodstuffDoc>;
  applyUserUpdate(update: {
    opened?: boolean;
    purchaseDate?: Date;
    location?: number;
  }): Promise<FoodstuffDoc>;
}

export interface FoodstuffModel extends Model<FoodstuffDoc> {}

const foodstuffSchema = new Schema<FoodstuffDoc>({
  name: { type: String, required: true },
  opened: { type: Boolean, default: false, required: true },
  purchaseDate: { type: Date, default: Date.now, required: true },
  expirationDate: { type: Date, required: true },
  location: {
    type: Number,
    default: 0,
    required: true,
    enum: [0, 1, 2]
  }
});

// --------------------
// Instance methods
// --------------------

// Marks the item as opened
foodstuffSchema.methods.markOpened = function () {
  if (!this.opened) {
    this.opened = true;
  }
  return this.save();
};

// Updates the purchase date with validation
foodstuffSchema.methods.updatePurchaseDate = function (newDate: Date) {
  if (newDate > new Date()) {
    throw new Error("Purchase date cannot be in the future");
  }
  this.purchaseDate = newDate;
  return this.save();
};

// Change the item to a new location with validation
foodstuffSchema.methods.moveLocation = function (newLocation: number) {
  if (![0, 1, 2].includes(newLocation)) {
    throw new Error("Invalid location");
  }
  this.location = newLocation;
  return this.save();
};

// Applies user updates with validation
foodstuffSchema.methods.applyUserUpdate = function ({
  opened,
  purchaseDate,
  location
}: {
  opened?: boolean;
  purchaseDate?: Date;
  location?: number;
}) {
  if (typeof opened === "boolean") {
    this.opened = opened;
  }

  if (purchaseDate) {
    if (purchaseDate > new Date()) {
      throw new Error("Purchase date cannot be in the future");
    }
    this.purchaseDate = purchaseDate;
  }

  if (location !== undefined) {
    if (![0, 1, 2].includes(location)) {
      throw new Error("Invalid location");
    }
    this.location = location;
  }

  return this.save();
};
//  --------------------

const Foodstuff = mongoose.model<FoodstuffDoc, FoodstuffModel>(
  "Foodstuff",
  foodstuffSchema
);

export default Foodstuff;

