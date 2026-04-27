import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Filter, Download, FileSpreadsheet, FileIcon as FilePdf, Check, X, ShieldAlert } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { useUserRole } from '../hooks/useUserRole';
import { auth } from '../lib/firebase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { generateRekapKegiatan } from '../services/pdfService';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

interface Petugas {
  id: string;
  nama: string;
  niat?: string;
}

interface Kegiatan {
  id: string;
  petugasId: string;
  petugasNama: string;
  tanggal: string;
  tempat: string;
  uraian: string;
  laporanSelesai: boolean;
  hasLaporan: boolean;
  hasDokumentasi: boolean;
  hasSppd: boolean;
}

interface Manajemen {
  id: string;
  nama: string;
  nip: string;
  jabatan: string;
}

function CheckStatus({ active }: { active: boolean }) {
  return (
    <div className={cn(
      "inline-flex items-center justify-center w-5 h-5 rounded-full",
      active ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-300"
    )}>
      {active ? <Check size={12} /> : <X size={12} />}
    </div>
  );
}

export default function LaporanPage() {
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [data, setData] = useState<Kegiatan[]>([]);
  const [manajemen, setManajemen] = useState<Manajemen[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedPetugas, setSelectedPetugas] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const { role, loading: roleLoading } = useUserRole(auth.currentUser);

  useEffect(() => {
    if (role === 'admin') {
      fetchInitialData();
    }
  }, [role]);

  if (roleLoading) return null;
  if (role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mb-6">
          <ShieldAlert size={40} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Dibatasi</h2>
        <p className="text-slate-500 max-w-sm font-medium">Maaf, halaman arsip laporan hanya dapat diakses oleh Administrator Sistem.</p>
      </div>
    );
  }

  const fetchInitialData = async () => {
    const [pSnap, mSnap] = await Promise.all([
      getDocs(collection(db, 'petugas')),
      getDocs(collection(db, 'manajemen'))
    ]);
    
    setPetugas(pSnap.docs.map(doc => ({ 
      id: doc.id, 
      nama: doc.data().nama,
      niat: doc.data().niat
    })));

    setManajemen(mSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Manajemen)));
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      // Fetch all kegiatan first, ordered by date
      // We do filtering in memory to avoid complex Firestore composite index requirements
      const q = query(collection(db, 'kegiatan'), orderBy('tanggal', 'asc'));
      const snap = await getDocs(q);
      const allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kegiatan));

      const filtered = allData.filter(item => {
        const d = new Date(item.tanggal);
        const matchDate = (d.getMonth() + 1 === Number(month)) && (d.getFullYear() === Number(year));
        const matchPetugas = selectedPetugas ? item.petugasId === selectedPetugas : true;
        return matchDate && matchPetugas;
      });

      setData(filtered);
    } catch (err) {
      console.error("Filter error:", err);
      alert("Gagal memuat data laporan.");
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const kabid = manajemen.find(m => m.jabatan.toUpperCase().includes('KEPALA BIDANG SOSIAL')) || manajemen[0] || { nama: '-', nip: '-', jabatan: 'Plt. Kepala Bidang Sosial' };
    const pptk = manajemen.find(m => m.jabatan.toUpperCase().includes('PPTK')) || manajemen.find(m => m.jabatan.toUpperCase().includes('PPK')) || manajemen[0] || { nama: '-', nip: '-', jabatan: 'Pejabat Pelaksana Teknis Kegiatan' };

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    
    const doc = generateRekapKegiatan({
      bulan: monthNames[Number(month) - 1],
      tahun: String(year),
      kegiatan: data.map(k => ({
        nama: k.petugasNama,
        tanggal: k.tanggal,
        tempat: k.tempat,
        uraian: k.uraian,
        hasLaporan: k.hasLaporan || k.laporanSelesai,
        hasDokumentasi: k.hasDokumentasi,
        hasSppd: k.hasSppd
      })),
      kabid: {
        nama: kabid.nama,
        nip: kabid.nip,
        jabatan: kabid.jabatan
      },
      pptk: {
        nama: pptk.nama,
        nip: pptk.nip
      }
    });

    const petugasNama = petugas.find(p => p.id === selectedPetugas)?.nama || 'Rekap_Gabungan';
    doc.save(`Rekap_Kegiatan_${petugasNama}_${month}_${year}.pdf`);
  };

  const exportToExcel = () => {
    const tableData = data.map((item, i) => ({
      'NO': i + 1,
      'NAMA': item.petugasNama,
      'TANGGAL': formatDate(item.tanggal),
      'TEMPAT': item.tempat,
      'URAIAN KEGIATAN': item.uraian,
      'CHEKLIS LAPORAN': (item.hasLaporan || item.laporanSelesai) ? 'ada' : 'tidak ada',
      'CHECKLIS FOTO': item.hasDokumentasi ? 'ada' : 'tidak ada',
      'SPPD BELAKANG': item.hasSppd ? 'ada' : 'tidak ada'
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Rekap Kegiatan');
    
    const petugasNama = petugas.find(p => p.id === selectedPetugas)?.nama || 'Rekap_Gabungan';
    XLSX.writeFile(wb, `Rekap_Kegiatan_${petugasNama}_${month}_${year}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <h2 className="flex items-center gap-2 font-bold text-slate-700 mb-6 uppercase text-xs tracking-widest">
          <Filter size={16} className="text-indigo-600" />
          Parameter Laporan
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Nama Petugas</label>
            <select
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
              value={selectedPetugas}
              onChange={(e) => setSelectedPetugas(e.target.value)}
            >
              <option value="">Seluruh Petugas</option>
              {petugas.map(p => (
                <option key={p.id} value={p.id}>
                  {p.nama} {p.niat ? `(${p.niat})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Bulan</label>
            <select
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('id-ID', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Tahun Anggaran</label>
            <select
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            >
              {Array.from({ length: 5 }, (_, i) => 2024 + i).map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={handleFilter}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-md shadow-sm shadow-indigo-100 transition-all active:scale-[0.98]"
          >
            {loading ? 'Sinkronisasi...' : 'Tampilkan Data'}
          </button>
        </div>
      </div>

      {data.length > 0 && (
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest tracking-widest leading-none">Hasil Pencarian: <span className="text-slate-800">{data.length} Rekaman</span></p>
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <FilePdf size={14} className="text-rose-500" />
              EXPORT PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold border border-slate-200 rounded bg-white hover:bg-slate-50 text-slate-600 transition-colors"
            >
              <FileSpreadsheet size={14} className="text-emerald-500" />
              EXPORT EXCEL
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              <tr>
                <th className="px-6 py-3">Nama Petugas</th>
                <th className="px-6 py-3">Tanggal</th>
                <th className="px-6 py-3 text-center">Laporan</th>
                <th className="px-6 py-3 text-center">Foto</th>
                <th className="px-6 py-3 text-center">SPPD</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
              {data.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">Gunakan filter di atas untuk menarik data laporan bulanan.</td></tr>
              ) : data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{item.petugasNama}</td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-700">{formatDate(item.tanggal)}</p>
                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{item.tempat}</p>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <CheckStatus active={item.hasLaporan || item.laporanSelesai} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <CheckStatus active={item.hasDokumentasi} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <CheckStatus active={item.hasSppd} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      item.laporanSelesai ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'
                    }`}>
                      {item.laporanSelesai ? 'Terkirim' : 'Pending'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
