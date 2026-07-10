"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Camera, ImageUp, Library, Loader2, RotateCcw } from "lucide-react";
import { createPlantAction, discardUploadedPhoto, uploadPlantPhoto } from "@/lib/actions";
import PlantQuestions from "@/components/PlantQuestions";
import type { IdentifyResult, SpeciesCare } from "@/lib/types";

type Step =
  | { name: "capture" }
  | { name: "identifying" }
  | { name: "confirm"; result: IdentifyResult }
  | { name: "resolving" } // fetch-or-generate the full care profile
  | { name: "questions"; species: SpeciesCare }
  | { name: "error"; message: string };

/** Camera/upload → Claude vision ID → confirm → questions → save. */
export default function AddPlantFlow() {
  const [step, setStep] = useState<Step>({ name: "capture" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  // Bumped on every new photo pick so a slow, superseded request can tell it's
  // stale and drop its result instead of clobbering a newer one's state.
  const requestIdRef = useRef(0);
  const uploadedPathRef = useRef<string | null>(null);

  function discardPendingPhoto() {
    const path = uploadedPathRef.current;
    if (path) {
      uploadedPathRef.current = null;
      void discardUploadedPhoto(path);
    }
  }

  async function handleFile(file: File) {
    discardPendingPhoto(); // an earlier pick's upload, if any, is now orphaned
    const requestId = ++requestIdRef.current;

    setPreviewUrl(URL.createObjectURL(file));
    setPhotoUrl(null);
    setStep({ name: "identifying" });

    // Kick off the Storage upload in parallel with identification — both
    // need to finish before the save button is meaningfully usable.
    setUploading(true);
    const uploadPromise = (async () => {
      try {
        const fd = new FormData();
        fd.append("photo", file);
        const { url, path } = await uploadPlantPhoto(fd);
        if (requestId !== requestIdRef.current) {
          // Superseded by a newer photo pick — don't leave this one orphaned.
          void discardUploadedPhoto(path);
          return;
        }
        uploadedPathRef.current = path;
        setPhotoUrl(url);
      } catch {
        // Non-fatal — the plant can still be saved without a stored photo.
      } finally {
        if (requestId === requestIdRef.current) setUploading(false);
      }
    })();

    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/identify", { method: "POST", body: fd });
      const data = await res.json();
      if (requestId !== requestIdRef.current) return; // stale — a newer pick is now in flight
      if (!res.ok) throw new Error(data.error ?? "Identification failed.");
      setStep({ name: "confirm", result: data as IdentifyResult });
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setStep({
        name: "error",
        message: err instanceof Error ? err.message : "Something went wrong identifying that photo.",
      });
    }

    await uploadPromise;
  }

  async function resolveSpecies(commonName: string, scientificName: string) {
    setStep({ name: "resolving" });
    try {
      const res = await fetch("/api/care-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ common_name: commonName, scientific_name: scientificName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't load care info for that plant.");
      setStep({ name: "questions", species: data as SpeciesCare });
    } catch (err) {
      setStep({
        name: "error",
        message: err instanceof Error ? err.message : "Something went wrong loading care info.",
      });
    }
  }

  function reset() {
    requestIdRef.current++; // invalidate any in-flight request from the previous photo
    discardPendingPhoto();
    setPreviewUrl(null);
    setPhotoUrl(null);
    setUploading(false);
    setStep({ name: "capture" });
  }

  if (step.name === "capture") {
    return (
      <>
        <div className="animate-pop rounded-blob border-2 border-dashed border-sprout-300 bg-sprout-100/60 px-6 py-12 text-center">
          <div className="mx-auto mb-5 flex size-20 items-center justify-center rounded-full bg-surface shadow-soft">
            <Camera className="size-9 text-forest-700" strokeWidth={1.8} />
          </div>
          <h2 className="text-xl font-bold text-forest-800">Snap or upload a photo</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted">
            Point your camera at the plant and Sprout will figure out what it is,
            then ask a couple of quick questions.
          </p>

          <div className="mt-7 flex flex-col gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-forest-700 px-6 py-3.5 text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
            >
              <Camera className="size-5" strokeWidth={2.2} />
              Take a photo
            </button>
            <button
              type="button"
              onClick={() => libraryInputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-surface px-6 py-3.5 text-sm font-bold text-forest-700 shadow-soft ring-1 ring-sprout-300 transition-transform active:scale-[0.98]"
            >
              <ImageUp className="size-5" strokeWidth={2.2} />
              Choose from library
            </button>
          </div>

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = ""; // allow re-picking the same file later
              if (file) handleFile(file);
            }}
          />
          <input
            ref={libraryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) handleFile(file);
            }}
          />
        </div>

        <Link
          href="/add/manual"
          className="mt-4 flex items-center gap-3 rounded-3xl border border-line bg-surface px-4 py-4 shadow-soft transition-transform active:scale-[0.98]"
        >
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sprout-100">
            <Library className="size-5 text-forest-700" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-ink">Choose from our plant library</p>
            <p className="text-sm text-muted">
              Know what it is already? Pick it and skip the camera for now.
            </p>
          </div>
        </Link>
      </>
    );
  }

  return (
    <div className="space-y-5">
      {previewUrl ? (
        <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-blob shadow-soft">
          <Image src={previewUrl} alt="Your plant" fill sizes="320px" className="object-cover" unoptimized />
        </div>
      ) : null}

      {step.name === "identifying" || step.name === "resolving" ? (
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <Loader2 className="size-8 animate-spin text-forest-700" strokeWidth={2} />
          <p className="text-sm font-semibold text-muted">
            {step.name === "identifying" ? "Taking a look…" : "Gathering care info…"}
          </p>
        </div>
      ) : null}

      {step.name === "confirm" ? (
        <ConfirmStep result={step.result} onPick={resolveSpecies} onRetake={reset} onGiveUp={discardPendingPhoto} />
      ) : null}

      {step.name === "error" ? (
        <div className="animate-pop rounded-3xl bg-sun-100 px-5 py-6 text-center">
          <p className="text-sm font-semibold text-ink">{step.message}</p>
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 rounded-full bg-forest-700 px-5 py-2.5 text-sm font-bold text-white"
            >
              <RotateCcw className="size-4" strokeWidth={2.4} />
              Try again
            </button>
            <Link
              href="/add/manual"
              onClick={discardPendingPhoto}
              className="inline-flex items-center rounded-full bg-surface px-5 py-2.5 text-sm font-bold text-forest-700 ring-1 ring-sprout-300"
            >
              Search manually
            </Link>
          </div>
        </div>
      ) : null}

      {step.name === "questions" ? (
        <>
          {uploading ? (
            <p className="text-center text-xs font-medium text-faint">Still saving your photo…</p>
          ) : null}
          <form
            action={createPlantAction}
            onSubmit={() => {
              uploadedPathRef.current = null; // handing off to the saved plant row now
            }}
            className="space-y-6"
          >
            <PlantQuestions species={step.species} photoUrl={photoUrl} />
          </form>
        </>
      ) : null}
    </div>
  );
}

function ConfirmStep({
  result,
  onPick,
  onRetake,
  onGiveUp,
}: {
  result: IdentifyResult;
  onPick: (commonName: string, scientificName: string) => void;
  onRetake: () => void;
  onGiveUp: () => void;
}) {
  if (!result.uncertain) {
    return (
      <div className="animate-pop rounded-3xl border border-line bg-surface px-5 py-6 text-center shadow-soft">
        <p className="text-xs font-bold tracking-wide text-sprout-600 uppercase">Looks like…</p>
        <h2 className="mt-1 text-2xl font-bold text-forest-800">{result.common_name}</h2>
        <p className="text-sm text-muted italic">{result.scientific_name}</p>
        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => onPick(result.common_name, result.scientific_name)}
            className="rounded-full bg-forest-700 px-6 py-3 text-sm font-bold text-white shadow-soft transition-transform active:scale-[0.98]"
          >
            Yes, that&apos;s it 🌱
          </button>
        </div>
        <button
          type="button"
          onClick={onRetake}
          className="mt-3 text-xs font-semibold text-muted underline underline-offset-2"
        >
          Not quite — retake photo
        </button>
      </div>
    );
  }

  const options = [
    { common_name: result.common_name, scientific_name: result.scientific_name },
    ...result.candidates,
  ];

  return (
    <div className="animate-pop space-y-3">
      <p className="text-center text-sm font-semibold text-muted">
        Not 100% sure — which one looks right?
      </p>
      {options.map((opt, i) => (
        <button
          key={`${opt.scientific_name}-${i}`}
          type="button"
          onClick={() => onPick(opt.common_name, opt.scientific_name)}
          className="flex w-full flex-col items-start rounded-3xl border border-line bg-surface px-5 py-4 text-left shadow-soft transition-transform active:scale-[0.98]"
        >
          <span className="font-bold text-ink">{opt.common_name}</span>
          <span className="text-xs text-muted italic">{opt.scientific_name}</span>
        </button>
      ))}
      <Link
        href="/add/manual"
        onClick={onGiveUp}
        className="block text-center text-xs font-semibold text-muted underline underline-offset-2"
      >
        None of these — search manually
      </Link>
    </div>
  );
}
