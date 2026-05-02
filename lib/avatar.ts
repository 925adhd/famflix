import { createAvatar } from "@dicebear/core";
import { funEmoji } from "@dicebear/collection";

const cache = new Map<string, string>();

// Curated seeds for the "pick a default" grid. The fun-emoji style is
// deterministic per seed, so these always render the same emoji combo.
export const DEFAULT_AVATAR_SEEDS = [
  "Lily",
  "Buddy",
  "Coco",
  "Daisy",
  "Echo",
  "Felix",
  "Goose",
  "Honey",
  "Ivy",
  "Jasper",
  "Kit",
  "Luna",
] as const;

const DICEBEAR_PREFIX = "dicebear:";

export function defaultAvatarUrl(seed: string): string {
  const cached = cache.get(seed);
  if (cached) return cached;
  const svg = createAvatar(funEmoji, { seed }).toString();
  const b64 = Buffer.from(svg).toString("base64");
  const url = `data:image/svg+xml;base64,${b64}`;
  cache.set(seed, url);
  return url;
}

export function defaultAvatarValue(seed: string): string {
  return `${DICEBEAR_PREFIX}${seed}`;
}

export function avatarUrlFor(profile: {
  id: string;
  avatar_url?: string | null;
}): string {
  const v = profile.avatar_url;
  if (!v) return defaultAvatarUrl(profile.id);
  if (v.startsWith(DICEBEAR_PREFIX)) {
    return defaultAvatarUrl(v.slice(DICEBEAR_PREFIX.length));
  }
  return v;
}
