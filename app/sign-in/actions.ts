"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const demo = String(formData.get("demo") ?? "") === "1";

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    const params = new URLSearchParams({ error: error.message });
    if (demo) params.set("demo", "1");
    redirect(`/sign-in?${params.toString()}`);
  }

  revalidatePath("/", "layout");
  redirect(demo ? "/profiles?demo=1" : "/profiles");
}
