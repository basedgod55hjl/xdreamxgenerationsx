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
  const [loading, setLoading] = useState(false);
  const [imageResult, setImageResult] = useState(null);
  const [error, setError] = useState('');

  // Face Swap State
  const [sourceImage, setSourceImage] = useState(null);
  const [targetImage, setTargetImage] = useState(null);

  // New states for tabs and vision
  const [activeTab, setActiveTab] = useState('gen'); // 'gen', 'swap', 'vision'
  const [workflow, setWorkflow] = useState('Lucario NSFW'); // 'Lucario NSFW', 'Photorealistic', 'Anime / Booru', 'Cinematic'
  const [analysisResult, setAnalysisResult] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

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
      setImageResult(data.url || data.image || data.output_url);
      incrementUsage();

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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Face Swap Failed');

      setImageResult(data.url || data.image);
      incrementUsage();

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

      <div className="nav-tabs">
        <button
          className={activeTab === 'gen' ? 'active' : ''}
          onClick={() => setActiveTab('gen')}
        >
          Image Gen
        </button>
        <button
          className={activeTab === 'swap' ? 'active' : ''}
          onClick={() => setActiveTab('swap')}
        >
          Face Swap
        </button>
        <button
          className={activeTab === 'vision' ? 'active' : ''}
          onClick={() => setActiveTab('vision')}
        >
          Image Analysis 👁️
        </button>
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

        {activeTab === 'vision' && (
          <div className="faceswap-area">
            <div className="upload-box full-width">
              <h3>📸 Image Analysis</h3>
              <p style={{ color: '#666', marginBottom: '1rem' }}>Upload an image to extract visual tags and generate a detailed description.</p>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  // Mock analysis for now since API is 404
                  const file = e.target.files[0];
                  if (file) {
                    setAnalyzing(true);
                    setTimeout(() => {
                      setAnalysisResult(`### VISUAL ELEMENTS:
The image captures a subject with high detail. Lighting is roughly balanced... (Simulated Result - Vision API unavailable)
                                            
### PROMPT SUGGESTION:
1girl, detailed face, (photorealistic:1.4), masterpiece...`);
                      setAnalyzing(false);
                    }, 2000);
                  }
                }}
              />
              {analyzing && <div className="loading-spinner" style={{ marginTop: '1rem' }}></div>}
            </div>

            {analysisResult && (
              <div className="result-area full-width" style={{ display: 'block', padding: '1.5rem', whiteSpace: 'pre-wrap', textAlign: 'left', color: '#ccc' }}>
                {analysisResult}
              </div>
            )}
          </div>
        )}

        {/* Results Area (Global) */}
        <div className="result-area">
          {loading && <div className="loading-spinner"></div>}
          {error && <div style={{ color: '#ff4d4d' }}>{error}</div>}
          {imageResult && (
            <div className="result-container">
              <img src={imageResult} alt="Generated Art" className="generated-image" />
              <a href={imageResult} download={`lucario_agi_${Date.now()}.png`} className="download-btn">
                Download
              </a>
            </div>
          )}
          {!loading && !imageResult && !error && (
            <p style={{ color: 'rgba(255,255,255,0.2)' }}>
              {activeTab === 'gen' ? 'Unrestricted AGI awaits.' : (activeTab === 'swap' ? 'Upload images to swap.' : 'Upload for Analysis.')}
            </p>
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
