"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("display_name") ?? "").trim();
  const demo = String(formData.get("demo") ?? "") === "1";

  const back = (params: Record<string, string>) => {
    const qs = new URLSearchParams(params);
    if (demo) qs.set("demo", "1");
    redirect(`/sign-up?${qs.toString()}`);
  };

  const supabase = await createClient();

  const { data: invited, error: inviteError } = await supabase.rpc(
    "is_email_invited",
    { check_email: email }
  );
  if (inviteError) {
    back({ error: "Signup is unavailable right now. Contact an admin." });
  }
  if (!invited) {
    back({ error: "This email hasn't been invited. Ask an admin to add you." });
  }

  const origin = (await headers()).get("origin") ?? "http://localhost:3000";
  const callbackQs = new URLSearchParams();
  if (demo) callbackQs.set("next", "/profiles?demo=1");
  const callbackSuffix = callbackQs.toString() ? `?${callbackQs.toString()}` : "";

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
      emailRedirectTo: `${origin}/auth/callback${callbackSuffix}`,
    },
  });

  if (error) {
    back({ error: error.message });
  }

  revalidatePath("/", "layout");
  back({ success: "1" });
}
