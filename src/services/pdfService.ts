import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SppdData {
  nomorSppd?: string;
  petugas: {
    nama: string;
    nip?: string;
    pangkat?: string;
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
    nip?: string;
    pangkat?: string;
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
      doc.addImage(data.logoUrl, 'PNG', 15, 12, 22, 22, undefined, 'FAST');
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
  doc.text('    Pangkat/Gol', 40, currentY);
  doc.text(`: ${data.petugas.pangkat || '-'}`, 75, currentY);
  currentY += 5;
  doc.text('    NIP', 40, currentY);
  doc.text(`: ${data.petugas.nip || '-'}`, 75, currentY);
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

export const generateSppdDepan = (data: SppdData) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4'
  });

  // LOGO
  if (data.logoUrl) {
    try {
      doc.addImage(data.logoUrl, 'PNG', 15, 12, 22, 22, undefined, 'FAST');
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
      ['', 'b. NIP', data.petugas.nip || '-'],
      ['', 'c. Pangkat/ Golongan', data.petugas.pangkat || '-'],
      ['', 'd. Jabatan', data.petugas.jabatan || '-'],
      ['', 'e. Tingkat biaya Perjalanan Dinas', data.petugas.tingkatSPPD],
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
  doc.text('NIP : ' + (data.petugas.nip || '-'), 30, finalY + 45);

  doc.setFont('helvetica', 'bold');
  doc.text(data.ppk.nama, 130, finalY + 40);
  doc.setFont('helvetica', 'normal');
  doc.text('NIP : ' + data.ppk.nip, 130, finalY + 45);

  return doc;
};
