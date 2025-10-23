import { Button } from '@/components/ui/button';
import {
   Dialog,
   DialogContent,
   DialogDescription,
   DialogFooter,
   DialogHeader,
   DialogTitle,
} from '@/components/ui/dialog';

type ConfirmDialogProps = {
   open: boolean;
   title: string;
   description?: string;
   confirmLabel?: string;
   cancelLabel?: string;
   variant?: 'default' | 'destructive';
   onConfirm: () => void;
   onCancel: () => void;
};

export function ConfirmDialog({
   open,
   title,
   description,
   confirmLabel = 'Confirm',
   cancelLabel = 'Cancel',
   variant = 'default',
   onConfirm,
   onCancel,
}: ConfirmDialogProps) {
   return (
      <Dialog
         open={open}
         onOpenChange={(nextOpen) => {
            if (!nextOpen) {
               onCancel();
            }
         }}
      >
         <DialogContent className="gap-4">
            <DialogHeader>
               <DialogTitle>{title}</DialogTitle>
               {description ? (
                  <DialogDescription>{description}</DialogDescription>
               ) : null}
            </DialogHeader>
            <DialogFooter>
               <Button type="button" variant="outline" onClick={onCancel}>
                  {cancelLabel}
               </Button>
               <Button
                  type="button"
                  variant={
                     variant === 'destructive' ? 'destructive' : 'default'
                  }
                  onClick={onConfirm}
               >
                  {confirmLabel}
               </Button>
            </DialogFooter>
         </DialogContent>
      </Dialog>
   );
}
