import React from 'react';
import { Download, X, Film, CheckCircle, Clock, HardDrive } from 'lucide-react';
import { RecordedFile, downloadRecordedFile, formatDuration } from '../utils/recorder';

interface RecordingModalProps {
  isOpen: boolean;
  recordedFile: RecordedFile | null;
  onClose: () => void;
}

export const RecordingModal: React.FC<RecordingModalProps> = ({
  isOpen,
  recordedFile,
  onClose
}) => {
  if (!isOpen || !recordedFile) return null;

  const sizeMb = (recordedFile.sizeBytes / (1024 * 1024)).toFixed(2);

  const handleDownload = () => {
    downloadRecordedFile(recordedFile);
  };

  return (
    <div
      id="modal-recording-review"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <h2 className="text-base font-semibold text-slate-100">Grabación lista para descargar</h2>
          </div>
          <button
            id="btn-close-recording-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Preview */}
        <div className="p-6 space-y-4">
          <div className="w-full aspect-video bg-black rounded-xl overflow-hidden border border-slate-800 shadow-inner flex items-center justify-center">
            <video
              src={recordedFile.url}
              controls
              playsInline
              className="w-full h-full object-contain"
            />
          </div>

          {/* Details metadata */}
          <div className="grid grid-cols-3 gap-2 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 text-xs">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-400">Duración</p>
                <p className="font-semibold text-slate-200">{formatDuration(recordedFile.durationSeconds)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HardDrive className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-400">Tamaño</p>
                <p className="font-semibold text-slate-200">{sizeMb} MB</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-slate-400" />
              <div>
                <p className="text-slate-400">Formato</p>
                <p className="font-semibold text-slate-200 uppercase">{recordedFile.filename.split('.').pop()}</p>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            La grabación incluye el audio, video y pantalla compartida de la sesión. Puedes descargarla directamente a tu dispositivo.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex items-center justify-end gap-3">
          <button
            id="btn-dismiss-recording"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs sm:text-sm font-medium transition cursor-pointer"
          >
            Cerrar
          </button>
          <button
            id="btn-download-recording"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-blue-600/30 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Descargar archivo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
