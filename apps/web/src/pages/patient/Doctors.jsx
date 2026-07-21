import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dbGetAllDoctors, dbAddNotification } from '../../utils/supabaseService';
import { supabase } from '../../utils/supabaseClient';
import { MapPin, Phone, Search, User, Star, CheckCircle } from 'lucide-react';

const Doctors = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [baseDoctors, setBaseDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [requested, setRequested] = useState({});
  const [showReviews, setShowReviews] = useState({}); // { doctorId: boolean }
  const [loading, setLoading] = useState(true);

  // Fetch doctors + their reviews from Supabase
  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await dbGetAllDoctors();
        setBaseDoctors(data);

      } catch (err) {
        console.error('Error fetching doctors:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);




  const filteredDoctors = baseDoctors.filter(doc =>
    doc.profile?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.profile?.hospitalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    doc.profile?.address?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRequest = async (doctorId) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .insert([{ patient_id: user.id, doctor_id: doctorId, status: 'pending' }]);
      if (error) throw error;
      await dbAddNotification(doctorId, `New appointment request from a patient.`);
      setRequested(prev => ({ ...prev, [doctorId]: true }));
    } catch (err) {
      console.error('Error requesting appointment:', err);
      alert('Failed to send request: ' + err.message);
    }
  };


  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h2>Available Orthodontists</h2>
        <p>Find and connect with verified professionals near you.</p>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
          Search by hospital name and hospital address or city or district
        </p>
      </div>

      <div style={{ marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
        <div style={{ position: 'relative' }}>
          <Search style={{ position: 'absolute', top: '50%', left: '1rem', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} size={20} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by hospital, city or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: '3rem' }}
          />
        </div>
      </div>


      {loading ? (
        <div className="card text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
          Loading doctors...
        </div>
      ) : filteredDoctors.length === 0 ? (
        <div className="card text-center" style={{ padding: '3rem', color: 'var(--text-muted)' }}>
          No verified doctors found. Please check back later.
        </div>
      ) : (
        <div className="grid-2">
          {filteredDoctors.map(doc => {
            return (
              <div key={doc.id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ flex: 1 }}>
                  {/* Header */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <div style={{
                      width: '60px',
                      height: '60px',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      background: 'var(--primary-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {doc.profile?.profilePhotoUrl ? (
                        <img src={doc.profile.profilePhotoUrl} alt={doc.profile.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <User size={32} color="var(--primary)" />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.25rem' }}>
                        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          Dr. {doc.profile?.name}
                          {doc.verified && <CheckCircle size={16} color="var(--secondary)" fill="rgba(16, 185, 129, 0.1)" title="Verified Professional" />}
                        </h3>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-main)' }}>
                        {doc.profile?.hospitalName}
                      </p>
                    </div>
                  </div>

                  {/* Star Rating Row */}
                  <div 
                    style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', marginBottom: '0.75rem', cursor: 'pointer' }}
                    onClick={() => setShowReviews(prev => ({ ...prev, [doc.id]: !prev[doc.id] }))}
                  >
                    {[1, 2, 3, 4, 5].map(star => (
                      <Star 
                        key={star} 
                        size={16} 
                        fill={star <= Math.round(doc.avgRating || 0) ? 'var(--warning)' : 'transparent'} 
                        color={star <= Math.round(doc.avgRating || 0) ? 'var(--warning)' : 'var(--text-muted)'} 
                      />
                    ))}
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginLeft: '0.5rem', fontWeight: '500' }}>
                      {doc.avgRating > 0 ? doc.avgRating.toFixed(1) : 'No reviews'} ({doc.reviewCount || 0})
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--primary)', marginLeft: 'auto' }}>
                      {showReviews[doc.id] ? 'Hide' : 'View Reviews'}
                    </span>
                  </div>

                  {/* Expandable Reviews List */}
                  {showReviews[doc.id] && (
                    <div style={{ 
                      background: 'var(--bg-dark)', 
                      padding: '1rem', 
                      borderRadius: '8px', 
                      marginBottom: '1rem',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid var(--glass-border)'
                    }}>
                      {doc.reviews?.length > 0 ? (
                        doc.reviews.map(rev => (
                          <div key={rev.id} style={{ marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>{rev.patientName}</span>
                              <div style={{ display: 'flex', gap: '2px' }}>
                                {[1,2,3,4,5].map(s => (
                                  <Star key={s} size={10} fill={s <= rev.rating ? 'var(--warning)' : 'transparent'} color={s <= rev.rating ? 'var(--warning)' : 'var(--text-muted)'} />
                                ))}
                              </div>
                            </div>
                            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-main)', fontStyle: 'italic' }}>"{rev.text}"</p>
                          </div>
                        ))
                      ) : (
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>No written reviews yet.</p>
                      )}
                    </div>
                  )}

                  {/* Hospital */}
                  <p style={{ color: 'var(--text-main)', fontWeight: '500', marginBottom: '0.5rem' }}>
                    {doc.profile?.hospitalName}
                  </p>

                  {/* Address */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <MapPin size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                    <div>
                      <span>{doc.profile?.address}</span><br />
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(doc.profile?.address + ', ' + doc.profile?.hospitalName)}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '0.85rem', color: 'var(--primary)', textDecoration: 'none', display: 'inline-block', marginTop: '0.25rem' }}
                      >
                        View on Map →
                      </a>
                    </div>
                  </div>

                  {/* Phone */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    <Phone size={16} />
                    <span>{doc.profile?.phone}</span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ marginTop: 'auto' }}>
                  <button
                    className={`btn ${requested[doc.id] ? 'btn-secondary' : 'btn-primary'}`}
                    style={{ width: '100%' }}
                    onClick={() => handleRequest(doc.id)}
                    disabled={requested[doc.id]}
                  >
                    {requested[doc.id] ? '✓ Request Sent' : 'Request Appointment'}
                  </button>
                </div>

                {requested[doc.id] && (
                  <button
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '0.75rem', background: 'var(--primary)', color: 'white' }}
                    onClick={() => navigate('/patient/home')}
                  >
                    Return to Patient Dashboard
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Doctors;
