import mongoose from "mongoose";

const { Schema } = mongoose;

const foodstuffSchema = new Schema({
    _id: { type: mongoose.Schema.Types.ObjectId, default: () => new mongoose.Types.ObjectId(), required: true },
    name: { type: String, required: true },
    opened: { type: Boolean, required: true, default: false}, // products are sold closed
    purchaseDate: {type: Date, default: Date.now(), required: true},
    expirationDate: {type: Date, required: true},
    location: {type: Number, default: 0, required: true, enum: [0, 1, 2]} // 0 for pantry, 1 for fridge, 2 for freezer
});

// Method to mark the foodstuff as opened
foodstuffSchema.methods.markOpened = function () {
    if (!this.opened) {
        this.opened = true;
    }

    return this.save();
}

// Method to update the purchase date
foodstuffSchema.methods.updatePurchaseDate = function (newDate) {
  if (newDate > new Date()) {
    throw new Error("Purchase date cannot be in the future");
  }

  this.purchaseDate = newDate;
  return this.save();
};

// Method to change where food is stored
foodstuffSchema.methods.moveLocation = function (newLocation) {
    if (![0, 1, 2].includes(newLocation)) {
        throw new Error("Invalid location");
    }

    this.location = newLocation;
    return this.save();
}

/** Partial update method for user updates, only updates fields that are provided. May be deprecated.
foodstuffSchema.methods.applyUserUpdate = function ({
  opened,
  purchaseDate,
  location
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
}; */