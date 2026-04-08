import React, { useState, useRef } from 'react';
import { UploadCloud } from 'lucide-react';
import type { AnalysisResult } from './utils/parser';
import { parseRunDataFiles } from './utils/parser';
import { Dashboard } from './components/Dashboard';
import './index.css';

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [data, setData] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const processFiles = async (files: FileList) => {
    const fileArray = Array.from(files).filter(f => f.name.endsWith('.json') || f.name.endsWith('.run'));
    if (fileArray.length === 0) return;
    
    setIsLoading(true);
    // Parse in small chunks or let the parser handle it (runs in browser memory)
    // Add small delay to let UI render loading state
    await new Promise(r => setTimeout(r, 100));
    
    try {
      const result = await parseRunDataFiles(fileArray);
      setData(result);
    } catch (err) {
      console.error(err);
      alert('Error parsing run files.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  return (
    <div className="app-container">
      <header className="header">
        <h1>Slay the Spire 2 Insights</h1>
        <p>A Web App implementation for your local Slay the Spire Run data analytics</p>
      </header>

      {!data && (
        <div 
          className={`upload-zone ${isDragging ? 'drag-active' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            multiple 
            accept=".json,.run"
            onChange={handleFileChange} 
          />
          <UploadCloud className="upload-icon" />
          <div className="upload-text">
            {isLoading ? (
              <h3>Processing Data...</h3>
            ) : (
              <>
                <h3>Drop your Run History JSON files here</h3>
                <p>or click to browse. Analyze directly in your browser – 100% private.</p>
                <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>
                  Windows: C:\Users\... \SlayTheSpire2\steam\...\profile1\saves\history<br/>
                  Mac: ~/Library/Application Support/SlayTheSpire2/...
                </p>
              </>
            )}
          </div>
        </div>
      )}

      {data && (
        <Dashboard data={data} onReset={() => setData(null)} />
      )}
    </div>
  );
}

export default App;
