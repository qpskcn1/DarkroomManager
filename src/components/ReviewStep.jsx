import { useState } from 'react';
import './ReviewStep.css';

export default function ReviewStep({ rolls, processing, results, onProcess, onReset }) {
  const [expandedRoll, setExpandedRoll] = useState(null);

  const allDone = results && results.length > 0 && !results.some(r => r.error);
  const totalSuccess = results?.reduce((sum, r) => sum + (r.successCount || 0), 0) || 0;
  const totalPhotos = results?.reduce((sum, r) => sum + (r.totalCount || 0), 0) || 0;

  if (results) {
    return (
      <div className="review-step">
        <div className="step-header">
          <h2 className="step-title">
            {allDone ? '✅ Processing Complete' : '⚠️ Processing Results'}
          </h2>
          <p className="step-desc">
            {totalSuccess} of {totalPhotos} photos processed successfully.
          </p>
        </div>

        <div className="results-list">
          {results.map((rollResult, idx) => (
            <div key={idx} className={`result-card ${rollResult.error ? 'error' : ''}`}>
              <div className="result-header">
                <div className="result-info">
                  <h4>{rollResult.rollName || 'Roll'}</h4>
                  <span className="result-stats">
                    {rollResult.successCount}/{rollResult.totalCount} photos
                  </span>
                </div>
                <span className={`result-badge ${rollResult.successCount === rollResult.totalCount ? 'success' : 'warning'}`}>
                  {rollResult.successCount === rollResult.totalCount ? 'All Done' : 'Partial'}
                </span>
              </div>
              {rollResult.results?.some(r => !r.success) && (
                <div className="result-errors">
                  {rollResult.results.filter(r => !r.success).map((r, i) => (
                    <div key={i} className="error-item">
                      <span className="error-file">{r.name}</span>
                      <span className="error-msg">{r.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <button className="btn btn-primary btn-lg" onClick={onReset} style={{ marginTop: 24 }}>
          Start New Batch
        </button>
      </div>
    );
  }

  return (
    <div className="review-step">
      <div className="step-header">
        <h2 className="step-title">Review & Apply</h2>
        <p className="step-desc">
          Review the metadata that will be written to each roll, then apply.
        </p>
      </div>

      <div className="review-rolls">
        {rolls.map((roll, idx) => {
          const isExpanded = expandedRoll === roll.id;

          return (
            <div key={roll.id} className="review-card" style={{ animationDelay: `${idx * 0.05}s` }}>
              <button
                className="review-card-header"
                onClick={() => setExpandedRoll(isExpanded ? null : roll.id)}
              >
                <div className="review-card-left">
                  <span className="review-roll-icon">🎞️</span>
                  <div className="review-roll-info">
                    <h4 className="review-roll-name">{roll.name}</h4>
                    <span className="review-roll-count">{roll.photos.length} photos</span>
                  </div>
                </div>

                <div className="review-card-badges">
                  {roll.preset && (
                    <span className="review-badge camera">
                      📷 {roll.preset.camera?.make} {roll.preset.camera?.model}
                    </span>
                  )}
                  {roll.filmStock && (
                    <span className="review-badge film">
                      🎞️ {roll.filmStock.name || roll.filmStock}
                    </span>
                  )}
                  {(roll.dateMode === 'single' ? roll.singleDate : `${roll.dateGroups.length} groups`) && (
                    <span className="review-badge date">
                      📅 {roll.dateMode === 'single' ? roll.singleDate : `${roll.dateGroups.length} date groups`}
                    </span>
                  )}
                </div>

                <span className={`expand-icon ${isExpanded ? 'open' : ''}`}>▾</span>
              </button>

              {isExpanded && (
                <div className="review-card-body slide-up">
                  <table className="review-table">
                    <tbody>
                      <tr>
                        <td className="review-label">Camera</td>
                        <td>{roll.preset?.camera?.make} {roll.preset?.camera?.model}</td>
                      </tr>
                      <tr>
                        <td className="review-label">Lens</td>
                        <td>{roll.preset?.camera?.lens}</td>
                      </tr>
                      <tr>
                        <td className="review-label">Focal Length</td>
                        <td>{roll.preset?.camera?.focalLength}</td>
                      </tr>
                      <tr>
                        <td className="review-label">Film Stock</td>
                        <td>{roll.filmStock?.name || roll.filmStock || '—'}</td>
                      </tr>
                      <tr>
                        <td className="review-label">ISO</td>
                        <td>{roll.iso || roll.filmStock?.iso || '—'}</td>
                      </tr>
                      <tr>
                        <td className="review-label">Scanner</td>
                        <td>{roll.preset?.scan?.scanner || '—'}</td>
                      </tr>
                      <tr>
                        <td className="review-label">Scan Method</td>
                        <td>{roll.preset?.scan?.method || '—'}</td>
                      </tr>
                      <tr>
                        <td className="review-label">Date</td>
                        <td>
                          {roll.dateMode === 'single' ? (
                            roll.singleDate
                          ) : (
                            <div className="review-date-groups">
                              {roll.dateGroups.map((g, i) => (
                                <div key={i} className="review-date-group">
                                  <span>#{g.startIdx + 1}–{g.endIdx + 1}:</span>
                                  <strong>{g.date}</strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td className="review-label">Export To</td>
                        <td className="review-path">{roll.path}/Export/</td>
                      </tr>
                      {roll.aiDescriptions && roll.aiDescriptions.length > 0 && (
                        <tr>
                          <td className="review-label">AI Descriptions</td>
                          <td>
                            <span className="review-ai-badge">
                              🤖 {roll.aiDescriptions.length} photo descriptions
                            </span>
                            <div className="review-ai-desc-preview">
                              {roll.aiDescriptions.slice(0, 3).map((d, i) => (
                                <div key={i} className="review-ai-desc-item">
                                  <span className="review-ai-idx">#{d.index}</span>
                                  <span className="review-ai-text">{d.descriptionEn}</span>
                                </div>
                              ))}
                              {roll.aiDescriptions.length > 3 && (
                                <span className="review-ai-more">
                                  +{roll.aiDescriptions.length - 3} more...
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="review-actions">
        <button
          className="btn btn-success btn-lg"
          onClick={onProcess}
          disabled={processing}
        >
          {processing ? (
            <>
              <span className="spinner" />
              Processing {rolls.reduce((s, r) => s + r.photos.length, 0)} photos...
            </>
          ) : (
            <>
              ✨ Apply EXIF & Export ({rolls.reduce((s, r) => s + r.photos.length, 0)} photos)
            </>
          )}
        </button>
      </div>
    </div>
  );
}
