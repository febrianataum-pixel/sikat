import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SppdData {
  nomorSppd?: string;
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
  
  const currentYear = new Date().getFullYear();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Nomor : 000.1.2.3 / ${data.nomorSpt || '                '} / ${currentYear}`, 105, 56, { align: 'center' });

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
  doc.text('Ditetapkan di', 115, currentY);
  doc.text(': Blora', 145, currentY);
  currentY += 5;
  doc.text('Pada Tanggal', 115, currentY);
  doc.text(`: ${formatDateWithDay(data.tanggal).split(',')[1].trim()}`, 145, currentY);
  doc.line(115, currentY + 1, 185, currentY + 1);

  currentY += 10;
  doc.setFont('helvetica', 'bold');
  const kadisLines = [
    'KEPALA DINAS SOSIAL PEMBERDAYAAN',
    'PEREMPUAN DAN PERLINDUNGAN ANAK',
    'KABUPATEN BLORA'
  ];
  kadisLines.forEach((line, i) => {
    doc.text(line, 150, currentY + (i * 5), { align: 'center' });
  });

  currentY += 35;
  doc.text(data.kadis.nama, 150, currentY, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(data.kadis.pangkat, 150, currentY + 5, { align: 'center' });
  doc.text(`NIP : ${data.kadis.nip}`, 150, currentY + 10, { align: 'center' });

  return doc;
};

export const terbilang = (n: number): string => {
  if (n < 0) return "Minus " + terbilang(-n);
  if (n === 0) return "Nol Rupiah";
  
  const units = ["", "Satu", "Dua", "Tiga", "Empat", "Lima", "Enam", "Tujuh", "Delapan", "Sembilan", "Sepuluh", "Sebelas"];
  let res = "";
  
  if (n < 12) res = units[n];
  else if (n < 20) res = terbilang(n - 10) + " Belas";
  else if (n < 100) res = terbilang(Math.floor(n / 10)) + " Puluh " + terbilang(n % 10);
  else if (n < 200) res = "Seratus " + terbilang(n - 100);
  else if (n < 1000) res = terbilang(Math.floor(n / 100)) + " Ratus " + terbilang(n % 100);
  else if (n < 2000) res = "Seribu " + terbilang(n - 1000);
  else if (n < 1000000) res = terbilang(Math.floor(n / 1000)) + " Ribu " + terbilang(n % 1000);
  else if (n < 1000000000) res = terbilang(Math.floor(n / 1000000)) + " Juta " + terbilang(n % 1000000);
  else res = terbilang(Math.floor(n / 1000000000)) + " Miliar " + terbilang(n % 1000000000);
  
  res = res.replace(/\s+/g, " ").trim();
  if (res.endsWith("Rupiah")) return res;
  return res + " Rupiah";
};

export const generateRincianBiaya = (data: {
  nomorSppd?: string;
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

  const total = data.rincian.reduce((acc, curr) => acc + (curr.nominal * curr.hari), 0);
  const terbilangText = terbilang(total);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('RINCIAN BIAYA PERJALANAN DINAS', 105, 20, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text('Lampiran SPD Nomor', 15, 35);
  doc.text(':', 55, 35);
  doc.text(data.nomorSppd || '...........................................', 60, 35);

  doc.text('Tanggal', 15, 41);
  doc.text(':', 55, 41);
  const dateArr = data.tanggalSpt.split('-');
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  const formattedDate = dateArr.length === 3 ? `${dateArr[2]} ${months[parseInt(dateArr[1]) - 1]} ${dateArr[0]}` : data.tanggalSpt;
  doc.text(formattedDate, 60, 41);

  const tableData = data.rincian.map((item, i) => [
    i + 1,
    data.petugas.nama,
    `Rp ${item.nominal.toLocaleString('id-ID')}`,
    item.hari,
    `Rp ${(item.nominal * item.hari).toLocaleString('id-ID')}`,
    data.petugas.tingkatSPPD,
    `${i + 1}.`
  ]);

  autoTable(doc, {
    startY: 50,
    head: [['NO', 'PERINCIAN BIAYA', 'NOMINAL', 'HARI', 'JUMLAH DITERIMA', 'KET', 'TTD']],
    body: [
      ...tableData,
      [{ content: 'JUMLAH', colSpan: 4, styles: { halign: 'center', fontStyle: 'bold' } }, { content: `Rp ${total.toLocaleString('id-ID')}`, styles: { fontStyle: 'bold' } }, '', '']
    ],
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], lineWidth: 0.1, lineColor: [0, 0, 0], halign: 'center' },
    styles: { fontSize: 10, cellPadding: 3, lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0] },
    columnStyles: {
      0: { halign: 'center', cellWidth: 10 },
      1: { cellWidth: 50 },
      2: { halign: 'right' },
      3: { halign: 'center', cellWidth: 15 },
      4: { halign: 'right', cellWidth: 35 },
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
  doc.text(`Rp ${total.toLocaleString('id-ID')}`, 105, currentY);
  currentY += 6;
  doc.text('yang telah dibayar semula', 15, currentY);
  doc.text(`Rp ${total.toLocaleString('id-ID')}`, 105, currentY);
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
  doc.text('Kode No     : 000.1.2.3', 140, 48);
  doc.text('Nomor       : ' + (data.nomorSppd || '...........................................'), 140, 53);

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
      ['1.', 'Pejabat Pembuat Komitmen', data.ppk.nama],
      ['2.', 'Pegawai yang melaksanakan perjalanan dinas', ''],
      ['', 'a. Nama', data.petugas.nama],
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
    startY: tableStartY - 0.1, // Slight overlap for continuous border
    margin: { left: 23, right: 15 },
    theme: 'grid',
    head: [['No', 'Nama', 'NIP', 'Gol', 'Tingkat Biaya\nPerjalanan Dinas', 'Tanda\nTangan', 'Ket']],
    body: [
      ['1', '', '', '0', '', '1', ''],
      ['2', '', '', '0', '', '2', ''],
      ['3', '', '', '0', '', '3', ''],
    ],
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [0, 0, 0],
      fontSize: 8,
      halign: 'center',
      lineWidth: 0.1,
      lineColor: [0, 0, 0]
    },
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 1,
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

  // REMAINING TABLE POINTS
  autoTable(doc, {
    startY: afterPengikutY - 0.1,
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
