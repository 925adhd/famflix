import { createClient } from "@/lib/supabase/server";

const GB = 1024 * 1024 * 1024;

export function storageCapBytes(): number {
  const gb = Number(process.env.R2_STORAGE_CAP_GB ?? "9");
  return Math.max(0, gb) * GB;
}

export type StorageUsage = {
  usedBytes: number;
  capBytes: number;
  remainingBytes: number;
  percentUsed: number;
};

export async function getStorageUsage(): Promise<StorageUsage> {
  const supabase = await createClient();
  const capBytes = storageCapBytes();

  const [titles, episodes] = await Promise.all([
    supabase.from("titles").select("file_size_bytes"),
    supabase.from("episodes").select("file_size_bytes"),
  ]);

  const sum = (rows: { file_size_bytes: number | null }[] | null) =>
    (rows ?? []).reduce((acc, r) => acc + (r.file_size_bytes ?? 0), 0);

  const usedBytes = sum(titles.data) + sum(episodes.data);
  const remainingBytes = Math.max(0, capBytes - usedBytes);
  const percentUsed = capBytes === 0 ? 100 : (usedBytes / capBytes) * 100;

  return { usedBytes, capBytes, remainingBytes, percentUsed };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < GB) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / GB).toFixed(2)} GB`;
}
