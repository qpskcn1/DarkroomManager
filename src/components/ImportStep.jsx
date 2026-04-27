import { useState } from 'react';
import './ImportStep.css';

export default function ImportStep({ onImport, sourcePath, setSourcePath }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState('');

  const handleScan = async () => {
    const path = sourcePath.trim();
    if (!path) return;

    setScanning(true);
    setError('');
    setScanResult(null);

    try {
      const response = await fetch(`/api/scan?path=${encodeURIComponent(path)}`);
      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      if (!data.rolls || data.rolls.length === 0) {
        setError('No photos found in this directory or its subdirectories.');
        return;
      }

      setScanResult(data);
    } catch (err) {
      setError('Failed to scan directory. Make sure the server is running.');
    } finally {
      setScanning(false);
    }
  };

  const handleConfirmImport = () => {
    if (scanResult) {
      onImport(scanResult.rolls, sourcePath);
    }
  };

  const totalPhotos = scanResult?.rolls?.reduce((sum, r) => sum + r.photos.length, 0) || 0;

  return (
    <div className="import-step">
      <div className="step-header">
        <h2 className="step-title">Import Film Scans</h2>
        <p className="step-desc">
          Point to a YYYYMM folder on your NAS. Each subfolder will be detected as a separate roll.
        </p>
      </div>

      <div className="import-input-group">
        <label htmlFor="source-path" className="input-label">Source Directory</label>
        <div className="input-row">
          <input
            id="source-path"
            type="text"
            className="input-text"
            placeholder="/Volumes/home/Photos/Darkroom/2026/202603"
            value={sourcePath}
            onChange={e => setSourcePath(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleScan()}
          />
          <button
            className="btn btn-primary"
            onClick={handleScan}
            disabled={scanning || !sourcePath.trim()}
          >
            {scanning ? (
              <>
                <span className="spinner" />
                Scanning...
              </>
            ) : (
              'Scan'
            )}
          </button>
        </div>
        {error && <p className="input-error">{error}</p>}
      </div>

      {scanResult && (
        <div className="scan-results slide-up">
          <div className="results-summary">
            <div className="summary-stat">
              <span className="stat-value">{scanResult.rolls.length}</span>
              <span className="stat-label">Roll{scanResult.rolls.length !== 1 ? 's' : ''} Found</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{totalPhotos}</span>
              <span className="stat-label">Total Photos</span>
            </div>
            <div className="summary-stat">
              <span className="stat-value">{scanResult.mode === 'multi' ? 'Multi-Roll' : 'Single Roll'}</span>
              <span className="stat-label">Mode</span>
            </div>
          </div>

          <div className="roll-list">
            {scanResult.rolls.map((roll, idx) => (
              <RollPreviewCard key={roll.id} roll={roll} index={idx} />
            ))}
          </div>

          <button className="btn btn-success btn-lg import-confirm" onClick={handleConfirmImport}>
            Import {scanResult.rolls.length} Roll{scanResult.rolls.length !== 1 ? 's' : ''} ({totalPhotos} photos)
          </button>
        </div>
      )}
    </div>
  );
}

function RollPreviewCard({ roll, index }) {
  return (
    <div className="roll-preview-card" style={{ animationDelay: `${index * 0.05}s` }}>
      <div className="roll-preview-header">
        <div className="roll-preview-icon">🎞️</div>
        <div className="roll-preview-info">
          <h4 className="roll-preview-name">{roll.name}</h4>
          <span className="roll-preview-count">{roll.photos.length} photos</span>
        </div>
      </div>
      <div className="roll-preview-thumbs">
        {roll.photos.slice(0, 6).map((photo, i) => (
          <div key={i} className="roll-preview-thumb">
            <img
              src={`/api/thumbnail?path=${encodeURIComponent(photo.path)}`}
              alt={photo.name}
              loading="lazy"
            />
          </div>
        ))}
        {roll.photos.length > 6 && (
          <div className="roll-preview-more">
            +{roll.photos.length - 6}
          </div>
        )}
      </div>
    </div>
  );
}
