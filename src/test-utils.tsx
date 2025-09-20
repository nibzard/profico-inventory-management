import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Custom render function with providers
export function renderWithProviders(ui, { route = '/' } = {}) {
  window.history.pushState({}, 'Test page', route)
  
  return {
    user: userEvent.setup(),
    ...render(ui),
  }
}

// Mock localStorage
export const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
export const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock fetch API
global.fetch = jest.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
}

// Test data helpers
export const createMockUser = (overrides = {}) => ({
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'user',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const createMockEquipment = (overrides = {}) => ({
  id: '1',
  name: 'Test Equipment',
  category: 'Laptop',
  status: 'available',
  purchaseDate: new Date(),
  purchasePrice: 1000,
  currentValue: 800,
  description: 'Test equipment description',
  serialNumber: 'TEST123',
  location: 'Office',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})