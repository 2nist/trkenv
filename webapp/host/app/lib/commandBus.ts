import { create } from "zustand";

export interface Command {
  id: string;
  timestamp: number;
  type: string;
  execute: () => void;
  undo: () => void;
  description: string;
}

export interface CommandBusState {
  // Command history
  commands: Command[];
  currentIndex: number;
  maxHistorySize: number;

  // State
  canUndo: boolean;
  canRedo: boolean;

  // Actions
  execute: (command: Omit<Command, "id" | "timestamp">) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;

  // Bulk operations
  executeBatch: (commands: Omit<Command, "id" | "timestamp">[]) => void;
}

export const useCommandBus = create<CommandBusState>((set, get) => ({
  // Initial state
  commands: [],
  currentIndex: -1,
  maxHistorySize: 100,
  canUndo: false,
  canRedo: false,

  // Execute a new command
  execute: (commandData) => {
    const state = get();
    const command: Command = {
      ...commandData,
      id: `cmd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Execute the command
    command.execute();

    // Remove any commands after current index (when user undid and then executed new command)
    const newCommands = state.commands.slice(0, state.currentIndex + 1);

    // Add new command
    newCommands.push(command);

    // Limit history size
    if (newCommands.length > state.maxHistorySize) {
      newCommands.shift();
    }

    const newIndex = newCommands.length - 1;

    set({
      commands: newCommands,
      currentIndex: newIndex,
      canUndo: newIndex >= 0,
      canRedo: false,
    });
  },

  // Undo last command
  undo: () => {
    const state = get();
    if (state.currentIndex >= 0) {
      const command = state.commands[state.currentIndex];
      command.undo();

      const newIndex = state.currentIndex - 1;
      set({
        currentIndex: newIndex,
        canUndo: newIndex >= 0,
        canRedo: true,
      });
    }
  },

  // Redo next command
  redo: () => {
    const state = get();
    if (state.currentIndex < state.commands.length - 1) {
      const newIndex = state.currentIndex + 1;
      const command = state.commands[newIndex];
      command.execute();

      set({
        currentIndex: newIndex,
        canUndo: true,
        canRedo: newIndex < state.commands.length - 1,
      });
    }
  },

  // Clear all commands
  clear: () => {
    set({
      commands: [],
      currentIndex: -1,
      canUndo: false,
      canRedo: false,
    });
  },

  // Execute multiple commands as a single operation
  executeBatch: (commandsData) => {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const batchCommand: Command = {
      id: batchId,
      timestamp: Date.now(),
      type: "batch",
      description: `Batch operation (${commandsData.length} commands)`,
      execute: () => {
        commandsData.forEach(cmd => cmd.execute());
      },
      undo: () => {
        // Undo in reverse order
        [...commandsData].reverse().forEach(cmd => cmd.undo());
      },
    };

    get().execute(batchCommand);
  },
}));

// Specific command creators for song editing
export const createChordEditCommand = (
  chordId: string,
  oldValue: string,
  newValue: string,
  updateChord: (id: string, value: string) => void
) => ({
  type: "edit_chord",
  description: `Change chord from ${oldValue} to ${newValue}`,
  execute: () => updateChord(chordId, newValue),
  undo: () => updateChord(chordId, oldValue),
});

export const createLyricEditCommand = (
  lyricId: string,
  oldText: string,
  newText: string,
  updateLyric: (id: string, text: string) => void
) => ({
  type: "edit_lyric",
  description: `Edit lyrics`,
  execute: () => updateLyric(lyricId, newText),
  undo: () => updateLyric(lyricId, oldText),
});

export const createSectionEditCommand = (
  sectionId: string,
  oldName: string,
  newName: string,
  updateSection: (id: string, name: string) => void
) => ({
  type: "edit_section",
  description: `Rename section from "${oldName}" to "${newName}"`,
  execute: () => updateSection(sectionId, newName),
  undo: () => updateSection(sectionId, oldName),
});

export const createAddChordCommand = (
  chord: any,
  addChord: (chord: any) => void,
  removeChord: (id: string) => void
) => ({
  type: "add_chord",
  description: `Add chord ${chord.symbol}`,
  execute: () => addChord(chord),
  undo: () => removeChord(chord.id),
});

export const createDeleteChordCommand = (
  chord: any,
  removeChord: (id: string) => void,
  addChord: (chord: any) => void
) => ({
  type: "delete_chord",
  description: `Delete chord ${chord.symbol}`,
  execute: () => removeChord(chord.id),
  undo: () => addChord(chord),
});

export const createCopySectionCommand = (
  sectionId: string,
  copiedData: any,
  pasteSectionData: (data: any) => void,
  originalState: any,
  restoreState: (state: any) => void
) => ({
  type: "copy_section",
  description: `Copy section data`,
  execute: () => pasteSectionData(copiedData),
  undo: () => restoreState(originalState),
});
