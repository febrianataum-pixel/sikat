import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Filter, Download, FileSpreadsheet, FileIcon as FilePdf } from 'lucide-react';
import { formatDate } from '../lib/utils';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

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
  petugasNama: string;
  tanggal: string;
  tempat: string;
  uraian: string;
  laporanSelesai: boolean;
}

export default function LaporanPage() {
  const [petugas, setPetugas] = useState<Petugas[]>([]);
  const [data, setData] = useState<Kegiatan[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [selectedPetugas, setSelectedPetugas] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    fetchPetugas();
  }, []);

  const fetchPetugas = async () => {
    const snap = await getDocs(collection(db, 'petugas'));
    setPetugas(snap.docs.map(doc => ({ 
      id: doc.id, 
      nama: doc.data().nama,
      niat: doc.data().niat
    })));
  };

  const handleFilter = async () => {
    setLoading(true);
    try {
      let q = query(collection(db, 'kegiatan'), orderBy('tanggal', 'asc'));
      
      if (selectedPetugas) {
        q = query(q, where('petugasId', '==', selectedPetugas));
      }

      const snap = await getDocs(q);
      const allData = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kegiatan));

      // Filter by month and year in JS to avoid complex Firestore indexing during dev
      const filtered = allData.filter(item => {
        const d = new Date(item.tanggal);
        return (d.getMonth() + 1 === Number(month)) && (d.getFullYear() === Number(year));
      });

      setData(filtered);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const petugasNama = petugas.find(p => p.id === selectedPetugas)?.nama || 'Semua Petugas';
    
    doc.setFontSize(18);
    doc.text('SIKAT - Laporan Kegiatan Harian', 14, 22);
    doc.setFontSize(11);
    doc.text(`Petugas: ${petugasNama}`, 14, 30);
    doc.text(`Periode: ${month}/${year}`, 14, 36);

    const tableData = data.map(item => [
      formatDate(item.tanggal),
      item.tempat,
      item.uraian,
      item.laporanSelesai ? 'Selesai' : 'Proses'
    ]);

    doc.autoTable({
      startY: 45,
      head: [['Tanggal', 'Tempat', 'Uraian Kegiatan', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`Laporan_Kegiatan_${petugasNama}_${month}_${year}.pdf`);
  };

  const exportToExcel = () => {
    const tableData = data.map(item => ({
      'Nama Petugas': item.petugasNama,
      'Tanggal': formatDate(item.tanggal),
      'Tempat': item.tempat,
      'Uraian': item.uraian,
      'Status': item.laporanSelesai ? 'Lengkap' : 'Belum Lengkap'
    }));

    const ws = XLSX.utils.json_to_sheet(tableData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Kegiatan');
    XLSX.writeFile(wb, `Laporan_SIKAT_${month}_${year}.xlsx`);
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
                <th className="px-6 py-3">Lokasi</th>
                <th className="px-6 py-3">Uraian Tugas</th>
                <th className="px-6 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
              {data.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">Gunakan filter di atas untuk menarik data laporan bulanan.</td></tr>
              ) : data.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-800">{item.petugasNama}</td>
                  <td className="px-6 py-4">{formatDate(item.tanggal)}</td>
                  <td className="px-6 py-4 font-medium">{item.tempat}</td>
                  <td className="px-6 py-4 text-slate-500 italic max-w-sm truncate">"{item.uraian}"</td>
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
