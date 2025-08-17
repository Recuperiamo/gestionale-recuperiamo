import { render, screen } from '@testing-library/react'
import React from 'react';
describe('Sample test', () => {
  it('renders without crashing', () => {
    render(<div>Hello test</div>)
    expect(screen.getByText('Hello test')).toBeInTheDocument()
  })
})