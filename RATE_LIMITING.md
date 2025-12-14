# Rate Limiting Configuration

This document explains the rate limiting implementation in the backend to protect against abuse, brute force attacks, and DDoS.

## Overview

Rate limiting is implemented using `express-rate-limit` with different limits for different types of endpoints based on their sensitivity and expected usage patterns.

## Rate Limiters

### 1. **General API Limiter**
- **Applied to**: All `/api/*` routes
- **Limit**: 100 requests per 15 minutes per IP
- **Purpose**: Prevent general API abuse
- **Location**: `src/server.ts:24`

```typescript
app.use("/api/", generalLimiter);
```

### 2. **Authentication Limiter**
- **Applied to**: Login and registration endpoints
- **Limit**: 5 attempts per 15 minutes per IP
- **Purpose**: Prevent brute force attacks
- **Skip successful requests**: Yes (only failed attempts count)
- **Endpoints**:
  - `POST /api/auth/login`
  - `POST /api/auth/register`

### 3. **Password Reset Limiter**
- **Applied to**: Password reset endpoints
- **Limit**: 3 attempts per hour per IP
- **Purpose**: Prevent password reset abuse
- **Endpoints**:
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/reset-password/:token`
  - `GET /api/auth/reset-password/:token`

### 4. **Email Verification Limiter**
- **Applied to**: Email verification endpoints
- **Limit**: 10 attempts per hour per IP
- **Purpose**: Prevent email spam
- **Endpoints**:
  - `POST /api/auth/verify-account`
  - `POST /api/auth/resend-verification-code`

### 5. **Upload Limiter**
- **Applied to**: Endpoints that upload files
- **Limit**: 20 uploads per 15 minutes per IP
- **Purpose**: Prevent upload spam and storage abuse
- **Endpoints**:
  - `PUT /api/auth/update-user` (profile picture)
  - `PUT /api/properties/:id` (property images)

### 6. **Message Limiter**
- **Applied to**: Chat message endpoints
- **Limit**: 60 messages per minute per IP
- **Purpose**: Prevent message spam
- **Endpoints**:
  - `POST /api/conversations/:id/messages`

### 7. **Create Property Limiter**
- **Applied to**: Property creation endpoint
- **Limit**: 10 properties per hour per IP
- **Purpose**: Prevent spam property creation
- **Endpoints**:
  - `POST /api/properties`

### 8. **Search Limiter**
- **Applied to**: Search endpoints
- **Limit**: 100 searches per 15 minutes per IP
- **Purpose**: Prevent search API abuse
- **Endpoints**:
  - `GET /api/properties/search`

## How It Works

### Rate Limit Headers

When a client makes a request, the following headers are included in the response:

```
RateLimit-Limit: 100           # Maximum requests allowed
RateLimit-Remaining: 95        # Requests remaining in window
RateLimit-Reset: 1234567890    # Unix timestamp when limit resets
```

### When Limit is Exceeded

When a client exceeds the rate limit, they receive:

**Status Code**: `429 Too Many Requests`

**Response Body**:
```json
{
  "message": "Too many requests from this IP, please try again later."
}
```

### Example Response Headers

```
HTTP/1.1 429 Too Many Requests
Content-Type: application/json
RateLimit-Limit: 5
RateLimit-Remaining: 0
RateLimit-Reset: 1702123456
Retry-After: 900

{
  "message": "Too many authentication attempts, please try again after 15 minutes."
}
```

## Configuration

All rate limiters are configured in `src/config/rate-limit.config.ts`.

### Adjusting Limits

To modify limits, edit the configuration file:

```typescript
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  // Time window (15 minutes)
    max: 5,                     // Max requests in window
    message: "Custom error message",
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true  // Only count failed attempts
});
```

### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `windowMs` | Time window in milliseconds | Required |
| `max` | Maximum requests per window | Required |
| `message` | Error message when limit exceeded | "Too many requests" |
| `standardHeaders` | Include `RateLimit-*` headers | `true` |
| `legacyHeaders` | Include `X-RateLimit-*` headers | `false` |
| `skipSuccessfulRequests` | Don't count successful requests | `false` |
| `skipFailedRequests` | Don't count failed requests | `false` |

## Testing Rate Limits

### Using cURL

Test authentication rate limit:

```bash
# Make 6 login attempts (limit is 5)
for i in {1..6}; do
  curl -X POST http://localhost:3000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}' \
    -i
done
```

After the 5th attempt, you should receive a `429` response.

### Using Postman

1. Create a collection with the endpoint you want to test
2. Use Postman's Collection Runner
3. Set iterations to a number higher than the limit
4. Observe the 429 responses after exceeding the limit

### Checking Headers

In Postman or browser DevTools, check the response headers:

```
RateLimit-Limit: 5
RateLimit-Remaining: 3
RateLimit-Reset: 1702123456
```

## Production Considerations

### Behind a Proxy/Load Balancer

If your app is behind a proxy (Nginx, CloudFlare, etc.), you need to trust the proxy:

```typescript
// In server.ts, before applying rate limiters
app.set('trust proxy', 1);
```

This ensures the rate limiter uses the real client IP from `X-Forwarded-For` header instead of the proxy's IP.

### Using Redis for Distributed Systems

For multiple server instances, use Redis as a shared store:

```bash
npm install rate-limit-redis redis
```

```typescript
import { createClient } from 'redis';
import { RedisStore } from 'rate-limit-redis';

const redisClient = createClient({
    url: `redis://${env.REDIS_HOST}:${env.REDIS_PORT}`
});

export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    store: new RedisStore({
        client: redisClient,
        prefix: 'rate-limit:auth:'
    })
});
```

### CloudFlare Integration

If using CloudFlare:
1. CloudFlare has its own rate limiting
2. You can use both (CloudFlare + express-rate-limit)
3. CloudFlare limits protect against DDoS
4. express-rate-limit provides application-level limits

## Monitoring

### Logging Rate Limit Events

Add custom logging when limits are hit:

```typescript
export const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    handler: (req, res) => {
        logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            error: "Too many attempts"
        });
    }
});
```

### Metrics to Track

- Number of 429 responses per endpoint
- IPs that frequently hit limits
- Peak request times
- Failed authentication attempts

## Security Best Practices

1. **Combine with Other Security Measures**:
   - Use alongside CORS, Helmet, and input validation
   - Implement account lockout after repeated failures

2. **Monitor for Abuse**:
   - Log IPs that frequently hit limits
   - Consider IP blocking for persistent offenders

3. **Adjust Limits Based on Usage**:
   - Review logs to find appropriate limits
   - Increase limits for legitimate high-volume users

4. **Different Limits for Authenticated Users**:
   ```typescript
   const limiter = rateLimit({
       max: (req) => {
           return req.user ? 200 : 100;  // Higher limit for logged-in users
       }
   });
   ```

## Troubleshooting

### Issue: Legitimate users hitting limits

**Solution**: Increase the limit or window size for that endpoint

### Issue: Rate limiting not working

**Possible causes**:
1. Middleware not applied to route
2. Multiple server instances without Redis store
3. Behind proxy without `trust proxy` setting

### Issue: All requests from same IP

**Solution**: Set `app.set('trust proxy', 1)` to use `X-Forwarded-For` header

## References

- [express-rate-limit Documentation](https://github.com/express-rate-limit/express-rate-limit)
- [OWASP Rate Limiting Guide](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [Redis Rate Limiting](https://github.com/express-rate-limit/rate-limit-redis)
