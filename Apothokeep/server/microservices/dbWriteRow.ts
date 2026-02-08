import mongoose, { ObjectId } from "mongoose";
import connectMongoDB from "../db/mongodb";

// the key : value row returned from Gemini deduction
type KVRow = Array<Record<string, any>>;

// Location enum for storage locations
enum StorageLocation {
  Pantry = 0,
  Refrigerator = 1,
  Freezer = 2,
}

// remove the array nesting and convert to a single object with all the key : value pairs for easier access
function flattenRow(row: KVRow): Record<string, any> {
  return row.reduce((acc, obj) => Object.assign(acc, obj), {});
}

// remove null key : value pairs from the row
function stripNullish(obj: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    // keep 0 and false; drop null/undefined/empty string
    if (v === null || v === undefined) continue;
    if (typeof v === "string" && v.trim() === "") continue;
    out[k] = v;
  }
  return out;
}

/**
 * Calculate expiration date based on storage location, opened status, and shelf life data
 */
function calculateExpirationDate(
  flattenedRow: Record<string, any>,
  location: number,
  opened: boolean,
  purchaseDate: Date
): Date | null {
  let daysToAdd: number | null = null;

  // Determine which field to use based on location and opened status
  if (location === StorageLocation.Pantry) {
    if (opened) {
      // Use Pantry_After_Opening fields
      daysToAdd = flattenedRow.Pantry_After_Opening_Max || flattenedRow.Pantry_After_Opening_Min;
    } else {
      // Use Pantry fields
      daysToAdd = flattenedRow.Pantry_Max || flattenedRow.Pantry_Min;
    }
  } else if (location === StorageLocation.Refrigerator) {
    if (opened) {
      // Use Refrigerate_After_Opening fields
      daysToAdd = flattenedRow.Refrigerate_After_Opening_Max || flattenedRow.Refrigerate_After_Opening_Min;
    } else {
      // Use Refrigerate fields
      daysToAdd = flattenedRow.Refrigerate_Max || flattenedRow.Refrigerate_Min;
    }
  } else if (location === StorageLocation.Freezer) {
    // Freezer typically uses Freeze fields
    daysToAdd = flattenedRow.Freeze_Max || flattenedRow.Freeze_Min;
  }

  // If no shelf life data available, return null
  if (!daysToAdd || isNaN(Number(daysToAdd))) {
    return null;
  }

  // Calculate expiration date
  const expirationDate = new Date(purchaseDate);
  expirationDate.setDate(expirationDate.getDate() + Number(daysToAdd));

  return expirationDate;
}

/**
 * Writes one dictionary-row into MongoDB with expiration calculation and user metadata.
 * @param rawRow - The foodstuff row data from Gemini
 * @param location - Storage location (0=Pantry, 1=Refrigerator, 2=Freezer)
 * @param opened - Whether the item is opened
 * @param purchaseDate - When the item was purchased
 * @param collectionName - MongoDB collection name
 */
export async function writeRowDirect(
  rawRow: KVRow,
  location: number = 0,
  opened: boolean = false,
  purchaseDate: Date = new Date(),
  collectionName = "foodstuffs",
) {
  await connectMongoDB();

  const flattened = stripNullish(flattenRow(rawRow));

  // Calculate expiration date
  const expirationDate = calculateExpirationDate(flattened, location, opened, purchaseDate);

  // Build the document to insert
  const document = {
    ...flattened,
    location,
    opened,
    purchaseDate,
    expirationDate,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // Use the underlying native collection API
  if (!mongoose.connection.db) {
    throw new Error("MongoDB connection is not initialized");
  }

  const collection = mongoose.connection.db.collection(collectionName);
  const result = await collection.insertOne(document);

  return {
    insertedId: result.insertedId,
    document
  };
}
