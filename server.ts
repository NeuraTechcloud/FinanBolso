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
  amount: number;
  customerEmail: string;
  status: 'pending' | 'approved' | 'rejected';
  pixCopyPaste?: string;
  pixQrCodeBase64?: string;
  createdAt: number;
}>();

// ------------------------------------------------------------------
// 1. Create Payment Preference (Mercado Pago / Pix Integration)
// ------------------------------------------------------------------
app.post('/api/checkout/create-preference', async (req, res) => {
  try {
    const { plan, email, customerName } = req.body;
    const isYearly = plan === 'yearly';
    const amount = isYearly ? 79.90 : 9.90;
    const planName = isYearly ? 'Pro Anual (FinanBolso)' : 'Pro Mensal (FinanBolso)';
    const paymentId = `pay_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

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
          description: planName,
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
    return res.json({ success: true, message: 'Pagamento confirmado e assinatura ativada!' });
  }

  return res.status(404).json({ success: false, error: 'Pagamento não encontrado' });
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
