import { PropertiesService } from "../../../services/properties.service";
import { AppDataSource } from "../../../config/typeorm.config";
import { CacheUtil } from "../../../utils/cache.util";
import { PropertyStatus, PropertyType, UserRole } from "../../../enums";

// Mock dependencies
jest.mock("../../../config/typeorm.config", () => ({
    AppDataSource: {
        getRepository: jest.fn(),
    },
}));

jest.mock("../../../utils/logger.util", () => ({
    default: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock("../../../config/cloudinary.config", () => ({
    cloudinary: {},
}));

jest.mock("../../../utils/cloudinary.util", () => ({
    uploadMultipleImages: jest.fn(),
    deleteMultipleImages: jest.fn(),
}));

jest.mock("../../../config/redis.config", () => ({
    redisClient: {
        get: jest.fn(),
        set: jest.fn(),
        setEx: jest.fn(),
        del: jest.fn(),
        keys: jest.fn(),
        exists: jest.fn(),
        expire: jest.fn(),
        isOpen: false,
    },
    connectRedis: jest.fn(),
    disconnectRedis: jest.fn(),
}));

jest.mock("../../../utils/cache.util");

describe("Cache Invalidation Tests", () => {
    const mockPropertyRepository = {
        findOne: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        createQueryBuilder: jest.fn().mockReturnValue({
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue({ affected: 1 }),
        }),
    };

    const mockPropertyImageRepository = {
        create: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };

    const mockProperty = {
        id: "property-123",
        userId: "user-123",
        title: "Test Property",
        description: "A test property",
        price: 250000,
        propertyType: PropertyType.HOUSE,
        address: "123 Main St",
        department: "Department 1",
        municipality: "Municipality 1",
        latitude: 10.123456,
        longitude: -74.123456,
        bedrooms: 3,
        bathrooms: 2,
        areaSqm: 150,
        status: PropertyStatus.ACTIVE,
        viewsCount: 10,
        isFeatured: false,
        images: [],
        user: {
            id: "user-123",
            name: "John Doe",
            email: "john@example.com",
            role: UserRole.SELLER,
        },
    };

    const mockT = (key: string): string => key;

    beforeEach(() => {
        jest.clearAllMocks();
        (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
            if (entity.name === "Property") {
                return mockPropertyRepository;
            }
            if (entity.name === "PropertyImage") {
                return mockPropertyImageRepository;
            }
            return {};
        });
    });

    describe("updateProperty", () => {
        it("should invalidate property cache after update", async () => {
            const updateData = {
                title: "Updated Property",
                price: 300000,
            };

            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockPropertyRepository.save.mockResolvedValue({
                ...mockProperty,
                ...updateData,
            });

            await PropertiesService.updateProperty("user-123", "property-123", updateData, mockT);

            expect(CacheUtil.del).toHaveBeenCalledWith("property:property-123");
        });

        it("should invalidate featured cache if property is featured", async () => {
            const featuredProperty = {
                ...mockProperty,
                isFeatured: true,
            };

            const updateData = {
                title: "Updated Featured Property",
            };

            mockPropertyRepository.findOne.mockResolvedValue(featuredProperty);
            mockPropertyRepository.save.mockResolvedValue({
                ...featuredProperty,
                ...updateData,
            });

            await PropertiesService.updateProperty("user-123", "property-123", updateData, mockT);

            expect(CacheUtil.del).toHaveBeenCalledWith("property:property-123");
            expect(CacheUtil.invalidatePattern).toHaveBeenCalledWith("featured:*");
        });

        it("should not invalidate featured cache if property is not featured", async () => {
            const updateData = {
                title: "Updated Property",
            };

            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockPropertyRepository.save.mockResolvedValue({
                ...mockProperty,
                ...updateData,
            });

            await PropertiesService.updateProperty("user-123", "property-123", updateData, mockT);

            expect(CacheUtil.del).toHaveBeenCalledWith("property:property-123");
            expect(CacheUtil.invalidatePattern).not.toHaveBeenCalled();
        });
    });

    describe("deleteProperty", () => {
        it("should invalidate property cache after deletion", async () => {
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockPropertyRepository.remove.mockResolvedValue(mockProperty);

            await PropertiesService.deleteProperty("user-123", "property-123", mockT);

            expect(CacheUtil.del).toHaveBeenCalledWith("property:property-123");
        });

        it("should invalidate featured cache if deleted property was featured", async () => {
            const featuredProperty = {
                ...mockProperty,
                isFeatured: true,
            };

            mockPropertyRepository.findOne.mockResolvedValue(featuredProperty);
            mockPropertyRepository.remove.mockResolvedValue(featuredProperty);

            await PropertiesService.deleteProperty("user-123", "property-123", mockT);

            expect(CacheUtil.del).toHaveBeenCalledWith("property:property-123");
            expect(CacheUtil.invalidatePattern).toHaveBeenCalledWith("featured:*");
        });
    });

    describe("updatePropertyStatus", () => {
        it("should invalidate property cache after status update", async () => {
            const statusData = {
                status: PropertyStatus.SOLD,
            };

            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);
            mockPropertyRepository.save.mockResolvedValue({
                ...mockProperty,
                status: PropertyStatus.SOLD,
            });

            await PropertiesService.updatePropertyStatus(
                "user-123",
                "property-123",
                statusData,
                mockT,
            );

            expect(CacheUtil.del).toHaveBeenCalledWith("property:property-123");
        });

        it("should invalidate featured cache if featured property status changes", async () => {
            const featuredProperty = {
                ...mockProperty,
                isFeatured: true,
            };

            const statusData = {
                status: PropertyStatus.INACTIVE,
            };

            mockPropertyRepository.findOne.mockResolvedValue(featuredProperty);
            mockPropertyRepository.save.mockResolvedValue({
                ...featuredProperty,
                status: PropertyStatus.INACTIVE,
            });

            await PropertiesService.updatePropertyStatus(
                "user-123",
                "property-123",
                statusData,
                mockT,
            );

            expect(CacheUtil.del).toHaveBeenCalledWith("property:property-123");
            expect(CacheUtil.invalidatePattern).toHaveBeenCalledWith("featured:*");
        });
    });

    describe("getPropertyById with cache", () => {
        it("should return cached property if available", async () => {
            const cachedProperty = {
                id: "property-123",
                title: "Cached Property",
                viewsCount: 15,
            };

            (CacheUtil.get as jest.Mock).mockResolvedValue(cachedProperty);

            const result = await PropertiesService.getPropertyById("property-123", mockT);

            expect(CacheUtil.get).toHaveBeenCalledWith("property:property-123");
            expect(result).toEqual(cachedProperty);
            expect(mockPropertyRepository.findOne).not.toHaveBeenCalled();
        });

        it("should fetch from database and cache if not in cache", async () => {
            (CacheUtil.get as jest.Mock).mockResolvedValue(null);
            mockPropertyRepository.findOne.mockResolvedValue(mockProperty);

            await PropertiesService.getPropertyById("property-123", mockT);

            expect(CacheUtil.get).toHaveBeenCalledWith("property:property-123");
            expect(mockPropertyRepository.findOne).toHaveBeenCalled();
            expect(CacheUtil.set).toHaveBeenCalledWith(
                "property:property-123",
                expect.any(Object),
                300, // 5 minutes TTL
            );
        });
    });

    describe("getFeaturedProperties with cache", () => {
        it("should return cached featured properties if available", async () => {
            const cachedData = {
                data: [mockProperty],
                pagination: {
                    total: 1,
                    page: 1,
                    limit: 20,
                    totalPages: 1,
                    hasNextPage: false,
                    hasPreviousPage: false,
                },
            };

            (CacheUtil.get as jest.Mock).mockResolvedValue(cachedData);

            const result = await PropertiesService.getFeaturedProperties({ page: 1, limit: 20 });

            expect(CacheUtil.get).toHaveBeenCalledWith("featured:page:1:limit:20");
            expect(result).toEqual(cachedData);
        });

        it("should fetch from database and cache if not in cache", async () => {
            const mockFindAndCount = jest.fn().mockResolvedValue([[mockProperty], 1]);
            mockPropertyRepository.findAndCount = mockFindAndCount;

            (CacheUtil.get as jest.Mock).mockResolvedValue(null);

            await PropertiesService.getFeaturedProperties({ page: 1, limit: 20 });

            expect(CacheUtil.get).toHaveBeenCalledWith("featured:page:1:limit:20");
            expect(mockFindAndCount).toHaveBeenCalled();
            expect(CacheUtil.set).toHaveBeenCalledWith(
                "featured:page:1:limit:20",
                expect.any(Object),
                900, // 15 minutes TTL
            );
        });
    });
});
