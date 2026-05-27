import React, { useState } from 'react';
import { X, Star, Sparkles } from 'lucide-react';
import styles from './components.module.css';

interface RatingModalProps {
  eventName: string;
  onClose: () => void;
  onSubmit: (score: number) => void;
}

export default function RatingModal({ eventName, onClose, onSubmit }: RatingModalProps) {
  const [score, setScore] = useState<number>(5);
  const [hoverScore, setHoverScore] = useState<number | null>(null);

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContent} glass-panel animate-fade-in`} style={{ maxWidth: '400px', padding: '35px 25px' }}>
        <button className={styles.closeBtn} onClick={onClose}>
          <X size={24} />
        </button>
        
        <h2 className={styles.modalTitle} style={{ marginBottom: '10px' }}>Avaliar Evento</h2>
        
        <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
          Deixe sua avaliação de 1 a 5 estrelas para:<br /><strong>{eventName}</strong>
        </p>
        
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginBottom: '32px' }}>
          {[1, 2, 3, 4, 5].map((val) => {
            const isActive = hoverScore !== null ? val <= hoverScore : val <= score;
            return (
              <button
                key={val}
                type="button"
                onMouseEnter={() => setHoverScore(val)}
                onMouseLeave={() => setHoverScore(null)}
                onClick={() => setScore(val)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', transition: 'transform 0.15s ease' }}
                className="hover-scale"
              >
                <Star
                  size={36}
                  fill={isActive ? 'var(--primary-color)' : 'none'}
                  color={isActive ? 'var(--primary-color)' : 'rgba(255,255,255,0.2)'}
                  style={{ transition: 'all 0.2s ease' }}
                />
              </button>
            );
          })}
        </div>

        <button 
          className="btn-primary" 
          style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          onClick={() => onSubmit(score)}
        >
          Enviar Avaliação <Sparkles size={16} />
        </button>
      </div>
    </div>
  );
}
