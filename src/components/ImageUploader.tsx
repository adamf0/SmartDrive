import React, { useRef, useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';

interface ImageUploaderProps {
  onImageSelected: (fileSrc: string, name: string, fileSizeKB: number) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processUploadedFile = (file: File) => {
    const fileSizeKB = Math.round(file.size / 1024) || 1;
    const fileName = file.name;

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageSelected(e.target.result as string, fileName, fileSizeKB);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUploadedFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 py-2 px-2">
      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer bg-white rounded-3xl p-8 sm:p-10 text-center border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/80'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              processUploadedFile(e.target.files[0]);
            }
          }}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Drop file Anda di sini, atau{' '}
              <span className="text-indigo-600 underline underline-offset-4">Pilih File</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Mendukung Gambar, PDF, Word, Excel, PowerPoint, &amp; CSV
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              Pilih File Komputer
            </button>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span>Ekstraksi konteks &amp; tag otomatis untuk seluruh jenis berkas (Gambar, PDF, Excel, Word, PPT)</span>
      </div>
    </div>
  );
};
