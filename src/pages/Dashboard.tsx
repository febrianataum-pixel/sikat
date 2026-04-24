import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Users, Calendar, CheckCircle2, ListTodo, FileText, ChevronRight, X, ArrowLeft } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';

interface Petugas {
  id: string;
  nama: string;
  niat?: string;
}

interface Kegiatan {
  id: string;
  petugasId: string;
  uraian: string;
  tanggal: string;
  tempat: string;
  hasLaporan: boolean;
  hasDokumentasi: boolean;
  hasSppd: boolean;
}

interface ChartItem {
  id: string;
  nama: string;
  count: number;
  fullData: Petugas;
}

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalPetugas: 0,
    totalKegiatan: 0,
    kegiatanBulanIni: 0,
    laporanPending: 0
  });
  const [loading, setLoading] = useState(true);
  const [petugasData, setPetugasData] = useState<Petugas[]>([]);
  const [kegiatanData, setKegiatanData] = useState<Kegiatan[]>([]);
  const [selectedPetugas, setSelectedPetugas] = useState<Petugas | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [petugasSnap, activitiesSnap] = await Promise.all([
          getDocs(collection(db, 'petugas')),
          getDocs(query(collection(db, 'kegiatan'), orderBy('tanggal', 'desc')))
        ]);
        
        const petugas = petugasSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Petugas));
        const kegiatan = activitiesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Kegiatan));
        
        setPetugasData(petugas);
        setKegiatanData(kegiatan);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let thisMonthCount = 0;
        let pendingLaporan = 0;
        
        kegiatan.forEach(data => {
          const d = new Date(data.tanggal);
          if (d >= startOfMonth) thisMonthCount++;
          if (!data.hasLaporan || !data.hasDokumentasi || !data.hasSppd) pendingLaporan++;
        });

        setStats({
          totalPetugas: petugas.length,
          totalKegiatan: kegiatan.length,
          kegiatanBulanIni: thisMonthCount,
          laporanPending: pendingLaporan
        });

      } catch (err) {
        console.error("Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const chartData = useMemo((): ChartItem[] => {
    return petugasData.map(p => {
      const count = kegiatanData.filter(k => k.petugasId === p.id).length;
      return {
        id: p.id,
        nama: p.nama,
        count: count,
        fullData: p
      };
    }).sort((a, b) => b.count - a.count);
  }, [petugasData, kegiatanData]);

  const selectedActivities = useMemo(() => {
    if (!selectedPetugas) return [];
    return kegiatanData.filter(k => k.petugasId === selectedPetugas.id);
  }, [selectedPetugas, kegiatanData]);

  const statCards = [
    { label: 'Total Petugas', value: stats.totalPetugas, icon: Users, color: 'text-indigo-600' },
    { label: 'Total Kegiatan', value: stats.totalKegiatan, icon: Calendar, color: 'text-slate-800' },
    { label: 'Kegiatan Bulan Ini', value: stats.kegiatanBulanIni, icon: ListTodo, color: 'text-indigo-600' },
    { label: 'Laporan Pending', value: stats.laporanPending, icon: CheckCircle2, color: 'text-orange-500' },
  ];

  const handleBarClick = (data: any) => {
    if (data && data.fullData) {
      setSelectedPetugas(data.fullData);
    }
  };

  if (loading) return null;

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <card.icon size={16} className={card.color} />
              {card.label}
            </p>
            <h3 className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</h3>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[450px]"
        >
          <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
            <div>
              <h3 className="font-bold text-slate-700">Rekapitulasi Kegiatan Petugas</h3>
              <p className="text-xs text-slate-500">Klik batang grafik untuk melihat detail kegiatan</p>
            </div>
          </div>
          
          <div className="flex-1 p-6">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                onClick={(e: any) => {
                  if (e && e.activePayload && e.activePayload[0]) {
                    handleBarClick(e.activePayload[0].payload);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="nama" 
                  type="category" 
                  tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }}
                  width={140}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 600
                  }}
                />
                <Bar 
                  dataKey="count" 
                  radius={[0, 4, 4, 0]} 
                  barSize={20}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={selectedPetugas?.id === entry.id ? '#4f46e5' : '#e2e8f0'} 
                      className="hover:fill-indigo-500 transition-colors duration-300"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col relative"
        >
          <AnimatePresence mode="wait">
            {!selectedPetugas ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                <h3 className="font-bold text-slate-700 mb-6 uppercase text-xs tracking-widest">Informasi Sistem</h3>
                <div className="space-y-4">
                  <div className="p-4 bg-indigo-50/50 rounded-lg border border-indigo-100">
                    <h4 className="font-bold text-indigo-900 text-sm mb-1 uppercase tracking-tight">Pemberitahuan</h4>
                    <p className="text-xs text-indigo-700 leading-relaxed">
                      Pilih salah satu petugas pada grafik untuk melihat rincian kegiatan terbaru yang dilakukan oleh petugas tersebut.
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
                  <p>v1.2.0</p>
                </footer>
              </motion.div>
            ) : (
              <motion.div 
                key="details"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center justify-between mb-6">
                  <button 
                    onClick={() => setSelectedPetugas(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <ArrowLeft size={18} className="text-slate-500" />
                  </button>
                  <h3 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">{selectedPetugas.nama}</h3>
                  <div className="w-8"></div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Kegiatan ({selectedActivities.length})</h4>
                  <div className="space-y-3">
                    {selectedActivities.slice(0, 10).map((act) => (
                      <div key={act.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100 group hover:border-indigo-200 transition-all">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-xs font-bold text-slate-800 leading-tight">{act.uraian}</p>
                          <span className="text-[10px] font-mono text-slate-400 whitespace-nowrap">{formatDate(act.tanggal)}</span>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <p className="text-[10px] text-slate-500">{act.tempat}</p>
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            act.hasLaporan && act.hasDokumentasi && act.hasSppd ? "bg-emerald-500" : "bg-orange-500"
                          )}></div>
                        </div>
                      </div>
                    ))}
                    {selectedActivities.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-xs text-slate-400 italic">Belum ada data kegiatan</p>
                      </div>
                    )}
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedPetugas(null)}
                  className="mt-4 w-full py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <X size={14} /> TUTUP DETAIL
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
