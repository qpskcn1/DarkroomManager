import { useState, useMemo } from 'react';
import './RollSetupStep.css';

export default function RollSetupStep({
  rolls,
  presets,
  filmStocks,
  onUpdateRoll,
  onUpdateAllRolls,
  onRefreshPresets,
}) {
  const [selectedRollId, setSelectedRollId] = useState(rolls[0]?.id || '');
  const [batchMode, setBatchMode] = useState(false);
  const [batchRolls, setBatchRolls] = useState(new Set());
  const [filmSearch, setFilmSearch] = useState('');

  const selectedRoll = rolls.find(r => r.id === selectedRollId);

  const filmGroups = useMemo(() => {
    const groups = {};
    const filtered = filmSearch
      ? filmStocks.filter(f => f.name.toLowerCase().includes(filmSearch.toLowerCase()) || f.abbr.includes(filmSearch.toLowerCase()))
      : filmStocks;
    filtered.forEach(f => {
      if (!groups[f.type]) groups[f.type] = [];
      groups[f.type].push(f);
    });
    return groups;
  }, [filmStocks, filmSearch]);

  const applyPreset = (preset, rollId) => {
    if (batchMode && batchRolls.size > 0) {
      batchRolls.forEach(id => {
        onUpdateRoll(id, { preset });
      });
    } else {
      onUpdateRoll(rollId || selectedRollId, { preset });
    }
  };

  const applyFilmStock = (film, rollId) => {
    const updates = {
      filmStock: film,
      iso: film.iso,
    };
    if (batchMode && batchRolls.size > 0) {
      batchRolls.forEach(id => onUpdateRoll(id, updates));
    } else {
      onUpdateRoll(rollId || selectedRollId, updates);
    }
  };

  const toggleBatchRoll = (rollId) => {
    setBatchRolls(prev => {
      const next = new Set(prev);
      if (next.has(rollId)) next.delete(rollId);
      else next.add(rollId);
      return next;
    });
  };

  const selectAllForBatch = () => {
    setBatchRolls(new Set(rolls.map(r => r.id)));
  };

  return (
    <div className="roll-setup-step">
      <div className="step-header">
        <h2 className="step-title">Camera & Film Setup</h2>
        <p className="step-desc">
          Assign camera preset and film stock to each roll.
          {rolls.length > 1 && ' Use batch mode to apply settings to multiple rolls at once.'}
        </p>
      </div>

      <div className="setup-layout">
        {/* Roll selector sidebar */}
        <div className="roll-sidebar">
          <div className="roll-sidebar-header">
            <h3>Rolls ({rolls.length})</h3>
            {rolls.length > 1 && (
              <label className="batch-toggle">
                <input
                  type="checkbox"
                  checked={batchMode}
                  onChange={e => {
                    setBatchMode(e.target.checked);
                    if (!e.target.checked) setBatchRolls(new Set());
                  }}
                />
                <span>Batch</span>
              </label>
            )}
          </div>

          {batchMode && (
            <button className="btn btn-ghost btn-sm batch-select-all" onClick={selectAllForBatch}>
              Select All
            </button>
          )}

          <div className="roll-list-sidebar">
            {rolls.map(roll => (
              <button
                key={roll.id}
                className={`roll-sidebar-item ${!batchMode && roll.id === selectedRollId ? 'active' : ''} ${batchMode && batchRolls.has(roll.id) ? 'batch-selected' : ''}`}
                onClick={() => {
                  if (batchMode) {
                    toggleBatchRoll(roll.id);
                  } else {
                    setSelectedRollId(roll.id);
                  }
                }}
              >
                <div className="roll-item-info">
                  <span className="roll-item-name">{roll.name}</span>
                  <span className="roll-item-count">{roll.photos.length} photos</span>
                </div>
                <div className="roll-item-status">
                  {roll.preset && <span className="status-dot preset-set" title="Preset set">📷</span>}
                  {roll.filmStock && <span className="status-dot film-set" title="Film set">🎞️</span>}
                </div>
                {batchMode && (
                  <div className={`batch-check ${batchRolls.has(roll.id) ? 'checked' : ''}`}>
                    {batchRolls.has(roll.id) && '✓'}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Settings panel */}
        <div className="setup-panel">
          {(selectedRoll || (batchMode && batchRolls.size > 0)) ? (
            <>
              {/* Camera Preset Section */}
              <section className="setup-section">
                <h3 className="section-title">
                  Camera Preset
                  {selectedRoll?.preset && (
                    <span className="section-badge">{selectedRoll.preset.name}</span>
                  )}
                </h3>
                <div className="preset-grid">
                  {presets.map(preset => (
                    <button
                      key={preset.id || preset.name}
                      className={`preset-card ${selectedRoll?.preset?.name === preset.name ? 'selected' : ''}`}
                      onClick={() => applyPreset(preset)}
                    >
                      <div className="preset-card-make">{preset.camera?.make || ''}</div>
                      <div className="preset-card-model">{preset.camera?.model || ''}</div>
                      <div className="preset-card-lens">{preset.camera?.lens || ''}</div>
                      <div className="preset-card-scan">{preset.scan?.method || ''}</div>
                    </button>
                  ))}
                </div>
              </section>

              {/* Film Stock Section */}
              <section className="setup-section">
                <h3 className="section-title">
                  Film Stock
                  {selectedRoll?.filmStock && (
                    <span className="section-badge">{selectedRoll.filmStock.name || selectedRoll.filmStock}</span>
                  )}
                </h3>
                <input
                  type="text"
                  className="input-text film-search"
                  placeholder="Search film stocks..."
                  value={filmSearch}
                  onChange={e => setFilmSearch(e.target.value)}
                />
                <div className="film-groups">
                  {Object.entries(filmGroups).map(([type, stocks]) => (
                    <div key={type} className="film-group">
                      <h4 className="film-group-title">{type}</h4>
                      <div className="film-chips">
                        {stocks.map(film => (
                          <button
                            key={film.name}
                            className={`film-chip ${selectedRoll?.filmStock?.name === film.name ? 'selected' : ''}`}
                            onClick={() => applyFilmStock(film)}
                          >
                            <span className="film-chip-name">{film.name}</span>
                            <span className="film-chip-iso">ISO {film.iso}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* ISO Override */}
              {selectedRoll?.filmStock && (
                <section className="setup-section">
                  <h3 className="section-title">ISO Override</h3>
                  <div className="iso-row">
                    <span className="iso-default">
                      Default: ISO {selectedRoll.filmStock.iso}
                    </span>
                    <input
                      type="number"
                      className="input-text iso-input"
                      placeholder="Override ISO"
                      value={selectedRoll?.iso || ''}
                      onChange={e => onUpdateRoll(selectedRollId, {
                        iso: e.target.value ? parseInt(e.target.value) : selectedRoll.filmStock.iso
                      })}
                    />
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="empty-panel">
              <p>Select a roll from the sidebar to configure its settings.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
