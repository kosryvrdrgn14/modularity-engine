class ShopSystem {
  constructor(gameManager, eventBus) {
    this.gameManager = gameManager;
    this.eventBus = eventBus;
    this.currentTab = 'combat';
    this._setupUI();
  }

  _setupUI() {
    const overlay = document.getElementById('shop-overlay');
    const closeBtn = document.getElementById('shop-close');
    const tabs = document.querySelectorAll('.shop-tab');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());
    // Tap outside shop content to close
    if (overlay) overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.close();
    });
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.currentTab = tab.dataset.tab;
        this.renderItems();
      });
    });
  }

  open() {
    document.getElementById('shop-overlay').classList.add('active');
    this.renderItems();
  }

  close() {
    document.getElementById('shop-overlay').classList.remove('active');
  }

  renderItems() {
    const container = document.getElementById('shop-items');
    if (!container) return;
    container.innerHTML = '';
    const items = SHOP_DATA[this.currentTab] || [];
    const gold = this.gameManager.get_currency() || 0;

    for (const item of items) {
      const canAfford = gold >= item.cost;
      const card = document.createElement('div');
      card.className = 'shop-item' + (canAfford ? '' : ' cant-afford');
      card.innerHTML = `
        <span class="item-icon">${item.icon}</span>
        <div class="item-info">
          <div class="item-name">${item.name}</div>
          <div class="item-desc">${item.desc}</div>
        </div>
        <span class="item-cost">💰 ${item.cost}</span>
      `;
      if (canAfford) {
        card.addEventListener('click', () => this.buy(item));
      }
      container.appendChild(card);
    }
  }

  buy(item) {
    if (!this.gameManager.spend_currency(item.cost, 'shop_' + item.id)) return;
    this.eventBus.emit('shopPurchase', { item });
    // Apply effect
    if (item.effect === 'heal_30' || item.effect?.startsWith('heal_')) {
      // Will be applied in combat via event
    } else if (item.effect === 'xp_50') {
      this.gameManager.add_xp(50);
    }
    // Store in inventory
    this.gameManager._addToInventory({ id: item.id, count: 1 });
    this.renderItems();
  }
}



// ============================================================
// DISASTER SYSTEM — Simplified gold sink (D5)
// ============================================================

// DISASTER_EVENTS moved to data/disasterEvents.js (loaded via <script> tag before this one)
