'use client';

import React, { useState, useMemo } from 'react';
import { useSession } from 'next-auth/react';
import Header from '../components/Header';
import CategoryTabs from '../components/CategoryTabs';
import EventCard from '../components/EventCard';
import RatingModal from '../components/RatingModal';
import TicketModal from '../components/TicketModal';
import { MOCK_EVENTS, MOCK_USER, CATEGORIES, Event } from '../data/mockData';
import { useRouter } from 'next/navigation';

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);
  const [events, setEvents] = useState<Event[]>(MOCK_EVENTS);
  const [user, setUser] = useState(MOCK_USER);
  
  // Modal states
  const [selectedEventToVote, setSelectedEventToVote] = useState<Event | null>(null);
  const [selectedEventToBuy, setSelectedEventToBuy] = useState<Event | null>(null);

  // Logic: 2 hours after event start, voting is open. Lasts for 48 hours.
  const isVotingOpen = (eventDateStr: string) => {
    const now = new Date();
    const eventDate = new Date(eventDateStr);
    
    const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    // Open from 2h after start, up to 50h after start (2h + 48h)
    return diffHours >= 2 && diffHours <= 50;
  };

  // Filter and Rank events
  const filteredAndRankedEvents = useMemo(() => {
    return events
      .filter(event => event.category === activeCategory)
      .sort((a, b) => b.score - a.score); // Highest score first (index 0 will be the highest)
  }, [events, activeCategory]);

  const handleVote = (eventId: string) => {
    if (!session) return router.push('/login');
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEventToVote(event);
    }
  };

  const submitVote = (newScore: number) => {
    if (!selectedEventToVote) return;

    setEvents(prevEvents => prevEvents.map(ev => {
      if (ev.id === selectedEventToVote.id) {
        const totalScore = (ev.score * ev.votes) + newScore;
        const newVotes = ev.votes + 1;
        return {
          ...ev,
          score: totalScore / newVotes,
          votes: newVotes
        };
      }
      return ev;
    }));

    setUser(prevUser => ({
      ...prevUser,
      votedEvents: [...prevUser.votedEvents, selectedEventToVote.id]
    }));

    setSelectedEventToVote(null);
  };

  const handleBuy = (eventId: string) => {
    if (!session) return router.push('/login');
    const event = events.find(e => e.id === eventId);
    if (event) {
      setSelectedEventToBuy(event);
    }
  };

  const confirmBuy = () => {
    if (!selectedEventToBuy) return;

    setUser(prevUser => ({
      ...prevUser,
      purchasedTickets: [...prevUser.purchasedTickets, selectedEventToBuy.id]
    }));

    setSelectedEventToBuy(null);
  };

  return (
    <main>
      <Header />
      
      <div className="container">
        <CategoryTabs 
          activeCategory={activeCategory} 
          onSelectCategory={setActiveCategory} 
        />

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px',
          paddingBottom: '40px'
        }}>
          {filteredAndRankedEvents.length > 0 ? (
            filteredAndRankedEvents.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                rankIndex={index}
                onVoteClick={handleVote}
                onBuyClick={handleBuy}
                canVote={isVotingOpen(event.date)}
                hasTicket={user.purchasedTickets.includes(event.id)}
                hasVoted={user.votedEvents.includes(event.id)}
                isVotingOpen={isVotingOpen(event.date)}
              />
            ))
          ) : (
            <p style={{ color: 'var(--text-muted)', gridColumn: '1 / -1', textAlign: 'center', padding: '40px 0' }}>
              Nenhum evento encontrado nesta categoria.
            </p>
          )}
        </div>
      </div>

      {selectedEventToVote && (
        <RatingModal 
          eventName={selectedEventToVote.title}
          onClose={() => setSelectedEventToVote(null)}
          onSubmit={submitVote}
        />
      )}

      {selectedEventToBuy && (
        <TicketModal 
          eventName={selectedEventToBuy.title}
          price={selectedEventToBuy.price}
          onClose={() => setSelectedEventToBuy(null)}
          onConfirm={confirmBuy}
        />
      )}
    </main>
  );
}
