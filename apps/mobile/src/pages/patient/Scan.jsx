import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, CheckCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyzeTeethImages } from '../../utils/storage';
import { dbSaveScan } from '../../utils/supabaseService';

const Scan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [images, setImages] = useState({
    left: null,
    front: null,
    right: null
  });
  const [previews, setPreviews] = useState({
    left: '',
    front: '',
    right: ''
  });
  
  const [analyzing, setAnalyzing] = useState(false);

  const handleFileChange = (view, e) => {
    const file = e.target.files[0];
    if (file) {
      setImages(prev => ({ ...prev, [view]: file }));
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [view]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!images.left || !images.front || !images.right) return;
    
    setAnalyzing(true);
    try {
      const result = await analyzeTeethImages(images.left, images.front, images.right);
      
      await dbSaveScan(user.id, {
        left_img: previews.left,
        front_img: previews.front,
        right_img: previews.right,
        analysis_result: {
          severity: result.severity,
          score: result.score,
          conditions: result.conditions,
          suggestions: result.suggestions
        }
      });

      navigate('/patient/results');
    } catch (err) {
      if (err.message.includes('blank') || err.message.includes('teeth/braces')) {
        alert(err.message);
      } else {
        alert('Error saving scan: ' + err.message);
      }
      setAnalyzing(false);
    }
  };

  const allUploaded = images.left && images.front && images.right;

  if (analyzing) {
    return (
      <div className="flex-center min-h-screen" style={{ minHeight: 'calc(100vh - 80px)', flexDirection: 'column', gap: '2rem' }}>
        <div style={{ position: 'relative', width: '100px', height: '100px' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '4px solid var(--glass-border)', borderRadius: '50%' }}></div>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, border: '4px solid var(--primary)', borderRadius: '50%', borderTopColor: 'transparent', animation: 'spin 1s linear infinite' }}></div>
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        </div>
        <h2 className="animate-fade-in">AI is analyzing your teeth...</h2>
        <p style={{ color: 'var(--text-muted)' }}>This may take a few moments.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2>Upload Teeth Images</h2>
        <p>Please upload clear images from three different angles for accurate AI analysis.</p>
      </div>

      <div className="grid-3" style={{ marginBottom: '3rem' }}>
        {['left', 'front', 'right'].map((view) => (
          <div key={view} className="card">
            <h3 style={{ textTransform: 'capitalize', marginBottom: '1rem', textAlign: 'center' }}>
              {view} View
            </h3>
            
            <label className="file-upload" style={{ display: 'block', borderColor: previews[view] ? 'var(--secondary)' : 'var(--glass-border)' }}>
              <input type="file" accept="image/*" onChange={(e) => handleFileChange(view, e)} />
              
              {!previews[view] ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <UploadCloud size={32} />
                  <span>Click to upload</span>
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <img src={previews[view]} alt={`${view} view`} className="image-preview" />
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'var(--bg-dark)', borderRadius: '50%', padding: '2px' }}>
                    <CheckCircle color="var(--secondary)" fill="var(--bg-dark)" />
                  </div>
                </div>
              )}
            </label>
          </div>
        ))}
      </div>

      <div className="flex-center">
        <button 
          className="btn btn-primary" 
          style={{ padding: '1rem 3rem', fontSize: '1.2rem' }}
          onClick={handleAnalyze}
          disabled={!allUploaded}
        >
          {allUploaded ? 'Analyze Now' : 'Upload All Images to Proceed'}
        </button>
      </div>
    </div>
  );
};

export default Scan;
