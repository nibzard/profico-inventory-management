import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { renderWithProviders } from '@/test-utils'

describe('Card', () => {
  it('renders card with all components', () => {
    renderWithProviders(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Card content</p>
        </CardContent>
        <CardFooter>
          <button>Footer Action</button>
        </CardFooter>
      </Card>
    )
    
    expect(screen.getByText('Test Title')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
    expect(screen.getByText('Card content')).toBeInTheDocument()
    expect(screen.getByText('Footer Action')).toBeInTheDocument()
  })

  it('renders card with minimal content', () => {
    renderWithProviders(
      <Card>
        <CardContent>Simple content</CardContent>
      </Card>
    )
    
    expect(screen.getByText('Simple content')).toBeInTheDocument()
  })
})