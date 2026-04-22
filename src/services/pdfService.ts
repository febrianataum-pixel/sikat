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
  doc.setFont('times', 'bold');
  doc.setFontSize(12);
  doc.text('PEMERINTAH KABUPATEN BLORA', 105, 15, { align: 'center' });
  doc.setFontSize(14);
  doc.text('DINAS SOSIAL PEMBERDAYAAN PEREMPUAN', 105, 21, { align: 'center' });
  doc.text('DAN PERLINDUNGAN ANAK', 105, 27, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
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
  doc.setFont('times', 'bold');
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
      font: 'times',
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
      font: 'times',
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
      font: 'times',
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
  doc.setFont('times', 'normal');
  doc.setFontSize(10);
  doc.text('Dikeluarkan di : Blora', 130, finalY);
  doc.text('Pada Tanggal  : ' + data.tanggal, 130, finalY + 5);
  doc.line(130, finalY + 6, 185, finalY + 6);

  // PPK & Pelaksana Labels
  doc.setFont('times', 'bold');
  doc.text('PELAKSANA PERJALANAN DINAS', 30, finalY + 15);
  doc.text('PEJABAT PEMBUAT KOMITMEN', 130, finalY + 15);

  // Names
  doc.text(data.petugas.nama, 30, finalY + 40);
  doc.setFont('times', 'normal');
  doc.text('NIP : ' + (data.petugas.nip || '-'), 30, finalY + 45);

  doc.setFont('times', 'bold');
  doc.text(data.ppk.nama, 130, finalY + 40);
  doc.setFont('times', 'normal');
  doc.text('NIP : ' + data.ppk.nip, 130, finalY + 45);

  return doc;
};
