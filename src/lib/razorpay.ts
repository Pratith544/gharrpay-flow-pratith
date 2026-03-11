import { toast } from 'sonner';

type RazorpaySuccessPayload = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type OpenRazorpayCheckoutArgs = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  onSuccess: (payload: RazorpaySuccessPayload) => void;
  onFailure: (reason?: unknown) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export function openRazorpayCheckout({
  orderId,
  amount,
  currency,
  keyId,
  customerName,
  customerPhone,
  customerEmail,
  onSuccess,
  onFailure,
}: OpenRazorpayCheckoutArgs) {
  if (!window.Razorpay) {
    toast.error('Payment service unavailable. Please refresh.');
    onFailure(new Error('Razorpay SDK not loaded'));
    return;
  }

  const options = {
    key: keyId,
    amount,
    currency,
    order_id: orderId,
    name: 'Gharpayy',
    description: 'Bed Reservation',
    theme: { color: '#E8FF00' },
    prefill: {
      name: customerName || undefined,
      contact: customerPhone || undefined,
      email: customerEmail || undefined,
    },
    handler: (response: RazorpaySuccessPayload) => onSuccess(response),
    modal: {
      ondismiss: () => onFailure(new Error('Checkout dismissed')),
    },
  } as const;

  const rz = new window.Razorpay(options as unknown as Record<string, unknown>);
  rz.open();
}

