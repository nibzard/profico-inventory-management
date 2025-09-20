import { render, screen } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { renderWithProviders } from '@/test-utils'

describe('Button', () => {
  it('renders button with text', () => {
    renderWithProviders(<Button>Click me</Button>)
    
    const button = screen.getByRole('button', { name: /click me/i })
    expect(button).toBeInTheDocument()
  })

  it('applies variant styles', () => {
    renderWithProviders(<Button variant="destructive">Delete</Button>)
    
    const button = screen.getByRole('button', { name: /delete/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('data-variant', 'destructive')
  })

  it('handles click events', async () => {
    const handleClick = jest.fn()
    const { user } = renderWithProviders(
      <Button onClick={handleClick}>Click me</Button>
    )
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('can be disabled', () => {
    renderWithProviders(<Button disabled>Disabled</Button>)
    
    const button = screen.getByRole('button', { name: /disabled/i })
    expect(button).toBeDisabled()
  })
})