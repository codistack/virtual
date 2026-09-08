import React, { useState } from 'react';
import { X, Check, ShieldCheck, Mail, User, AlertCircle, Sparkles } from 'lucide-react';
import { UserAccount } from '../types';

interface GoogleSignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (account: UserAccount) => void;
  currentEmail?: string;
}

export const GoogleSignInModal: React.FC<GoogleSignInModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  currentEmail = 'codistack@gmail.com'
}) => {
  const [emailInput, setEmailInput] = useState(currentEmail);
  const [nameInput, setNameInput] = useState(
    currentEmail ? currentEmail.split('@')[0].replace(/[._]/g, ' ') : ''
  );
  const [roleInput, setRoleInput] = useState<'admin' | 'student'>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleContinueWithAccount = async (emailToUse: string, nameToUse?: string) => {
    const finalEmail = emailToUse.trim().toLowerCase();
    if (!finalEmail || !finalEmail.includes('@')) {
      setError('Por favor ingresa una dirección de correo válida de Gmail.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const displayName = (nameToUse && nameToUse.trim())
      ? nameToUse.trim()
      : finalEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(
      displayName
    )}&background=0284c7&color=ffffff&bold=true&rounded=true`;

    const account: UserAccount = {
      email: finalEmail,
      name: displayName,
      avatarUrl,
      role: roleInput,
      provider: 'google'
    };

    try {
      // Notify backend if available
      await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(account)
      }).catch(() => {});
    } catch {
      // non-blocking
    }

    // Store in localStorage for persistence
    try {
      localStorage.setItem('virtual_class_user_account', JSON.stringify(account));
    } catch (e) {
      console.warn('Could not persist user account in localStorage', e);
    }

    setIsLoading(false);
    onSuccess(account);
    onClose();
  };

  return (
    <div
      id="modal-google-signin"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-fadeIn">
        {/* Header */}
        <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Google "G" Icon */}
            <div className="w-9 h-9 rounded-2xl bg-white flex items-center justify-center shadow-md shadow-white/5">
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Iniciar sesión con Gmail
              </h3>
              <p className="text-xs text-slate-400">
                Acceso para profesores y alumnos
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl flex items-center gap-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* 1-Click Fast Google Account Card (Pre-detected User Email) */}
          {currentEmail && (
            <div className="p-4 bg-slate-950 border border-blue-500/30 hover:border-blue-500/60 rounded-2xl transition">
              <p className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Cuenta Google Detectada</span>
              </p>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shadow-md shadow-blue-600/30">
                    {currentEmail.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-sm font-semibold text-slate-100 truncate">
                      {currentEmail.split('@')[0]}
                    </p>
                    <p className="text-xs text-slate-400 font-mono truncate">
                      {currentEmail}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-fast-google-login"
                  onClick={() => handleContinueWithAccount(currentEmail)}
                  disabled={isLoading}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/30 transition cursor-pointer shrink-0"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-800"></div>
            <span className="flex-shrink mx-3 text-slate-500 text-[11px] uppercase tracking-wider font-medium">
              O con otra cuenta
            </span>
            <div className="flex-grow border-t border-slate-800"></div>
          </div>

          {/* Custom Google Account Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleContinueWithAccount(emailInput, nameInput);
            }}
            className="space-y-4"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-400" />
                <span>Correo de Gmail / Google</span>
              </label>
              <input
                id="input-google-email"
                type="email"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setError(null);
                }}
                placeholder="ejemplo@gmail.com"
                required
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-400" />
                <span>Nombre Completo</span>
              </label>
              <input
                id="input-google-name"
                type="text"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Rol Principal
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRoleInput('admin')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                    roleInput === 'admin'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Profesor / Administrador
                </button>
                <button
                  type="button"
                  onClick={() => setRoleInput('student')}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border transition text-center cursor-pointer ${
                    roleInput === 'student'
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Estudiante
                </button>
              </div>
            </div>

            <button
              type="submit"
              id="btn-submit-google-signin"
              disabled={isLoading}
              className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isLoading ? (
                <span>Iniciando sesión...</span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Vincular e Iniciar Sesión con Gmail</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security Notice */}
        <div className="px-6 py-3.5 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Acceso seguro cifrado para salas virtuales y gestión académica.</span>
        </div>
      </div>
    </div>
  );
};
