import './Wizard.css';

export default function Wizard({
  steps,
  currentStep,
  onStepChange,
  canProceed,
  onNext,
  onBack,
  isFirstStep,
  isLastStep,
  children,
}) {
  return (
    <div className="wizard">
      {/* Step indicator */}
      <nav className="wizard-nav">
        <div className="wizard-steps">
          {steps.map((step, idx) => (
            <button
              key={step.id}
              className={`wizard-step ${idx === currentStep ? 'active' : ''} ${idx < currentStep ? 'completed' : ''} ${idx > currentStep ? 'upcoming' : ''}`}
              onClick={() => idx < currentStep && onStepChange(idx)}
              disabled={idx > currentStep}
            >
              <span className="step-indicator">
                {idx < currentStep ? (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span className="step-number">{idx + 1}</span>
                )}
              </span>
              <span className="step-icon">{step.icon}</span>
              <span className="step-label">{step.label}</span>
            </button>
          ))}
        </div>
        <div className="wizard-progress">
          <div
            className="wizard-progress-fill"
            style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
          />
        </div>
      </nav>

      {/* Step content */}
      <div className="wizard-content">
        <div className="wizard-content-inner fade-in" key={currentStep}>
          {children}
        </div>
      </div>

      {/* Navigation buttons */}
      <footer className="wizard-footer">
        <div className="wizard-footer-left">
          {!isFirstStep && (
            <button className="btn btn-ghost" onClick={onBack}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
          )}
        </div>
        <div className="wizard-footer-right">
          {!isLastStep && (
            <button
              className="btn btn-primary"
              onClick={onNext}
              disabled={!canProceed}
            >
              Continue
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
