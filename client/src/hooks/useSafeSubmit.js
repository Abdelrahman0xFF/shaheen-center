import { useCallback, useRef, useState } from 'react';

/**
 * Prevents duplicate simultaneous submissions and always resets submitting.
 * Returns `submit(action)`; it never rethrows — callers receive `{ error }`.
 */
export function useSafeSubmit() {
    const inFlight = useRef(false);
    const [submitting, setSubmitting] = useState(false);

    const submit = useCallback(async (action) => {
        if (inFlight.current) return { submitted: false };
        inFlight.current = true;
        setSubmitting(true);
        try {
            await action();
            return { submitted: true };
        } catch (error) {
            return { submitted: true, error };
        } finally {
            inFlight.current = false;
            setSubmitting(false);
        }
    }, []);

    return { submitting, submit };
}
