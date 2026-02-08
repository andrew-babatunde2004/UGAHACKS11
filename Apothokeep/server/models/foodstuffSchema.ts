import mongoose, { Document, Model } from "mongoose";

const { Schema } = mongoose;

// TypeScript Interfaces

export interface FoodstuffDoc extends Document {
  name: string;
  opened: boolean;
  purchaseDate: Date;
  expirationDate: Date;
  location: number;

  markOpened(): Promise<FoodstuffDoc>;
  updatePurchaseDate(newDate: string | Date): Promise<FoodstuffDoc>;
  updateExpirationDate(newExpiration: string | Date): Promise<FoodstuffDoc>;
  moveLocation(newLocation: number): Promise<FoodstuffDoc>;
  applyUserUpdate(update: {
    opened?: boolean;
    purchaseDate?: string | Date;
    expirationDate?: string | Date;
    location?: number;
  }): Promise<FoodstuffDoc>;
}

export interface FoodstuffModel extends Model<FoodstuffDoc> {}

// Schema Definition

const foodstuffSchema = new Schema<FoodstuffDoc>({
  name: { type: String, required: true },

  opened: {
    type: Boolean,
    default: false,
    required: true
  },

  purchaseDate: {
    type: Date,
    default: Date.now,
    required: true,
    validate: {
      validator: (v: Date) => v.getTime() <= Date.now(),
      message: "Purchase date cannot be in the future"
    }
  },

  expirationDate: {
    type: Date,
    required: true,
    validate: {
      validator: function (v: Date) {
        const doc = this as unknown as FoodstuffDoc;
        return v.getTime() >= doc.purchaseDate.getTime();
      },
      message: "Expiration date cannot be before purchase date"
    }
  },

  location: {
    type: Number,
    default: 0,
    required: true,
    enum: [0, 1, 2]
  }
});

// Helper Functions (dealing with JSON)

function normalizePurchaseDate(input: string | Date): Date {
  const parsed = input instanceof Date ? input : new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid purchase date");
  }

  if (parsed.getTime() > Date.now()) {
    throw new Error("Purchase date cannot be in the future");
  }

  return parsed;
}

function normalizeExpirationDate(
  input: string | Date,
  purchaseDate: Date
): Date {
  const parsed = input instanceof Date ? input : new Date(input);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid expiration date");
  }

  if (parsed.getTime() < purchaseDate.getTime()) {
    throw new Error("Expiration date cannot be before purchase date");
  }

  return parsed;
}

function validateLocation(loc: number): void {
  if (!Number.isInteger(loc) || ![0, 1, 2].includes(loc)) {
    throw new Error("Invalid location");
  }
}

// Instance Methods

// Mark item opened
foodstuffSchema.methods.markOpened = function () {
  if (!this.opened) {
    this.opened = true;
  }
  return this.save();
};

// Update purchase date (accepts string or Date)
foodstuffSchema.methods.updatePurchaseDate = function (
  newDate: string | Date
) {
  const normalized = normalizePurchaseDate(newDate);
  this.purchaseDate = normalized;

  // Keep expirationDate consistent if it becomes invalid after purchaseDate changes
  if (this.expirationDate) {
    this.expirationDate = normalizeExpirationDate(
      this.expirationDate,
      this.purchaseDate
    );
  }

  return this.save();
};

// Update expiration date (accepts string or Date)
foodstuffSchema.methods.updateExpirationDate = function (
  newExpiration: string | Date
) {
  const normalized = normalizeExpirationDate(newExpiration, this.purchaseDate);
  this.expirationDate = normalized;
  return this.save();
};

// Update storage location
foodstuffSchema.methods.moveLocation = function (newLocation: number) {
  validateLocation(newLocation);
  this.location = newLocation;
  return this.save();
};

// Partial update method
foodstuffSchema.methods.applyUserUpdate = function ({
  opened,
  purchaseDate,
  expirationDate,
  location
}: {
  opened?: boolean;
  purchaseDate?: string | Date;
  expirationDate?: string | Date;
  location?: number;
}) {
  if (typeof opened === "boolean") {
    this.opened = opened;
  }

  if (purchaseDate !== undefined) {
    this.purchaseDate = normalizePurchaseDate(purchaseDate);
  }

  if (location !== undefined) {
    validateLocation(location);
    this.location = location;
  }

  // Validate expirationDate relative to (possibly updated) purchaseDate
  if (expirationDate !== undefined) {
    this.expirationDate = normalizeExpirationDate(
      expirationDate,
      this.purchaseDate
    );
  }

  return this.save();
};

const Foodstuff = mongoose.model<FoodstuffDoc, FoodstuffModel>(
  "Foodstuff",
  foodstuffSchema
);

export default Foodstuff;
