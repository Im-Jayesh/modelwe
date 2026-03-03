import { useState, useEffect } from "react";

export default function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Set a timer to update the debounced value after the delay
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cancel the timeout if value changes (also on delay change or unmount)
        // This is how we prevent it from saving on every single keystroke!
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}