'use client';

import React from 'react';
import { User, Ticket, Bell, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import styles from './components.module.css';

export default function Header() {
  const { data: session } = useSession();

  return (
    <header className={`${styles.header} glass-panel flex-between`}>
      <Link href="/">
        <div className={styles.logo}>
          <h1>LETS<span className={styles.highlight}>PARTY</span></h1>
        </div>
      </Link>
      
      <div className={styles.navActions}>
        {session ? (
          <>
            <button className={styles.iconBtn} aria-label="Notificações">
              <Bell size={20} />
            </button>
            <button className={styles.iconBtn} aria-label="Meus Ingressos">
              <Ticket size={20} />
            </button>
            <div className={`${styles.userProfile} flex-center`}>
              <div className={styles.avatar}>
                <User size={18} />
              </div>
              <span>{session.user?.name}</span>
            </div>
            <button 
              className={styles.iconBtn} 
              aria-label="Sair"
              onClick={() => signOut()}
              title="Sair"
            >
              <LogOut size={20} />
            </button>
          </>
        ) : (
          <Link href="/login">
            <button className="btn-primary">Entrar</button>
          </Link>
        )}
      </div>
    </header>
  );
}
