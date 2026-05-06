import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SppdData {
  nomorSppd?: string;
  tahun?: string;
  petugas: {
    nama: string;
    niat?: string;
    jabatan?: string;
    tingkatSPPD: string;
  };
  ppk: {
    nama: string;
    nip: string;
    jabatan: string;
  };
  tanggal: string;
  tempat: string;
  uraian: string;
  lamaPerjalanan?: string;
  logoUrl?: string;
  subKegiatan?: string;
}

export const generateSpt = (data: {
  nomorSpt?: string;
  tahun?: string;
  dasarHukum: string[];
  petugas: {
    nama: string;
    niat?: string;
    jabatan?: string;
  };
  maksud: string;
  tempat: string;
  tanggal: string;
  logoUrl?: string;
  kadis: {
    nama: string;
    nip: string;
    pangkat: string;
  };
}) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
  };

  const formatDateWithDay = (dateStr: string) => {
    const day = getDayName(dateStr);
    const dateArr = dateStr.split('-'); // YYYY-MM-DD
    if (dateArr.length !== 3) return dateStr;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${day}, ${dateArr[2]} ${months[parseInt(dateArr[1]) - 1]} ${dateArr[0]}`;
  };

  // LOGO
  if (data.logoUrl) {
    try {
      // Use undefined for the format to let jsPDF auto-detect based on signature.
      // This prevents "wrong PNG signature" errors if image is actually JPEG/WEBP.
      doc.addImage(data.logoUrl, undefined as any, 15, 12, 22, 22, undefined, 'FAST');
    } catch (e) {
      console.error("Failed to add logo:", e);
    }
  }

  // KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PEMERINTAH KABUPATEN BLORA', 105, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text('DINAS SOSIAL PEMBERDAYAAN PEREMPUAN', 105, 21, { align: 'center' });
  doc.text('DAN PERLINDUNGAN ANAK', 105, 27, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl. Pemuda No.16 A Telp / Fax (0296) 5298541 BLORA - 58215', 105, 32, { align: 'center' });
  doc.text('Website : dinsos.blorakab.go.id / E-mail : dinsosp3a.bla@gmail.com', 105, 36, { align: 'center' });

  // LINE
  doc.setLineWidth(0.8);
  doc.line(15, 40, 195, 40);
  doc.setLineWidth(0.3);
  doc.line(15, 41, 195, 41);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SURAT PERINTAH TUGAS', 105, 50, { align: 'center' });
  const textWidth = doc.getTextWidth('SURAT PERINTAH TUGAS');
  doc.line(105 - textWidth/2, 51, 105 + textWidth/2, 51);
  
  const currentYear = data.tahun || data.tanggal.split('-')[0] || new Date().getFullYear();
  let fullNomor = data.nomorSpt || '                ';
  if (fullNomor && !fullNomor.includes('000.1.2.3')) {
    fullNomor = `000.1.2.3 / ${fullNomor} / ${currentYear}`;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nomor : ${fullNomor}`, 105, 56, { align: 'center' });

  let currentY = 70;

  // DASAR
  doc.setFont('helvetica', 'normal');
  doc.text('Dasar', 15, currentY);
  doc.text(':', 35, currentY);
  
  const dasars = data.dasarHukum.length > 0 ? data.dasarHukum : ['Kepentingan Dinas.'];
  dasars.forEach((dasar, i) => {
    doc.text(`${i + 1}.`, 40, currentY);
    const lines = doc.splitTextToSize(dasar, 140);
    doc.text(lines, 45, currentY);
    currentY += (lines.length * 5) + 2;
  });

  doc.setFont('helvetica', 'bold');
  doc.text('MENUGASKAN', 105, currentY + 5, { align: 'center' });
  currentY += 15;

  // KEPADA
  doc.setFont('helvetica', 'normal');
  doc.text('Kepada', 15, currentY);
  doc.text(':', 35, currentY);
  
  // Member 1 (Always at least one)
  doc.text('1.  Nama', 40, currentY);
  doc.text(`: ${data.petugas.nama}`, 75, currentY);
  currentY += 5;
  doc.text('    NIAT', 40, currentY);
  doc.text(`: ${data.petugas.niat || '-'}`, 75, currentY);
  currentY += 5;
  doc.text('    Jabatan', 40, currentY);
  doc.text(`: ${data.petugas.jabatan || '-'}`, 75, currentY);
  
  currentY += 10;

  // UNTUK
  doc.text('Untuk', 15, currentY);
  doc.text(':', 35, currentY);
  doc.text('1.  Maksud Perjalanan', 40, currentY);
  const maksudLines = doc.splitTextToSize(`: ${data.maksud}`, 110);
  doc.text(maksudLines, 80, currentY);
  currentY += (maksudLines.length * 5) + 2;

  doc.text('    Tempat', 40, currentY);
  doc.text(`: ${data.tempat}`, 80, currentY);
  currentY += 5;

  doc.text('    Hari/Tanggal', 40, currentY);
  doc.text(`: ${formatDateWithDay(data.tanggal)}`, 80, currentY);
  currentY += 10;

  doc.text('2.  Melaporkan hasil pelaksanaan tugas kepada pemberi tugas;', 40, currentY);
  currentY += 5;
  doc.text('3.  Perintah itu dilaksanakan dengan penuh tanggung jawab;', 40, currentY);
  currentY += 5;
  doc.text('4.  Biaya perjalanan dinas diberikan sesuai ketentuan yang berlaku;', 40, currentY);
  currentY += 5;
  doc.text('5.  Apabila terdapat kekeliruan dalam Surat Perintah Tugas ini akan diadakan', 40, currentY);
  currentY += 5;
  doc.text('    perbaikan sebagaimana mestinya.', 40, currentY);

  currentY += 15;

  // SIGNATURE
  const sigX = 115;
  doc.setFont('helvetica', 'normal');
  doc.text('Ditetapkan di', sigX, currentY);
  doc.text(': Blora', sigX + 30, currentY);
  currentY += 5;
  doc.text('Tanggal', sigX, currentY);
  doc.text(`: ${formatDateWithDay(data.tanggal).split(',')[1].trim()}`, sigX + 30, currentY);
  doc.line(sigX, currentY + 1, sigX + 75, currentY + 1);

  currentY += 10;
  doc.setFont('helvetica', 'bold');
  const kadisLines = [
    'Kepala Dinas Sosial,',
    'Pemberdayaan Perempuan dan',
    'Perlindungan Anak',
    'Kabupaten Blora'
  ];
  kadisLines.forEach((line, i) => {
    doc.text(line, sigX, currentY + (i * 5));
  });

  currentY += 35;
  doc.text(data.kadis.nama, sigX, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${data.kadis.nip}`, sigX, currentY + 5);

  return doc;
};

const sayNumber = (n: number): string => {
  if (n === 0) return "";
  
  const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let res = "";
  
  if (n < 12) res = units[n];
  else if (n < 20) res = units[n - 10] + " Belas";
  else if (n < 100) res = units[Math.floor(n / 10)] + " Puluh " + units[n % 10];
  else if (n < 200) res = "Seratus " + sayNumber(n - 100);
  else if (n < 1000) res = units[Math.floor(n / 100)] + " Ratus " + sayNumber(n % 100);
  else if (n < 2000) res = "Seribu " + sayNumber(n - 1000);
  else if (n < 1000000) res = sayNumber(Math.floor(n / 1000)) + " Ribu " + sayNumber(n % 1000);
  else if (n < 1000000000) res = sayNumber(Math.floor(n / 1000000)) + " Juta " + sayNumber(n % 1000000);
  else res = sayNumber(Math.floor(n / 1000000000)) + " Miliar " + sayNumber(n % 1000000000);
  
  return res.trim();
};

export const terbilang = (n: number): string => {
  if (n === 0) return "Nol Rupiah";
  if (n < 0) return "Minus " + terbilang(-n);
  
  let res = sayNumber(n);
  
  // Specific Indonesian language fixes
  res = res.replace("Satu Puluh", "Sepuluh")
           .replace("Satu Ratus", "Seratus")
           .replace("Satu Ribu", "Seribu")
           .replace(/\s+/g, " ")
           .trim();
  
  return res + " Rupiah";
};

export const generateRincianBiaya = (data: {
  nomorSppd?: string;
  tahun?: string;
  tanggalSpt: string;
  petugas: {
    nama: string;
    tingkatSPPD: string;
  };
  rincian: {
    uraian: string;
    nominal: number;
    hari: number;
  }[];
  ppk: {
    nama: string;
    nip: string;
  };
  bendahara: {
    nama: string;
    nip: string;
    jabatan?: string;
  };
}) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const harianItem = data.rincian.find(item => item.uraian.toLowerCase().includes('harian')) || data.rincian[0];
  const finalTotal = harianItem.nominal * harianItem.hari;
  const terbilangText = terbilang(finalTotal);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('RINCIAN BIAYA PERJALANAN DINAS', 105, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Lampiran SPD Nomor', 15, 35);
  doc.text(':', 55, 35);
  
  const currentYear = data.tahun || data.tanggalSpt.split('-')[0] || new Date().getFullYear();
  let fullNomor = data.nomorSppd || '...........................................';
  if (fullNomor && fullNomor !== '...........................................' && !fullNomor.includes('000.1.2.3')) {
    fullNomor = `000.1.2.3 / ${fullNomor} / ${currentYear}`;
  }
  doc.text(fullNomor, 60, 35);

  doc.text('Tanggal', 15, 41);
  doc.text(':', 55, 41);
  const dateArr = data.tanggalSpt.split('-');
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const formattedDate = dateArr.length === 3 ? `${dateArr[2]} ${months[parseInt(dateArr[1]) - 1]} ${dateArr[0]}` : data.tanggalSpt;
  doc.text(formattedDate, 60, 41);

  const tableData = [[
    1,
    data.petugas.nama,
    harianItem.nominal.toLocaleString('id-ID'),
    harianItem.hari,
    finalTotal.toLocaleString('id-ID'),
    data.petugas.tingkatSPPD,
    '1.'
  ]];

  autoTable(doc, {
    startY: 50,
    head: [['NO', 'PERINCIAN BIAYA', 'NOMINAL (Rp)', 'HARI', 'JUMLAH (Rp)', 'KET', 'TTD']],
    body: [
      ...tableData,
      [
        { content: 'JUMLAH TOTAL', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, 
        { content: finalTotal.toLocaleString('id-ID'), styles: { fontStyle: 'bold', halign: 'right' } }, 
        { content: '', colSpan: 2 }
      ]
    ],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center' },
    styles: { fontSize: 9, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 55 },
      2: { halign: 'right', cellWidth: 25 },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 30 },
      5: { halign: 'center', cellWidth: 25 },
      6: { halign: 'center', cellWidth: 15 }
    }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.text('Terbilang :', 15, currentY);
  doc.text(`( ${terbilangText} )`, 35, currentY);

  currentY += 15;
  doc.setFont('helvetica', 'normal');
  doc.text(`Blora, ${formattedDate}`, 150, currentY, { align: 'right' });
  
  currentY += 10;
  doc.setFont('helvetica', 'bold');
  doc.text('PERHITUNGAN SPD RAMPUNG', 105, currentY, { align: 'center' });
  
  currentY += 10;
  doc.setFont('helvetica', 'normal');
  doc.text('ditetapkan Sejumlah', 15, currentY);
  doc.text(`Rp ${finalTotal.toLocaleString('id-ID')}`, 105, currentY);
  currentY += 6;
  doc.text('yang telah dibayar semula', 15, currentY);
  doc.text(`Rp ${finalTotal.toLocaleString('id-ID')}`, 105, currentY);
  currentY += 6;
  doc.text('sisa kurang / lebih', 15, currentY);
  doc.text('Rp -', 105, currentY);

  currentY += 15;
  doc.setFont('helvetica', 'normal');
  doc.text('PEJABAT PEMBUAT KOMITMEN', 50, currentY, { align: 'center' });
  doc.text('BENDAHARA PENGELUARAN', 150, currentY, { align: 'center' });
  currentY += 5;
  doc.text('PEMBANTU BIDANG SOSIAL', 150, currentY, { align: 'center' });

  currentY += 25;
  doc.setFont('helvetica', 'bold');
  doc.text(data.ppk.nama.toUpperCase(), 50, currentY, { align: 'center' });
  doc.text(data.bendahara.nama.toUpperCase(), 150, currentY, { align: 'center' });
  
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${data.ppk.nip}`, 50, currentY, { align: 'center' });
  doc.text(`NIP. ${data.bendahara.nip}`, 150, currentY, { align: 'center' });

  return doc;
};

export const generateRekapKegiatan = (data: {
  bulan: string;
  tahun: string;
  kegiatan: {
    nama: string;
    tanggal: string;
    tempat: string;
    uraian: string;
    hasLaporan: boolean;
    hasDokumentasi: boolean;
    hasSppd: boolean;
  }[];
  kabid: {
    nama: string;
    nip: string;
    jabatan: string;
  };
  pptk: {
    nama: string;
    nip: string;
  };
}) => {
  const doc = new jsPDF({
    orientation: 'l', // Landscape
    unit: 'mm',
    format: 'a4'
  });

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return days[date.getDay()];
  };

  const formatDateShort = (dateStr: string) => {
    const day = getDayName(dateStr);
    const dateArr = dateStr.split('-');
    if (dateArr.length !== 3) return dateStr;
    return `${day}, ${dateArr[2]}-${dateArr[1]}-${dateArr[0]}`;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`REKAP KEGIATAN TAGANA BULAN ${data.bulan.toUpperCase()} TAHUN ${data.tahun}`, 148, 15, { align: 'center' });

  const tableData = data.kegiatan.map((k, i) => [
    i + 1,
    k.nama,
    formatDateShort(k.tanggal),
    k.tempat,
    k.uraian,
    k.hasLaporan ? 'ada' : 'tidak ada',
    k.hasDokumentasi ? 'ada' : 'tidak ada',
    k.hasSppd ? 'ada' : 'tidak ada'
  ]);

  autoTable(doc, {
    startY: 25,
    margin: { left: 10, right: 10 },
    head: [['NO', 'NAMA', 'TANGGAL', 'TEMPAT', 'URAIAN KEGIATAN KEGIATAN', 'CHEKLIS LAPORAN', 'CHECKLIS FOTO', 'SPPD BELAKANG']],
    body: tableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [255, 255, 255], 
      textColor: [0, 0, 0], 
      lineWidth: 0.1, 
      lineColor: [0, 0, 0], 
      halign: 'center', 
      fontSize: 8,
      fontStyle: 'bold'
    },
    styles: { 
      fontSize: 8, 
      cellPadding: 2, 
      lineColor: [0, 0, 0], 
      lineWidth: 0.1, 
      textColor: [0, 0, 0],
      font: 'helvetica'
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 35 },
      2: { cellWidth: 30 },
      3: { cellWidth: 40 },
      4: { cellWidth: 'auto' },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', cellWidth: 20 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 15;
  const now = new Date();
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const today = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  
  // Right side (Penyelenggara)
  doc.text(`Blora,   ${today}`, 230, finalY);
  doc.text('Penyelenggara,', 230, finalY + 5);
  doc.text('Pejabat Pelaksana Teknis Kegiatan', 230, finalY + 10);
  
  // Left side (Mengetahui)
  doc.text('Mengetahui,', 25, finalY);
  doc.text(data.kabid.jabatan, 25, finalY + 5);

  const sigY = finalY + 30;
  
  // Kabid
  doc.setFont('helvetica', 'bold');
  doc.text(data.kabid.nama, 25, sigY);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${data.kabid.nip}`, 25, sigY + 5);

  // PPTK
  doc.setFont('helvetica', 'bold');
  doc.text(data.pptk.nama, 230, sigY);
  doc.setFont('helvetica', 'normal');
  doc.text(`NIP. ${data.pptk.nip}`, 230, sigY + 5);

  return doc;
};

export const generateLaporanHasilPerjalanan = (data: {
  nomorSpt?: string;
  tahun?: string;
  tanggalSpt: string;
  maksud: string;
  tempat: string;
  petugas: {
    nama: string;
  };
  hasil: string[];
  dokumentasi?: string[];
  logoUrl?: string;
}) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const formatDateShort = (dateStr: string) => {
    const dateArr = dateStr.split('-');
    if (dateArr.length !== 3) return dateStr;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${dateArr[2]} ${months[parseInt(dateArr[1]) - 1]} ${dateArr[0]}`;
  };

  // LOGO
  if (data.logoUrl) {
    try {
      doc.addImage(data.logoUrl, undefined as any, 15, 12, 22, 22, undefined, 'FAST');
    } catch (e) {
      console.error("Failed to add logo:", e);
    }
  }

  // KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PEMERINTAH KABUPATEN BLORA', 105, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text('DINAS SOSIAL PEMBERDAYAAN PEREMPUAN', 105, 21, { align: 'center' });
  doc.text('DAN PERLINDUNGAN ANAK', 105, 27, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl. Pemuda No.16 A Telp / Fax (0296) 5298541 BLORA – 58215', 105, 32, { align: 'center' });
  doc.text('Website : dinsos.blorakab.go.id / E-mail : dinsosp3a.bla.com', 105, 36, { align: 'center' });

  // LINE
  doc.setLineWidth(0.8);
  doc.line(15, 40, 195, 40);
  doc.setLineWidth(0.3);
  doc.line(15, 41, 195, 41);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('LAPORAN HASIL PERJALANAN', 105, 50, { align: 'center' });
  const textWidth = doc.getTextWidth('LAPORAN HASIL PERJALANAN');
  doc.line(105 - textWidth/2, 51, 105 + textWidth/2, 51);

  let currentY = 65;
  doc.setFontSize(10);

  // 1. UMUM
  doc.setFont('helvetica', 'bold');
  doc.text('1.  UMUM', 15, currentY);
  currentY += 5;
  doc.setFont('helvetica', 'normal');
  doc.text('Maksud dan tujuan perjalanan Dinas', 22, currentY);
  doc.text(':', 95, currentY);
  const maksudLines = doc.splitTextToSize(data.maksud, 95);
  doc.text(maksudLines, 100, currentY);
  currentY += (maksudLines.length * 5) + 2;

  doc.text('Tanggal dan Nomor Surat Perintah Tugas', 22, currentY);
  doc.text(':', 95, currentY);
  
  const currentYear = data.tahun || data.tanggalSpt.split('-')[0] || new Date().getFullYear();
  let fullNomor = data.nomorSpt || '...............';
  if (fullNomor && fullNomor !== '...............' && !fullNomor.includes('000.1.2.3')) {
    fullNomor = `000.1.2.3 / ${fullNomor} / ${currentYear}`;
  }
  
  doc.text(formatDateShort(data.tanggalSpt), 100, currentY);
  currentY += 5;
  doc.text(`Nomor : ${fullNomor}`, 100, currentY);
  currentY += 7;

  doc.text('Tempat Tujuan', 22, currentY);
  doc.text(':', 95, currentY);
  const tempatLines = doc.splitTextToSize(data.tempat, 95);
  doc.text(tempatLines, 100, currentY);
  currentY += (tempatLines.length * 5) + 5;

  // 2. HASIL YANG DIPEROLEH
  doc.setFont('helvetica', 'bold');
  doc.text('2.  HASIL YANG DIPEROLEH', 15, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  
  if (data.hasil && data.hasil.length > 0) {
    data.hasil.filter(h => h.trim() !== '').forEach((h) => {
      doc.text('\u2022', 22, currentY);
      const lines = doc.splitTextToSize(h, 165);
      doc.text(lines, 27, currentY);
      currentY += (lines.length * 5) + 2;
    });
  } else {
    doc.text('\u2022', 22, currentY);
    doc.text('-', 27, currentY);
    currentY += 7;
  }
  currentY += 3;

  // 3. LAIN-LAIN
  doc.setFont('helvetica', 'bold');
  doc.text('3.  LAIN-LAIN', 15, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'normal');
  doc.text('\u2022  Dokumentasi kegiatan terlampir,', 22, currentY);
  currentY += 5;
  doc.text('\u2022  Selama kegiatan berlangsung lancar.', 22, currentY);
  currentY += 5;
  doc.text('\u2022  Demikian untuk menjadi periksa dan mohon petunjuk.', 22, currentY);

  currentY += 20;

  // SIGNATURE
  doc.text(`Blora, ${formatDateShort(data.tanggalSpt)}`, 130, currentY);
  currentY += 5;
  doc.text('Yang menjalankan tugas :', 130, currentY);
  currentY += 15;
  
  doc.setFont('helvetica', 'bold');
  doc.text(data.petugas.nama, 130, currentY);
  const nameWidth = doc.getTextWidth(data.petugas.nama);
  doc.line(130, currentY + 1, 130 + nameWidth, currentY + 1);

  return doc;
};

export const generateDokumentasi = (data: {
  maksud: string;
  tempat: string;
  tanggal: string;
  dokumentasi: string[];
}) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  const formatDateShort = (dateStr: string) => {
    const dateArr = dateStr.split('-');
    if (dateArr.length !== 3) return dateStr;
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${dateArr[2]} ${months[parseInt(dateArr[1]) - 1]} ${dateArr[0]}`;
  };

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('DOKUMENTASI', 105, 30, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(data.maksud, 105, 37, { align: 'center' });
  doc.text(data.tempat, 105, 43, { align: 'center' });
  doc.text(formatDateShort(data.tanggal), 105, 49, { align: 'center' });

  if (data.dokumentasi && data.dokumentasi.length > 0) {
    let photoY = 65;
    let photoX = 20;
    const photoWidth = 80;
    const photoHeight = 60;
    const gap = 10;

    data.dokumentasi.forEach((url, i) => {
      if (photoY + photoHeight > 280) {
        doc.addPage();
        photoY = 20;
      }

      try {
        doc.addImage(url, 'JPEG', photoX, photoY, photoWidth, photoHeight, undefined, 'FAST');
      } catch (e) {
        doc.rect(photoX, photoY, photoWidth, photoHeight);
        doc.text('Gagal memuat gambar', photoX + 5, photoY + photoHeight / 2);
      }

      if (i % 2 === 0) {
        photoX = 110;
      } else {
        photoX = 20;
        photoY += photoHeight + gap;
      }
    });
  } else {
    doc.setFontSize(10);
    doc.text('(Belum ada dokumentasi ditambahkan)', 105, 70, { align: 'center' });
  }

  return doc;
};

export const generateSppdDepan = (data: SppdData) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  // LOGO
  if (data.logoUrl) {
    try {
      doc.addImage(data.logoUrl, undefined as any, 15, 12, 22, 22, undefined, 'FAST');
    } catch (e) {
      console.error("Failed to add logo to PDF:", e);
    }
  }

  // KOP SURAT
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('PEMERINTAH KABUPATEN BLORA', 105, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text('DINAS SOSIAL PEMBERDAYAAN PEREMPUAN', 105, 21, { align: 'center' });
  doc.text('DAN PERLINDUNGAN ANAK', 105, 27, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Jl. Pemuda No.16 A Blora 58215, No. Tlp: (0296) 5298541', 105, 32, { align: 'center' });
  doc.text('Website : dinsos.blorakab.go.id / E-mail : dinsosp3a.bla@gmail.com', 105, 36, { align: 'center' });

  // LINE
  doc.setLineWidth(0.8);
  doc.line(15, 40, 195, 40);
  doc.setLineWidth(0.3);
  doc.line(15, 41, 195, 41);

  // KODE DAN NOMOR
  doc.setFontSize(10);
  const currentYear = data.tahun || data.tanggal.split('-')[0] || new Date().getFullYear();
  let fullNomor = data.nomorSppd || '                ';
  
  // If no year suffix exists and it's not the redundant prefix, append year
  if (fullNomor && !fullNomor.includes('/') && fullNomor !== '                ') {
    fullNomor = `${fullNomor} / ${currentYear}`;
  }

  doc.text('Kode No     : 000.1.2.3', 140, 48);
  doc.text(`Nomor       : ${fullNomor}`, 140, 53);

  // JUDUL
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('SURAT PERJALANAN DINAS (SPD)', 105, 63, { align: 'center' });
  const textWidth = doc.getTextWidth('SURAT PERJALANAN DINAS (SPD)');
  doc.line(105 - textWidth/2, 64, 105 + textWidth/2, 64);

  // TABLE
  autoTable(doc, {
    startY: 68,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    head: [],
    body: [
      ['1.', 'Pejabat Pembuat Komitmen', { content: data.ppk.nama, styles: { fontStyle: 'bold' } }],
      ['2.', 'Pegawai yang melaksanakan perjalanan dinas', ''],
      ['', 'a. Nama', { content: data.petugas.nama, styles: { fontStyle: 'bold' } }],
      ['', 'b. NIAT', data.petugas.niat || '-'],
      ['', 'c. Jabatan', data.petugas.jabatan || '-'],
      ['', 'd. Tingkat biaya Perjalanan Dinas', data.petugas.tingkatSPPD],
      ['3.', 'Maksud Perjalanan Dinas', data.uraian],
      ['4.', 'Alat Angkutan yang dipergunakan', 'Kendaraan Dinas'],
      ['5.', 'a. Tempat Berangkat', 'Dinsos PPPA Kab. Blora'],
      ['', 'b. Tempat Tujuan', data.tempat],
      ['6.', 'a. Lama Perjalanan Dinas', data.lamaPerjalanan || '1 (Satu) Hari'],
      ['', 'b. Tanggal Berangkat', data.tanggal],
      ['', 'c. Tanggal harus kembali', data.tanggal],
      ['7.', { content: 'PENGIKUT :', colSpan: 2 }, ''],
    ],
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      valign: 'middle'
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 'auto' }
    }
  });

  const tableStartY = (doc as any).lastAutoTable.finalY;

  // PENGIKUT SUB-TABLE
  autoTable(doc, {
    startY: tableStartY,
    margin: { left: 23, right: 15 },
    theme: 'grid',
    head: [['No', 'Nama', 'NIP', 'Gol', 'Tingkat Biaya\nPerjalanan Dinas', 'Tanda\nTangan', 'Ket']],
    body: [
      ['1', '', '', '-', '', '1', ''],
      ['2', '', '', '-', '', '2', ''],
      ['3', '', '', '-', '', '3', ''],
    ],
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 8,
      halign: 'center',
      lineWidth: 0.1,
      lineColor: [0, 0, 0],
      fontStyle: 'bold'
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0],
      minCellHeight: 10,
      halign: 'center'
    },
    columnStyles: {
      0: { cellWidth: 10 },
      1: { cellWidth: 40 },
      2: { cellWidth: 30 },
      3: { cellWidth: 10 },
      4: { cellWidth: 25 },
      5: { cellWidth: 15 },
      6: { cellWidth: 'auto' }
    }
  });

  const afterPengikutY = (doc as any).lastAutoTable.finalY;

  // Draw vertical line on the left to close the gap at x=15
  doc.setLineWidth(0.1);
  doc.line(15, tableStartY, 15, afterPengikutY);

  // REMAINING TABLE POINTS
  autoTable(doc, {
    startY: afterPengikutY,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    head: [],
    body: [
      ['8.', 'Pembebanan Anggaran\n- Kegiatan', `\n${data.subKegiatan || '-'}`],
      ['9.', 'Keterangan lain-lain', ''],
    ],
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: 1.5,
      lineColor: [0, 0, 0],
      lineWidth: 0.1,
      textColor: [0, 0, 0]
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 70 },
      2: { cellWidth: 'auto' }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // SIGNATURES - Dikeluarkan
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Dikeluarkan di : Blora', 130, finalY);
  doc.text('Pada Tanggal  : ' + data.tanggal, 130, finalY + 5);
  doc.line(130, finalY + 6, 185, finalY + 6);

  // PPK & Pelaksana Labels
  doc.setFont('helvetica', 'bold');
  doc.text('PELAKSANA PERJALANAN DINAS', 30, finalY + 15);
  doc.text('PEJABAT PEMBUAT KOMITMEN', 130, finalY + 15);

  // Names
  doc.text(data.petugas.nama, 30, finalY + 40);
  doc.setFont('helvetica', 'normal');
  doc.text('NIAT : ' + (data.petugas.niat || '-'), 30, finalY + 45);

  doc.setFont('helvetica', 'bold');
  doc.text(data.ppk.nama, 130, finalY + 40);
  doc.setFont('helvetica', 'normal');
  doc.text('NIP : ' + data.ppk.nip, 130, finalY + 45);

  return doc;
};
