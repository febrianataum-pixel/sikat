import * as XLSX from 'xlsx';
import { useState, useEffect, useRef } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, setDoc, getDoc, query, orderBy, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { 
  Settings, 
  Layers, 
  Wallet, 
  Fuel, 
  UserCheck,
  Save,
  Trash2,
  Plus,
  Image as ImageIcon,
  CheckCircle,
  FileText,
  Briefcase,
  X,
  Upload,
  ShieldAlert,
  Users as UsersIcon,
  Fingerprint,
  Phone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { DEFAULT_LOGO } from '../constants';
import { useUserRole } from '../hooks/useUserRole';
import { auth } from '../lib/firebase';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

type UtilityTab = 'umum' | 'sub_kegiatan' | 'biaya' | 'bbm' | 'bendahara' | 'users';

export default function UtilitasPage() {
  const [activeTab, setActiveTab] = useState<UtilityTab>('umum');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ coll: string, id: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [settings, setSettings] = useState({ logoUrl: DEFAULT_LOGO, dasarHukum: [] as string[] });
  const [logoUrlInput, setLogoUrlInput] = useState(DEFAULT_LOGO);
  const [newDasarHukum, setNewDasarHukum] = useState('');
  const [isAddingDasarHukum, setIsAddingDasarHukum] = useState(false);
  const [subKegiatan, setSubKegiatan] = useState<{id?: string, kode: string, nama: string}[]>([]);
  const [biaya, setBiaya] = useState<{id?: string, tingkat: string, jenis: 'Dalam Daerah' | 'Luar Daerah', nominal: number}[]>([]);
  const [bbm, setBbm] = useState<{id?: string, jenis: string, harga: number}[]>([]);
  const [manajemen, setManajemen] = useState<{id?: string, nama: string, nip: string, pangkat: string, jabatan: string}[]>([]);

  // Editing States
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingDasarHukumIndex, setEditingDasarHukumIndex] = useState<number | null>(null);

  // Temp form inputs
  const [newSub, setNewSub] = useState({ kode: '', nama: '' });
  const [newBiaya, setNewBiaya] = useState({ tingkat: 'A', jenis: 'Dalam Daerah' as const, nominal: 0 });
  const [newBbm, setNewBbm] = useState({ jenis: '', harga: 0 });
  const [newManajemen, setNewManajemen] = useState({ nama: '', nip: '', pangkat: '', jabatan: '' });
  const [users, setUsers] = useState<any[]>([]);
  const [petugasMeta, setPetugasMeta] = useState<any[]>([]);
  const [newUser, setNewUser] = useState({ 
    username: '', 
    password: '', 
    phone: '', 
    name: '', 
    role: 'petugas' as 'admin' | 'petugas',
    email: '', // for google login admin
    petugasId: ''
  });

  const { role, loading: roleLoading } = useUserRole(auth.currentUser);

  useEffect(() => {
    if (role === 'admin') {
      fetchData();
    }
  }, [activeTab, role]);

  if (roleLoading) return null;
  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Dibatasi</h2>
        <p className="text-slate-500 max-w-sm font-medium">Maaf, halaman utilitas dan pengaturan hanya dapat diakses oleh Administrator Sistem.</p>
      </div>
    );
  }

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'umum') {
        const docSnap = await getDoc(doc(db, 'settings', 'general'));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const logo = data.logoUrl || DEFAULT_LOGO;
          setSettings({ 
            logoUrl: logo, 
            dasarHukum: Array.isArray(data.dasarHukum) ? data.dasarHukum : [] 
          });
          setLogoUrlInput(logo);
        } else {
          // Fallback check collection for any doc (legacy)
          const snap = await getDocs(collection(db, 'settings'));
          if (!snap.empty) {
             const data = snap.docs[0].data();
             const logo = data.logoUrl || DEFAULT_LOGO;
             setSettings({ 
               logoUrl: logo, 
               dasarHukum: Array.isArray(data.dasarHukum) ? data.dasarHukum : [] 
             });
             setLogoUrlInput(logo);
          }
        }
      } else if (activeTab === 'sub_kegiatan') {
        const snap = await getDocs(collection(db, 'sub_kegiatan'));
        setSubKegiatan(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } else if (activeTab === 'biaya') {
        const snap = await getDocs(collection(db, 'biaya_perjalanan'));
        setBiaya(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } else if (activeTab === 'bbm') {
        const snap = await getDocs(collection(db, 'bahan_bakar'));
        setBbm(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } else if (activeTab === 'bendahara') {
        const snap = await getDocs(collection(db, 'manajemen'));
        setManajemen(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      } else if (activeTab === 'users') {
        const [uSnap, pSnap] = await Promise.all([
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'petugas'))
        ]);
        setUsers(uSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
        setPetugasMeta(pSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const showSuccess = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleSaveUmum = async () => {
    setLoading(true);
    try {
      const nextSettings = { ...settings, logoUrl: logoUrlInput };
      await setDoc(doc(db, 'settings', 'general'), nextSettings);
      setSettings(nextSettings);
      showSuccess('Pengaturan umum berhasil disimpan');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan pengaturan.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLogo = async () => {
    if (!logoUrlInput.trim()) return;
    setLoading(true);
    try {
      const nextSettings = { ...settings, logoUrl: logoUrlInput.trim() };
      await setDoc(doc(db, 'settings', 'general'), nextSettings);
      setSettings(nextSettings);
      showSuccess('Logo KOP berhasil diperbarui');
    } catch (err) {
      console.error("Update logo error:", err);
      alert('Gagal memperbarui logo.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSub = async () => {
    if (!newSub.kode || !newSub.nama) return;
    setLoading(true);
    try {
      if (editingId) {
        await setDoc(doc(db, 'sub_kegiatan', editingId), newSub);
      } else {
        await addDoc(collection(db, 'sub_kegiatan'), newSub);
      }
      setNewSub({ kode: '', nama: '' });
      setEditingId(null);
      setIsEditing(false);
      fetchData();
      showSuccess(editingId ? 'Sub kegiatan berhasil diperbarui' : 'Sub kegiatan berhasil ditambahkan');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBiaya = async () => {
    if (newBiaya.nominal <= 0) return;
    setLoading(true);
    try {
      if (editingId) {
        await setDoc(doc(db, 'biaya_perjalanan', editingId), newBiaya);
      } else {
        await addDoc(collection(db, 'biaya_perjalanan'), newBiaya);
      }
      setNewBiaya({ tingkat: 'A', jenis: 'Dalam Daerah', nominal: 0 });
      setEditingId(null);
      setIsEditing(false);
      fetchData();
      showSuccess(editingId ? 'Data biaya berhasil diperbarui' : 'Data biaya berhasil ditambahkan');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBbm = async () => {
    if (!newBbm.jenis || newBbm.harga <= 0) return;
    setLoading(true);
    try {
      if (editingId) {
        await setDoc(doc(db, 'bahan_bakar', editingId), newBbm);
      } else {
        await addDoc(collection(db, 'bahan_bakar'), newBbm);
      }
      setNewBbm({ jenis: '', harga: 0 });
      setEditingId(null);
      setIsEditing(false);
      fetchData();
      showSuccess(editingId ? 'Data BBM berhasil diperbarui' : 'Data BBM berhasil ditambahkan');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddManajemen = async () => {
    if (!newManajemen.nama || !newManajemen.jabatan) return;
    setLoading(true);
    try {
      if (editingId) {
        await setDoc(doc(db, 'manajemen', editingId), newManajemen);
      } else {
        await addDoc(collection(db, 'manajemen'), newManajemen);
      }
      setNewManajemen({ nama: '', nip: '', pangkat: '', jabatan: '' });
      setEditingId(null);
      setIsEditing(false);
      fetchData();
      showSuccess(editingId ? 'Pejabat manajemen berhasil diperbarui' : 'Pejabat manajemen berhasil ditambahkan');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    setLoading(true);
    try {
      if (editingId) {
        // Update Firestore doc only for simplicity (editing roles/meta)
        // If password is provided, we can't easily change it here without current context
        const updateData: any = {
          name: newUser.name,
          role: newUser.role,
          phone: newUser.phone,
          petugasId: newUser.petugasId,
          updatedAt: new Date().toISOString()
        };
        
        // If it's a manual petugas user, we might want to update username too
        if (newUser.role === 'petugas') {
          updateData.username = newUser.username;
          updateData.email = `${newUser.username}@sikat.id`;
        } else {
          updateData.email = newUser.email;
        }

        await updateDoc(doc(db, 'users', editingId), updateData);
        setEditingId(null);
        setIsEditing(false);
        setNewUser({ username: '', password: '', phone: '', name: '', role: 'petugas', email: '', petugasId: '' });
        fetchData();
        showSuccess('User berhasil diperbarui');
        setLoading(false);
        return;
      }

      let email = newUser.email;
      let uid = '';

      if (newUser.role === 'petugas') {
        if (!newUser.username || !newUser.password) {
          alert('Username dan Password wajib diisi untuk petugas.');
          setLoading(false);
          return;
        }
        email = `${newUser.username}@sikat.id`;
        
        // Create Firebase Auth user using secondary app hack
        const secondaryApp = initializeApp(firebaseConfig, 'SecondaryRegistrationApp');
        const secondaryAuth = getAuth(secondaryApp);
        try {
          const userCredential = await createUserWithEmailAndPassword(secondaryAuth, email, newUser.password);
          uid = userCredential.user.uid;
        } catch (err: any) {
          if (err.code === 'auth/email-already-in-use') {
             // Maybe document already exists but auth was deleted? Or just error.
             alert('Username sudah terdaftar.');
             await deleteApp(secondaryApp);
             setLoading(false);
             return;
          }
          throw err;
        }
        await deleteApp(secondaryApp);
      } else {
        if (!newUser.email) {
          alert('Email (Google Account) wajib diisi untuk Admin.');
          setLoading(false);
          return;
        }
      }

      const userData = {
        name: newUser.name,
        role: newUser.role,
        email: email,
        phone: newUser.phone,
        petugasId: newUser.petugasId,
        username: newUser.username || '',
        createdAt: new Date().toISOString()
      };

      if (uid) {
        await setDoc(doc(db, 'users', uid), userData);
      } else {
        await addDoc(collection(db, 'users'), userData);
      }

      setNewUser({ username: '', password: '', phone: '', name: '', role: 'petugas', email: '', petugasId: '' });
      fetchData();
      showSuccess('User berhasil dibuat');
    } catch (err: any) {
      console.error(err);
      alert('Gagal membuat user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (tab: UtilityTab, item: any) => {
    setEditingId(item.id);
    setIsEditing(true);
    if (tab === 'sub_kegiatan') {
      setNewSub({ kode: item.kode, nama: item.nama });
    } else if (tab === 'biaya') {
      setNewBiaya({ tingkat: item.tingkat, jenis: item.jenis, nominal: item.nominal });
    } else if (tab === 'bbm') {
      setNewBbm({ jenis: item.jenis, harga: item.harga });
    } else if (tab === 'bendahara') {
      setNewManajemen({ nama: item.nama, nip: item.nip, pangkat: item.pangkat, jabatan: item.jabatan });
    } else if (tab === 'users') {
      setNewUser({ 
        username: item.username || '', 
        password: '', 
        phone: item.phone || '', 
        name: item.name || '', 
        role: item.role || 'petugas',
        email: item.email || '',
        petugasId: item.petugasId || ''
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setIsEditing(false);
    setNewSub({ kode: '', nama: '' });
    setNewBiaya({ tingkat: 'A', jenis: 'Dalam Daerah', nominal: 0 });
    setNewBbm({ jenis: '', harga: 0 });
    setNewManajemen({ nama: '', nip: '', pangkat: '', jabatan: '' });
    setNewUser({ username: '', password: '', phone: '', name: '', role: 'petugas', email: '', petugasId: '' });
  };

  const downloadUsersExcel = () => {
    const data = users.map((u, index) => ({
      'No': index + 1,
      'Nama Lengkap': u.name,
      'Username': u.username || (u.email?.split('@')[0]) || '-',
      'Password': '***'
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "Daftar_User_SIKAT.xlsx");
  };

  const confirmDelete = (coll: string, id: string) => {
    setDeleteTarget({ coll, id });
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDoc(doc(db, deleteTarget.coll, deleteTarget.id));
      setIsDeleteModalOpen(false);
      setDeleteTarget(null);
      fetchData();
      showSuccess('Data berhasil dihapus');
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDasarHukum = async () => {
    if (!newDasarHukum.trim()) return;
    setLoading(true);
    try {
      let newList = [...settings.dasarHukum];
      if (editingDasarHukumIndex !== null) {
        newList[editingDasarHukumIndex] = newDasarHukum.trim();
      } else {
        newList.push(newDasarHukum.trim());
      }
      
      const newSettings = { ...settings, dasarHukum: newList };
      setSettings(newSettings);
      await setDoc(doc(db, 'settings', 'general'), newSettings);
      setNewDasarHukum('');
      setIsAddingDasarHukum(false);
      setEditingDasarHukumIndex(null);
      showSuccess(editingDasarHukumIndex !== null ? 'Dasar hukum diperbarui' : 'Dasar hukum ditambahkan');
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan dasar hukum');
    } finally {
      setLoading(false);
    }
  };

  const startEditDasarHukum = (index: number) => {
    setNewDasarHukum(settings.dasarHukum[index]);
    setEditingDasarHukumIndex(index);
    setIsAddingDasarHukum(true);
  };

  const cancelEditDasarHukum = () => {
    setNewDasarHukum('');
    setEditingDasarHukumIndex(null);
    setIsAddingDasarHukum(false);
  };

  const handleDeleteDasarHukum = async (index: number) => {
    setLoading(true);
    try {
      const newList = [...settings.dasarHukum];
      newList.splice(index, 1);
      const newSettings = { ...settings, dasarHukum: newList };
      setSettings(newSettings);
      await setDoc(doc(db, 'settings', 'general'), newSettings);
      showSuccess('Dasar hukum dihapus');
    } catch (err) {
      console.error(err);
      alert('Gagal menghapus dasar hukum');
    } finally {
      setLoading(false);
    }
  };

  const tabs: {id: UtilityTab, name: string, icon: any}[] = [
    { id: 'umum', name: 'Umum & KOP', icon: ImageIcon },
    { id: 'sub_kegiatan', name: 'Sub Kegiatan', icon: Layers },
    { id: 'biaya', name: 'Biaya Perjalanan', icon: Wallet },
    { id: 'bbm', name: 'Bahan Bakar', icon: Fuel },
    { id: 'bendahara', name: 'Bendahara Pembantu', icon: Briefcase },
    { id: 'users', name: 'Manajemen User', icon: UsersIcon },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">Utilitas & Pengaturan</h2>
          <p className="text-sm text-slate-500 font-medium italic">Konfigurasi sistem dan data referensi</p>
        </div>
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 border border-emerald-100 shadow-sm"
            >
              <CheckCircle size={16} />
              {success}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-64 space-y-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-sm transition-all text-left",
                activeTab === tab.id 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-100" 
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-transparent hover:border-slate-200"
              )}
            >
              <tab.icon size={18} />
              {tab.name}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {activeTab === 'umum' && (
              <div className="p-8 space-y-12">
                {/* Logo Section */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                      <ImageIcon size={20} />
                    </div>
                    Logo KOP Surat
                  </h3>
                  <div className="flex items-center gap-8 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <div className="w-40 h-40 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center relative overflow-hidden shadow-sm group">
                      {settings.logoUrl ? (
                        <img 
                          key={settings.logoUrl}
                          src={settings.logoUrl} 
                          className="w-full h-full object-contain p-2" 
                          onError={() => {
                            console.error("Image load error for logoUrl:", settings.logoUrl);
                            // Only set fallback if it's NOT already the default logo
                            if (settings.logoUrl !== DEFAULT_LOGO) {
                              setSettings(prev => ({ ...prev, logoUrl: DEFAULT_LOGO }));
                            }
                          }}
                        />
                      ) : (
                        <ImageIcon size={48} className="text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1 space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">URL Gambar Logo</label>
                        <div className="flex gap-2">
                          <input 
                            type="text" 
                            className="flex-1 px-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm"
                            placeholder="Tempel URL logo di sini (https://...)"
                            value={logoUrlInput}
                            onChange={(e) => setLogoUrlInput(e.target.value)}
                          />
                          <button 
                            onClick={handleUpdateLogo}
                            disabled={loading || !logoUrlInput.trim()}
                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-6 py-2 rounded-xl font-bold text-sm shadow-md transition-all flex items-center gap-2"
                          >
                            <Save size={18} />
                            Simpan
                          </button>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed italic max-w-md">
                        Tempelkan link/URL gambar logo Kabupaten atau Instansi. Tips: Klik kanan gambar di web, lalu pilih "Copy Image Address".
                      </p>
                    </div>
                  </div>
                </div>

                {/* Dasar Hukum Section */}
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-slate-800 flex items-center gap-3">
                        <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                          <FileText size={20} />
                        </div>
                        Dasar Hukum (Surat Tugas)
                      </h3>
                      <button 
                        onClick={() => {
                          if (isAddingDasarHukum) cancelEditDasarHukum();
                          else setIsAddingDasarHukum(true);
                        }}
                        className={cn(
                          "p-2 rounded-lg transition-all",
                          isAddingDasarHukum ? "bg-rose-50 text-rose-600 hover:bg-rose-100" : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100"
                        )}
                      >
                        {isAddingDasarHukum ? <X size={20} /> : <Plus size={20} />}
                      </button>
                    </div>

                    <AnimatePresence>
                      {isAddingDasarHukum && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className={cn(
                            "p-6 rounded-2xl border space-y-4",
                            editingDasarHukumIndex !== null ? "bg-amber-50 border-amber-100" : "bg-indigo-50/50 border-indigo-100"
                          )}>
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                                {editingDasarHukumIndex !== null ? 'Edit Dasar Hukum' : 'Tambah Dasar Hukum Baru'}
                              </h4>
                            </div>
                            <textarea
                              className="w-full px-4 py-3 bg-white border border-indigo-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all h-24 resize-none text-sm text-slate-600 leading-relaxed font-serif"
                              placeholder="Masukkan dasar hukum baru... (Contoh: Keputusan Kepala Dinas Sosial Nomor...)"
                              value={newDasarHukum}
                              onChange={(e) => setNewDasarHukum(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={cancelEditDasarHukum}
                                className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-all"
                              >
                                Batal
                              </button>
                              <button
                                onClick={handleAddDasarHukum}
                                disabled={loading || !newDasarHukum.trim()}
                                className={cn(
                                  "px-6 py-2 text-white text-xs font-bold rounded-lg disabled:opacity-50 transition-all flex items-center gap-2",
                                  editingDasarHukumIndex !== null ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                                )}
                              >
                                {editingDasarHukumIndex !== null ? <Save size={14} /> : <CheckCircle size={14} />}
                                {editingDasarHukumIndex !== null ? 'Simpan Perubahan' : 'Simpan Dasar Hukum'}
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    <div className="space-y-3">
                      {settings.dasarHukum.map((item, idx) => (
                        <div key={idx} className="flex gap-2 group">
                          <div className="flex-1 px-5 py-4 bg-slate-50 border border-slate-100 rounded-xl text-sm text-slate-600 font-serif leading-relaxed italic shadow-sm group-hover:bg-white group-hover:border-indigo-100 transition-all">
                            {item}
                          </div>
                          <div className="flex flex-col gap-1">
                            <button 
                              onClick={() => startEditDasarHukum(idx)}
                              className="p-3 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                              title="Edit"
                            >
                              <Settings size={18} />
                            </button>
                            <button 
                              onClick={() => handleDeleteDasarHukum(idx)}
                              className="p-3 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                              title="Hapus"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                      ))}
                    {settings.dasarHukum.length === 0 && (
                      <div className="px-6 py-12 border-2 border-dashed border-slate-100 rounded-2xl text-center text-slate-400 italic text-sm">
                        Belum ada dasar hukum yang ditambahkan.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'sub_kegiatan' && (
              <div className="p-8 space-y-8">
                <div className={cn(
                  "rounded-2xl p-6 border transition-all space-y-4",
                  isEditing ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                )}>
                   <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold text-slate-800">
                       {isEditing ? 'Edit Sub Kegiatan' : 'Tambah Sub Kegiatan Baru'}
                     </h3>
                     {isEditing && (
                       <button onClick={cancelEdit} className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:underline">
                         <X size={14} /> Batal
                       </button>
                     )}
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input 
                        type="text" 
                        placeholder="Kode: 01.01.01" 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newSub.kode}
                        onChange={e => setNewSub({...newSub, kode: e.target.value})}
                      />
                      <input 
                        type="text" 
                        placeholder="Nama Sub Kegiatan" 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 sm:col-span-1"
                        value={newSub.nama}
                        onChange={e => setNewSub({...newSub, nama: e.target.value})}
                      />
                      <button 
                        onClick={handleAddSub}
                        disabled={loading}
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors text-white",
                          isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                        )}
                      >
                        {isEditing ? <Save size={16} /> : <Plus size={16} />} 
                        {isEditing ? 'Simpan Perubahan' : 'Tambah'}
                      </button>
                   </div>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-xl">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Kode</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Sub Kegiatan</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase text-slate-400">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {subKegiatan.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm font-mono text-indigo-600">{item.kode}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-medium">{item.nama}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                            <button 
                              onClick={() => startEdit('sub_kegiatan', item)} 
                              className="text-slate-300 hover:text-indigo-600 p-1 transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button onClick={() => confirmDelete('sub_kegiatan', item.id!)} className="text-slate-300 hover:text-rose-600 p-1 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'biaya' && (
              <div className="p-8 space-y-8">
                <div className={cn(
                  "rounded-2xl p-6 border transition-all space-y-4",
                  isEditing ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                )}>
                   <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold text-slate-800">
                       {isEditing ? 'Edit Standar Biaya' : 'Tambah Standar Biaya Baru'}
                     </h3>
                     {isEditing && (
                       <button onClick={cancelEdit} className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:underline">
                         <X size={14} /> Batal
                       </button>
                     )}
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                      <select 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={newBiaya.tingkat}
                        onChange={e => setNewBiaya({...newBiaya, tingkat: e.target.value})}
                      >
                         {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(t => <option key={t} value={t}>Tingkat {t}</option>)}
                      </select>
                      <select 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={newBiaya.jenis}
                        onChange={e => setNewBiaya({...newBiaya, jenis: e.target.value as any})}
                      >
                         <option value="Dalam Daerah">Dalam Daerah</option>
                         <option value="Luar Daerah">Luar Daerah</option>
                      </select>
                      <input 
                        type="number" 
                        placeholder="Nominal (Rp)" 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newBiaya.nominal || ''}
                        onChange={e => setNewBiaya({...newBiaya, nominal: Number(e.target.value)})}
                      />
                      <button 
                        onClick={handleAddBiaya}
                        disabled={loading}
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors text-white",
                          isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                        )}
                      >
                        {isEditing ? <Save size={16} /> : <Plus size={16} />} 
                        {isEditing ? 'Simpan' : 'Tambah'}
                      </button>
                   </div>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-xl">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Tingkat</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Wilayah</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Nominal</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase text-slate-400">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {biaya.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">Tingkat {item.tingkat}</td>
                          <td className="px-6 py-4 text-xs font-bold text-indigo-600">
                             <span className={cn("px-2 py-0.5 rounded-full border", item.jenis === 'Luar Daerah' ? "bg-amber-50 border-amber-100 text-amber-600" : "bg-blue-50 border-blue-100 text-blue-600")}>
                                {item.jenis}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-mono">Rp {item.nominal.toLocaleString('id-ID')}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                             <button 
                              onClick={() => startEdit('biaya', item)} 
                              className="text-slate-300 hover:text-indigo-600 p-1 transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button onClick={() => confirmDelete('biaya_perjalanan', item.id!)} className="text-slate-300 hover:text-rose-600 p-1 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'bbm' && (
              <div className="p-8 space-y-8">
                <div className={cn(
                  "rounded-2xl p-6 border transition-all space-y-4",
                  isEditing ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                )}>
                   <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold text-slate-800">
                       {isEditing ? 'Edit Standar BBM' : 'Tambah Standar BBM Baru'}
                     </h3>
                     {isEditing && (
                       <button onClick={cancelEdit} className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:underline">
                         <X size={14} /> Batal
                       </button>
                     )}
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <input 
                        type="text" 
                        placeholder="Jenis BBM (Pertalite, dll)" 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                        value={newBbm.jenis}
                        onChange={e => setNewBbm({...newBbm, jenis: e.target.value})}
                      />
                      <input 
                        type="number" 
                        placeholder="Harga / Liter" 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newBbm.harga || ''}
                        onChange={e => setNewBbm({...newBbm, harga: Number(e.target.value)})}
                      />
                      <button 
                        onClick={handleAddBbm}
                        disabled={loading}
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors text-white",
                          isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                        )}
                      >
                        {isEditing ? <Save size={16} /> : <Plus size={16} />} 
                        {isEditing ? 'Simpan' : 'Tambah'}
                      </button>
                   </div>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-xl">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Jenis BBM</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Harga per Liter</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase text-slate-400">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {bbm.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.jenis}</td>
                          <td className="px-6 py-4 text-sm text-slate-700 font-mono">Rp {item.harga.toLocaleString('id-ID')}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                             <button 
                              onClick={() => startEdit('bbm', item)} 
                              className="text-slate-300 hover:text-indigo-600 p-1 transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button onClick={() => confirmDelete('bahan_bakar', item.id!)} className="text-slate-300 hover:text-rose-600 p-1 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'bendahara' && (
              <div className="p-8 space-y-8">
                <div className={cn(
                  "rounded-2xl p-6 border transition-all space-y-4",
                  isEditing ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                )}>
                   <div className="flex items-center justify-between">
                     <h3 className="text-sm font-bold text-slate-800">
                       {isEditing ? 'Edit Pejabat Penandatangan' : 'Tambah Pejabat Penandatangan'}
                     </h3>
                     {isEditing && (
                       <button onClick={cancelEdit} className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:underline">
                         <X size={14} /> Batal
                       </button>
                     )}
                   </div>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <input 
                        type="text" 
                        placeholder="Nama Lengkap & Gelar" 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newManajemen.nama}
                        onChange={e => setNewManajemen({...newManajemen, nama: e.target.value})}
                      />
                      <input 
                        type="text" 
                        placeholder="NIP (Tanpa Spasi)" 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newManajemen.nip}
                        onChange={e => setNewManajemen({...newManajemen, nip: e.target.value})}
                      />
                      <input 
                        type="text" 
                        placeholder="Pangkat / Golongan" 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newManajemen.pangkat}
                        onChange={e => setNewManajemen({...newManajemen, pangkat: e.target.value})}
                      />
                      <input 
                        type="text" 
                        placeholder="Jabatan dalam Dokumen (PPK, dll)" 
                        className="px-4 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        value={newManajemen.jabatan}
                        onChange={e => setNewManajemen({...newManajemen, jabatan: e.target.value})}
                      />
                      <button 
                        onClick={handleAddManajemen}
                        disabled={loading}
                        className={cn(
                          "rounded-lg px-4 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors text-white sm:col-span-2",
                          isEditing ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                        )}
                      >
                        {isEditing ? <Save size={16} /> : <Plus size={16} />} 
                        {isEditing ? 'Simpan Perubahan' : 'Tambah Pejabat'}
                      </button>
                   </div>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-xl">
                  <table className="w-full">
                     <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Nama Pejabat</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">NIP</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Pangkat</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Jabatan</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase text-slate-400">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {manajemen.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.nama}</td>
                          <td className="px-6 py-4 text-xs font-mono text-slate-500">{item.nip}</td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{item.pangkat || '-'}</td>
                          <td className="px-6 py-4 text-sm font-semibold text-indigo-600">{item.jabatan}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                             <button 
                              onClick={() => startEdit('bendahara', item)} 
                              className="text-slate-300 hover:text-indigo-600 p-1 transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                            <button onClick={() => confirmDelete('manajemen', item.id!)} className="text-slate-300 hover:text-rose-600 p-1 transition-colors">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === 'users' && (
              <div className="p-8 space-y-8">
                <div className={cn(
                  "rounded-2xl p-6 border transition-all space-y-6",
                  isEditing ? "bg-amber-50 border-amber-200" : "bg-slate-50 border-slate-200"
                )}>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Fingerprint size={16} className={isEditing ? "text-amber-600" : "text-indigo-600"} /> 
                        {isEditing ? 'Edit Akun User' : 'Buat Akun Baru'}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={downloadUsersExcel}
                        className="bg-emerald-50 text-emerald-600 hover:bg-emerald-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all outline-none"
                      >
                        <FileText size={14} /> Download Excel
                      </button>
                      {isEditing && (
                        <button onClick={cancelEdit} className="text-xs font-bold text-amber-700 flex items-center gap-1 hover:underline">
                          <X size={14} /> Batal
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nama Lengkap</label>
                      <input 
                        type="text" 
                        placeholder="Nama Lengkap User" 
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        value={newUser.name}
                        onChange={e => setNewUser({...newUser, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Role Akses</label>
                      <select 
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        value={newUser.role}
                        onChange={e => setNewUser({...newUser, role: e.target.value as any})}
                      >
                        <option value="petugas">Petugas Lapangan (Username/Pass)</option>
                        <option value="admin">Administrator (Google Account)</option>
                      </select>
                    </div>

                    {newUser.role === 'petugas' ? (
                      <>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Username</label>
                          <input 
                            type="text" 
                            placeholder="username_petugas" 
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                            value={newUser.username}
                            onChange={e => setNewUser({...newUser, username: e.target.value})}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Password {isEditing && "(Kosongkan jika tidak ganti)"}
                          </label>
                          <input 
                            type="password" 
                            placeholder={isEditing ? "•••••••• (Password tidak bisa diubah di sini)" : "••••••••"}
                            disabled={isEditing}
                            className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm disabled:bg-slate-100 disabled:text-slate-400"
                            value={newUser.password}
                            onChange={e => setNewUser({...newUser, password: e.target.value})}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="space-y-1.5 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email Google</label>
                        <input 
                          type="email" 
                          placeholder="contoh@gmail.com" 
                          className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                          value={newUser.email}
                          onChange={e => setNewUser({...newUser, email: e.target.value})}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nomor HP / WhatsApp</label>
                      <div className="relative">
                        <Phone size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                          type="tel" 
                          placeholder="0812345..." 
                          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                          value={newUser.phone}
                          onChange={e => setNewUser({...newUser, phone: e.target.value})}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tautkan ke Data Petugas</label>
                      <select 
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm"
                        value={newUser.petugasId}
                        onChange={e => setNewUser({...newUser, petugasId: e.target.value})}
                      >
                        <option value="">-- Tidak Ditautkan --</option>
                        {petugasMeta.map(p => (
                          <option key={p.id} value={p.id}>{p.nama}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <button 
                    onClick={handleCreateUser}
                    disabled={loading}
                    className={cn(
                      "w-full font-bold py-3 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50 text-white",
                      isEditing ? "bg-amber-600 hover:bg-amber-700 shadow-amber-100" : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100"
                    )}
                  >
                    {isEditing ? <Save size={18} /> : <UserCheck size={18} />}
                    {isEditing ? 'SIMPAN PERUBAHAN' : 'BUAT USER SEKARANG'}
                  </button>
                </div>

                <div className="overflow-hidden border border-slate-100 rounded-xl">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-100">
                      <tr>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">User</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Akses</th>
                        <th className="px-6 py-3 text-left text-[10px] font-bold uppercase text-slate-400">Kontak</th>
                        <th className="px-6 py-3 text-right text-[10px] font-bold uppercase text-slate-400">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/50">
                          <td className="px-6 py-4">
                            <div className="font-bold text-slate-700">{u.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{u.email || u.username}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                              u.role === 'admin' ? "bg-indigo-50 border-indigo-100 text-indigo-600" : "bg-emerald-50 border-emerald-100 text-emerald-600"
                            )}>
                              {u.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-medium text-slate-500">{u.phone || '-'}</td>
                          <td className="px-6 py-4 text-right flex justify-end gap-2">
                             <button
                              onClick={() => startEdit('users', u)}
                              className="text-slate-200 hover:text-indigo-600 p-2 transition-colors"
                            >
                              <Settings size={16} />
                            </button>
                             <button 
                              onClick={() => confirmDelete('users', u.id)} 
                              className="text-slate-200 hover:text-rose-600 p-2 transition-colors"
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
            )}
          </motion.div>
        </div>
      </div>

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
                Apakah Anda yakin ingin menghapus data utilitas ini? Tindakan ini tidak dapat dibatalkan.
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
