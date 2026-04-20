"use server";

import { randomUUID } from "crypto";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { r2, R2_BUCKET, publicUrlFor } from "@/lib/r2";
import { createClient } from "@/lib/supabase/server";
import { findBestMatch } from "@/lib/tmdb";
import { revalidatePath } from "next/cache";

type SignedUploadResult =
  | { ok: true; uploadUrl: string; objectKey: string; publicUrl: string }
  | { ok: false; error: string };

export async function createSignedUpload(
  filename: string,
  contentType: string
): Promise<SignedUploadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || (profile.role !== "admin" && profile.role !== "uploader")) {
    return { ok: false, error: "You don't have permission to upload." };
  }

  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  const objectKey = `uploads/${user.id}/${randomUUID()}-${safeName}`;

  const uploadUrl = await getSignedUrl(
    r2,
    new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: objectKey,
      ContentType: contentType,
    }),
    { expiresIn: 60 * 60 }
  );

  return {
    ok: true,
    uploadUrl,
    objectKey,
    publicUrl: publicUrlFor(objectKey),
  };
}

type CreateTitleInput = {
  name: string;
  year: number | null;
  kind: "movie" | "show";
  overview: string | null;
  objectKey: string;
  durationSeconds: number | null;
};

export async function createTitle(input: CreateTitleInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const match = await findBestMatch(input.name, input.kind, input.year).catch(
    () => null
  );

  const { data, error } = await supabase
    .from("titles")
    .insert({
      name: input.name,
      year: input.year ?? match?.year ?? null,
      kind: input.kind,
      overview: input.overview ?? match?.overview ?? null,
      poster_url: match?.posterUrl ?? null,
      backdrop_url: match?.backdropUrl ?? null,
      tmdb_id: match?.tmdbId ?? null,
      r2_object_key: input.objectKey,
      duration_seconds: input.durationSeconds,
      uploaded_by: user.id,
      status: "ready",
    })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const, titleId: data.id };
}

export async function refetchMetadata(titleId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Not signed in." };

  const { data: existing } = await supabase
    .from("titles")
    .select("name, year, kind, uploaded_by")
    .eq("id", titleId)
    .single();
  if (!existing) return { ok: false as const, error: "Title not found." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const canEdit =
    existing.uploaded_by === user.id || profile?.role === "admin";
  if (!canEdit) return { ok: false as const, error: "Not allowed." };

  const match = await findBestMatch(
    existing.name,
    existing.kind as "movie" | "show",
    existing.year
  ).catch(() => null);

  if (!match) return { ok: false as const, error: "No match found on TMDB." };

  const { error } = await supabase
    .from("titles")
    .update({
      overview: match.overview,
      poster_url: match.posterUrl,
      backdrop_url: match.backdropUrl,
      tmdb_id: match.tmdbId,
      year: existing.year ?? match.year,
    })
    .eq("id", titleId);

  if (error) return { ok: false as const, error: error.message };

  revalidatePath(`/title/${titleId}`);
  revalidatePath("/");
  return { ok: true as const };
}
