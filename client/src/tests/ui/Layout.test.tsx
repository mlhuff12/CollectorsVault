import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { ColorModeProvider } from '../../contexts/ColorModeContext';

// a simple dummy component to render inside layout
const Dummy: React.FC = () => <div>dummy content</div>;

describe('Layout', () => {
  it('renders header with logo and title', () => {
    render(
      <MemoryRouter>
        <ColorModeProvider>
          <Layout>
            <Dummy />
          </Layout>
        </ColorModeProvider>
      </MemoryRouter>
    );
    expect(screen.getByText("Collector's Vault")).toBeInTheDocument();
    // logo is an avatar with vc text
    expect(screen.getByText('vc')).toBeInTheDocument();
  });

  it('opens drawer when logo clicked', () => {
    render(
      <MemoryRouter>
        <ColorModeProvider>
          <Layout>
            <Dummy />
          </Layout>
        </ColorModeProvider>
      </MemoryRouter>
    );
    const logo = screen.getByText('vc');
    fireEvent.click(logo);
    // drawer items should appear
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Books')).toBeInTheDocument();
  });

  it('shows profile menu when avatar clicked and allows updating names', () => {
    render(
      <MemoryRouter>
        <ColorModeProvider>
          <Layout>
            <Dummy />
          </Layout>
        </ColorModeProvider>
      </MemoryRouter>
    );
    // avatar button exists
    const avatarButton = screen.getByRole('button', { name: /user profile/i });
    fireEvent.click(avatarButton);
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Smith' } });
    // close menu by clicking outside
    fireEvent.click(document.body);
    // avatar should now show initials
    expect(screen.getByText('AS')).toBeInTheDocument();
  });
});
