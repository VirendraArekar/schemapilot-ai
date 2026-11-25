import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { LandingPage } from './LandingPage';

describe('LandingPage', () => {
  it('renders SchemaPilot AI hero and primary actions', () => {
    render(
      <MemoryRouter>
        <LandingPage />
      </MemoryRouter>,
    );
    expect(screen.getByText(/Design Production Database Schemas/i)).toBeInTheDocument();
    expect(screen.getByText(/Launch Schema Studio/i)).toBeInTheDocument();
    expect(screen.getByText(/Try Interactive ER Designer/i)).toBeInTheDocument();
  });
});
