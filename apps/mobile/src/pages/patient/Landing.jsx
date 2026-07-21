import { Link } from 'react-router-dom';
import { ShieldCheck, Activity, BrainCircuit } from 'lucide-react';

const Landing = () => {
  return (
    <div className="animate-fade-in">
      <div style={{ textAlign: 'center', margin: '4rem 0' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', fontFamily: 'Outfit' }}>
          AI-Powered <span style={{ color: 'var(--primary)' }}>Orthodontic</span> Care
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          Get instant, professional orthodontic analysis using our advanced AI. 
          Upload a few simple photos and receive personalized guidance in seconds.
        </p>
        <div className="flex-center" style={{ gap: '1.5rem' }}>
          <Link to="/auth/register/patient" className="btn btn-primary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
            Get Started
          </Link>
          <Link to="/auth/login/patient" className="btn btn-secondary" style={{ padding: '1rem 2.5rem', fontSize: '1.1rem' }}>
            Login
          </Link>
        </div>
      </div>

      <div className="grid-3" style={{ marginTop: '5rem' }}>
        <div className="card text-center flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(79, 70, 229, 0.1)', padding: '1rem', borderRadius: '50%' }}>
            <Activity size={32} color="var(--primary)" />
          </div>
          <h3>Quick Analysis</h3>
          <p>Get results in seconds. Our AI instantly analyzes your teeth images for minor, moderate, or severe issues.</p>
        </div>
        
        <div className="card text-center flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.1)', padding: '1rem', borderRadius: '50%' }}>
            <BrainCircuit size={32} color="var(--secondary)" />
          </div>
          <h3>AI-Driven Accuracy</h3>
          <p>Built on thousands of clinical datasets to provide reliable preliminary guidance for your dental health.</p>
        </div>

        <div className="card text-center flex-center" style={{ flexDirection: 'column', gap: '1rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '1rem', borderRadius: '50%' }}>
            <ShieldCheck size={32} color="var(--warning)" />
          </div>
          <h3>Connect with Experts</h3>
          <p>If needed, seamlessly connect and schedule appointments with verified orthodontic professionals.</p>
        </div>
      </div>
    </div>
  );
};

export default Landing;
