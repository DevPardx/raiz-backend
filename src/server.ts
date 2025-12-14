import "./i18n";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { AppDataSource } from "./config/typeorm.config";
import logger from "./utils/logger.util";
import { errorHandler } from "./middleware/error.middleware";
import { languageMiddleware } from "./middleware/language.middleware";
import authRoutes from "./routes/auth.route";
import propertiesRoutes from "./routes/properties.route";
import favoritesRoutes from "./routes/favorites.route";
import conversationsRoutes from "./routes/conversations.route";
import notificationsRoutes from "./routes/notifications.route";
import { corsConfig } from "./config/cors.config";
import { generalLimiter } from "./config/rate-limit.config";

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cors(corsConfig));
app.use(
    helmet({
        contentSecurityPolicy: true,
    }),
);
app.use(languageMiddleware);

app.use("/api/", generalLimiter);

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
app.use("/api/properties", propertiesRoutes);
app.use("/api/favorites", favoritesRoutes);
app.use("/api/conversations", conversationsRoutes);
app.use("/api/notifications", notificationsRoutes);

app.use(errorHandler);

export default app;
