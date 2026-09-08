import React from 'react';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import { UserRole } from '../types';

interface ExitModalProps {
  isOpen: boolean;
  role: UserRole;
  onCancel: () => void;
  onLeaveMeeting: () => void;
  onEndMeetingForAll?: () => void;
}

export const ExitModal: React.FC<ExitModalProps> = ({
  isOpen,
  role,
  onCancel,
  onLeaveMeeting,
  onEndMeetingForAll
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="modal-exit-meeting"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-red-400">
            <AlertTriangle className="w-5 h-5" />
            <h2 className="text-base font-semibold text-slate-100">
              {role === 'admin' ? 'Finalizar o salir' : 'Salir de la reunión'}
            </h2>
          </div>
          <button
            id="btn-close-exit-modal"
            onClick={onCancel}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-sm text-slate-300">
          {role === 'admin' ? (
            <p>
              Como <strong className="text-slate-100 font-semibold">Administrador / Profesor</strong>, puedes finalizar la clase para todos los alumnos o simplemente salir tú.
            </p>
          ) : (
            <p>
              ¿Estás seguro de que deseas salir de la clase virtual? Podrás volver a entrar con el enlace de invitación.
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/50 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            id="btn-cancel-exit"
            onClick={onCancel}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs sm:text-sm font-medium transition cursor-pointer order-3 sm:order-1"
          >
            Cancelar
          </button>

          <button
            id="btn-confirm-leave-only"
            onClick={onLeaveMeeting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-medium transition cursor-pointer order-2"
          >
            {role === 'admin' ? 'Salir yo de la clase' : 'Salir de la clase'}
          </button>

          {role === 'admin' && onEndMeetingForAll && (
            <button
              id="btn-confirm-end-for-all"
              onClick={onEndMeetingForAll}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs sm:text-sm font-semibold shadow-lg shadow-red-600/30 transition cursor-pointer order-1 sm:order-3"
            >
              <LogOut className="w-4 h-4" />
              <span>Finalizar para todos</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
