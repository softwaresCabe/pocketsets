import { useMutation } from "@tanstack/react-query";
import { queryClient } from "./queryClient";
import * as localDb from "./localDb";

function invalidateAll() {
  queryClient.invalidateQueries({ queryKey: ["/api/favorites"] });
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/sets" });
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/artists" });
  queryClient.invalidateQueries({ predicate: (q) => q.queryKey[0] === "/api/stages" });
}

export function useToggleFavorite() {
  return useMutation({
    mutationFn: async ({ setId, isFavorite }: { setId: string; isFavorite: boolean }) => {
      if (isFavorite) {
        localDb.removeFavorite(setId);
      } else {
        localDb.addFavorite(setId, null);
      }
    },
    onSuccess: invalidateAll,
  });
}

export function useUpdateFavoriteLeadTime() {
  return useMutation({
    mutationFn: async ({
      setId,
      customLeadTimeMinutes,
    }: {
      setId: string;
      customLeadTimeMinutes: number | null;
    }) => {
      localDb.updateFavoriteLeadTime(setId, customLeadTimeMinutes);
    },
    onSuccess: invalidateAll,
  });
}

export function useUpdateSetting() {
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      localDb.setSetting(key, value);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });
}

export function useResetDemo() {
  return useMutation({
    mutationFn: async () => {
      localDb.resetDemo();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
    },
  });
}
