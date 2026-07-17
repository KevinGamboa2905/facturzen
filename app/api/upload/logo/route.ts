import { NextResponse } from "next/server";

import { getWorkspace } from "@/lib/workspace";
import { storage, isStorageConfigured, StorageNotConfiguredError } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 2_000_000;

// Logo upload → storage driver (local in dev, Vercel Blob in prod). Returns the
// public URL; the client then saves it via updateProfile.
export async function POST(request: Request) {
  const ws = await getWorkspace();
  if (!ws) return NextResponse.json({ ok: false, error: "Session introuvable." }, { status: 401 });

  if (!isStorageConfigured()) {
    return NextResponse.json(
      { ok: false, error: "Stockage de fichiers non configuré — voir DEPLOY.md §6." },
      { status: 400 },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Fichier manquant." }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ ok: false, error: "Une image est requise." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: "Image trop lourde (max 2 Mo)." }, { status: 400 });
  }

  const ext = (file.type.split("/")[1] ?? "png").replace("+xml", "");
  const buf = Buffer.from(await file.arrayBuffer());
  try {
    const stored = await storage.put(`logos/${ws.userId}-${Date.now()}.${ext}`, buf, {
      contentType: file.type,
    });
    return NextResponse.json({ ok: true, url: stored.url });
  } catch (e) {
    if (e instanceof StorageNotConfiguredError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 400 });
    }
    return NextResponse.json({ ok: false, error: "Échec de l'upload." }, { status: 500 });
  }
}
