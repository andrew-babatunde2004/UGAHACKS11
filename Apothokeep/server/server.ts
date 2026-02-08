import dotenv from "dotenv";
import app from "./app";
import connectMongoDB from "./db/mongodb";

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;

(async () => {
  await connectMongoDB();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
    console.log(`Local Access: http://localhost:${PORT}`);
    console.log(`Network Access: http://172.21.80.128:${PORT}`);
  });
})();

