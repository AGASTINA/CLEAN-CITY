// Update frontend to connect to backend API

const API_BASE_URL = 'http://localhost:5001/api';
let authToken = localStorage.getItem('authToken');

// API Helper Functions
const api = {
  // Authentication
  async login(email, password) {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (data.success) {
      authToken = data.token;
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('user', JSON.stringify(data.data));
    }
    return data;
  },

  async register(userData) {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
    return await response.json();
  },

  // Reports
  async createReport(formData) {
    const response = await fetch(`${API_BASE_URL}/reports`, {
      method: 'POST',
      headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {},
      body: formData // FormData with images
    });
    return await response.json();
  },

  async getReports(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/reports?${params}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return await response.json();
  },

  async getReport(id) {
    const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return await response.json();
  },

  // Dashboard
  async getDashboardOverview(wardNumber) {
    const params = wardNumber ? `?wardNumber=${wardNumber}` : '';
    const response = await fetch(`${API_BASE_URL}/dashboard/overview${params}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return await response.json();
  },

  async getTrends(days = 30) {
    const response = await fetch(`${API_BASE_URL}/dashboard/trends?days=${days}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return await response.json();
  },

  async getCircularEconomy() {
    const response = await fetch(`${API_BASE_URL}/dashboard/circular-economy`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return await response.json();
  },

  // Wards
  async getWards() {
    const response = await fetch(`${API_BASE_URL}/wards`);
    return await response.json();
  },

  async getWard(wardNumber) {
    const response = await fetch(`${API_BASE_URL}/wards/${wardNumber}`);
    return await response.json();
  },

  async getWardHeatmap(wardNumber) {
    const response = await fetch(`${API_BASE_URL}/wards/${wardNumber}/heatmap`);
    return await response.json();
  },

  async getLeaderboard() {
    const response = await fetch(`${API_BASE_URL}/wards/leaderboard/clean`);
    return await response.json();
  },

  // Policy
  async generatePolicy(wardNumber, locationCoordinates) {
    const response = await fetch(`${API_BASE_URL}/policy/generate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ wardNumber, locationCoordinates })
    });
    return await response.json();
  },

  async getPolicies(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`${API_BASE_URL}/policy?${params}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return await response.json();
  },

  // Analytics
  async getAnalyticsSummary(fromDate, toDate) {
    const params = new URLSearchParams({ fromDate, toDate });
    const response = await fetch(`${API_BASE_URL}/analytics/summary?${params}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    return await response.json();
  }
};

// Socket.IO Connection
let socket = null;

function connectWebSocket() {
  socket = io('http://localhost:5001', {
    auth: { token: authToken }
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connected');
  });

  socket.on('new-report', (data) => {
    console.log('📢 New report received:', data);
    // Update UI with new report
    refreshDashboard();
  });

  socket.on('status-update', (data) => {
    console.log('📢 Status update:', data);
    // Update report status in UI
  });

  socket.on('disconnect', () => {
    console.log('🔌 WebSocket disconnected');
  });
}

// Join ward room for real-time updates
function joinWard(wardNumber) {
  if (socket) {
    socket.emit('join-ward', wardNumber);
  }
}

// Initialize dashboard with real data
async function initializeDashboard() {
  try {
    // Get dashboard overview
    const overview = await api.getDashboardOverview();
    
    if (overview.success) {
      updateDashboardUI(overview.data);
    }

    // Get circular economy data
    const circularData = await api.getCircularEconomy();
    
    if (circularData.success) {
      updateCircularEconomyUI(circularData.data);
    }

    // Get leaderboard
    const leaderboard = await api.getLeaderboard();
    
    if (leaderboard.success) {
      updateLeaderboardUI(leaderboard.data);
    }

    // Connect websocket
    if (authToken) {
      connectWebSocket();
    }

  } catch (error) {
    console.error('Dashboard initialization error:', error);
  }
}

function updateDashboardUI(data) {
  // Update Ward Cleanliness Index
  const cleanlinessCard = document.querySelector('.dashboard .card:nth-child(1) .metric');
  if (cleanlinessCard) {
    cleanlinessCard.textContent = data.wardStats?.averageCleanlinessIndex?.toFixed(1) || '92.4';
  }

  // Update active reports
  const activeReportsCard = document.querySelector('.dashboard .card:nth-child(2)');
  if (activeReportsCard && data.activeReports) {
    activeReportsCard.querySelector('p').textContent = `${data.activeReports} active reports`;
  }

  // Update average response time
  const responseTimeElements = document.querySelectorAll('.hero-stats .stat:nth-child(2) .stat-value');
  if (responseTimeElements.length > 0 && data.averageResponseTime) {
    responseTimeElements[0].textContent = `${data.averageResponseTime}m`;
  }
}

function updateCircularEconomyUI(data) {
  // Update revenue
  const revenueElements = document.querySelectorAll('.hero-stats .stat:nth-child(3) .stat-value');
  if (revenueElements.length > 0 && data.totalRevenue) {
    const crores = (data.totalRevenue / 10000000).toFixed(1);
    revenueElements[0].textContent = `₹${crores}Cr`;
  }

  // Update circular intelligence cards
  const revenueCard = document.querySelector('.grid-2 .card:nth-child(2) .metric');
  if (revenueCard && data.totalRevenue) {
    revenueCard.textContent = `₹${(data.totalRevenue / data.reportsAnalyzed || 1).toFixed(1)}/kg`;
  }
}

function updateLeaderboardUI(data) {
  const leaderboardList = document.querySelector('.grid-3 .card:nth-child(1) ol');
  
  if (leaderboardList && data.length > 0) {
    leaderboardList.innerHTML = data.slice(0, 3).map(ward => `
      <li>Ward ${ward.wardNumber} – ${ward.score.toFixed(1)}</li>
    `).join('');
  }
}

async function refreshDashboard() {
  await initializeDashboard();
}

// Report submission handler
async function submitWasteReport(formData) {
  try {
    const result = await api.createReport(formData);
    
    if (result.success) {
      alert('✅ Report submitted successfully!');
      refreshDashboard();
    } else {
      alert('❌ Error: ' + result.message);
    }
  } catch (error) {
    console.error('Report submission error:', error);
    alert('❌ Failed to submit report');
  }
}

// Login handler
async function handleLogin(email, password) {
  try {
    const result = await api.login(email, password);
    
    if (result.success) {
      alert('✅ Login successful!');
      initializeDashboard();
    } else {
      alert('❌ Login failed: ' + result.message);
    }
  } catch (error) {
    console.error('Login error:', error);
    alert('❌ Login failed');
  }
}

// Auto-initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeDashboard);
} else {
  initializeDashboard();
}

console.log('🌐 API Integration Loaded');
console.log('Backend URL:', API_BASE_URL);
