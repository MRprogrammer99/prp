import { createContext, useContext, useReducer, useEffect } from 'react';

const RequestContext = createContext();

const STORAGE_KEY = 'movie_requests';

function loadRequests() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load requests from localStorage:', e);
  }
  return [];
}

function requestReducer(state, action) {
  switch (action.type) {
    case 'ADD_REQUEST':
      return [...state, action.payload];

    case 'UPDATE_STATUS':
      return state.map((req) =>
        req.id === action.payload.id
          ? { ...req, status: action.payload.status }
          : req
      );

    case 'DELETE_REQUEST':
      return state.filter((req) => req.id !== action.payload);

    default:
      return state;
  }
}

export function RequestProvider({ children }) {
  const [requests, dispatch] = useReducer(requestReducer, null, loadRequests);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }, [requests]);

  const addRequest = (request) => {
    const newRequest = {
      ...request,
      id: Date.now(),
      status: 'processing',
      date: new Date().toLocaleDateString('en-GB'),
    };
    dispatch({ type: 'ADD_REQUEST', payload: newRequest });
    return newRequest;
  };

  const updateStatus = (id, status) => {
    dispatch({ type: 'UPDATE_STATUS', payload: { id, status } });
  };

  const deleteRequest = (id) => {
    dispatch({ type: 'DELETE_REQUEST', payload: id });
  };

  return (
    <RequestContext.Provider
      value={{ requests, addRequest, updateStatus, deleteRequest }}
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
