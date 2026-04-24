import { useState, useEffect, FormEvent } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Plus, Edit2, Trash2, Search, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Petugas {
  id: string;
  nama: string;
  niat: string;
  tingkatSPPD: string;
  jenis: 'TKSK Blora' | 'TAGANA Blora';
  kontak?: string;
  keterangan?: string;
}

export default function PetugasPage() {
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentPetugas, setCurrentPetugas] = useState<Partial<Petugas> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchPetugas();
  }, []);

  const fetchPetugas = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'petugas'));
      setPetugas(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Petugas)));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentPetugas?.nama || !currentPetugas?.jenis) return;

    try {
      if (currentPetugas.id) {
        await updateDoc(doc(db, 'petugas', currentPetugas.id), {
          nama: currentPetugas.nama,
          niat: currentPetugas.niat || '',
          tingkatSPPD: currentPetugas.tingkatSPPD || '',
          jenis: currentPetugas.jenis,
          kontak: currentPetugas.kontak || '',
          keterangan: currentPetugas.keterangan || ''
        });
      } else {
        await addDoc(collection(db, 'petugas'), {
          nama: currentPetugas.nama,
          niat: currentPetugas.niat || '',
          tingkatSPPD: currentPetugas.tingkatSPPD || '',
          jenis: currentPetugas.jenis,
          kontak: currentPetugas.kontak || '',
          keterangan: currentPetugas.keterangan || '',
          createdAt: new Date().toISOString()
        });
      }
      setIsModalOpen(false);
      setCurrentPetugas(null);
      fetchPetugas();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'petugas', deleteId));
      setIsDeleteModalOpen(false);
      setDeleteId(null);
      fetchPetugas();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFilter = () => {
    // Note: 'petugas' data already loaded with 'niat' instead of 'nip'
    fetchPetugas();
  };

  const filteredPetugas = petugas.filter(p => 
    p.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.jenis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Cari petugas..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={() => {
            setCurrentPetugas({ jenis: 'TKSK Blora' });
            setIsModalOpen(true);
          }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus size={18} />
          Tambah Petugas
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              <tr>
                <th className="px-6 py-3">Petugas</th>
                <th className="px-6 py-3 text-center">Jenis</th>
                <th className="px-6 py-3">SPPD</th>
                <th className="px-6 py-3">Kontak</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Memuat data...</td></tr>
              ) : filteredPetugas.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-400 italic">Tidak ada data petugas.</td></tr>
              ) : filteredPetugas.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold text-slate-800">{p.nama}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.niat || 'Tanpa NIAT'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.jenis === 'TKSK Blora' ? 'bg-indigo-50 text-indigo-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {p.jenis}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                     <span className="text-xs font-medium text-slate-500">{p.tingkatSPPD || '-'}</span>
                  </td>
                  <td className="px-6 py-4">{p.kontak || '-'}</td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button
                      onClick={() => {
                        setCurrentPetugas(p);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteId(p.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl p-8 border border-slate-200"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold tracking-tight text-slate-800">
                  {currentPetugas?.id ? 'Edit Data Petugas' : 'Registrasi Petugas Baru'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-5">
                {/* Row 1: Nama & NIAT */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Lengkap *</label>
                    <input
                      type="text"
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      value={currentPetugas?.nama || ''}
                      onChange={(e) => setCurrentPetugas({ ...currentPetugas, nama: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">NIAT (Nomor Induk Tagana/TKSK)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      value={currentPetugas?.niat || ''}
                      onChange={(e) => setCurrentPetugas({ ...currentPetugas, niat: e.target.value })}
                    />
                  </div>
                </div>

                {/* Row 2: Jenis */}
                <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Jenis Petugas</label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      value={currentPetugas?.jenis || 'TKSK Blora'}
                      onChange={(e) => setCurrentPetugas({ ...currentPetugas, jenis: e.target.value as any })}
                    >
                      <option value="TKSK Blora">TKSK Blora</option>
                      <option value="TAGANA Blora">TAGANA Blora</option>
                    </select>
                  </div>
                </div>

                {/* Row 3: Tingkat SPPD & Kontak */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tingkat SPPD</label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      value={currentPetugas?.tingkatSPPD || ''}
                      onChange={(e) => setCurrentPetugas({ ...currentPetugas, tingkatSPPD: e.target.value })}
                    >
                      <option value="">- Pilih Tingkat -</option>
                      <option value="A">Tingkat A</option>
                      <option value="B">Tingkat B</option>
                      <option value="C">Tingkat C</option>
                      <option value="D">Tingkat D</option>
                      <option value="E">Tingkat E</option>
                      <option value="F">Tingkat F</option>
                      <option value="G">Tingkat G</option>
                      <option value="H">Tingkat H</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nomor Kontak (WhatsApp)</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      value={currentPetugas?.kontak || ''}
                      onChange={(e) => setCurrentPetugas({ ...currentPetugas, kontak: e.target.value })}
                    />
                  </div>
                </div>

                {/* Row 4: Keterangan */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Catatan Keterangan</label>
                  <textarea
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none h-24"
                    value={currentPetugas?.keterangan || ''}
                    onChange={(e) => setCurrentPetugas({ ...currentPetugas, keterangan: e.target.value })}
                  />
                </div>

                <div className="pt-6 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-2.5 border border-slate-200 rounded-md font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold shadow-sm transition-colors"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDeleteModalOpen && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDeleteModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl p-6 border border-slate-200 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Konfirmasi Hapus</h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">
                Apakah Anda yakin ingin menghapus data petugas ini? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-sm transition-colors"
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
