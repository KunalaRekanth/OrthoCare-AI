import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dbVerifyDoctorCredential } from '../../utils/supabaseService';
import { UploadCloud, FileText } from 'lucide-react';

const VerifyCredentials = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return;

    setIsVerifying(true);
    
    try {
      // In a real app, we would upload the file to Supabase Storage here
      // For now, we'll just mark the credential as verified in the database
      await dbVerifyDoctorCredential(user.id);
      
      // Update local state to reflect verification
      login({ ...user, credential_verified: true });
      navigate('/doctor/profile');
    } catch (error) {
      console.error('Verification error:', error);
      alert('Failed to submit verification: ' + (error.message || 'Unknown error'));
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="flex-center min-h-screen" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '500px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Credential Verification</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: '2rem' }}>
          To maintain network quality, we require proof of your medical credentials 
          (Hospital ID, Medical Degree, or Practice License).
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '2rem' }}>
            <label className="file-upload" style={{ display: 'block', borderColor: file ? 'var(--secondary)' : 'var(--glass-border)' }}>
              <input type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" />
              
              {!file ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
                  <UploadCloud size={48} />
                  <span>Click to upload document</span>
                  <span style={{ fontSize: '0.8rem' }}>PDF, JPG or PNG (Max 5MB)</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', color: 'var(--secondary)' }}>
                  <FileText size={48} />
                  <span style={{ fontWeight: '500' }}>{file.name}</span>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Ready to submit</span>
                </div>
              )}
            </label>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }} 
            disabled={!file || isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Submit for Verification'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default VerifyCredentials;
