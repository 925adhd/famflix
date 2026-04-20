"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, publicUrlFor } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";

function back(params: Record<string, string>): never {
  const qs = new URLSearchParams(params).toString();
  redirect(`/profile?${qs}`);
}

export async function updateDisplayName(formData: FormData) {
  const name = String(formData.get("display_name") ?? "").trim();
  if (!name) back({ error: "Display name can't be empty." });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) back({ error: "Not signed in." });

  const { error } = await supabase
    .from("profiles")
    .update({ display_name: name })
    .eq("id", user.id);

  if (error) back({ error: error.message });

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  back({ saved: "1" });
}

type SignedAvatarResult =
  | { ok: true; uploadUrl: string; publicUrl: string }
  | { ok: false; error: string };

export async function createSignedAvatarUpload(
  contentType: string
): Promise<SignedAvatarResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  if (!contentType.startsWith("image/")) {
    return { ok: false, error: "Avatar must be an image." };
  }

  const ext = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const objectKey = `avatars/${user.id}/${randomUUID()}.${ext}`;

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 10 }
  );

  return {
    ok: true,
    uploadUrl,
    publicUrl: publicUrlFor(objectKey),
  };
}

export async function setAvatarUrl(avatarUrl: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl })
    .eq("id", user.id);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath("/profile");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
