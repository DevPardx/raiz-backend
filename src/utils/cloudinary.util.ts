import { cloudinary } from "../config/cloudinary.config";
import { UploadApiResponse } from "cloudinary";
import logger from "./logger.util";

export interface CloudinaryUploadResult {
    url: string;
    publicId: string;
}

export const uploadImage = async (
    file: string,
    folder: string = "properties",
): Promise<CloudinaryUploadResult> => {
    try {
        if (!file || typeof file !== "string") {
            throw new Error("Invalid image data: must be a non-empty string");
        }

        let imageData = file;
        if (!file.startsWith("data:")) {
            // Detect image type from base64 header
            let mimeType = "image/jpeg";
            if (file.startsWith("iVBORw0KGgo")) {
                mimeType = "image/png";
            } else if (file.startsWith("R0lGOD")) {
                mimeType = "image/gif";
            } else if (file.startsWith("/9j/")) {
                mimeType = "image/jpeg";
            }
            imageData = `data:${mimeType};base64,${file}`;
        }

        logger.info(`Uploading image to Cloudinary folder: ${folder}`);

        const result: UploadApiResponse = await cloudinary.uploader.upload(imageData, {
            folder: folder,
            resource_type: "auto",
        });

        return {
            url: result.secure_url,
            publicId: result.public_id,
        };
    } catch (error) {
        logger.error("Error uploading image to Cloudinary:", error);
        throw new Error(
            `Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
    }
};

export const uploadMultipleImages = async (
    files: string[],
    folder: string = "properties",
): Promise<CloudinaryUploadResult[]> => {
    try {
        const uploadPromises = files.map((file) => uploadImage(file, folder));
        return await Promise.all(uploadPromises);
    } catch (error) {
        logger.error("Error uploading multiple images to Cloudinary:", error);
        throw new Error("Failed to upload images");
    }
};

export const deleteImage = async (publicId: string): Promise<void> => {
    try {
        await cloudinary.uploader.destroy(publicId);
        logger.info(`Image deleted from Cloudinary: ${publicId}`);
    } catch (error) {
        logger.error("Error deleting image from Cloudinary:", error);
        throw new Error("Failed to delete image");
    }
};

export const deleteMultipleImages = async (publicIds: string[]): Promise<void> => {
    try {
        const deletePromises = publicIds.map((publicId) => deleteImage(publicId));
        await Promise.all(deletePromises);
    } catch (error) {
        logger.error("Error deleting multiple images from Cloudinary:", error);
        throw new Error("Failed to delete images");
    }
};

export const extractPublicIdFromUrl = (url: string): string | null => {
    try {
        const regex = /\/upload\/(?:v\d+\/)?(.+)\.\w+$/;
        const match = url.match(regex);
        return match?.[1] ?? null;
    } catch (error) {
        logger.error("Error extracting public ID from URL:", error);
        return null;
    }
};
