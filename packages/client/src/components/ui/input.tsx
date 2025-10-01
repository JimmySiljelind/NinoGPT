import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<
   HTMLInputElement,
   React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
   <input
      ref={ref}
      type={type}
      className={cn(
         'flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:cursor-not-allowed disabled:opacity-50',
         className
      )}
      {...props}
   />
));
Input.displayName = 'Input';

export { Input };
