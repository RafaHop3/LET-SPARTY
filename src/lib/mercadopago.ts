import MercadoPagoConfig, { Preference, Payment } from "mercadopago";

// Client configurado com o Access Token da plataforma
export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
  options: { timeout: 5000 },
});

export const preferenceClient = new Preference(mpClient);
export const paymentClient = new Payment(mpClient);

// Taxa da plataforma: 10%
export const PLATFORM_FEE_PERCENT = Number(
  process.env.MP_PLATFORM_FEE_PERCENT || "0.10"
);

/**
 * Calcula os valores do split de pagamento
 */
export function calculateSplit(totalAmount: number) {
  const platformFee = parseFloat((totalAmount * PLATFORM_FEE_PERCENT).toFixed(2));
  const producerAmount = parseFloat((totalAmount - platformFee).toFixed(2));
  return { platformFee, producerAmount };
}
