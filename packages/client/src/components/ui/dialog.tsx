﻿import * as React from 'react';
import { X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

import { cn } from '@/lib/utils';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Overlay>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
   <DialogPrimitive.Overlay
      ref={ref}
      className={cn(
         'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 dark:bg-background/75',
         className
      )}
      {...props}
   />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Content>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
   <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
         ref={ref}
         className={cn(
            'fixed left-1/2 top-1/2 z-50 grid w-full max-w-md -translate-x-1/2 -translate-y-1/2 gap-5 rounded-xl border border-border/60 bg-popover p-6 text-popover-foreground shadow-2xl outline-none transition-all data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 sm:max-w-lg',
            className
         )}
         {...props}
      >
         {children}
         <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2 cursor-pointer">
            <X className="size-5" aria-hidden />
            <span className="sr-only">Close</span>
         </DialogPrimitive.Close>
      </DialogPrimitive.Content>
   </DialogPortal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
   className,
   ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
   <div
      className={cn('flex flex-col space-y-1.5 text-left', className)}
      {...props}
   />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
   className,
   ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
   <div
      className={cn(
         'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3',
         className
      )}
      {...props}
   />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Title>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
   <DialogPrimitive.Title
      ref={ref}
      className={cn(
         'text-lg font-semibold leading-none tracking-tight text-foreground',
         className
      )}
      {...props}
   />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
   React.ElementRef<typeof DialogPrimitive.Description>,
   React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
   <DialogPrimitive.Description
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
   />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
   Dialog,
   DialogPortal,
   DialogOverlay,
   DialogTrigger,
   DialogContent,
   DialogHeader,
   DialogFooter,
   DialogTitle,
   DialogDescription,
   DialogClose,
};
