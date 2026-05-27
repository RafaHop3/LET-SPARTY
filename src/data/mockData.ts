export const CATEGORIES = [
  'Eletrônica',
  'Sertanejo',
  'Funk',
  'Rock',
  'Pagode/Samba',
  'Rap/Trap'
];

export interface Event {
  id: string;
  title: string;
  category: string;
  date: string; // ISO String
  imageUrl: string;
  price: number;
  score: number; // 0 to 10
  votes: number;
  location: string;
}

// Generate some dates relative to now to test the voting logic
const now = new Date();
const pastEventDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago (Voting ACTIVE)
const futureEventDate = new Date(now.getTime() + 48 * 60 * 60 * 1000); // 48 hours from now (Voting CLOSED)
const veryOldEventDate = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago (Voting CLOSED)

export const MOCK_EVENTS: Event[] = [
  {
    id: 'e1',
    title: 'Neon Nights Festival',
    category: 'Eletrônica',
    date: futureEventDate.toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=800&auto=format&fit=crop',
    price: 150.00,
    score: 9.8,
    votes: 342,
    location: 'São Paulo, SP'
  },
  {
    id: 'e2',
    title: 'Vintage Culture Open Air',
    category: 'Eletrônica',
    date: pastEventDate.toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1540039155733-56f1c3ce8e34?q=80&w=800&auto=format&fit=crop',
    price: 200.00,
    score: 9.9,
    votes: 512,
    location: 'Campinas, SP'
  },
  {
    id: 'e3',
    title: 'Sertanejo In the Park',
    category: 'Sertanejo',
    date: futureEventDate.toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1506157786151-b8491531f063?q=80&w=800&auto=format&fit=crop',
    price: 120.00,
    score: 8.5,
    votes: 120,
    location: 'Goiânia, GO'
  },
  {
    id: 'e4',
    title: 'Baile da Gaiola',
    category: 'Funk',
    date: pastEventDate.toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1574169208507-84376144848b?q=80&w=800&auto=format&fit=crop',
    price: 80.00,
    score: 9.1,
    votes: 890,
    location: 'Rio de Janeiro, RJ'
  },
  {
    id: 'e5',
    title: 'Rock in Rio',
    category: 'Rock',
    date: veryOldEventDate.toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1459749411175-04bf5292ceea?q=80&w=800&auto=format&fit=crop',
    price: 450.00,
    score: 9.5,
    votes: 1500,
    location: 'Rio de Janeiro, RJ'
  },
  {
    id: 'e6',
    title: 'Tardezinha',
    category: 'Pagode/Samba',
    date: futureEventDate.toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1533174000222-95cd28daec87?q=80&w=800&auto=format&fit=crop',
    price: 180.00,
    score: 9.7,
    votes: 600,
    location: 'São Paulo, SP'
  },
  {
    id: 'e7',
    title: 'Cena 2K24',
    category: 'Rap/Trap',
    date: pastEventDate.toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a1a2a5f5f9af?q=80&w=800&auto=format&fit=crop',
    price: 100.00,
    score: 8.9,
    votes: 450,
    location: 'São Paulo, SP'
  },
  {
    id: 'e8',
    title: 'Illusionize Secret',
    category: 'Eletrônica',
    date: futureEventDate.toISOString(),
    imageUrl: 'https://images.unsplash.com/photo-1505236858219-8359eb29e329?q=80&w=800&auto=format&fit=crop',
    price: 130.00,
    score: 8.2,
    votes: 95,
    location: 'Belo Horizonte, MG'
  }
];

export interface User {
  id: string;
  name: string;
  purchasedTickets: string[]; // Event IDs
  votedEvents: string[]; // Event IDs
}

export const MOCK_USER: User = {
  id: 'u1',
  name: 'Rafael',
  purchasedTickets: ['e2', 'e4', 'e5', 'e7'], // Bought tickets for some past and future events
  votedEvents: ['e5'] // Already voted on the old event
};
