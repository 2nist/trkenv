import { z } from "zod";

// Zod mirror of SongDocDraft v1 (subset used by UI today)
export const ZSongDraft = z.object({
  v: z.literal(1),
  draftId: z.string().min(1),
  status: z
    .enum(["pending", "analyzing", "draft_ready", "error", "promoted"])
    .optional(),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
  source: z
    .object({
      recordingId: z.string().optional().nullable(),
      filePath: z.string().optional().nullable(),
      storage: z.enum(["local", "supabase", "s3", "gdrive"]).optional(),
      format: z
        .enum(["wav", "webm", "mp3", "flac", "aiff", "other"])
        .optional(),
      durationSec: z.number().min(0).optional(),
      sampleRate: z.number().int().min(8000).optional(),
      channels: z.number().int().min(1).optional(),
    })
    .partial(),
  meta: z
    .object({
      title: z.string().optional(),
      artist: z.string().optional(),
      album: z.string().optional(),
      key: z.string().optional(),
      mode: z.string().optional(),
      timeSig: z
        .string()
        .regex(/^\d+\/\d+$/)
        .optional(),
      bpm: z
        .object({
          value: z.number().min(1),
          confidence: z.number().min(0).max(1).optional(),
          candidates: z.array(z.number().min(1)).optional(),
        })
        .optional(),
    })
    .partial()
    .optional(),
  sections: z
    .array(
      z.object({
        name: z
          .enum([
            "Intro",
            "Verse",
            "Pre",
            "Chorus",
            "Post",
            "Bridge",
            "Solo",
            "Outro",
            "Break",
            "Other",
          ])
          .optional(),
        startBeat: z.number().min(0),
        lengthBeats: z.number().min(0).optional(),
        color: z
          .string()
          .regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
          .optional(),
        confidence: z.number().min(0).max(1).optional(),
        source: z.enum(["analysis", "import", "user"]).optional(),
      })
    )
    .optional(),
  chords: z
    .array(
      z.object({
        symbol: z.string(),
        startBeat: z.number().min(0),
        lengthBeats: z.number().min(0).optional(),
        degree: z.string().optional(),
        confidence: z.number().min(0).max(1).optional(),
        source: z.enum(["analysis", "import", "user"]).optional(),
      })
    )
    .optional(),
  lyrics: z
    .array(
      z.object({
        ts_sec: z.number().min(0).nullable().optional(),
        text: z.string(),
        beat: z.number().min(0).nullable().optional(),
        source: z.enum(["lrclib", "stt_whisper", "import", "user"]).optional(),
        confidence: z.number().min(0).max(1).optional(),
      })
    )
    .optional(),
  tempoMap: z
    .object({
      bpmBase: z.number().min(1).optional(),
      timeSig: z
        .string()
        .regex(/^\d+\/\d+$/)
        .optional(),
      beats: z
        .array(
          z.object({
            i: z.number().int().min(0),
            timeSec: z.number().min(0),
            bar: z.number().int().min(1).optional(),
            beatInBar: z.number().int().min(1).optional(),
          })
        )
        .optional(),
      markers: z
        .array(
          z.object({
            name: z.string(),
            timeSec: z.number().min(0),
            bar: z.number().int().min(1).optional(),
            beatInBar: z.number().int().min(1).optional(),
          })
        )
        .optional(),
    })
    .optional(),
  analysis: z
    .object({
      jobId: z.string().optional(),
      startedAt: z.string().datetime().optional(),
      completedAt: z.string().datetime().optional(),
      providers: z
        .object({
          id: z.enum(["acrcloud", "audd", "none"]).optional(),
          lyrics: z.enum(["lrclib", "stt_whisper", "none"]).optional(),
          tempo: z.enum(["librosa", "madmom", "other"]).optional(),
          chords: z.enum(["chordino", "essentia", "none"]).optional(),
        })
        .partial()
        .optional(),
      errors: z
        .array(
          z.object({
            stage: z
              .enum(["id", "lyrics", "tempo", "sections", "chords", "other"])
              .optional(),
            message: z.string().optional(),
            fatal: z.boolean().optional(),
          })
        )
        .optional(),
    })
    .optional(),
  notes: z.string().optional(),
});

export type SongDraft = z.infer<typeof ZSongDraft>;
