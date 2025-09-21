// Global type definitions for Jest test environment

declare global {
  var mockRouterInstance: {
    push: jest.Mock<any, any[]>;
    back: jest.Mock<any, any[]>;
    refresh: jest.Mock<any, any[]>;
    replace: jest.Mock<any, any[]>;
    prefetch: jest.Mock<any, any[]>;
  };
  var ResizeObserver: jest.Mock<any, any[]>;
}

export {};