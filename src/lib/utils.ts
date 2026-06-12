import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

/**
 * Compresses an image file using HTML5 Canvas and returns a Base64 data URL.
 * Designed to work reliably on all browser and mobile devices.
 */
export function compressImage(file: File, maxSizePx = 1000, quality = 0.6): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Berkas yang diunggah bukan gambar yang valid.'));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale maintaining aspect ratio
        if (width > height) {
          if (width > maxSizePx) {
            height = Math.round((height * maxSizePx) / width);
            width = maxSizePx;
          }
        } else {
          if (height > maxSizePx) {
            width = Math.round((width * maxSizePx) / height);
            height = maxSizePx;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Gagal memproses grafis kompresi gambar.'));
          return;
        }

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to highly-compressed JPEG base64 (quality ranges from 0 to 1)
        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedBase64);
      };
      
      img.onerror = () => {
        reject(new Error('Gagal memproses konten gambar.'));
      };
    };
    
    reader.onerror = () => {
      reject(new Error('Gagal membaca berkas gambar.'));
    };
  });
}
