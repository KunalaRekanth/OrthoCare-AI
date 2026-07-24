import { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { dbCreateUser, dbResetPassword } from '../../utils/supabaseService';
import { useAuth } from '../../context/AuthContext';

const SetPassword = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const mode = searchParams.get('mode');
  const { login } = useAuth();
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSetPassword = async (e) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (/\s/.test(password)) {
      setError('Password cannot contain spaces.');
      return;
    }

    setLoading(true);
    try {
      let user;
      if (mode === 'reset') {
        user = await dbResetPassword(password);
      } else {
        user = await dbCreateUser(email, password, role);
      }
      
      // Auto login (already handled by AuthContext state listener, but for safety)
      login(user);
      
      // Redirect logic
      if (mode === 'reset') {
        navigate(role === 'patient' ? '/patient/home' : '/doctor/dashboard');
      } else {
        if (role === 'doctor') {
          navigate('/doctor/verify-credentials');
        } else {
          navigate('/patient/profile');
        }
      }
    } catch (err) {
      setError(err.message || (mode === 'reset' ? 'Password reset failed. Please try again.' : 'Registration failed. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return <div className="container" style={{ textAlign: 'center', marginTop: '2rem' }}>Invalid request. Email is missing.</div>;
  }

  return (
    <div className="flex-center min-h-screen" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {mode === 'reset' ? 'Reset Password' : 'Set Password'}
        </h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          {mode === 'reset' ? 'Create a new secure password for your account.' : 'Create a secure password for your new account.'}
        </p>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSetPassword}>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input 
              type="password" 
              className="form-input" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Confirm Password</label>
            <input 
              type="password" 
              className="form-input" 
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
          </div>
          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? (mode === 'reset' ? 'Resetting...' : 'Completing Setup...') : (mode === 'reset' ? 'Reset Password' : 'Complete Setup')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetPassword;
