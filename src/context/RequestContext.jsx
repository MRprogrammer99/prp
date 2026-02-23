import { createContext, useContext, useState, useEffect } from 'react';

const RequestContext = createContext();

export function RequestProvider({ children }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/requests');
      const data = await res.json();
      setRequests(data);
    } catch (e) {
      console.error('Failed to fetch requests:', e);
    } finally {
      setLoading(false);
    }
  };

  const addRequest = async (request) => {
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
      });
      const newRequest = await res.json();
      setRequests((prev) => [newRequest, ...prev]);
      return newRequest;
    } catch (e) {
      console.error('Failed to add request:', e);
    }
  };

  const updateStatus = async (id, updates) => {
    try {
      await fetch(`/api/requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      setRequests((prev) =>
        prev.map((req) => (req.id === id ? { ...req, ...updates } : req))
      );
    } catch (e) {
      console.error('Failed to update request:', e);
    }
  };

  const trackRequest = async (phone) => {
    try {
      const res = await fetch(`/api/requests/track/${encodeURIComponent(phone)}`);
      return await res.json();
    } catch (e) {
      console.error('Failed to track request:', e);
      return [];
    }
  };

  const deleteRequest = async (id) => {
    try {
      await fetch(`/api/requests/${id}`, { method: 'DELETE' });
      setRequests((prev) => prev.filter((req) => req.id !== id));
    } catch (e) {
      console.error('Failed to delete request:', e);
    }
  };

  return (
    <RequestContext.Provider
      value={{ requests, loading, addRequest, updateStatus, deleteRequest, trackRequest, refresh: fetchRequests }}
    >
      {children}
    </RequestContext.Provider>
  );
}

export function useRequests() {
  const context = useContext(RequestContext);
  if (!context) {
    throw new Error('useRequests must be used within a RequestProvider');
  }
  return context;
}
