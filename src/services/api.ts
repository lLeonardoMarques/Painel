// src/services/api.ts

// Função para obter o token do localStorage
export const getToken = (): string | null => {
  try {
    const user = localStorage.getItem("logistics_user");
    if (user) {
      const parsed = JSON.parse(user);
      return parsed.token || null;
    }
  } catch (error) {
    console.error("Erro ao ler token:", error);
  }
  return null;
};

// Função para fazer requisições autenticadas
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getToken();
  
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "Accept": "application/json",
    ...options.headers
  };

  // Adiciona o token no header Authorization
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers
  });

  // Se retornar 401 (não autorizado), remove o token e redireciona para login
  if (response.status === 401) {
    localStorage.removeItem("logistics_user");
    window.location.href = "/";
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  return response;
};

// API específica para cada endpoint
export const api = {
  // Capacidades
  getCapacidades: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiFetch(`/api/capacidades${queryString}`);
  },

  // Metas
  saveMetaInbound: (data: any) => {
    return apiFetch('/api/Metas/Inbound', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  saveMetaOutbound: (data: any) => {
    return apiFetch('/api/Metas/Outbound', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  // Dashboard
  getDashboard: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiFetch(`/api/dashboard${queryString}`);
  },

  // Relatórios
  getRelatorios: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiFetch(`/api/relatorios${queryString}`);
  }
};