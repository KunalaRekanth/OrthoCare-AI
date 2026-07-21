import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { dbGetUserByEmail } from '../../utils/supabaseService';

const Register = () => {
  const { role } = useParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // First, check if the email is already registered in our profiles table
      const existingUser = await dbGetUserByEmail(email);
      if (existingUser) {
        throw new Error('This email is already registered. Please login instead.');
      }

      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          data: { role } 
        }
      });

      if (error) {
        if (error.message.includes('rate limit')) {
          throw new Error('Email rate limit exceeded. Please wait a few minutes before trying again.');
        }
        if (error.message.includes('Error sending magic link email')) {
          throw new Error('Supabase failed to send the email. Ensure your SMTP settings are correct and you are sending to a verified email (Resend limit).');
        }
        throw error;
      }
      
      navigate(`/auth/verify/${role}?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err.message || 'Error sending OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-center min-h-screen" style={{ minHeight: 'calc(100vh - 80px)' }}>
      <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '400px' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          {role === 'patient' ? 'Patient Registration' : 'Doctor Registration'}
        </h2>
        
        <p style={{ textAlign: 'center', marginBottom: '2rem', fontSize: '0.9rem' }}>
          Enter your email to receive a verification OTP.
        </p>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#F87171', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
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
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem' }}>
          Already have an account? <Link to={`/auth/login/${role}`}>Login here</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
