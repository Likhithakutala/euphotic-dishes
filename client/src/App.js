import React, { useEffect, useState, useRef, useCallback } from 'react';
import DishCard from './DishCard';
import './App.css';

const API_BASE = 'http://localhost:5000/api';

function App() {
  const [dishes, setDishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connected, setConnected] = useState(false);
  const [notification, setNotification] = useState(null);
  const [togglingIds, setTogglingIds] = useState(new Set());
  const [filter, setFilter] = useState('all'); // all | published | unpublished
  const eventSourceRef = useRef(null);
  const notifTimerRef = useRef(null);

  const showNotif = useCallback((msg, type = 'info') => {
    if (notifTimerRef.current) clearTimeout(notifTimerRef.current);
    setNotification({ msg, type });
    notifTimerRef.current = setTimeout(() => setNotification(null), 3000);
  }, []);

  const fetchDishes = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/dishes`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setDishes(data);
      setError(null);
    } catch (e) {
      setError('Cannot reach server. Make sure the backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE for real-time updates
  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`${API_BASE}/stream`);
      eventSourceRef.current = es;

      es.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.type === 'connected') {
          setConnected(true);
        } else if (data.type === 'TOGGLE') {
          const dish = data.dish;
          setDishes(prev =>
            prev.map(d => d.dishId === dish.dishId ? dish : d)
          );
          showNotif(
            `"${dish.dishName}" was ${dish.isPublished ? 'published' : 'unpublished'} remotely`,
            dish.isPublished ? 'success' : 'warning'
          );
        }
      };

      es.onerror = () => {
        setConnected(false);
        es.close();
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };
    };

    connect();
    return () => {
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [showNotif]);

  useEffect(() => {
    fetchDishes();
  }, [fetchDishes]);

  const handleToggle = async (dishId) => {
    if (togglingIds.has(dishId)) return;
    setTogglingIds(prev => new Set([...prev, dishId]));

    // Optimistic update
    setDishes(prev =>
      prev.map(d => d.dishId === dishId ? { ...d, isPublished: !d.isPublished } : d)
    );

    try {
      const res = await fetch(`${API_BASE}/dishes/${dishId}/toggle`, { method: 'PATCH' });
      if (!res.ok) throw new Error();
      const updated = await res.json();
      setDishes(prev => prev.map(d => d.dishId === dishId ? updated : d));
      showNotif(
        `"${updated.dishName}" ${updated.isPublished ? 'published' : 'unpublished'}`,
        updated.isPublished ? 'success' : 'warning'
      );
    } catch {
      // Rollback
      setDishes(prev =>
        prev.map(d => d.dishId === dishId ? { ...d, isPublished: !d.isPublished } : d)
      );
      showNotif('Toggle failed. Try again.', 'error');
    } finally {
      setTogglingIds(prev => {
        const next = new Set(prev);
        next.delete(dishId);
        return next;
      });
    }
  };

  const filtered = dishes.filter(d => {
    if (filter === 'published') return d.isPublished;
    if (filter === 'unpublished') return !d.isPublished;
    return true;
  });

  const publishedCount = dishes.filter(d => d.isPublished).length;

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-inner">
          <div className="header-left">
            <span className="logo">🍽️</span>
            <div>
              <h1>Nosh Dashboard</h1>
              <p className="subtitle">Manage your dish catalog</p>
            </div>
          </div>
          <div className="header-right">
            <div className={`sse-badge ${connected ? 'connected' : 'disconnected'}`}>
              <span className="dot" />
              {connected ? 'Live' : 'Reconnecting...'}
            </div>
          </div>
        </div>
      </header>

      {/* Notification toast */}
      {notification && (
        <div className={`toast toast-${notification.type}`}>
          {notification.type === 'success' && '✅ '}
          {notification.type === 'warning' && '⚠️ '}
          {notification.type === 'error' && '❌ '}
          {notification.msg}
        </div>
      )}

      <main className="main">
        {/* Stats bar */}
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-num">{dishes.length}</span>
            <span className="stat-label">Total Dishes</span>
          </div>
          <div className="stat">
            <span className="stat-num published">{publishedCount}</span>
            <span className="stat-label">Published</span>
          </div>
          <div className="stat">
            <span className="stat-num unpublished">{dishes.length - publishedCount}</span>
            <span className="stat-label">Unpublished</span>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="filters">
          {['all', 'published', 'unpublished'].map(f => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="center-msg">
            <div className="spinner" />
            <p>Loading dishes...</p>
          </div>
        ) : error ? (
          <div className="center-msg error-msg">
            <p>⚠️ {error}</p>
            <button className="retry-btn" onClick={fetchDishes}>Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="center-msg">
            <p>No dishes in this category.</p>
          </div>
        ) : (
          <div className="grid">
            {filtered.map(dish => (
              <DishCard
                key={dish.dishId}
                dish={dish}
                isToggling={togglingIds.has(dish.dishId)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
