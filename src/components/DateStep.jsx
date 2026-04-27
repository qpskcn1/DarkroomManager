import { useState, useCallback } from 'react';
import './DateStep.css';

export default function DateStep({ rolls, onUpdateRoll }) {
  const [selectedRollId, setSelectedRollId] = useState(rolls[0]?.id || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');

  const selectedRoll = rolls.find(r => r.id === selectedRollId);

  const handleDateModeChange = (mode) => {
    if (!selectedRoll) return;

    const updates = { dateMode: mode };
    if (mode === 'single') {
      updates.singleDate = selectedRoll.singleDate || '';
    } else {
      // Reset to one group spanning all photos
      updates.dateGroups = [
        { startIdx: 0, endIdx: selectedRoll.photos.length - 1, date: '' }
      ];
    }
    onUpdateRoll(selectedRollId, updates);
  };

  const handleSingleDateChange = (date) => {
    onUpdateRoll(selectedRollId, { singleDate: date });
  };

  const handleGroupDateChange = (groupIdx, date) => {
    if (!selectedRoll) return;
    const groups = [...selectedRoll.dateGroups];
    groups[groupIdx] = { ...groups[groupIdx], date };
    onUpdateRoll(selectedRollId, { dateGroups: groups });
  };

  // Split a group at a photo index
  const handleSplitAt = useCallback((photoIdx) => {
    if (!selectedRoll) return;
    const groups = [...selectedRoll.dateGroups];

    const groupIdx = groups.findIndex(g => photoIdx >= g.startIdx && photoIdx <= g.endIdx);
    if (groupIdx === -1) return;

    const group = groups[groupIdx];
    if (photoIdx === group.startIdx) return;

    const newGroup1 = { startIdx: group.startIdx, endIdx: photoIdx - 1, date: group.date };
    const newGroup2 = { startIdx: photoIdx, endIdx: group.endIdx, date: '' };

    groups.splice(groupIdx, 1, newGroup1, newGroup2);
    onUpdateRoll(selectedRollId, { dateGroups: groups });
  }, [selectedRoll, selectedRollId, onUpdateRoll]);

  // Merge a group with the previous one
  const handleMergeGroup = useCallback((groupIdx) => {
    if (!selectedRoll || groupIdx === 0) return;
    const groups = [...selectedRoll.dateGroups];
    const prev = groups[groupIdx - 1];
    const curr = groups[groupIdx];

    groups.splice(groupIdx - 1, 2, {
      startIdx: prev.startIdx,
      endIdx: curr.endIdx,
      date: prev.date || curr.date,
    });
    onUpdateRoll(selectedRollId, { dateGroups: groups });
  }, [selectedRoll, selectedRollId, onUpdateRoll]);

  // =========================================
  // AI Analysis
  // =========================================
  const handleAiAnalyze = async () => {
    if (!selectedRoll) return;
    setAnalyzing(true);
    setAiError('');
    setAiResult(null);

    try {
      const rollInfo = {
        cameraInfo: selectedRoll.preset
          ? `${selectedRoll.preset.camera?.make || ''} ${selectedRoll.preset.camera?.model || ''} with ${selectedRoll.preset.camera?.lens || ''}`
          : undefined,
        filmStock: selectedRoll.filmStock?.name || undefined,
      };

      const response = await fetch('/api/ai/analyze-roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: selectedRoll.photos,
          rollInfo,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setAiError(data.error);
        return;
      }

      setAiResult(data.analysis);
    } catch (err) {
      setAiError('Failed to connect to AI service. Check server logs.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Apply AI suggested groups
  const handleAcceptAiGroups = () => {
    if (!aiResult?.groups || !selectedRoll) return;

    // Switch to group mode
    const groups = aiResult.groups.map(g => ({
      startIdx: g.startIndex - 1, // Convert 1-based to 0-based
      endIdx: g.endIndex - 1,
      date: '',
      aiReason: g.reasoning,
      aiSeason: g.seasonGuess,
      aiTimeOfDay: g.timeOfDay,
    }));

    onUpdateRoll(selectedRollId, {
      dateMode: 'group',
      dateGroups: groups,
      aiDescriptions: aiResult.photos || null,
    });

    // Don't clear the result so user can still see the reasoning
  };

  return (
    <div className="date-step">
      <div className="step-header">
        <h2 className="step-title">Date Tagging</h2>
        <p className="step-desc">
          Set the date for each roll. Use "Group Mode" to split a roll into segments, or let AI suggest groupings.
        </p>
      </div>

      <div className="date-layout">
        {/* Roll selector */}
        <div className="date-roll-tabs">
          {rolls.map(roll => (
            <button
              key={roll.id}
              className={`date-roll-tab ${roll.id === selectedRollId ? 'active' : ''}`}
              onClick={() => {
                setSelectedRollId(roll.id);
                setAiResult(null);
                setAiError('');
              }}
            >
              <span className="tab-name">{roll.name}</span>
              <span className="tab-count">{roll.photos.length}</span>
              {((roll.dateMode === 'single' && roll.singleDate) ||
                (roll.dateMode === 'group' && roll.dateGroups.every(g => g.date))) && (
                <span className="tab-done">✓</span>
              )}
            </button>
          ))}
        </div>

        {selectedRoll && (
          <div className="date-editor">
            {/* Mode toggle + AI button */}
            <div className="date-controls">
              <div className="date-mode-toggle">
                <button
                  className={`mode-btn ${selectedRoll.dateMode === 'single' ? 'active' : ''}`}
                  onClick={() => handleDateModeChange('single')}
                >
                  📅 Same Day
                </button>
                <button
                  className={`mode-btn ${selectedRoll.dateMode === 'group' ? 'active' : ''}`}
                  onClick={() => handleDateModeChange('group')}
                >
                  📆 Group by Date
                </button>
              </div>
              <button
                className="btn ai-analyze-btn"
                onClick={handleAiAnalyze}
                disabled={analyzing}
              >
                {analyzing ? (
                  <>
                    <span className="spinner" />
                    Analyzing...
                  </>
                ) : (
                  <>✨ AI Analyze</>
                )}
              </button>
            </div>

            {/* AI Error */}
            {aiError && (
              <div className="ai-error">
                <span>⚠️ {aiError}</span>
                {aiError.includes('.env') && (
                  <span className="ai-error-hint">
                    Go to Settings (⚙️ in header) to configure your API key.
                  </span>
                )}
              </div>
            )}

            {/* AI Results Panel */}
            {aiResult && (
              <div className="ai-results-panel slide-up">
                <div className="ai-results-header">
                  <h4>🤖 AI Analysis</h4>
                  <div className="ai-results-actions">
                    <button className="btn btn-success btn-sm" onClick={handleAcceptAiGroups}>
                      Accept Groups
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setAiResult(null)}>
                      Dismiss
                    </button>
                  </div>
                </div>

                <div className="ai-groups-preview">
                  {aiResult.groups?.map((group, i) => (
                    <div key={i} className="ai-group-card" style={{ '--group-hue': (i * 60) % 360 }}>
                      <div className="ai-group-header">
                        <span className="ai-group-range">
                          #{group.startIndex}–{group.endIndex}
                        </span>
                        <span className="ai-group-count">
                          {group.endIndex - group.startIndex + 1} photos
                        </span>
                      </div>
                      <p className="ai-group-reasoning">{group.reasoning}</p>
                      {(group.seasonGuess || group.timeOfDay) && (
                        <div className="ai-group-meta">
                          {group.seasonGuess && <span>🌿 {group.seasonGuess}</span>}
                          {group.timeOfDay && <span>🕐 {group.timeOfDay}</span>}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Per-photo descriptions preview */}
                {aiResult.photos?.length > 0 && (
                  <details className="ai-descriptions-preview">
                    <summary>📝 Photo Descriptions ({aiResult.photos.length} photos)</summary>
                    <div className="ai-desc-list">
                      {aiResult.photos.map((photo, i) => (
                        <div key={i} className="ai-desc-item">
                          <span className="ai-desc-index">#{photo.index}</span>
                          <div className="ai-desc-content">
                            <p className="ai-desc-en">{photo.descriptionEn}</p>
                            <p className="ai-desc-zh">{photo.descriptionZh}</p>
                            <div className="ai-desc-tags">
                              {photo.keywords?.split(',').map((kw, j) => (
                                <span key={j} className="ai-tag">{kw.trim()}</span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {selectedRoll.dateMode === 'single' ? (
              /* Single date mode */
              <div className="single-date-section">
                <label className="input-label">Date for all photos in this roll</label>
                <input
                  type="date"
                  className="input-text date-input"
                  value={selectedRoll.singleDate}
                  onChange={e => handleSingleDateChange(e.target.value)}
                />

                {/* Show AI season hints if available */}
                {selectedRoll.dateGroups?.[0]?.aiSeason && (
                  <div className="ai-season-hint">
                    🌿 AI suggests: {selectedRoll.dateGroups[0].aiSeason}
                  </div>
                )}

                {/* Photo strip preview */}
                <div className="photo-strip-container">
                  <div className="photo-strip">
                    {selectedRoll.photos.map((photo, idx) => (
                      <div key={idx} className="strip-frame">
                        <img
                          src={`/api/thumbnail?path=${encodeURIComponent(photo.path)}`}
                          alt={photo.name}
                          loading="lazy"
                        />
                        <span className="frame-number">{idx + 1}</span>
                      </div>
                    ))}
                  </div>
                  {selectedRoll.singleDate && (
                    <div className="strip-date-overlay">
                      {selectedRoll.singleDate}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Group date mode */
              <div className="group-date-section">
                <p className="group-hint">
                  Click between photos to create date boundaries. Each group gets its own date.
                </p>

                {/* Date group inputs */}
                <div className="group-dates">
                  {selectedRoll.dateGroups.map((group, gIdx) => (
                    <div key={gIdx} className="group-date-row">
                      <div
                        className="group-color-bar"
                        style={{ background: `hsl(${(gIdx * 60) % 360}, 70%, 50%)` }}
                      />
                      <div className="group-label">
                        <span className="group-range">
                          #{group.startIdx + 1}–{group.endIdx + 1}
                        </span>
                        <span className="group-count">
                          ({group.endIdx - group.startIdx + 1} photos)
                        </span>
                        {group.aiReason && (
                          <span className="group-ai-reason" title={group.aiReason}>
                            🤖 {group.aiReason}
                          </span>
                        )}
                      </div>
                      <div className="group-date-inputs">
                        <input
                          type="date"
                          className="input-text date-input"
                          value={group.date}
                          onChange={e => handleGroupDateChange(gIdx, e.target.value)}
                        />
                        {group.aiSeason && (
                          <span className="group-ai-hint" title={`${group.aiSeason} ${group.aiTimeOfDay || ''}`}>
                            🌿
                          </span>
                        )}
                      </div>
                      {gIdx > 0 && (
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => handleMergeGroup(gIdx)}
                          title="Merge with previous group"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Interactive photo strip */}
                <div className="photo-strip-container">
                  <div className="photo-strip grouped">
                    {selectedRoll.photos.map((photo, idx) => {
                      const groupIdx = selectedRoll.dateGroups.findIndex(
                        g => idx >= g.startIdx && idx <= g.endIdx
                      );
                      const group = selectedRoll.dateGroups[groupIdx];
                      const isGroupStart = idx === group?.startIdx && idx !== 0;

                      return (
                        <div key={idx} className="strip-frame-wrapper">
                          {/* Split button between frames */}
                          {idx > 0 && !isGroupStart && (
                            <button
                              className="split-btn"
                              onClick={() => handleSplitAt(idx)}
                              title={`Split here (after #${idx})`}
                            >
                              <span className="split-line" />
                            </button>
                          )}
                          {isGroupStart && (
                            <div className="group-divider">
                              <div className="divider-line" />
                              <span className="divider-label">
                                {group.date || '📅'}
                              </span>
                            </div>
                          )}
                          <div
                            className={`strip-frame ${isGroupStart ? 'group-start' : ''}`}
                            style={{ '--group-hue': (groupIdx * 60) % 360 }}
                          >
                            <img
                              src={`/api/thumbnail?path=${encodeURIComponent(photo.path)}`}
                              alt={photo.name}
                              loading="lazy"
                            />
                            <span className="frame-number">{idx + 1}</span>
                            <div
                              className="frame-group-indicator"
                              style={{ background: `hsl(${(groupIdx * 60) % 360}, 70%, 50%)` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
