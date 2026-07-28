import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth, fetchAPI, API_URL, SERVER_URL } from '../App.tsx';
import {
  Plus, Search, ShieldAlert, ShieldCheck, MapPin, Eye,
  QrCode, FileDown, Upload, Trash2, MapPinned, UserCheck, AlertTriangle,
  Gauge, FileText, RefreshCw, ExternalLink, Star, ThumbsUp, ThumbsDown, Copy, CheckCircle, LayoutList, Grid
} from 'lucide-react';

export default function Members() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();
  const queryClient = useQueryClient();

  // Filter States
  const [search, setSearch] = useState('');
  const [kuluFilter, setKuluFilter] = useState('');
  const [kuluNumberFilter, setKuluNumberFilter] = useState('');

  // UI States
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [modalOpen, setModalOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState<any>(null);
  const [qrCodeOpen, setQrCodeOpen] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Deletion & Profile States
  const [deleteConfirmMember, setDeleteConfirmMember] = useState<any>(null);
  const [deleteBlockedData, setDeleteBlockedData] = useState<any>(null);
  const [forceDeleteChecked, setForceDeleteChecked] = useState(false);
  const [fullProfileMemberId, setFullProfileMemberId] = useState<string | null>(null);

  // Form States
  const [name, setName] = useState('');
  const [gender, setGender] = useState('Female');
  const [phone, setPhone] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [occupation, setOccupation] = useState('');
  const [monthlyIncome, setMonthlyIncome] = useState<number>(12000);
  const [fatherName, setFatherName] = useState('');
  const [dob, setDob] = useState('1992-05-15');
  const [age, setAge] = useState<number>(32);
  const [street, setStreet] = useState('');
  const [village, setVillage] = useState('');
  const [district, setDistrict] = useState('Madurai');
  const [pincode, setPincode] = useState('625001');
  const [nomineeName, setNomineeName] = useState('');
  const [nomineePhone, setNomineePhone] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('Spouse');
  const [kuluId, setKuluId] = useState('');
  const [kycStatus, setKycStatus] = useState('pending');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [saveAction, setSaveAction] = useState<'close' | 'another'>('close');
  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState<string | null>(null);

  // Auto calculate age when DOB changes
  const handleDobChange = (val: string) => {
    setDob(val);
    if (val) {
      const birth = new Date(val);
      const today = new Date();
      let calculatedAge = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        calculatedAge--;
      }
      if (!isNaN(calculatedAge) && calculatedAge > 0) {
        setAge(calculatedAge);
      }
    }
  };

  // Auto-fetch district & city from pincode using India Post API
  const handlePincodeChange = async (val: string) => {
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
    setPincodeError(null);

    if (cleaned.length === 6) {
      setPincodeLoading(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        if (data?.[0]?.Status === 'Success' && data[0].PostOffice?.length > 0) {
          const po = data[0].PostOffice[0];
          setDistrict(po.District || '');
          setVillage(po.Name || '');
        } else {
          setPincodeError('Invalid pincode — please enter manually.');
        }
      } catch {
        setPincodeError('Failed to fetch. Please fill district/city manually.');
      } finally {
        setPincodeLoading(false);
      }
    }
  };

  // Bulk Import State
  const [bulkJson, setBulkJson] = useState('');
  const [importResult, setImportResult] = useState<any>(null);

  // Queries
  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['members', search, kuluFilter],
    queryFn: () => fetchAPI(`/members?search=${search}&kuluId=${kuluFilter}`, 'GET', null, token),
  });

  // Sort members naturally by Kulu Number (A0, A1... B0, B1)
  const sortedMembers = membersData?.data ? [...membersData.data].sort((a: any, b: any) => {
    const kuluNumA = String(a.kulu?.kuluNumber || a.kulu?.name || '');
    const kuluNumB = String(b.kulu?.kuluNumber || b.kulu?.name || '');

    if (kuluNumA && kuluNumB && kuluNumA !== kuluNumB) {
      return kuluNumA.localeCompare(kuluNumB, undefined, { numeric: true, sensitivity: 'base' });
    }
    if (kuluNumA && !kuluNumB) return -1;
    if (!kuluNumA && kuluNumB) return 1;

    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  }) : [];

  const { data: kulusData } = useQuery({
    queryKey: ['kulus'],
    queryFn: () => fetchAPI('/kulus', 'GET', null, token),
  });

  // Extract unique Kulu numbers sorted naturally
  const uniqueKuluNumbers = (Array.from(
    new Set(kulusData?.data?.map((k: any) => k.kuluNumber).filter(Boolean) || [])
  ) as string[]).sort((a: string, b: string) => String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' }));

  // Filter members by selected Kulu number if specified
  const filteredAndSortedMembers = sortedMembers.filter((m: any) => {
    if (kuluNumberFilter && String(m.kulu?.kuluNumber || '') !== String(kuluNumberFilter)) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    const targetKulu = searchParams.get('kuluId') || searchParams.get('kulu');
    const shouldAdd = searchParams.get('add') === 'true' || !!targetKulu;
    
    if (shouldAdd && kulusData?.data) {
      openAddModal();
      if (targetKulu) {
        setKuluId(targetKulu);
      }
    }
  }, [searchParams, !!kulusData?.data]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (newMember: any) => fetchAPI('/members', 'POST', newMember, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['kulus'] });

      if (saveAction === 'close') {
        closeModal();
        if (searchParams.get('fromKulu') === 'true') {
          navigate('/kulus');
        }
      } else {
        const preservedKulu = kuluId;
        setName('');
        setPhone('');
        setAadhaarNumber('');
        setNomineeName('');
        setNomineePhone('');
        setNomineeRelation('Spouse');
        setOccupation('Tailoring');
        setMonthlyIncome(12000);
        setKuluId(preservedKulu);
        setFormError(null);
        setSuccessMessage('Member registered successfully! Add another member below.');
        setTimeout(() => setSuccessMessage(null), 5000);
      }
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
    mutationFn: ({ id, force }: { id: string; force?: boolean }) =>
      fetchAPI(`/members/${id}${force ? '?force=true' : ''}`, 'DELETE', null, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      setDeleteConfirmMember(null);
      setDeleteBlockedData(null);
      setForceDeleteChecked(false);
      setDetailsOpen(null);
      setFullProfileMemberId(null);
    },
    onError: (err: any) => {
      if (err.hasActiveLoans || err.activeLoansCount) {
        setDeleteBlockedData(err);
      } else {
        alert(err.message || 'Failed to delete member');
      }
    },
  });

  const { data: memberFullDetails, isLoading: fullDetailsLoading } = useQuery({
    queryKey: ['memberDetails', fullProfileMemberId],
    queryFn: () => fetchAPI(`/members/${fullProfileMemberId}`, 'GET', null, token),
    enabled: !!fullProfileMemberId,
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: ({ id, rating }: { id: string; rating: string }) =>
      fetchAPI(`/members/${id}`, 'PUT', { feedbackRating: rating }, token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] });
      queryClient.invalidateQueries({ queryKey: ['memberDetails', fullProfileMemberId] });
    },
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



  const openAddModal = () => {
    setName('');
    setGender('Female');
    setPhone('');
    setAadhaarNumber('');
    setOccupation('Tailoring');
    setMonthlyIncome(12000);
    setFatherName('');
    setDob('1992-05-15');
    setAge(32);
    setStreet('');
    setVillage('');
    setDistrict('Madurai');
    setPincode('625001');
    setNomineeName('');
    setNomineePhone('');
    setNomineeRelation('Spouse');
    setKuluId(kulusData?.data?.[0]?._id || '');
    setKycStatus('pending');
    setFormError(null);
    setSuccessMessage(null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
  };

  const duplicateAadhaarMember = aadhaarNumber.length === 12
    ? membersData?.data?.find((m: any) => m.aadhaarNumber === aadhaarNumber.replace(/\D/g, ''))
    : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanPhone = phone.replace(/\D/g, '');
    const cleanAadhaar = aadhaarNumber.replace(/\D/g, '');
    const cleanNomineePhone = nomineePhone.replace(/\D/g, '');

    if (cleanPhone.length !== 10) {
      setFormError('Primary phone number must be exactly 10 digits.');
      return;
    }
    if (cleanAadhaar.length !== 12) {
      setFormError('Aadhaar number must be exactly 12 digits.');
      return;
    }
    if (duplicateAadhaarMember) {
      setFormError(`Member with this Aadhaar number already exists: ${duplicateAadhaarMember.name} (Phone: ${duplicateAadhaarMember.phone}).`);
      return;
    }
    if (cleanNomineePhone.length !== 10) {
      setFormError('Nominee phone number must be exactly 10 digits.');
      return;
    }

    const payload = {
      kulu: kuluId,
      name,
      fatherName: fatherName || 'N/A',
      gender,
      dob: dob ? new Date(dob) : new Date('1990-01-01'),
      age: Number(age) || 30,
      phone: cleanPhone,
      aadhaarNumber: cleanAadhaar,
      address: {
        street: street || 'N/A',
        village: village || 'N/A',
        areaName: 'Main Area',
        district: district || 'Madurai',
        pincode: pincode || '625001',
      },
      occupation,
      monthlyIncome: Number(monthlyIncome),
      nominee: {
        name: nomineeName,
        phone: cleanNomineePhone,
        relation: nomineeRelation,
      },
      kycStatus,
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
          value={kuluNumberFilter}
          onChange={(e) => setKuluNumberFilter(e.target.value)}
          className="form-input sm:w-44 font-bold"
        >
          <option value="">All Centre No</option>
          {uniqueKuluNumbers.map((num: string) => (
            <option key={num} value={num}>Centre {num}</option>
          ))}
        </select>
        <select
          value={kuluFilter}
          onChange={(e) => setKuluFilter(e.target.value)}
          className="form-input sm:w-60"
        >
          <option value="">All Centre Names</option>
          {kulusData?.data?.map((kulu: any) => (
            <option key={kulu._id} value={kulu._id}>{kulu.name} ({kulu.meetingDay})</option>
          ))}
        </select>
        <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setViewMode('table')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'table' ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            title="Excel Table View"
          >
            <LayoutList size={14} /> Excel Table
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'cards' ? 'bg-white dark:bg-slate-800 text-brand-500 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
            }`}
            title="Cards View"
          >
            <Grid size={14} /> Cards
          </button>
        </div>
      </div>

      {membersLoading ? (
        <div className="h-64 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 animate-pulse" />
      ) : viewMode === 'table' ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-950 text-slate-700 dark:text-slate-200 font-bold border-b border-slate-200 dark:border-slate-800 text-xs tracking-wide">
                  <th className="py-4 px-4 text-center">#</th>
                  <th className="py-4 px-4">Member Name</th>
                  <th className="py-4 px-4 text-center font-extrabold text-emerald-600 dark:text-emerald-400">Centre No</th>
                  <th className="py-4 px-4">Centre Name</th>
                  <th className="py-4 px-4">Phone Number</th>
                  <th className="py-4 px-4">Aadhaar No</th>
                  <th className="py-4 px-4">Nominee Details</th>
                  <th className="py-4 px-4">Rating & Status</th>
                  <th className="py-4 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                {!filteredAndSortedMembers || filteredAndSortedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-slate-400 font-medium">
                      No members found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedMembers.map((member: any, idx: number) => (
                    <tr key={member._id} className="hover:bg-slate-100/60 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 text-center font-bold text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-extrabold text-slate-900 dark:text-slate-100 text-xs">
                        {member.name}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {member.kulu?.kuluNumber ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-mono inline-block min-w-[32px] text-center">
                            {member.kulu.kuluNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-mono text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700 dark:text-slate-200">
                        {member.kulu?.name || 'Unassigned'}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300 font-mono text-xs">{member.phone || 'N/A'}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400 text-xs">{member.aadhaarNumber || 'N/A'}</td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300 font-medium">
                        {member.nomineeName ? (
                          <span>{member.nomineeName} <small className="text-slate-400">({member.nomineeRelation || 'Nominee'})</small></span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            member.kycStatus === 'verified' ? 'bg-emerald-500/10 text-emerald-500' :
                            member.kycStatus === 'rejected' ? 'bg-rose-500/10 text-rose-500' : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {member.kycStatus?.toUpperCase() || 'PENDING'}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            ⭐ {member.feedbackRating || 'Good'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setFullProfileMemberId(member._id)}
                            className="px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-xs rounded-xl shadow-sm transition-all shrink-0"
                            title="View Full Member Profile"
                          >
                            View Details
                          </button>
                          <button
                            onClick={() => setDetailsOpen(member)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            title="View Ledger"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => {
                              const qrValue = `Name:${member.name},Aadhaar:${member.aadhaarNumber},Phone:${member.phone},Kulu:${member.kulu?.name}`;
                              setQrCodeOpen(qrValue);
                            }}
                            className="p-1.5 text-slate-400 hover:text-brand-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
                            title="QR Code"
                          >
                            <QrCode size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteConfirmMember(member)}
                            className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-all"
                            title="Delete Member"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sortedMembers.map((member: any) => (
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

              <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/40 pt-4 mt-4 gap-2 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-1.5 flex-wrap">
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

                  {/* Feedback Rating Badge */}
                  <span className={`flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-md ${
                    member.feedbackRating === 'Best' ? 'bg-emerald-500/10 text-emerald-500' :
                    member.feedbackRating === 'Worst' ? 'bg-rose-500/10 text-rose-500' :
                    member.feedbackRating === 'Poor' ? 'bg-orange-500/10 text-orange-500' :
                    member.feedbackRating === 'Average' ? 'bg-amber-500/10 text-amber-500' :
                    'bg-cyan-500/10 text-cyan-500'
                  }`}>
                    <Star size={9} className="fill-current" /> {member.feedbackRating || 'Good'}
                  </span>
                </div>

                <div className="flex gap-1.5 items-center">
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

                  {/* Ledger Button */}
                  <button
                    onClick={() => setDetailsOpen(member)}
                    className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Eye size={12} />
                    Ledger
                  </button>

                  {/* View Details Button */}
                  <button
                    onClick={() => setFullProfileMemberId(member._id)}
                    className="px-3 py-1.5 bg-gradient-to-r from-brand-500 to-cyan-500 hover:from-brand-600 hover:to-cyan-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                  >
                    <UserCheck size={12} />
                    View Details
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Member Details & Ledger Modal */}
      {detailsOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-sm p-4 flex min-h-full items-center justify-center">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto my-auto p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
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
                {detailsOpen.fatherName && <span className="text-xs text-slate-500">Father's Name: {detailsOpen.fatherName}</span>}
                <span className="text-xs text-slate-500">KYC Status: <strong className="uppercase">{detailsOpen.kycStatus}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 dark:text-slate-400">
              <div><strong>Gender:</strong> {detailsOpen.gender}</div>
              <div><strong>Occupation:</strong> {detailsOpen.occupation}</div>
              <div><strong>Nominee Name:</strong> {detailsOpen.nominee?.name} ({detailsOpen.nominee?.relation})</div>
              <div><strong>Nominee Phone:</strong> {detailsOpen.nominee?.phone}</div>
              {detailsOpen.address?.street && (
                <div className="col-span-2">
                  <strong>Address:</strong> {detailsOpen.address?.street}, {detailsOpen.address?.village}, {detailsOpen.address?.district} - {detailsOpen.address?.pincode}
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
                  setDeleteBlockedData(null);
                  setForceDeleteChecked(false);
                  setDeleteConfirmMember(detailsOpen);
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
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-slate-950/50 backdrop-blur-sm p-4 flex min-h-full items-center justify-center">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto my-auto p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative animate-in fade-in zoom-in duration-200">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-sm p-4 flex min-h-full items-center justify-center">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto my-auto p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative">
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
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 backdrop-blur-sm p-4 flex min-h-full items-center justify-center">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto my-auto p-6 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50 rounded-3xl flex flex-col gap-4 shadow-2xl relative">
            <button onClick={closeModal} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600">
              <Plus className="rotate-45" size={20} />
            </button>

            <h3 className="text-base font-bold">Register New Microfinance Member</h3>

            {successMessage && (
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs border border-emerald-500/20 rounded-xl flex items-center gap-2 animate-in fade-in duration-150">
                <CheckCircle size={15} />
                <span>{successMessage}</span>
              </div>
            )}

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
                  <label className="font-semibold text-slate-400">Father / Husband Name</label>
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
                  <label className="font-semibold text-slate-400">Date of Birth (DOB)</label>
                  <input type="date" required value={dob} onChange={(e) => handleDobChange(e.target.value)} className="form-input" />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Age (Years)</label>
                  <input type="number" required min={18} max={95} value={age} onChange={(e) => setAge(Number(e.target.value))} className="form-input font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Primary Phone (10 digits)</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="e.g. 9876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    className="form-input"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="font-semibold text-slate-400">Aadhaar (12 digits)</label>
                  <input
                    type="text"
                    required
                    maxLength={12}
                    placeholder="e.g. 443322110022"
                    value={aadhaarNumber}
                    onChange={(e) => setAadhaarNumber(e.target.value.replace(/\D/g, '').slice(0, 12))}
                    className={`form-input ${duplicateAadhaarMember ? 'border-rose-500 bg-rose-500/10 text-rose-500 font-bold' : ''}`}
                  />
                  {duplicateAadhaarMember && (
                    <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1 mt-0.5">
                      <AlertTriangle size={11} /> Member with this Aadhaar already exists! ({duplicateAadhaarMember.name} • {duplicateAadhaarMember.phone})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="font-semibold text-slate-400">Assign to Centre Group</label>
                <select value={kuluId} onChange={(e) => setKuluId(e.target.value)} className="form-input" required>
                  <option value="">Choose Centre...</option>
                  {kulusData?.data?.map((k: any) => (
                    <option key={k._id} value={k._id}>{k.name} ({k.meetingDay})</option>
                  ))}
                </select>
              </div>

              {/* Address Details Section */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                <span className="font-bold text-slate-700 dark:text-slate-200">Residential Address Info</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-400">Street / Door No</label>
                    <input
                      type="text"
                      placeholder="e.g. 12/A North Street"
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-400">Village / Town</label>
                    <input
                      type="text"
                      placeholder="e.g. Melachathiram"
                      value={village}
                      onChange={(e) => setVillage(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-400">District</label>
                    <input
                      type="text"
                      placeholder="e.g. Madurai"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="form-input"
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="font-semibold text-slate-400 flex items-center gap-1.5">
                      Pincode (6 digits)
                      {pincodeLoading && (
                        <span className="text-[10px] text-brand-400 font-bold animate-pulse flex items-center gap-1">
                          ⟳ Fetching location...
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      placeholder="Enter 6-digit pincode to auto-fill district & city"
                      value={pincode}
                      onChange={(e) => handlePincodeChange(e.target.value)}
                      className={`form-input ${pincodeLoading ? 'opacity-60' : ''}`}
                    />
                    {pincodeError && (
                      <span className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                        ⚠ {pincodeError}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Nominee details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col gap-2.5">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-700 dark:text-slate-200">Nominee Beneficiary Info</span>
                  {phone && (
                    <button
                      type="button"
                      onClick={() => setNomineePhone(phone)}
                      className="text-[10px] px-2.5 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-500 font-bold rounded-lg transition-all flex items-center gap-1"
                      title="Copy Member Primary Phone to Nominee Phone"
                    >
                      <Copy size={11} /> Same Phone as Member
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-400">Nominee Name</label>
                    <input type="text" required placeholder="Name" value={nomineeName} onChange={(e) => setNomineeName(e.target.value)} className="form-input" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-400">Relation</label>
                    <select value={nomineeRelation} onChange={(e) => setNomineeRelation(e.target.value)} className="form-input" required>
                      <option value="Spouse">Spouse</option>
                      <option value="Husband">Husband</option>
                      <option value="Wife">Wife</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="font-semibold text-slate-400">Phone (10 digits)</label>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      placeholder="10-digit Phone"
                      value={nomineePhone}
                      onChange={(e) => setNomineePhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      className="form-input"
                    />
                  </div>
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

              <div className="grid grid-cols-2 gap-3 mt-2">
                <button
                  type="submit"
                  onClick={() => setSaveAction('close')}
                  disabled={createMutation.isPending}
                  className="py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <UserCheck size={14} />
                  Save & Close
                </button>

                <button
                  type="submit"
                  onClick={() => setSaveAction('another')}
                  disabled={createMutation.isPending}
                  className="py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Plus size={14} />
                  Save & Add Another
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Deletion Workflow Modal */}
      {deleteConfirmMember && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 relative">
            {/* Header */}
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 text-rose-500 rounded-2xl shrink-0">
                <ShieldAlert size={28} />
              </div>
              <div className="flex flex-col">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Delete Member Account</h3>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Action regarding member <span className="font-semibold text-slate-800 dark:text-slate-200">{deleteConfirmMember.name}</span>
                </span>
              </div>
              <button
                onClick={() => {
                  setDeleteConfirmMember(null);
                  setDeleteBlockedData(null);
                  setForceDeleteChecked(false);
                }}
                className="ml-auto text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <Plus className="rotate-45" size={22} />
              </button>
            </div>

            {/* Member Info Summary Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-sm text-slate-800 dark:text-slate-200">{deleteConfirmMember.name}</span>
                <span className="text-slate-500">Aadhaar: {deleteConfirmMember.aadhaarNumber || 'N/A'} • Phone: {deleteConfirmMember.phone}</span>
                <span className="text-slate-400 text-[10px]">Group: {deleteConfirmMember.kulu?.name || 'Unassigned'}</span>
              </div>
              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                deleteConfirmMember.kycStatus === 'verified'
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                  : deleteConfirmMember.kycStatus === 'rejected'
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                  : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
              }`}>
                KYC {deleteConfirmMember.kycStatus?.toUpperCase() || 'PENDING'}
              </span>
            </div>

            {/* Active Loans Warning Box if deletion blocked */}
            {deleteBlockedData ? (
              <div className="flex flex-col gap-3 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-900 dark:text-amber-200">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="text-amber-500 shrink-0 mt-0.5" size={20} />
                  <div className="flex flex-col text-xs gap-1">
                    <span className="font-bold text-amber-700 dark:text-amber-400 text-sm">Deletion Blocked: Active Loans Found</span>
                    <p className="text-slate-600 dark:text-slate-300">
                      This member has <strong>{deleteBlockedData.activeLoansCount || deleteBlockedData.activeLoans?.length || 'active'}</strong> active/defaulted loan(s) linked to their account. Standard deletion is prevented to protect financial integrity.
                    </p>
                  </div>
                </div>

                {deleteBlockedData.activeLoans && deleteBlockedData.activeLoans.length > 0 && (
                  <div className="mt-1 flex flex-col gap-1.5 max-h-36 overflow-y-auto">
                    {deleteBlockedData.activeLoans.map((loan: any) => (
                      <div key={loan.id} className="p-2.5 bg-white/70 dark:bg-slate-900/70 border border-amber-200 dark:border-amber-900/50 rounded-xl text-[11px] flex justify-between items-center text-slate-800 dark:text-slate-200 shadow-sm">
                        <div className="flex flex-col">
                          <span className="font-bold text-brand-600 dark:text-brand-400">{loan.loanNumber}</span>
                          <span className="text-[10px] text-slate-400">{loan.schemeName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-500 font-semibold uppercase text-[9px]">{loan.status}</span>
                          <span className="font-bold">₹{loan.remainingAmount?.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Resolution Options */}
                <div className="mt-2 pt-3 border-t border-amber-500/20 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Recommended action:</span>
                    <button
                      onClick={() => {
                        setDeleteConfirmMember(null);
                        navigate('/loans');
                      }}
                      className="px-3 py-1.5 bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 text-white dark:text-slate-900 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <ExternalLink size={12} /> Go to Loans Page
                    </button>
                  </div>

                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={forceDeleteChecked}
                        onChange={(e) => setForceDeleteChecked(e.target.checked)}
                        className="rounded border-rose-400 text-rose-600 focus:ring-rose-500"
                      />
                      <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        Force Cascade Delete (Admin Override)
                      </span>
                    </label>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed pl-6">
                      Permanently wipes this member along with <strong>ALL</strong> associated active loans, collection logs, and payment records.
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-2xl text-xs text-slate-600 dark:text-slate-400 flex flex-col gap-2">
                <p>Are you sure you want to delete <strong>{deleteConfirmMember.name}</strong>?</p>
                <p className="text-rose-500 text-[11px] font-semibold">⚠️ All ledger records and history associated with this member will be permanently removed.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => {
                  setDeleteConfirmMember(null);
                  setDeleteBlockedData(null);
                  setForceDeleteChecked(false);
                }}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all"
              >
                Cancel
              </button>

              {deleteBlockedData ? (
                <button
                  disabled={!forceDeleteChecked || deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ id: deleteConfirmMember._id, force: true })}
                  className={`px-5 py-2.5 font-bold text-xs rounded-xl flex items-center gap-2 transition-all ${
                    forceDeleteChecked && !deleteMutation.isPending
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30'
                      : 'bg-slate-300 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {deleteMutation.isPending ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Force Delete Member
                    </>
                  )}
                </button>
              ) : (
                <button
                  disabled={deleteMutation.isPending}
                  onClick={() => deleteMutation.mutate({ id: deleteConfirmMember._id })}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-rose-600/30"
                >
                  {deleteMutation.isPending ? (
                    <>
                      <RefreshCw className="animate-spin" size={14} /> Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 size={14} /> Confirm Delete
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Full Customer Profile Page View Modal */}
      {fullProfileMemberId && (
        <div className="fixed inset-0 z-[80] overflow-y-auto bg-slate-950/70 backdrop-blur-md p-4 flex min-h-full items-center justify-center animate-in fade-in duration-200">
          <div className="w-full max-w-4xl max-h-[92vh] overflow-y-auto my-auto bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 relative">
            {/* Close button */}
            <button
              onClick={() => setFullProfileMemberId(null)}
              className="absolute right-5 top-5 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-all z-10"
            >
              <Plus className="rotate-45" size={24} />
            </button>

            {fullDetailsLoading || !memberFullDetails?.data?.member ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <RefreshCw className="animate-spin text-brand-500" size={32} />
                <span className="text-xs font-semibold text-slate-400">Loading complete customer record...</span>
              </div>
            ) : (
              (() => {
                const { member: m, loans: memberLoans } = memberFullDetails.data;
                const ratingColorMap: any = {
                  Best: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
                  Good: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40',
                  Average: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
                  Poor: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
                  Worst: 'bg-rose-500/20 text-rose-400 border-rose-500/40',
                };

                return (
                  <div className="flex flex-col gap-6">
                    {/* Profile Header Banner */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-2xl shadow-xl relative overflow-hidden">
                      <div className="flex items-center gap-4 z-10">
                        <div className="w-20 h-20 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden flex items-center justify-center text-3xl shrink-0 shadow-inner">
                          {m.photo ? (
                            <img src={m.photo.startsWith('http') ? m.photo : `${SERVER_URL}${m.photo}`} alt={m.name} className="w-full h-full object-cover" />
                          ) : (
                            '👩'
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h2 className="text-xl font-black tracking-tight">{m.name}</h2>
                            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded-full border ${ratingColorMap[m.feedbackRating || 'Good']}`}>
                              Rating: {m.feedbackRating || 'Good'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-300">Father's Name: {m.fatherName}</span>
                          <span className="text-xs text-slate-400">Aadhaar: {m.aadhaarNumber} • Phone: {m.phone}</span>
                        </div>
                      </div>

                      <div className="flex flex-col items-start sm:items-end gap-1.5 z-10">
                        <span className={`px-3 py-1 text-xs font-bold rounded-xl border ${
                          m.kycStatus === 'verified'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                            : m.kycStatus === 'rejected'
                            ? 'bg-rose-500/20 text-rose-400 border-rose-500/40'
                            : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                        }`}>
                          KYC {m.kycStatus?.toUpperCase() || 'PENDING'}
                        </span>
                        <span className="text-[11px] text-slate-400">Group: {m.kulu?.name || 'Unassigned'}</span>
                      </div>
                    </div>

                    {/* Feedback Rating Bar ("Worst to Best") */}
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                          <Star size={14} className="text-amber-500 fill-amber-500" /> Customer Performance Feedback Rating:
                        </span>
                        <span className="text-[10px] text-slate-400">Set or update repayment rating from Worst to Best</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {['Worst', 'Poor', 'Average', 'Good', 'Best'].map((rating) => {
                          const isSelected = (m.feedbackRating || 'Good') === rating;
                          const btnStyles: any = {
                            Best: isSelected ? 'bg-emerald-600 text-white font-black shadow-md' : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
                            Good: isSelected ? 'bg-cyan-600 text-white font-black shadow-md' : 'bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20',
                            Average: isSelected ? 'bg-amber-600 text-white font-black shadow-md' : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20',
                            Poor: isSelected ? 'bg-orange-600 text-white font-black shadow-md' : 'bg-orange-500/10 text-orange-600 hover:bg-orange-500/20',
                            Worst: isSelected ? 'bg-rose-600 text-white font-black shadow-md' : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20',
                          };
                          return (
                            <button
                              key={rating}
                              disabled={updateFeedbackMutation.isPending}
                              onClick={() => updateFeedbackMutation.mutate({ id: m._id, rating })}
                              className={`px-3 py-1 text-xs rounded-xl font-bold transition-all ${btnStyles[rating]}`}
                            >
                              {rating}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Section 1: Customer Personal & Mapped Kulu Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Personal Information */}
                      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                          Personal & Identity Profile
                        </h3>
                        <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                          <div><span className="text-slate-400 font-normal">Full Name:</span> <br /><strong>{m.name}</strong></div>
                          <div><span className="text-slate-400 font-normal">Gender:</span> <br /><strong>{m.gender}</strong></div>
                          <div><span className="text-slate-400 font-normal">Primary Phone:</span> <br /><strong>{m.phone}</strong></div>
                          <div><span className="text-slate-400 font-normal">Aadhaar No:</span> <br /><strong className="text-brand-500">{m.aadhaarNumber}</strong></div>
                          <div><span className="text-slate-400 font-normal">Occupation:</span> <br /><strong>{m.occupation}</strong></div>
                          <div><span className="text-slate-400 font-normal">Monthly Income:</span> <br /><strong className="text-emerald-500">₹{m.monthlyIncome?.toLocaleString()}</strong></div>
                        </div>
                      </div>

                      {/* Group (Kulu) & Address Information */}
                      <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm justify-between">
                        <div className="flex flex-col gap-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                            Group (Kulu) Information
                          </h3>
                          <div className="grid grid-cols-2 gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                            <div><span className="text-slate-400 font-normal">Kulu Group:</span> <br /><strong className="text-brand-500">{m.kulu?.name || 'Unassigned'}</strong></div>
                            <div><span className="text-slate-400 font-normal">Kulu Meeting Day:</span> <br /><strong>{m.kulu?.meetingDay || 'N/A'}</strong></div>
                            <div><span className="text-slate-400 font-normal">Area Segment:</span> <br /><strong>{m.kulu?.area?.name || m.address?.areaName || 'N/A'}</strong></div>
                            <div><span className="text-slate-400 font-normal">Field Officer:</span> <br /><strong>{m.kulu?.fieldOfficer?.name || 'Assigned Officer'}</strong></div>
                            {m.address?.street && (
                              <div className="col-span-2 mt-1"><span className="text-slate-400 font-normal">Full Address:</span> <br /><strong>{m.address?.street}, {m.address?.village}, {m.address?.district} - {m.address?.pincode}</strong></div>
                            )}
                          </div>
                        </div>

                        {/* Nominee */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800/80 rounded-xl text-xs flex justify-between items-center mt-2">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-medium">Nominee ({m.nominee?.relation})</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{m.nominee?.name}</span>
                          </div>
                          <span className="font-bold text-slate-500">{m.nominee?.phone}</span>
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Media & Documents Vault */}
                    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 border-b border-slate-100 dark:border-slate-800 pb-2">
                        Customer Documents Vault & KYC Media
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Photo */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center gap-2 text-center">
                          <span className="text-[10px] font-bold text-slate-400">Customer Photo</span>
                          <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center text-3xl">
                            {m.photo ? (
                              <a href={m.photo.startsWith('http') ? m.photo : `${SERVER_URL}${m.photo}`} target="_blank" rel="noopener noreferrer">
                                <img src={m.photo.startsWith('http') ? m.photo : `${SERVER_URL}${m.photo}`} alt="Photo" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                              </a>
                            ) : (
                              '📷'
                            )}
                          </div>
                        </div>

                        {/* Aadhaar Photo */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center gap-2 text-center">
                          <span className="text-[10px] font-bold text-slate-400">Aadhaar Card Document</span>
                          <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400 p-1">
                            {m.aadhaarPhoto ? (
                              <a href={m.aadhaarPhoto.startsWith('http') ? m.aadhaarPhoto : `${SERVER_URL}${m.aadhaarPhoto}`} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                                <img src={m.aadhaarPhoto.startsWith('http') ? m.aadhaarPhoto : `${SERVER_URL}${m.aadhaarPhoto}`} alt="Aadhaar" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                              </a>
                            ) : (
                              '📄 No Document Uploaded'
                            )}
                          </div>
                        </div>

                        {/* Signature Photo */}
                        <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl flex flex-col items-center gap-2 text-center">
                          <span className="text-[10px] font-bold text-slate-400">Customer Signature</span>
                          <div className="w-24 h-24 rounded-xl bg-slate-200 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 flex items-center justify-center text-xs text-slate-400 p-1">
                            {m.signature ? (
                              <a href={m.signature.startsWith('http') ? m.signature : `${SERVER_URL}${m.signature}`} target="_blank" rel="noopener noreferrer" className="w-full h-full">
                                <img src={m.signature.startsWith('http') ? m.signature : `${SERVER_URL}${m.signature}`} alt="Signature" className="w-full h-full object-contain hover:scale-105 transition-transform" />
                              </a>
                            ) : (
                              '✍️ Signature Specimen'
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Section 3: Financial Loans & Ledger Overview */}
                    <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 rounded-2xl flex flex-col gap-3 shadow-sm">
                      <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-2">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                          Loan Accounts & Financial History
                        </h3>
                        <span className="text-[11px] font-bold text-slate-400">Total Loans: {memberLoans?.length || 0}</span>
                      </div>

                      {!memberLoans || memberLoans.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400">No active or historical loan records found for this customer.</div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-slate-50 dark:bg-slate-950 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                                <th className="p-2.5">Loan No</th>
                                <th className="p-2.5">Scheme</th>
                                <th className="p-2.5 text-right">Loan Amount</th>
                                <th className="p-2.5 text-right">Weekly EMI</th>
                                <th className="p-2.5 text-right">Paid Amount</th>
                                <th className="p-2.5 text-right">Remaining</th>
                                <th className="p-2.5 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                              {memberLoans.map((loan: any) => (
                                <tr key={loan._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                                  <td className="p-2.5 font-bold text-brand-600 dark:text-brand-400">{loan.loanNumber}</td>
                                  <td className="p-2.5 font-semibold text-slate-700 dark:text-slate-300">{loan.scheme?.name || 'Standard'}</td>
                                  <td className="p-2.5 text-right font-semibold">₹{loan.loanAmount?.toLocaleString()}</td>
                                  <td className="p-2.5 text-right font-semibold">₹{loan.weeklyEMI?.toLocaleString()}</td>
                                  <td className="p-2.5 text-right text-emerald-500 font-bold">₹{loan.paidAmount?.toLocaleString()}</td>
                                  <td className="p-2.5 text-right text-rose-500 font-bold">₹{loan.remainingAmount?.toLocaleString()}</td>
                                  <td className="p-2.5 text-center">
                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                                      loan.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : loan.status === 'completed' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-rose-500/10 text-rose-500'
                                    }`}>
                                      {loan.status}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      )}
    </div>
  );
}
