import express from "express";
import foodstuffRoutes from "./routes/foodstuff.routes";

const app = express();

app.use(express.json());
app.use("/foodstuff", foodstuffRoutes);

export default app;
