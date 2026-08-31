// ============================================================
// DOCK MENU — Modular bottom navigation
// ============================================================

class DockMenu {
  constructor({ audioManager, onTabSwitch }) {
    this.audioManager = audioManager;
    this.onTabSwitch = onTabSwitch;
    this.currentTab = 'map';
    this.tabs = [];

    this._setupUI();
  }

  _setupUI() {
    // Define tab configurations
    this.tabConfigs = [
      { id: 'map', icon: '🗺️', label: 'Map', action: 'map' },
      { id: 'social', icon: '👥', label: 'NPCs', action: 'social', badge: 'dock-social-badge' },
      { id: 'systems', icon: '📋', label: 'Systems', action: 'systems', badge: 'dock-systems-badge' },
      { id: 'shop', icon: '🛒', label: 'Shop', action: 'shop' },
      { id: 'combat', icon: '⚔️', label: 'Fight', action: 'combat', className: 'dock-combat' },
    ];

    // Create tab elements
    const dock = document.getElementById('town-dock');
    if (!dock) return;

    dock.innerHTML = '';
    for (const config of this.tabConfigs) {
      const btn = document.createElement('button');
      btn.className = 'dock-tab' + (config.className ? ' ' + config.className : '');
      btn.id = 'dock-' + config.id;
      btn.dataset.action = config.action;

      let badgeHtml = '';
      if (config.badge) {
        badgeHtml = `<span class="dock-badge" id="${config.badge}" style="display:none;">0</span>`;
      }

      btn.innerHTML = `
        <span class="dock-icon">${config.icon}</span>
        <span class="dock-label">${config.label}</span>
        ${badgeHtml}
      `;

      btn.addEventListener('click', () => this.selectTab(config.id));
      dock.appendChild(btn);
      this.tabs.push({ element: btn, config });
    }

    // Set initial active tab
    this.selectTab('map');
  }

  selectTab(tabId) {
    this.audioManager?.playMenuSound('select');

    // Update active state
    this.tabs.forEach(t => {
      t.element.classList.toggle('active', t.config.id === tabId);
    });

    this.currentTab = tabId;

    // Notify handler
    if (this.onTabSwitch) {
      this.onTabSwitch(tabId);
    }
  }

  updateBadge(tabId, count) {
    const tab = this.tabs.find(t => t.config.id === tabId);
    if (tab && tab.config.badge) {
      const badge = document.getElementById(tab.config.badge);
      if (badge) {
        badge.textContent = count;
        badge.style.display = count > 0 ? '' : 'none';
      }
    }
  }

  getActiveTab() {
    return this.currentTab;
  }
}
