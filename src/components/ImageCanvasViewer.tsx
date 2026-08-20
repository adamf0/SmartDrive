import React, { useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  FileText,
  Table,
  Presentation,
  FileSpreadsheet,
  Download,
  FileCheck,
} from 'lucide-react';
import type { AnalysisResult } from '../types/vision';
import { isDocumentFileType } from '../utils/documentContextEngine';

interface ImageCanvasViewerProps {
  analysis: AnalysisResult;
}

export const ImageCanvasViewer: React.FC<ImageCanvasViewerProps> = ({ analysis }) => {
  const [zoom, setZoom] = useState(1);
  const [activeHoverId, setActiveHoverId] = useState<string | null>(null);

  const isDoc = isDocumentFileType(analysis.imageName);
  const ext = analysis.imageName.split('.').pop()?.toLowerCase() || 'doc';

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 2.5));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleNativeDownload = async () => {
    const fileUrl = analysis.imageSrc;
    if (!fileUrl) return;

    try {
      if (fileUrl.startsWith('data:')) {
        const parts = fileUrl.split(',');
        const mime = parts[0].split(':')[1].split(';')[0];
        const byteCharacters = atob(parts[1]);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mime });
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobUrl;
        link.download = analysis.imageName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      } else {
        const response = await fetch(fileUrl);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.style.display = 'none';
        link.href = blobUrl;
        link.download = analysis.imageName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1500);
      }
    } catch (err) {
      console.warn('Native download error, fallback:', err);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = fileUrl;
      link.download = analysis.imageName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const getDocIcon = () => {
    if (ext === 'xlsx' || ext === 'xls' || ext === 'csv' || ext === 'ods') {
      return <FileSpreadsheet className="w-16 h-16 text-emerald-500" />;
    }
    if (ext === 'docx' || ext === 'doc' || ext === 'odt' || ext === 'rtf') {
      return <FileText className="w-16 h-16 text-blue-500" />;
    }
    if (ext === 'pptx' || ext === 'ppt') {
      return <Presentation className="w-16 h-16 text-amber-500" />;
    }
    if (ext === 'pdf') {
      return <FileText className="w-16 h-16 text-red-500" />;
    }
    return <Table className="w-16 h-16 text-indigo-500" />;
  };

  return (
    <div className="bg-white rounded-3xl p-4 sm:p-5 space-y-4 flex flex-col h-full border border-slate-100 shadow-[0px_4px_20px_rgba(0,0,0,0.03)]">
      {/* Top Toolbar */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
          {isDoc ? 'Pratinjau Berkas Dokumen' : 'Pratinjau Canvas Gambar'}
        </span>

        {!isDoc && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="px-2 font-mono font-bold text-indigo-600">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors ml-1 border-l border-slate-200 cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Main Canvas Display */}
      {isDoc ? (
        /* Document Card Representation (No OCR) */
        <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] rounded-2xl bg-gradient-to-b from-slate-50 to-indigo-50/40 border border-slate-200/80 overflow-hidden flex flex-col items-center justify-center p-6 text-center space-y-4">
          <div className="w-28 h-28 rounded-3xl bg-white shadow-xl shadow-slate-200/60 border border-slate-200 flex items-center justify-center relative group">
            {getDocIcon()}
            <span className="absolute -bottom-2 px-3 py-0.5 rounded-full bg-slate-900 text-white font-mono font-bold text-[10px] uppercase tracking-wider">
              {ext}
            </span>
          </div>

          <div className="space-y-1.5 max-w-sm">
            <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              {analysis.imageName}
            </h4>
            <p className="text-xs text-slate-500 font-medium">
              {analysis.sceneContext?.sceneType || 'Dokumen Digital Terstruktur'}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 shadow-2xs">
              <FileCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Ekstraksi Konteks Dokumen</span>
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-indigo-50 border border-indigo-200 text-xs font-bold text-indigo-700">
              <span>{analysis.fileSizeKB} KB</span>
            </span>
          </div>

          {analysis.imageSrc && (
            <button
              type="button"
              onClick={handleNativeDownload}
              className="mt-3 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Buka / Unduh Berkas Asli</span>
            </button>
          )}
        </div>
      ) : (
        /* Image Canvas Representation */
        <div className="relative flex-1 min-h-[380px] sm:min-h-[460px] max-h-[600px] rounded-2xl bg-slate-950/90 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
          <div
            className="relative transition-transform duration-200 ease-out max-w-full max-h-full"
            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
          >
            {/* Base Image */}
            <img
              src={analysis.imageSrc}
              alt={analysis.imageName}
              className="max-w-full max-h-[500px] object-contain rounded-lg shadow-2xl block mx-auto"
            />

            {/* Bounding Box Layer for OCR Text */}
            {analysis.ocr.blocks.map((block) => (
              <div
                key={block.id}
                onMouseEnter={() => setActiveHoverId(block.id)}
                onMouseLeave={() => setActiveHoverId(null)}
                className={`absolute border-2 rounded transition-all duration-150 cursor-pointer pointer-events-auto ${
                  activeHoverId === block.id
                    ? 'border-emerald-400 bg-emerald-400/30 z-20 scale-105 shadow-lg shadow-emerald-500/30'
                    : 'border-emerald-500/60 bg-emerald-500/10 hover:border-emerald-400'
                }`}
                style={{
                  left: `${(block.bbox.x / (analysis.dimensions.width || 800)) * 100}%`,
                  top: `${(block.bbox.y / (analysis.dimensions.height || 600)) * 100}%`,
                  width: `${(block.bbox.width / (analysis.dimensions.width || 800)) * 100}%`,
                  height: `${(block.bbox.height / (analysis.dimensions.height || 600)) * 100}%`,
                }}
              >
                {activeHoverId === block.id && (
                  <div className="absolute -top-7 left-0 whitespace-nowrap bg-emerald-950 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-500 shadow-md">
                    📝 {block.text} ({block.confidence}%)
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Specs Footer */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 pt-1 gap-2 border-t border-slate-100">
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-semibold text-slate-900 truncate max-w-[180px]">
            {analysis.imageName}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono text-indigo-600 font-bold">
            {ext.toUpperCase()}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 font-mono">
            {analysis.fileSizeKB} KB
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Eye className="w-3.5 h-3.5 text-indigo-500" />
          <span>Analisis {analysis.analyzedAt}</span>
        </div>
      </div>
    </div>
  );
};
