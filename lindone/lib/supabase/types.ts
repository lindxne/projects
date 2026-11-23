import type { Database } from "./database.types";

type PublicSchema = Database["public"];

export type Release = Omit<PublicSchema["Tables"]["releases"]["Row"], "fts" | "type" | "links"> & {
  type: ReleaseType;
  links: ReleaseLinks;
};
export type Track = Omit<PublicSchema["Tables"]["tracks"]["Row"], "fts">;
export type Post = Omit<PublicSchema["Tables"]["posts"]["Row"], "fts" | "media_type" | "tags"> & {
  media_type: MediaType;
  tags: PostTag[];
};

export type ReleaseInsert = PublicSchema["Tables"]["releases"]["Insert"];
export type TrackInsert = PublicSchema["Tables"]["tracks"]["Insert"];
export type PostInsert = PublicSchema["Tables"]["posts"]["Insert"];

export type SearchResult = PublicSchema["Functions"]["search_all"]["Returns"][number];
export type MemoryItem = PublicSchema["Functions"]["on_this_day"]["Returns"][number];

export const RELEASE_TYPES = ["single", "mixtape", "album"] as const;
export type ReleaseType = (typeof RELEASE_TYPES)[number];

export const RELEASE_TYPE_LABEL: Record<ReleaseType, string> = {
  single: "Сингл",
  mixtape: "Микстейп",
  album: "Альбом",
};

export const RELEASE_TYPE_LABEL_PLURAL: Record<ReleaseType, string> = {
  single: "Синглы",
  mixtape: "Микстейпы",
  album: "Альбомы",
};

export function isReleaseType(value: unknown): value is ReleaseType {
  return typeof value === "string" && (RELEASE_TYPES as readonly string[]).includes(value);
}

export const STREAMING_SERVICES = ["spotify", "apple", "youtube", "bandcamp"] as const;
export type StreamingService = (typeof STREAMING_SERVICES)[number];
export type ReleaseLinks = Partial<Record<StreamingService, string>>;

export const STREAMING_LABEL: Record<StreamingService, string> = {
  spotify: "Spotify",
  apple: "Apple Music",
  youtube: "YouTube",
  bandcamp: "Bandcamp",
};

export type MediaType = "photo" | "video";

export const POST_TAGS = ["studio", "live", "demo", "reference", "vibe"] as const;
export type PostTag = (typeof POST_TAGS)[number];

export const POST_TAG_LABEL: Record<PostTag, string> = {
  studio: "студия",
  live: "лайв",
  demo: "демо",
  reference: "референс",
  vibe: "вайб",
};

export function isPostTag(value: unknown): value is PostTag {
  return typeof value === "string" && (POST_TAGS as readonly string[]).includes(value);
}

/** Columns selected everywhere a full row is needed (everything except the tsvector). */
export const RELEASE_COLUMNS = "id,type,title,cover_url,description,release_date,links,created_at";
export const TRACK_COLUMNS =
  "id,release_id,title,audio_url,duration_sec,track_number,bpm,musical_key,created_at";
export const POST_COLUMNS =
  "id,media_url,media_type,poster_url,caption,tags,track_id,release_id,width,height,duration_sec,created_at";

function parseLinks(value: unknown): ReleaseLinks {
  const links: ReleaseLinks = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const service of STREAMING_SERVICES) {
      const url = (value as Record<string, unknown>)[service];
      if (typeof url === "string" && url.length > 0) links[service] = url;
    }
  }
  return links;
}

type ReleaseRow = Omit<PublicSchema["Tables"]["releases"]["Row"], "fts">;
type PostRow = Omit<PublicSchema["Tables"]["posts"]["Row"], "fts">;

export function toRelease(row: ReleaseRow): Release {
  return {
    ...row,
    type: isReleaseType(row.type) ? row.type : "single",
    links: parseLinks(row.links),
  };
}

export function toPost(row: PostRow): Post {
  return {
    ...row,
    media_type: row.media_type === "video" ? "video" : "photo",
    tags: row.tags.filter(isPostTag),
  };
}
