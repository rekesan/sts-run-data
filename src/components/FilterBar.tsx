import React from "react";
import { Filter, SlidersHorizontal } from "lucide-react";

interface FilterBarProps {
  characters: string[];
  ascensionLevels: number[];
  selectedCharacter: string;
  selectedAscension: string;
  selectedMode: string;
  minCount: number;
  onCharacterChange: (value: string) => void;
  onAscensionChange: (value: string) => void;
  onModeChange: (value: string) => void;
  onMinCountChange: (value: number) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  characters,
  ascensionLevels,
  selectedCharacter,
  selectedAscension,
  selectedMode,
  minCount,
  onCharacterChange,
  onAscensionChange,
  onModeChange,
  onMinCountChange,
}) => {
  return (
    <div className="filter-bar">
      <div className="filter-bar-label">
        <Filter size={16} />
        <span>Filters</span>
      </div>

      <div className="filter-group">
        <label htmlFor="character-filter">Character</label>
        <select
          id="character-filter"
          value={selectedCharacter}
          onChange={(e) => onCharacterChange(e.target.value)}
        >
          <option value="all">All Characters</option>
          {characters.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="ascension-filter">Ascension</label>
        <select
          id="ascension-filter"
          value={selectedAscension}
          onChange={(e) => onAscensionChange(e.target.value)}
        >
          <option value="all">All Levels</option>
          {ascensionLevels.map((a) => (
            <option key={a} value={String(a)}>
              A{a}
            </option>
          ))}
        </select>
      </div>

      <div className="filter-group">
        <label htmlFor="mode-filter">Mode</label>
        <select
          id="mode-filter"
          value={selectedMode}
          onChange={(e) => onModeChange(e.target.value)}
        >
          <option value="all">All Modes</option>
          <option value="solo">Solo Only</option>
          <option value="multi">Multiplayer Only</option>
        </select>
      </div>

      <div className="filter-group min-count-group">
        <label htmlFor="min-count-filter">
          <SlidersHorizontal size={14} />
          Min Count: {minCount}
        </label>
        <input
          id="min-count-filter"
          type="range"
          min={1}
          max={30}
          value={minCount}
          onChange={(e) => onMinCountChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
};
