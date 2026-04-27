import { useState, useEffect, FormEvent } from 'react';
import { collection, addDoc, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  Send, 
  User, 
  Calendar, 
  MapPin, 
  AlignLeft, 
  CheckCircle2, 
  ArrowLeft,
  Search,
  ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../hooks/useUserRole';

interface Petugas {
  id: string;
  nama: string;
}

interface SubKegiatan {
  id: string;
  kode: string;
  nama: string;
}

export default function InputCepat() {
  const navigate = useNavigate();
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [subKegiatan, setSubKegiatan] = useState<SubKegiatan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const { userProfile, loading: roleLoading } = useUserRole(auth.currentUser);

  const [formData, setFormData] = useState({
    petugasId: '',
    tanggal: new Date().toISOString().split('T')[0],
    tempat: '',
    uraian: '',
    subKegiatanId: '',
    lamaPerjalanan: 1
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    async function fetchData() {
      try {
        const [pSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'petugas')),
          getDocs(collection(db, 'sub_kegiatan'))
        ]);
        setPetugas(pSnap.docs.map(doc => ({ id: doc.id, nama: doc.data().nama })));
        setSubKegiatan(sSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SubKegiatan)));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  useEffect(() => {
    if (userProfile?.petugasId && !formData.petugasId) {
      setFormData(prev => ({ ...prev, petugasId: userProfile.petugasId || '' }));
    }
  }, [userProfile, formData.petugasId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.petugasId || !formData.tempat || !formData.uraian || !formData.subKegiatanId) {
      alert('Mohon lengkapi semua data wajib (*)');
      return;
    }

    setSaving(true);
    try {
      const pNama = petugas.find(p => p.id === formData.petugasId)?.nama || '';
      
      await addDoc(collection(db, 'kegiatan'), {
        ...formData,
        petugasNama: pNama,
        hasLaporan: false,
        hasDokumentasi: false,
        hasSppd: false,
        laporanSelesai: false,
        nomor: '',
        nomorUrut: '',
        tahun: new Date().getFullYear().toString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdByEmail: auth.currentUser?.email || 'N/A',
        createdByNama: auth.currentUser?.displayName || 'N/A'
      });

      setSuccess(true);
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      console.error(err);
      alert('Gagal mengirim data. Coba lagi.');
    } finally {
      setSaving(false);
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Menyiapkan Form...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={48} />
          </div>
          <h2 className="text-2xl font-bold text-emerald-900 mb-2">Berhasil Terkirim!</h2>
          <p className="text-emerald-700 font-medium">Data kegiatan Anda telah masuk ke sistem SIKAT.</p>
        </motion.div>
      </div>
    );
  }

  const filteredPetugas = petugas.filter(p => 
    p.nama.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans antialiased">
      {/* Header */}
      <div className="bg-indigo-600 text-white p-6 pb-12 rounded-b-[40px] shadow-lg">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/')} className="p-2 hover:bg-indigo-500 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold tracking-tight">Input Kegiatan Petugas</h1>
        </div>
        <p className="text-indigo-100 text-sm italic opacity-80">
          "Tetap semangat dalam melayani, data Anda sangat berharga bagi koordinasi kita."
        </p>
      </div>

      {/* Form Card */}
      <div className="px-6 -mt-8">
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 p-6 border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Petugas Selection */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <User size={14} className="text-indigo-500" /> Nama Petugas *
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between text-left"
                >
                  <span className={formData.petugasId ? "text-slate-800 font-bold" : "text-slate-400"}>
                    {formData.petugasId 
                      ? petugas.find(p => p.id === formData.petugasId)?.nama 
                      : "-- Pilih Nama Anda --"}
                  </span>
                  <ChevronDown size={18} className={`text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {isDropdownOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
                    >
                      <div className="p-3 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                        <Search size={14} className="text-slate-400" />
                        <input
                          autoFocus
                          type="text"
                          placeholder="Cari nama..."
                          className="w-full bg-transparent outline-none text-sm font-medium"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredPetugas.map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, petugasId: p.id });
                              setIsDropdownOpen(false);
                            }}
                            className="w-full text-left px-4 py-4 text-sm font-bold text-slate-700 hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0"
                          >
                            {p.nama}
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Tanggal & Lama */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Calendar size={14} className="text-indigo-500" /> Tanggal *
                </label>
                <input
                  type="date"
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800"
                  value={formData.tanggal}
                  onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <AlignLeft size={14} className="text-indigo-500" /> Lama (Hari)
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800"
                  value={formData.lamaPerjalanan}
                  onChange={(e) => setFormData({ ...formData, lamaPerjalanan: Number(e.target.value) })}
                />
              </div>
            </div>

            {/* Sub Kegiatan */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <AlignLeft size={14} className="text-indigo-500" /> Sub Kegiatan *
              </label>
              <select
                required
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800 outline-none"
                value={formData.subKegiatanId}
                onChange={(e) => setFormData({ ...formData, subKegiatanId: e.target.value })}
              >
                <option value="">-- Pilih Mata Anggaran --</option>
                {subKegiatan.map(sub => (
                  <option key={sub.id} value={sub.id}>{sub.nama}</option>
                ))}
              </select>
            </div>

            {/* Tempat */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} className="text-indigo-500" /> Tempat / Lokasi *
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Balai Desa Sidoasri"
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-800"
                value={formData.tempat}
                onChange={(e) => setFormData({ ...formData, tempat: e.target.value })}
              />
            </div>

            {/* Uraian */}
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <AlignLeft size={14} className="text-indigo-500" /> Deskripsi Kerja *
              </label>
              <textarea
                required
                placeholder="Tuliskan detail kegiatan hari ini..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium text-slate-700 min-h-[120px] resize-none"
                value={formData.uraian}
                onChange={(e) => setFormData({ ...formData, uraian: e.target.value })}
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-5 rounded-3xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <Send size={20} />
              {saving ? 'SEDANG MENGIRIM...' : 'KIRIM DATA SEKARANG'}
            </button>
          </form>
        </div>
      </div>

      <div className="mt-8 px-8 text-center">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-loose">
          Aplikasi SIKAT &bull; Dinas Sosial Blora<br/>
          Update Manual Terintegrasi
        </p>
      </div>
    </div>
  );
}
