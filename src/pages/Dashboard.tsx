import { useState, useEffect } from 'react';
import { collection, query, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Calendar, CheckCircle2, ListTodo, FileText } from 'lucide-react';
import { formatDate } from '../lib/utils';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPetugas: 0,
    totalKegiatan: 0,
    kegiatanBulanIni: 0,
    laporanPending: 0
  });
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const petugasSnap = await getDocs(collection(db, 'petugas'));
        const kegiatanSnap = await getDocs(query(collection(db, 'kegiatan'), orderBy('tanggal', 'desc'), limit(5)));
        
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        // This is a simplified client-side stat calculation for demo
        // In production, use Firebase Functions or proper queries
        const allKegiatan = await getDocs(collection(db, 'kegiatan'));
        let thisMonthCount = 0;
        let pendingLaporan = 0;
        
        allKegiatan.forEach(doc => {
          const data = doc.data();
          const d = new Date(data.tanggal);
          if (d >= startOfMonth) thisMonthCount++;
          if (!data.laporanSelesai) pendingLaporan++;
        });

        setStats({
          totalPetugas: petugasSnap.size,
          totalKegiatan: allKegiatan.size,
          kegiatanBulanIni: thisMonthCount,
          laporanPending: pendingLaporan
        });

        setRecentActivities(kegiatanSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statCards = [
    { label: 'Total Petugas', value: stats.totalPetugas, icon: Users, color: 'text-indigo-600' },
    { label: 'Total Kegiatan', value: stats.totalKegiatan, icon: Calendar, color: 'text-slate-800' },
    { label: 'Kegiatan Bulan Ini', value: stats.kegiatanBulanIni, icon: ListTodo, color: 'text-slate-800' },
    { label: 'Laporan Pending', value: stats.laporanPending, icon: CheckCircle2, color: 'text-orange-500' },
  ];

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500">{card.label}</p>
            <h3 className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <h3 className="font-bold text-slate-700">Kegiatan Terbaru</h3>
            <button className="text-xs font-bold text-indigo-600 hover:underline">LIHAT SEMUA</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                <tr>
                  <th className="px-6 py-3">Petugas</th>
                  <th className="px-6 py-3">Uraian Kegiatan</th>
                  <th className="px-6 py-3">Tanggal</th>
                  <th className="px-6 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm text-slate-600">
                {recentActivities.map((act) => (
                  <tr key={act.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-800">{act.petugasNama}</td>
                    <td className="px-6 py-4 truncate max-w-xs">{act.uraian}</td>
                    <td className="px-6 py-4">{formatDate(act.tanggal)}</td>
                    <td className="px-6 py-4 text-right">
                      {act.laporanSelesai ? (
                        <span className="text-emerald-600 flex items-center justify-end gap-1 font-medium italic">
                          <CheckCircle2 size={14} /> Terkirim
                        </span>
                      ) : (
                        <span className="text-orange-500 flex items-center justify-end gap-1 font-medium italic">
                          <Calendar size={14} /> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col">
          <h3 className="font-bold text-slate-700 mb-6">Informasi Sistem</h3>
          <div className="space-y-4">
            <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
              <h4 className="font-bold text-indigo-900 text-sm mb-1 uppercase tracking-tight">Pemberitahuan</h4>
              <p className="text-xs text-indigo-700 leading-relaxed">
                Pastikan setiap kegiatan diunggah beserta bukti foto dan SPPD Belakang untuk kelancaran administrasi harian.
              </p>
            </div>
            
            <div className="flex items-center gap-4 py-3 border-b border-slate-100 group cursor-pointer">
              <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">Panduan SIKAT.pdf</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Baru Saja</p>
              </div>
            </div>
          </div>

          <footer className="mt-auto pt-8 flex justify-between items-center text-[10px] text-slate-400 font-medium">
             <div className="flex gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                <span>DB ACTIVE</span>
             </div>
             <p>v1.0.2</p>
          </footer>
        </div>
      </div>
    </div>
  );
}
