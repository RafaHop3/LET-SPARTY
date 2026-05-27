'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from '../../components/components.module.css';

export default function Register() {
  const [role, setRole] = useState<'FESTEIRO' | 'PRODUTORA'>('FESTEIRO');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cpf, setCpf] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          name,
          email,
          password,
          cpf: role === 'FESTEIRO' ? cpf : undefined,
          cnpj: role === 'PRODUTORA' ? cnpj : undefined,
          companyName: role === 'PRODUTORA' ? companyName : undefined,
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erro ao cadastrar');
        setLoading(false);
        return;
      }

      router.push('/login');
    } catch (err) {
      setError('Erro ao conectar com o servidor');
      setLoading(false);
    }
  };

  return (
    <div className="flex-center" style={{ minHeight: '100vh', padding: '20px' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '500px', padding: '40px 30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Criar Conta</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>Junte-se ao LETS PARTY</p>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
          <button 
            className={`btn-secondary ${role === 'FESTEIRO' ? styles.tabBtnActive : ''}`} 
            style={{ flex: 1, border: role === 'FESTEIRO' ? '1px solid var(--primary-color)' : '1px solid var(--surface-border)' }}
            onClick={() => setRole('FESTEIRO')}
          >
            Sou Festeiro
          </button>
          <button 
            className={`btn-secondary ${role === 'PRODUTORA' ? styles.tabBtnActive : ''}`} 
            style={{ flex: 1, border: role === 'PRODUTORA' ? '1px solid var(--primary-color)' : '1px solid var(--surface-border)' }}
            onClick={() => setRole('PRODUTORA')}
          >
            Sou Produtora
          </button>
        </div>

        {error && (
          <div style={{ background: 'rgba(255, 76, 76, 0.1)', color: 'var(--danger)', padding: '12px', borderRadius: '8px', marginBottom: '20px', textAlign: 'center' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              {role === 'FESTEIRO' ? 'Nome Completo' : 'Nome do Responsável'}
            </label>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>E-mail</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Senha</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
            />
          </div>

          {role === 'FESTEIRO' && (
            <div>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>CPF</label>
              <input 
                type="text" 
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                required
                placeholder="000.000.000-00"
                style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
              />
            </div>
          )}

          {role === 'PRODUTORA' && (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Nome da Empresa / Evento</label>
                <input 
                  type="text" 
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>CNPJ</label>
                <input 
                  type="text" 
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  required
                  placeholder="00.000.000/0000-00"
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--surface-border)', color: 'white' }}
                />
              </div>
            </>
          )}

          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%', marginTop: '10px', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Já tem uma conta?{' '}
          <Link href="/login" style={{ color: 'var(--primary-color)', fontWeight: 600 }}>
            Faça login
          </Link>
        </div>
      </div>
    </div>
  );
}
