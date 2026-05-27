import React from 'react';
import { X, Ticket } from 'lucide-react';
import styles from './components.module.css';

interface TicketModalProps {
  eventName: string;
  price: number;
  onClose: () => void;
  onConfirm: () => void;
}

export default function TicketModal({ eventName, price, onClose, onConfirm }: TicketModalProps) {
  const fee = price * 0.10; // 10% fee
  const total = price + fee;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} glass-panel animate-fade-in`}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>
        <div className="flex-center" style={{ marginBottom: '16px', color: 'var(--primary-color)' }}>
          <Ticket size={48} />
        </div>
        <h2 className={styles.modalTitle}>Comprar Ingresso</h2>
        <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-muted)' }}>
          {eventName}
        </p>
        
        <div className={styles.ticketSummary}>
          <div className={styles.summaryRow}>
            <span>Valor do Ingresso</span>
            <span>R$ {price.toFixed(2)}</span>
          </div>
          <div className={styles.summaryRow}>
            <span>Taxa da Plataforma (10%)</span>
            <span>R$ {fee.toFixed(2)}</span>
          </div>
          <div className={styles.summaryTotal}>
            <span>Total a Pagar</span>
            <span style={{ color: 'var(--primary-color)' }}>R$ {total.toFixed(2)}</span>
          </div>
        </div>

        <button 
          className="btn-primary" 
          style={{ width: '100%' }}
          onClick={onConfirm}
        >
          Confirmar Compra
        </button>
      </div>
    </div>
  );
}
