import * as React from "react"
import { Input, InputProps } from "./input"

/**
 * FormInput - Input wrapper with automatic accessibility attributes
 * 
 * Automatically generates unique id and name attributes for form inputs
 * to improve browser autofill and screen reader support.
 * 
 * @example
 * <FormInput label="Peso Bruto" type="number" value={peso} />
 * // Generates: <Input id="peso-bruto" name="pesoBruto" ... />
 */
export interface FormInputProps extends InputProps {
    /** Optional label to auto-generate id from */
    label?: string;
}

const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
    ({ id, name, label, ...props }, ref) => {
        // Auto-generate id/name if not provided
        const autoId = React.useMemo(() => {
            if (id) return id;
            if (name) return name;
            if (label) {
                // Convert "Peso Bruto" -> "peso-bruto"
                return label.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            }
            // Fallback to random if nothing provided
            return `input-${Math.random().toString(36).slice(2, 9)}`;
        }, [id, name, label]);

        const autoName = React.useMemo(() => {
            if (name) return name;
            if (id) return id;
            if (label) {
                // Convert "Peso Bruto" -> "pesoBruto"
                return label
                    .split(/\s+/)
                    .map((word, i) =>
                        i === 0
                            ? word.toLowerCase()
                            : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    )
                    .join('')
                    .replace(/[^a-zA-Z0-9]/g, '');
            }
            return autoId;
        }, [id, name, label, autoId]);

        return (
            <Input
                ref={ref}
                id={autoId}
                name={autoName}
                {...props}
            />
        );
    }
);

FormInput.displayName = "FormInput";

export { FormInput };
