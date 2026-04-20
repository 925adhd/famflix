"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();

  const supabase = await createClient();

  const { data: invited, error: inviteError } = await supabase.rpc(
    "is_email_invited",
    { check_email: email }
  );
  if (inviteError) {
    redirect(
      `/sign-up?error=${encodeURIComponent("Signup is unavailable right now. Contact an admin.")}`
    );
  }
  if (!invited) {
    redirect(
      `/sign-up?error=${encodeURIComponent("This email hasn't been invited. Ask an admin to add you.")}`
    );
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/sign-up?success=1");
}
