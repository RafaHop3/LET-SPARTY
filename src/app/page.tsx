'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import CategoryTabs from '../components/CategoryTabs';
import EventCard from '../components/EventCard';
import RatingModal from '../components/RatingModal';
import TicketModal from '../components/TicketModal';
import { CATEGORIES } from '../data/mockData';
import { 
  Compass, 
  MessageSquare, 
  Sparkles, 
  Car, 
  Ticket as TicketIcon, 
  Plus, 
  DollarSign, 
  ShoppingBag, 
  Users, 
  TrendingUp, 
  Calendar, 
  MapPin, 
  AlertTriangle, 
  CheckCircle2, 
  Send,
  ExternalLink,
  Shield,
  Gift,
  X
} from 'lucide-react';

interface Event {
  id: string;
  title: string;
  category: string;
  date: string;
  price: number;
  venue: string;
  city: string;
  imageUrl?: string;
  description?: string;
  score: number;
  votes: number;
  produtora: {
    id: string;
    name: string;
    produtoraProfile?: { companyName: string };
  };
  _count?: {
    tickets: number;
  };
}

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  createdAt: string;
  userId: string;
  user: {
    id: string;
    name: string;
    role: string;
    festeiroProfile?: { avatarUrl: string };
  };
  event?: {
    id: string;
    title: string;
  };
  comments: Comment[];
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
  };
}

interface Carpool {
  id: string;
  eventId: string;
  availableSeats: number;
  departureLocation: string;
  departureTime: string;
  description?: string;
  signedWaiver: boolean;
  driver: {
    id: string;
    name: string;
    festeiroProfile?: { phone: string; avatarUrl: string };
  };
  passengers: Array<{
    passenger: { id: string; name: string };
  }>;
}

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  // Navigation tab state
  const [activeTab, setActiveTab] = useState<'events' | 'social' | 'minigame' | 'carpools' | 'dashboard' | 'my-tickets'>('events');
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  // Database lists
  const [events, setEvents] = useState<Event[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [carpools, setCarpools] = useState<Carpool[]>([]);
  const [loadingCarpools, setLoadingCarpools] = useState(false);
  const [selectedEventForCarpool, setSelectedEventForCarpool] = useState<string>('');
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [loadingMyTickets, setLoadingMyTickets] = useState(false);

  // Financial statistics (Produtora)
  const [financialStats, setFinancialStats] = useState<any>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Modals state
  const [selectedEventToVote, setSelectedEventToVote] = useState<Event | null>(null);
  const [selectedEventToBuy, setSelectedEventToBuy] = useState<Event | null>(null);

  // UI Interactive States
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sparty Wheel (Roleta) Game States
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelResult, setWheelResult] = useState<number | null>(null);
  const [wonCoupon, setWonCoupon] = useState<string | null>(null);
  const [wonDiscount, setWonDiscount] = useState<number | null>(null);
  const [availableSpins, setAvailableSpins] = useState<number>(0);


  // Form states
  const [newPostContent, setNewPostContent] = useState('');
  const [newPostImage, setNewPostImage] = useState('');
  const [newPostEventId, setNewPostEventId] = useState('');
  const [newPostGuestName, setNewPostGuestName] = useState('');
  const [postSubmitting, setPostSubmitting] = useState(false);

  const [commentInput, setCommentInput] = useState<{ [postId: string]: string }>({});
  const [commentGuestName, setCommentGuestName] = useState<{ [postId: string]: string }>({});

  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventCategory, setNewEventCategory] = useState(CATEGORIES[0]);
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventPrice, setNewEventPrice] = useState('');
  const [newEventVenue, setNewEventVenue] = useState('');
  const [newEventCity, setNewEventCity] = useState('');
  const [newEventImage, setNewEventImage] = useState('');
  const [newEventDesc, setNewEventDesc] = useState('');
  const [eventSubmitting, setEventSubmitting] = useState(false);

  const [newCarpoolSeats, setNewCarpoolSeats] = useState(3);
  const [newCarpoolLoc, setNewCarpoolLoc] = useState('');
  const [newCarpoolTime, setNewCarpoolTime] = useState('');
  const [newCarpoolDesc, setNewCarpoolDesc] = useState('');
  const [newCarpoolWaiver, setNewCarpoolWaiver] = useState(false);
  const [newCarpoolGuestName, setNewCarpoolGuestName] = useState('');
  const [newCarpoolGuestPhone, setNewCarpoolGuestPhone] = useState('');
  const [carpoolSubmitting, setCarpoolSubmitting] = useState(false);

  const [carpoolGuestNameForJoin, setCarpoolGuestNameForJoin] = useState<{ [carpoolId: string]: string }>({});
  const [carpoolGuestPhoneForJoin, setCarpoolGuestPhoneForJoin] = useState<{ [carpoolId: string]: string }>({});

  const [guestEmailLookup, setGuestEmailLookup] = useState('');

  // OTP Verification States (Magic Link / Passwordless para Visitantes)
  const [selectedTicketToVerify, setSelectedTicketToVerify] = useState<any | null>(null);
  const [verificationOtpInput, setVerificationOtpInput] = useState('');
  const [verifyingTicket, setVerifyingTicket] = useState(false);

  // Fetch Events
  const fetchEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        setEvents(data);
        if (data.length > 0 && !selectedEventForCarpool) {
          setSelectedEventForCarpool(data[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEvents(false);
    }
  };

  // Fetch Posts
  const fetchPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch('/api/social/posts');
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPosts(false);
    }
  };

  // Fetch Carpools
  const fetchCarpools = async (eventId: string) => {
    if (!eventId) return;
    setLoadingCarpools(true);
    try {
      const res = await fetch(`/api/carpools?eventId=${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setCarpools(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingCarpools(false);
    }
  };

  // Fetch Producer Dashboard Data
  const fetchProducerData = async () => {
    setLoadingStats(true);
    try {
      const res = await fetch('/api/events/mine');
      if (res.ok) {
        const data = await res.json();
        setFinancialStats(data.stats);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch User's Tickets
  const fetchMyTickets = async (email?: string) => {
    setLoadingMyTickets(true);
    try {
      // Se tiver email de guest, faz chamada simulada ou por email
      let url = '/api/tickets/mine';
      if (email) {
        url = `/api/tickets/mine?email=${encodeURIComponent(email)}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMyTickets(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMyTickets(false);
    }
  };

  // Fetch Available Spins for current user
  const fetchAvailableSpins = async () => {
    try {
      const res = await fetch('/api/coupons');
      if (res.ok) {
        const data = await res.json();
        setAvailableSpins(data.availableSpins || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };


  useEffect(() => {
    fetchEvents();
    if (session?.user) {
      fetchAvailableSpins();
    }
  }, [session]);

  useEffect(() => {
    if (activeTab === 'social') {
      fetchPosts();
    } else if (activeTab === 'carpools' && selectedEventForCarpool) {
      fetchCarpools(selectedEventForCarpool);
    } else if (activeTab === 'dashboard' && session?.user) {
      fetchProducerData();
    } else if (activeTab === 'my-tickets' && session?.user) {
      fetchMyTickets();
      fetchAvailableSpins();
    } else if (activeTab === 'minigame' && session?.user) {
      fetchAvailableSpins();
    }
  }, [activeTab, selectedEventForCarpool, session]);


  // Handle Event Purchase Checkout confirmation
  const handleTicketConfirm = async (checkoutPayload: { couponCode?: string; email?: string; name?: string }) => {
    if (!selectedEventToBuy) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventToBuy.id,
          ...checkoutPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Erro ao processar compra');
        setSelectedEventToBuy(null);
        return;
      }

      if (data.simulated) {
        if (data.isVerified) {
          setSuccessMsg(`Ingresso comprado com sucesso para ${selectedEventToBuy.title}! (Modo Desenvolvimento)`);
        } else {
          setSuccessMsg(`Ingresso gerado! [DEV TESTE] Código OTP enviado: ${data.verificationCode}. Por favor, verifique seu ingresso abaixo para ativá-lo.`);
        }
        
        fetchEvents();
        if (session?.user) {
          fetchMyTickets();
        } else if (checkoutPayload.email) {
          setGuestEmailLookup(checkoutPayload.email);
          fetchMyTickets(checkoutPayload.email);
          setActiveTab('my-tickets'); // Redireciona para visualização imediata
        }
      } else if (data.checkoutUrl) {
        // Redireciona para o MercadoPago real/sandbox
        window.location.href = data.checkoutUrl;
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao processar compra.');
    } finally {
      setSelectedEventToBuy(null);
    }
  };

  // Handle guest ticket OTP verification (Magic Link / Passwordless proof of ownership)
  const handleVerifyTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketToVerify || !verificationOtpInput.trim()) return;
    setVerifyingTicket(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/tickets/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicketToVerify.id,
          code: verificationOtpInput.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Ingresso verificado com sucesso!');
        setSelectedTicketToVerify(null);
        setVerificationOtpInput('');
        
        // Recarregar lista de ingressos
        if (session?.user) {
          fetchMyTickets();
        } else if (guestEmailLookup) {
          fetchMyTickets(guestEmailLookup);
        }
      } else {
        setErrorMsg(data.error || 'Código de verificação inválido');
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao verificar ingresso.');
    } finally {
      setVerifyingTicket(false);
    }
  };

  // Handle rating submission
  const handleRatingSubmit = async (score: number) => {
    if (!selectedEventToVote) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch(`/api/events/${selectedEventToVote.id}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Sua avaliação foi registrada com sucesso! Obrigado.');
        fetchEvents();
      } else {
        setErrorMsg(data.error || 'Erro ao registrar voto');
      }
    } catch (err) {
      setErrorMsg('Erro ao registrar avaliação.');
    } finally {
      setSelectedEventToVote(null);
    }
  };

  // Spin Sparty Wheel (Gamification)
  const spinWheel = async () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWonCoupon(null);
    setWonDiscount(null);
    setWheelResult(null);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate' }),
      });
      const data = await res.json();

      if (!res.ok) {
        setIsSpinning(false);
        setErrorMsg(data.error || "Erro ao girar a roleta.");
        return;
      }

      const { code, discountPercent, targetIndex } = data;
      setWheelResult(targetIndex);

      setTimeout(async () => {
        setIsSpinning(false);
        setWonCoupon(code);
        setWonDiscount(discountPercent);
        setSuccessMsg(`Parabéns! Você ganhou um cupom de ${discountPercent}% de desconto!`);
        fetchAvailableSpins(); // Recarrega saldo atualizado de giros
      }, 3000);

    } catch (err) {
      console.error(err);
      setIsSpinning(false);
      setErrorMsg("Erro de conexão ao servidor.");
    }
  };


  // Submit Social Post
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    setPostSubmitting(true);

    try {
      const res = await fetch('/api/social/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPostContent,
          imageUrl: newPostImage || undefined,
          eventId: newPostEventId || undefined,
          customName: !session?.user ? newPostGuestName : undefined,
        }),
      });

      if (res.ok) {
        setNewPostContent('');
        setNewPostImage('');
        setNewPostEventId('');
        setNewPostGuestName('');
        setSuccessMsg('Post publicado no feed com sucesso!');
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setPostSubmitting(false);
    }
  };

  // Submit Comment on Post
  const handleCreateComment = async (postId: string) => {
    const content = commentInput[postId];
    if (!content || !content.trim()) return;

    try {
      const res = await fetch(`/api/social/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          customName: !session?.user ? commentGuestName[postId] : undefined,
        }),
      });

      if (res.ok) {
        setCommentInput(prev => ({ ...prev, [postId]: '' }));
        setCommentGuestName(prev => ({ ...prev, [postId]: '' }));
        fetchPosts();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Register Event (Produtora)
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate || !newEventPrice || !newEventVenue) return;
    setEventSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newEventTitle,
          category: newEventCategory,
          date: newEventDate,
          price: Number(newEventPrice),
          venue: newEventVenue,
          city: newEventCity,
          imageUrl: newEventImage || undefined,
          description: newEventDesc || undefined,
        }),
      });

      if (res.ok) {
        setSuccessMsg('Evento criado com sucesso e publicado na plataforma!');
        setNewEventTitle('');
        setNewEventDate('');
        setNewEventPrice('');
        setNewEventVenue('');
        setNewEventCity('');
        setNewEventImage('');
        setNewEventDesc('');
        fetchEvents();
        fetchProducerData();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Erro ao criar evento');
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao criar evento.');
    } finally {
      setEventSubmitting(false);
    }
  };

  // Register Carpool (Designated Driver)
  const handleCreateCarpool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventForCarpool || !newCarpoolLoc || !newCarpoolTime) return;
    setCarpoolSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/carpools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEventForCarpool,
          availableSeats: Number(newCarpoolSeats),
          departureLocation: newCarpoolLoc,
          departureTime: newCarpoolTime,
          description: newCarpoolDesc || undefined,
          signedWaiver: newCarpoolWaiver,
          guestName: !session?.user ? newCarpoolGuestName : undefined,
          guestPhone: !session?.user ? newCarpoolGuestPhone : undefined,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg('Sua carona foi cadastrada! Obrigado por colaborar com a sobriedade no trânsito 🛡️');
        setNewCarpoolSeats(3);
        setNewCarpoolLoc('');
        setNewCarpoolTime('');
        setNewCarpoolDesc('');
        setNewCarpoolWaiver(false);
        setNewCarpoolGuestName('');
        setNewCarpoolGuestPhone('');
        fetchCarpools(selectedEventForCarpool);
      } else {
        setErrorMsg(data.error || 'Erro ao cadastrar carona');
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao cadastrar carona.');
    } finally {
      setCarpoolSubmitting(false);
    }
  };

  // Join Carpool
  const handleJoinCarpool = async (carpoolId: string) => {
    setErrorMsg('');
    setSuccessMsg('');

    const payload: any = { carpoolId };
    if (!session?.user) {
      const name = carpoolGuestNameForJoin[carpoolId];
      const phone = carpoolGuestPhoneForJoin[carpoolId];
      if (!name || !phone) {
        setErrorMsg('Por favor, informe seu Nome e Telefone para solicitar carona');
        return;
      }
      payload.guestName = name;
      payload.guestPhone = phone;
    }

    try {
      const res = await fetch('/api/carpools/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || 'Você foi adicionado à carona!');
        fetchCarpools(selectedEventForCarpool);
      } else {
        setErrorMsg(data.error || 'Erro ao juntar-se à carona');
      }
    } catch (err) {
      setErrorMsg('Erro de conexão ao solicitar carona.');
    }
  };

  // Filtering Events
  const filteredEvents = useMemo(() => {
    return events
      .filter(event => event.category === activeCategory)
      .sort((a, b) => b.score - a.score);
  }, [events, activeCategory]);

  const activeUserRole = session?.user ? (session.user as any).role : null;
  const isLoggedIn = !!session?.user;

  // Deep Link for Uber
  const getUberLink = (venue: string) => {
    return `https://m.uber.com/ul/?action=setPickup&pickup=my_location&dropoff[nickname]=${encodeURIComponent(venue)}`;
  };

  // Helper check for active voting
  const isVotingOpen = (eventDateStr: string) => {
    const now = new Date();
    const eventDate = new Date(eventDateStr);
    const diffHours = (now.getTime() - eventDate.getTime()) / (1000 * 60 * 60);
    return diffHours >= 2 && diffHours <= 50;
  };

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* Dynamic secondary premium navigation menu */}
      <div className="container" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 0', borderBottom: '1px solid var(--surface-border)' }}>
          <button 
            onClick={() => setActiveTab('events')} 
            className={`btn-secondary ${activeTab === 'events' ? 'active-neon-btn' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          >
            <Compass size={16} /> Explorar Eventos
          </button>
          
          <button 
            onClick={() => setActiveTab('social')} 
            className={`btn-secondary ${activeTab === 'social' ? 'active-neon-btn' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          >
            <MessageSquare size={16} /> Feed Social
          </button>

          <button 
            onClick={() => setActiveTab('minigame')} 
            className={`btn-secondary ${activeTab === 'minigame' ? 'active-neon-btn' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          >
            <Sparkles size={16} /> Roleta Sparty
          </button>

          <button 
            onClick={() => setActiveTab('carpools')} 
            className={`btn-secondary ${activeTab === 'carpools' ? 'active-neon-btn' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          >
            <Car size={16} /> Caronas e Rides
          </button>

          <button 
            onClick={() => setActiveTab('my-tickets')} 
            className={`btn-secondary ${activeTab === 'my-tickets' ? 'active-neon-btn' : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
          >
            <TicketIcon size={16} /> Meus Ingressos
          </button>

          {isLoggedIn && activeUserRole === 'PRODUTORA' && (
            <button 
              onClick={() => setActiveTab('dashboard')} 
              className={`btn-secondary ${activeTab === 'dashboard' ? 'active-neon-btn' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap', border: '1px solid var(--primary-color)' }}
            >
              <DollarSign size={16} /> Painel Produtora
            </button>
          )}
        </div>
      </div>

      <div className="container" style={{ flex: 1, paddingBottom: '50px' }}>
        
        {/* Global Success / Error banners */}
        {errorMsg && (
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255, 76, 76, 0.1)', color: 'var(--danger)', border: '1px solid rgba(255, 76, 76, 0.2)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px' }}>
            <AlertTriangle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="glass-panel" style={{ padding: '16px', background: 'rgba(46, 204, 113, 0.1)', color: 'var(--success)', border: '1px solid rgba(46, 204, 113, 0.2)', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderRadius: '12px' }}>
            <CheckCircle2 size={20} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* ========================================================
            TAB 1: EXPLORAR EVENTOS
           ======================================================== */}
        {activeTab === 'events' && (
          <>
            <CategoryTabs activeCategory={activeCategory} onSelectCategory={setActiveCategory} />
            
            {loadingEvents ? (
              <div style={{ textAlign: 'center', padding: '100px 0' }}>
                <div className="spinner" style={{ margin: '0 auto 20px auto' }}></div>
                <p style={{ color: 'var(--text-muted)' }}>Carregando eventos...</p>
              </div>
            ) : filteredEvents.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '24px' }}>
                {filteredEvents.map((event, index) => {
                  // Check if attendee count is provided recursively
                  const attendees = event._count?.tickets || 0;
                  return (
                    <div key={event.id} style={{ position: 'relative' }}>
                      <EventCard
                        event={{
                          id: event.id,
                          title: event.title,
                          category: event.category,
                          date: event.date,
                          imageUrl: event.imageUrl || 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
                          price: event.price,
                          score: event.score,
                          votes: event.votes,
                          location: event.venue,
                        }}
                        rankIndex={index + 1}
                        onVoteClick={() => setSelectedEventToVote(event)}
                        onBuyClick={() => setSelectedEventToBuy(event)}
                        canVote={isVotingOpen(event.date)}
                        hasTicket={myTickets.some(t => t.eventId === event.id && t.status === 'APPROVED')}
                        hasVoted={false}
                        isVotingOpen={isVotingOpen(event.date)}
                      />
                      
                      {/* Social attendance badge: "Quem vai" tracking */}
                      <div className="glass-panel flex-center" style={{ position: 'absolute', top: '15px', right: '15px', padding: '6px 12px', gap: '6px', fontSize: '0.8rem', borderRadius: '20px', zIndex: 5, background: 'rgba(0,0,0,0.5)' }}>
                        <Users size={12} color="var(--primary-color)" />
                        <span>{attendees} confirmados</span>
                      </div>

                      {/* Ride hailing integration directly inside explore grid */}
                      <div style={{ marginTop: '-12px', padding: '0 12px 12px 12px' }}>
                        <a 
                          href={getUberLink(event.venue)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="glass-panel flex-center hover-scale"
                          style={{ background: 'rgba(255,255,255,0.03)', padding: '8px', fontSize: '0.8rem', borderRadius: '0 0 12px 12px', borderTop: 'none', gap: '6px', color: 'var(--text-muted)' }}
                        >
                          Ir de Uber ao evento <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-panel flex-center" style={{ padding: '60px 20px', flexDirection: 'column' }}>
                <Compass size={48} style={{ color: 'var(--text-muted)', marginBottom: '15px' }} />
                <p style={{ color: 'var(--text-muted)' }}>Nenhum evento ativo nesta categoria no momento.</p>
              </div>
            )}
          </>
        )}

        {/* ========================================================
            TAB 2: FEED SOCIAL
           ======================================================== */}
        {activeTab === 'social' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '30px', alignItems: 'start' }}>
            
            {/* Feed timeline */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Post creator form */}
              <form onSubmit={handleCreatePost} className="glass-panel" style={{ padding: '24px' }}>
                <h3 style={{ marginBottom: '16px', fontSize: '1.2rem', fontWeight: 700 }}>O que está rolando na cena?</h3>
                
                {!isLoggedIn && (
                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Seu Nome (Visitante)</label>
                    <input
                      type="text"
                      required
                      value={newPostGuestName}
                      onChange={(e) => setNewPostGuestName(e.target.value)}
                      placeholder="Ex: Pedro Alvares"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white' }}
                    />
                  </div>
                )}

                <textarea
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Escreva algo sobre uma festa, compartilhe seu cupom ou comente sobre as caronas!"
                  required
                  rows={3}
                  style={{ width: '100%', padding: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', borderRadius: '8px', color: 'white', fontFamily: 'inherit', resize: 'none', marginBottom: '12px' }}
                />

                <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
                  <input
                    type="text"
                    value={newPostImage}
                    onChange={(e) => setNewPostImage(e.target.value)}
                    placeholder="URL de uma imagem (opcional)"
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                  />

                  <select
                    value={newPostEventId}
                    onChange={(e) => setNewPostEventId(e.target.value)}
                    style={{ padding: '10px', borderRadius: '8px', background: '#131921', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                  >
                    <option value="">Marcar Evento (opcional)</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title}</option>
                    ))}
                  </select>
                </div>

                <button type="submit" disabled={postSubmitting} className="btn-primary" style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', marginLeft: 'auto' }}>
                  {postSubmitting ? 'Publicando...' : 'Publicar'} <Send size={14} />
                </button>
              </form>

              {/* Feed lists */}
              {loadingPosts ? (
                <div style={{ textAlign: 'center', padding: '50px 0' }}>
                  <div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>
                  <p style={{ color: 'var(--text-muted)' }}>Buscando feed...</p>
                </div>
              ) : posts.length > 0 ? (
                posts.map(post => (
                  <div key={post.id} className="glass-panel" style={{ padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                        <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyItems: 'center', paddingLeft: '8px' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>{post.user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600 }}>{post.user.name}</span>
                            <span style={{ fontSize: '0.7rem', padding: '2px 6px', background: post.user.role === 'PRODUTORA' ? 'var(--primary-color)' : 'rgba(255,255,255,0.1)', color: post.user.role === 'PRODUTORA' ? 'black' : 'white', borderRadius: '4px', fontWeight: 700 }}>
                              {post.user.role}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{new Date(post.createdAt).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>

                      {post.event && (
                        <span style={{ fontSize: '0.75rem', background: 'rgba(102, 252, 241, 0.1)', color: 'var(--primary-color)', padding: '4px 10px', borderRadius: '12px' }}>
                          🏷️ {post.event.title}
                        </span>
                      )}
                    </div>

                    <p style={{ lineHeight: '1.5', marginBottom: post.imageUrl ? '15px' : '20px' }}>{post.content}</p>

                    {post.imageUrl && (
                      <img src={post.imageUrl} alt="Post Attachment" style={{ width: '100%', maxHeight: '350px', objectFit: 'cover', borderRadius: '12px', marginBottom: '20px' }} />
                    )}

                    {/* Comments section */}
                    <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '15px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                        <MessageSquare size={14} /> Comentários ({post.comments.length})
                      </span>

                      {post.comments.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '15px', maxHeight: '200px', overflowY: 'auto', background: 'rgba(0,0,0,0.15)', padding: '12px', borderRadius: '8px' }}>
                          {post.comments.map(comment => (
                            <div key={comment.id} style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>
                              <strong style={{ color: 'var(--primary-color)' }}>{comment.user.name}:</strong> {comment.content}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment composer */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {!isLoggedIn && (
                          <input
                            type="text"
                            placeholder="Seu Nome (Visitante)"
                            value={commentGuestName[post.id] || ''}
                            onChange={(e) => setCommentGuestName(prev => ({ ...prev, [post.id]: e.target.value }))}
                            style={{ padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.8rem' }}
                          />
                        )}

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <input
                            type="text"
                            placeholder="Escreva um comentário..."
                            value={commentInput[post.id] || ''}
                            onChange={(e) => setCommentInput(prev => ({ ...prev, [post.id]: e.target.value }))}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                          />
                          <button onClick={() => handleCreateComment(post.id)} className="btn-secondary" style={{ padding: '0 15px', fontSize: '0.85rem' }}>
                            Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="glass-panel flex-center" style={{ padding: '40px', flexDirection: 'column', color: 'var(--text-muted)' }}>
                  <MessageSquare size={36} style={{ marginBottom: '10px' }} />
                  <p>Ainda não há publicações. Seja o primeiro a criar!</p>
                </div>
              )}
            </div>

            {/* Sidebar with dynamic active events stats */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <TrendingUp size={16} color="var(--primary-color)" /> Eventos Bombando
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {events.slice(0, 3).map(ev => {
                  const attendees = ev._count?.tickets || 0;
                  return (
                    <div key={ev.id} style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '0.85rem' }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600 }}>{ev.title}</div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{attendees} confirmados • ⭐ {ev.score.toFixed(1)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: SPIN THE WHEEL MINI-GAME
           ======================================================== */}
        {activeTab === 'minigame' && (
          <div className="glass-panel flex-center" style={{ padding: '50px 20px', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, textAlign: 'center', marginBottom: '8px' }}>
              SPARTY <span style={{ color: 'var(--primary-color)' }}>WHEEL</span> 🎡
            </h2>
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', maxWidth: '500px', marginBottom: '20px', fontSize: '0.95rem' }}>
              Gire a Roleta da LetsParty e ganhe cupons de desconto incríveis para garantir o seu ingresso com até 25% OFF! (Limite: 1 giro por rodada)
            </p>

            {!isLoggedIn ? (
              <div className="glass-panel text-center animate-fade-in" style={{ padding: '20px', background: 'rgba(255, 0, 122, 0.05)', border: '1px solid var(--accent-color)', maxWidth: '450px', marginBottom: '40px' }}>
                <span style={{ fontWeight: 700, color: 'var(--accent-color)', display: 'block', marginBottom: '6px' }}>🔒 Autenticação Necessária</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Você precisa entrar com a sua conta LetsParty para acumular ingressos e girar a roleta.</p>
              </div>
            ) : (
              <div className="flex-center animate-fade-in" style={{ flexDirection: 'column', gap: '8px', marginBottom: '40px' }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 700, padding: '6px 20px', borderRadius: '20px', background: 'rgba(0, 245, 230, 0.1)', border: '1px solid rgba(0, 245, 230, 0.3)', color: 'var(--primary-color)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  ✨ {availableSpins} {availableSpins === 1 ? 'Giro Disponível' : 'Giros Disponíveis'}
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  (Você ganha **1 giro** a cada **2 ingressos aprovados** comprados!)
                </span>
              </div>
            )}

            <div style={{ position: 'relative', width: '280px', height: '280px', marginBottom: '40px' }}>
              {/* Center Pin Indicator */}
              <div style={{ position: 'absolute', top: '-15px', left: 'calc(50% - 15px)', width: '30px', height: '30px', background: 'var(--primary-color)', clipPath: 'polygon(50% 100%, 0 0, 100% 0)', zIndex: 10, filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.5))' }}></div>
              
              {/* Wheel Body with dynamic rotating keyframe */}
              <div 
                className={isSpinning ? 'spinning-wheel' : ''}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: '50%',
                  border: '10px solid #131921',
                  background: 'conic-gradient(#ff007a 0deg 72deg, #a100ff 72deg 144deg, #00f5e6 144deg 216deg, #f1c40f 216deg 288deg, #2ecc71 288deg 360deg)',
                  boxShadow: '0 0 25px rgba(102, 252, 241, 0.25), inset 0 0 15px rgba(0,0,0,0.8)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'black',
                  fontWeight: 800,
                  fontSize: '0.8rem',
                  position: 'relative',
                  transform: wheelResult !== null ? `rotate(${360 * 4 - wheelResult * 72}deg)` : 'rotate(0deg)',
                  transition: isSpinning ? 'none' : 'transform 3s cubic-bezier(0.15, 0.85, 0.35, 1)'
                }}
              >
                {/* Text Slices inside the wheel */}
                <div style={{ position: 'absolute', transform: 'rotate(36deg) translateY(-85px)', color: 'white' }}>5%</div>
                <div style={{ position: 'absolute', transform: 'rotate(108deg) translateY(-85px)', color: 'white' }}>10%</div>
                <div style={{ position: 'absolute', transform: 'rotate(180deg) translateY(-85px)', color: 'black' }}>15%</div>
                <div style={{ position: 'absolute', transform: 'rotate(252deg) translateY(-85px)', color: 'black' }}>20%</div>
                <div style={{ position: 'absolute', transform: 'rotate(324deg) translateY(-85px)', color: 'white' }}>25%</div>

                {/* Core Pin */}
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#131921', border: '3px solid white', zIndex: 5, boxShadow: '0 0 10px rgba(0,0,0,0.5)' }}></div>
              </div>
            </div>

            <button 
              onClick={spinWheel} 
              disabled={isSpinning || availableSpins === 0 || !isLoggedIn} 
              className="btn-primary" 
              style={{ padding: '12px 35px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.05rem', opacity: (isSpinning || availableSpins === 0 || !isLoggedIn) ? 0.6 : 1 }}
            >
              {isSpinning ? 'Girando...' : !isLoggedIn ? 'Acesse sua conta para jogar 🔒' : availableSpins === 0 ? 'Sem Giros Disponíveis 🔒' : 'Girar Roleta!'}
            </button>


            {wonCoupon && (
              <div className="glass-panel animate-fade-in flex-center" style={{ marginTop: '40px', padding: '24px', flexWrap: 'wrap', gap: '15px', background: 'rgba(102,252,241,0.05)', border: '1px solid var(--primary-color)' }}>
                <Gift size={24} color="var(--primary-color)" />
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '4px' }}>Você Ativou: {wonDiscount}% OFF!</h4>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Copie o código e use no checkout para ter desconto imediato!</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <span style={{ background: '#131921', border: '1px dashed var(--primary-color)', padding: '10px 18px', borderRadius: '8px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--primary-color)', fontSize: '1.2rem', letterSpacing: '1px' }}>
                    {wonCoupon}
                  </span>
                  <button onClick={() => {
                    navigator.clipboard.writeText(wonCoupon);
                    setSuccessMsg('Cupom copiado para a área de transferência! Cole no checkout.');
                  }} className="btn-secondary">Copiar</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: SESSÃO MOTORISTA PARCEIRO & CARONAS
           ======================================================== */}
        {activeTab === 'carpools' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', alignItems: 'start' }}>
            
            {/* Left listings */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '20px' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Compass size={18} color="var(--primary-color)" /> Caronas Disponíveis
                </h3>
                
                {/* Select Event filter for carpools */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '6px' }}>Filtrar por Evento</label>
                  <select
                    value={selectedEventForCarpool}
                    onChange={(e) => setSelectedEventForCarpool(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#131921', border: '1px solid var(--surface-border)', color: 'white' }}
                  >
                    <option value="">Selecione um evento...</option>
                    {events.map(ev => (
                      <option key={ev.id} value={ev.id}>{ev.title} ({ev.venue})</option>
                    ))}
                  </select>
                </div>

                {loadingCarpools ? (
                  <div style={{ textAlign: 'center', padding: '30px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>
                    <p style={{ color: 'var(--text-muted)' }}>Buscando caronas...</p>
                  </div>
                ) : carpools.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {carpools.map(car => {
                      const seatsTaken = car.passengers.length;
                      const seatsLeft = car.availableSeats - seatsTaken;
                      
                      return (
                        <div key={car.id} className="glass-panel" style={{ padding: '18px', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--secondary-color)', display: 'flex', alignItems: 'center', justifyItems: 'center', paddingLeft: '6px' }}>
                                <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{car.driver.name.charAt(0).toUpperCase()}</span>
                              </div>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{car.driver.name}</span>
                                <div style={{ fontSize: '0.75rem', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Shield size={10} fill="var(--success)" /> Motorista Verificado Sóbrio
                                </div>
                              </div>
                            </div>
                            
                            <span style={{ fontSize: '0.8rem', padding: '4px 10px', background: seatsLeft > 0 ? 'rgba(46, 204, 113, 0.15)' : 'rgba(255,76,76,0.15)', color: seatsLeft > 0 ? 'var(--success)' : 'var(--danger)', borderRadius: '12px', fontWeight: 600 }}>
                              {seatsLeft > 0 ? `${seatsLeft} vagas livres` : 'Lotado'}
                            </span>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <MapPin size={12} color="var(--primary-color)" /> Partida: {car.departureLocation}
                            </div>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <Calendar size={12} color="var(--primary-color)" /> Horário: {new Date(car.departureTime).toLocaleString('pt-BR')}
                            </div>
                            {car.description && (
                              <p style={{ background: 'rgba(0,0,0,0.1)', padding: '8px', borderRadius: '6px', fontSize: '0.8rem' }}>"{car.description}"</p>
                            )}
                          </div>

                          {/* Request Ride Form */}
                          {seatsLeft > 0 && (
                            <div style={{ borderTop: '1px solid var(--surface-border)', paddingTop: '12px' }}>
                              {!isLoggedIn && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
                                  <input
                                    type="text"
                                    placeholder="Seu Nome"
                                    value={carpoolGuestNameForJoin[car.id] || ''}
                                    onChange={(e) => setCarpoolGuestNameForJoin(prev => ({ ...prev, [car.id]: e.target.value }))}
                                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.75rem' }}
                                  />
                                  <input
                                    type="text"
                                    placeholder="Seu Telefone"
                                    value={carpoolGuestPhoneForJoin[car.id] || ''}
                                    onChange={(e) => setCarpoolGuestPhoneForJoin(prev => ({ ...prev, [car.id]: e.target.value }))}
                                    style={{ padding: '8px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.75rem' }}
                                  />
                                </div>
                              )}
                              <button onClick={() => handleJoinCarpool(car.id)} className="btn-secondary" style={{ width: '100%', fontSize: '0.8rem', padding: '6px' }}>
                                Solicitar Assento
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="glass-panel flex-center" style={{ padding: '40px 10px', flexDirection: 'column', color: 'var(--text-muted)' }}>
                    <Car size={36} style={{ marginBottom: '10px' }} />
                    <p style={{ textAlign: 'center', fontSize: '0.85rem' }}>Nenhuma carona oferecida para este evento no momento. Seja o primeiro a oferecer!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right form with sobriety waiver */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--primary-color)" /> Oferecer Carona
              </h3>
              
              <div style={{ padding: '12px', background: 'rgba(102, 252, 241, 0.05)', border: '1px solid rgba(102, 252, 241, 0.15)', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, color: 'var(--primary-color)', marginBottom: '6px' }}>
                  <Shield size={14} /> Pacto de Responsabilidade
                </span>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.4' }}>
                  Ao cadastrar uma carona você concorda em assumir a liderança e pilotar 100% livre de bebidas alcoólicas. Contribua com vidas de seus amigos festeiros!
                </p>
              </div>

              <form onSubmit={handleCreateCarpool} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {!isLoggedIn && (
                  <>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Seu Nome (Visitante)</label>
                      <input
                        type="text"
                        required
                        value={newCarpoolGuestName}
                        onChange={(e) => setNewCarpoolGuestName(e.target.value)}
                        placeholder="Ex: Pedro Santos"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Seu Whatsapp/Contato</label>
                      <input
                        type="text"
                        required
                        value={newCarpoolGuestPhone}
                        onChange={(e) => setNewCarpoolGuestPhone(e.target.value)}
                        placeholder="Ex: (11) 99999-9999"
                        style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                      />
                    </div>
                  </>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Vagas Disponíveis</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    required
                    value={newCarpoolSeats}
                    onChange={(e) => setNewCarpoolSeats(Number(e.target.value))}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Local de Encontro / Partida</label>
                  <input
                    type="text"
                    required
                    value={newCarpoolLoc}
                    onChange={(e) => setNewCarpoolLoc(e.target.value)}
                    placeholder="Ex: Estação Consolação, Metrô Barra Funda"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Horário de Saída</label>
                  <input
                    type="datetime-local"
                    required
                    value={newCarpoolTime}
                    onChange={(e) => setNewCarpoolTime(e.target.value)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Comentários (Ex: Dividir Combustível, som do carro)</label>
                  <textarea
                    value={newCarpoolDesc}
                    onChange={(e) => setNewCarpoolDesc(e.target.value)}
                    placeholder="Espaço livre para detalhes da carona..."
                    rows={2}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'none' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', margin: '5px 0' }}>
                  <input
                    type="checkbox"
                    id="waiver"
                    checked={newCarpoolWaiver}
                    onChange={(e) => setNewCarpoolWaiver(e.target.checked)}
                    required
                    style={{ marginTop: '4px', cursor: 'pointer' }}
                  />
                  <label htmlFor="waiver" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', cursor: 'pointer', lineHeight: '1.3' }}>
                    Eu assino digitalmente o termo de sobriedade e me comprometo a conduzir em segurança livre de álcool.
                  </label>
                </div>

                <button type="submit" disabled={carpoolSubmitting || !newCarpoolWaiver} className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  {carpoolSubmitting ? 'Cadastrando...' : 'Cadastrar Carona'} <CheckCircle2 size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: MEUS INGRESSOS
           ======================================================== */}
        {activeTab === 'my-tickets' && (
          <div className="glass-panel" style={{ padding: '30px' }}>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <TicketIcon size={22} color="var(--primary-color)" /> Meus Ingressos Comprados
            </h3>

            {!isLoggedIn && (
              <div className="glass-panel" style={{ padding: '20px', background: 'rgba(255,255,255,0.01)', marginBottom: '30px' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--primary-color)', fontWeight: 600, display: 'block', marginBottom: '8px' }}>Consulta de Ingressos (Visitante)</span>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '16px' }}>Se você comprou como visitante (sem criar conta), insira seu email abaixo para listar seus ingressos e cupons ativos.</p>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <input
                    type="email"
                    value={guestEmailLookup}
                    onChange={(e) => setGuestEmailLookup(e.target.value)}
                    placeholder="Digite seu e-mail cadastrado..."
                    style={{ flex: 1, padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
                  />
                  <button onClick={() => fetchMyTickets(guestEmailLookup)} className="btn-primary">Buscar</button>
                </div>
              </div>
            )}

            {loadingMyTickets ? (
              <div style={{ textAlign: 'center', padding: '30px 0' }}>
                <div className="spinner" style={{ margin: '0 auto 10px auto' }}></div>
                <p style={{ color: 'var(--text-muted)' }}>Buscando ingressos...</p>
              </div>
            ) : myTickets.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {myTickets.map(t => {
                  const isTicketVerified = t.isVerified;

                  return (
                    <div key={t.id} className="glass-panel animate-fade-in" style={{ padding: '20px', borderLeft: `4px solid ${isTicketVerified ? 'var(--primary-color)' : 'var(--accent-color)'}` }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: isTicketVerified ? 'var(--primary-color)' : 'rgba(255,255,255,0.08)', color: isTicketVerified ? 'black' : 'white', borderRadius: '4px', fontWeight: 800, display: 'inline-block' }}>
                          🛡️ {t.status}
                        </span>
                        {!isTicketVerified && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: 'var(--accent-color)', color: 'white', borderRadius: '4px', fontWeight: 800, display: 'inline-block' }}>
                            ⚠️ REQUER OTP
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '8px' }}>{t.event.title}</h4>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} /> {new Date(t.event.date).toLocaleString('pt-BR')}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} /> {t.event.venue}
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', borderTop: '1px dashed var(--surface-border)', paddingTop: '10px', display: 'flex', justifyItems: 'space-between', fontWeight: 600 }}>
                        <span>Valor Pago:</span>
                        <span style={{ color: 'var(--primary-color)' }}>R$ {t.amount.toFixed(2)}</span>
                      </div>
                      
                      {isTicketVerified ? (
                        /* Uber direct deep-link only for verified tickets */
                        <a
                          href={getUberLink(t.event.venue)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-secondary hover-scale"
                          style={{ width: '100%', marginTop: '14px', fontSize: '0.8rem', padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}
                        >
                          Chamar Corrida (Uber) <ExternalLink size={12} />
                        </a>
                      ) : (
                        /* Verification button for unverified guest checkouts */
                        <button
                          onClick={() => setSelectedTicketToVerify(t)}
                          className="btn-primary hover-scale"
                          style={{ width: '100%', marginTop: '14px', fontSize: '0.8rem', padding: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                        >
                          Verificar Código OTP 🛡️
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-panel flex-center" style={{ padding: '40px 10px', flexDirection: 'column', color: 'var(--text-muted)' }}>
                <TicketIcon size={36} style={{ marginBottom: '10px' }} />
                <p>Nenhum ingresso encontrado.</p>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 6: PAINEL DA PRODUTORA
           ======================================================== */}
        {activeTab === 'dashboard' && isLoggedIn && activeUserRole === 'PRODUTORA' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '30px', alignItems: 'start' }}>
            
            {/* Left Financial Statistics */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel animate-fade-in" style={{ padding: '24px' }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '20px', borderBottom: '1px solid var(--surface-border)', paddingBottom: '10px' }}>
                  📊 Resumo Financeiro da Produtora
                </h3>

                {loadingStats ? (
                  <div style={{ textAlign: 'center', padding: '40px 0' }}>
                    <div className="spinner" style={{ margin: '0 auto' }}></div>
                  </div>
                ) : financialStats ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '30px' }}>
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Ingressos Vendidos</span>
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-color)' }}>{financialStats.totalTicketsSold}</span>
                      </div>
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Receita Bruta</span>
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-color)' }}>R$ {financialStats.totalGrossRevenue.toFixed(2)}</span>
                      </div>
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Taxas Retidas (10%)</span>
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>R$ {financialStats.totalPlatformFees.toFixed(2)}</span>
                      </div>
                      <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255,255,255,0.01)' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>Lucro Líquido Recebido</span>
                        <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--success)' }}>R$ {financialStats.totalNetRevenue.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Chart list using pure CSS bars */}
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '14px' }}>Vendas por Evento</h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {financialStats.eventStats.map((item: any) => {
                        const maxVal = Math.max(...financialStats.eventStats.map((e: any) => e.grossRevenue), 1);
                        const pct = (item.grossRevenue / maxVal) * 100;
                        return (
                          <div key={item.id} style={{ fontSize: '0.8rem' }}>
                            <div style={{ display: 'flex', justifyItems: 'space-between', marginBottom: '4px', fontWeight: 600 }}>
                              <span style={{ flex: 1 }}>{item.title}</span>
                              <span style={{ color: 'var(--primary-color)' }}>R$ {item.grossRevenue.toFixed(2)} ({item.ticketsCount} vds)</span>
                            </div>
                            <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary-color), var(--secondary-color))', borderRadius: '4px' }}></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <p style={{ color: 'var(--text-muted)' }}>Crie eventos para ver métricas financeiras.</p>
                )}
              </div>
            </div>

            {/* Right Create Event Form */}
            <div className="glass-panel" style={{ padding: '24px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Plus size={18} color="var(--primary-color)" /> Criar Novo Evento
              </h3>

              <form onSubmit={handleCreateEvent} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Título do Evento</label>
                  <input
                    type="text"
                    required
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="Ex: Warmup Electronic Sessions"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Categoria</label>
                    <select
                      value={newEventCategory}
                      onChange={(e) => setNewEventCategory(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: '#131921', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                    >
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Preço do Ingresso (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step="any"
                      required
                      value={newEventPrice}
                      onChange={(e) => setNewEventPrice(e.target.value)}
                      placeholder="Ex: 80.00"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Local / Estabelecimento</label>
                  <input
                    type="text"
                    required
                    value={newEventVenue}
                    onChange={(e) => setNewEventVenue(e.target.value)}
                    placeholder="Ex: Laroc Club, D-Edge"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Data e Hora</label>
                    <input
                      type="datetime-local"
                      required
                      value={newEventDate}
                      onChange={(e) => setNewEventDate(e.target.value)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Cidade (UF)</label>
                    <input
                      type="text"
                      value={newEventCity}
                      onChange={(e) => setNewEventCity(e.target.value)}
                      placeholder="Ex: Campinas - SP"
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>URL da Imagem do Evento</label>
                  <input
                    type="text"
                    value={newEventImage}
                    onChange={(e) => setNewEventImage(e.target.value)}
                    placeholder="URL de imagem ou deixe em branco"
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '4px' }}>Descrição do Evento</label>
                  <textarea
                    value={newEventDesc}
                    onChange={(e) => setNewEventDesc(e.target.value)}
                    placeholder="Fale um pouco sobre as atrações, line-up e regras do evento..."
                    rows={3}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--surface-border)', color: 'white', fontSize: '0.85rem', fontFamily: 'inherit', resize: 'none' }}
                  />
                </div>

                <button type="submit" disabled={eventSubmitting} className="btn-primary" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                  {eventSubmitting ? 'Cadastrando...' : 'Publicar Evento'} <Plus size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================
          Unified Modals
         ======================================================== */}
      {selectedEventToVote && (
        <RatingModal 
          eventName={selectedEventToVote.title}
          onClose={() => setSelectedEventToVote(null)}
          onSubmit={handleRatingSubmit}
        />
      )}

      {selectedEventToBuy && (
        <TicketModal 
          eventName={selectedEventToBuy.title}
          price={selectedEventToBuy.price}
          isLoggedIn={isLoggedIn}
          onClose={() => setSelectedEventToBuy(null)}
          onConfirm={handleTicketConfirm}
        />
      )}

      {selectedTicketToVerify && (
        <div className="modalOverlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <form onSubmit={handleVerifyTicket} className="glass-panel animate-fade-in" style={{
            width: '100%', maxWidth: '400px', padding: '32px', position: 'relative'
          }}>
            <button type="button" onClick={() => setSelectedTicketToVerify(null)} className="closeBtn" style={{
              position: 'absolute', top: '16px', right: '16px', color: 'var(--text-muted)'
            }}>
              <X size={24} />
            </button>

            <div className="flex-center" style={{ marginBottom: '16px', color: 'var(--accent-color)' }}>
              <Shield size={48} />
            </div>

            <h2 className="modalTitle" style={{ marginBottom: '12px' }}>
              Confirmar E-mail
            </h2>

            <p style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.4' }}>
              Insira o código de **6 dígitos** enviado para seu e-mail para ativar seu ingresso para <strong>{selectedTicketToVerify.event.title}</strong>.
            </p>

            <div style={{ marginBottom: '24px' }}>
              <input
                type="text"
                maxLength={6}
                required
                value={verificationOtpInput}
                onChange={(e) => setVerificationOtpInput(e.target.value.replace(/\D/g, ''))}
                placeholder="000000"
                style={{
                  width: '100%', padding: '12px', borderRadius: '8px',
                  background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)',
                  color: 'white', fontSize: '1.5rem', textAlign: 'center', letterSpacing: '8px', fontWeight: 700
                }}
              />
            </div>

            <button
              type="submit"
              disabled={verifyingTicket || verificationOtpInput.length !== 6}
              className="btn-primary hover-scale"
              style={{ width: '100%', background: 'linear-gradient(135deg, var(--accent-color) 0%, #d00060 100%)', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {verifyingTicket ? 'Ativando...' : 'Ativar Ingresso'}
            </button>
          </form>
        </div>
      )}
    </main>
  );
}
