import { useState, useEffect, FormEvent } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  FileText as FileIcon,
  Search,
  Download,
  ChevronDown,
  Camera,
  Loader2,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { formatDate, cn, compressImage } from '../lib/utils';
import { generateSppdDepan, generateSpt, generateRincianBiaya, generateLaporanHasilPerjalanan, generateDokumentasi } from '../services/pdfService';
import { DEFAULT_LOGO } from '../constants';
import { useUserRole } from '../hooks/useUserRole';

interface Petugas {
  id: string;
  nama: string;
  niat?: string;
  tingkatSPPD?: string;
  jenis?: string;
}

interface Kegiatan {
  id: string;
  nomor?: string;
  nomorUrut?: string;
  tahun?: string;
  petugasId: string;
  petugasNama: string;
  subKegiatanId?: string;
  tanggal: string;
  tempat: string;
  uraian: string;
  lamaPerjalanan: number;
  hasLaporan: boolean;
  hasDokumentasi: boolean;
  hasSppd: boolean;
  laporanSelesai: boolean;
  hasilPerjalanan?: string[];
  dokumentasi?: string[];
  createdAt: string;
  updatedAt: string;
  createdByEmail?: string;
  createdByNama?: string;
  jenisWilayah?: 'Luar Daerah' | 'Dalam Daerah';
  biayaTransport?: number;
}

interface SubKegiatan {
  id: string;
  kode: string;
  nama: string;
}

export default function KegiatanPage() {
  const [kegiatan, setKegiatan] = useState<Kegiatan[]>([]);
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentKegiatan, setCurrentKegiatan] = useState<Partial<Kegiatan> | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [petugasSearch, setPetugasSearch] = useState('');
  const [isPetugasDropdownOpen, setIsPetugasDropdownOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [selectedKegiatanForDownload, setSelectedKegiatanForDownload] = useState<Kegiatan | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<'sppd' | 'spt' | 'biaya' | 'hasil' | 'dokumentasi'>('sppd');
  const [settings, setSettings] = useState<{ logoUrl: string, dasarHukum: string[] } | null>(null);
  const [manajemen, setManajemen] = useState<{ id: string, nama: string, nip: string, jabatan: string }[]>([]);
  const [subKegiatan, setSubKegiatan] = useState<SubKegiatan[]>([]);
  const [biayaPerjalanan, setBiayaPerjalanan] = useState<{ id: string, tingkat: string, jenis: string, nominal: number }[]>([]);
  const [bbm, setBbm] = useState<{ id: string, jenis: string, harga: number }[]>([]);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterPetugas, setFilterPetugas] = useState('');
  const [filterSubKegiatan, setFilterSubKegiatan] = useState('');

  const { role, userProfile, loading: roleLoading } = useUserRole(auth.currentUser);

  useEffect(() => {
    if (!roleLoading && role) {
      fetchData();
    }
  }, [role, roleLoading, userProfile]);

  const filteredKegiatanList = kegiatan.filter(k => {
    const matchesSearch = !searchTerm || 
      k.petugasNama.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.tempat.toLowerCase().includes(searchTerm.toLowerCase()) ||
      k.uraian.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPetugas = !filterPetugas || k.petugasId === filterPetugas;
    
    const matchesMonth = !filterMonth || k.tanggal.startsWith(filterMonth);

    const matchesSub = !filterSubKegiatan || k.subKegiatanId === filterSubKegiatan;

    return matchesSearch && matchesPetugas && matchesMonth && matchesSub;
  });

  const fetchData = async () => {
    if (roleLoading || !role) return;
    setLoading(true);
    try {
      // For petugas, we try to be as robust as possible. 
      // If we use 'where', it might require composite indexes which fail if missing.
      // We fetch all records (or reasonably large amount) and filter in memory to ensure data is seen.
      let kegiatanQuery = query(collection(db, 'kegiatan'), orderBy('tanggal', 'desc'));
      
      const [pSnap, kSnap, sSnap, mSnap, subSnap, bSnap, bbmSnap] = await Promise.all([
        getDocs(collection(db, 'petugas')),
        getDocs(kegiatanQuery),
        getDocs(collection(db, 'settings')),
        getDocs(collection(db, 'manajemen')),
        getDocs(collection(db, 'sub_kegiatan')),
        getDocs(collection(db, 'biaya_perjalanan')),
        getDocs(collection(db, 'bahan_bakar'))
      ]);

      setPetugas(pSnap.docs.map(doc => ({ 
        id: doc.id, 
        nama: doc.data().nama, 
        niat: doc.data().niat,
        tingkatSPPD: doc.data().tingkatSPPD,
        jenis: doc.data().jenis
      })));

      let kData = kSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kegiatan));

      if (role === 'petugas') {
        const currentUserEmail = auth.currentUser?.email;
        const currentPetugasId = userProfile?.petugasId;
        const currentUserName = userProfile?.name;

        kData = kData.filter(k => 
          (currentPetugasId && k.petugasId === currentPetugasId) || 
          (currentUserEmail && k.createdByEmail === currentUserEmail) ||
          (currentUserName && k.petugasNama === currentUserName)
        );
      }

      setKegiatan(kData);

      if (!sSnap.empty) {
        const data = sSnap.docs.find(d => d.id === 'general')?.data() || sSnap.docs[0].data();
        setSettings({ 
          logoUrl: data.logoUrl || DEFAULT_LOGO, 
          dasarHukum: Array.isArray(data.dasarHukum) ? data.dasarHukum : [] 
        });
      }

      setManajemen(mSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setSubKegiatan(subSnap.docs.map(d => ({ id: d.id, ...d.data() } as SubKegiatan)));
      setBiayaPerjalanan(bSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
      setBbm(bbmSnap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    } catch (err) {
      console.error("Fetch data error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!currentKegiatan?.petugasId || !currentKegiatan?.tanggal || !currentKegiatan?.tempat) return;

    try {
      const pNama = petugas.find(p => p.id === currentKegiatan.petugasId)?.nama || '';
      
      const isComplete = !!(currentKegiatan.hasLaporan && currentKegiatan.hasDokumentasi && currentKegiatan.hasSppd && currentKegiatan.nomorUrut);

      const fullNomor = currentKegiatan.nomorUrut || '';

      const data = {
        petugasId: currentKegiatan.petugasId,
        petugasNama: pNama,
        nomor: fullNomor,
        nomorUrut: currentKegiatan.nomorUrut || '',
        tahun: currentKegiatan.tahun || new Date().getFullYear().toString(),
        subKegiatanId: currentKegiatan.subKegiatanId || '',
        tanggal: currentKegiatan.tanggal,
        tempat: currentKegiatan.tempat,
        uraian: currentKegiatan.uraian || '',
        lamaPerjalanan: currentKegiatan.lamaPerjalanan || 1,
        hasLaporan: !!currentKegiatan.hasLaporan,
        hasDokumentasi: !!currentKegiatan.hasDokumentasi,
        hasSppd: !!currentKegiatan.hasSppd,
        laporanSelesai: isComplete,
        hasilPerjalanan: currentKegiatan.hasilPerjalanan || [],
        dokumentasi: currentKegiatan.dokumentasi || [],
        jenisWilayah: currentKegiatan.jenisWilayah || 'Dalam Daerah',
        biayaTransport: currentKegiatan.biayaTransport || 0,
        updatedAt: new Date().toISOString()
      };

      if (currentKegiatan.id) {
        await updateDoc(doc(db, 'kegiatan', currentKegiatan.id), data);
      } else {
        await addDoc(collection(db, 'kegiatan'), {
          ...data,
          createdAt: new Date().toISOString(),
          createdByEmail: auth.currentUser?.email || 'N/A',
          createdByNama: userProfile?.name || auth.currentUser?.displayName || 'User'
        });
      }

      setIsModalOpen(false);
      setCurrentKegiatan(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Gagal menyimpan kegiatan. Pastikan koneksi internet stabil.');
    }
  };

  const calculateRincian = (k: Kegiatan) => {
    const p = petugas.find(item => item.id === k.petugasId);
    if (!p) return null;

    const jenis = k.jenisWilayah || 'Dalam Daerah';
    const tingkat = (p as any).tingkatSPPD || 'Non ASN';
    
    // Find daily allowance
    const dailyAllowance = biayaPerjalanan.find(b => 
      b.tingkat.includes(tingkat.replace('Tingkat ', '')) && b.jenis === jenis
    )?.nominal || 0;

    const items = [
      { uraian: `Uang Harian (${k.lamaPerjalanan || 1} Hari)`, nominal: dailyAllowance, hari: k.lamaPerjalanan || 1 },
      { uraian: 'Uang Transport / BBM', nominal: k.biayaTransport || 0, hari: 1 }
    ];

    return items.filter(item => item.nominal > 0);
  };

  const handleDownloadDoc = (k: Kegiatan, label: string) => {
    const p = petugas.find(item => item.id === k.petugasId);
    if (!p) return;

    const ppkOfficial = manajemen.find(m => m.jabatan.toUpperCase().includes('PPK')) || manajemen[0] || { nama: '-', nip: '-', jabatan: 'PEJABAT PEMBUAT KOMITMEN' };
    const bendaharaOfficial = manajemen.find(m => m.jabatan.toUpperCase().includes('BENDAHARA')) || manajemen[0] || { nama: '-', nip: '-', jabatan: 'BENDAHARA PENGELUARAN PEMBANTU' };

    let doc;
    if (label === 'sppd_depan') {
      doc = generateSppdDepan({
        nomorSppd: k.nomor,
        tahun: k.tahun,
        petugas: {
          nama: k.petugasNama,
          niat: (p as any).niat || '-',
          jabatan: (p as any).jenis || '-',
          tingkatSPPD: (p as any).tingkatSPPD || '-'
        },
        ppk: {
          nama: ppkOfficial.nama,
          nip: ppkOfficial.nip,
          jabatan: ppkOfficial.jabatan
        },
        tanggal: formatDate(k.tanggal),
        tempat: k.tempat,
        uraian: k.uraian,
        lamaPerjalanan: `${k.lamaPerjalanan || 1} Hari`,
        logoUrl: settings?.logoUrl,
        subKegiatan: subKegiatan.find(s => s.id === k.subKegiatanId)?.nama
      });
      doc.save(`SPPD_${k.petugasNama}_${k.tanggal}.pdf`);
    } else if (label === 'spt') {
      const kadisOfficial = manajemen.find(m => m.jabatan.toUpperCase().includes('KEPALA DINAS')) || manajemen[0] || { nama: '-', nip: '-', jabatan: 'Kepala Dinas' };
      doc = generateSpt({
        nomorSpt: k.nomor,
        tahun: k.tahun,
        dasarHukum: settings?.dasarHukum || [],
        petugas: {
          nama: k.petugasNama,
          niat: (p as any).niat,
          jabatan: (p as any).jenis
        },
        maksud: k.uraian,
        tempat: k.tempat,
        tanggal: k.tanggal,
        logoUrl: settings?.logoUrl,
        kadis: {
          nama: kadisOfficial.nama,
          nip: kadisOfficial.nip,
          pangkat: (kadisOfficial as any).pangkat || '-'
        }
      });
      doc.save(`SPT_${k.petugasNama}_${k.tanggal}.pdf`);
    } else if (label === 'biaya') {
      const rincian = calculateRincian(k);
      if (!rincian) return;

      doc = generateRincianBiaya({
        nomorSppd: k.nomor,
        tahun: k.tahun,
        tanggalSpt: k.tanggal,
        petugas: {
          nama: k.petugasNama,
          tingkatSPPD: (p as any).tingkatSPPD || '-'
        },
        rincian: rincian,
        ppk: {
          nama: ppkOfficial.nama,
          nip: ppkOfficial.nip
        },
        bendahara: {
          nama: bendaharaOfficial.nama,
          nip: bendaharaOfficial.nip
        }
      });
      doc.save(`RINCIAN_${k.petugasNama}_${k.tanggal}.pdf`);
    } else if (label === 'hasil') {
      doc = generateLaporanHasilPerjalanan({
        nomorSpt: k.nomor,
        tahun: k.tahun,
        tanggalSpt: k.tanggal,
        maksud: k.uraian,
        tempat: k.tempat,
        petugas: { nama: k.petugasNama },
        hasil: k.hasilPerjalanan || [],
        dokumentasi: k.dokumentasi || [],
        logoUrl: settings?.logoUrl
      });
      doc.save(`HASIL_LAPORAN_${k.petugasNama}_${k.tanggal}.pdf`);
    } else if (label === 'dokumentasi') {
      doc = generateDokumentasi({
        maksud: k.uraian,
        tempat: k.tempat,
        tanggal: k.tanggal,
        dokumentasi: k.dokumentasi || []
      });
      doc.save(`DOKUMENTASI_${k.petugasNama}_${k.tanggal}.pdf`);
    } else {
      alert(`Sedang menyiapkan dokumen: ${label}`);
    }
  };

  const handlePreviewDoc = (k: Kegiatan, type: 'sppd' | 'spt' | 'biaya' | 'hasil' | 'dokumentasi') => {
    const p = petugas.find(item => item.id === k.petugasId);
    if (!p) return;

    const ppkOfficial = manajemen.find(m => m.jabatan.toUpperCase().includes('PPK')) || manajemen[0] || { nama: '-', nip: '-', jabatan: 'PEJABAT PEMBUAT KOMITMEN' };
    const bendaharaOfficial = manajemen.find(m => m.jabatan.toUpperCase().includes('BENDAHARA')) || manajemen[0] || { nama: '-', nip: '-', jabatan: 'BENDAHARA PENGELUARAN PEMBANTU' };

    let doc;
    if (type === 'sppd') {
      setPreviewType('sppd');
      doc = generateSppdDepan({
        nomorSppd: k.nomor,
        tahun: k.tahun,
        petugas: {
          nama: k.petugasNama,
          niat: (p as any).niat || '-',
          jabatan: (p as any).jenis || '-',
          tingkatSPPD: (p as any).tingkatSPPD || '-'
        },
        ppk: {
          nama: ppkOfficial.nama,
          nip: ppkOfficial.nip,
          jabatan: ppkOfficial.jabatan
        },
        tanggal: formatDate(k.tanggal),
        tempat: k.tempat,
        uraian: k.uraian,
        lamaPerjalanan: `${k.lamaPerjalanan || 1} Hari`,
        logoUrl: settings?.logoUrl,
        subKegiatan: subKegiatan.find(s => s.id === k.subKegiatanId)?.nama
      });
    } else if (type === 'spt') {
      setPreviewType('spt');
      const kadisOfficial = manajemen.find(m => m.jabatan.toUpperCase().includes('KEPALA DINAS')) || manajemen[0] || { nama: '-', nip: '-', jabatan: 'Kepala Dinas' };
      doc = generateSpt({
        nomorSpt: k.nomor,
        tahun: k.tahun,
        dasarHukum: settings?.dasarHukum || [],
        petugas: {
          nama: k.petugasNama,
          niat: (p as any).niat,
          jabatan: (p as any).jenis
        },
        maksud: k.uraian,
        tempat: k.tempat,
        tanggal: k.tanggal,
        logoUrl: settings?.logoUrl,
        kadis: {
          nama: kadisOfficial.nama,
          nip: kadisOfficial.nip,
          pangkat: (kadisOfficial as any).pangkat || '-'
        }
      });
    } else if (type === 'biaya') {
      setPreviewType('biaya');
      const rincian = calculateRincian(k);
      if (!rincian) return;

      doc = generateRincianBiaya({
        nomorSppd: k.nomor,
        tahun: k.tahun,
        tanggalSpt: k.tanggal,
        petugas: {
          nama: k.petugasNama,
          tingkatSPPD: (p as any).tingkatSPPD || '-'
        },
        rincian: rincian,
        ppk: {
          nama: ppkOfficial.nama,
          nip: ppkOfficial.nip
        },
        bendahara: {
          nama: bendaharaOfficial.nama,
          nip: bendaharaOfficial.nip
        }
      });
    } else if (type === 'hasil') {
      setPreviewType('hasil');
      doc = generateLaporanHasilPerjalanan({
        nomorSpt: k.nomor,
        tahun: k.tahun,
        tanggalSpt: k.tanggal,
        maksud: k.uraian,
        tempat: k.tempat,
        petugas: { nama: k.petugasNama },
        hasil: k.hasilPerjalanan || [],
        dokumentasi: k.dokumentasi || [],
        logoUrl: settings?.logoUrl
      });
    } else if (type === 'dokumentasi') {
      setPreviewType('dokumentasi');
      doc = generateDokumentasi({
        maksud: k.uraian,
        tempat: k.tempat,
        tanggal: k.tanggal,
        dokumentasi: k.dokumentasi || []
      });
    }

    const blobUrl = doc.output('bloburl');
    setPreviewUrl(blobUrl);
    setPreviewType(type);
    setSelectedKegiatanForDownload(k);
    setIsPreviewOpen(true);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDoc(doc(db, 'kegiatan', deleteId));
      setIsDeleteModalOpen(false);
      setDeleteId(null);
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUploadBase64 = async (file: File, onProgress?: (p: string) => void) => {
    if (!file.type.startsWith('image/')) {
      throw new Error(`File ${file.name} bukan gambar.`);
    }

    try {
      if (onProgress) onProgress(`Kompresi...`);
      // Auto compress the image using HTML5 Canvas (high compatibility inside iframes/mobile)
      const base64 = await compressImage(file, 1024, 0.6);
      if (onProgress) onProgress(`Selesai`);
      return base64;
    } catch (error: any) {
      console.error("[Upload] ERROR:", error);
      throw new Error(error.message || "Gagal memproses foto.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold tracking-tight text-slate-800">Log Kegiatan Harian</h2>
        <button
          onClick={() => {
            let defaultPetugasId = '';
            if (role === 'petugas') {
              if (userProfile?.petugasId) {
                defaultPetugasId = userProfile.petugasId;
              } else {
                const found = petugas.find(p => 
                  p.nama.toLowerCase() === userProfile?.name?.toLowerCase() ||
                  p.nama.toLowerCase() === auth.currentUser?.displayName?.toLowerCase()
                );
                if (found) defaultPetugasId = found.id;
              }
            }
            
            let defaultSub = '';
            if (subKegiatan.length > 0) {
              const targetSub = subKegiatan.find(s => s.nama.toLowerCase().includes('peningkatan kemampuan potensi sumber kesejahteraan sosial'));
              if (targetSub) {
                defaultSub = targetSub.id;
              } else {
                defaultSub = subKegiatan[0].id;
              }
            }
            setCurrentKegiatan({ 
              tanggal: new Date().toISOString().split('T')[0], 
              laporanSelesai: false,
              tahun: new Date().getFullYear().toString(),
              petugasId: defaultPetugasId,
              subKegiatanId: defaultSub
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus size={18} />
          Input Kegiatan
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        {role === 'admin' && (
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text"
                placeholder="Cari petugas, tempat, atau uraian..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={filterPetugas}
              onChange={(e) => setFilterPetugas(e.target.value)}
            >
              <option value="">Semua Petugas</option>
              {petugas.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
            <select
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={filterSubKegiatan}
              onChange={(e) => setFilterSubKegiatan(e.target.value)}
            >
              <option value="">Semua Sub Kegiatan</option>
              {subKegiatan.map(s => (
                <option key={s.id} value={s.id}>{s.nama}</option>
              ))}
            </select>
            <input 
              type="month"
              className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              <tr>
                <th className="px-6 py-3">Petugas & Status</th>
                <th className="px-6 py-3">Tanggal & Tempat</th>
                <th className="px-6 py-3">Uraian</th>
                <th className="px-6 py-3">Monitoring</th>
                <th className="px-6 py-3">Cetak Dokumen</th>
                <th className="px-6 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">Sinkronisasi data harian...</td></tr>
              ) : filteredKegiatanList.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-400 italic">Belum ada rekaman kegiatan yang sesuai.</td></tr>
              ) : filteredKegiatanList.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <button
                        onClick={() => handlePreviewDoc(k, 'sppd')}
                        className="font-semibold text-slate-800 hover:text-indigo-600 transition-colors text-left"
                      >
                        {k.petugasNama}
                      </button>
                      {(() => {
                        const isFull = k.hasLaporan && k.hasDokumentasi && k.hasSppd;
                        const hasNomor = !!k.nomorUrut;
                        if (isFull && hasNomor) {
                          return <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-tighter mt-0.5 bg-emerald-50 px-1.5 py-0.5 rounded-full w-fit">Terverifikasi</span>;
                        }
                        if (isFull && !hasNomor) {
                          return <span className="text-[9px] font-bold text-amber-600 uppercase tracking-tighter mt-0.5 bg-amber-50 px-1.5 py-0.5 rounded-full w-fit border border-amber-200">Perhatian: No. Surat Kosong</span>;
                        }
                        return <span className="text-[9px] font-bold text-rose-500 uppercase tracking-tighter mt-0.5 bg-rose-50 px-1.5 py-0.5 rounded-full w-fit">Belum Terverifikasi</span>;
                      })()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-700">{formatDate(k.tanggal)}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{k.tempat}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="line-clamp-2 max-w-xs italic text-slate-500">"{k.uraian}"</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Input Oleh:</p>
                      <p className="text-xs font-semibold text-slate-700 truncate max-w-[120px]" title={k.createdByEmail}>
                        {(k.createdByNama && k.createdByNama !== 'N/A') ? k.createdByNama.split(' ')[0] : (k.createdByEmail?.split('@')[0] || 'Sistem')}
                      </p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => {
                        setSelectedKegiatanForDownload(k);
                        setIsDownloadModalOpen(true);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-bold uppercase tracking-wider hover:bg-indigo-100 transition-colors"
                    >
                      <Download size={14} />
                      Dokumen
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-1">
                    <button
                      onClick={() => {
                        setCurrentKegiatan(k);
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => {
                        setDeleteId(k.id);
                        setIsDeleteModalOpen(true);
                      }}
                      className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
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
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto border border-slate-200"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-bold tracking-tight text-slate-800">
                  {currentKegiatan?.id ? 'Pemutakhiran Kegiatan' : 'Perekaman Kegiatan Harian'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2 relative">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pilih Petugas *</label>
                    <div className="relative">
                      <button
                        type="button"
                        disabled={role === 'petugas'}
                        onClick={() => setIsPetugasDropdownOpen(!isPetugasDropdownOpen)}
                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm text-left flex items-center justify-between disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        <span className={currentKegiatan?.petugasId ? "text-slate-800 font-medium" : "text-slate-400 font-normal"}>
                          {currentKegiatan?.petugasId 
                            ? petugas.find(p => p.id === currentKegiatan.petugasId)?.nama 
                            : '-- Pilih Anggota --'}
                        </span>
                        {role !== 'petugas' && <ChevronDown size={16} className={cn("text-slate-400 transition-transform", isPetugasDropdownOpen && "rotate-180")} />}
                      </button>

                      <AnimatePresence>
                        {isPetugasDropdownOpen && role !== 'petugas' && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute z-[80] w-full mt-1 bg-white border border-slate-200 rounded-md shadow-xl overflow-hidden"
                          >
                            <div className="p-2 border-b border-slate-50 bg-slate-50/50 flex items-center gap-2">
                              <Search size={14} className="text-slate-400" />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Cari nama..."
                                className="w-full bg-transparent outline-none text-xs font-medium text-slate-600"
                                value={petugasSearch}
                                onChange={(e) => setPetugasSearch(e.target.value)}
                              />
                            </div>
                            <div className="max-h-48 overflow-y-auto py-1 scrollbar-thin">
                              {petugas
                                .filter(p => !petugasSearch || p.nama.toLowerCase().includes(petugasSearch.toLowerCase()))
                                .map(p => (
                                  <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => {
                                      setCurrentKegiatan({ ...currentKegiatan, petugasId: p.id });
                                      setIsPetugasDropdownOpen(false);
                                      setPetugasSearch('');
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-indigo-50 transition-colors flex flex-col"
                                  >
                                    <span className="font-semibold text-slate-800">{p.nama}</span>
                                    {p.niat && <span className="text-[10px] text-slate-400 font-mono tracking-tighter">{p.niat}</span>}
                                  </button>
                                ))
                              }
                              {petugas.filter(p => !petugasSearch || p.nama.toLowerCase().includes(petugasSearch.toLowerCase())).length === 0 && (
                                <div className="px-4 py-3 text-xs text-slate-400 italic text-center text-center">Petugas tidak ditemukan</div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tanggal Pelaksanaan *</label>
                    <input
                      type="date"
                      required
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                      value={currentKegiatan?.tanggal || ''}
                      onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, tanggal: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lama (Hari) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-bold"
                      value={currentKegiatan?.lamaPerjalanan || 1}
                      onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, lamaPerjalanan: Number(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nomor Surat / SPT</label>
                  <div className={cn(
                    "flex items-center border rounded-md overflow-hidden transition-all",
                    role === 'petugas' 
                      ? "bg-slate-100 border-slate-200 text-slate-500" 
                      : "bg-slate-50 border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500 focus-within:bg-white"
                  )}>
                    <span className="px-3 py-2 text-slate-400 font-bold text-sm bg-slate-100/50 border-r border-slate-200">000.1.2.3 /</span>
                    <input
                      type="text"
                      disabled={role === 'petugas'}
                      className="flex-1 px-4 py-2 bg-transparent outline-none text-sm font-bold text-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
                      placeholder="Input Nomor"
                      value={currentKegiatan?.nomorUrut || ''}
                      onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, nomorUrut: e.target.value })}
                    />
                    <span className="px-2 py-2 text-slate-400 font-bold text-sm">/</span>
                    <select
                      disabled={role === 'petugas'}
                      className="px-3 py-2 bg-transparent outline-none text-sm font-bold text-slate-800 border-l border-slate-200 cursor-pointer disabled:text-slate-500 disabled:cursor-not-allowed"
                      value={currentKegiatan?.tahun || new Date().getFullYear()}
                      onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, tahun: e.target.value })}
                    >
                      {[0, 1, 2, 3].map(offset => {
                        const year = new Date().getFullYear() + offset;
                        return <option key={year} value={year}>{year}</option>
                      })}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Wilayah Tugas *</label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm font-bold"
                      value={currentKegiatan?.jenisWilayah || 'Dalam Daerah'}
                      onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, jenisWilayah: e.target.value as any })}
                    >
                      <option value="Luar Daerah">Luar Daerah</option>
                      <option value="Dalam Daerah">Dalam Daerah</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nominal Transport (Optional)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">Rp</span>
                      <input
                        type="number"
                        disabled={role === 'petugas'}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                        placeholder="0"
                        value={currentKegiatan?.biayaTransport || ''}
                        onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, biayaTransport: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Sub Kegiatan / Mata Anggaran *</label>
                  <select
                    required
                    disabled={role === 'petugas'}
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm disabled:bg-slate-100 disabled:text-slate-500"
                    value={currentKegiatan?.subKegiatanId || ''}
                    onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, subKegiatanId: e.target.value })}
                  >
                    <option value="">-- Pilih Sub Kegiatan --</option>
                    {subKegiatan.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.kode} - {sub.nama}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lokasi / Tempat Kegiatan *</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh : Desa Kamolan, Kec. Blora"
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                    value={currentKegiatan?.tempat || ''}
                    onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, tempat: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Deskripsi Kerja / Uraian *</label>
                  <textarea
                    required
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all h-24 resize-none italic"
                    placeholder="Isikan Maksud dan Tujuan perjalanan"
                    value={currentKegiatan?.uraian || ''}
                    onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, uraian: e.target.value })}
                  />
                </div>

                {/* Hasil Perjalanan Dinas */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hasil Perjalanan Dinas</label>
                    <button
                      type="button"
                      onClick={() => {
                        const newHasil = [...(currentKegiatan?.hasilPerjalanan || []), ''];
                        setCurrentKegiatan({ ...currentKegiatan, hasilPerjalanan: newHasil });
                      }}
                      className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold flex items-center gap-1 hover:bg-emerald-100 transition-all font-sans"
                    >
                      <Plus size={12} /> Tambah Hasil
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(currentKegiatan?.hasilPerjalanan || ['']).map((hasil, index) => (
                      <div key={index} className="flex gap-2 items-start">
                        <div className="w-5 h-5 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold shrink-0 mt-2">
                          {index + 1}
                        </div>
                        <div className="flex-1 relative group">
                          <textarea
                            value={hasil}
                            onChange={(e) => {
                              const newHasil = [...(currentKegiatan?.hasilPerjalanan || [])];
                              newHasil[index] = e.target.value;
                              setCurrentKegiatan({ ...currentKegiatan, hasilPerjalanan: newHasil });
                            }}
                            placeholder={`Hasil ke-${index + 1}...`}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded text-sm min-h-[60px] resize-none outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          {(currentKegiatan?.hasilPerjalanan || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                const newHasil = (currentKegiatan?.hasilPerjalanan || []).filter((_, i) => i !== index);
                                setCurrentKegiatan({ ...currentKegiatan, hasilPerjalanan: newHasil });
                              }}
                              className="absolute -right-2 -top-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Upload Foto Section */}
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dokumentasi Foto</label>
                      <p className="text-[9px] text-slate-400 italic">Maksimal 850KB total untuk semua foto</p>
                    </div>
                    <label className={cn(
                      "cursor-pointer px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 transition-all shadow-sm",
                      photoUploading ? "bg-slate-100 text-slate-400 cursor-not-allowed" : "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95"
                    )}>
                      {photoUploading ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Plus size={12} />
                      )}
                      {photoUploading ? (uploadProgress || 'Proses...') : 'Tambah Foto'}
                      <input 
                        type="file" 
                        multiple 
                        accept="image/*" 
                        className="hidden" 
                        disabled={photoUploading}
                        onChange={async (e) => {
                          const files = e.target.files;
                          if (!files?.length) return;
                          
                          setPhotoUploading(true);
                          try {
                            const newBase64s: string[] = [];
                            const fileArray = Array.from(files as FileList);
                            const total = fileArray.length;
                            
                            for (let i = 0; i < fileArray.length; i++) {
                              const base64 = await handleUploadBase64(
                                fileArray[i] as File, 
                                (p) => setUploadProgress(`[${i + 1}/${total}] ${p}`)
                              );
                              if (base64) newBase64s.push(base64);
                            }
                            
                            if (newBase64s.length > 0) {
                              const currentDocs = currentKegiatan?.dokumentasi || [];
                              const updatedDocs = [...currentDocs, ...newBase64s];
                              
                              // Check size
                              const estimatedSize = JSON.stringify(updatedDocs).length;
                              if (estimatedSize > 850000) {
                                alert("Ukuran total foto terlalu besar. Silakan kurangi jumlah foto.");
                                return;
                              }

                              setCurrentKegiatan({ 
                                ...currentKegiatan, 
                                dokumentasi: updatedDocs,
                                hasDokumentasi: true 
                              });
                            }
                          } catch (error: any) {
                            alert(error.message || "Gagal memproses foto.");
                          } finally {
                            setPhotoUploading(false);
                            setUploadProgress('');
                            e.target.value = '';
                          }
                        }} 
                      />
                    </label>
                  </div>

                  {(currentKegiatan?.dokumentasi && currentKegiatan.dokumentasi.length > 0) ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {currentKegiatan.dokumentasi.map((url, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-slate-100 group bg-slate-50">
                          <img 
                            src={url} 
                            alt={`Doc ${index + 1}`} 
                            className="w-full h-full object-cover" 
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newDocs = currentKegiatan.dokumentasi!.filter((_, i) => i !== index);
                              setCurrentKegiatan({ 
                                ...currentKegiatan, 
                                dokumentasi: newDocs, 
                                hasDokumentasi: (newDocs?.length || 0) > 0 
                              });
                            }}
                            className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-1"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 bg-slate-50 border border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-300 gap-1">
                      <ImageIcon size={20} strokeWidth={1} />
                      <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Belum Ada Foto</p>
                    </div>
                  )}
                </div>

                {role === 'admin' && (
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Verifikasi Kelengkapan (Ceklis)</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                        currentKegiatan?.hasLaporan ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-100 text-slate-500"
                      )}>
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          checked={currentKegiatan?.hasLaporan || false}
                          onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, hasLaporan: e.target.checked })}
                        />
                        <span className="text-xs font-bold uppercase tracking-wide">Laporan</span>
                      </label>

                      <label className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                        currentKegiatan?.hasDokumentasi ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-100 text-slate-500"
                      )}>
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          checked={currentKegiatan?.hasDokumentasi || false}
                          onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, hasDokumentasi: e.target.checked })}
                        />
                        <span className="text-xs font-bold uppercase tracking-wide">Dokumentasi</span>
                      </label>

                      <label className={cn(
                        "flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer",
                        currentKegiatan?.hasSppd ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-slate-50 border-slate-100 text-slate-500"
                      )}>
                        <input
                          type="checkbox"
                          className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          checked={currentKegiatan?.hasSppd || false}
                          onChange={(e) => setCurrentKegiatan({ ...currentKegiatan, hasSppd: e.target.checked })}
                        />
                        <span className="text-xs font-bold uppercase tracking-wide">SPPD Belakang</span>
                      </label>
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-2.5 border border-slate-200 rounded-md font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md font-semibold shadow-sm transition-all shadow-indigo-200"
                  >
                    Simpan Log Kegiatan
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isDownloadModalOpen && selectedKegiatanForDownload && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDownloadModalOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col"
            >
              <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                    <FileIcon size={20} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">Dokumen SPPD</h3>
                </div>
                <button 
                  onClick={() => setIsDownloadModalOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div>
                  <p className="text-sm text-slate-500">
                    Pilih jenis dokumen untuk petugas: <span className="font-bold text-slate-800">{selectedKegiatanForDownload.petugasNama}</span>
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 font-medium italic">
                    Kegiatan: {selectedKegiatanForDownload.tempat} ({formatDate(selectedKegiatanForDownload.tanggal)})
                  </p>
                </div>

                <div className="space-y-3">
                  {[
                    { title: 'SPPD Depan', desc: 'Halaman depan Surat Perjalanan Dinas', icon: FileIcon, label: 'sppd_depan' },
                    { title: 'Surat Perintah Tugas (SPT)', desc: 'Surat perintah penugasan resmi', icon: FileIcon, label: 'spt' },
                    { title: 'Rincian Biaya', desc: 'Rincian estimasi atau realisasi pengeluaran', icon: FileIcon, label: 'biaya' },
                    { title: 'Laporan Hasil', desc: 'Laporan hasil pelaksanaan perjalanan dinas', icon: FileIcon, label: 'hasil' },
                    { title: 'Dokumentasi', desc: 'Lampiran foto-foto kegiatan', icon: ImageIcon, label: 'dokumentasi' }
                  ].map((doc, i) => (
                    <button
                      key={i}
                      onClick={() => handleDownloadDoc(selectedKegiatanForDownload, doc.label)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all text-left group"
                    >
                      <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-indigo-500 transition-colors">
                        <doc.icon size={20} />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-slate-700 group-hover:text-indigo-900">{doc.title}</h4>
                        <p className="text-[11px] text-slate-400 font-medium">{doc.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-4 bg-slate-50/50 border-t border-slate-50 text-center">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Sistem Informasi Kegiatan TKSK & TAGANA</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isPreviewOpen && previewUrl && selectedKegiatanForDownload && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPreviewOpen(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl h-[90vh] bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => handlePreviewDoc(selectedKegiatanForDownload, 'sppd')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      previewType === 'sppd' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    SPPD
                  </button>
                  <button
                    onClick={() => handlePreviewDoc(selectedKegiatanForDownload, 'spt')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      previewType === 'spt' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    SPT
                  </button>
                  <button
                    onClick={() => handlePreviewDoc(selectedKegiatanForDownload, 'biaya')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      previewType === 'biaya' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    Biaya
                  </button>
                  <button
                    onClick={() => handlePreviewDoc(selectedKegiatanForDownload, 'hasil')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      previewType === 'hasil' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    Hasil
                  </button>
                  <button
                    onClick={() => handlePreviewDoc(selectedKegiatanForDownload, 'dokumentasi')}
                    className={cn(
                      "px-4 py-1.5 rounded-full text-xs font-bold transition-all",
                      previewType === 'dokumentasi' ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    )}
                  >
                    Foto
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-right">
                    <p className="text-xs font-bold text-slate-800">{selectedKegiatanForDownload.petugasNama}</p>
                    <p className="text-[10px] text-slate-400 font-medium tracking-tight truncate max-w-[200px]">
                      {selectedKegiatanForDownload.tempat}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownloadDoc(selectedKegiatanForDownload, previewType === 'sppd' ? 'sppd_depan' : previewType)}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors"
                    title="Unduh PDF"
                  >
                    <Download size={20} />
                  </button>
                  <button
                    onClick={() => setIsPreviewOpen(false)}
                    className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-slate-800 flex flex-col items-center justify-center p-4 md:p-6 overflow-y-auto">
                {/* Desktop View */}
                <div className="hidden md:block w-full h-full">
                  <iframe
                    src={`${previewUrl}#toolbar=0`}
                    className="w-full h-full rounded-2xl shadow-inner bg-white"
                    title="PDF Preview"
                  />
                </div>
                
                {/* Mobile View / Fallback */}
                <div className="md:hidden w-full max-w-sm my-auto flex flex-col items-center justify-center text-center p-6 bg-slate-900/40 rounded-3xl border border-slate-700/50">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center text-indigo-400 mb-4 shadow-lg border border-slate-600/30">
                    <FileIcon size={28} />
                  </div>
                  <h4 className="text-sm font-bold text-slate-100 uppercase tracking-wide">Pratinjau PDF di Ponsel</h4>
                  <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
                    Sistem operasi smartphone membatasi pratinjau PDF langsung di dalam frame. Silakan ketuk tombol di bawah untuk membuka atau mengunduh dokumen.
                  </p>
                  
                  <div className="mt-6 flex flex-col gap-2.5 w-full">
                    <button
                      onClick={() => window.open(previewUrl || '', '_blank')}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-bold rounded-2xl text-[11px] uppercase tracking-wider shadow-lg shadow-indigo-600/10 transition-all"
                    >
                      Buka Dokumen di Tab Baru
                    </button>
                    <button
                      onClick={() => handleDownloadDoc(selectedKegiatanForDownload, previewType === 'sppd' ? 'sppd_depan' : previewType)}
                      className="w-full py-3 bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-200 font-bold rounded-2xl text-[11px] uppercase tracking-wider border border-slate-600/50 transition-all"
                    >
                      Unduh Berkas PDF
                    </button>
                  </div>
                </div>
              </div>
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
                Apakah Anda yakin ingin menghapus data kegiatan ini? Berkas yang terkait mungkin tetap tersimpan di server.
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
