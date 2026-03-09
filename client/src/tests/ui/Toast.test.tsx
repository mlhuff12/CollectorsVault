import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Toast from '../../components/Toast';

describe('Toast', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders message and is accessible via role="alert"', () => {
        const onDismiss = vi.fn();
        render(<Toast message="Item saved!" onDismiss={onDismiss} />);

        expect(screen.getByRole('alert')).toBeInTheDocument();
        expect(screen.getByText('Item saved!')).toBeInTheDocument();
    });

    it('renders nothing when message is empty', () => {
        const onDismiss = vi.fn();
        const { container } = render(<Toast message="" onDismiss={onDismiss} />);
        expect(container.firstChild).toBeNull();
    });

    it('calls onDismiss after the default duration', () => {
        const onDismiss = vi.fn();
        render(<Toast message="Test" onDismiss={onDismiss} />);

        expect(onDismiss).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(3000);
        });

        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss with custom duration', () => {
        const onDismiss = vi.fn();
        render(<Toast message="Test" duration={1000} onDismiss={onDismiss} />);

        act(() => {
            vi.advanceTimersByTime(999);
        });
        expect(onDismiss).not.toHaveBeenCalled();

        act(() => {
            vi.advanceTimersByTime(1);
        });
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when close button is clicked', () => {
        const onDismiss = vi.fn();
        render(<Toast message="Close me" onDismiss={onDismiss} />);

        fireEvent.click(screen.getByLabelText('Close'));
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('applies success background class by default', () => {
        const onDismiss = vi.fn();
        render(<Toast message="Done" onDismiss={onDismiss} />);

        expect(screen.getByRole('alert').querySelector('.bg-success')).toBeInTheDocument();
    });

    it('applies error background class for type="error"', () => {
        const onDismiss = vi.fn();
        render(<Toast message="Oops" type="error" onDismiss={onDismiss} />);

        expect(screen.getByRole('alert').querySelector('.bg-danger')).toBeInTheDocument();
    });

    it('applies warning background class for type="warning"', () => {
        const onDismiss = vi.fn();
        render(<Toast message="Watch out" type="warning" onDismiss={onDismiss} />);

        expect(screen.getByRole('alert').querySelector('.bg-warning')).toBeInTheDocument();
    });
});
