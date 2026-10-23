import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, PlusSquare, X, CheckCircle2 } from 'lucide-react';

interface Props {
  variant?: 'banner' | 'button' | 'settings';
}

export const PWAInstallButton: React.FC<Props> = ({ variant = 'button' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (isInstalled) {
    if (variant === 'settings') {
      return (
        <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-xl">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>App instalado no celular como aplicativo nativo</span>
        </div>
      );
    }
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) setInstallSuccess(true);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // Fallback guide if browser does not fire prompt automatically
      setShowIOSGuide(true);
    }
  };

  return (
    <>
      {variant === 'banner' && (
        <div className="bg-gradient-to-r from-emerald-900/60 to-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-100">Instalar no Celular</p>
              <p className="text-[11px] text-slate-400">Acesse offline direto da sua tela inicial</p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="px-3.5 py-1.5 text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl shadow-md transition active:scale-95 shrink-0"
          >
            Instalar
          </button>
        </div>
      )}

      {variant === 'button' && (
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition active:scale-95"
          title="Instalar aplicativo no celular"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Instalar App</span>
        </button>
      )}

      {variant === 'settings' && (
        <button
          onClick={handleInstallClick}
          className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-900 border border-emerald-500/30 hover:bg-slate-800/80 transition text-left group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200 group-hover:text-white">Instalar App no Celular</p>
              <p className="text-xs text-slate-400">Adicionar à tela de início para acesso rápido e offline</p>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
            Instalar
          </span>
        </button>
      )}

      {/* iOS or Manual Installation Guide Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl relative">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-white">Instalar FinanBolso</h3>
                <p className="text-xs text-slate-400">Acesse como um app nativo</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <span className="font-medium text-white flex items-center gap-1.5">
                    No Safari ou Chrome:
                  </span>
                  Toque no botão <strong className="text-white inline-flex items-center gap-0.5"><Share className="w-3.5 h-3.5 inline text-blue-400 mx-0.5" /> Compartilhar</strong> ou no menu de 3 pontinhos.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div className="flex-1">
                  Role a lista para baixo e selecione <strong className="text-white inline-flex items-center gap-0.5"><PlusSquare className="w-3.5 h-3.5 inline text-emerald-400 mx-0.5" /> Adicionar à Tela de Início</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div className="flex-1">
                  Confirme em <strong className="text-white">Adicionar</strong>. O ícone aparecerá no seu celular e abrirá em tela cheia mesmo sem internet!
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs transition"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
