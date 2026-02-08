const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
require("ts-node/register");
const connectMongoDB = require("../db/mongodb.ts").default;
const { writeRowDirect } = require("./dbWriteRow.ts");

/**
 * Writes one dictionary-row into MongoDB directly.
 * - rawRow: array of {key:value} objects (Gemini row output)
 */
async function ingestRowToFoodstuff(rawRow, options = {}) {
  await connectMongoDB();

  return writeRowDirect(rawRow);
}

module.exports = {
  ingestRowToFoodstuff
};
