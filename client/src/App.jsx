import React, { useState } from 'react';
import './index.css';

// Top 3 Models configuration
const TOP_MODELS = [
  { id: 'flux-realism', name: 'Flux Realism V2', description: 'Photorealistic, high fidelity details' },
  { id: 'midjourney-style', name: 'Artistic MJ V6', description: 'Creative, abstract, painterly aesthetics' },
  { id: 'anime-master', name: 'Niji Express', description: 'Best for anime, manga, and cel-shaded styles' }
];

// Top 10 Concepts configuration
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

  const toggleConcept = (concept) => {
    if (selectedConcepts.includes(concept)) {
      setSelectedConcepts(prev => prev.filter(c => c !== concept));
    } else {
      setSelectedConcepts(prev => [...prev, concept]);
    }
  };

  const handleGenerate = async () => {
    if (!prompt && selectedConcepts.length === 0) return;

    setLoading(true);
    setError('');
    setImageResult(null);

    try {
      // Combine prompt with selected concepts
      const finalPrompt = `${prompt} ${selectedConcepts.join(', ')}`.trim();

      // In production, this points to our Express backend
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          model: selectedModel
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate image');
      }

      // Assuming API returns { url: "..." } or { image: "base64..." }
      // Adjust based on actual Graydient response structure
      setImageResult(data.url || data.image || data.output_url);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app">
      <h1>Graydient Gen</h1>
      <p className="subtitle">Premium AI Image Studio</p>

      <div className="container">

        {/* Model Selection */}
        <div>
          <span className="section-title">Select Model</span>
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
        <div className="input-area">
          <input
            type="text"
            placeholder="Describe your vision..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
          />
          <button
            className="generate-btn"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? 'Creat...' : 'Generate'}
          </button>
        </div>

        {/* Results Area */}
        <div className="result-area">
          {loading && <div className="loading-spinner"></div>}
          {error && <div style={{ color: '#ff4d4d' }}>{error}</div>}
          {imageResult && (
            <img src={imageResult} alt="Generated Art" className="generated-image" />
          )}
          {!loading && !imageResult && !error && (
            <p style={{ color: 'rgba(255,255,255,0.2)' }}>Art awaits your command</p>
          )}
        </div>

      </div>

      <footer>
        Powered by Graydient API • React • Vite
      </footer>
    </div>
  );
}

export default App;
