import React, { useRef, useState } from 'react';
import {
  Upload,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  Presentation,
  X,
  Plus,
  Loader2,
} from 'lucide-react';

export interface UploadItem {
  id: string;
  file: File;
  name: string;
  sizeKB: number;
  src: string;
  status: 'pending' | 'reading' | 'ready' | 'uploading' | 'done';
}

interface ImageUploaderProps {
  onImageSelected?: (fileSrc: string, name: string, fileSizeKB: number) => void;
  onFilesSelected?: (files: { src: string; name: string; fileSizeKB: number }[]) => void;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  onFilesSelected,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileQueue, setFileQueue] = useState<UploadItem[]>([]);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to read file to DataURL
  const readFileAsDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve((e.target?.result as string) || '');
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const processUploadedFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setIsProcessingFiles(true);
    const newItems: UploadItem[] = [];

    for (const file of fileArray) {
      const sizeKB = Math.round(file.size / 1024) || 1;
      const itemId = `up-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      try {
        const src = await readFileAsDataUrl(file);
        newItems.push({
          id: itemId,
          file,
          name: file.name,
          sizeKB,
          src,
          status: 'ready',
        });
      } catch (e) {
        console.warn('Failed to read file:', file.name, e);
      }
    }

    setFileQueue((prev) => [...prev, ...newItems]);
    setIsProcessingFiles(false);
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
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processUploadedFiles(e.dataTransfer.files);
    }
  };

  const handleRemoveItem = (id: string) => {
    setFileQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = () => {
    setFileQueue([]);
  };

  const handleStartUpload = () => {
    if (fileQueue.length === 0) return;

    const formattedList = fileQueue.map((item) => ({
      src: item.src,
      name: item.name,
      fileSizeKB: item.sizeKB,
    }));

    if (onFilesSelected) {
      onFilesSelected(formattedList);
    } else if (onImageSelected && formattedList.length > 0) {
      // Fallback for single file callback
      onImageSelected(formattedList[0].src, formattedList[0].name, formattedList[0].fileSizeKB);
    }
  };

  const getFileBadgeStyle = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (ext === 'pdf') {
      return { bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: <FileText className="w-5 h-5 text-rose-600" />, label: 'PDF' };
    }
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: <FileSpreadsheet className="w-5 h-5 text-emerald-600" />, label: 'EXCEL' };
    }
    if (ext === 'docx' || ext === 'doc') {
      return { bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: <FileText className="w-5 h-5 text-blue-600" />, label: 'DOCX' };
    }
    if (ext === 'pptx' || ext === 'ppt') {
      return { bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: <Presentation className="w-5 h-5 text-amber-600" />, label: 'PPTX' };
    }
    return { bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: <ImageIcon className="w-5 h-5 text-indigo-600" />, label: 'IMG' };
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 py-2 px-2">
      {/* Hidden Multi-file Input */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            processUploadedFiles(e.target.files);
          }
        }}
      />

      {/* Main Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer bg-white rounded-3xl p-6 sm:p-8 text-center border-2 border-dashed transition-all duration-300 ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]'
            : 'border-slate-300 hover:border-indigo-500 hover:bg-slate-50/80'
        }`}
      >
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 mx-auto rounded-3xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 group-hover:text-indigo-600 transition-colors">
              Drop berkas Anda di sini (Bisa Multiple File), atau{' '}
              <span className="text-indigo-600 underline underline-offset-4">Pilih Berkas</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Anda dapat memilih beberapa file sekaligus (Gambar, PDF, Word, Excel, PowerPoint, &amp; CSV)
            </p>
          </div>

          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Pilih Berkas Komputer (Multiple)
            </button>
          </div>
        </div>
      </div>

      {/* Loading Indicator when reading files */}
      {isProcessingFiles && (
        <div className="p-3 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center gap-2 text-indigo-700 text-xs font-bold animate-pulse">
          <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
          <span>Membaca &amp; menyiapkan berkas...</span>
        </div>
      )}

      {/* Selected File Queue List */}
      {fileQueue.length > 0 && (
        <div className="space-y-3 bg-slate-50/80 p-4 rounded-3xl border border-slate-200">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-ping" />
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                Daftar Berkas Siap Diunggah ({fileQueue.length} File)
              </h4>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-semibold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
            >
              Hapus Semua
            </button>
          </div>

          {/* Items Grid/List */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
            {fileQueue.map((item) => {
              const badge = getFileBadgeStyle(item.name);
              const isImage = item.src.startsWith('data:image/');

              return (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Thumbnail / Icon */}
                    {isImage ? (
                      <img
                        src={item.src}
                        alt={item.name}
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${badge.bg}`}>
                        {badge.icon}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 truncate" title={item.name}>
                        {item.name}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {item.sizeKB} KB
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer shrink-0 ml-2"
                    title="Batal Unggah"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Action Upload All Button */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={handleStartUpload}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Unggah {fileQueue.length} Berkas Sekarang</span>
            </button>
          </div>
        </div>
      )}

      {/* Footer Info */}
      <div className="flex items-center justify-center gap-2 text-xs text-slate-500 font-medium">
        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        <span>Ekstraksi konteks &amp; tag otomatis untuk seluruh jenis berkas (Gambar, PDF, Excel, Word, PPT)</span>
      </div>
    </div>
  );
};
