import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dbLogin } from '../../utils/supabaseService';
import { supabase } from '../../utils/supabaseClient';

const Login = () => {
  const { role } = useParams(); // 'patient' or 'doctor'
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [resetMsg, setResetMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await dbLogin(email, password);
      
      if (user.role !== role) {
        setError(`No ${role} account found with this email.`);
        setLoading(false);
        return;
      }

      login(user);
      
      if (role === 'doctor' && !user.credential_verified) {
          navigate('/doctor/verify-credentials');
      } else if (!user.profile_complete) {
        navigate(`/${role}/profile`);
      } else {
        navigate(role === 'patient' ? '/patient/home' : '/doctor/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    
    setError('');
    setResetMsg('');
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false
        }
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please wait a few minutes.');
        }
        if (error.message.includes('Signups not allowed for otp')) {
          throw new Error('No account found with this email. Please register first.');
        }
        throw error;
      }

      navigate(`/auth/verify/${role}?email=${encodeURIComponent(email)}&mode=reset`);
    } catch (err) {
      setError(err.message || 'Error sending OTP. Make sure your account exists.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center min-h-screen" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {role === 'patient' ? 'Patient Login' : 'Doctor Login'}
        </h2>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        {resetMsg && (
          <div style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {resetMsg}
          </div>
        )}

        {!isForgotPassword ? (
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
              <div style={{ textAlign: 'right', marginTop: '0.5rem' }}>
                <button 
                  type="button" 
                  onClick={() => setIsForgotPassword(true)}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.85rem', cursor: 'pointer', padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleForgotPassword}>
            <p style={{ fontSize: '0.9rem', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              Enter your email and we will send you an OTP to reset your password.
            </p>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              <button 
                type="button" 
                onClick={() => { setIsForgotPassword(false); setError(''); setResetMsg(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.9rem', cursor: 'pointer' }}
              >
                Back to Login
              </button>
            </div>
          </form>
        )}

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          New here? <Link to={`/auth/register/${role}`}>Create an account</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
