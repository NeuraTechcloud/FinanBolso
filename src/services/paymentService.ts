export interface PaymentPreferenceResponse {
  success: boolean;
  paymentId: string;
  planName: string;
  durationDays?: 30 | 365;
  activationId?: string;
  amount: number;
  pixCopyPaste?: string;
  pixQrCodeBase64?: string;
  error?: string;
}

export interface ConfirmPaymentResponse {
  success: boolean;
  planName?: string;
  durationDays?: 30 | 365;
  activationId?: string;
  message?: string;
}

export const PaymentService = {
  // Request Pix payment preference
  async createCheckoutPreference(plan: 'monthly' | 'yearly', email?: string, name?: string): Promise<PaymentPreferenceResponse> {
    try {
      const response = await fetch('/api/checkout/create-preference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, email, customerName: name }),
      });

      if (!response.ok) {
        throw new Error('Falha ao se comunicar com o servidor de pagamento');
      }

      return await response.json();
    } catch (e: any) {
      console.error('Payment Error:', e);
      return {
        success: false,
        paymentId: '',
        planName: plan === 'yearly' ? 'Pro Anual (365 Dias)' : 'Pro Mensal (30 Dias)',
        durationDays: plan === 'yearly' ? 365 : 30,
        activationId: plan === 'yearly' ? 'PRO-365D-DEV-TEMP' : 'PRO-30D-DEV-TEMP',
        amount: plan === 'yearly' ? 79.90 : 9.90,
        error: e.message || 'Erro ao gerar Pix',
      };
    }
  },

  // Check payment status
  async checkPaymentStatus(paymentId: string): Promise<{ approved: boolean; status: string; planName?: string; durationDays?: 30 | 365; activationId?: string }> {
    try {
      const response = await fetch(`/api/checkout/status/${paymentId}`);
      if (!response.ok) return { approved: false, status: 'error' };
      return await response.json();
    } catch {
      return { approved: false, status: 'error' };
    }
  },

  // Confirm payment manually / simulation in dev mode
  async confirmPayment(paymentId: string): Promise<ConfirmPaymentResponse> {
    try {
      const response = await fetch(`/api/checkout/confirm/${paymentId}`, {
        method: 'POST',
      });
      if (response.ok) {
        return await response.json();
      }
      return { success: false };
    } catch {
      return { success: false };
    }
  },

  // Check Mercado Pago configuration status on backend
  async getMercadoPagoStatus(): Promise<{ configured: boolean; mode: string; maskedToken: string | null }> {
    try {
      const response = await fetch('/api/mercadopago/status');
      if (response.ok) return await response.json();
      return { configured: false, mode: 'demo_fallback', maskedToken: null };
    } catch {
      return { configured: false, mode: 'demo_fallback', maskedToken: null };
    }
  },

  // Create Mercado Pago Preapproval Subscription Plan (/preapproval_plan)
  async createSubscriptionPlan(planData: {
    reason: string;
    transaction_amount: number;
    currency_id?: string;
    frequency?: number;
    frequency_type?: 'months' | 'days';
    repetitions?: number;
    billing_day?: number;
    billing_day_proportional?: boolean;
    free_trial?: { frequency: number; frequency_type: 'months' | 'days' };
    back_url?: string;
  }): Promise<{ success: boolean; mode?: string; plan?: any; error?: string }> {
    try {
      const response = await fetch('/api/mercadopago/create-subscription-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData),
      });
      return await response.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Falha ao conectar com o servidor' };
    }
  },

  // Create Mercado Pago Individual Subscription Link (/preapproval)
  async createSubscription(subData: {
    preapproval_plan_id?: string;
    payer_email?: string;
    back_url?: string;
    reason?: string;
  }): Promise<{ success: boolean; mode?: string; subscription?: any; init_point?: string; error?: string }> {
    try {
      const response = await fetch('/api/mercadopago/create-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subData),
      });
      return await response.json();
    } catch (e: any) {
      return { success: false, error: e.message || 'Falha ao conectar com o servidor' };
    }
  }
};

