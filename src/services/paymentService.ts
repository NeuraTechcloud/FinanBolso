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
  }
};
