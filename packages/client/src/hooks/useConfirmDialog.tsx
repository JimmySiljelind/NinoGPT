import { useCallback, useRef, useState } from 'react';

import { ConfirmDialog } from '@/components/ui/confirm-dialog';

type ConfirmDialogVariant = 'default' | 'destructive';

export type ConfirmDialogOptions = {
   title: string;
   description?: string;
   confirmLabel?: string;
   cancelLabel?: string;
   variant?: ConfirmDialogVariant;
};

type ConfirmDialogState = ConfirmDialogOptions & {
   resolve: (value: boolean) => void;
};

export function useConfirmDialog(defaults?: Partial<ConfirmDialogOptions>) {
   const [state, setState] = useState<ConfirmDialogState | null>(null);
   const skipCancelRef = useRef(false);

   const confirm = useCallback(
      (options: ConfirmDialogOptions) =>
         new Promise<boolean>((resolve) => {
            setState({
               ...(defaults ?? {}),
               ...options,
               resolve,
            });
         }),
      [defaults]
   );

   const handleCancel = useCallback(() => {
      if (skipCancelRef.current) {
         skipCancelRef.current = false;
         return;
      }

      if (state) {
         state.resolve(false);
      }

      setState(null);
   }, [state]);

   const handleConfirm = useCallback(() => {
      if (!state) {
         return;
      }

      skipCancelRef.current = true;
      state.resolve(true);
      setState(null);
   }, [state]);

   const confirmationDialog = (
      <ConfirmDialog
         open={Boolean(state)}
         title={state?.title ?? defaults?.title ?? ''}
         description={state?.description ?? defaults?.description}
         confirmLabel={
            state?.confirmLabel ?? defaults?.confirmLabel ?? 'Confirm'
         }
         cancelLabel={state?.cancelLabel ?? defaults?.cancelLabel ?? 'Cancel'}
         variant={state?.variant ?? defaults?.variant ?? 'default'}
         onCancel={handleCancel}
         onConfirm={handleConfirm}
      />
   );

   return { confirm, ConfirmationDialog: confirmationDialog };
}
