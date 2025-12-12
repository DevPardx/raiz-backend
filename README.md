# Raíz - Real Estate Backend

A modern, full-featured backend application built with TypeScript, Express, and PostgreSQL for managing real estate operations. Includes real-time chat, push notifications, and comprehensive property management.

## Features

### 🔐 Authentication & Authorization
- User registration with email verification
- JWT-based authentication (access & refresh tokens)
- Password reset with secure token validation
- Role-based access control (Admin, Seller, Buyer)
- Account verification via email

### 👤 User Management
- User profile updates (name, profile picture)
- Password change functionality
- Profile picture upload with Cloudinary integration
- Password verification endpoint
- User roles management

### 🏠 Property Management
- Complete CRUD operations for properties
- Advanced filtering and search
- Property status management (available, sold, rented)
- Multiple property images with Cloudinary storage
- Property statistics and analytics
- Seller-specific property listings

### ⭐ Favorites System
- Add/remove properties to favorites
- Get user's favorite properties
- Check if property is favorited
- Automatic cleanup on property deletion

### 💬 Real-time Chat & Messaging
- Real-time messaging with Socket.IO
- One-to-one conversations between buyers and sellers
- Message status tracking (sent, delivered, read)
- Support for text and image messages
- Unread message counters
- Message read receipts
- Conversation history with pagination

### 🔔 Push Notifications
- Web Push Notifications support
- VAPID-based push messaging
- Automatic notifications on new chat messages
- Multi-device support
- Subscription management
- Test notification endpoint
- Automatic cleanup of invalid subscriptions

### 📸 Media Management
- Cloudinary integration for image storage
- Base64 image upload support
- Automatic image optimization
- Profile picture management
- Chat image sharing
- Property image galleries

### 🌍 Internationalization
- Multi-language support (English & Spanish)
- Language detection from headers
- Localized error messages
- Localized email templates

### 🗄️ Database & Caching
- PostgreSQL with TypeORM
- Database migrations support
- Redis caching for improved performance
- Optimized queries with indexes
- Relationship management

### 📧 Email System
- SMTP integration (Mailtrap for development)
- Email verification
- Password reset emails
- Styled HTML email templates

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL (TypeORM)
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Image Storage**: Cloudinary
- **Email**: Nodemailer (SMTP)
- **Push Notifications**: web-push (VAPID)
- **Validation**: class-validator, class-transformer
- **i18n**: i18next
- **Security**: JWT, bcrypt
- **Code Quality**: ESLint, Prettier

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- PostgreSQL (v14 or higher)
- Redis (v6 or higher)

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files (DB, Redis, Cloudinary, etc.)
│   ├── controllers/      # Request handlers
│   ├── dtos/             # Data Transfer Objects & validation
│   ├── entities/         # TypeORM database entities
│   ├── enums/            # Enumerations (roles, statuses, etc.)
│   ├── handler/          # Error handlers
│   ├── i18n/             # Internationalization files
│   │   └── locales/      # Language translations (en, es)
│   ├── middleware/       # Custom middleware (auth, validation, etc.)
│   ├── migrations/       # Database migrations
│   ├── routes/           # API route definitions
│   ├── services/         # Business logic layer
│   ├── tests/            # Test files (unit & integration)
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions (tokens, email, logger, etc.)
│   ├── index.ts          # Application entry point
│   ├── server.ts         # Express server configuration
│   └── socket.ts         # Socket.IO configuration
├── dist/                 # Compiled JavaScript output
├── .env                  # Environment variables (not tracked)
├── .env.example          # Environment variables template
├── package.json          # Project dependencies and scripts
└── tsconfig.json         # TypeScript configuration
```

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/DevPardx/raiz-backend.git
cd raiz-backend
```

### 2. Install dependencies

```bash
npm install
```

### 3. Environment setup

Create a `.env` file in the root directory based on `.env.example`:

```bash
cp .env.example .env
```

Then configure your environment variables in the `.env` file:

```env
# Server
FRONTEND_URL=http://localhost:5173
PORT=3000
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_DB=raiz
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_password
POSTGRES_PORT=5432

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_password

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_jwt_refresh_secret_min_32_chars

# SMTP
SMTP_HOST=sandbox.smtp.mailtrap.io
SMTP_PORT=2525
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Web Push Notifications (VAPID)
# Generate keys with: npx web-push generate-vapid-keys
VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_SUBJECT=mailto:your-email@example.com
```

### 4. Generate VAPID keys

For push notifications to work, generate VAPID keys:

```bash
npx web-push generate-vapid-keys
```

Copy the generated keys to your `.env` file.

### 5. Setup database

Make sure PostgreSQL is running, then run migrations:

```bash
npm run migration:run
```

### 6. Run the application

#### Development mode

```bash
npm run dev
```

This will start the development server with hot-reload using nodemon.

#### Production mode

```bash
# Build the TypeScript code
npm run build

# Start the production server
npm start
```

The server will be running at `http://localhost:3000` (or your configured PORT).

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /verify-account` - Verify email with code
- `POST /login` - User login
- `POST /refresh-token` - Refresh access token
- `POST /logout` - User logout
- `POST /forgot-password` - Request password reset
- `GET /validate-reset-token/:token` - Validate reset token
- `POST /reset-password` - Reset password with token
- `PATCH /change-password` - Change password (authenticated)
- `POST /verify-password` - Verify current password
- `PATCH /update-user` - Update user profile

### Properties (`/api/properties`)
- `GET /` - Get all properties (with filters)
- `GET /stats` - Get property statistics (admin)
- `GET /user/:userId` - Get properties by user
- `GET /:id` - Get single property
- `POST /` - Create property (seller/admin)
- `PUT /:id` - Update property (owner/admin)
- `PATCH /:id/status` - Update property status (owner/admin)
- `DELETE /:id` - Delete property (owner/admin)

### Favorites (`/api/favorites`)
- `GET /` - Get user's favorites
- `POST /:propertyId` - Add to favorites
- `DELETE /:propertyId` - Remove from favorites
- `GET /check/:propertyId` - Check if property is favorited

### Conversations (`/api/conversations`)
- `POST /` - Create conversation
- `GET /` - Get user's conversations
- `GET /:id` - Get conversation by ID
- `GET /:id/messages` - Get conversation messages
- `POST /:id/messages` - Send message
- `PATCH /:id/read` - Mark messages as read

### Notifications (`/api/notifications`)
- `GET /vapid-public-key` - Get VAPID public key (public)
- `POST /subscribe` - Subscribe to push notifications
- `DELETE /subscribe` - Unsubscribe from notifications
- `GET /subscriptions` - Get user's subscriptions
- `POST /test` - Send test notification

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot-reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run the compiled production server |
| `npm run lint` | Check code for linting errors |
| `npm run lint:fix` | Fix linting errors automatically |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check code formatting |
| `npm run typecheck` | Type-check without emitting files |
| `npm test` | Run all tests |
| `npm run migration:generate` | Generate a new database migration |
| `npm run migration:create` | Create a new database migration |
| `npm run migration:run` | Run pending database migrations |
| `npm run migration:revert` | Revert the last database migration |
| `npm run migration:show` | Show the status of database migrations |

## Database Entities

- **User** - User accounts with roles
- **Property** - Real estate properties
- **PropertyImage** - Property image gallery
- **Favorites** - User's favorite properties
- **Conversation** - Chat conversations
- **Messages** - Chat messages
- **PushSubscription** - Push notification subscriptions
- **VerificationToken** - Email verification tokens
- **RefreshToken** - JWT refresh tokens

## Real-time Events (Socket.IO)

### Client → Server
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `send_message` - Send a new message
- `typing` - User is typing
- `stop_typing` - User stopped typing
- `mark_as_read` - Mark messages as read

### Server → Client
- `new_message` - New message received
- `message_read` - Messages marked as read
- `typing` - Another user is typing
- `stop_typing` - Another user stopped typing
- `error` - Error occurred

## Development

### Code Quality

This project uses ESLint and Prettier to maintain code quality and consistency:

- Run `npm run lint` before committing to catch issues
- Run `npm run format` to format your code
- TypeScript strict mode is enabled for type safety

### Testing

Run the test suite:

```bash
npm test
```

### TypeScript Configuration

The project uses strict TypeScript configuration with:
- Target: ESNext
- Module: NodeNext
- Strict mode enabled
- Source maps for debugging
- Declaration files generation

### Database Migrations

Create a new migration after entity changes:

```bash
npm run migration:generate -- src/migrations/MigrationName
```

Run migrations:

```bash
npm run migration:run
```

Revert last migration:

```bash
npm run migration:revert
```

## Security Features

- JWT-based authentication with refresh tokens
- Password hashing with bcrypt
- CORS configuration
- Rate limiting (recommended for production)
- Input validation with class-validator
- SQL injection prevention (TypeORM)
- XSS protection
- Environment variable validation

## Production Deployment

### Environment Variables

Ensure all production environment variables are properly set:
- Use strong JWT secrets (minimum 32 characters)
- Use production database credentials
- Configure CORS for your frontend domain
- Set `NODE_ENV=production`
- Use production SMTP server
- Configure Cloudinary for production

### Recommended Setup

1. Use a process manager (PM2)
2. Set up SSL/TLS certificates
3. Configure reverse proxy (Nginx)
4. Enable database backups
5. Set up monitoring and logging
6. Configure Redis for session storage
7. Enable rate limiting

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Run tests (`npm test`)
4. Commit your changes (`git commit -m 'Add some amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Diego Pardo**

## Support

For issues and questions, please visit the [GitHub Issues](https://github.com/DevPardx/raiz-backend/issues) page.

## Acknowledgments

- Express.js for the web framework
- TypeORM for database management
- Socket.IO for real-time communication
- Cloudinary for image management
- web-push for push notifications
