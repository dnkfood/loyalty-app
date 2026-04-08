import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: ['src/**/*.ts', '!src/main.ts'],
  coverageDirectory: './coverage',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@loyalty/shared-types$': '<rootDir>/../../packages/shared-types/src/index.ts',
    '^@loyalty/shared-utils$': '<rootDir>/../../packages/shared-utils/src/index.ts',
  },
};

export default config;
