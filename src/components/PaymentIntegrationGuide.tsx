import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Copy, 
  Server, 
  Zap, 
  ExternalLink,
  Code,
  Play,
  Check,
  AlertCircle
} from 'lucide-react';
import { PaymentService } from '../services/paymentService';

export const PaymentIntegrationGuide: React.FC = () => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [mpStatus, setMpStatus] = useState<{ configured: boolean; mode: string; maskedToken: string | null } | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [createdPlanResult, setCreatedPlanResult] = useState<any>(null);

  useEffect(() => {
    PaymentService.getMercadoPagoStatus().then(setMpStatus);
  }, []);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleTestCreatePlan = async () => {
    setIsCreatingPlan(true);
    setCreatedPlanResult(null);
    const result = await PaymentService.createSubscriptionPlan({
      reason: "Plano FinanBolso Pro Recorrente",
      transaction_amount: 9.90,
      currency_id: "BRL",
      frequency: 1,
      frequency_type: "months",
      billing_day: 10,
      billing_day_proportional: true,
      free_trial: {
        frequency: 1,
        frequency_type: "months"
      }
    });
    setIsCreatingPlan(false);
    setCreatedPlanResult(result);
  };

  const envSnippet = `MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxxx-xxxxxx-xxxxxx
PORT=3000
NODE_ENV=production`;

  const curlSnippet = `curl -X POST \\
  'https://api.mercadopago.com/preapproval_plan' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'Content-Type: application/json' \\
  -d '{
  "reason": "Plano FinanBolso Pro Recorrente",
  "auto_recurring": {
    "frequency": 1,
    "frequency_type": "months",
    "repetitions": 12,
    "billing_day": 10,
    "billing_day_proportional": true,
    "free_trial": {
      "frequency": 1,
      "frequency_type": "months"
    },
    "transaction_amount": 9.90,
    "currency_id": "BRL"
  },
  "back_url": "https://finanbolso.app"
}'`;

  const webhookUrlSnippet = `https://seu-dominio.com/api/webhooks/mercadopago`;

  return (
    <div className="space-y-4 text-xs animate-in fade-in">
      {/* Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-white text-sm">Integração Mercado Pago & Assinaturas Recorrentes</h3>
              <p className="text-[11px] text-emerald-400">Suporte a Pix, Cartão de Crédito e Planos /preapproval_plan</p>
            </div>
          </div>

          {mpStatus && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1 border ${
              mpStatus.configured
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
            }`}>
              {mpStatus.configured ? <Check className="w-3 h-3 text-emerald-400" /> : <AlertCircle className="w-3 h-3 text-amber-400" />}
              <span>{mpStatus.configured ? `Token MP Ativo (${mpStatus.mode})` : 'Modo Demo / Sem Token'}</span>
            </span>
          )}
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          O FinanBolso possui rotas backend Node/Express em <code className="text-emerald-300 font-mono">/server.ts</code> configuradas para comunicação com as APIs oficiais do Mercado Pago (<code className="text-emerald-300 font-mono">/v1/payments</code> e <code className="text-emerald-300 font-mono">/preapproval_plan</code>).
        </p>
      </div>

      {/* Interactive Plan Tester Card */}
      <div className="p-4 bg-slate-950 rounded-2xl border border-emerald-500/30 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Testar Criação de Plano de Assinatura (/preapproval_plan)</span>
          </div>
          <button
            onClick={handleTestCreatePlan}
            disabled={isCreatingPlan}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition flex items-center gap-1.5 active:scale-95 shadow"
          >
            {isCreatingPlan ? (
              <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 fill-current" />
            )}
            <span>Gerar Plano Agora</span>
          </button>
        </div>

        {createdPlanResult && (
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
              <span>Status: {createdPlanResult.success ? '✓ Sucesso' : '❌ Falha'}</span>
              <span className="text-[10px] text-slate-400">Modo: {createdPlanResult.mode || 'standard'}</span>
            </div>
            <pre className="p-2 bg-slate-950 font-mono text-[10px] text-slate-300 rounded-lg overflow-x-auto max-h-40 border border-slate-800">
              {JSON.stringify(createdPlanResult, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* cURL Request Reference Card */}
      <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-white">
            <Code className="w-4 h-4 text-blue-400" />
            <span>Exemplo de Requisição cURL (/preapproval_plan)</span>
          </div>
          <button
            onClick={() => copyToClipboard(curlSnippet, 'curl')}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition flex items-center gap-1"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedKey === 'curl' ? 'Copiado!' : 'Copiar cURL'}</span>
          </button>
        </div>
        <div className="p-3 bg-slate-900 font-mono text-[10px] text-emerald-300 rounded-xl border border-slate-800 overflow-x-auto whitespace-pre">
          {curlSnippet}
        </div>
      </div>

      {/* Configuration Steps */}
      <div className="space-y-3">
        {/* Step 1 */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">1</span>
              <span>Obter Access Token no Mercado Pago</span>
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
            Acesse o painel Mercado Pago Developers, crie uma aplicação e copie seu <strong>Access Token de Produção ou Teste</strong> (inicia com <code className="text-emerald-300">APP_USR-</code>).
          </p>
        </div>

        {/* Step 2 */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-white">
              <span className="w-5 h-5 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center text-[10px] font-black">2</span>
              <span>Adicionar no Arquivo .env</span>
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
              <span>Cadastrar Webhook de Assinaturas</span>
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
            No painel do Mercado Pago, em <strong>Webhooks</strong>, cadastre a URL do servidor selecionando os eventos <code className="text-emerald-300">payment</code> e <code className="text-emerald-300">subscription_preapproval</code>:
          </p>
          <div className="p-2.5 bg-slate-900 font-mono text-[10px] text-emerald-300 rounded-xl border border-slate-800 break-all">
            {webhookUrlSnippet}
          </div>
        </div>

        {/* Endpoint Reference */}
        <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
          <p className="font-bold text-white flex items-center gap-1.5">
            <Server className="w-4 h-4 text-blue-400" />
            Rotas Backend Implementadas (`server.ts`):
          </p>
          <ul className="space-y-1.5 text-[11px] text-slate-300">
            <li className="p-2 bg-slate-900 rounded-xl border border-slate-800 font-mono">
              <strong className="text-emerald-400">POST /api/mercadopago/create-subscription-plan</strong> - Cria planos de assinatura recorrentes (/preapproval_plan).
            </li>
            <li className="p-2 bg-slate-900 rounded-xl border border-slate-800 font-mono">
              <strong className="text-emerald-400">POST /api/mercadopago/create-subscription</strong> - Assina usuário em plano (/preapproval).
            </li>
            <li className="p-2 bg-slate-900 rounded-xl border border-slate-800 font-mono">
              <strong className="text-emerald-400">POST /api/checkout/create-preference</strong> - Gera cobrança Pix com QR Code & Copia e Cola.
            </li>
            <li className="p-2 bg-slate-900 rounded-xl border border-slate-800 font-mono">
              <strong className="text-amber-400">POST /api/webhooks/mercadopago</strong> - Processa confirmações e ativa automaticamente a assinatura no app.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
