'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../components/components.module.css';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const res = await signIn('credentials', {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      setError(res.error);
    } else {
      router.push('/');
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '40px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>LETS<span style={{ color: 'var(--primary-color)' }}>PARTY</span></h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Bem-vindo de volta!</p>
        </div>

        {error && (
          <div style={{ background: 'rgba(255, 76, 76, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '10px' }}>
            Entrar
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '30px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Ainda não tem uma conta?{' '}
          <Link href="/register" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
            Cadastre-se
          </Link>
        </div>
      </div>
    </div>
  );
}
