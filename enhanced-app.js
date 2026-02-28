// Enhanced App with Full Backend Integration
const API_BASE_URL = 'http://localhost:5001/api';
let authToken = localStorage.getItem('authToken');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let socket = null;

// ============================
// PARTICLE ANIMATION
// ============================
const canvas = document.getElementById("particles");
const ctx = canvas.getContext("2d");

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

resizeCanvas();
window.addEventListener("resize", resizeCanvas);

class Particle {
  constructor() {
    this.x = Math.random() * canvas.width;
    this.y = Math.random() * canvas.height;
    this.size = Math.random() * 2;
    this.speedX = (Math.random() - 0.5) * 0.5;
    this.speedY = (Math.random() - 0.5) * 0.5;
    this.opacity = Math.random() * 0.5 + 0.2;
    this.color = Math.random() > 0.5 ? "#36f0ff" : "#1e8e3e";
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    if (this.x > canvas.width + 10) this.x = -10;
    if (this.x < -10) this.x = canvas.width + 10;
    if (this.y > canvas.height + 10) this.y = -10;
    if (this.y < -10) this.y = canvas.height + 10;
    this.opacity += (Math.random() - 0.5) * 0.02;
    this.opacity = Math.max(0.1, Math.min(0.6, this.opacity));
  }

  draw() {
    ctx.fillStyle = this.color;
    ctx.globalAlpha = this.opacity;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}

const particles = [];
for (let i = 0; i < 40; i++) {
  particles.push(new Particle());
}

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach((particle) => {
    particle.update();
    particle.draw();
  });
  requestAnimationFrame(animateParticles);
}

animateParticles();

// ============================
// SCROLL REVEAL
// ============================
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
    }
  });
}, observerOptions);

document.querySelectorAll(".section").forEach((section) => {
  observer.observe(section);
});

// ============================
// AUDIO TOGGLE
// ============================
const audioToggle = document.getElementById("audioToggle");
let audioEnabled = false;

audioToggle.addEventListener("click", () => {
  audioEnabled = !audioEnabled;
  audioToggle.textContent = `Audio: ${audioEnabled ? "On" : "Off"}`;
});

// ============================
// LOAD REAL DATA FROM BACKEND
// ============================
let wardsData = [];
let reportsData = [];

async function loadWardsData() {
  try {
    const response = await fetch(`${API_BASE_URL}/wards`);
    const data = await response.json();
    
    if (data.success && data.data) {
      wardsData = data.data;
      updateHeroStats();
      updateDashboardWards();
      updateLeaderboard();
      updateHeroMap();
    }
  } catch (error) {
    console.error('Error loading wards:', error);
  }
}

function updateHeroStats() {
  // Update hero section stats with real data
  const totalWards = wardsData.length;
  const avgCleanliness = wardsData.reduce((sum, w) => sum + (w.cleanlinessIndex || 75), 0) / totalWards;
  const totalReports = wardsData.reduce((sum, w) => sum + (w.totalReports || 0), 0);
  
  const statValues = document.querySelectorAll('.stat-value');
  if (statValues[0]) statValues[0].textContent = `${avgCleanliness.toFixed(1)}%`;
  if (statValues[1]) statValues[1].textContent = '12m';
  if (statValues[2]) statValues[2].textContent = `₹${(totalReports * 850).toLocaleString()}`;
}

function updateHeroMap() {
  const mapFooter = document.querySelector('.map-footer');
  if (mapFooter) {
    const criticalReports = wardsData.filter(w => (w.cleanlinessIndex || 75) < 70).length;
    const totalReports = wardsData.reduce((sum, w) => sum + (w.totalReports || 0), 0);
    
    mapFooter.innerHTML = `
      <div class="pill">AI Hotspots: ${totalReports}</div>
      <div class="pill">Critical Alerts: ${criticalReports}</div>
      <div class="pill">Overflow Risk: ${criticalReports > 2 ? 'High' : 'Low'}</div>
    `;
  }
}

function updateDashboardWards() {
  const container = document.getElementById('dashboard-wards-container');
  if (!container) return;
  
  container.innerHTML = wardsData.slice(0, 4).map(ward => `
    <div class="card glass ward-dashboard-card" data-ward="${ward.wardNumber}">
      <div class="ward-card-header">
        <h3>Ward ${ward.wardNumber}</h3>
        <span class="cleanliness-badge ${(ward.cleanlinessIndex || 75) > 80 ? 'high' : (ward.cleanlinessIndex || 75) > 60 ? 'medium' : 'low'}">
          ${(ward.cleanlinessIndex || 75).toFixed(1)}%
        </span>
      </div>
      <h4>${ward.name}</h4>
      <div class="ward-stats-grid">
        <div class="stat-item">
          <span class="stat-label">Population</span>
          <span class="stat-value">${(ward.population || 0).toLocaleString()}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Reports</span>
          <span class="stat-value">${ward.totalReports || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Resolved</span>
          <span class="stat-value">${ward.resolvedReports || 0}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Area</span>
          <span class="stat-value">${ward.area || 0} km²</span>
        </div>
      </div>
      <button class="btn-view-ward" onclick="viewWardDetails(${ward.wardNumber})">View Details</button>
    </div>
  `).join('');
}

function updateLeaderboard() {
  const container = document.getElementById('leaderboard-container');
  if (!container) return;
  
  const sortedWards = [...wardsData].sort((a, b) => 
    (b.cleanlinessIndex || 75) - (a.cleanlinessIndex || 75)
  );
  
  container.innerHTML = sortedWards.slice(0, 5).map((ward, index) => `
    <div class="leaderboard-item ${index === 0 ? 'top-rank' : ''}">
      <div class="rank-badge rank-${index + 1}">${index + 1}</div>
      <div class="ward-info">
        <h4>Ward ${ward.wardNumber}: ${ward.name}</h4>
        <div class="ward-metrics">
          <span>👥 ${(ward.population || 0).toLocaleString()}</span>
          <span>📊 ${ward.totalReports || 0} reports</span>
          <span>✅ ${((ward.resolvedReports || 0) / Math.max(ward.totalReports || 1, 1) * 100).toFixed(0)}% resolved</span>
        </div>
      </div>
      <div class="cleanliness-score">
        ${(ward.cleanlinessIndex || 75).toFixed(1)}%
        <div class="score-label">Cleanliness</div>
      </div>
    </div>
  `).join('');
}

// ============================
// CIRCULAR ECONOMY DATA
// ============================
function generateCircularEconomyData() {
  const wasteTypes = [
    {
      type: 'Plastic Waste',
      icon: '♻️',
      volume: '2.4 tons',
      revenue: '₹18,500',
      method: 'Segregation → Granulation → Pellet Production',
      processor: 'MCC Recycling Center, Anna Nagar',
      impact: '4.2 tons CO₂ saved',
      jobs: '12 SHG workers',
      score: 8.5
    },
    {
      type: 'Organic Waste',
      icon: '🌱',
      volume: '5.8 tons',
      revenue: '₹12,200',
      method: 'Composting → Vermicomposting',
      processor: 'Ward-level Bio-Gas Units',
      impact: '8.5 tons CO₂ saved',
      jobs: '8 local operators',
      score: 9.2
    },
    {
      type: 'E-Waste',
      icon: '⚡',
      volume: '340 kg',
      revenue: '₹45,000',
      method: 'Component Recovery → Metal Extraction',
      processor: 'Authorized E-Waste Recycler, Thiagarajar',
      impact: '1.8 tons toxic material prevented',
      jobs: '15 technical workers',
      score: 7.8
    }
  ];
  
  const container = document.getElementById('circular-economy-cards');
  if (!container) return;
  
  container.innerHTML = wasteTypes.map(item => `
    <div class="card glass circular-card">
      <div class="circular-header">
        <span class="waste-icon">${item.icon}</span>
        <h3>${item.type}</h3>
      </div>
      <div class="circular-stats">
        <div class="stat-row">
          <span class="label">Volume Collected:</span>
          <span class="value">${item.volume}</span>
        </div>
        <div class="stat-row">
          <span class="label">Revenue Generated:</span>
          <span class="value highlight">${item.revenue}</span>
        </div>
        <div class="stat-row">
          <span class="label">Processing Method:</span>
          <span class="value small">${item.method}</span>
        </div>
        <div class="stat-row">
          <span class="label">Local Processor:</span>
          <span class="value small">${item.processor}</span>
        </div>
        <div class="stat-row">
          <span class="label">Environmental Impact:</span>
          <span class="value">${item.impact}</span>
        </div>
        <div class="stat-row">
          <span class="label">Employment:</span>
          <span class="value">${item.jobs}</span>
        </div>
      </div>
      <div class="feasibility-score">
        <div class="score-label">Feasibility Score</div>
        <div class="score-value">${item.score}/10</div>
      </div>
    </div>
  `).join('');
}

// ============================
// ENFORCEMENT & CCTV
// ============================
function generateEnforcementData() {
  const alerts = [
    {
      time: '2 hours ago',
      location: 'SS Colony Junction',
      type: 'Illegal Dumping',
      severity: 'high',
      action: 'Photo evidence captured, fine notice issued'
    },
    {
      time: '5 hours ago',
      location: 'Anna Main Road',
      type: 'Night Activity',
      severity: 'medium',
      action: 'Patrol unit dispatched'
    },
    {
      time: '1 day ago',
      location: 'Town Hall Area',
      type: 'Repeat Offender',
      severity: 'high',
      action: 'Legal notice sent to property owner'
    }
  ];
  
  const container = document.getElementById('enforcement-alerts');
  if (!container) return;
  
  container.innerHTML = alerts.map(alert => `
    <div class="alert-card glass severity-${alert.severity}">
      <div class="alert-header">
        <span class="alert-type">${alert.type}</span>
        <span class="alert-time">${alert.time}</span>
      </div>
      <div class="alert-location">📍 ${alert.location}</div>
      <div class="alert-action">🎯 Action: ${alert.action}</div>
    </div>
  `).join('');
}

// ============================
// POLICY INTELLIGENCE
// ============================
function generatePolicyRecommendations() {
  const policies = [
    {
      title: 'Ward 1 Infrastructure Upgrade',
      priority: 'High',
      issue: 'Repeated illegal dumping at 3 locations',
      recommendations: [
        'Install 2 CCTV cameras at hotspots',
        'Add 4 additional waste bins',
        'Increase collection frequency to twice daily',
        'Community awareness program'
      ],
      budget: '₹2.8 lakhs',
      impact: '85% reduction expected'
    },
    {
      title: 'Organic Waste Processing Expansion',
      priority: 'Medium',
      issue: 'Growing organic waste volume',
      recommendations: [
        'Establish 2 new ward-level compost units',
        'Train 15 SHG members in composting',
        'Distribute composting bins to 200 households',
        'Create composting awareness campaign'
      ],
      budget: '₹5.2 lakhs',
      impact: '40% waste diversion from landfill'
    }
  ];
  
  const container = document.getElementById('policy-recommendations');
  if (!container) return;
  
  container.innerHTML = policies.map(policy => `
    <div class="card glass policy-card">
      <div class="policy-header">
        <h3>${policy.title}</h3>
        <span class="priority-badge priority-${policy.priority.toLowerCase()}">${policy.priority} Priority</span>
      </div>
      <div class="policy-issue">
        <strong>Issue Identified:</strong> ${policy.issue}
      </div>
      <div class="policy-recommendations">
        <strong>AI Recommendations:</strong>
        <ul>
          ${policy.recommendations.map(rec => `<li>${rec}</li>`).join('')}
        </ul>
      </div>
      <div class="policy-footer">
        <div class="policy-budget">Budget: ${policy.budget}</div>
        <div class="policy-impact">Expected Impact: ${policy.impact}</div>
      </div>
      <button class="btn-download">Download Full Report</button>
    </div>
  `).join('');
}

// ============================
// BUTTON HANDLERS
// ============================
function setupButtonHandlers() {
  // Live Dashboard Button
  const dashboardBtn = document.querySelector('.cta .primary');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
      document.getElementById('dashboard')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
  
  // Explore AI Intelligence Button
  const aiBtn = document.querySelector('.cta .ghost');
  if (aiBtn) {
    aiBtn.addEventListener('click', () => {
      document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' });
    });
  }
  
  // Request Demo Button
  const demoBtn = document.querySelector('.actions .primary');
  if (demoBtn) {
    demoBtn.addEventListener('click', () => {
      window.open('/demo.html', '_blank');
    });
  }
}

// View Ward Details Function
window.viewWardDetails = function(wardNumber) {
  const ward = wardsData.find(w => w.wardNumber === wardNumber);
  if (ward) {
    alert(`Ward ${wardNumber}: ${ward.name}\n\nPopulation: ${(ward.population || 0).toLocaleString()}\nCleanliness: ${(ward.cleanlinessIndex || 75).toFixed(1)}%\nTotal Reports: ${ward.totalReports || 0}\nResolved: ${ward.resolvedReports || 0}`);
  }
};

// ============================
// INITIALIZE APP
// ============================
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🚀 Initializing Enhanced Madurai Swachh AI Grid...');
  
  // Load real data
  await loadWardsData();
  
  // Generate content for all sections
  generateCircularEconomyData();
  generateEnforcementData();
  generatePolicyRecommendations();
  
  // Setup interactive buttons
  setupButtonHandlers();
  
  console.log('✅ App initialized successfully');
});
