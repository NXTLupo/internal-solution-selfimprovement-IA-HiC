import React, { useState, useEffect } from 'react';
import { Character } from '../types';
import { Button } from './ui';

interface CharacterNamingModalProps {
  characters: Character[];
  onSave: (namedCharacters: Character[]) => void;
  onCancel: () => void;
  generationMode: 'character' | 'object';
}

export const CharacterNamingModal: React.FC<CharacterNamingModalProps> = ({ characters, onSave, onCancel, generationMode }) => {
  const [namedCharacters, setNamedCharacters] = useState<Character[]>([]);

  const modeText = generationMode === 'character' ? 'Character' : 'Object';
  const pluralModeText = generationMode === 'character' ? 'Characters' : 'Objects';

  useEffect(() => {
    setNamedCharacters(
      characters.map((char, index) => ({
        ...char,
        name: char.name || `${modeText} ${index + 1}`,
      }))
    );
  }, [characters, modeText]);

  const handleNameChange = (id: string, newName: string) => {
    setNamedCharacters(prev =>
      prev.map(char => (char.id === id ? { ...char, name: newName } : char))
    );
  };
  
  const allNamesAreValid = namedCharacters.every(c => c.name.trim() !== '');

  return (
    <div className="modal-backdrop" aria-modal="true" role="dialog">
      <div className="modal-card">
        <h2 className="modal-title">Name Your New {pluralModeText}</h2>
        <p className="modal-description">Give each {generationMode} a unique name before adding them to your gallery.</p>

        <div className="modal-scroll">
          {namedCharacters.map(character => (
            <div key={character.id} className="modal-entity">
              <img
                src={character.imageData ? `data:${character.imageData.mimeType};base64,${character.imageData.base64}` : ''}
                alt={character.description}
              />
              <div className="modal-entity-content">
                <label htmlFor={`name-${character.id}`} className="modal-label">{modeText} Name</label>
                <input
                  id={`name-${character.id}`}
                  type="text"
                  value={character.name}
                  onChange={(e) => handleNameChange(character.id, e.target.value)}
                  placeholder={`e.g., ${generationMode === 'character' ? 'Captain Eva' : 'Magic Sword'}`}
                  className="ia-input"
                />
                <p className="modal-ai-description">
                  <strong>AI Description:</strong> {character.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <Button onClick={onCancel} className="ia-button--ghost">
            Cancel
          </Button>
          <Button onClick={() => onSave(namedCharacters)} disabled={!allNamesAreValid}>
            Save {pluralModeText}
          </Button>
        </div>
      </div>
    </div>
  );
};
