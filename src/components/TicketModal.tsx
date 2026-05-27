import React, { useState } from 'react';
import { X, Ticket, Gift, Sparkles } from 'lucide-react';
import styles from './components.module.css';

interface TicketModalProps {
  eventName: string;
  price: number;
  isLoggedIn: boolean;
  onClose: () => void;
  onConfirm: (payload: { couponCode?: string; email?: string; name?: string }) => void;
}

export default function TicketModal({
  eventName,
  price,
  isLoggedIn,
  onClose,
  onConfirm,
}: TicketModalProps) {
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponDiscount, setCouponDiscount] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  // Guest fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [formError, setFormError] = useState('');

  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    setIsValidating(true);
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'validate', code: couponCode }),
      });
      const data = await res.json();
      if (data.valid) {
        setCouponDiscount(data.discountPercent);
      } else {
        setCouponError(data.error || 'Cupom inválido');
        setCouponDiscount(null);
      }
    } catch (err) {
      setCouponError('Erro ao validar cupom');
    } finally {
      setIsValidating(false);
    }
  };

  const discountVal = couponDiscount ? parseFloat(((price * couponDiscount) / 100).toFixed(2)) : 0;
  const finalPrice = Math.max(0, price - discountVal);
  const fee = finalPrice * 0.10;
  const total = finalPrice + fee;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!isLoggedIn) {
      if (!email.trim() || !name.trim()) {
        setFormError('E-mail e Nome são obrigatórios para visitantes');
        return;
      }
    }

    onConfirm({
      couponCode: couponDiscount ? couponCode : undefined,
      email: !isLoggedIn ? email.trim() : undefined,
      name: !isLoggedIn ? name.trim() : undefined,
    });
  };

  return (
    <div className={styles.modalOverlay}>
      <form onSubmit={handleSubmit} className={`${styles.modalContent} glass-panel animate-fade-in`} style={{ maxWidth: '450px' }}>
        <button type="button" className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>
        
        <div className="flex-center" style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>
          <Ticket size={48} />
        </div>
        
        <h2 className={styles.modalTitle}>Garantir Ingresso</h2>
        <p style={{ textAlign: 'center', marginBottom: '20px', color: 'var(--text-muted)' }}>
          Evento: <strong>{eventName}</strong>
        </p>

        {formError && (
          <div style={{ background: 'rgba(255, 76, 76, 0.1)', color: 'var(--danger)', padding: '10px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.85rem', textAlign: 'center' }}>
            {formError}
          </div>
        )}

        {/* Guest checkout fields */}
        {!isLoggedIn && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--primary-color)', fontWeight: 600 }}>Identificação do Visitante (Sem Login)</span>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seu Nome</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Silva"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Seu E-mail (Para receber o ingresso)</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: joao@email.com"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
              />
            </div>
          </div>
        )}

        {/* Cupom de desconto */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>Possui Cupom de Desconto?</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value)}
              placeholder="Ex: SPARTY50"
              style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white', textTransform: 'uppercase' }}
            />
            <button
              type="button"
              onClick={handleValidateCoupon}
              disabled={isValidating || !couponCode.trim()}
              className="btn-secondary"
              style={{ padding: '0 16px', fontSize: '0.85rem' }}
            >
              {isValidating ? 'Validando...' : 'Aplicar'}
            </button>
          </div>
          {couponError && (
            <span style={{ color: 'var(--danger)', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>{couponError}</span>
          )}
          {couponDiscount !== null && (
            <span style={{ color: 'var(--success)', fontSize: '0.75rem', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={12} fill="var(--success)" /> Cupom Ativo! {couponDiscount}% de Desconto aplicado.
            </span>
          )}
        </div>

        {/* Resumo financeiro */}
        <div className={styles.ticketSummary}>
          <div className={styles.summaryRow}>
            <span>Valor do Ingresso</span>
            <span>R$ {price.toFixed(2)}</span>
          </div>
          {couponDiscount !== null && (
            <div className={styles.summaryRow} style={{ color: 'var(--success)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Gift size={12} /> Desconto Cupom</span>
              <span>- R$ {discountVal.toFixed(2)}</span>
            </div>
          )}
          <div className={styles.summaryRow}>
            <span>Taxa da Plataforma (10%)</span>
            <span>R$ {fee.toFixed(2)}</span>
          </div>
          <div className={styles.summaryTotal}>
            <span>Total Geral</span>
            <span style={{ color: 'var(--primary-color)' }}>R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <button
          type="submit"
          className="btn-primary"
          style={{ width: '100%', display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}
        >
          Confirmar & Comprar <Sparkles size={16} />
        </button>
      </form>
    </div>
  );
}
