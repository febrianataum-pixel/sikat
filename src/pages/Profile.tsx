import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useUserRole } from '../hooks/useUserRole';
import { User, Mail, Shield, UserCheck, Save, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';

export default function Profile() {
  const { role, userProfile, loading: roleLoading } = useUserRole(auth.currentUser);
  const [petugasList, setPetugasList] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    petugasId: '',
    phone: ''
  });

  useEffect(() => {
    if (userProfile) {
      setFormData({
        name: userProfile.name || '',
        petugasId: userProfile.petugasId || '',
        phone: (userProfile as any).phone || ''
      });
    }

    async function fetchPetugas() {
      const snap = await getDocs(collection(db, 'petugas'));
      setPetugasList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }
    fetchPetugas();
  }, [userProfile]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        name: formData.name,
        petugasId: formData.petugasId,
        phone: formData.phone
      });
      alert('Profil berhasil diperbaharui!');
      window.location.reload(); 
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan profil.');
    } finally {
      setSaving(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-indigo-600 relative">
          <div className="absolute -bottom-10 left-8">
            <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg">
              <div className="w-full h-full rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
                <User size={48} />
              </div>
            </div>
          </div>
        </div>
        
        <div className="pt-12 p-8">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">{userProfile?.name}</h2>
              <p className="text-slate-500 font-medium">{userProfile?.email}</p>
            </div>
            <div className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-2 border border-indigo-100">
              <Shield size={12} /> {role === 'admin' ? 'Administrator' : 'Petugas'}
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Shield size={14} className="text-indigo-600" /> Nama Tampilan
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-semibold text-slate-700"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Mail size={14} className="text-indigo-600" /> Nomor HP / WhatsApp
              </label>
              <input
                type="tel"
                placeholder="0812345..."
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-semibold text-slate-700"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <UserCheck size={14} className="text-indigo-600" /> Tautkan ke Data Petugas
              </label>
              <select
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-semibold text-slate-700"
                value={formData.petugasId}
                onChange={(e) => setFormData({ ...formData, petugasId: e.target.value })}
              >
                <option value="">-- Pilih Nama Petugas --</option>
                {petugasList.map(p => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1 italic">
                * Menautkan akun akan memudahkan Anda saat menginput kegiatan (nama otomatis terpilih).
              </p>
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-100 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              SIMPAN PERUBAHAN
            </button>
          </div>
        </div>
      </div>

      <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 flex items-start gap-4">
        <div className="p-2 bg-white rounded-lg shadow-sm text-slate-400">
          <Shield size={20} />
        </div>
        <div>
          <h4 className="font-bold text-slate-700 text-sm">Informasi Keamanan</h4>
          <p className="text-xs text-slate-500 leading-relaxed mt-1">
            Role akun Anda ditentukan oleh Administrator. Jika terdapat kekeliruan role, silakan hubungi tim IT atau Admin Dinas Sosial Blora.
          </p>
        </div>
      </div>
    </div>
  );
}
