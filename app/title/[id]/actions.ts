"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveWatchProgress(
  titleId: string,
  positionSeconds: number,
  completed: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const safePosition = Math.max(0, Math.floor(positionSeconds));

  const { data: existing } = await supabase
    .from("watch_history")
    .select("id")
    .eq("profile_id", user.id)
    .eq("title_id", titleId)
    .is("episode_id", null)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("watch_history")
      .update({
        position_seconds: safePosition,
        completed,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await supabase.from("watch_history").insert({
      profile_id: user.id,
      title_id: titleId,
      position_seconds: safePosition,
      completed,
    });
    if (error) return { ok: false as const, error: error.message };
  }

  return { ok: true as const };
}
