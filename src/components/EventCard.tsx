import React from 'react';
import { Star, MapPin, Calendar, Trophy } from 'lucide-react';
import { Event } from '../data/mockData';
import styles from './components.module.css';

interface EventCardProps {
  event: Event;
  rankIndex: number;
  onVoteClick: (eventId: string) => void;
  onBuyClick: (eventId: string) => void;
  canVote: boolean;
  hasTicket: boolean;
  hasVoted: boolean;
  isVotingOpen: boolean;
}

export default function EventCard({
  event,
  rankIndex,
  onVoteClick,
  onBuyClick,
  canVote,
  hasTicket,
  hasVoted,
  isVotingOpen
}: EventCardProps) {
  const eventDate = new Date(event.date);
  const formattedDate = eventDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className={`${styles.eventCard} glass-panel animate-fade-in`}>
      <div className={styles.cardImageContainer}>
        <img src={event.imageUrl} alt={event.title} className={styles.cardImage} />
        {rankIndex === 0 && (
          <div className={styles.topBadge}>
            <Trophy size={16} /> Top 1
          </div>
        )}
        <div className={styles.rankBadge}>#{rankIndex}</div>
        <div className={styles.scoreBadge}>
          <Star size={14} className={styles.starIcon} fill="#f1c40f" color="#f1c40f" />
          <span>{event.score.toFixed(1)}</span>
        </div>
      </div>
      
      <div className={styles.cardContent}>
        <div className={styles.cardHeader}>
          <span className={styles.categoryTag}>{event.category}</span>
        </div>
        <h3 className={styles.cardTitle}>{event.title}</h3>
        
        <div className={styles.cardInfo}>
          <div className={styles.infoRow}>
            <Calendar size={14} className={styles.infoIcon} />
            <span>{formattedDate}</span>
          </div>
          <div className={styles.infoRow}>
            <MapPin size={14} className={styles.infoIcon} />
            <span>{event.location}</span>
          </div>
        </div>
        
        <div className={styles.cardActions}>
          {!hasTicket ? (
            <button className="btn-primary" onClick={() => onBuyClick(event.id)}>
              Comprar - R$ {event.price.toFixed(2)}
            </button>
          ) : (
            <div className={styles.ticketOwned}>Ingresso Garantido</div>
          )}

          {hasTicket && isVotingOpen && !hasVoted && (
            <button className="btn-secondary" onClick={() => onVoteClick(event.id)}>
              Avaliar Evento
            </button>
          )}
          {hasVoted && (
            <div className={styles.votedStatus}>Você já avaliou</div>
          )}
          {!isVotingOpen && hasTicket && (
            <div className={styles.votedStatus}>Avaliação indisponível</div>
          )}
        </div>
      </div>
    </div>
  );
}
