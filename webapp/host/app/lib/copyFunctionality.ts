import { useCommandBus, createCopySectionCommand } from "./commandBus";

export interface CopyableData {
  type: 'section' | 'chord_progression' | 'lyrics' | 'structure';
  data: any;
  metadata: {
    sourceId: string;
    timestamp: number;
    description: string;
  };
}

export interface CopyState {
  clipboard: CopyableData | null;

  // Actions
  copySection: (sectionId: string, sectionData: any) => void;
  copyChordProgression: (chords: any[], startBeat: number, endBeat: number) => void;
  copyLyrics: (lyrics: any[], startBeat: number, endBeat: number) => void;
  copyStructure: (sections: any[]) => void;

  pasteToSection: (targetSectionId: string, insertAt: 'replace' | 'before' | 'after') => void;
  pasteChords: (targetBeat: number, mode: 'insert' | 'replace') => void;
  pasteLyrics: (targetBeat: number, mode: 'insert' | 'replace') => void;

  canPaste: (targetType: string) => boolean;
  clear: () => void;
}

export const useCopyFunctionality = (
  // Timeline store hooks
  timeline: any,
  updateTimeline: (updates: any) => void
) => {
  const { execute: executeCommand } = useCommandBus();

  const copyState: CopyState = {
    clipboard: null,

    copySection: (sectionId: string, sectionData: any) => {
      // Extract all data associated with this section
      const section = timeline.sections.find((s: any) => s.id === sectionId);
      if (!section) return;

      const sectionStartBeat = section.startBeat;
      const sectionEndBeat = section.startBeat + section.lengthBeats;

      // Get chords within this section
      const sectionChords = timeline.chords.filter(
        (chord: any) =>
          chord.startBeat >= sectionStartBeat &&
          chord.startBeat < sectionEndBeat
      );

      // Get lyrics within this section
      const sectionLyrics = timeline.lyrics.filter(
        (lyric: any) =>
          lyric.beat >= sectionStartBeat &&
          lyric.beat < sectionEndBeat
      );

      const copyData: CopyableData = {
        type: 'section',
        data: {
          section: { ...section },
          chords: sectionChords.map((chord: any) => ({
            ...chord,
            // Normalize to relative positions within section
            startBeat: chord.startBeat - sectionStartBeat
          })),
          lyrics: sectionLyrics.map((lyric: any) => ({
            ...lyric,
            // Normalize to relative positions within section
            beat: lyric.beat - sectionStartBeat
          })),
          originalLength: section.lengthBeats
        },
        metadata: {
          sourceId: sectionId,
          timestamp: Date.now(),
          description: `Section: ${section.name}`
        }
      };

      copyState.clipboard = copyData;
    },

    copyChordProgression: (chords: any[], startBeat: number, endBeat: number) => {
      const selectedChords = chords.filter(
        chord => chord.startBeat >= startBeat && chord.startBeat < endBeat
      );

      const copyData: CopyableData = {
        type: 'chord_progression',
        data: {
          chords: selectedChords.map(chord => ({
            ...chord,
            startBeat: chord.startBeat - startBeat // Normalize to relative position
          })),
          originalLength: endBeat - startBeat
        },
        metadata: {
          sourceId: `chords_${startBeat}_${endBeat}`,
          timestamp: Date.now(),
          description: `Chord progression (${selectedChords.length} chords)`
        }
      };

      copyState.clipboard = copyData;
    },

    copyLyrics: (lyrics: any[], startBeat: number, endBeat: number) => {
      const selectedLyrics = lyrics.filter(
        lyric => lyric.beat >= startBeat && lyric.beat < endBeat
      );

      const copyData: CopyableData = {
        type: 'lyrics',
        data: {
          lyrics: selectedLyrics.map(lyric => ({
            ...lyric,
            beat: lyric.beat - startBeat // Normalize to relative position
          })),
          originalLength: endBeat - startBeat
        },
        metadata: {
          sourceId: `lyrics_${startBeat}_${endBeat}`,
          timestamp: Date.now(),
          description: `Lyrics (${selectedLyrics.length} lines)`
        }
      };

      copyState.clipboard = copyData;
    },

    copyStructure: (sections: any[]) => {
      const copyData: CopyableData = {
        type: 'structure',
        data: {
          sections: sections.map((section, index) => ({
            ...section,
            startBeat: index * 16 // Normalize to relative positions
          }))
        },
        metadata: {
          sourceId: 'structure_copy',
          timestamp: Date.now(),
          description: `Song structure (${sections.length} sections)`
        }
      };

      copyState.clipboard = copyData;
    },

    pasteToSection: (targetSectionId: string, insertAt: 'replace' | 'before' | 'after') => {
      if (!copyState.clipboard || !copyState.canPaste('section')) return;

      const targetSection = timeline.sections.find((s: any) => s.id === targetSectionId);
      if (!targetSection) return;

      const { data } = copyState.clipboard;
      const originalState = { ...timeline };

      const pasteOperation = () => {
        let insertBeat = targetSection.startBeat;

        if (insertAt === 'after') {
          insertBeat = targetSection.startBeat + targetSection.lengthBeats;
        } else if (insertAt === 'replace') {
          // Remove existing section data first
          const sectionEndBeat = targetSection.startBeat + targetSection.lengthBeats;

          // Remove chords in target section
          const newChords = timeline.chords.filter(
            (chord: any) =>
              chord.startBeat < targetSection.startBeat ||
              chord.startBeat >= sectionEndBeat
          );

          // Remove lyrics in target section
          const newLyrics = timeline.lyrics.filter(
            (lyric: any) =>
              lyric.beat < targetSection.startBeat ||
              lyric.beat >= sectionEndBeat
          );

          updateTimeline({
            chords: newChords,
            lyrics: newLyrics
          });
        }

        // Insert copied data
        const newChords = [
          ...timeline.chords,
          ...data.chords.map((chord: any) => ({
            ...chord,
            id: `chord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            startBeat: chord.startBeat + insertBeat
          }))
        ];

        const newLyrics = [
          ...timeline.lyrics,
          ...data.lyrics.map((lyric: any) => ({
            ...lyric,
            id: `lyric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            beat: lyric.beat + insertBeat
          }))
        ];

        let newSections = [...timeline.sections];
        if (insertAt !== 'replace') {
          // Insert new section
          const newSection = {
            ...data.section,
            id: `section_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            startBeat: insertBeat,
            name: `${data.section.name} (Copy)`
          };
          newSections.push(newSection);
        }

        updateTimeline({
          sections: newSections,
          chords: newChords,
          lyrics: newLyrics
        });
      };

      const restoreOperation = () => {
        updateTimeline(originalState);
      };

      executeCommand(createCopySectionCommand(
        targetSectionId,
        data,
        pasteOperation,
        originalState,
        restoreOperation
      ));
    },

    pasteChords: (targetBeat: number, mode: 'insert' | 'replace') => {
      if (!copyState.clipboard || !['chord_progression', 'section'].includes(copyState.clipboard.type)) return;

      const { data } = copyState.clipboard;
      const chordsData = copyState.clipboard.type === 'section' ? data.chords : data.chords;
      const originalChords = [...timeline.chords];

      let newChords = [...timeline.chords];

      if (mode === 'replace') {
        // Remove chords in target range
        const replaceEndBeat = targetBeat + data.originalLength;
        newChords = newChords.filter(
          chord => chord.startBeat < targetBeat || chord.startBeat >= replaceEndBeat
        );
      }

      // Add copied chords
      const pastedChords = chordsData.map((chord: any) => ({
        ...chord,
        id: `chord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        startBeat: chord.startBeat + targetBeat
      }));

      newChords.push(...pastedChords);

      updateTimeline({ chords: newChords });
    },

    pasteLyrics: (targetBeat: number, mode: 'insert' | 'replace') => {
      if (!copyState.clipboard || !['lyrics', 'section'].includes(copyState.clipboard.type)) return;

      const { data } = copyState.clipboard;
      const lyricsData = copyState.clipboard.type === 'section' ? data.lyrics : data.lyrics;

      let newLyrics = [...timeline.lyrics];

      if (mode === 'replace') {
        // Remove lyrics in target range
        const replaceEndBeat = targetBeat + data.originalLength;
        newLyrics = newLyrics.filter(
          lyric => lyric.beat < targetBeat || lyric.beat >= replaceEndBeat
        );
      }

      // Add copied lyrics
      const pastedLyrics = lyricsData.map((lyric: any) => ({
        ...lyric,
        id: `lyric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        beat: lyric.beat + targetBeat
      }));

      newLyrics.push(...pastedLyrics);

      updateTimeline({ lyrics: newLyrics });
    },

    canPaste: (targetType: string) => {
      if (!copyState.clipboard) return false;

      switch (targetType) {
        case 'section':
          return copyState.clipboard.type === 'section';
        case 'chords':
          return ['chord_progression', 'section'].includes(copyState.clipboard.type);
        case 'lyrics':
          return ['lyrics', 'section'].includes(copyState.clipboard.type);
        case 'structure':
          return copyState.clipboard.type === 'structure';
        default:
          return false;
      }
    },

    clear: () => {
      copyState.clipboard = null;
    }
  };

  return copyState;
};
