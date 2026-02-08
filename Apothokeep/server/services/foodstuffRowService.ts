import Foodstuff, { FoodstuffDoc } from "../models/foodstuffSchema";

type FoodstuffRow = Array<Record<string, any>>;

type CreateFoodstuffOptions = {
  location?: number;
  opened?: boolean;
  purchaseDate?: string | Date;
  expirationDate?: string | Date;
  defaultShelfLifeDays?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

const rowToMap = (row: FoodstuffRow): Record<string, any> => {
  return row.reduce((acc, entry) => {
    const key = Object.keys(entry)[0];
    acc[key] = entry[key];
    return acc;
  }, {} as Record<string, any>);
};

const buildName = (rowMap: Record<string, any>) => {
  const name = rowMap.Name ?? "Unknown item";
  const subtitle = rowMap.Name_subtitle;
  return subtitle ? `${name} (${subtitle})` : name;
};

const addDuration = (base: Date, amount: number, metric: string): Date => {
  const unit = metric.toLowerCase();
  const result = new Date(base);

  if (unit.startsWith("day")) {
    result.setDate(result.getDate() + amount);
  } else if (unit.startsWith("week")) {
    result.setDate(result.getDate() + amount * 7);
  } else if (unit.startsWith("month")) {
    result.setMonth(result.getMonth() + amount);
  } else if (unit.startsWith("year")) {
    result.setFullYear(result.getFullYear() + amount);
  } else {
    result.setTime(result.getTime() + amount * DAY_MS);
  }

  return result;
};

const getRange = (rowMap: Record<string, any>, prefix: string) => {
  const min = rowMap[`${prefix}_Min`];
  const max = rowMap[`${prefix}_Max`];
  const metric = rowMap[`${prefix}_Metric`];
  if (metric == null || (min == null && max == null)) return null;
  const value = Number(max ?? min);
  if (!Number.isFinite(value)) return null;
  return { value, metric: String(metric) };
};

const computeExpiration = (
  rowMap: Record<string, any>,
  location: number,
  opened: boolean,
  purchaseDate: Date
): Date | null => {
  if (location === 0) {
    if (opened) {
      const range = getRange(rowMap, "Pantry_After_Opening");
      if (range) return addDuration(purchaseDate, range.value, range.metric);
    }
    const dop = getRange(rowMap, "DOP_Pantry");
    if (dop) return addDuration(purchaseDate, dop.value, dop.metric);
    const pantry = getRange(rowMap, "Pantry");
    if (pantry) return addDuration(purchaseDate, pantry.value, pantry.metric);
  }

  if (location === 1) {
    if (opened) {
      const range = getRange(rowMap, "Refrigerate_After_Opening");
      if (range) return addDuration(purchaseDate, range.value, range.metric);
    }
    const dop = getRange(rowMap, "DOP_Refrigerate");
    if (dop) return addDuration(purchaseDate, dop.value, dop.metric);
    const fridge = getRange(rowMap, "Refrigerate");
    if (fridge) return addDuration(purchaseDate, fridge.value, fridge.metric);
  }

  if (location === 2) {
    const dop = getRange(rowMap, "DOP_Freeze");
    if (dop) return addDuration(purchaseDate, dop.value, dop.metric);
    const freeze = getRange(rowMap, "Freeze");
    if (freeze) return addDuration(purchaseDate, freeze.value, freeze.metric);
  }

  return null;
};

export const createFoodstuffFromGeminiRow = async (
  row: FoodstuffRow,
  {
    location = 0,
    opened = false,
    purchaseDate = new Date(),
    expirationDate,
    defaultShelfLifeDays = 7
  }: CreateFoodstuffOptions = {}
): Promise<FoodstuffDoc> => {
  const rowMap = rowToMap(row);
  const normalizedPurchase = purchaseDate instanceof Date ? purchaseDate : new Date(purchaseDate);

  const computedExpiration =
    expirationDate != null
      ? expirationDate instanceof Date
        ? expirationDate
        : new Date(expirationDate)
      : computeExpiration(rowMap, location, opened, normalizedPurchase) ??
        new Date(normalizedPurchase.getTime() + defaultShelfLifeDays * DAY_MS);

  const name = buildName(rowMap);

  return Foodstuff.create({
    name,
    opened,
    purchaseDate: normalizedPurchase,
    expirationDate: computedExpiration,
    location
  });
};

export type { FoodstuffRow, CreateFoodstuffOptions };
