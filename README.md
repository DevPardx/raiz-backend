# Raíz - Real State Backend

A modern backend application built with TypeScript, Express, and PostgreSQL for managing real estate operations.

## Tech Stack

- **Runtime**: Node.js
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL
- **Code Quality**: ESLint, Prettier

## Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v18 or higher recommended)
- npm (comes with Node.js)
- PostgreSQL (for database)

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration files
│   ├── controllers/    # Request handlers
│   ├── entities/       # Database models/entities
│   ├── middleware/     # Custom middleware
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Utility functions
│   ├── index.ts        # Application entry point
│   └── server.ts       # Server configuration
├── dist/               # Compiled JavaScript output
├── .env                # Environment variables (not tracked)
├── .env.example        # Environment variables template
└── package.json        # Project dependencies and scripts
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

Then configure your environment variables in the `.env` file.

### 4. Run the application

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

## Development

### Code Quality

This project uses ESLint and Prettier to maintain code quality and consistency:

- Run `npm run lint` before committing to catch issues
- Run `npm run format` to format your code
- TypeScript strict mode is enabled for type safety

### TypeScript Configuration

The project uses strict TypeScript configuration with:
- Target: ESNext
- Module: NodeNext
- Strict mode enabled
- Source maps for debugging
- Declaration files generation

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Diego Pardo**

## Support

For issues and questions, please visit the [GitHub Issues](https://github.com/DevPardx/raiz-backend/issues) page.