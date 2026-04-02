import * as React from "react"

export type CardProps = React.HTMLAttributes<HTMLDivElement>;

const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`bg-white rounded-xl border border-[#dbdbdb] overflow-hidden shadow-sm ${className}`}
            {...props}
        />
    )
)
Card.displayName = "Card"

const CardHeader = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`px-6 py-4 border-b border-[#efefef] bg-white ${className}`}
            {...props}
        />
    )
)
CardHeader.displayName = "CardHeader"

const CardTitle = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', ...props }, ref) => (
        <h2
            ref={ref}
            className={`text-base font-bold text-[#262626] flex items-center gap-2 ${className}`}
            {...props}
        />
    )
)
CardTitle.displayName = "CardTitle"

const CardDescription = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', ...props }, ref) => (
        <p
            ref={ref}
            className={`text-xs text-[#8e8e8e] mt-0.5 ${className}`}
            {...props}
        />
    )
)
CardDescription.displayName = "CardDescription"

const CardContent = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`p-6 ${className}`}
            {...props}
        />
    )
)
CardContent.displayName = "CardContent"

const CardFooter = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className = '', ...props }, ref) => (
        <div
            ref={ref}
            className={`px-6 py-4 border-t border-[#efefef] ${className}`}
            {...props}
        />
    )
)
CardFooter.displayName = "CardFooter"

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
