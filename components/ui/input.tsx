import * as React from "react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    error?: boolean;
    success?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className = '', error = false, success = false, type, ...props }, ref) => {
        const baseClasses = "w-full px-2 py-6 text-base font-[600] rounded-[14px] focus:outline-none transition-all placeholder-slate-400"

        const stateClasses = error
            ? "bg-red-50 text-red-900 border-2 border-red-200 focus:border-red-400 focus:shadow-lg"
            : success
                ? "bg-green-50 text-green-900 border-2 border-green-200 focus:border-green-400 focus:shadow-lg"
                : "bg-gradient-to-r from-slate-50 to-blue-50/30 text-slate-900 border-2 border-slate-200 focus:border-blue-400 focus:shadow-lg hover:border-slate-300"

        const shadowStyle = error
            ? { boxShadow: '0 4px 10px -2px rgba(239, 68, 68, 0.15)' }
            : success
                ? { boxShadow: '0 4px 10px -2px rgba(34, 197, 94, 0.15)' }
                : { boxShadow: '0 4px 10px -2px rgba(59, 130, 246, 0.1)' }

        return (
            <input
                type={type}
                className={`${baseClasses} ${stateClasses} ${className}`}
                style={shadowStyle}
                ref={ref}
                {...props}
            />
        )
    }
)
Input.displayName = "Input"

export { Input }
