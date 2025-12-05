import "./i18n";
import express from "express";
import { AppDataSource } from "./config/typeorm.config";
import logger from "./utils/logger.util";
import { errorHandler } from "./middleware/error.middleware";
import { languageMiddleware } from "./middleware/language.middleware";
import authRoutes from "./routes/auth.route";

const app = express();

app.use(express.json());
app.use(languageMiddleware);

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

app.use("/api/auth", authRoutes);

app.use(errorHandler);

export default app;
