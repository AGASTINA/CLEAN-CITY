// Injection script for the shared navigation and topbar

document.addEventListener('DOMContentLoaded', () => {
    // Determine the active page to highlight the correct nav item
    const currentPath = window.location.pathname;

    // Inject CSS if not present
    if (!document.querySelector('link[href*="theme.css"]')) {
        const themeLink = document.createElement('link');
        themeLink.rel = 'stylesheet';
        themeLink.href = '/pages/shared/theme.css';
        document.head.appendChild(themeLink);
    }

    // Sidebar HTML structure
    const sidebarHTML = `
        <aside class="sidebar">
            <div class="sidebar-header">
                <div class="logo-block">MS</div>
                <div class="brand-text">
                    <h2>M-SWACHH GRID</h2>
                    <span>AI Governance Core</span>
                </div>
            </div>
            
            <nav class="nav-links">
                <a href="/intelligence-dashboard.html" class="nav-item ${currentPath.includes('dashboard') ? 'active' : ''}">
                    <span class="icon">📊</span>
                    <span>Command Center</span>
                </a>
                <a href="/detection-module.html" class="nav-item ${currentPath.includes('detection') ? 'active' : ''}">
                    <span class="icon">🤖</span>
                    <span>AI Detection</span>
                </a>
                <a href="/routing-module.html" class="nav-item ${currentPath.includes('routing') ? 'active' : ''}">
                    <span class="icon">🚛</span>
                    <span>Route Optimizer</span>
                </a>
                <a href="/circular-module.html" class="nav-item ${currentPath.includes('circular') ? 'active' : ''}">
                    <span class="icon">♻️</span>
                    <span>Circular Economy</span>
                </a>
                <a href="/escalation-module.html" class="nav-item ${currentPath.includes('escalation') ? 'active' : ''}">
                    <span class="icon">📹</span>
                    <span>Enforcement</span>
                </a>
                <a href="/policy-module.html" class="nav-item ${currentPath.includes('policy') ? 'active' : ''}">
                    <span class="icon">📋</span>
                    <span>Policy Advisory</span>
                </a>
            </nav>
            
            <div class="sidebar-footer">
                <div>v2.4.1 (Stable)</div>
                <div style="margin-top: 4px; color: var(--cyan);">System Online</div>
            </div>
        </aside>
    `;

    // Dynamic Topbar generation function
    const generateTopbar = (pageTitle) => `
        <header class="topbar">
            <div class="page-title">
                <h1>${pageTitle}</h1>
            </div>
            
            <div class="topbar-actions">
                <div class="status-indicator">
                    <div class="status-dot"></div>
                    <span>Live AI Engine Connected</span>
                </div>
                
                <button class="btn btn-secondary" style="padding: 8px 12px;">
                    🔔 <span class="badge badge-high" style="margin-left: 6px; font-size: 0.6rem;">3</span>
                </button>
                
                <div class="user-profile">
                    <div class="avatar">OM</div>
                    <div style="text-align: right; display: none; @media(min-width: 768px){display: block;}">
                        <div style="font-size: 0.85rem; font-weight: 600;">O. Murugan</div>
                        <div style="font-size: 0.7rem; color: var(--muted);">City Commissioner</div>
                    </div>
                </div>
            </div>
        </header>
    `;

    // Extract page title from DOM if it exists, otherwise use a default
    const existingTitleEl = document.querySelector('title');
    const pageTitle = existingTitleEl ? existingTitleEl.textContent.split('–')[0].trim() : 'Dashboard';

    // Restructure body layout if it doesn't already have the app-container
    if (!document.querySelector('.app-container')) {
        const bodyContent = document.body.innerHTML;
        document.body.innerHTML = '';

        // Wrap everything in app structure
        const appContainer = document.createElement('div');
        appContainer.className = 'app-container';

        // Add Background Elements
        appContainer.innerHTML = `
            <div class="bg">
                <div class="grid"></div>
                <div class="glow-orbs"></div>
            </div>
        `;

        // Insert Sidebar
        appContainer.insertAdjacentHTML('beforeend', sidebarHTML);

        // Create main content area
        const mainContent = document.createElement('main');
        mainContent.className = 'main-content';

        // Insert Topbar
        mainContent.insertAdjacentHTML('beforeend', generateTopbar(pageTitle));

        // Insert specific page content
        const pageContent = document.createElement('div');
        pageContent.className = 'page-content animate-fade-in';
        pageContent.innerHTML = bodyContent;

        mainContent.appendChild(pageContent);
        appContainer.appendChild(mainContent);

        document.body.appendChild(appContainer);
    }
});
