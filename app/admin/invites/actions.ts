"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return { ok: false as const, error: "Admins only." };
  }
  return { ok: true as const, supabase, userId: user.id };
}

function backWith(params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/admin/invites?${qs}`);
}

export async function addInvite(formData: FormData) {
  const guard = await assertAdmin();
  if (!guard.ok) backWith({ error: guard.error });

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email.includes("@")) {
    backWith({ error: "That doesn't look like an email." });
  }

  const { error } = await guard.supabase
    .from("invited_emails")
    .insert({ email, added_by: guard.userId });

  if (error) {
    if (error.code === "23505") backWith({ error: "Already invited." });
    backWith({ error: error.message });
  }

  revalidatePath("/admin/invites");
  backWith({ added: email });
}

export async function removeInvite(formData: FormData) {
  const guard = await assertAdmin();
  if (!guard.ok) backWith({ error: guard.error });

  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  const { error } = await guard.supabase
    .from("invited_emails")
    .delete()
    .eq("email", email);

  if (error) backWith({ error: error.message });

  revalidatePath("/admin/invites");
  backWith({ removed: email });
}
