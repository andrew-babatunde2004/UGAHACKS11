import mongoose, { ObjectId } from "mongoose";
import connectMongoDB from "../db/mongodb"; // adjust import path to your connectMongoDB

// the key : value row returned from Gemini deduction 
type KVRow = Array<Record<string, any>>;

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
 * Writes one dictionary-row into MongoDB directly (no schema/model).
 * - rawRow: your array of {key:value} objects
 * - collectionName: where it's stored
 * - upsertKey: how to uniquely identify a row (Category_ID is typical)
 */
export async function writeRowDirect(
  rawRow: KVRow,
  collectionName = "foodstuffs",
) {
  await connectMongoDB();

  const flattened = stripNullish(flattenRow(rawRow));

  // Use the underlying native collection API
  if (!mongoose.connection.db) {
    throw new Error("MongoDB connection is not initialized");
  }
  
  return mongoose.connection.db.collection(collectionName);
}
