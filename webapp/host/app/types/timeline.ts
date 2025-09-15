export type SectionKind =
  | "Intro"
  | "Verse"
  | "PreChorus"
  | "Chorus"
  | "Bridge"
  | "Solo"
  | "Outro"
  | "Instrumental";

export interface TempoMark {
  atSec: number;
  bpm: number;
}
export interface TimeSigMark {
  atSec: number;
  num: number;
  den: number;
}
export interface ChordEvent {
  atSec: number;
  atBeat?: number;
  symbol: string;
  durationBeats?: number;
  lyricId?: string; // soft link after pairing
}
export interface LyricEvent {
  atSec: number;
  atBeat?: number;
  text: string;
  id?: string;
}
export interface Section {
  kind: SectionKind;
  startSec: number;
  endSec?: number;
  name?: string; // original label
  inferred?: boolean;
}
export interface SongTimeline {
  id: string;
  title: string;
  artist?: string;
  bpmDefault: number;
  timeSigDefault: { num: number; den: number };
  tempoMap: TempoMark[];
  timeSigMap: TimeSigMark[];
  sections: Section[];
  chords: ChordEvent[];
  lyrics: LyricEvent[];
  key?: string;
  mode?: string;
}

export interface TimelineValidationWarning {
  code: string;
  message: string;
}
