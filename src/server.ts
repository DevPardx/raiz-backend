import express from "express";
import colors from "colors";
import { AppDataSource } from "./config/typeorm.config";

const app = express();

app.use(express.json());

const connectDB = async () => {
  try {
    await AppDataSource.initialize();
    console.log(colors.magenta.bold("Database connected successfully"));
  } catch (error) {
    console.log(colors.red.bold(`Database connection failed: ${error}`));
  }
};

connectDB();

export default app;
