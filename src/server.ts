import express from "express";
import { AppDataSource } from "./config/typeorm.config";
import logger from "./utils/logger.util";
import { errorHandler } from "./middleware/error.middleware";

const app = express();

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

app.use(express.json());

app.use(errorHandler);

export default app;
