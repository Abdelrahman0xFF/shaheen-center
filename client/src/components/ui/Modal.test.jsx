import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

function Demo({ open, onClose }) {
    return (
        <Modal open={open} onClose={onClose} title="عنوان">
            <button type="button">inside</button>
        </Modal>
    );
}

describe('Modal', () => {
    it('locks body scroll while open and releases it on close', () => {
        document.body.style.overflow = '';
        const { rerender } = render(<Demo open={false} onClose={() => {}} />);
        expect(document.body.style.overflow).toBe('');

        rerender(<Demo open={true} onClose={() => {}} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(document.body.style.overflow).toBe('hidden');

        rerender(<Demo open={false} onClose={() => {}} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(document.body.style.overflow).toBe('');
    });

    it('close button triggers onClose', () => {
        const onClose = vi.fn();
        render(<Demo open={true} onClose={onClose} />);
        fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
        expect(onClose).toHaveBeenCalled();
    });
});
