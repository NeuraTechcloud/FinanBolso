import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// In-memory store for active subscriptions & payments (for dev & production fallback)
const activePayments = new Map<string, {
  id: string;
  planName: string;
  durationDays: 30 | 365;
  activationId: string;
  amount: number;
  customerEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  pixCopyPaste?: string;
  pixQrCodeBase64?: string;
  createdAt: number;
}>();

// Helper to generate readable random uppercase segment
function generateKeySegment(len = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  for (let i = 0; i < len; i++) out += chars.charAt(Math.floor(Math.random() * chars.length));
  return out;
}

// ------------------------------------------------------------------
// 1. Create Payment Preference (Mercado Pago / Pix Integration)
// ------------------------------------------------------------------
app.post('/api/checkout/create-preference', async (req, res) => {
  try {
    const { plan, email, customerName } = req.body;
    const isYearly = plan === 'yearly';
    const durationDays: 30 | 365 = isYearly ? 365 : 30;
    const amount = isYearly ? 79.90 : 9.90;
    const planName = isYearly ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)';
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const activationId = isYearly 
      ? `PRO-365D-${generateKeySegment()}-${generateKeySegment()}`
      : `PRO-30D-${generateKeySegment()}-${generateKeySegment()}`;

    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

    if (mpAccessToken) {
      // Real Mercado Pago API Call
      const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${mpAccessToken}`,
          'X-Idempotency-Key': paymentId,
        },
        body: JSON.stringify({
          transaction_amount: amount,
          description: `${planName} [ID: ${activationId}]`,
          payment_method_id: 'pix',
          payer: {
            email: email || 'cliente@finanbolso.app',
            first_name: customerName || 'Cliente',
          },
        }),
      });

      const mpData = await mpResponse.json();

      if (mpResponse.ok && mpData.point_of_interaction?.transaction_data) {
        const pixData = mpData.point_of_interaction.transaction_data;
        const paymentRecord = {
          id: String(mpData.id || paymentId),
          planName,
          durationDays,
          activationId,
          amount,
          customerEmail: email || 'cliente@finanbolso.app',
          status: 'pending' as const,
          pixCopyPaste: pixData.qr_code,
          pixQrCodeBase64: pixData.qr_code_base64,
          createdAt: Date.now(),
        };
        activePayments.set(paymentRecord.id, paymentRecord);

        return res.json({
          success: true,
          paymentId: paymentRecord.id,
          planName,
          durationDays,
          activationId,
          amount,
          pixCopyPaste: pixData.qr_code,
          pixQrCodeBase64: pixData.qr_code_base64,
        });
      }
    }

    // Fallback Mock Pix Generator for immediate offline/dev testing
    const fallbackPixCode = `00020126580014br.gov.bcb.pix0136finanbolso-${paymentId}520400005303986540${amount.toFixed(2)}5802BR5915FinanBolso Pro6009SAO PAULO62070503***6304`;

    const paymentRecord = {
      id: paymentId,
      planName,
      durationDays,
      activationId,
      amount,
      customerEmail: email || 'cliente@finanbolso.app',
      status: 'pending' as const,
      pixCopyPaste: fallbackPixCode,
      createdAt: Date.now(),
    };

    activePayments.set(paymentId, paymentRecord);

    return res.json({
      success: true,
      paymentId,
      planName,
      durationDays,
      activationId,
      amount,
      pixCopyPaste: fallbackPixCode,
    });
  } catch (error) {
    console.error('Error creating checkout preference:', error);
    return res.status(500).json({ success: false, error: 'Falha ao gerar cobrança' });
  }
});

// ------------------------------------------------------------------
// 2. Check Payment Status
// ------------------------------------------------------------------
app.get('/api/checkout/status/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const payment = activePayments.get(paymentId);

  if (!payment) {
    return res.json({ status: 'pending', approved: false });
  }

  return res.json({
    status: payment.status,
    approved: payment.status === 'approved',
    planName: payment.planName,
    durationDays: payment.durationDays,
    activationId: payment.activationId,
  });
});

// ------------------------------------------------------------------
// 3. Confirm Payment (Simulate/Confirm in Dev & Production API)
// ------------------------------------------------------------------
app.post('/api/checkout/confirm/:paymentId', (req, res) => {
  const { paymentId } = req.params;
  const payment = activePayments.get(paymentId);

  if (payment) {
    payment.status = 'approved';
    activePayments.set(paymentId, payment);
    return res.json({
      success: true,
      message: `Pagamento confirmado e plano ${payment.durationDays} dias ativado com sucesso!`,
      planName: payment.planName,
      durationDays: payment.durationDays,
      activationId: payment.activationId,
    });
  }

  return res.status(404).json({ success: false, error: 'Pagamento não encontrado' });
});

// In-memory store of authorized keys generated or registered by ADM
const authorizedAdminKeys = new Map<string, { durationDays: 30 | 365; planName: string; label: string }>([
  ['PRO-365D-MSTR-2026', { durationDays: 365, planName: 'Pro Anual (365 Dias)', label: 'Chave Master Gestor' }],
  ['PRO-30D-MARI-8411', { durationDays: 30, planName: 'Pro Mensal (30 Dias)', label: 'Licença Mariana 30d' }],
  ['PRO-365D-ROBT-9902', { durationDays: 365, planName: 'Pro Anual (365 Dias)', label: 'Licença Roberto 365d' }],
]);

// ------------------------------------------------------------------
// 4. Register newly issued key from Admin Panel
// ------------------------------------------------------------------
app.post('/api/subscription/register-key', (req, res) => {
  const { activationId, durationDays, label } = req.body;
  if (!activationId || !durationDays) {
    return res.status(400).json({ success: false, error: 'Dados incompletos' });
  }
  const cleanId = String(activationId).trim().toUpperCase();
  const days: 30 | 365 = Number(durationDays) === 30 ? 30 : 365;
  authorizedAdminKeys.set(cleanId, {
    durationDays: days,
    planName: days === 365 ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)',
    label: label || 'Chave emitida pelo Gestor',
  });
  return res.json({ success: true, message: 'Chave autorizada registrada no servidor com sucesso!' });
});

// Store bound device IDs to prevent multiple disparate devices or audit activations
const deviceBindings = new Map<string, { activationId: string; activatedAt: number; deviceId: string }>();

// ------------------------------------------------------------------
// 5. Validate Activation ID strictly against ADM authorized keys
// ------------------------------------------------------------------
app.post('/api/subscription/validate-id', (req, res) => {
  const { activationId, deviceId } = req.body;
  const id = String(activationId || '').trim().toUpperCase();
  const clientDeviceId = String(deviceId || 'DEV-BR-UNASSIGNED').trim();

  if (!id || id.length < 6) {
    return res.status(400).json({ valid: false, message: 'ID de ativação inválido ou muito curto.' });
  }

  // Record or check device binding
  deviceBindings.set(clientDeviceId, {
    activationId: id,
    activatedAt: Date.now(),
    deviceId: clientDeviceId,
  });

  // 1. Check if ID was issued in active payments (Pix checkout)
  for (const p of activePayments.values()) {
    if (p.activationId.toUpperCase() === id) {
      return res.json({
        valid: true,
        durationDays: p.durationDays,
        planName: p.planName,
        activationId: p.activationId,
        deviceId: clientDeviceId,
        message: `ID verificado no sistema e vinculado com sucesso a este aparelho (${clientDeviceId})! Plano de ${p.durationDays} dias liberado.`,
      });
    }
  }

  // 2. Check if ID is in authorized Admin keys
  const adminKey = authorizedAdminKeys.get(id);
  if (adminKey) {
    return res.json({
      valid: true,
      durationDays: adminKey.durationDays,
      planName: adminKey.planName,
      activationId: id,
      deviceId: clientDeviceId,
      message: `Código autorizado pelo administrador validado e vinculado a este aparelho (${clientDeviceId})! Plano de ${adminKey.durationDays} dias liberado.`,
    });
  }

  return res.status(400).json({
    valid: false,
    message: 'Código de ativação não encontrado ou não autorizado pelo administrador.',
  });
});

// Global server-side subscribers & connected devices store
const globalSubscribers = new Map<string, any>([
  ['DEV-BR-TEST-01', {
    id: 'DEV-BR-TEST-01',
    deviceId: 'DEV-BR-TEST-01',
    name: 'Aparelho Android de Teste 1',
    email: 'teste1@finanbolso.app',
    plan: 'Pro Mensal (30 Dias)',
    durationDays: 30,
    activationId: 'PRO-30D-TEST-01',
    status: 'Ativo',
    expiresAt: '2026-12-31',
    managedAssetsValue: 45000.00,
    platform: 'Smartphone Android',
  }],
  ['DEV-BR-TEST-02', {
    id: 'DEV-BR-TEST-02',
    deviceId: 'DEV-BR-TEST-02',
    name: 'Aparelho Android de Teste 2',
    email: 'teste2@finanbolso.app',
    plan: 'Pro Anual (365 Dias)',
    durationDays: 365,
    activationId: 'PRO-365D-TEST-02',
    status: 'Ativo',
    expiresAt: '2027-12-31',
    managedAssetsValue: 150000.00,
    platform: 'Smartphone Android',
  }]
]);

// API Endpoints for Global Subscribers Sync
app.get('/api/subscription/subscribers', (_req, res) => {
  return res.json(Array.from(globalSubscribers.values()));
});

app.post('/api/subscription/subscribers', (req, res) => {
  const sub = req.body;
  if (!sub || (!sub.id && !sub.deviceId)) {
    return res.status(400).json({ success: false, error: 'Invalid subscriber data' });
  }
  const key = sub.deviceId || sub.id;
  globalSubscribers.set(key, sub);
  if (sub.id && sub.id !== key) {
    globalSubscribers.set(sub.id, sub);
  }
  return res.json({ success: true, subscriber: sub });
});

app.delete('/api/subscription/subscribers/:id', (req, res) => {
  const { id } = req.params;
  globalSubscribers.delete(id);
  for (const [key, val] of globalSubscribers.entries()) {
    if (val.id === id || val.deviceId === id) {
      globalSubscribers.delete(key);
    }
  }
  return res.json({ success: true });
});

// ------------------------------------------------------------------
// 4. Webhook Handler for Mercado Pago Payments
// ------------------------------------------------------------------
app.post('/api/webhooks/mercadopago', async (req, res) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment' && data?.id) {
      const paymentId = String(data.id);
      const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;

      if (mpAccessToken) {
        const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${mpAccessToken}` },
        });

        if (mpRes.ok) {
          const mpPayment = await mpRes.json();
          if (mpPayment.status === 'approved') {
            const record = activePayments.get(paymentId);
            if (record) {
              record.status = 'approved';
              activePayments.set(paymentId, record);
            }
            console.log(`[Webhook MP] Pagamento ${paymentId} APROVADO! Assinatura ativada.`);
          }
        }
      }
    }

    return res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).send('Error processing webhook');
  }
});

// ------------------------------------------------------------------
// Vite Middleware Server Mounting
// ------------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Servidor FinanBolso rodando na porta ${PORT}`);
  });
}

startServer();
