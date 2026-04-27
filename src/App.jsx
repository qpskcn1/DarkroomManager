import { useState, useEffect, useCallback } from 'react';
import Wizard from './components/Wizard';
import ImportStep from './components/ImportStep';
import RollSetupStep from './components/RollSetupStep';
import DateStep from './components/DateStep';
import ReviewStep from './components/ReviewStep';
import AiSettings from './components/AiSettings';
import './App.css';

const STEPS = [
  { id: 'import', label: 'Import', icon: '📂' },
  { id: 'setup', label: 'Camera & Film', icon: '📷' },
  { id: 'date', label: 'Date', icon: '📅' },
  { id: 'review', label: 'Review & Apply', icon: '✨' },
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(0);
  const [rolls, setRolls] = useState([]);
  const [presets, setPresets] = useState([]);
  const [filmStocks, setFilmStocks] = useState([]);
  const [sourcePath, setSourcePath] = useState('');
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [aiAvailable, setAiAvailable] = useState(false);

  // Load presets, film stocks, and AI status on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/presets').then(r => r.json()),
      fetch('/api/film-stocks').then(r => r.json()),
      fetch('/api/ai/status').then(r => r.json()).catch(() => ({ available: false })),
    ]).then(([presetsData, filmData, aiStatus]) => {
      setPresets(presetsData.presets || []);
      setFilmStocks(filmData.filmStocks || []);
      setAiAvailable(aiStatus.available || false);
    }).catch(console.error);
  }, []);

  const refreshPresets = useCallback(async () => {
    const res = await fetch('/api/presets');
    const data = await res.json();
    setPresets(data.presets || []);
  }, []);

  const handleImport = useCallback((importedRolls, path) => {
    // Initialize each roll with empty metadata
    const initialized = importedRolls.map(roll => ({
      ...roll,
      preset: null,
      filmStock: null,
      iso: null,
      dateMode: 'single', // 'single' | 'group'
      singleDate: '',
      dateGroups: [{ startIdx: 0, endIdx: roll.photos.length - 1, date: '' }],
    }));
    setRolls(initialized);
    setSourcePath(path);
    setCurrentStep(1);
  }, []);

  const handleUpdateRoll = useCallback((rollId, updates) => {
    setRolls(prev => prev.map(r => r.id === rollId ? { ...r, ...updates } : r));
  }, []);

  const handleUpdateAllRolls = useCallback((updates) => {
    setRolls(prev => prev.map(r => ({ ...r, ...updates })));
  }, []);

  const handleProcess = useCallback(async () => {
    setProcessing(true);
    setResults(null);

    try {
      const processRolls = rolls.map(roll => {
        const metadata = {};

        // Camera info from preset
        if (roll.preset) {
          metadata.make = roll.preset.camera?.make || '';
          metadata.model = roll.preset.camera?.model || '';
          metadata.lens = roll.preset.camera?.lens || '';
          metadata.lensMake = roll.preset.camera?.lensMake || '';
          metadata.focalLength = roll.preset.camera?.focalLength || '';
          metadata.scanner = roll.preset.scan?.scanner || '';
        }

        // Film info
        if (roll.filmStock) {
          metadata.filmStock = roll.filmStock.name || roll.filmStock;
          metadata.iso = roll.iso || roll.filmStock.iso;
        }
        if (roll.iso) metadata.iso = roll.iso;

        // Build per-photo data with dates and AI descriptions
        const photos = roll.photos.map((photo, idx) => {
          let date = '';
          if (roll.dateMode === 'single') {
            date = roll.singleDate;
          } else {
            // Find which group this photo belongs to
            const group = roll.dateGroups.find(g => idx >= g.startIdx && idx <= g.endIdx);
            date = group?.date || '';
          }

          // Attach AI descriptions if available
          const aiDesc = roll.aiDescriptions?.find(d => d.index === idx + 1);
          return {
            ...photo,
            date,
            descriptionEn: aiDesc?.descriptionEn || '',
            descriptionZh: aiDesc?.descriptionZh || '',
            keywords: aiDesc?.keywords || '',
          };
        });

        return {
          rollId: roll.id,
          rollName: roll.name,
          rollPath: roll.path,
          photos,
          metadata,
        };
      });

      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rolls: processRolls }),
      });

      const data = await response.json();
      setResults(data.results);
    } catch (error) {
      console.error('Processing failed:', error);
      setResults([{ error: error.message }]);
    } finally {
      setProcessing(false);
    }
  }, [rolls]);

  const handleReset = useCallback(() => {
    setRolls([]);
    setSourcePath('');
    setCurrentStep(0);
    setResults(null);
    setProcessing(false);
  }, []);

  const canProceed = () => {
    switch (currentStep) {
      case 0: return rolls.length > 0;
      case 1: return rolls.every(r => r.preset !== null);
      case 2: return rolls.every(r => {
        if (r.dateMode === 'single') return r.singleDate !== '';
        return r.dateGroups.every(g => g.date !== '');
      });
      case 3: return !processing;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <ImportStep
            onImport={handleImport}
            sourcePath={sourcePath}
            setSourcePath={setSourcePath}
          />
        );
      case 1:
        return (
          <RollSetupStep
            rolls={rolls}
            presets={presets}
            filmStocks={filmStocks}
            onUpdateRoll={handleUpdateRoll}
            onUpdateAllRolls={handleUpdateAllRolls}
            onRefreshPresets={refreshPresets}
          />
        );
      case 2:
        return (
          <DateStep
            rolls={rolls}
            onUpdateRoll={handleUpdateRoll}
          />
        );
      case 3:
        return (
          <ReviewStep
            rolls={rolls}
            processing={processing}
            results={results}
            onProcess={handleProcess}
            onReset={handleReset}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-brand">
          <div className="brand-icon">🎞️</div>
          <div>
            <h1 className="brand-title">DarkroomManager</h1>
            <p className="brand-subtitle">Film EXIF Automator</p>
          </div>
        </div>
        <div className="header-right">
          {rolls.length > 0 && (
            <div className="header-info">
              <span className="roll-count">{rolls.length} roll{rolls.length !== 1 ? 's' : ''}</span>
              <span className="photo-count">
                {rolls.reduce((sum, r) => sum + r.photos.length, 0)} photos
              </span>
            </div>
          )}
          <button
            className={`ai-settings-btn ${aiAvailable ? 'configured' : ''}`}
            onClick={() => setShowAiSettings(true)}
            title="AI Settings"
          >
            🤖
          </button>
        </div>
      </header>

      <Wizard
        steps={STEPS}
        currentStep={currentStep}
        onStepChange={setCurrentStep}
        canProceed={canProceed()}
        onNext={() => setCurrentStep(s => Math.min(s + 1, STEPS.length - 1))}
        onBack={() => setCurrentStep(s => Math.max(s - 1, 0))}
        isFirstStep={currentStep === 0}
        isLastStep={currentStep === STEPS.length - 1}
      >
        {renderStep()}
      </Wizard>

      <AiSettings
        isOpen={showAiSettings}
        onClose={() => {
          setShowAiSettings(false);
          // Refresh AI status
          fetch('/api/ai/status').then(r => r.json())
            .then(s => setAiAvailable(s.available))
            .catch(() => {});
        }}
      />
    </div>
  );
}
