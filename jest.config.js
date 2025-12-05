/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/index.ts",
    "!src/database/migrations/**",
    "!src/config/**",
    "!src/emails/**",
    "!src/server.ts",
    "!src/routes/**"
  ],
  coverageDirectory: "coverage",
  clearMocks: true,
  setupFilesAfterEnv: ["<rootDir>/src/tests/setup.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
};
