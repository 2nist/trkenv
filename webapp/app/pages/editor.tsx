import { useState, useEffect } from "react";
import { useRouter } from "next/router";

interface SongMetadata {
  title: string;
  artist: string;
  tempo: number;
  key: string;
  timeSignature: string;
  genre: string;
}

interface Chord {
  beat: number;
  chord: string;
  duration: number;
}

interface Lyric {
  beat: number;
  text: string;
}

interface SongSection {
  id: string;
  name: string;
  type: 'intro' | 'verse' | 'chorus' | 'bridge' | 'outro' | 'instrumental';
  bars: number;
  beatsPerBar: number;
  chords: Chord[];
  lyrics: Lyric[];
}

interface Song {
  metadata: SongMetadata;
  sections: SongSection[];
}

export default function SongEditor() {
  const router = useRouter();
  const [song, setSong] = useState<Song>({
    metadata: {
      title: "",
      artist: "",
      tempo: 120,
      key: "C",
      timeSignature: "4/4",
      genre: ""
    },
    sections: []
  });

  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [status, setStatus] = useState("");

  // Add a new section
  const addSection = (type: SongSection['type']) => {
    const id = Date.now().toString();
    const newSection: SongSection = {
      id,
      name: type.charAt(0).toUpperCase() + type.slice(1),
      type,
      bars: type === 'intro' || type === 'outro' ? 4 : 8,
      beatsPerBar: 4,
      chords: [],
      lyrics: []
    };

    setSong(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
    setActiveSection(id);
  };

  // Update section
  const updateSection = (sectionId: string, updates: Partial<SongSection>) => {
    setSong(prev => ({
      ...prev,
      sections: prev.sections.map(section =>
        section.id === sectionId ? { ...section, ...updates } : section
      )
    }));
  };

  // Add chord to section
  const addChord = (sectionId: string, beat: number, chord: string, duration: number = 4) => {
    const newChord: Chord = { beat, chord, duration };
    updateSection(sectionId, {
      chords: [...(song.sections.find(s => s.id === sectionId)?.chords || []), newChord]
        .sort((a, b) => a.beat - b.beat)
    });
  };

  // Add lyric to section
  const addLyric = (sectionId: string, beat: number, text: string) => {
    const newLyric: Lyric = { beat, text };
    updateSection(sectionId, {
      lyrics: [...(song.sections.find(s => s.id === sectionId)?.lyrics || []), newLyric]
        .sort((a, b) => a.beat - b.beat)
    });
  };

  // Save song
  const saveSong = async () => {
    try {
      setStatus("Saving...");
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";

      const response = await fetch(`${apiBase}/songs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(song)
      });

      if (response.ok) {
        const result = await response.json();
        setStatus("Song saved successfully!");
        setTimeout(() => router.push('/library'), 1500);
      } else {
        setStatus("Error saving song");
      }
    } catch (error) {
      setStatus("Error saving song");
    }
  };

  // Quick chord patterns
  const commonProgressions = {
    'I-V-vi-IV': ['C', 'G', 'Am', 'F'],
    'vi-IV-I-V': ['Am', 'F', 'C', 'G'],
    'I-vi-IV-V': ['C', 'Am', 'F', 'G'],
    'ii-V-I': ['Dm', 'G', 'C']
  };

  return (
    <main className="min-h-screen bg-[#B18C65] text-[#1a1a1a] p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <span className="bg-[#1a1a1a] text-[#efe3cc] rounded-[6px] px-2 py-0.5 font-[600] tracking-wide uppercase">[edit]</span>
            <h1 className="text-3xl font-[800] tracking-wide font-special-elite">Song Editor</h1>
          </div>
          <div className="flex gap-3">
            <button
              onClick={saveSong}
              className="bg-[#1a1a1a] text-[#efe3cc] rounded-[6px] px-3 py-1 uppercase tracking-wide shadow-[0_1px_0_rgba(0,0,0,.35),0_3px_8px_rgba(0,0,0,.18)] hover:bg-[#2a2a2a]"
            >
              [save]
            </button>
                        <button
              onClick={() => router.push('/songs')}
              className="btn-tape"
            >
              [library]
            </button>
          </div>
        </div>

        {status && (
          <div className="mb-4 p-3 bg-[#efe3cc] border border-black/15 rounded text-[#1a1a1a]">
            {status}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Song Metadata */}
          <div className="space-y-6">
            <div className="bg-[#efe3cc] border border-black/15 rounded-[8px] p-4 shadow-[0_1px_0_rgba(0,0,0,.25)]">
              <h2 className="font-typewriter text-black font-bold mb-4">Song Details</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-typewriter font-bold mb-1 text-black">Title</label>
                  <input
                    type="text"
                    value={song.metadata.title}
                    onChange={(e) => setSong(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, title: e.target.value }
                    }))}
                    className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black"
                    placeholder="Song title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-typewriter font-bold mb-1 text-black">Artist</label>
                  <input
                    type="text"
                    value={song.metadata.artist}
                    onChange={(e) => setSong(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, artist: e.target.value }
                    }))}
                    className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black"
                    placeholder="Artist name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-typewriter font-bold mb-1 text-black">Tempo (BPM)</label>
                    <input
                      type="number"
                      value={song.metadata.tempo}
                      onChange={(e) => setSong(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, tempo: parseInt(e.target.value) || 120 }
                      }))}
                      className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black"
                      min="60"
                      max="200"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-typewriter font-bold mb-1 text-black">Key</label>
                    <select
                      value={song.metadata.key}
                      onChange={(e) => setSong(prev => ({
                        ...prev,
                        metadata: { ...prev.metadata, key: e.target.value }
                      }))}
                      className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black"
                    >
                      {['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].map(key => (
                        <option key={key} value={key}>{key}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-typewriter font-bold mb-1 text-black">Time Signature</label>
                  <select
                    value={song.metadata.timeSignature}
                    onChange={(e) => setSong(prev => ({
                      ...prev,
                      metadata: { ...prev.metadata, timeSignature: e.target.value }
                    }))}
                    className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black"
                  >
                    <option value="4/4">4/4</option>
                    <option value="3/4">3/4</option>
                    <option value="6/8">6/8</option>
                    <option value="2/4">2/4</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Song Structure */}
            <div className="bg-[#efe3cc] border border-black/15 rounded-[6px] p-4 shadow-[0_1px_0_rgba(0,0,0,.25)]">
              <h2 className="font-typewriter text-black font-bold mb-4">Song Structure</h2>

              <div className="space-y-2 mb-4">
                {song.sections.map((section, index) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`w-full text-left p-2 rounded text-sm font-typewriter ${
                      activeSection === section.id
                        ? 'bg-[#1a1a1a] text-[#efe3cc]'
                        : 'bg-white hover:bg-white/70 text-black border border-black/10'
                    }`}
                  >
                    {index + 1}. {section.name} ({section.bars} bars)
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <h3 className="font-typewriter text-black font-bold">Add Section:</h3>
                <div className="grid grid-cols-2 gap-2">
                  {(['intro', 'verse', 'chorus', 'bridge'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => addSection(type)}
                      className="btn-tape-sm capitalize"
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick Chord Progressions */}
            <div className="bg-[#efe3cc] border border-black/15 rounded-[6px] p-4 shadow-[0_1px_0_rgba(0,0,0,.25)]">
              <h3 className="font-typewriter text-black font-bold mb-3">Quick Progressions</h3>
              <div className="space-y-2">
                {Object.entries(commonProgressions).map(([name, chords]) => (
                  <button
                    key={name}
                    onClick={() => {
                      if (activeSection) {
                        chords.forEach((chord, i) => {
                          addChord(activeSection, i * 4, chord, 4);
                        });
                      }
                    }}
                    disabled={!activeSection}
                    className="w-full text-left p-2 bg-white hover:bg-white/70 disabled:bg-white/30 disabled:opacity-50 rounded border border-black/10 text-sm font-typewriter"
                  >
                    <div className="font-bold text-black">{name}</div>
                    <div className="text-xs text-black/60">{chords.join(' - ')}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Center Panel - Section Editor */}
          <div className="lg:col-span-2">
            {activeSection ? (
              <SectionEditor
                section={song.sections.find(s => s.id === activeSection)!}
                onUpdateSection={(updates) => updateSection(activeSection, updates)}
                onAddChord={(beat, chord, duration) => addChord(activeSection, beat, chord, duration)}
                onAddLyric={(beat, text) => addLyric(activeSection, beat, text)}
              />
            ) : (
              <div className="bg-[#efe3cc] border border-black/15 rounded-[6px] p-8 text-center shadow-[0_1px_0_rgba(0,0,0,.25)]">
                <h2 className="font-typewriter text-black font-bold mb-2">Select a Section to Edit</h2>
                <p className="font-typewriter text-black/60">Choose a section from the left panel or add a new one to start editing.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// Section Editor Component
interface SectionEditorProps {
  section: SongSection;
  onUpdateSection: (updates: Partial<SongSection>) => void;
  onAddChord: (beat: number, chord: string, duration: number) => void;
  onAddLyric: (beat: number, text: string) => void;
}

function SectionEditor({ section, onUpdateSection, onAddChord, onAddLyric }: SectionEditorProps) {
  const [newChord, setNewChord] = useState({ beat: 0, chord: '', duration: 4 });
  const [newLyric, setNewLyric] = useState({ beat: 0, text: '' });

  const totalBeats = section.bars * section.beatsPerBar;

  return (
    <div className="bg-[#efe3cc] border border-black/15 rounded-[6px] p-4 shadow-[0_1px_0_rgba(0,0,0,.25)]">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-typewriter text-black font-bold">{section.name}</h2>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-typewriter font-bold text-black">Bars:</label>
            <input
              type="number"
              value={section.bars}
              onChange={(e) => onUpdateSection({ bars: parseInt(e.target.value) || 4 })}
              className="w-16 p-1 bg-white border border-black/20 rounded font-typewriter text-black text-sm"
              min="1"
              max="32"
            />
          </div>
          <div className="text-sm font-typewriter text-black/60">
            {totalBeats} beats total
          </div>
        </div>
      </div>

      {/* Beat Grid */}
      <div className="mb-6">
        <h3 className="font-typewriter text-black font-bold mb-3">Timeline</h3>
        <div className="bg-white border border-black/10 rounded p-4 overflow-x-auto">
          <div
            className="flex mb-4 timeline-wrapper"
            ref={(el) => { if (!el) return; el.style.setProperty('--min-width', `${totalBeats * 40}px`); el.style.setProperty('--beat-width', '40px'); }}
          >
            {Array.from({ length: totalBeats }, (_, i) => (
              <div
                key={i}
                ref={(el) => { if (!el) return; el.style.setProperty('--width', '40px'); }}
                className={`var-width flex flex-col items-center border-r border-gray-600 ${i % section.beatsPerBar === 0 ? 'border-l-2 border-l-gray-400' : ''}`}
              >
                <div className="h-16 flex items-center justify-center">
                  <div className="text-xs text-gray-400">{i + 1}</div>
                </div>
                <div className="text-xs text-gray-500">{Math.floor(i / section.beatsPerBar) + 1}</div>
              </div>
            ))}
          </div>

          {/* Chords Track */}
          <div className="mb-4">
            <h4 className="font-typewriter font-bold mb-2 text-black">Chords:</h4>
            <div className="flex relative h-8" ref={(el) => { if (!el) return; el.style.setProperty('--min-width', `${totalBeats * 40}px`); }}>
              {Array.from({ length: totalBeats }, (_, i) => (
                <div
                  key={i}
                  ref={(el) => { if (!el) return; el.style.setProperty('--width', '40px'); }}
                  className="var-width border-r border-gray-700 border-opacity-30 h-full"
                />
              ))}
              {section.chords.map((chord, index) => (
                <div
                  key={index}
                  ref={(el) => {
                    if (!el) return;
                    el.style.setProperty('--left', `${chord.beat * 40}px`);
                    el.style.setProperty('--width', `${chord.duration * 40}px`);
                  }}
                  className="absolute top-0 h-8 flex items-center justify-center var-left var-width"
                >
                  <span className="bg-green-600 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                    {chord.chord}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lyrics Track */}
          <div>
            <h4 className="font-typewriter font-bold mb-2 text-black">Lyrics:</h4>
            <div className="flex relative h-10" ref={(el) => { if (!el) return; el.style.setProperty('--min-width', `${totalBeats * 40}px`); }}>
              {Array.from({ length: totalBeats }, (_, i) => (
                <div
                  key={i}
                  ref={(el) => { if (!el) return; el.style.setProperty('--width', '40px'); }}
                  className="var-width border-r border-gray-700 border-opacity-30 h-full"
                />
              ))}
              {section.lyrics.map((lyric, index) => (
                <div
                  key={index}
                  ref={(el) => { if (!el) return; el.style.setProperty('--left', `${lyric.beat * 40}px`); }}
                  className="absolute top-0 h-10 flex items-center var-left"
                >
                  <span className="bg-purple-600 text-white text-xs px-1 py-0.5 rounded">
                    {lyric.text.substring(0, 15)}{lyric.text.length > 15 ? '...' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Add Chord */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-black/10 rounded p-4">
                  <h3 className="font-typewriter text-black font-bold mb-3">Audio Processing</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label htmlFor="newChord-beat" className="block text-xs mb-1 font-typewriter font-bold text-black">Beat</label>
                <input
                  id="newChord-beat"
                  type="number"
                  value={newChord.beat}
                  onChange={(e) => setNewChord(prev => ({ ...prev, beat: parseInt(e.target.value) || 0 }))}
                  className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black text-sm"
                  min="0"
                  max={totalBeats - 1}
                />
              </div>
              <div>
                <label htmlFor="newChord-chord" className="block text-xs mb-1 font-typewriter font-bold text-black">Chord</label>
                <input
                  id="newChord-chord"
                  type="text"
                  value={newChord.chord}
                  onChange={(e) => setNewChord(prev => ({ ...prev, chord: e.target.value }))}
                  className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black text-sm"
                  placeholder="C, Am, F..."
                />
              </div>
              <div>
                <label htmlFor="newChord-duration" className="block text-xs mb-1 font-typewriter font-bold text-black">Duration</label>
                <input
                  id="newChord-duration"
                  type="number"
                  value={newChord.duration}
                  onChange={(e) => setNewChord(prev => ({ ...prev, duration: parseInt(e.target.value) || 4 }))}
                  className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black text-sm"
                  min="1"
                  max="16"
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (newChord.chord) {
                  onAddChord(newChord.beat, newChord.chord, newChord.duration);
                  setNewChord(prev => ({ ...prev, chord: '' }));
                }
              }}
              className="btn-tape-sm w-full"
            >
              ADD CHORD
            </button>
          </div>
        </div>

        {/* Add Lyric */}
        <div className="bg-white border border-black/10 rounded p-4">
                  <h3 className="font-typewriter text-black font-bold mb-3">Lyrics</h3>
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <div>
                <label htmlFor="newLyric-beat" className="block text-xs mb-1 font-typewriter font-bold text-black">Beat</label>
                <input
                  id="newLyric-beat"
                  type="number"
                  value={newLyric.beat}
                  onChange={(e) => setNewLyric(prev => ({ ...prev, beat: parseInt(e.target.value) || 0 }))}
                  className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black text-sm"
                  min="0"
                  max={totalBeats - 1}
                />
              </div>
              <div className="col-span-3">
                <label htmlFor="newLyric-text" className="block text-xs mb-1 font-typewriter font-bold text-black">Text</label>
                <input
                  id="newLyric-text"
                  type="text"
                  value={newLyric.text}
                  onChange={(e) => setNewLyric(prev => ({ ...prev, text: e.target.value }))}
                  className="w-full p-2 bg-white border border-black/20 rounded font-typewriter text-black text-sm"
                  placeholder="Lyric line..."
                />
              </div>
            </div>
            <button
              onClick={() => {
                if (newLyric.text) {
                  onAddLyric(newLyric.beat, newLyric.text);
                  setNewLyric(prev => ({ ...prev, text: '' }));
                }
              }}
              className="btn-tape-sm w-full"
            >
              ADD LYRIC
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
