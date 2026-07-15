import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-background dark:focus-visible:ring-primary/40",
    {
        variants: {
            variant: {
                default: "bg-gradient-to-br from-orange-600 to-amber-600 text-primary-foreground shadow-md shadow-orange-600/20 hover:brightness-110 dark:bg-none dark:border dark:border-primary/25 dark:bg-primary/20 dark:text-primary-foreground dark:shadow-sm dark:shadow-primary/10 dark:hover:bg-primary/30",
                destructive:
                    "bg-destructive text-destructive-foreground hover:bg-destructive/90 dark:bg-destructive/20 dark:text-red-200 dark:border dark:border-destructive/30 dark:hover:bg-destructive/30",
                outline:
                    "border border-white/70 bg-white/55 shadow-sm backdrop-blur hover:bg-white/80 hover:text-accent-foreground dark:bg-white/[0.03] dark:border-white/[0.08] dark:hover:bg-white/[0.07] dark:hover:text-white",
                secondary:
                    "bg-secondary text-secondary-foreground hover:bg-secondary/80 dark:bg-white/[0.05] dark:text-white/70 dark:border dark:border-white/[0.07] dark:hover:bg-white/[0.08] dark:hover:text-white",
                ghost: "hover:bg-accent hover:text-accent-foreground dark:text-white/55 dark:hover:bg-white/[0.06] dark:hover:text-white",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-xl px-3",
                lg: "h-11 rounded-xl px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button";

        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        );
    }
);
Button.displayName = "Button";

export { Button, buttonVariants };
