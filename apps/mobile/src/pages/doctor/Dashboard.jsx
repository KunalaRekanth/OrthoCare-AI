import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  dbGetDoctorProfile,
  dbGetDoctorAppointments,
  dbScheduleAppointment,
  dbCompleteAppointment,
  dbRejectAppointment,
  dbAddNotification,
  dbGetPatientProfile,
  dbGetPatientScans,
  dbGetDoctorReviews,
  dbVerifyAppointmentPayment
} from '../../utils/supabaseService';
import { Check, User, FileText, Star, Award, AlertTriangle, MapPin, CheckCircle, Navigation, XCircle, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [patientProfiles, setPatientProfiles] = useState({});

  const [reviews, setReviews] = useState([]);
  const [schedulingApptId, setSchedulingApptId] = useState(null);
  const [schedulingPatientId, setSchedulingPatientId] = useState(null);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [activeFilter, setActiveFilter] = useState('pending'); // pending, scheduled, completed, rejected

  const loadDashboardData = async () => {
    try {
      const [prof, appts, revs] = await Promise.all([
        dbGetDoctorProfile(user.id),
        dbGetDoctorAppointments(user.id),
        dbGetDoctorReviews(user.id)
      ]);

      setProfile(prof);
      
      const formattedAppts = (appts || []).map(appt => {
        let fallback = {};
        try {
          const stored = localStorage.getItem(`payment_appt_fallback_${appt.id}`);
          if (stored) fallback = JSON.parse(stored);
        } catch (e) {}
        return {
          ...appt,
          payment_status: appt.payment_status !== undefined ? appt.payment_status : (fallback.payment_status || 'unpaid'),
          payment_reference: appt.payment_reference !== undefined ? appt.payment_reference : fallback.payment_reference
        };
      });
      setAppointments(formattedAppts);
      setReviews(revs);

      // Pre-fetch unique patient profiles
      const patientIds = [...new Set((appts || []).map(a => a.patient_id))];
      const profiles = { ...patientProfiles };
      await Promise.all(patientIds.map(async (pid) => {
        if (!profiles[pid]) {
          const p = await dbGetPatientProfile(pid);
          profiles[pid] = p;
        }
      }));
      setPatientProfiles(profiles);

    } catch (err) {
      console.error('Error loading dashboard data:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 10000);
    return () => clearInterval(interval);
  }, [user.id]);

  const handleViewPatient = async (patientId) => {
    try {
      const patProfile = patientProfiles[patientId] || await dbGetPatientProfile(patientId);
      const scans = await dbGetPatientScans(patientId);
      setPatientData({ profile: patProfile, scan: scans[0] || null });
      setSelectedPatientId(patientId);
    } catch (err) {
      console.error('Error viewing patient:', err);
    }
  };

  const handleScheduleClick = (appointmentId, patientId) => {
    setSchedulingApptId(appointmentId);
    setSchedulingPatientId(patientId);
    setScheduleDate('');
    setScheduleTime('');
  };

  const confirmSchedule = async () => {
    if (!scheduleDate || !scheduleTime) return;

    try {
      const dateTimeString = `${scheduleDate}T${scheduleTime}`;
      const date = new Date(dateTimeString);

      await dbScheduleAppointment(schedulingApptId, date.toISOString());

      const formattedDate = date.toLocaleDateString();
      const formattedTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      await dbAddNotification(schedulingPatientId, `Your appointment with Dr. ${profile?.name || 'the doctor'} has been scheduled for ${formattedDate} at ${formattedTime}.`);

      loadDashboardData();
      setSchedulingApptId(null);
      setSchedulingPatientId(null);
      setSelectedPatientId(null);
    } catch (err) {
      console.error('Error scheduling appointment:', err);
      alert('Failed to schedule appointment.');
    }
  };

  const cancelSchedule = () => {
    setSchedulingApptId(null);
    setSchedulingPatientId(null);
  };

  const handleComplete = async (appointmentId, patientId) => {
    try {
      await dbCompleteAppointment(appointmentId);
      await dbAddNotification(patientId, `Your treatment with Dr. ${profile?.name || 'the doctor'} is complete! Please leave a review.`);
      loadDashboardData();
    } catch (err) {
      console.error('Error completing treatment:', err);
    }
  };

  const handleReject = async (appointmentId, patientId) => {
    if (!window.confirm('Are you sure you want to reject this appointment request?')) return;
    try {
      await dbRejectAppointment(appointmentId);
      await dbAddNotification(patientId, `Your appointment request with Dr. ${profile?.name || 'the doctor'} was not accepted at this time.`);
      loadDashboardData();
    } catch (err) {
      console.error('Error rejecting appointment:', err);
    }
  };

  const handleVerifyPayment = async (appointmentId, patientId, isApproved) => {
    if (!window.confirm(`Are you sure you want to ${isApproved ? 'approve' : 'decline'} this payment?`)) return;
    try {
      await dbVerifyAppointmentPayment(appointmentId, isApproved);
      
      const msg = isApproved 
        ? `Your payment of ₹${profile?.consultationFee || 500} has been approved! Dr. ${profile?.name || 'the doctor'} has confirmed your scheduled appointment.`
        : `Your payment reference was not accepted. Please verify your transaction ref number and pay again.`;
        
      await supabase
        .from('notifications')
        .insert([{ 
          to_user_id: patientId, 
          message: msg, 
          type: isApproved ? 'success' : 'warning',
          read: false
        }]);

      loadDashboardData();
    } catch (err) {
      console.error('Error verifying payment:', err);
      alert('Failed to verify payment: ' + (err.message || JSON.stringify(err)));
    }
  };



  return (
    <div className="animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Doctor Dashboard</h2>
          <p style={{ color: 'var(--text-muted)' }}>Welcome back, {profile?.name || 'Doctor'}</p>
        </div>
      </div>

      {/* Filter Buttons */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {['pending', 'scheduled', 'completed', 'rejected'].map(status => (
          <button
            key={status}
            onClick={() => setActiveFilter(status)}
            className={`btn ${activeFilter === status ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              padding: '0.6rem 1.5rem', 
              textTransform: 'capitalize',
              flexShrink: 0,
              background: activeFilter === status ? (status === 'rejected' ? 'var(--danger)' : status === 'scheduled' ? 'var(--secondary)' : 'var(--primary)') : 'var(--glass-bg)'
            }}
          >
            {status} ({appointments.filter(a => a.status === status).length})
          </button>
        ))}
      </div>



      <div style={{ display: 'grid', gridTemplateColumns: (selectedPatientId && patientData) ? '1fr 1fr' : '1fr', gap: '2rem' }}>
         {/* Appointments List */}
         <div>
           <h3 style={{ marginBottom: '1.5rem', textTransform: 'capitalize' }}>{activeFilter} Appointments</h3>
           {appointments.filter(a => a.status === activeFilter).length === 0 ? (
             <div className="card text-center" style={{ color: 'var(--text-muted)', padding: '3rem' }}>
               No {activeFilter} appointments found.
             </div>
           ) : (
             <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
               {appointments.filter(a => a.status === activeFilter).map(appt => {
                 const pat = patientProfiles[appt.patient_id];
                 return (
                   <div key={appt.id} className="card" style={{ 
                     borderLeft: `4px solid ${
                       appt.status === 'pending' ? 'var(--warning)' : 
                       appt.status === 'scheduled' ? 'var(--secondary)' : 
                       appt.status === 'rejected' ? 'var(--danger)' : 'var(--primary)'
                     }` 
                   }}>
                     <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                       <div className="flex-center" style={{ gap: '1rem' }}>
                         <div style={{ background: 'var(--bg-dark)', padding: '0.75rem', borderRadius: '50%' }}>
                           <User size={20} color="var(--primary)" />
                         </div>
                         <div>
                           <h4 style={{ margin: 0 }}>{pat?.full_name || 'Unknown Patient'}</h4>
                           <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                             {appt.status === 'pending' ? 'Requested on ' : 'Updated on '} {new Date(appt.updated_at || appt.created_at).toLocaleDateString()}
                           </span>
                         </div>
                       </div>
                       <span className={`badge ${
                         appt.status === 'pending' ? 'badge-warning' : 
                         appt.status === 'completed' ? 'badge-primary' : 
                         appt.status === 'rejected' ? 'badge-danger' : 'badge-success'
                       }`}>
                         {appt.status.toUpperCase()}
                       </span>
                     </div>
 
                     <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                       <button
                         className="btn btn-secondary"
                         style={{ flex: 1, padding: '0.5rem', minWidth: '120px' }}
                         onClick={() => handleViewPatient(appt.patient_id)}
                       >
                         <FileText size={16} /> Details
                       </button>
 
                       {appt.status === 'pending' && (
                         <>
                           <button
                             className="btn btn-primary"
                             style={{ flex: 1, padding: '0.5rem', background: 'var(--secondary)', minWidth: '120px' }}
                             onClick={() => handleScheduleClick(appt.id, appt.patient_id)}
                           >
                             <Check size={16} /> Schedule
                           </button>
                           <button
                             className="btn"
                             style={{ flex: 1, padding: '0.5rem', background: 'var(--danger)', color: 'white', border: 'none', minWidth: '120px' }}
                             onClick={() => handleReject(appt.id, appt.patient_id)}
                           >
                             <XCircle size={16} /> Reject
                           </button>
                         </>
                       )}
 
                        {appt.status === 'scheduled' && (
                          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.4)', border: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {appt.payment_status === 'pending_verification' ? (
                                <div>
                                  <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.85rem', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                    <AlertTriangle size={14} /> <strong>Payment Verification Required</strong>
                                  </p>
                                  <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                    Patient Ref No: <code style={{ color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px' }}>{appt.payment_reference}</code>
                                  </p>
                                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button
                                      className="btn"
                                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.2)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.3)', cursor: 'pointer' }}
                                      onClick={() => handleVerifyPayment(appt.id, appt.patient_id, true)}
                                    >
                                      Approve
                                    </button>
                                    <button
                                      className="btn"
                                      style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.25)', color: '#EF4444', border: '1px solid rgba(239, 68, 68, 0.3)', cursor: 'pointer' }}
                                      onClick={() => handleVerifyPayment(appt.id, appt.patient_id, false)}
                                    >
                                      Decline
                                    </button>
                                  </div>
                                </div>
                              ) : appt.payment_status === 'paid' ? (
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <CheckCircle size={14} /> Payment Verified & Approved
                                </p>
                              ) : (
                                <p style={{ margin: 0, fontSize: '0.85rem', color: '#F59E0B', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <AlertTriangle size={14} /> Awaiting Patient Payment (₹{profile?.consultationFee || 500})
                                </p>
                              )}
                            </div>
                            
                            <button
                              className="btn btn-primary"
                              style={{ width: '100%', padding: '0.5rem' }}
                              onClick={() => handleComplete(appt.id, appt.patient_id)}
                              disabled={appt.payment_status !== 'paid'}
                              title={appt.payment_status !== 'paid' ? 'Payment must be verified to complete treatment' : ''}
                            >
                              <Award size={16} /> Complete Treatment
                            </button>
                          </div>
                        )}
                     </div>
                   </div>
                 );
               })}
             </div>
           )}
         </div>

        {/* Patient Detail View */}
        {selectedPatientId && patientData && (
          <div className="card animate-fade-in" style={{ position: 'sticky', top: '100px', alignSelf: 'start' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>Patient Overview</h3>
              <button onClick={() => setSelectedPatientId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>Close</button>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>CONTACT INFO</h4>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Name:</strong> {patientData.profile?.full_name}</p>
              <p style={{ margin: '0 0 0.5rem 0' }}><strong>Phone:</strong> {patientData.profile?.phone}</p>
              <p style={{ margin: 0 }}><strong>Address:</strong> {patientData.profile?.address}</p>
            </div>

            {patientData.scan ? (
              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>AI PRELIMINARY ANALYSIS</h4>
                <div style={{ background: 'rgba(15, 23, 42, 0.5)', padding: '1rem', borderRadius: '8px', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <strong>Severity:</strong>
                    <span style={{ textTransform: 'capitalize', color: patientData.scan.analysis_result?.severity === 'severe' ? 'var(--danger)' : patientData.scan.analysis_result?.severity === 'moderate' ? 'var(--warning)' : 'var(--secondary)' }}>
                      {patientData.scan.analysis_result?.severity}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <strong>AI Score:</strong>
                    <span>{patientData.scan.analysis_result?.score}/100</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  <img src={patientData.scan.left_img} alt="Left" style={{ width: '100%', borderRadius: '4px' }} />
                  <img src={patientData.scan.front_img} alt="Front" style={{ width: '100%', borderRadius: '4px' }} />
                  <img src={patientData.scan.right_img} alt="Right" style={{ width: '100%', borderRadius: '4px' }} />
                </div>
              </div>
            ) : (
              <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>No AI scan results available.</p>
            )}

            {/* Added: Patient Review in detail view */}
            {reviews.find(r => r.patient_id === selectedPatientId) && (
              <div style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '1.5rem' }}>
                <h4 style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>PATIENT FEEDBACK</h4>
                <div className="card" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                  {(() => {
                    const r = reviews.find(rev => rev.patient_id === selectedPatientId);
                    return (
                      <>
                        <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '0.5rem' }}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} size={14} fill={star <= r.rating ? 'var(--warning)' : 'transparent'} color={star <= r.rating ? 'var(--warning)' : 'var(--text-muted)'} />
                          ))}
                        </div>
                        <p style={{ margin: 0, fontSize: '0.85rem', fontStyle: 'italic' }}>"{r.text}"</p>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Reviews Section */}
      <div style={{ marginTop: '4rem' }}>
        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Star size={20} color="var(--warning)" fill="var(--warning)" /> Patient Reviews ({reviews.length})
        </h3>

        {reviews.length === 0 ? (
          <div className="card text-center" style={{ color: 'var(--text-muted)', padding: '3rem' }}>
            No reviews yet. Complete treatments to receive patient feedback!
          </div>
        ) : (
          <div className="grid-2">
            {reviews.map(review => {
              const patient = patientProfiles[review.patient_id];
              return (
                <div key={review.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={16}
                          color={star <= review.rating ? 'var(--warning)' : '#475569'}
                          fill={star <= review.rating ? 'var(--warning)' : 'transparent'}
                        />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    <strong>Patient:</strong> {patient?.full_name || 'Unknown Patient'}
                  </div>
                  <p style={{ margin: 0, fontStyle: 'italic', color: 'var(--text-main)' }}>"{review.text}"</p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Scheduling Modal */}
      {schedulingApptId && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card animate-fade-in" style={{ width: '90%', maxWidth: '400px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem' }}>Schedule Appointment</h3>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date</label>
              <input
                type="date"
                className="input"
                value={scheduleDate}
                onChange={e => setScheduleDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>Time</label>
              <input
                type="time"
                className="input"
                value={scheduleTime}
                onChange={e => setScheduleTime(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1 }} onClick={cancelSchedule}>Cancel</button>
              <button
                className="btn btn-primary"
                style={{ flex: 1 }}
                onClick={confirmSchedule}
                disabled={!scheduleDate || !scheduleTime}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
