import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dbGetPatientScans } from '../../utils/supabaseService';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

const Results = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scan, setScan] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLatestScan = async () => {
      try {
        // Pass true for images, but limit to 1 so we don't download historical images
        const scans = await dbGetPatientScans(user.id, true, 1);
        if (scans && scans.length > 0) {
          const latest = scans[0];
          // Map DB fields to what the component expects
          setScan({
            leftImg: latest.left_img,
            frontImg: latest.front_img,
            rightImg: latest.right_img,
            analysisResult: {
              severity: latest.analysis_result?.severity || 'minor',
              score: latest.analysis_result?.score || 0,
              conditions: latest.analysis_result?.conditions || [],
              suggestions: latest.analysis_result?.suggestions || [],
              needsDoctor: (latest.analysis_result?.severity || 'minor') !== 'minor',
              matchedImage: latest.analysis_result?.matchedImage || null,
              similarity: latest.analysis_result?.similarity || null
            }
          });
        } else {
          navigate('/patient/scan');
        }
      } catch (err) {
        console.error('Error fetching scan:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLatestScan();
  }, [user.id, navigate]);

  if (loading) return <div className="flex-center min-h-screen">Loading results...</div>;
  if (!scan) return null;

  const { analysisResult } = scan;

  const getSeverityColor = () => {
    switch(analysisResult.severity) {
      case 'minor': return 'var(--secondary)';
      case 'moderate': return 'var(--warning)';
      case 'severe': return 'var(--danger)';
      default: return 'var(--primary)';
    }
  };

  const getSeverityIcon = () => {
    switch(analysisResult.severity) {
      case 'minor': return <CheckCircle size={48} color={getSeverityColor()} />;
      case 'moderate': return <Info size={48} color={getSeverityColor()} />;
      case 'severe': return <AlertCircle size={48} color={getSeverityColor()} />;
      default: return null;
    }
  };

  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2>Analysis Results</h2>
        <p>AI Assessment of your recent scan</p>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="flex-center" style={{ flexDirection: 'column', gap: '1rem', textAlign: 'center', marginBottom: '2rem' }}>
            {getSeverityIcon()}
            <h3 style={{ color: getSeverityColor(), textTransform: 'capitalize' }}>
              {analysisResult.severity} Issue Detected
            </h3>
            <p>Score: {analysisResult.score}/100 (Higher score indicates more severity)</p>
            {analysisResult.matchedImage && (
              <div style={{
                marginTop: '0.5rem',
                fontSize: '0.9rem',
                color: 'var(--secondary)',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '0.4rem 1rem',
                borderRadius: '20px',
                border: '1px solid var(--secondary)',
                display: 'inline-block'
              }}>
                Matched Dataset Case: <strong>{analysisResult.matchedImage}</strong> ({Math.round(analysisResult.similarity * 100)}% similarity)
              </div>
            )}
          </div>

          <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Observations</h4>
          <ul style={{ listStylePosition: 'inside', marginBottom: '2rem', color: 'var(--text-muted)' }}>
            {analysisResult.conditions.map((cond, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>{cond}</li>
            ))}
          </ul>

          <h4 style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Recommendations</h4>
          <ul style={{ listStylePosition: 'inside', color: 'var(--text-muted)' }}>
            {analysisResult.suggestions.map((sug, i) => (
              <li key={i} style={{ marginBottom: '0.5rem' }}>{sug}</li>
            ))}
          </ul>
        </div>

        <div>
          <div className="card" style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem' }}>Uploaded Images</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <img src={scan.leftImg} alt="Left" style={{ width: '100%', borderRadius: '8px' }} />
              <img src={scan.frontImg} alt="Front" style={{ width: '100%', borderRadius: '8px' }} />
              <img src={scan.rightImg} alt="Right" style={{ width: '100%', borderRadius: '8px', gridColumn: 'span 2' }} />
            </div>
          </div>

          <div className="card" style={{ background: analysisResult.needsDoctor ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)' }}>
            <h3 style={{ marginBottom: '1rem' }}>Next Steps</h3>
            {analysisResult.needsDoctor ? (
              <>
                <p style={{ marginBottom: '1.5rem' }}>
                  Based on the analysis, we strongly recommend consulting an orthodontic specialist for a comprehensive evaluation.
                </p>
                <Link to="/patient/doctors" className="btn btn-primary" style={{ width: '100%' }}>
                  View Available Doctors
                </Link>
              </>
            ) : (
              <>
                <p style={{ marginBottom: '1.5rem' }}>
                  Your dental health looks relatively good. Maintain regular brushing and flossing routines.
                </p>
                <Link to="/patient/home" className="btn btn-secondary" style={{ width: '100%' }}>
                  Return to Dashboard
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Results;
