import { useState, useCallback, useEffect, useRef } from 'react';
import './DateStep.css';

export default function DateStep({ rolls, onUpdateRoll }) {
  const [selectedRollId, setSelectedRollId] = useState(rolls[0]?.id || '');
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiError, setAiError] = useState('');
  const [hoveredAiGroup, setHoveredAiGroup] = useState(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);
  
  const selectedRoll = rolls.find(r => r.id === selectedRollId);
  const filmstripRef = useRef(null);

  // When switching rolls, reset active photo
  useEffect(() => {
    setActivePhotoIdx(0);
  }, [selectedRollId]);

  const handleDateModeChange = (mode) => {
    if (!selectedRoll) return;
    const updates = { dateMode: mode };
    if (mode === 'single') {
      updates.singleDate = selectedRoll.singleDate || '';
    } else {
      updates.dateGroups = selectedRoll.dateGroups || [
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

  const handleAiAnalyze = async () => {
    if (!selectedRoll) return;
    setAnalyzing(true);
    setAiError('');
    setAiResult(null);
    try {
      const rollInfo = {
        cameraInfo: selectedRoll.preset ? `${selectedRoll.preset.camera?.make || ''} ${selectedRoll.preset.camera?.model || ''}` : undefined,
        filmStock: selectedRoll.filmStock?.name || undefined,
      };
      const response = await fetch('/api/ai/analyze-roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: selectedRoll.photos, rollInfo }),
      });
      const data = await response.json();
      if (data.error) { setAiError(data.error); return; }
      setAiResult(data.analysis);
    } catch (err) {
      setAiError('Failed to connect to AI service.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcceptAiGroups = () => {
    if (!aiResult?.groups || !selectedRoll) return;
    const groups = aiResult.groups.map(g => ({
      startIdx: g.startIndex - 1,
      endIdx: g.endIndex - 1,
      date: '',
      aiReason: g.reasoning,
      aiSeason: g.seasonGuess,
    }));
    onUpdateRoll(selectedRollId, {
      dateMode: 'group',
      dateGroups: groups,
      aiDescriptions: aiResult.photos || null,
    });
    setAiResult(null);
  };

  return (
    <div className="date-step-v3">
      <div className="date-main-layout">
        
        {/* LEFT: Preview & Filmstrip */}
        <div className="date-preview-side">
          <div className="big-preview-area">
            {selectedRoll && selectedRoll.photos[activePhotoIdx] && (
              <div className="preview-wrapper">
                <img 
                  src={`/api/photo?path=${encodeURIComponent(selectedRoll.photos[activePhotoIdx].path)}`} 
                  alt="Preview"
                  className="main-preview-img"
                />
                <div className="preview-info">
                  <span className="info-idx">#{activePhotoIdx + 1}</span>
                  <span className="info-name">{selectedRoll.photos[activePhotoIdx].name}</span>
                </div>
              </div>
            )}
          </div>

          <div className="filmstrip-area" ref={filmstripRef}>
            <div className="filmstrip-track">
              {selectedRoll?.photos.map((photo, idx) => {
                const groupIdx = selectedRoll.dateGroups?.findIndex(g => idx >= g.startIdx && idx <= g.endIdx);
                const isGroupStart = idx === selectedRoll.dateGroups?.[groupIdx]?.startIdx && groupIdx > 0;
                const isAiHovered = hoveredAiGroup !== null && 
                  (idx + 1) >= aiResult?.groups[hoveredAiGroup]?.startIndex && 
                  (idx + 1) <= aiResult?.groups[hoveredAiGroup]?.endIndex;

                return (
                  <div 
                    key={idx} 
                    className={`film-frame-container ${idx === activePhotoIdx ? 'active' : ''} ${isAiHovered ? 'ai-highlight' : ''}`}
                    onClick={() => setActivePhotoIdx(idx)}
                  >
                    {isGroupStart && <div className="film-group-divider" />}
                    <div className="film-frame" style={{ '--group-hue': (groupIdx * 60) % 360 }}>
                      <img src={`/api/thumbnail?path=${encodeURIComponent(photo.path)}`} alt={idx} />
                      <span className="frame-num">{idx + 1}</span>
                      {selectedRoll.dateMode === 'group' && (
                        <div className="frame-color-tag" style={{ background: `hsl(${(groupIdx * 60) % 360}, 70%, 50%)` }} />
                      )}
                    </div>
                    {/* Inline split button */}
                    {selectedRoll.dateMode === 'group' && idx > 0 && !isGroupStart && (
                      <button className="inline-split-btn" onClick={(e) => { e.stopPropagation(); handleSplitAt(idx); }}>+</button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT: Controls */}
        <div className="date-control-side">
          <div className="control-section rolls-section">
            <h4 className="section-title">Select Roll</h4>
            <div className="roll-chips">
              {rolls.map(roll => (
                <button 
                  key={roll.id} 
                  className={`roll-chip ${roll.id === selectedRollId ? 'active' : ''}`}
                  onClick={() => setSelectedRollId(roll.id)}
                >
                  {roll.name}
                  {((roll.dateMode === 'single' && roll.singleDate) || (roll.dateMode === 'group' && roll.dateGroups.every(g => g.date))) && " ✓"}
                </button>
              ))}
            </div>
          </div>

          <div className="control-section mode-section">
            <div className="mode-toggle-v3">
              <button className={`mode-tab ${selectedRoll?.dateMode === 'single' ? 'active' : ''}`} onClick={() => handleDateModeChange('single')}>Single Day</button>
              <button className={`mode-tab ${selectedRoll?.dateMode === 'group' ? 'active' : ''}`} onClick={() => handleDateModeChange('group')}>Multiple Sessions</button>
            </div>
          </div>

          {/* AI Panel */}
          <div className="control-section ai-section">
            {!aiResult ? (
              <button className="ai-trigger-btn" onClick={handleAiAnalyze} disabled={analyzing}>
                {analyzing ? "🧠 Analyzing Roll..." : "✨ AI Suggest Grouping"}
              </button>
            ) : (
              <div className="ai-suggestion-box">
                <div className="ai-box-header">
                  <span>🤖 AI Suggestions</span>
                  <div className="ai-box-actions">
                    <button className="btn-sm success" onClick={handleAcceptAiGroups}>Accept</button>
                    <button className="btn-sm ghost" onClick={() => setAiResult(null)}>✕</button>
                  </div>
                </div>
                <div className="ai-suggestion-list">
                  {aiResult.groups?.map((g, i) => (
                    <div 
                      key={i} 
                      className="ai-suggestion-item" 
                      onMouseEnter={() => setHoveredAiGroup(i)} 
                      onMouseLeave={() => setHoveredAiGroup(null)}
                    >
                      <strong>#{g.startIndex}-{g.endIndex}</strong>: {g.reasoning}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {aiError && <div className="ai-error-v3">{aiError}</div>}
          </div>

          {/* Grouping List */}
          <div className="control-section groups-section">
            {selectedRoll?.dateMode === 'single' ? (
              <div className="single-date-input">
                <label>Shooting Date</label>
                <input type="date" value={selectedRoll.singleDate} onChange={e => handleSingleDateChange(e.target.value)} />
              </div>
            ) : (
              <div className="group-list-v3">
                {selectedRoll?.dateGroups.map((group, i) => (
                  <div key={i} className="group-card-v3" style={{ borderLeftColor: `hsl(${(i * 60) % 360}, 70%, 50%)` }}>
                    <div className="group-card-header">
                      <span className="group-num">Group {i + 1}</span>
                      <span className="group-frames">#{group.startIdx + 1} - #{group.endIdx + 1}</span>
                      {i > 0 && <button className="merge-btn" onClick={() => handleMergeGroup(i)}>Merge ↑</button>}
                    </div>
                    <input type="date" value={group.date} onChange={e => handleGroupDateChange(i, e.target.value)} />
                    {group.aiReason && <p className="group-ai-hint">🤖 {group.aiReason}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
