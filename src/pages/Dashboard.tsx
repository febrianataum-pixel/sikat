import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { Users, Calendar, CheckCircle2, ListTodo, FileText, ChevronRight, X, ArrowLeft, Smartphone, PlusCircle, UserCircle } from 'lucide-react';
import { formatDate } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '../hooks/useUserRole';
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
  const navigate = useNavigate();
  const { role, userProfile, loading: roleLoading } = useUserRole(auth.currentUser);
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
  const [selectedStat, setSelectedStat] = useState<string | null>(null);

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
        
        let filteredKegiatan = kegiatan;
        if (role === 'petugas') {
          const currentUserEmail = auth.currentUser?.email;
          const currentPetugasId = userProfile?.petugasId;
          const currentUserName = userProfile?.name;

          filteredKegiatan = kegiatan.filter(k => 
            (currentPetugasId && k.petugasId === currentPetugasId) || 
            (currentUserEmail && (k as any).createdByEmail === currentUserEmail) ||
            (currentUserName && (k as any).petugasNama === currentUserName)
          );
        }
        
        setKegiatanData(filteredKegiatan);

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        let thisMonthCount = 0;
        let pendingLaporan = 0;
        
        filteredKegiatan.forEach(data => {
          const d = new Date(data.tanggal);
          if (d >= startOfMonth) thisMonthCount++;
          if (!data.hasLaporan || !data.hasDokumentasi || !data.hasSppd) pendingLaporan++;
        });

        setStats({
          totalPetugas: petugas.length,
          totalKegiatan: filteredKegiatan.length,
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
    if (selectedStat) {
      if (selectedStat === 'Total Petugas') return []; // Special case
      if (selectedStat === 'Total Kegiatan') return kegiatanData;
      if (selectedStat === 'Kegiatan Bulan Ini') {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return kegiatanData.filter(k => new Date(k.tanggal) >= startOfMonth);
      }
      if (selectedStat === 'Laporan Pending') {
        return kegiatanData.filter(k => !k.hasLaporan || !k.hasDokumentasi || !k.hasSppd);
      }
    }
    if (!selectedPetugas) return [];
    return kegiatanData.filter(k => k.petugasId === selectedPetugas.id);
  }, [selectedPetugas, selectedStat, kegiatanData]);

  const statCards = [
    { label: 'Total Petugas', value: stats.totalPetugas, icon: Users, color: 'text-indigo-600' },
    { label: 'Total Kegiatan', value: stats.totalKegiatan, icon: Calendar, color: 'text-slate-800' },
    { label: 'Kegiatan Bulan Ini', value: stats.kegiatanBulanIni, icon: ListTodo, color: 'text-indigo-600' },
    { label: 'Laporan Pending', value: stats.laporanPending, icon: CheckCircle2, color: 'text-orange-500' },
  ];

  const handleBarClick = (data: any) => {
    if (data && data.fullData) {
      setSelectedStat(null);
      setSelectedPetugas(data.fullData);
    }
  };

  const handleStatClick = (label: string) => {
    setSelectedPetugas(null);
    setSelectedStat(label);
  };

  if (loading || roleLoading) return null;

  if (role === 'petugas') {
    return (
      <div className="space-y-8">
        <header className="flex flex-col gap-2">
          <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Halo, {userProfile?.name}! 👋</h2>
          <p className="text-slate-500 font-medium italic">"Semoga harimu menyenangkan dan penuh pengabdian."</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Input Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => navigate('/input')}
            className="p-8 bg-indigo-600 rounded-[32px] shadow-2xl shadow-indigo-200 cursor-pointer group flex flex-col justify-between min-h-[220px]"
          >
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white shadow-inner">
                <PlusCircle size={32} />
              </div>
              <div className="bg-indigo-500/30 px-3 py-1 rounded-full text-[10px] font-bold text-indigo-100 uppercase tracking-widest border border-indigo-400/30">
                Layanan Cepat
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">Tambah Kegiatan</h3>
              <p className="text-indigo-100 text-sm leading-relaxed opacity-80">
                Input laporan kegiatan harian Anda dengan mudah langsung dari smartphone.
              </p>
            </div>
          </motion.div>

          {/* Profile Card */}
          <motion.div 
            whileHover={{ y: -5 }}
            onClick={() => navigate('/profile')}
            className="p-8 bg-white border border-slate-200 rounded-[32px] shadow-xl shadow-slate-100 cursor-pointer group flex flex-col justify-between min-h-[220px]"
          >
            <div className="flex justify-between items-start">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">
                <UserCircle size={32} />
              </div>
              <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-bold text-slate-400 uppercase tracking-widest border border-slate-200">
                Pengaturan Akun
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">Profil Saya</h3>
              <p className="text-slate-500 text-sm leading-relaxed">
                Kelola informasi akun dan tautkan ke basis data petugas Anda.
              </p>
            </div>
          </motion.div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Calendar size={20} className="text-indigo-600" /> Riwayat Terakhir Anda
            </h3>
            <button 
              onClick={() => navigate('/kegiatan')}
              className="text-xs font-bold text-indigo-600 uppercase tracking-widest hover:underline"
            >
              Lihat Semua
            </button>
          </div>
          
          <div className="space-y-4">
            {kegiatanData.slice(0, 5).map(act => (
              <div key={act.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
                  <span className="text-slate-800 text-sm">{act.tanggal.split('-')[2]}</span>
                  {new Date(act.tanggal).toLocaleString('id-ID', { month: 'short' })}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 truncate">{act.uraian}</p>
                  <p className="text-xs text-slate-500">{act.tempat}</p>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </div>
            ))}
            {kegiatanData.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <ListTodo size={32} />
                </div>
                <p className="text-slate-400 italic text-sm">Belum ada riwayat kegiatan hari ini.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {statCards.map((card) => (
          <motion.div 
            key={card.label} 
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleStatClick(card.label)}
            className={cn(
              "p-5 rounded-3xl border shadow-sm cursor-pointer transition-all",
              selectedStat === card.label ? "bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500/20" : "bg-white border-slate-200"
            )}
          >
            <p className="text-sm font-medium text-slate-500 flex items-center gap-2">
              <card.icon size={16} className={card.color} />
              {card.label}
            </p>
            <h3 className={`text-3xl font-bold mt-1 ${card.color}`}>{card.value}</h3>
          </motion.div>
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
          className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 overflow-hidden flex flex-col relative"
        >
          <AnimatePresence mode="wait">
            {!selectedPetugas && !selectedStat ? (
              <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col"
              >
                <h3 className="font-bold text-slate-700 mb-6 uppercase text-xs tracking-widest">Informasi Sistem</h3>
                <div className="space-y-4">
                  <div 
                    onClick={() => navigate('/input')}
                    className="p-4 bg-indigo-600 rounded-2xl border border-indigo-500 shadow-lg shadow-indigo-100 group cursor-pointer active:scale-[0.98] transition-all"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white">
                        <Smartphone size={18} />
                      </div>
                      <h4 className="font-bold text-white text-sm">Mode Smartphone</h4>
                    </div>
                    <p className="text-[11px] text-indigo-100 leading-relaxed mb-3">
                      Klik di sini untuk mengakses tampilan input cepat yang dioptimalkan untuk HP petugas di lapangan.
                    </p>
                    <div className="flex items-center text-[10px] font-bold text-white uppercase tracking-widest">
                      BUKA INPUT CEPAT <ChevronRight size={12} className="ml-1" />
                    </div>
                  </div>

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
                    onClick={() => {
                      setSelectedPetugas(null);
                      setSelectedStat(null);
                    }}
                    className="p-1.5 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <ArrowLeft size={18} className="text-slate-500" />
                  </button>
                  <h3 className="font-bold text-slate-800 text-sm truncate max-w-[150px]">
                    {selectedStat || selectedPetugas?.nama}
                  </h3>
                  <div className="w-8"></div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                  {selectedStat === 'Total Petugas' ? (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Daftar Petugas ({petugasData.length})</h4>
                      {petugasData.map(p => (
                        <div 
                          key={p.id} 
                          onClick={() => {
                            setSelectedStat(null);
                            setSelectedPetugas(p);
                          }}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-indigo-200 transition-all cursor-pointer flex items-center gap-3"
                        >
                          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-indigo-600 shadow-sm">
                            <Users size={16} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">{p.nama}</p>
                            {p.niat && <p className="text-[10px] text-slate-500">{p.niat}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Kegiatan ({selectedActivities.length})</h4>
                      <div className="space-y-3">
                        {selectedActivities.slice(0, 20).map((act) => (
                          <div 
                            key={act.id} 
                            onClick={() => navigate('/kegiatan')}
                            className="p-3 bg-slate-50 rounded-xl border border-slate-100 group hover:border-indigo-200 transition-all cursor-pointer"
                          >
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
                        {selectedActivities.length > 20 && (
                          <button 
                            onClick={() => navigate('/kegiatan')}
                            className="w-full py-2 text-[10px] font-bold text-indigo-600 uppercase tracking-widest"
                          >
                            Lihat {selectedActivities.length - 20} lainnya...
                          </button>
                        )}
                        {selectedActivities.length === 0 && (
                          <div className="text-center py-8">
                            <p className="text-xs text-slate-400 italic">Belum ada data kegiatan</p>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <button 
                  onClick={() => {
                    setSelectedPetugas(null);
                    setSelectedStat(null);
                  }}
                  className="mt-4 w-full py-2 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-2"
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
