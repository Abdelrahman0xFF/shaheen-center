import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSafeSubmit } from './useSafeSubmit';

function Probe({ action }) {
    const { submitting, submit } = useSafeSubmit();
    return (
        <div>
            <span data-testid="submitting">{String(submitting)}</span>
            <button
                onClick={async () => {
                    const result = await submit(action);
                    return result;
                }}
            >
                go
            </button>
        </div>
    );
}

describe('useSafeSubmit', () => {
    it('ignores concurrent duplicate submissions and resets submitting after failure', async () => {
        let reject;
        const action = vi.fn(() => new Promise((_r, j) => (reject = j)));

        render(<Probe action={action} />);

        fireEvent.click(screen.getByText('go'));
        fireEvent.click(screen.getByText('go'));
        fireEvent.click(screen.getByText('go'));

        expect(action).toHaveBeenCalledTimes(1);
        expect(screen.getByTestId('submitting')).toHaveTextContent('true');

        reject(new Error('boom'));
        await waitFor(() => expect(screen.getByTestId('submitting')).toHaveTextContent('false'));
        // failure is returned, not thrown
        expect(action).toHaveBeenCalledTimes(1);
    });
});
