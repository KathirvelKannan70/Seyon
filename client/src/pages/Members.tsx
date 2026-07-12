import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, fetchAPI, API_URL, SERVER_URL } from '../App.tsx';
import {
  Plus, Search, ShieldAlert, ShieldCheck, MapPin, Eye,
  QrCode, FileDown, Upload, Trash2, MapPinned, UserCheck, AlertTriangle,
  Gauge, FileText, RefreshCw
} from 'lucide-react';

export default function Members() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Filter States
  const [search, setSearch] = useState('');
  const [kuluFilter, setKuluFilter] = useState('');

  // UI States
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<any>(null);
  const [qrCodeOpen, setQrCodeOpen] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Form States
  const [name, setName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [gender, setGender] = useState('Female');
  const [dob, setDob] = useState('');
  const [age, setAge] = useState<number>(30);
  const [phone, setPhone] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [pan, setPan] = useState('');
  const [street, setStreet] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('');
  const [pincode, setPincode] = useState('');
  const [occupation, setOccupation] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState<number>(12000);
  const [nomineeName, setNomineeName] = useState('');
  const [nomineePhone, setNomineePhone] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [kuluId, setKuluId] = useState('');
  const [kycStatus, setKycStatus] = useState('pending');
  const [gps, setGps] = useState<{ latitude: number; longitude: number } | null>(null);
  
  // Files Upload States
  const [photoUrl, setPhotoUrl] = useState('');
  const [sigUrl, setSigUrl] = useState('');
  const [aadhaarUrl, setAadhaarUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Bulk Import State
  const [bulkJson, setBulkJson] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  // Queries
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', search, kuluFilter],
    queryFn: () => fetchAPI(`/members?search=${search}&kuluId=${kuluFilter}`, 'GET', null, token),
  });

  const { data: kulusData } = useQuery({
    queryKey: ['kulus'],
    queryFn: () => fetchAPI('/kulus', 'GET', null, token),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newMember: any) => fetchAPI('/members', 'POST', newMember, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      closeModal();
    },
    onError: (err: any) => setFormError(err.message),
  });

  const updateKycMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      fetchAPI(`/members/${id}`, 'PUT', { kycStatus: status }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      if (detailsOpen) {
        setDetailsOpen((prev: any) => ({ ...prev, kycStatus: status }));
      }
    },
  });

  const importMutation = useMutation({
    mutationFn: (payload: any) => fetchAPI('/members/import', 'POST', payload, token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setImportResult(res.data);
    },
    onError: (err: any) => setFormError(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/members/${id}`, 'DELETE', null, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setDetailsOpen(null);
    },
    onError: (err: any) => alert(err.message),
  });

  const [showCibilReport, setShowCibilReport] = useState<any>(null);

  const cibilCheckMutation = useMutation({
    mutationFn: (id: string) => fetchAPI(`/members/${id}/cibil-check`, 'POST', null, token),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      if (detailsOpen && detailsOpen._id === res.data.panOrAadhaar || (detailsOpen && detailsOpen.name === res.data.name)) {
        // Find member in members list or just merge details
        setDetailsOpen((prev: any) => ({
          ...prev,
          cibilScore: res.data.score,
          cibilStatus: res.data.status,
          cibilCheckedAt: res.data.checkedAt,
          cibilReport: res.data
        }));
      }
    },
    onError: (err: any) => alert('CIBIL check failed: ' + err.message),
  });

  // File Upload Helper
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'signature' | 'aadhaar') => {
    if (!e.target.files?.[0]) return;
    setUploading(true);
    const formData = new FormData();
    formData.append('file', e.target.files[0]);

    try {
      const response = await fetch(`${API_URL}/members/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const resData = await response.json();
      if (resData.success) {
        if (type === 'photo') setPhotoUrl(resData.url);
        else if (type === 'aadhaar') setAadhaarUrl(resData.url);
        else setSigUrl(resData.url);
      } else {
        alert('Upload failed: ' + resData.message);
      }
    } catch (err) {
      console.error(err);
      alert('Error uploading file');
    } finally {
      setUploading(false);
    }
  };

  // Get GPS Location
  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGps({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        () => {
          alert('GPS capture failed. Please grant browser permissions.');
        }
      );
    } else {
      alert('Geolocation not supported by this browser.');
    }
  };

  const openAddModal = () => {
    setName('');
    setFatherName('');
    setGender('Female');
    setDob('');
    setAge(30);
    setPhone('');
    setAlternatePhone('');
    setAadhaarNumber('');
    setPan('');
    setStreet('');
    setVillage('');
    setDistrict('Madurai');
    setPincode('625001');
    setOccupation('Tailoring');
    setMonthlyIncome(12000);
    setNomineeName('');
    setNomineePhone('');
    setNomineeRelation('Spouse');
    setKuluId(kulusData?.data?.[0]?._id || '');
    setKycStatus('pending');
    setPhotoUrl('');
    setSigUrl('');
    setAadhaarUrl('');
    setGps(null);
    setFormError(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const payload = {
      kulu: kuluId,
      photo: photoUrl,
      aadhaarPhoto: aadhaarUrl,
      name,
      fatherName,
      gender,
      dob: new Date(dob),
      age: Number(age),
      phone,
      alternatePhone,
      aadhaarNumber,
      pan,
      address: {
        street,
        village,
        areaName: 'AutoFill',
        district,
        pincode,
      },
      occupation,
      monthlyIncome: Number(monthlyIncome),
      nominee: {
        name: nomineeName,
        phone: nomineePhone,
        relation: nomineeRelation,
      },
      kycStatus,
      gpsLocation: gps || { latitude: 0, longitude: 0 },
    };

    createMutation.mutate(payload);
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setImportResult(null);
    try {
      const parsed = JSON.parse(bulkJson);
      if (!Array.isArray(parsed)) {
        throw new Error('JSON data must be an array of objects');
      }
      importMutation.mutate({ members: parsed });
    } catch (err: any) {
      setFormError('JSON parsing error: ' + err.message);
    }
  };

  const sampleJson = `[
  {
    "name": "Lakshmi R",
    "phone": "9876543009",
    "aadhaarNumber": "443322110099",
    "kuluName": "Annai Street Kulu",
    "age": 32,
    "street": "1st Main Road",
    "village": "Sellur",
    "district": "Madurai",
    "pincode": "625002"
  }
]`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members Registry</h1>
          <p className="text-xs text-slate-500">Add members, verify KYC documents, and review loan balance ledgers.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setImportOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <Upload size={14} />
            Bulk Import
          </button>
          <a
            href={`${API_URL}/reports/excel/members`}
            download
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all"
          >
            <FileDown size={14} />
            Excel Export
          </a>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-medium text-xs rounded-xl shadow-sm flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Plus size={15} />
            Register Member
          </button>
        </div>
      </div>

      {/* Directory Searches filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search by Member Name, Phone or Aadhaar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="form-input pl-9"
          />
        </div>
        <select
          value={kuluFilter}
          onChange={(e) => setKuluFilter(e.target.value)}
          className="form-input sm:w-64"
        >
          <option value="">All Kulus (Groups)</option>
          {kulusData?.data?.map((kulu: any) => (
            <option key={kulu._id} value={kulu._id}>{kulu.name} ({kulu.meetingDay})</option>
          ))}
        </select>
      </div>

      {membersLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {membersData?.data?.map((member: any) => (
            <div key={member._id} className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col justify-between shadow-premium dark:shadow-premium-dark hover:scale-[1.01] transition-all">
              <div className="flex gap-4">
                {/* Photo Placeholder */}
                <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-850 flex-shrink-0 overflow-hidden border border-slate-200/30 dark:border-slate-800 flex items-center justify-center text-xl">
                  {member.photo ? (
                    <a href={member.photo.startsWith('http') ? member.photo : `${SERVER_URL}${member.photo}`} target="_blank" rel="noopener noreferrer" title="View Full Profile Photo">
                      <img src={member.photo.startsWith('http') ? member.photo : `${SERVER_URL}${member.photo}`} alt={member.name} className="w-full h-full object-cover hover:scale-110 transition-transform cursor-pointer" />
                    </a>
                  ) : (
                    <span>👩</span>
                  )}
                </div>

                <div className="flex flex-col gap-1 min-w-0">
                  <span className="text-sm font-bold truncate">{member.name}</span>
                  <span className="text-[10px] text-slate-400">Phone: {member.phone}</span>
                  <span className="text-[10px] text-slate-400">Kulu: <strong className="text-slate-600 dark:text-slate-300">{member.kulu?.name}</strong></span>
                  <span className="text-[10px] text-slate-400">Aadhaar: {member.aadhaarNumber}</span>
                </div>
              </div>

              <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-4">
                <div className="flex items-center gap-1.5">
                  {member.kycStatus === 'verified' ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-md">
                      <ShieldCheck size={10} /> KYC VERIFIED
                    </span>
                  ) : member.kycStatus === 'rejected' ? (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-md">
                      <ShieldAlert size={10} /> KYC REJECTED
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded-md">
                      PENDING KYC
                    </span>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      const qrValue = `Name:${member.name},Aadhaar:${member.aadhaarNumber},Phone:${member.phone},Kulu:${member.kulu?.name}`;
                      setQrCodeOpen(qrValue);
                    }}
                    title="View Member QR Code"
                    className="p-2 bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-brand-500 rounded-xl hover:scale-105 transition-all"
                  >
                    <QrCode size={13} />
                  </button>
                  {member.aadhaarPhoto && (
                    <a
                      href={member.aadhaarPhoto.startsWith('http') ? member.aadhaarPhoto : `${SERVER_URL}${member.aadhaarPhoto}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="View Aadhaar Card Image"
                      className="p-2 bg-slate-50 dark:bg-slate-950 text-slate-400 hover:text-brand-500 rounded-xl hover:scale-105 transition-all flex items-center justify-center"
                    >
                      <FileText size={13} />
                    </a>
                  )}
                  <button
                    onClick={() => setDetailsOpen(member)}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Eye size={12} />
                    Ledger
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member Details & Ledger Modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setDetailsOpen(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold">Member Financial Ledger</h3>

            <div className="flex gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-850 flex-shrink-0 flex items-center justify-center text-2xl overflow-hidden">
                {detailsOpen.photo ? <img src={detailsOpen.photo.startsWith('http') ? detailsOpen.photo : `${SERVER_URL}${detailsOpen.photo}`} alt="" className="w-full h-full object-cover" /> : '👩'}
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-sm font-bold">{detailsOpen.name}</span>
                <span className="text-xs text-slate-500">Father's Name: {detailsOpen.fatherName}</span>
                <span className="text-xs text-slate-500">KYC Status: <strong className="uppercase">{detailsOpen.kycStatus}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div><strong>Age / Gender:</strong> {detailsOpen.age} yrs / {detailsOpen.gender}</div>
              <div><strong>Occupation:</strong> {detailsOpen.occupation}</div>
              <div><strong>Nominee Name:</strong> {detailsOpen.nominee?.name} ({detailsOpen.nominee?.relation})</div>
              <div><strong>Nominee Phone:</strong> {detailsOpen.nominee?.phone}</div>
              <div className="col-span-2">
                <strong>Address:</strong> {detailsOpen.address?.street}, {detailsOpen.address?.village}, {detailsOpen.address?.district} - {detailsOpen.address?.pincode}
              </div>
              {detailsOpen.gpsLocation?.latitude !== 0 && (
                <div className="col-span-2 flex items-center gap-1 text-[10px] text-brand-500">
                  <MapPin size={12} />
                  <span>GPS Logged: {detailsOpen.gpsLocation?.latitude?.toFixed(4)}, {detailsOpen.gpsLocation?.longitude?.toFixed(4)}</span>
                </div>
              )}
            </div>

            {/* CIBIL Score Section */}
            <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold flex items-center gap-1.5 text-slate-700 dark:text-slate-350">
                  <Gauge size={14} className="text-brand-500" />
                  Credit Bureau Record (CIBIL)
                </span>
                {detailsOpen.cibilScore ? (
                  <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md uppercase border ${
                    detailsOpen.cibilScore >= 750 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                    detailsOpen.cibilScore >= 680 ? 'bg-lime-500/10 text-lime-500 border-lime-500/20' :
                    detailsOpen.cibilScore >= 580 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                    'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  }`}>
                    {detailsOpen.cibilStatus} ({detailsOpen.cibilScore})
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-900 rounded-md">
                    Not Checked
                  </span>
                )}
              </div>

              {detailsOpen.cibilScore ? (
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>Checked: {new Date(detailsOpen.cibilCheckedAt).toLocaleDateString()}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowCibilReport(detailsOpen.cibilReport)}
                      className="px-2.5 py-1 bg-brand-500/10 text-brand-500 font-bold rounded-lg hover:bg-brand-500/20 transition-all flex items-center gap-1"
                    >
                      <FileText size={11} /> View Report
                    </button>
                    <button
                      onClick={() => cibilCheckMutation.mutate(detailsOpen._id)}
                      disabled={cibilCheckMutation.isPending}
                      className="px-2 py-1 bg-slate-150 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition-all"
                      title="Re-check score"
                    >
                      <RefreshCw size={11} className={cibilCheckMutation.isPending ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex justify-between items-center text-[11px] text-slate-400">
                  <span>No credit profile retrieved.</span>
                  <button
                    onClick={() => cibilCheckMutation.mutate(detailsOpen._id)}
                    disabled={cibilCheckMutation.isPending}
                    className="px-3 py-1.5 bg-brand-500 hover:bg-brand-600 text-white font-bold rounded-xl transition-all text-[10px]"
                  >
                    {cibilCheckMutation.isPending ? 'Checking...' : 'Check CIBIL Score'}
                  </button>
                </div>
              )}
            </div>

            {/* Aadhaar Photo Attachment */}
            {detailsOpen.aadhaarPhoto && (
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Aadhaar Card Attachment</span>
                <div className="bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-100 dark:border-slate-800 flex items-center justify-center">
                  <a href={detailsOpen.aadhaarPhoto.startsWith('http') ? detailsOpen.aadhaarPhoto : `${SERVER_URL}${detailsOpen.aadhaarPhoto}`} target="_blank" rel="noopener noreferrer" className="hover:opacity-90 transition-opacity">
                    <img src={detailsOpen.aadhaarPhoto.startsWith('http') ? detailsOpen.aadhaarPhoto : `${SERVER_URL}${detailsOpen.aadhaarPhoto}`} alt="Aadhaar Card" className="max-h-28 w-auto object-contain rounded-md" />
                  </a>
                </div>
              </div>
            )}

            {/* KYC Admin Actions */}
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-bold">Audit KYC verification:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => updateKycMutation.mutate({ id: detailsOpen._id, status: 'verified' })}
                  className="px-3 py-1 bg-emerald-500/10 text-emerald-500 text-[10px] font-bold rounded-lg hover:bg-emerald-500/20 transition-all"
                >
                  Verify KYC
                </button>
                <button
                  onClick={() => updateKycMutation.mutate({ id: detailsOpen._id, status: 'rejected' })}
                  className="px-3 py-1 bg-rose-500/10 text-rose-500 text-[10px] font-bold rounded-lg hover:bg-rose-500/20 transition-all"
                >
                  Reject
                </button>
              </div>
            </div>

            <div className="flex gap-2 justify-end mt-2">
              <button
                onClick={() => {
                  if (confirm('Delete this member? All ledger logs will be wiped.')) {
                    deleteMutation.mutate(detailsOpen._id);
                  }
                }}
                className="px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all"
              >
                <Trash2 size={13} /> Delete Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed CIBIL Report Modal */}
      {showCibilReport && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button onClick={() => setShowCibilReport(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
                <Gauge size={18} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-base font-bold">Credit Bureau Profile Summary</h3>
                <span className="text-[10px] text-slate-400">TransUnion CIBIL credit history details</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              {/* Score visual */}
              <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950/40">
                <span className="text-3xl font-black text-brand-500 tracking-tight">{showCibilReport.score}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">CIBIL Score</span>
                <span className={`mt-2.5 px-2 py-0.5 text-[9px] font-bold rounded-md uppercase border ${
                  showCibilReport.score >= 750 ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                  showCibilReport.score >= 680 ? 'bg-lime-500/10 text-lime-500 border-lime-500/20' :
                  showCibilReport.score >= 580 ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                  'bg-rose-500/10 text-rose-500 border-rose-500/20'
                }`}>
                  {showCibilReport.status}
                </span>
              </div>

              {/* Stats */}
              <div className="md:col-span-2 grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl flex flex-col">
                  <span className="text-slate-400 font-semibold text-[9px] uppercase">Active Lines</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350">{showCibilReport.activeAccounts} Accounts</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl flex flex-col">
                  <span className="text-slate-400 font-semibold text-[9px] uppercase">Total Debt</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350">INR {showCibilReport.totalOutstanding.toLocaleString()}</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl flex flex-col">
                  <span className="text-slate-400 font-semibold text-[9px] uppercase">Punctuality</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-500">{showCibilReport.paymentHistory}% On-time</span>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-850 rounded-xl flex flex-col">
                  <span className="text-slate-400 font-semibold text-[9px] uppercase">Inquiries</span>
                  <span className="font-bold text-slate-700 dark:text-slate-350">{showCibilReport.inquiries} Searches</span>
                </div>
              </div>
            </div>

            {/* List of active loans */}
            <div className="flex flex-col gap-2 mt-2">
              <span className="text-xs font-bold">Credit Accounts History</span>
              <div className="border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950/60 text-slate-500 font-semibold border-b border-slate-150 dark:border-slate-800">
                      <th className="p-2.5">Lender</th>
                      <th className="p-2.5">Type</th>
                      <th className="p-2.5">Sanctioned</th>
                      <th className="p-2.5">Outstanding</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {showCibilReport.accounts && showCibilReport.accounts.map((acc: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/10">
                        <td className="p-2.5 font-semibold">{acc.lender}</td>
                        <td className="p-2.5 text-slate-500">{acc.type}</td>
                        <td className="p-2.5">INR {acc.sanctionedAmount.toLocaleString()}</td>
                        <td className="p-2.5">INR {acc.currentBalance.toLocaleString()}</td>
                        <td className="p-2.5">
                          <span className={`inline-flex px-1.5 py-0.5 text-[8px] font-bold rounded-md uppercase ${
                            acc.status === 'Active' ? 'bg-emerald-500/10 text-emerald-500' :
                            acc.status === 'Closed' ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' :
                            'bg-rose-500/10 text-rose-500'
                          }`}>
                            {acc.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setShowCibilReport(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all"
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {qrCodeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 items-center text-center shadow-2xl relative">
            <button onClick={() => setQrCodeOpen(null)} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold mb-2">Member QR Pass</h3>

            {/* Generated QR API from standard web tools */}
            <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrCodeOpen)}`}
                alt="QR Code ID card"
                className="w-44 h-44"
              />
            </div>
            
            <p className="text-xs text-slate-400 mt-2">Scan from device camera to instantly load collection payment slips.</p>
          </div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative">
            <button onClick={() => { setImportOpen(false); setImportResult(null); }} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold">Bulk Member JSON Import</h3>

            {!importResult ? (
              <form onSubmit={handleImportSubmit} className="flex flex-col gap-3">
                <p className="text-xs text-slate-400">
                  Paste your member array in JSON structure below:
                </p>
                <textarea
                  value={bulkJson}
                  onChange={(e) => setBulkJson(e.target.value)}
                  placeholder={sampleJson}
                  className="form-input h-48 font-mono text-[10px] resize-none"
                  required
                />
                
                {formError && <div className="text-xs text-rose-500">{formError}</div>}

                <button
                  type="submit"
                  disabled={importMutation.isPending}
                  className="py-2.5 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all"
                >
                  {importMutation.isPending ? 'Importing...' : 'Validate & Save'}
                </button>
              </form>
            ) : (
              <div className="flex flex-col gap-3 text-xs">
                <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl font-bold">
                  Successfully imported {importResult.successCount} members!
                </div>
                {importResult.errors.length > 0 && (
                  <div className="flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800 pt-3">
                    <span className="font-bold text-rose-400">Errors encountered ({importResult.errors.length}):</span>
                    <ul className="list-disc pl-4 max-h-32 overflow-y-auto text-rose-300 flex flex-col gap-1">
                      {importResult.errors.map((err: string, i: number) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative">
            <button onClick={closeModal} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold">Register New Microfinance Member</h3>

            {formError && (
              <div className="p-3 bg-rose-500/10 text-rose-400 text-xs border border-rose-500/20 rounded-xl flex items-center gap-2">
                <AlertTriangle size={15} />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Member Full Name</label>
                  <input type="text" required placeholder="e.g. Mahalakshmi S" value={name} onChange={(e) => setName(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Father's Name</label>
                  <input type="text" required placeholder="e.g. Subramanian" value={fatherName} onChange={(e) => setFatherName(e.target.value)} className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className="form-input">
                    <option value="Female">Female</option>
                    <option value="Male">Male</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Date of Birth</label>
                  <input type="date" required value={dob} onChange={(e) => setDob(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Age</label>
                  <input type="number" required value={age} onChange={(e) => setAge(Number(e.target.value))} className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Primary Phone</label>
                  <input type="tel" required placeholder="e.g. 9876543210" value={phone} onChange={(e) => setPhone(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Alternate Phone</label>
                  <input type="tel" placeholder="e.g. 9876543211" value={alternatePhone} onChange={(e) => setAlternatePhone(e.target.value)} className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Aadhaar (12 digits)</label>
                  <input type="text" required placeholder="e.g. 443322110022" value={aadhaarNumber} onChange={(e) => setAadhaarNumber(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">PAN Card</label>
                  <input type="text" placeholder="e.g. ABCDE1234F" value={pan} onChange={(e) => setPan(e.target.value)} className="form-input uppercase" />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Assign to Kulu Group</label>
                <select value={kuluId} onChange={(e) => setKuluId(e.target.value)} className="form-input" required>
                  <option value="">Choose Group...</option>
                  {kulusData?.data?.map((k: any) => (
                    <option key={k._id} value={k._id}>{k.name} ({k.meetingDay})</option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2">
                <span className="font-bold">Member Documents Upload</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400">Profile Photo</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'photo')} className="text-[10px]" />
                    {photoUrl && <span className="text-emerald-500 text-[10px]">Photo Uploaded!</span>}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[10px] text-slate-400">Aadhaar Card Photo</span>
                    <input type="file" accept="image/*" onChange={(e) => handleFileUpload(e, 'aadhaar')} className="text-[10px]" />
                    {aadhaarUrl && <span className="text-emerald-500 text-[10px]">Aadhaar Uploaded!</span>}
                  </div>
                </div>
              </div>

              {/* GPS Geolocation API */}
              <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold">Locality GPS Coordinates</span>
                  <span className="text-[10px] text-slate-400">
                    {gps ? `Lat: ${gps.latitude.toFixed(5)}, Lng: ${gps.longitude.toFixed(5)}` : 'GPS Tag Pending'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={captureGPS}
                  className="px-3 py-1.5 bg-brand-500/10 text-brand-500 rounded-lg hover:bg-brand-500/20 font-bold flex items-center gap-1"
                >
                  <MapPinned size={12} /> Log GPS
                </button>
              </div>

              {/* Address details */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Street / Door No</label>
                  <input type="text" required placeholder="e.g. 10B Nehru St" value={street} onChange={(e) => setStreet(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Village / Town</label>
                  <input type="text" required placeholder="e.g. Sellur" value={village} onChange={(e) => setVillage(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">District</label>
                  <input type="text" required value={district} onChange={(e) => setDistrict(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Pincode</label>
                  <input type="text" required placeholder="625002" value={pincode} onChange={(e) => setPincode(e.target.value)} className="form-input" />
                </div>
              </div>

              {/* Nominee details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 grid grid-cols-3 gap-3">
                <div className="col-span-3 font-bold">Nominee Beneficiary Info</div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Nominee Name</label>
                  <input type="text" required placeholder="Name" value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Relation</label>
                  <input type="text" required placeholder="Spouse / Son" value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Phone</label>
                  <input type="tel" required placeholder="Phone" value={nomineePhone} onChange={(e) => setNomineePhone(e.target.value)} className="form-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Occupation</label>
                  <input type="text" required placeholder="e.g. Tailoring Shop" value={occupation} onChange={(e) => setOccupation(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Monthly Income (INR)</label>
                  <input type="number" required value={monthlyIncome} onChange={(e) => setMonthlyIncome(Number(e.target.value))} className="form-input" />
                </div>
              </div>

              <button
                type="submit"
                disabled={createMutation.isPending || uploading}
                className="w-full py-3 mt-2 bg-gradient-to-r from-cyan-500 to-brand-500 hover:from-cyan-600 hover:to-brand-600 text-white font-semibold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <UserCheck size={14} />
                Register Member Accounts
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
