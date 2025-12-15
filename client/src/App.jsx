import React, { useState, useEffect } from 'react';
import './index.css';

// Branding
const BRAND_TITLE = "XDREAM X GENERATIONS X";
const BRAND_SUBTITLE = "Dream • Create • Ascend";
const DAILY_LIMIT = 5;

// Models
const TOP_MODELS = [
  { id: 'flux-realism', name: 'Flux Realism V2', description: 'Photorealistic, high fidelity details' },
  { id: 'midjourney-style', name: 'Artistic MJ V6', description: 'Creative, abstract, painterly aesthetics' },
  { id: 'anime-master', name: 'Niji Express', description: 'Best for anime, manga, and cel-shaded styles' }
];

const TOP_CONCEPTS = [
  'Cyberpunk City', 'Ethereal Portrait', 'Dark Fantasy', 'Synthwave',
  'Studio Ghibli', 'Isometric 3D', 'Bioluminescence', 'Steampunk Gear',
  'Cosmic Horror', 'Vaporwave'
];

function App() {
  const [selectedModel, setSelectedModel] = useState(TOP_MODELS[0].id);
  const [selectedConcepts, setSelectedConcepts] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [refinedPrompt, setRefinedPrompt] = useState(null);
  const [history, setHistory] = useState([]);

  // Load History on Mount
  useEffect(() => {
    const saved = localStorage.getItem('xdream_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load history', e);
      }
    }
  }, []);

  // Save History Helper
  const addToHistory = (newItem) => {
    const updated = [newItem, ...history].slice(0, 50); // Keep last 50
    setHistory(updated);
    localStorage.setItem('xdream_history', JSON.stringify(updated));
  };

  const [loading, setLoading] = useState(false);
  const [imageResult, setImageResult] = useState(null);
  const [error, setError] = useState('');

  // Face Swap State
  const [sourceImage, setSourceImage] = useState(null);
  const [targetImage, setTargetImage] = useState(null);

  // New states for tabs and vision
  const [activeTab, setActiveTab] = useState('gen'); // 'gen', 'swap', 'vision'
  const [workflow, setWorkflow] = useState('Lucario NSFW'); // 'Lucario NSFW', 'Photorealistic', 'Anime / Booru', 'Cinematic'

  // Stats
  const [generationsLeft, setGenerationsLeft] = useState(DAILY_LIMIT);

  useEffect(() => {
    checkDailyLimit();
  }, []);

  const checkDailyLimit = () => {
    const today = new Date().toDateString();
    const usage = JSON.parse(localStorage.getItem('daily_usage') || '{}');

    if (usage.date !== today) {
      // Reset logic
      localStorage.setItem('daily_usage', JSON.stringify({ date: today, count: 0 }));
      setGenerationsLeft(DAILY_LIMIT);
    } else {
      setGenerationsLeft(DAILY_LIMIT - usage.count);
    }
  };

  const incrementUsage = () => {
    const today = new Date().toDateString();
    const usage = JSON.parse(localStorage.getItem('daily_usage') || '{}');
    const newCount = (usage.count || 0) + 1;
    localStorage.setItem('daily_usage', JSON.stringify({ date: today, count: newCount }));
    setGenerationsLeft(DAILY_LIMIT - newCount);
  };

  const toggleConcept = (concept) => {
    if (selectedConcepts.includes(concept)) {
      setSelectedConcepts(prev => prev.filter(c => c !== concept));
    } else {
      setSelectedConcepts(prev => [...prev, concept]);
    }
  };

  const handleRefine = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          workflow // Send selected workflow/style
        }),
      });
      const data = await res.json();
      if (data.refined_prompt) {
        setPrompt(data.refined_prompt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (generationsLeft <= 0) {
      setError("Daily limit reached. Come back tomorrow.");
      return;
    }
    if (!prompt) return;

    setLoading(true);
    setError('');
    setImageResult(null);

    try {
      const finalPrompt = `${prompt} ${selectedConcepts.join(', ')}`.trim();

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          model: selectedModel,
          workflow: workflow // Pass the selected workflow
        })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || 'Failed');

      // Handle Data URL or URL
      const imageUrl = data.url || data.image || data.output_url;
      setImageResult(imageUrl);
      incrementUsage();
      addToHistory({
        type: 'image',
        url: imageUrl,
        prompt: finalPrompt,
        workflow: workflow || 'Custom',
        date: new Date().toISOString()
      });

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFaceSwap = async () => {
    if (generationsLeft <= 0) {
      setError("Daily limit reached.");
      return;
    }
    if (!sourceImage || !targetImage) {
      setError("Please upload both source and target images.");
      return;
    }

    setLoading(true);
    setError('');
    setImageResult(null);

    try {
      const response = await fetch('/api/faceswap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_image: sourceImage,
          target_image: targetImage
        })
      });
      const resultData = await response.json();

      if (resultData.url) {
        setImageResult(resultData.url);
        // Add to History
        addToHistory({
          type: 'faceswap',
          url: resultData.url,
          prompt: 'Face Swap', // Or more detailed info
          workflow: 'Face Swap',
          date: new Date().toISOString()
        });
        incrementUsage();
      } else {
        throw new Error(resultData.error || 'Face Swap Failed');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e, setFunc) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFunc(reader.result); // Base64
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="app">
      <header className="brand-header">
        <h1>{BRAND_TITLE}</h1>
        <p className="subtitle">{BRAND_SUBTITLE}</p>
        <div className="limit-badge">Credits: {generationsLeft}/{DAILY_LIMIT}</div>
      </header>

      <div className="tab-bar">
        <button className={activeTab === 'gen' ? 'active' : ''} onClick={() => setActiveTab('gen')}>Create 🎨</button>
        <button className={activeTab === 'swap' ? 'active' : ''} onClick={() => setActiveTab('swap')}>Face Swap 🎭</button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>History 📜</button>
      </div>

      <div className="container">

        {activeTab === 'gen' && (
          <>
            {/* Workflow Selector */}
            <div className="section-title">WORKFLOW PRESETS (HARDCODED)</div>
            <div className="concepts-grid">
              {['Amateur / BBW', 'Cinematic Flux', 'Lustify / Explicit', 'Lucario NSFW'].map((wf) => (
                <div
                  key={wf}
                  className={`concept-chip ${workflow === wf ? 'selected' : ''}`}
                  onClick={() => setWorkflow(wf)}
                >
                  {wf}
                </div>
              ))}
            </div>

            {/* Model Selection */}
            <div>
              <span className="section-title">TOP MODELS</span>
              <div className="models-grid">
                {TOP_MODELS.map(model => (
                  <div
                    key={model.id}
                    className={`model-card ${selectedModel === model.id ? 'selected' : ''}`}
                    onClick={() => setSelectedModel(model.id)}
                  >
                    <h3>{model.name}</h3>
                    <p>{model.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Concepts Selection */}
            <div>
              <span className="section-title">Enhance with Concepts</span>
              <div className="concepts-grid">
                {TOP_CONCEPTS.map(concept => (
                  <div
                    key={concept}
                    className={`concept-chip ${selectedConcepts.includes(concept) ? 'selected' : ''}`}
                    onClick={() => toggleConcept(concept)}
                  >
                    {concept}
                  </div>
                ))}
              </div>
            </div>

            {/* Input Area */}
            <div className="input-group">
              <div className="input-area">
                <input
                  type="text"
                  placeholder="Describe your unrestricted vision..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                />
                <button
                  className="generate-btn"
                  onClick={handleGenerate}
                  disabled={loading}
                >
                  {loading ? 'Gener...' : 'Generate'}
                </button>
              </div>
              <button
                className="refine-btn"
                onClick={handleRefine}
                disabled={loading || !prompt}
              >
                ✨ Enhance with LUCARIO AGI (DeepSeek)
              </button>
            </div>
          </>
        )}

        {activeTab === 'swap' && (
          <div className="faceswap-area">
            <div className="upload-box">
              <h3>Source Face</h3>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setSourceImage)} />
              {sourceImage && <img src={sourceImage} alt="Source" className="preview-thumb" />}
            </div>
            <div className="upload-box">
              <h3>Target Image</h3>
              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, setTargetImage)} />
              {targetImage && <img src={targetImage} alt="Target" className="preview-thumb" />}
            </div>
            <button className="generate-btn full-width" onClick={handleFaceSwap} disabled={loading}>
              {loading ? 'Swapping...' : 'Swap Faces'}
            </button>
          </div>
        )}

        {/* RESULT AREA */}
        <div className="result-area">
          {loading && <div className="loading-spinner"></div>}
          {error && <div className="error-message" style={{ color: '#ff4d4d', padding: '1rem', background: 'rgba(255,0,0,0.1)', borderRadius: '8px' }}>{error}</div>}

          {!loading && imageResult && activeTab !== 'history' && (
            <div className="result-card">
              <img src={imageResult} alt="Generated Result" className="result-image" />
              <div className="result-actions">
                <a href={imageResult} download="dream_gen.jpg" className="action-btn" target="_blank" rel="noreferrer">
                  Save to Device 💾
                </a>
              </div>
            </div>
          )}

          {!loading && !imageResult && activeTab !== 'history' && (
            <div className="placeholder-text">
              {activeTab === 'gen' ? 'Select a workflow and dream...' : 'Upload images to swap faces...'}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div className="history-grid">
              {history.length === 0 && <div className="placeholder-text">No history yet. Create something!</div>}
              {history.map((item, idx) => (
                <div key={idx} className="history-card">
                  <img src={item.url} alt="History" />
                  <div className="history-info">
                    <span className="badge">{item.workflow}</span>
                    <p>{new Date(item.date).toLocaleTimeString()}</p>
                    <a href={item.url} target="_blank" rel="noreferrer">Download</a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <footer>
        LUCARIO AGI • Powered by Graydient x DeepSeek
      </footer>
    </div>
  );
}

export default App;
