// Mock dependencies BEFORE imports
jest.mock("../../services/conversations.service");
jest.mock("../../services/messages.service");
jest.mock("../../utils/logger.util", () => ({
    __esModule: true,
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

import { Server as SocketIOServer, Socket } from "socket.io";
import { ConversationsService } from "../../services/conversations.service";
import { MessagesService } from "../../services/messages.service";
import { setupChatSocketHandlers as setupChatHandlers } from "../../sockets/chat.socket";

describe("Chat Socket Handlers", () => {
    let mockSocket: Partial<Socket & { user?: { id: string; email: string }; userId?: string }>;
    let mockIo: Partial<SocketIOServer>;
    let mockUser: { id: string; email: string };

    beforeEach(() => {
        jest.clearAllMocks();

        mockUser = {
            id: "user-123",
            email: "test@example.com",
        };

        mockSocket = {
            id: "socket-123",
            user: mockUser,
            userId: mockUser.id,
            join: jest.fn(),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            on: jest.fn(),
        };

        mockIo = {
            on: jest.fn().mockImplementation((event: string, cb: (socket: Socket) => void) => {
                if (event === "connection") cb(mockSocket as Socket);
            }),
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
        };
    });

    describe("join_conversation", () => {
        it("should allow user to join their own conversation", async () => {
            const conversationId = "conv-123";
            const mockConversation = {
                id: conversationId,
                buyerId: "user-123",
                sellerId: "user-456",
            };

            (ConversationsService.getConversationById as jest.Mock).mockResolvedValue(
                mockConversation,
            );

            setupChatHandlers(mockIo as SocketIOServer);

            // Get the join_conversation handler
            const joinHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                (call) => call[0] === "join_conversation",
            )?.[1];

            expect(joinHandler).toBeDefined();

            await joinHandler(conversationId);

            expect(ConversationsService.getConversationById).toHaveBeenCalledWith(
                mockUser.id,
                conversationId,
                expect.any(Function),
            );
            expect(mockSocket.join).toHaveBeenCalledWith(`conversation:${conversationId}`);
        });

        it("should reject joining conversation if user is not a participant", async () => {
            const conversationId = "conv-123";

            (ConversationsService.getConversationById as jest.Mock).mockRejectedValue(
                new Error("Forbidden"),
            );

            setupChatHandlers(mockIo as SocketIOServer);

            const joinHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                (call) => call[0] === "join_conversation",
            )?.[1];

            await joinHandler(conversationId);

            expect(mockSocket.emit).toHaveBeenCalledWith("error", {
                message: "Cannot join conversation",
            });
            expect(mockSocket.join).not.toHaveBeenCalledWith(`conversation:${conversationId}`);
        });
    });

    describe("send_message", () => {
        it("should broadcast message to conversation participants", async () => {
            const messageData = {
                conversationId: "conv-123",
                content: "Hello World",
                type: "TEXT",
            };

            const mockConversation = {
                id: "conv-123",
                buyerId: "user-123",
                sellerId: "user-456",
            };

            const mockMessage = {
                id: "msg-123",
                conversationId: "conv-123",
                senderId: "user-123",
                content: "Hello World",
                type: "TEXT",
                createdAt: new Date(),
            };

            (ConversationsService.getConversationById as jest.Mock).mockResolvedValue(
                mockConversation,
            );

            (MessagesService.sendMessage as jest.Mock).mockResolvedValue(mockMessage);

            setupChatHandlers(mockIo as SocketIOServer);

            const sendMessageHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                (call) => call[0] === "send_message",
            )?.[1];

            expect(sendMessageHandler).toBeDefined();

            await sendMessageHandler(messageData);

            expect(mockIo.to).toHaveBeenCalledWith("conversation:conv-123");
            expect(mockIo.emit).toHaveBeenCalledWith("new_message", mockMessage);
        });

        it("should handle send_message error gracefully", async () => {
            const messageData = {
                conversationId: "conv-123",
                content: "Hello World",
                type: "TEXT",
            };

            (ConversationsService.getConversationById as jest.Mock).mockRejectedValue(
                new Error("Conversation not found"),
            );

            setupChatHandlers(mockIo as SocketIOServer);

            const sendMessageHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                (call) => call[0] === "send_message",
            )?.[1];

            await sendMessageHandler(messageData);

            expect(mockSocket.emit).toHaveBeenCalledWith("error", {
                message: "Failed to send message",
            });
        });
    });

    describe("typing", () => {
        it("should broadcast typing indicator to conversation", () => {
            const conversationId = "conv-123";

            setupChatHandlers(mockIo as SocketIOServer);

            const typingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                (call) => call[0] === "typing_start",
            )?.[1];

            expect(typingHandler).toBeDefined();

            typingHandler({ conversationId });

            expect(mockSocket.to).toHaveBeenCalledWith(`conversation:${conversationId}`);
            expect(mockSocket.emit).toHaveBeenCalledWith("user_typing", {
                userId: mockUser.id,
                conversationId,
            });
        });
    });

    describe("stop_typing", () => {
        it("should broadcast stop typing indicator to conversation", () => {
            const conversationId = "conv-123";

            setupChatHandlers(mockIo as SocketIOServer);

            const stopTypingHandler = (mockSocket.on as jest.Mock).mock.calls.find(
                (call) => call[0] === "typing_stop",
            )?.[1];

            expect(stopTypingHandler).toBeDefined();

            stopTypingHandler({ conversationId });

            expect(mockSocket.to).toHaveBeenCalledWith(`conversation:${conversationId}`);
            expect(mockSocket.emit).toHaveBeenCalledWith("user_stopped_typing", {
                userId: mockUser.id,
                conversationId,
            });
        });
    });
});
