import { Server } from "socket.io";
import { AuthenticatedSocket } from "./socket.middleware";
import { MessagesService } from "../services/messages.service";
import { ConversationsService } from "../services/conversations.service";
import { MessageStatus } from "../enums";
import logger from "../utils/logger.util";
import i18n from "i18next";

export const setupChatSocketHandlers = (io: Server) => {
    io.on("connection", (socket: AuthenticatedSocket) => {
        const userId = socket.userId!;
        logger.info(`User ${userId} connected to chat`);

        socket.join(`user:${userId}`);

        socket.on("join_conversation", async (conversationId: string) => {
            try {
                const t = i18n.getFixedT(null, "common");
                await ConversationsService.getConversationById(userId, conversationId, t);

                socket.join(`conversation:${conversationId}`);
                logger.info(`User ${userId} joined conversation ${conversationId}`);

                socket.emit("joined_conversation", { conversationId });
            } catch (error) {
                logger.error(`Error joining conversation: ${error}`);
                socket.emit("error", { message: "Cannot join conversation" });
            }
        });

        socket.on("leave_conversation", (conversationId: string) => {
            socket.leave(`conversation:${conversationId}`);
            logger.info(`User ${userId} left conversation ${conversationId}`);
        });

        socket.on("send_message", async (data) => {
            try {
                const { conversationId, type, content, imageUrl } = data;

                const t = i18n.getFixedT(null, "common");
                const message = await MessagesService.sendMessage(
                    userId,
                    conversationId,
                    { type, content, imageUrl },
                    t,
                );

                io.to(`conversation:${conversationId}`).emit("new_message", message);

                const conversation = await ConversationsService.getConversationById(
                    userId,
                    conversationId,
                    t,
                );

                const recipientId =
                    conversation.buyerId === userId ? conversation.sellerId : conversation.buyerId;

                io.to(`user:${recipientId}`).emit("message_notification", {
                    conversationId,
                    message,
                    conversation,
                });

                logger.info(`Message sent in conversation ${conversationId}`);
            } catch (error) {
                logger.error(`Error sending message: ${error}`);
                socket.emit("error", { message: "Failed to send message" });
            }
        });

        socket.on("typing_start", (data) => {
            const { conversationId } = data;
            socket.to(`conversation:${conversationId}`).emit("user_typing", {
                conversationId,
                userId,
            });
        });

        socket.on("typing_stop", (data) => {
            const { conversationId } = data;
            socket.to(`conversation:${conversationId}`).emit("user_stopped_typing", {
                conversationId,
                userId,
            });
        });

        socket.on("message_delivered", async (data) => {
            try {
                const { messageId } = data;

                const t = i18n.getFixedT(null, "common");
                await MessagesService.updateMessageStatus(messageId, MessageStatus.DELIVERED, t);

                socket.broadcast.emit("message_status_updated", {
                    messageId,
                    status: MessageStatus.DELIVERED,
                });
            } catch (error) {
                logger.error(`Error updating message status: ${error}`);
            }
        });

        socket.on("messages_read", async (data) => {
            try {
                const { conversationId } = data;

                const t = i18n.getFixedT(null, "common");
                await ConversationsService.markMessagesAsRead(userId, conversationId, t);

                socket.to(`conversation:${conversationId}`).emit("messages_read", {
                    conversationId,
                    readBy: userId,
                });
            } catch (error) {
                logger.error(`Error marking messages as read: ${error}`);
            }
        });

        socket.on("disconnect", () => {
            logger.info(`User ${userId} disconnected from chat`);
        });
    });
};
