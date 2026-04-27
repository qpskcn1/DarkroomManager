import { useState, useEffect } from 'react';
import './AiSettings.css';

export default function AiSettings({ isOpen, onClose }) {
  const [status, setStatus] = useState(null);
  const [provider, setProvider] = useState('gemini');
  const [geminiKey, setGeminiKey] = useState('');
  const [openaiKey, setOpenaiKey] = useState('');
  const [proxy, setProxy] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetch('/api/ai/status')
        .then(r => r.json())
        .then(data => {
          setStatus(data);
          setProvider(data.provider || 'gemini');
          setProxy(data.proxyUrl || '');
        })
        .catch(() => setStatus({ available: false }));
    }
  }, [isOpen]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const body = { provider };
      if (geminiKey) body.geminiKey = geminiKey;
      if (openaiKey) body.openaiKey = openaiKey;
      body.proxy = proxy;

      const res = await fetch('/api/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setMessage('✅ Settings saved! Restart the server for proxy changes to take effect.');
        setGeminiKey('');
        setOpenaiKey('');
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage('❌ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="ai-settings-overlay" onClick={onClose}>
      <div className="ai-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="ai-settings-header">
          <h3>🤖 AI Settings</h3>
          <button className="ai-settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="ai-settings-body">
          {/* Status */}
          <div className={`ai-status-badge ${status?.available ? 'available' : 'unavailable'}`}>
            {status?.available ? '✅ AI Available' : '⚠️ AI Not Configured'}
            {status?.available && (
              <span className="ai-status-provider">
                Using {status.provider === 'gemini' ? 'Gemini Flash' : 'OpenAI GPT-4o-mini'}
                {status.hasProxy ? ' (via proxy)' : ''}
              </span>
            )}
          </div>

          {/* Provider selection */}
          <div className="settings-field">
            <label className="settings-label">AI Provider</label>
            <div className="provider-toggle">
              <button
                className={`provider-btn ${provider === 'gemini' ? 'active' : ''}`}
                onClick={() => setProvider('gemini')}
              >
                Gemini Flash
                <span className="provider-hint">便宜，有免费额度</span>
              </button>
              <button
                className={`provider-btn ${provider === 'openai' ? 'active' : ''}`}
                onClick={() => setProvider('openai')}
              >
                GPT-4o-mini
                <span className="provider-hint">视觉理解更强</span>
              </button>
            </div>
          </div>

          {/* API Keys */}
          <div className="settings-field">
            <label className="settings-label">
              {provider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'}
            </label>
            {provider === 'gemini' ? (
              <input
                type="password"
                className="settings-input"
                placeholder={status?.hasGemini ? '••••••••(已设置)' : 'AIza...'}
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
              />
            ) : (
              <input
                type="password"
                className="settings-input"
                placeholder={status?.hasOpenAI ? '••••••••(已设置)' : 'sk-...'}
                value={openaiKey}
                onChange={e => setOpenaiKey(e.target.value)}
              />
            )}
          </div>

          {/* Proxy */}
          <div className="settings-field">
            <label className="settings-label">
              HTTP Proxy
              <span className="settings-hint">国内访问 Google/OpenAI 需要代理</span>
            </label>
            <input
              type="text"
              className="settings-input"
              placeholder="http://127.0.0.1:7890 or socks5://127.0.0.1:1080"
              value={proxy}
              onChange={e => setProxy(e.target.value)}
            />
          </div>

          {message && <div className="settings-message">{message}</div>}
        </div>

        <div className="ai-settings-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
