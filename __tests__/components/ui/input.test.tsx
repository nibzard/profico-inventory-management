import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Input } from '@/components/ui/input'
import { renderWithProviders } from '@/test-utils'

describe('Input', () => {
  it('renders input field', () => {
    renderWithProviders(<Input placeholder="Enter text" />)
    
    const input = screen.getByPlaceholderText(/enter text/i)
    expect(input).toBeInTheDocument()
    expect(input).toHaveAttribute('placeholder', 'Enter text')
  })

  it('handles value changes', async () => {
    const handleChange = jest.fn()
    const { user } = renderWithProviders(
      <Input 
        placeholder="Test input" 
        onChange={handleChange}
        value=""
      />
    )
    
    const input = screen.getByPlaceholderText(/test input/i)
    await user.type(input, 'hello')
    
    expect(handleChange).toHaveBeenCalledTimes(5) // Once for each character
  })

  it('accepts different input types', () => {
    renderWithProviders(<Input type="email" placeholder="Email" />)
    
    const input = screen.getByPlaceholderText(/email/i)
    expect(input).toHaveAttribute('type', 'email')
  })

  it('can be disabled', () => {
    renderWithProviders(<Input disabled placeholder="Disabled" />)
    
    const input = screen.getByPlaceholderText(/disabled/i)
    expect(input).toBeDisabled()
  })

  it('applies custom className', () => {
    renderWithProviders(<Input className="custom-class" />)
    
    const input = screen.getByRole('textbox')
    expect(input).toHaveClass('custom-class')
  })
})