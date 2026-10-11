import type { ProfileView } from "../lib/goals";

/** npubの短縮表示 */
export function shortKey(pubkey: string): string {
  return `${pubkey.slice(0, 8)}…${pubkey.slice(-4)}`;
}

/** 表示名 (プロフィール名 or 短縮pubkey) */
export function displayName(profiles: Map<string, ProfileView>, pubkey: string): string {
  return profiles.get(pubkey)?.name ?? shortKey(pubkey);
}

/** アイコン画像 URL (なければ undefined) */
export function avatarImage(profiles: Map<string, ProfileView>, pubkey: string): string | undefined {
  return profiles.get(pubkey)?.image;
}
