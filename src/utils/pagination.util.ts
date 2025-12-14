export interface PaginationResponse {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
}

export class PaginationHelper {
    /**
     * Calculate the number of records to skip based on page and limit
     */
    static calculateSkip(page: number, limit: number): number {
        return (page - 1) * limit;
    }

    /**
     * Build pagination response object
     */
    static buildPaginationResponse(page: number, limit: number, total: number): PaginationResponse {
        const totalPages = Math.ceil(total / limit);
        return {
            total,
            page,
            limit,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
        };
    }

    /**
     * Build paginated response with data
     */
    static buildPaginatedResponse<T>(
        data: T[],
        page: number,
        limit: number,
        total: number,
    ): {
        data: T[];
        pagination: PaginationResponse;
    } {
        return {
            data,
            pagination: this.buildPaginationResponse(page, limit, total),
        };
    }
}
