/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ["ts", "js", "json", "node"],
  roots: ["<rootDir>/src"],
  // Remove explicit testMatch to use Jest's default, which matches both __tests__ and *.test.ts
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    }
  }
};