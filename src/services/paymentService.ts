export interface PaymentPreferenceResponse {
  success: boolean;
  paymentId: string;
  planName: string;
  amount: number;
  pixCopyPaste?: string;
  pixQrCodeBase64?: string;
  error?: string;
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
        planName: '',
        amount: 0,
        error: e.message || 'Erro ao gerar Pix',
      };
    }
  },

  // Check payment status
  async checkPaymentStatus(paymentId: string): Promise<{ approved: boolean; status: string; planName?: string }> {
    try {
      const response = await fetch(`/api/checkout/status/${paymentId}`);
      if (!response.ok) return { approved: false, status: 'error' };
      return await response.json();
    } catch {
      return { approved: false, status: 'error' };
    }
  },

  // Confirm payment manually / simulation in dev mode
  async confirmPayment(paymentId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/checkout/confirm/${paymentId}`, {
        method: 'POST',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
};
