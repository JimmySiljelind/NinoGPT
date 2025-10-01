import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';

import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type RenameDialogProps = {
   open: boolean;
   title: string;
   description?: string;
   initialValue: string;
   confirmLabel?: string;
   isSubmitting?: boolean;
   error?: string | null;
   onSubmit: (value: string) => Promise<void> | void;
   onCancel: () => void;
};

export function RenameDialog({
   open,
   title,
   description,
   initialValue,
   confirmLabel = 'Save changes',
   isSubmitting = false,
   error,
   onSubmit,
   onCancel,
}: RenameDialogProps) {
   const [value, setValue] = useState(initialValue);
   const inputId = useId();

   useEffect(() => {
      if (open) {
         setValue(initialValue);
      }
   }, [initialValue, open]);

   const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (isSubmitting) {
         return;
      }

      await onSubmit(value);
   };

   return (
      <Dialog
         open={open}
         onOpenChange={(nextOpen) => {
            if (!nextOpen) {
               onCancel();
            }
         }}
      >
         <DialogContent className="gap-6">
            <form onSubmit={handleSubmit} className="space-y-6">
               <DialogHeader>
                  <DialogTitle>{title}</DialogTitle>
                  {description ? (
                     <DialogDescription>{description}</DialogDescription>
                  ) : null}
               </DialogHeader>
               <div className="space-y-2">
                  <label
                     htmlFor={inputId}
                     className="block text-sm font-medium text-foreground"
                  >
                     Name
                  </label>
                  <Input
                     id={inputId}
                     value={value}
                     onChange={(event) => setValue(event.target.value)}
                     placeholder="Enter a new name"
                     autoFocus
                     disabled={isSubmitting}
                     className="focus:outline-none focus:ring-0 focus:ring-offset-0 focus:border-neutral-300"
                  />
                  {error ? (
                     <p className="text-sm text-destructive">{error}</p>
                  ) : null}
               </div>
               <DialogFooter>
                  <Button
                     type="button"
                     variant="ghost"
                     onClick={onCancel}
                     disabled={isSubmitting}
                  >
                     Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                     {isSubmitting ? 'Saving...' : confirmLabel}
                  </Button>
               </DialogFooter>
            </form>
         </DialogContent>
      </Dialog>
   );
}
