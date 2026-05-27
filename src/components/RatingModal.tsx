import React, { useState } from 'react';
import { X } from 'lucide-react';
import styles from './components.module.css';

interface RatingModalProps {
  eventName: string;
  onClose: () => void;
  onSubmit: (score: number) => void;
}

export default function RatingModal({ eventName, onClose, onSubmit }: RatingModalProps) {
  const [score, setScore] = useState<number>(10);

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} glass-panel animate-fade-in`}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>
        <h2 className={styles.modalTitle}>Avaliar Evento</h2>
        <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-muted)' }}>
          Que nota você dá para <strong>{eventName}</strong>?
        </p>
        
        <div className={styles.ratingContainer}>
          {[2, 4, 6, 8, 10].map((val) => (
            <button
              key={val}
              className={`${styles.ratingBtn} ${score === val ? styles.ratingBtnActive : ''}`}
              onClick={() => setScore(val)}
            >
              {val}
            </button>
          ))}
        </div>

        <button 
          className="btn-primary" 
          style={{ width: '100%' }}
          onClick={() => onSubmit(score)}
        >
          Confirmar Avaliação
        </button>
      </div>
    </div>
  );
}
