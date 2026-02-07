import dotenv from "dotenv";
import app from "./app";
import connectMongoDB from "./db/mongodb";

dotenv.config();

const PORT = process.env.PORT || 3000;

(async () => {
  await connectMongoDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
})();

