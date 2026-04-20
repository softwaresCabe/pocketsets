import { useQuery } from "@tanstack/react-query";
import type {
  Artist,
  ArtistWithSets,
  Announcement,
  Festival,
  SetWithDetails,
  Stage,
  StageWithSets,
  UserFavorite,
} from "@shared/schema";
import * as localDb from "./localDb";

export function useFestival() {
  return useQuery<Festival>({
    queryKey: ["/api/festival"],
    queryFn: () => localDb.getFestival(),
  });
}

export function useStages() {
  return useQuery<Stage[]>({
    queryKey: ["/api/stages"],
    queryFn: () => localDb.listStages(),
  });
}

export function useStage(id: string | undefined) {
  return useQuery<StageWithSets>({
    queryKey: ["/api/stages", id],
    queryFn: () => localDb.getStage(id!)!,
    enabled: !!id,
  });
}

export function useArtists() {
  return useQuery<Artist[]>({
    queryKey: ["/api/artists"],
    queryFn: () => localDb.listArtists(),
  });
}

export function useArtist(id: string | undefined) {
  return useQuery<ArtistWithSets>({
    queryKey: ["/api/artists", id],
    queryFn: () => localDb.getArtist(id!)!,
    enabled: !!id,
  });
}

export function useSets() {
  return useQuery<SetWithDetails[]>({
    queryKey: ["/api/sets"],
    queryFn: () => localDb.listSets(),
  });
}

export function useSet(id: string | undefined) {
  return useQuery<SetWithDetails>({
    queryKey: ["/api/sets", id],
    queryFn: () => localDb.getSet(id!)!,
    enabled: !!id,
  });
}

export function useFavorites() {
  return useQuery<UserFavorite[]>({
    queryKey: ["/api/favorites"],
    queryFn: () => localDb.listFavorites(),
  });
}

export function useAnnouncements() {
  return useQuery<Announcement[]>({
    queryKey: ["/api/announcements"],
    queryFn: () => localDb.listAnnouncements(),
  });
}

export function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["/api/settings"],
    queryFn: () => localDb.getSettings(),
  });
}
