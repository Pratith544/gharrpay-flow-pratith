import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type CreateOrderRequest = {
  amount: number;
  currency: string;
  receipt: string;
  reservation_id: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Partial<CreateOrderRequest>;
    const amount = body.amount;
    const currency = body.currency;
    const receipt = body.receipt;
    const reservation_id = body.reservation_id;

    if (!amount || typeof amount !== "number") {
      return new Response(JSON.stringify({ error: "amount (number) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!currency || typeof currency !== "string") {
      return new Response(JSON.stringify({ error: "currency (string) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!receipt || typeof receipt !== "string") {
      return new Response(JSON.stringify({ error: "receipt (string) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!reservation_id || typeof reservation_id !== "string") {
      return new Response(JSON.stringify({ error: "reservation_id (string) is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const keyId = Deno.env.get("RAZORPAY_KEY_ID");
    const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!keyId || !keySecret) {
      return new Response(JSON.stringify({ error: "Razorpay credentials not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const auth = btoa(`${keyId}:${keySecret}`);

    const rpRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount,
        currency,
        receipt,
        notes: { reservation_id },
      }),
    });

    const rpJson = await rpRes.json().catch(() => null);

    if (!rpRes.ok) {
      const msg =
        (rpJson && typeof rpJson === "object" && "error" in rpJson && (rpJson as any).error?.description) ||
        (rpJson && typeof rpJson === "object" && "message" in rpJson && (rpJson as any).message) ||
        "Failed to create Razorpay order";
      return new Response(JSON.stringify({ error: msg }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const orderId = (rpJson as any)?.id;
    const outAmount = (rpJson as any)?.amount ?? amount;
    const outCurrency = (rpJson as any)?.currency ?? currency;

    return new Response(
      JSON.stringify({
        order_id: orderId,
        amount: outAmount,
        currency: outCurrency,
        key_id: keyId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    console.error("create-razorpay-order error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

