import express from "express";
import { AppDataSource } from "./config/typeorm.config";
import logger from "./utils/logger.util";

const app = express();

app.use(express.json());

const connectDB = async () => {
  try {
    await AppDataSource.initialize();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error(`Database connection failed: ${error}`);
    process.exit(1);
  }
};

connectDB();

export default app;
