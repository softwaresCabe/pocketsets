import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToggleFavorite } from "./mutations";

/**
 * Wraps useToggleFavorite with a confirmation step when removing.
 * Returns `trigger(setId, isFavorite)` — call it instead of mutate directly.
 * Render `dialog` somewhere in your component tree.
 */
export function useFavoriteToggle() {
  const mutate = useToggleFavorite();
  const [pending, setPending] = React.useState<string | null>(null);

  const trigger = React.useCallback((setId: string, isFavorite: boolean) => {
    if (isFavorite) {
      setPending(setId);
    } else {
      mutate.mutate({ setId, isFavorite: false });
    }
  }, [mutate]);

  const dialog = (
    <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from My Sets?</AlertDialogTitle>
          <AlertDialogDescription>
            This set will be removed from your lineup. You can always add it back from the schedule.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Keep it</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (pending) mutate.mutate({ setId: pending, isFavorite: true });
              setPending(null);
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { trigger, dialog, isPending: mutate.isPending };
}
