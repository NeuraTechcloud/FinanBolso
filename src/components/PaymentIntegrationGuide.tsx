import React, { useState } from 'react';
import { 
  CreditCard, 
  CheckCircle2, 
  Copy, 
  Terminal, 
  Server, 
  Globe, 
  ShieldCheck, 
  Zap, 
  ExternalLink,
  Code,
  Key
} from 'lucide-react';

export const PaymentIntegrationGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const envSnippet = `MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxx-xxxxxx-xxxxxx
PORT=3000
NODE_ENV=production`;

  const webhookUrlSnippet = `https://seu-dominio.com/api/webhooks/mercadopago`;

  return (
    <div className="space-y-4 text-xs animate-in fade-in">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-sm">Guia Técnico de Integração Pix & Mercado Pago</h3>
            <p className="text-[11px] text-emerald-400">Processamento real de Vendas & Ativação Automática do Plano Pro</p>
          </div>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          O FinanBolso vem equipado com backend Node/Express (`server.ts`) nativo e rotas REST completas para gerar cobranças Pix instantâneas e ativar assinaturas via Webhook.
        </p>
      </div>

      {/* Steps */}
      <div className="space-y-3">
        {/* Step 1 */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
              <span>Obter Credenciais no Mercado Pago</span>
            </div>
            <a
              href="https://www.mercadopago.com.br/developers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
            >
              Portal Developers <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Acesse o painel do Mercado Pago Developers, crie uma aplicação e copie seu <strong>Access Token de Produção</strong> (inicia com <code className="text-emerald-300">APP_USR-</code>).
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
              <span>Configurar Arquivo .env no Servidor</span>
            </div>
            <button
              onClick={() => copyToClipboard(envSnippet, 'env')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedKey === 'env' ? 'Copiado!' : 'Copiar .env'}</span>
            </button>
          </div>
          <div className="p-3 bg-slate-900 font-mono text-[10px] text-emerald-300 rounded-xl border border-slate-800 whitespace-pre">
            {envSnippet}
          </div>
        </div>

        {/* Step 3 */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">3</span>
              <span>Cadastrar Webhook para Ativação Instantânea</span>
            </div>
            <button
              onClick={() => copyToClipboard(webhookUrlSnippet, 'webhook')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              <span>{copiedKey === 'webhook' ? 'Copiado!' : 'Copiar URL'}</span>
            </button>
          </div>
          <p className="text-slate-400 leading-relaxed">
            No painel do Mercado Pago, em <strong>Webhooks</strong>, cadastre a URL do seu servidor e selecione o evento <code className="text-emerald-300">payment</code>:
          </p>
          <div className="p-2.5 bg-slate-900 font-mono text-[10px] text-emerald-300 rounded-xl border border-slate-800 break-all">
            {webhookUrlSnippet}
          </div>
        </div>

        {/* Step 4: Endpoint Reference */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
          <p className="font-bold text-white flex items-center gap-1.5">
            <Server className="w-4 h-4 text-blue-400" />
            Rotas Backend Já Implementadas no Projeto (`/server.ts`):
          </p>
          <ul className="space-y-1.5 text-[11px] text-slate-300">
            <li className="p-2 bg-slate-900 rounded-xl border border-slate-800">
              <strong className="text-emerald-400 font-mono">POST /api/checkout/create-preference</strong> - Gera cobrança Pix com QR Code & Copia e Cola.
            </li>
            <li className="p-2 bg-slate-900 rounded-xl border border-slate-800">
              <strong className="text-blue-400 font-mono">GET /api/checkout/status/:paymentId</strong> - Consulta status em tempo real.
            </li>
            <li className="p-2 bg-slate-900 rounded-xl border border-slate-800">
              <strong className="text-amber-400 font-mono">POST /api/webhooks/mercadopago</strong> - Recebe notificação oficial do banco e ativa o plano Pro.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
