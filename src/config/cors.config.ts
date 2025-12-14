import { CorsOptions } from "cors";
import { env } from "./env.config";

/* eslint-disable @typescript-eslint/no-explicit-any */
export const corsConfig: CorsOptions = {
    origin: (origin, callback) => {
        const whiteList: any = [env.FRONTEND_URL];

        if (env.NODE_ENV === "development") {
            whiteList.push(undefined);

            if (origin && origin.startsWith("http://localhost:")) {
                return callback(null, true);
            }
        }

        if (whiteList.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error("Not allowed by CORS"));
        }
    },
    credentials: true,
};
