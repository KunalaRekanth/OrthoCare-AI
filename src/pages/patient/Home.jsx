import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { dbGetPatientProfile, dbGetPatientScans, dbSubmitAppointmentPayment } from '../../utils/supabaseService';
import { supabase } from '../../utils/supabaseClient';
import { Camera, Calendar, Clock, ArrowRight, Star, CreditCard, ShieldCheck, DollarSign, Printer } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();

  const [profile, setProfile] = useState(null);
  const [scans, setScans] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [doctorNames, setDoctorNames] = useState({});
  const [doctorPhones, setDoctorPhones] = useState({});
  const [doctorFees, setDoctorFees] = useState({});
  const [doctorUpis, setDoctorUpis] = useState({});
  const [doctorQrs, setDoctorQrs] = useState({});
  const [doctorHospitals, setDoctorHospitals] = useState({});
  const [doctorAddresses, setDoctorAddresses] = useState({});

  // OP Paper modal
  const [showOpModal, setShowOpModal] = useState(false);
  const [selectedOpAppt, setSelectedOpAppt] = useState(null);
  const [patientReviews, setPatientReviews] = useState([]);
  const [reviewApptId, setReviewApptId] = useState(null);
  const [viewReview, setViewReview] = useState(null); // Review to view
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState('');
  const [loading, setLoading] = useState(true);

  // Payment scanner modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [txnRef, setTxnRef] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const loadData = async () => {
    try {
      // Fetch profile, scans, and appointments in parallel
      const [prof, scanData, { data: appts }] = await Promise.all([
        dbGetPatientProfile(user.id),
        dbGetPatientScans(user.id, false), // false = don't download heavy images
        supabase
          .from('appointments')
          .select('*')
          .eq('patient_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      setProfile(prof);
      setScans(scanData || []);

      // Map appointment payment fallback
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

      // Fetch doctor names for all unique doctor IDs
      const doctorIds = [...new Set((appts || []).map(a => a.doctor_id))];
      if (doctorIds.length > 0) {
        // Use select('*') so query never fails when optional columns (upi_id, payment_qr_url)
        // haven't been added to the DB yet — localStorage fills in the gaps.
        let { data: doctorProfiles, error: dpError } = await supabase
          .from('doctor_profiles')
          .select('*')
          .in('user_id', doctorIds);

        // If even the basic query fails, try minimal columns
        if (dpError) {
          console.warn('doctor_profiles select(*) failed, retrying with basic columns:', dpError);
          const { data: basicProfiles } = await supabase
            .from('doctor_profiles')
            .select('user_id, name, phone')
            .in('user_id', doctorIds);
          doctorProfiles = basicProfiles;
        }

        const nameMap = {};
        const phoneMap = {};
        const feeMap = {};
        const upiMap = {};
        const qrMap = {};
        const hospitalMap = {};
        const addressMap = {};
        (doctorProfiles || []).forEach(d => { 
          nameMap[d.user_id] = d.name; 
          phoneMap[d.user_id] = d.phone;
          
          // Always read localStorage fallback (written when DB columns were missing)
          let fallback = {};
          try {
            const stored = localStorage.getItem(`payment_fallback_${d.user_id}`);
            if (stored) fallback = JSON.parse(stored);
          } catch (e) {}

          // Prefer DB value if it's a non-null, non-empty string; else use localStorage
          feeMap[d.user_id] = (d.consultation_fee != null) ? d.consultation_fee : (fallback.consultationFee || 500);
          upiMap[d.user_id] = (d.upi_id != null && d.upi_id !== '') ? d.upi_id : (fallback.upiId || '');
          qrMap[d.user_id] = (d.payment_qr_url != null && d.payment_qr_url !== '') ? d.payment_qr_url : (fallback.paymentQrUrl || '');
          hospitalMap[d.user_id] = d.hospital_name || '';
          addressMap[d.user_id] = d.address || '';
        });
        setDoctorNames(nameMap);
        setDoctorPhones(phoneMap);
        setDoctorFees(feeMap);
        setDoctorUpis(upiMap);
        setDoctorQrs(qrMap);
        setDoctorHospitals(hospitalMap);
        setDoctorAddresses(addressMap);
      }

      // Fetch patient's existing reviews
      const { data: reviews } = await supabase
        .from('reviews')
        .select('*')
        .eq('patient_id', user.id);
      setPatientReviews(reviews || []);

    } catch (err) {
      console.error('Error loading patient home data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user.id]);

  const getDoctorName = (docId) => doctorNames[docId] || 'Doctor';
  const getDoctorPhone = (docId) => doctorPhones[docId] || 'Unknown';

  const handleReviewSubmit = async (doctorId, apptId) => {
    if (!reviewText.trim()) return;
    try {
      const { data: review, error } = await supabase
        .from('reviews')
        .insert([{
          patient_id: user.id,
          doctor_id: doctorId,
          appointment_id: apptId,
          rating,
          text: reviewText
        }])
        .select()
        .single();

      if (error) throw error;

      setPatientReviews(prev => [...prev, review]);

      // Also add a notification to the doctor
      await supabase
        .from('notifications')
        .insert([{ to_user_id: doctorId, message: `You received a new ${rating}-star review from a patient.`, type: 'info' }]);

    } catch (err) {
      console.error('Error submitting review:', err);
      alert('Failed to submit review: ' + (err.message || JSON.stringify(err)));
    } finally {
      setReviewApptId(null);
      setReviewText('');
      setRating(5);
    }
  };

  const openPaymentModal = (appt) => {
    setSelectedAppt(appt);
    setTxnRef('');
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async () => {
    if (!txnRef.trim() || txnRef.length < 12) {
      alert('Please enter a valid 12-digit transaction/ref number.');
      return;
    }
    setSubmittingPayment(true);
    try {
      await dbSubmitAppointmentPayment(selectedAppt.id, txnRef);
      
      // Send a notification to the doctor
      await supabase
        .from('notifications')
        .insert([{
          to_user_id: selectedAppt.doctor_id,
          message: `Patient ${profile?.full_name || 'Anonymous'} submitted fee payment (Ref: ${txnRef}) for verification.`,
          type: 'info'
        }]);

      alert('Payment reference submitted successfully! Dr. ' + getDoctorName(selectedAppt.doctor_id) + ' will verify and approve your appointment.');
      setShowPaymentModal(false);
      loadData();
    } catch (err) {
      console.error('Error submitting payment:', err);
      alert('Failed to submit payment reference.');
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-center" style={{ minHeight: 'calc(100vh - 80px)', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid var(--glass-border)', borderTop: '4px solid var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        <p style={{ color: 'var(--text-muted)' }}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h2>Welcome back, {profile?.full_name?.split(' ')[0] || profile?.name?.split(' ')[0] || 'Patient'}!</h2>
        <p>Here's an overview of your orthodontic health journey.</p>
      </div>

      <div className="grid-2" style={{ marginBottom: '3rem' }}>
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(30, 41, 59, 0.7) 100%)', borderLeft: '4px solid var(--primary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>New Scan</h3>
            <Camera color="var(--primary)" />
          </div>
          <p style={{ marginBottom: '1.5rem' }}>Start a new AI-powered analysis of your teeth.</p>
          <Link to="/patient/scan" className="btn btn-primary">
            Start Scan <ArrowRight size={16} />
          </Link>
        </div>

        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(30, 41, 59, 0.7) 100%)', borderLeft: '4px solid var(--secondary)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>Appointments</h3>
            <Calendar color="var(--secondary)" />
          </div>
          <p style={{ marginBottom: '1.5rem' }}>You have {appointments.length} appointment request{appointments.length !== 1 ? 's' : ''}.</p>
          <Link to="/patient/doctors" className="btn" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34D399' }}>
            Find a Doctor
          </Link>
        </div>
      </div>

      <h3>Recent Activity</h3>

      {scans.length === 0 && appointments.length === 0 ? (
        <div className="card flex-center" style={{ padding: '3rem', color: 'var(--text-muted)', flexDirection: 'column', gap: '1rem' }}>
          <Clock size={32} />
          <p>No recent activity. Start by uploading a scan!</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {appointments.map(appt => {
            const hasReviewed = patientReviews.some(r => r.appointment_id === appt.id);
            return (
              <div key={appt.id} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h4 style={{ marginBottom: '0.25rem' }}>
                      {appt.status === 'completed' ? 'Treatment Completed' : appt.status === 'scheduled' ? 'Upcoming Appointment' : 'Appointment Request'}
                    </h4>
                    <p style={{ fontSize: '0.9rem', marginBottom: appt.scheduled_time ? '0.25rem' : '0' }}>
                      With Dr. {getDoctorName(appt.doctor_id)}
                      <br />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        Contact: {getDoctorPhone(appt.doctor_id)}
                      </span>
                    </p>
                    {(appt.status === 'scheduled' || appt.status === 'completed') && appt.scheduled_time && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: '-2px' }} />
                        {new Date(appt.scheduled_time).toLocaleDateString()} at {new Date(appt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    {appt.status === 'completed' && !hasReviewed && reviewApptId !== appt.id && (
                      <button className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.8rem' }} onClick={() => setReviewApptId(appt.id)}>
                        Leave Review
                      </button>
                    )}
                    {hasReviewed && (
                      <span 
                        style={{ fontSize: '0.8rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: '0.25rem', cursor: 'pointer' }}
                        onClick={() => setViewReview(patientReviews.find(r => r.appointment_id === appt.id))}
                      >
                        <Star size={14} fill="var(--warning)" /> Reviewed
                      </span>
                    )}
                    
                    {/* Payment actions/status for Scheduled appointments */}
                    {appt.status === 'scheduled' && (
                      <>
                        {appt.payment_status === 'unpaid' ? (
                          <button 
                            className="btn btn-primary" 
                            style={{ 
                              padding: '0.25rem 0.75rem', 
                              fontSize: '0.85rem', 
                              background: 'linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)',
                              border: 'none',
                              boxShadow: '0 4px 10px rgba(239, 68, 68, 0.25)',
                              animation: 'pulse 2s infinite',
                              cursor: 'pointer'
                            }} 
                            onClick={() => openPaymentModal(appt)}
                          >
                            Pay Fee
                          </button>
                        ) : appt.payment_status === 'pending_verification' ? (
                          <span className="badge badge-warning" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                            Awaiting Verification
                          </span>
                        ) : (
                          <>
                            <span className="badge badge-success" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10B981', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                              Paid
                            </span>
                            <button
                              className="btn"
                              style={{
                                padding: '0.25rem 0.75rem',
                                fontSize: '0.8rem',
                                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                cursor: 'pointer',
                                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
                              }}
                              onClick={() => { setSelectedOpAppt(appt); setShowOpModal(true); }}
                            >
                              <Printer size={14} /> OP Paper
                            </button>
                          </>
                        )}
                      </>
                    )}

                    <span className={`badge ${appt.status === 'scheduled' ? 'badge-success' : appt.status === 'completed' ? 'badge-primary' : 'badge-warning'}`}>
                      {appt.status.toUpperCase()}
                    </span>
                  </div>
                </div>

                {reviewApptId === appt.id && (
                  <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
                    <h5 style={{ marginBottom: '1rem' }}>Rate your experience with Dr. {getDoctorName(appt.doctor_id)}</h5>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                      {[1, 2, 3, 4, 5].map(star => (
                        <Star
                          key={star}
                          size={24}
                          color={star <= rating ? 'var(--warning)' : '#475569'}
                          fill={star <= rating ? 'var(--warning)' : 'transparent'}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setRating(star)}
                        />
                      ))}
                    </div>
                    <textarea
                      className="form-input"
                      placeholder="Tell us about your treatment..."
                      rows="3"
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      style={{ marginBottom: '1rem' }}
                    ></textarea>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button className="btn btn-secondary" onClick={() => setReviewApptId(null)}>Cancel</button>
                      <button className="btn btn-primary" onClick={() => handleReviewSubmit(appt.doctor_id, appt.id)}>Submit Review</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {scans.map(scan => (
            <div key={scan.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ marginBottom: '0.25rem' }}>AI Scan Analysis</h4>
                <p style={{ fontSize: '0.9rem' }}>{new Date(scan.created_at).toLocaleDateString()}</p>
              </div>
              <span className={`badge ${
                scan.analysis_result?.severity === 'minor' ? 'badge-success' :
                scan.analysis_result?.severity === 'moderate' ? 'badge-warning' : 'badge-danger'
              }`}>
                {(scan.analysis_result?.severity || 'unknown').toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Payment QR Modal */}
      {showPaymentModal && selectedAppt && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.85)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="card glass-panel animate-scale-in" style={{ width: '100%', maxWidth: '420px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '2rem' }}>
            <h3 style={{ marginTop: 0, marginBottom: '0.5rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <CreditCard color="var(--primary)" /> Scan & Pay Consultation Fee
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Scan the QR code using GPay, PhonePe, Paytm, or any UPI app to pay the consultation fee.
            </p>

            <div style={{ background: 'rgba(30, 41, 59, 0.6)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Doctor:</span>
                <strong style={{ color: '#fff' }}>Dr. {getDoctorName(selectedAppt.doctor_id)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Consultation Fee:</span>
                <strong style={{ color: 'var(--secondary)', fontSize: '1.1rem' }}>₹{doctorFees[selectedAppt.doctor_id] || 500}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>UPI ID:</span>
                <code style={{ color: '#38BDF8', fontSize: '0.85rem' }}>{doctorUpis[selectedAppt.doctor_id] || 'Not set'}</code>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div style={{ background: '#fff', padding: '0.75rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.3)' }}>
                {doctorQrs[selectedAppt.doctor_id] ? (
                  <img 
                    src={doctorQrs[selectedAppt.doctor_id]} 
                    alt="Payment QR Code" 
                    style={{ width: '180px', height: '180px', display: 'block', objectFit: 'contain' }}
                  />
                ) : (
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0f172a&data=${encodeURIComponent(
                      `upi://pay?pa=${doctorUpis[selectedAppt.doctor_id]}&pn=${encodeURIComponent(
                        getDoctorName(selectedAppt.doctor_id)
                      )}&am=${doctorFees[selectedAppt.doctor_id] || 500}&cu=INR&tn=OrthoCareAppointment`
                    )}`} 
                    alt="Payment QR Code" 
                    style={{ width: '180px', height: '180px', display: 'block' }}
                  />
                )}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'block' }}>
                Enter 12-Digit UPI Transaction Ref No.
              </label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. 301234567890"
                value={txnRef}
                onChange={(e) => setTxnRef(e.target.value.replace(/\D/g, '').slice(0, 12))}
                style={{ letterSpacing: '2px', textAlign: 'center', fontSize: '1.1rem', fontWeight: '600' }}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.4rem', textAlign: 'center' }}>
                Please enter the exact reference number after payment to confirm.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={() => setShowPaymentModal(false)} 
                style={{ flex: 1 }}
                disabled={submittingPayment}
              >
                Cancel
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handlePaymentSubmit}
                style={{ flex: 1 }}
                disabled={submittingPayment || txnRef.length < 12}
              >
                {submittingPayment ? 'Submitting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Review Modal */}
      {viewReview && (
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
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Your Review</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
              For Dr. {getDoctorName(viewReview.doctor_id)}
            </p>
            
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  size={20}
                  color={star <= viewReview.rating ? 'var(--warning)' : '#475569'}
                  fill={star <= viewReview.rating ? 'var(--warning)' : 'transparent'}
                />
              ))}
            </div>
            
            <p style={{ margin: '0 0 1.5rem 0', fontStyle: 'italic', color: 'var(--text-main)' }}>
              "{viewReview.text}"
            </p>
            
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setViewReview(null)}>
              Close
            </button>
          </div>
        </div>
      )}
      {/* OP Paper Modal */}
      {showOpModal && selectedOpAppt && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div className="animate-scale-in" style={{ width: '100%', maxWidth: '520px' }}>
            {/* Print-only styles */}
            <style>{`
              @media print {
                body * { visibility: hidden !important; }
                #op-paper-content, #op-paper-content * { visibility: visible !important; }
                #op-paper-content {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  max-width: 100% !important;
                  background: #fff !important;
                  color: #000 !important;
                  padding: 2rem !important;
                  border: none !important;
                  box-shadow: none !important;
                  border-radius: 0 !important;
                }
                #op-paper-content .op-header { border-bottom: 3px double #000 !important; }
                #op-paper-content .op-row { border-bottom: 1px solid #ccc !important; }
                .no-print { display: none !important; }
              }
            `}</style>

            <div id="op-paper-content" style={{
              background: '#fff',
              color: '#0f172a',
              borderRadius: '16px',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
              {/* Header */}
              <div className="op-header" style={{
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                color: '#fff',
                padding: '1.5rem 2rem',
                textAlign: 'center',
                borderBottom: '4px solid #6366F1'
              }}>
                <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: '700', letterSpacing: '1px' }}>
                  {doctorHospitals[selectedOpAppt.doctor_id] || 'Hospital'}
                </h2>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.85rem', opacity: 0.85 }}>
                  {doctorAddresses[selectedOpAppt.doctor_id] || ''}
                </p>
                <div style={{ marginTop: '0.75rem', display: 'inline-block', background: 'rgba(99, 102, 241, 0.3)', padding: '0.3rem 1rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: '600', letterSpacing: '2px' }}>
                  OUTPATIENT SLIP
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '1.5rem 2rem' }}>
                {/* OP Number & Date */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#64748b' }}>
                  <span><strong style={{ color: '#0f172a' }}>OP No:</strong> {selectedOpAppt.id?.slice(0, 8).toUpperCase()}</span>
                  <span><strong style={{ color: '#0f172a' }}>Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                </div>

                {/* Details rows */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                  <div className="op-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Patient Name</span>
                    <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{profile?.full_name || profile?.name || 'Patient'}</span>
                  </div>

                  <div className="op-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Doctor</span>
                    <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>Dr. {getDoctorName(selectedOpAppt.doctor_id)}</span>
                  </div>

                  <div className="op-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Doctor Contact</span>
                    <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.95rem' }}>{getDoctorPhone(selectedOpAppt.doctor_id)}</span>
                  </div>

                  <div className="op-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Consultation Fee</span>
                    <span style={{ fontWeight: '700', color: '#10B981', fontSize: '1rem' }}>₹{doctorFees[selectedOpAppt.doctor_id] || 'N/A'}</span>
                  </div>

                  <div className="op-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                    <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Payment Status</span>
                    <span style={{ fontWeight: '700', color: '#10B981', fontSize: '0.9rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.15rem 0.75rem', borderRadius: '20px' }}>✓ PAID</span>
                  </div>

                  {selectedOpAppt.scheduled_time && (
                    <div className="op-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0', background: 'rgba(99, 102, 241, 0.04)', margin: '0 -2rem', paddingLeft: '2rem', paddingRight: '2rem' }}>
                      <span style={{ fontWeight: '700', color: '#6366F1', fontSize: '0.9rem' }}>Scheduled Date</span>
                      <span style={{ fontWeight: '700', color: '#6366F1', fontSize: '1rem' }}>
                        {new Date(selectedOpAppt.scheduled_time).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                        at {new Date(selectedOpAppt.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}

                  {selectedOpAppt.payment_reference && (
                    <div className="op-row" style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 0', borderBottom: '1px solid #e2e8f0' }}>
                      <span style={{ fontWeight: '600', color: '#475569', fontSize: '0.9rem' }}>Transaction Ref</span>
                      <code style={{ fontWeight: '600', color: '#0f172a', fontSize: '0.9rem', letterSpacing: '1px' }}>{selectedOpAppt.payment_reference}</code>
                    </div>
                  )}
                </div>

                {/* Footer note */}
                <div style={{ marginTop: '1.5rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8', borderTop: '2px solid #e2e8f0' }}>
                  Please carry this slip during your visit. This is a computer-generated document.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="no-print" style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setShowOpModal(false); setSelectedOpAppt(null); }}
                style={{ flex: 1 }}
              >
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => window.print()}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Printer size={16} /> Print
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home;
