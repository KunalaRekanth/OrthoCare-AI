import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { verifyOTP, getLatestOTP } from '../../utils/storage';
import { supabase } from '../../utils/supabaseClient';

const VerifyOTP = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');
  const mode = searchParams.get('mode');
  
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [simulatedOTP, setSimulatedOTP] = useState(null);
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(120);
  const [canResend, setCanResend] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');


  useEffect(() => {
    if (email) {
      setSimulatedOTP(getLatestOTP(email));
    }

    let interval;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
    }

    return () => clearInterval(interval);
  }, [email, timer]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleResend = async () => {
    if (!canResend) return;
    
    setResendLoading(true);
    setError('');
    setResendMessage('');

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: mode !== 'reset',
          data: { role }
        }
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          throw new Error('Email rate limit exceeded. Please wait a hour before trying again.');
        }
        if (error.message.includes('Error sending magic link email')) {
          throw new Error('Supabase failed to send the email. This is often due to project limits or SMTP settings.');
        }
        if (error.message.includes('Signups not allowed for otp')) {
          throw new Error('No account found with this email. Please register first.');
        }
        throw error;
      }

      setResendMessage('A new OTP has been sent to your email.');
      setTimer(120);
      setCanResend(false);
    } catch (err) {
      setError(err.message || 'Error resending OTP');
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email'
      });

      if (error) {
        // Fallback for some Supabase configs where 'magiclink' type is used for OTP
        if (error.message.includes('invalid') || error.message.includes('expired')) {
             const fallback = await supabase.auth.verifyOtp({
                email,
                token: otp,
                type: 'magiclink'
             });
             if (fallback.error) throw error;
        } else {
            throw error;
        }
      }
      
      const nextUrl = `/auth/set-password/${role}?email=${encodeURIComponent(email)}${mode ? `&mode=${mode}` : ''}`;
      navigate(nextUrl);
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
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
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>Verify OTP</h2>
        <p style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Enter the 6-digit OTP sent to <strong>{email}</strong>
        </p>
        
        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}


        <form onSubmit={handleVerify}>
          <div className="form-group">
            <input 
              type="text" 
              className="form-input" 
              required
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="Enter 6-digit OTP"
              maxLength="6"
              style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify OTP'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          {!canResend ? (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Resend OTP in <span style={{ color: 'var(--primary)', fontWeight: 'bold' }}>{formatTime(timer)}</span>
            </p>
          ) : (
            <button 
              onClick={handleResend} 
              className="btn-link" 
              style={{ color: 'var(--primary)', fontWeight: '600', background: 'none', border: 'none', cursor: 'pointer' }}
              disabled={resendLoading}
            >
              {resendLoading ? 'Resending...' : 'Resend OTP'}
            </button>
          )}
          {resendMessage && (
            <p style={{ fontSize: '0.8rem', color: 'var(--secondary)', marginTop: '0.5rem' }}>
              {resendMessage}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
