// Demo App - Real Backend Integration
const API_BASE_URL = 'http://localhost:5001/api';

// Initialize Map
let map;
let wardMarkers = [];

function initMap() {
  // Madurai coordinates
  map = L.map('map').setView([9.9252, 78.1198], 12);
  
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

// Load Wards Data
async function loadWards() {
  try {
    const response = await fetch(`${API_BASE_URL}/wards`);
    const data = await response.json();
    
    if (data.success && data.data) {
      // Update header stats
      document.getElementById('totalWards').textContent = data.count || data.data.length;
      
      // Display wards in list
      displayWards(data.data);
      
      // Add markers to map  
      data.data.forEach(ward => {
        addWardToMap(ward);
      });
    }
  } catch (error) {
    console.error('Error loading wards:', error);
    document.getElementById('wardList').innerHTML = `
      <div style="text-align: center; padding: 20px; color: rgba(255,255,255,0.5);">
        <p>Unable to load wards. Make sure backend is running.</p>
      </div>
    `;
  }
}

function displayWards(wards) {
  const wardList = document.getElementById('wardList');
  
  if (!wards || wards.length === 0) {
    wardList.innerHTML = '<p style="text-align: center; color: rgba(255,255,255,0.5);">No wards found</p>';
    return;
  }
  
  wardList.innerHTML = wards.map(ward => `
    <div class="ward-item" onclick="focusWard(${ward.wardNumber})">
      <div class="ward-header">
        <div class="ward-name">Ward ${ward.wardNumber}: ${ward.name}</div>
        <div style="color: #1e8e3e; font-weight: 600;">${(ward.cleanlinessIndex || 75).toFixed(1)}%</div>
      </div>
      <div class="ward-stats">
        <span>👥 ${(ward.population || 0).toLocaleString()} people</span>
        <span>📊 ${ward.totalReports || 0} reports</span>
        <span>📏 ${ward.area || 0} km²</span>
      </div>
    </div>
  `).join('');
}

function addWardToMap(ward) {
  try {
    // Parse boundaries if stored as JSON string
    let boundaries = ward.boundaries;
    if (typeof boundaries === 'string') {
      boundaries = JSON.parse(boundaries);
    }
    
    if (boundaries && boundaries.coordinates && boundaries.coordinates[0]) {
      const coords = boundaries.coordinates[0];
      
      // Convert coordinates to Leaflet format [lat, lng]
      const latLngs = coords.map(coord => [coord[1], coord[0]]);
      
      // Calculate center
      const centerLat = latLngs.reduce((sum, coord) => sum + coord[0], 0) / latLngs.length;
      const centerLng = latLngs.reduce((sum, coord) => sum + coord[1], 0) / latLngs.length;
      
      // Add polygon
      const polygon = L.polygon(latLngs, {
        color: '#36f0ff',
        fillColor: '#36f0ff',
        fillOpacity: 0.2,
        weight: 2
      }).addTo(map);
      
      // Add marker with popup
      const marker = L.marker([centerLat, centerLng]).addTo(map)
        .bindPopup(`
          <div style="color: #000;">
            <strong>Ward ${ward.wardNumber}: ${ward.name}</strong><br>
            Population: ${(ward.population || 0).toLocaleString()}<br>
            Cleanliness: ${(ward.cleanlinessIndex || 75).toFixed(1)}%<br>
            Reports: ${ward.totalReports || 0}
          </div>
        `);
      
      wardMarkers.push({ polygon, marker, wardNumber: ward.wardNumber });
    }
  } catch (error) {
    console.error('Error adding ward to map:', ward.wardNumber, error);
  }
}

function focusWard(wardNumber) {
  const wardMarker = wardMarkers.find(w => w.wardNumber === wardNumber);
  if (wardMarker) {
    map.setView(wardMarker.marker.getLatLng(), 14);
    wardMarker.marker.openPopup();
  }
}

// Load Recent Reports (mock for demo - since it requires auth)
async function loadReports() {
  const reportsGrid = document.getElementById('reportsGrid');
  
  // Generate demo reports based on wards
  const demoReports = [
    { type: 'Plastic Waste', location: 'SS Colony', status: 'pending', ward: 1 },
    { type: 'Organic Waste', location: 'Anna Main Road', status: 'in-progress', ward: 2 },
    { type: 'E-Waste', location: 'Town Hall', status: 'resolved', ward: 3 },
    { type: 'Mixed Waste', location: 'Goripalayam', status: 'pending', ward: 4 },
    { type: 'Construction Debris', location: 'Alagar Kovil Road', status: 'in-progress', ward: 5 },
    { type: 'Medical Waste', location: 'SS Colony', status: 'pending', ward: 1 }
  ];
  
  document.getElementById('totalReports').textContent = '50+';
  document.getElementById('avgResponse').textContent = '12m';
  
  reportsGrid.innerHTML = demoReports.map(report => `
    <div class="report-card ${report.status}">
      <div class="report-type">${report.type}</div>
      <div class="report-location">📍 ${report.location} (Ward ${report.ward})</div>
      <span class="status-badge ${report.status}">${report.status.toUpperCase().replace('-', ' ')}</span>
    </div>
  `).join('');
}

// Waste Classification
let selectedFile = null;

function initializeClassification() {
  const uploadZone = document.getElementById('uploadZone');
  const imageInput = document.getElementById('imageInput');
  const previewImage = document.getElementById('previewImage');
  const classifyBtn = document.getElementById('classifyBtn');
  
  // Click to upload
  uploadZone.addEventListener('click', (e) => {
    if (e.target !== imageInput) {
      imageInput.click();
    }
  });
  
  // File selection
  imageInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFile(file);
    }
  });
  
  // Drag and drop
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragover');
  });
  
  uploadZone.addEventListener('dragleave', () => {
    uploadZone.classList.remove('dragover');
  });
  
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      handleFile(file);
    }
  });
  
  // Classify button
  classifyBtn.addEventListener('click', classifyWaste);
}

function handleFile(file) {
  selectedFile = file;
  
  // Show preview
  const reader = new FileReader();
  reader.onload = (e) => {
    const previewImage = document.getElementById('previewImage');
    const uploadPrompt = document.getElementById('uploadPrompt');
    
    previewImage.src = e.target.result;
    previewImage.style.display = 'block';
    uploadPrompt.style.display = 'none';
    
    document.getElementById('classifyBtn').disabled = false;
    document.getElementById('classificationResult').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

async function classifyWaste() {
  if (!selectedFile) return;
  
  const classifyBtn = document.getElementById('classifyBtn');
  const resultDiv = document.getElementById('classificationResult');
  
  classifyBtn.disabled = true;
  classifyBtn.textContent = 'Analyzing with Gemini AI...';
  
  try {
    // Create FormData
    const formData = new FormData();
    formData.append('file', selectedFile);
    
    // Call backend classification endpoint
    const response = await fetch(`${API_BASE_URL}/reports/classify-image`, {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    
    if (data.success && data.classification) {
      displayClassificationResult(data.classification);
    } else {
      throw new Error(data.message || 'Classification failed');
    }
    
  } catch (error) {
    console.error('Classification error:', error);
    
    // Show demo result if API fails
    displayDemoResult();
  } finally {
    classifyBtn.disabled = false;
    classifyBtn.textContent = 'Analyze with Gemini AI';
  }
}

function displayClassificationResult(classification) {
  const resultDiv = document.getElementById('classificationResult');
  
  resultDiv.innerHTML = `
    <div class="result">
      <h3>✅ AI Classification Results</h3>
      <div class="result-grid">
        <div class="result-item">
          <span class="result-label">Waste Type:</span>
          <span class="result-value">${classification.wasteType || 'Unknown'}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Confidence:</span>
          <span class="result-value">${((classification.confidence || 0) * 100).toFixed(1)}%</span>
        </div>
        <div class="result-item">
          <span class="result-label">Severity:</span>
          <span class="result-value">${classification.severityScore || 'N/A'}/5</span>
        </div>
        <div class="result-item">
          <span class="result-label">Volume:</span>
          <span class="result-value">${classification.estimatedVolume || 'Unknown'}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Illegal Dumping:</span>
          <span class="result-value">${classification.isIllegalDumping ? 'Yes' : 'No'}</span>
        </div>
        <div class="result-item">
          <span class="result-label">Risk Level:</span>
          <span class="result-value">${classification.riskLevel || 'Unknown'}</span>
        </div>
      </div>
      <div style="margin-top: 15px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 6px;">
        <strong style="color: #36f0ff;">Recommended Action:</strong><br>
        <span style="font-size: 13px;">${classification.recommendedAction || 'Immediate collection and proper disposal required'}</span>
      </div>
    </div>
  `;
  
  resultDiv.style.display = 'block';
}

function displayDemoResult() {
  // Show demo result (for when Gemini API is not configured)
  const demoClassification = {
    wasteType: 'Mixed Waste (Plastic & Organic)',
    confidence: 0.87,
    severityScore: 4,
    estimatedVolume: 'High (~100kg)',
    isIllegalDumping: true,
    riskLevel: 'High',
    recommendedAction: 'Immediate collection required. Deploy specialized team for mixed waste separation. Install surveillance camera at location to prevent future illegal dumping.'
  };
  
  displayClassificationResult(demoClassification);
  
  // Show note about demo mode
  const resultDiv = document.getElementById('classificationResult');
  resultDiv.innerHTML += `
    <div style="margin-top: 10px; padding: 10px; background: rgba(255, 215, 0, 0.1); border: 1px solid rgba(255, 215, 0, 0.3); border-radius: 6px; font-size: 12px; color: #ffd700;">
      ℹ️ Demo Mode: Showing sample classification. Configure GEMINI_API_KEY in backend/.env for real AI analysis.
    </div>
  `;
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  loadWards();
  loadReports();
  initializeClassification();
});
