// ============================================================
// ADMIN CREDENTIALS — only these work
// ============================================================
const ADMIN_EMAIL = 'blessingmu321@gmail.com';
const ADMIN_PASSWORD = 'OmowumiA19';  // Changed to OmowumiA19

// ============================================================
// NETLIFY API CONFIGURATION — Syncs across all devices
// ============================================================
const API_URL = '/api';

let masterData = {
    products: [],
    orders: [],
    subscribers: [],
    settings: {}
};

// ============================================================
// EMAILJS CONFIGURATION — For email notifications
// ============================================================
const EMAILJS_CONFIG = {
    serviceID: 'YOUR_EMAILJS_SERVICE_ID',   // Get from EmailJS dashboard
    templateID: 'YOUR_EMAILJS_TEMPLATE_ID', // Get from EmailJS dashboard
    publicKey: 'YOUR_EMAILJS_PUBLIC_KEY'    // Get from EmailJS dashboard
};

// ============================================================
// HAMBURGER MENU TOGGLE (Main Nav)
// ============================================================
function toggleMenu() {
  const navLinks = document.getElementById('navLinks');
  const hamburger = document.getElementById('hamburgerBtn');
  navLinks.classList.toggle('active');
  hamburger.classList.toggle('active');
}

// Close main nav menu when a link is clicked
document.querySelectorAll('#navLinks a').forEach(link => {
  link.addEventListener('click', function() {
    document.getElementById('navLinks').classList.remove('active');
    document.getElementById('hamburgerBtn').classList.remove('active');
  });
});

// Close main nav menu when clicking outside
document.addEventListener('click', function(e) {
  const nav = document.getElementById('mainNav');
  const hamburger = document.getElementById('hamburgerBtn');
  if (!nav.contains(e.target)) {
    document.getElementById('navLinks')?.classList.remove('active');
    hamburger?.classList.remove('active');
  }
});

// ============================================================
// ADMIN HAMBURGER TOGGLE (Admin Sidebar)
// ============================================================
function toggleAdminMenu() {
  const sidebar = document.getElementById('adminSidebar');
  const hamburger = document.getElementById('adminHamburger');
  sidebar.classList.toggle('open');
  hamburger.classList.toggle('active');
}

// Close admin sidebar when clicking outside
document.addEventListener('click', function(e) {
  const sidebar = document.getElementById('adminSidebar');
  const hamburger = document.getElementById('adminHamburger');
  const main = document.getElementById('adminMain');
  
  // Only on mobile and if sidebar is open
  if (window.innerWidth <= 768 && sidebar.classList.contains('open')) {
    if (!sidebar.contains(e.target) && !hamburger.contains(e.target)) {
      sidebar.classList.remove('open');
      hamburger.classList.remove('active');
    }
  }
});

// Close admin sidebar when a nav link is clicked (mobile)
document.querySelectorAll('.admin-nav-link').forEach(link => {
  link.addEventListener('click', function() {
    if (window.innerWidth <= 768) {
      document.getElementById('adminSidebar').classList.remove('open');
      document.getElementById('adminHamburger').classList.remove('active');
    }
  });
});

// ============================================================
// STATE — all persisted in localStorage
// ============================================================
function load(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch(e) { return fallback; }
}
function save(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

// ============================================================
// LOAD DATA FROM SERVER (Netlify API)
// ============================================================
async function loadFromServer() {
    try {
        const res = await fetch(API_URL + '?action=get');
        if (!res.ok) { throw new Error('Server returned ' + res.status); }
        const data = await res.json();
        if (data.error) { throw new Error(data.error); }
        masterData = data;
        // Backup to localStorage
        save('bg_products', masterData.products);
        save('bg_orders', masterData.orders);
        save('bg_subs', masterData.subscribers);
        save('bg_settings', masterData.settings);
        console.log('✅ Data loaded from server');
        return true;
    } catch (e) {
        console.log('⚠️ Using localStorage (offline mode)');
        masterData.products = load('bg_products', DEFAULT_PRODUCTS);
        masterData.orders = load('bg_orders', []);
        masterData.subscribers = load('bg_subs', []);
        masterData.settings = load('bg_settings', {});
        return false;
    }
}

// ============================================================
// SAVE DATA TO SERVER (Netlify API)
// ============================================================
async function saveToServer() {
    try {
        const res = await fetch(API_URL + '?action=save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(masterData)
        });
        if (!res.ok) { throw new Error('Server returned ' + res.status); }
        const result = await res.json();
        if (result.error) { throw new Error(result.error); }
        console.log('✅ Data saved to server');
        return true;
    } catch (e) {
        console.log('⚠️ Saved to localStorage only');
        save('bg_products', masterData.products);
        save('bg_orders', masterData.orders);
        save('bg_subs', masterData.subscribers);
        save('bg_settings', masterData.settings);
        return false;
    }
}

// ============================================================
// TEST API CONNECTION
// ============================================================
async function testAPI() {
    try {
        const res = await fetch(API_URL + '?action=ping');
        const data = await res.json();
        console.log('API Test Result:', data);
        if (data.status === 'ok') {
            showToast('API is working! Data syncs across devices.', 'success');
        }
    } catch (e) {
        console.error('API Error:', e);
        showToast('API not working. Check console.', 'error');
    }
}

// ============================================================
// EMAIL SENDING FUNCTIONS
// ============================================================
async function sendAdminNotification(order) {
    try {
        if (EMAILJS_CONFIG.serviceID === 'YOUR_EMAILJS_SERVICE_ID') {
            console.log('EmailJS not configured. Order:', order);
            return false;
        }
        if (typeof emailjs === 'undefined') { await loadEmailJS(); }
        const s = getSettings();
        const adminEmail = s.adminEmail || 'blessingmu321@gmail.com';
        const total = order.items.reduce((sum, item) => sum + (item.price * item.qty), 0);
        const adminParams = {
            to_email: adminEmail,
            to_name: 'Bagistrate Admin',
            customer_name: order.name,
            customer_email: order.email,
            customer_phone: order.phone,
            order_id: order.id,
            order_items: order.items.map(i => `${i.name} x${i.qty} - ₦${(i.price * i.qty).toLocaleString()}`).join('\n'),
            order_total: '₦' + total.toLocaleString(),
            order_date: order.date,
            status: order.status,
            message: `New order from ${order.name}. Please check and confirm payment.`
        };
        await emailjs.send(EMAILJS_CONFIG.serviceID, EMAILJS_CONFIG.templateID, adminParams, EMAILJS_CONFIG.publicKey);
        console.log('Admin notification sent');
        return true;
    } catch (e) {
        console.error('Failed to send admin email:', e);
        return false;
    }
}

async function sendCustomerNotification(order, status) {
    try {
        if (EMAILJS_CONFIG.serviceID === 'YOUR_EMAILJS_SERVICE_ID') {
            console.log('EmailJS not configured. Customer notification would be sent.');
            return false;
        }
        if (typeof emailjs === 'undefined') { await loadEmailJS(); }
        const statusMessages = {
            pending: 'Your order is pending payment confirmation.',
            confirmed: 'Your payment has been confirmed! Your order is being processed.',
            shipped: 'Your order has been shipped! Track your package soon.'
        };
        const params = {
            to_email: order.email,
            to_name: order.name.split(' ')[0] || 'Customer',
            order_id: order.id,
            order_status: status,
            status_message: statusMessages[status] || 'Your order status has been updated.',
            order_items: order.items.map(i => `${i.name} x${i.qty}`).join(', '),
            order_total: '₦' + order.items.reduce((sum, i) => sum + (i.price * i.qty), 0).toLocaleString(),
            message: `Your order ${order.id} status is now: ${status.toUpperCase()}.`
        };
        await emailjs.send(EMAILJS_CONFIG.serviceID, EMAILJS_CONFIG.templateID, params, EMAILJS_CONFIG.publicKey);
        console.log('Customer notification sent');
        return true;
    } catch (e) {
        console.error('Failed to send customer email:', e);
        return false;
    }
}

function loadEmailJS() {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
        script.onload = () => { emailjs.init(EMAILJS_CONFIG.publicKey); resolve(); };
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ============================================================
// REPLACED GET/SET FUNCTIONS (Now using masterData & API)
// ============================================================
function getProducts()    { return masterData.products || []; }
function getOrders()      { return masterData.orders || []; }
function getSubscribers() { return masterData.subscribers || []; }
function getSettings()    { return masterData.settings || {}; }
function getCart()        { return load('bg_cart', []); }

async function setProducts(v)    { masterData.products = v; await saveToServer(); }
async function setOrders(v)      { masterData.orders = v; await saveToServer(); }
async function setSubscribers(v) { masterData.subscribers = v; await saveToServer(); }
async function setSettings(v)    { masterData.settings = v; await saveToServer(); }
function setCart(v)              { save('bg_cart', v); }

const DEFAULT_PRODUCTS = [
  { id:1, name:'Bella Tote', cat:'tote', price:28500, oldPrice:35000, desc:'A roomy, structured tote in premium vegan leather. Perfect for work or weekend errands.', img:'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80', badge:'Bestseller' },
  { id:2, name:'Rose Mini Bag', cat:'mini', price:18000, oldPrice:22000, desc:'Chic mini crossbody with gold chain strap. Available in blush pink and champagne.', img:'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=400&q=80', badge:'New' },
  { id:3, name:'La Femme Clutch', cat:'clutch', price:15500, oldPrice:null, desc:'Elegant envelope clutch in buttery soft faux-suede. Evenings just got more glamorous.', img:'https://images.unsplash.com/photo-1566150905458-1bf1fc113f0d?w=400&q=80', badge:null },
  { id:4, name:'Zara Shoulder Bag', cat:'shoulder', price:24000, oldPrice:29500, desc:'Classic structured shoulder bag with detachable strap and signature gold clasp.', img:'https://images.unsplash.com/photo-1591561954557-26941169b49e?w=400&q=80', badge:'Sale' },
  { id:5, name:'Luxe Croc Tote', cat:'luxury', price:55000, oldPrice:68000, desc:'Statement croc-embossed luxury tote. Limited edition — only 10 pieces available.', img:'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=400&q=80', badge:'Limited' },
  { id:6, name:'Pearl Chain Mini', cat:'mini', price:16500, oldPrice:null, desc:'Adorable pearl-handle mini bag with satin finish. The ultimate going-out accessory.', img:'https://images.unsplash.com/photo-1600093463592-8e36ae95ef56?w=400&q=80', badge:'New' },
];

let modalProd = null;
let modalQtyVal = 1;
let editImgData = null;
let currentFilter = 'all';

// ============================================================
// PAGE ROUTING
// ============================================================
function showPage(p) {
  document.querySelectorAll('.page').forEach(el => el.classList.remove('active'));
  const pg = document.getElementById('page-' + p);
  if (pg) pg.classList.add('active');
  const isAdmin = (p === 'admin' || p === 'admin-login' || p === 'admin-register' || p === 'admin-forgot');
  document.getElementById('mainNav').style.display    = isAdmin ? 'none' : '';
  document.getElementById('mainFooter').style.display = isAdmin ? 'none' : '';
  document.getElementById('waFloat').style.display    = isAdmin ? 'none' : '';
  window.scrollTo(0, 0);
  if (p === 'home')    { renderHomeProducts(); }
  if (p === 'shop')    { renderShopProducts(); }
  if (p === 'checkout'){ renderCheckoutPage(); }
  if (p === 'admin')   { renderAdminDashboard(); }
}
function scrollToSection(id) {
  setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); }, 100);
}
function goAdminEntry() {
  showPage('admin-login');
}

// ============================================================
// PRODUCTS — storefront
// ============================================================
function fmtPrice(p) { return '\u20a6' + p.toLocaleString(); }

function buildProductCard(p) {
  const div = document.createElement('div');
  div.className = 'product-card';
  div.innerHTML = `
    <div class="product-img-wrap">
      <img src="${p.img}" alt="${p.name}" loading="lazy" onerror="this.style.opacity=0">
      ${p.badge ? `<span class="product-badge-tag">${p.badge}</span>` : ''}
    </div>
    <div class="product-info">
      <div class="product-name">${p.name}</div>
      <div class="product-desc-short">${p.desc}</div>
      <div class="product-footer">
        <div class="product-price">${p.oldPrice ? `<del>${fmtPrice(p.oldPrice)}</del>` : ''}${fmtPrice(p.price)}</div>
        <button class="add-to-cart-btn" onclick="openProductModal(${p.id})">Quick Add</button>
      </div>
    </div>`;
  return div;
}

function renderHomeProducts() {
  const g = document.getElementById('homeProductGrid');
  if (!g) return;
  g.innerHTML = '';
  getProducts().slice(0, 3).forEach(p => g.appendChild(buildProductCard(p)));
}
function filterCat(f) { currentFilter = f; renderShopProducts(); }
function renderShopProducts() {
  const g = document.getElementById('shopProductGrid');
  if (!g) return;
  g.innerHTML = '';
  const list = currentFilter === 'all' ? getProducts() : getProducts().filter(p => p.cat === currentFilter);
  if (!list.length) { g.innerHTML = '<p style="text-align:center;color:var(--text-light);grid-column:1/-1;padding:3rem;">No bags in this category yet.</p>'; return; }
  list.forEach(p => g.appendChild(buildProductCard(p)));
}

// ============================================================
// PRODUCT MODAL
// ============================================================
function openProductModal(id) {
  const p = getProducts().find(x => x.id === id);
  if (!p) return;
  modalProd = p; modalQtyVal = 1;
  document.getElementById('modalImg').src = p.img;
  document.getElementById('modalName').textContent = p.name;
  document.getElementById('modalPrice').innerHTML = (p.oldPrice ? `<del style="color:var(--text-light);font-size:0.9rem;margin-right:0.5rem;">${fmtPrice(p.oldPrice)}</del>` : '') + fmtPrice(p.price);
  document.getElementById('modalDesc').textContent = p.desc;
  document.getElementById('modalQtyEl').textContent = 1;
  document.getElementById('productModal').classList.add('open');
}
function changeQty(d) {
  modalQtyVal = Math.max(1, modalQtyVal + d);
  document.getElementById('modalQtyEl').textContent = modalQtyVal;
}
function addModalToCart() {
  if (!modalProd) return;
  addToCart(modalProd, modalQtyVal);
  closeModal('productModal');
}
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ============================================================
// CART
// ============================================================
function addToCart(p, qty) {
  const cart = getCart();
  const ex = cart.find(x => x.id === p.id);
  if (ex) ex.qty += qty; else cart.push({ id: p.id, name: p.name, price: p.price, img: p.img, qty });
  setCart(cart); updateCartCount(); showToast(p.name + ' added to bag', 'success');
}
function updateCartCount() {
  const c = getCart().reduce((s, i) => s + i.qty, 0);
  document.getElementById('cartCount').textContent = c;
}
function toggleCart() {
  document.getElementById('cartSidebar').classList.toggle('open');
  renderCartUI();
}
function renderCartUI() {
  const cart = getCart();
  const el = document.getElementById('cartItemsEl');
  if (!cart.length) {
    el.innerHTML = '<div class="empty-cart"><span class="empty-icon">[ ]</span><p>Your cart is empty.<br>Time to treat yourself!</p></div>';
    document.getElementById('cartTotalEl').textContent = fmtPrice(0); return;
  }
  el.innerHTML = cart.map((i, idx) => `
    <div class="cart-item">
      <img class="cart-item-img" src="${i.img}" alt="${i.name}" onerror="this.style.opacity=0">
      <div class="cart-item-info">
        <div class="cart-item-name">${i.name}</div>
        <div class="cart-item-price">${fmtPrice(i.price * i.qty)}</div>
        <div class="cart-item-qty">Qty: ${i.qty}</div>
      </div>
      <button class="cart-item-remove" onclick="removeCartItem(${idx})">x</button>
    </div>`).join('');
  document.getElementById('cartTotalEl').textContent = fmtPrice(cart.reduce((s, i) => s + i.price * i.qty, 0));
}
function removeCartItem(idx) {
  const cart = getCart(); cart.splice(idx, 1); setCart(cart);
  updateCartCount(); renderCartUI();
}

// ============================================================
// CHECKOUT
// ============================================================
function proceedCheckout() {
  if (!getCart().length) { showToast('Add items to your bag first'); return; }
  document.getElementById('cartSidebar').classList.remove('open');
  showPage('checkout');
}
function renderCheckoutPage() {
  const s = getSettings();
  document.getElementById('dispBank').textContent    = s.bankName || 'Not configured — contact admin';
  document.getElementById('dispAccName').textContent = s.accName  || 'Not configured';
  document.getElementById('dispAccNum').textContent  = s.accNum   || 'Not configured';
  const total = getCart().reduce((s, i) => s + i.price * i.qty, 0);
  document.getElementById('dispAmount').textContent  = fmtPrice(total);
  const si = document.getElementById('summaryItemsEl');
  si.innerHTML = getCart().map(i => `<div class="summary-item"><span>${i.name} x${i.qty}</span><span>${fmtPrice(i.price * i.qty)}</span></div>`).join('');
  document.getElementById('summaryTotalEl').textContent = fmtPrice(total);
}
function previewProof(inp) {
  if (inp.files[0]) {
    const r = new FileReader();
    r.onload = e => { const p = document.getElementById('proofPreviewImg'); p.src = e.target.result; p.style.display = 'block'; };
    r.readAsDataURL(inp.files[0]);
  }
}

// ============================================================
// PLACE ORDER (UPDATED - Sends emails)
// ============================================================
async function placeOrder(e) {
  e.preventDefault();
  const first = document.getElementById('oFirst').value;
  const last  = document.getElementById('oLast').value;
  const email = document.getElementById('oEmail').value;
  const phone = document.getElementById('oPhone').value;
  const addr  = document.getElementById('oAddress').value + ', ' + document.getElementById('oCity').value;
  const cart  = getCart();
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  
  if (!cart.length) { showToast('Your cart is empty.', 'error'); return; }

  const order = { 
    id: 'BG' + Date.now(), 
    name: first + ' ' + last, 
    email, 
    phone, 
    address: addr, 
    items: [...cart], 
    total, 
    status: 'pending', 
    date: new Date().toLocaleDateString() 
  };
  
  const orders = getOrders();
  orders.unshift(order);
  await setOrders(orders);

  // Send notifications
  await sendAdminNotification(order);
  await sendCustomerNotification(order, 'pending');

  document.getElementById('successNameEl').textContent = first;
  setCart([]); 
  updateCartCount();
  showPage('success');
  showToast('Order placed! You will receive a confirmation email.', 'success');
}

// ============================================================
// NEWSLETTER (storefront)
// ============================================================
async function subscribeNewsletter(e) {
  e.preventDefault();
  const email = document.getElementById('nlEmail').value.trim();
  const subs = getSubscribers();
  if (!subs.find(s => s.email === email)) {
    subs.push({ email, date: new Date().toLocaleDateString() });
    await setSubscribers(subs);
    showToast('You are in! Welcome to the Bagistrate inner circle.', 'success');
  } else {
    showToast('You are already subscribed.', 'success');
  }
  document.getElementById('nlEmail').value = '';
}

// ============================================================
// ADMIN LOGIN — hardcoded credentials
// ============================================================
function doLogin() {
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pwd   = document.getElementById('loginPwd').value;
  const errEl = document.getElementById('loginError');
  const customPwd = load('bg_custom_password', null);
  const validPwd = customPwd || ADMIN_PASSWORD;
  
  if (email === ADMIN_EMAIL && pwd === validPwd) {
    errEl.style.display = 'none';
    document.getElementById('adminUserTag').textContent = 'Blessing Mu';
    showPage('admin');
    showToast('Welcome back, Blessing!', 'success');
  } else {
    errEl.textContent = 'Invalid email or password.';
    errEl.style.display = 'block';
  }
}

function adminLogout() { 
  showPage('home');
  showToast('Logged out successfully.', 'success');
}

// ============================================================
// ADMIN — DASHBOARD
// ============================================================
function renderAdminDashboard() {
  const orders = getOrders();
  const revenue = orders.filter(o => o.status === 'confirmed').reduce((s, o) => s + o.total, 0);
  document.getElementById('statOrders').textContent   = orders.length;
  document.getElementById('statRevenue').textContent  = fmtPrice(revenue);
  document.getElementById('statProducts').textContent = getProducts().length;
  document.getElementById('statSubs').textContent     = getSubscribers().length;
  const tbody = document.getElementById('dashOrdersBody');
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:2rem;">No orders yet.</td></tr>'; return; }
  tbody.innerHTML = orders.slice(0, 6).map(o => `<tr>
    <td>${o.name}</td>
    <td>${o.items.length} item(s)</td>
    <td>${fmtPrice(o.total)}</td>
    <td><span class="status-badge status-${o.status}">${o.status}</span></td>
    <td>${o.date}</td>
  </tr>`).join('');
}

// ============================================================
// ADMIN — ORDERS (UPDATED with Confirm & Ship buttons)
// ============================================================
function renderOrdersTable() {
  const orders = getOrders();
  const tbody = document.getElementById('ordersBody');
  if (!orders.length) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-light);padding:2rem;">No orders yet.</td></tr>'; return; }
  tbody.innerHTML = orders.map((o, i) => `<tr>
    <td><small>${o.id}</small></td>
    <td><strong>${o.name}</strong><br><small>${o.phone}</small></td>
    <td><small>${o.email}</small></td>
    <td style="max-width:180px;font-size:0.8rem;">${o.items.map(x => x.name).join(', ')}</td>
    <td>${fmtPrice(o.total)}</td>
    <td>
      <span class="status-badge status-${o.status}">${o.status}</span>
    </td>
    <td>
      ${o.status === 'pending' ? `<button class="action-btn action-edit" onclick="confirmPayment(${i})">Confirm Payment</button>` : ''}
      ${o.status === 'confirmed' ? `<button class="action-btn action-edit" onclick="markAsShipped(${i})">Mark Shipped</button>` : ''}
    </td>
    <td><button class="action-btn action-delete" onclick="deleteOrder(${i})">Delete</button></td>
  </tr>`).join('');
}

// ============================================================
// CONFIRM PAYMENT (Admin action - sends email)
// ============================================================
async function confirmPayment(orderIndex) {
  if (!confirm('Confirm payment for this order? The customer will be notified.')) return;
  const orders = getOrders();
  if (!orders[orderIndex]) return;
  orders[orderIndex].status = 'confirmed';
  await setOrders(orders);
  await sendCustomerNotification(orders[orderIndex], 'confirmed');
  renderOrdersTable();
  renderAdminDashboard();
  showToast('Payment confirmed! Customer notified.', 'success');
}

// ============================================================
// MARK AS SHIPPED (Admin action - sends email)
// ============================================================
async function markAsShipped(orderIndex) {
  if (!confirm('Mark this order as shipped? The customer will be notified.')) return;
  const orders = getOrders();
  if (!orders[orderIndex]) return;
  orders[orderIndex].status = 'shipped';
  await setOrders(orders);
  await sendCustomerNotification(orders[orderIndex], 'shipped');
  renderOrdersTable();
  renderAdminDashboard();
  showToast('Order marked as shipped! Customer notified.', 'success');
}

// ============================================================
// UPDATE ORDER STATUS (UPDATED - sends emails)
// ============================================================
async function updateOrderStatus(idx, val) {
  const orders = getOrders(); 
  orders[idx].status = val; 
  await setOrders(orders);
  await sendCustomerNotification(orders[idx], val);
  showToast('Order status updated. Customer notified.', 'success');
  renderAdminDashboard();
}

// ============================================================
// DELETE ORDER (UPDATED)
// ============================================================
async function deleteOrder(idx) {
  if (!confirm('Delete this order? This cannot be undone.')) return;
  const orders = getOrders(); 
  orders.splice(idx, 1); 
  await setOrders(orders);
  renderOrdersTable(); 
  renderAdminDashboard(); 
  showToast('Order deleted.');
}

// ============================================================
// ADMIN — PRODUCTS
// ============================================================
function renderProductsTable() {
  const tbody = document.getElementById('productsBody');
  const prods = getProducts();
  if (!prods.length) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-light);padding:2rem;">No products yet.</td></tr>'; return; }
  tbody.innerHTML = prods.map((p, i) => `<tr>
    <td><img class="product-manage-img" src="${p.img}" alt="${p.name}" onerror="this.style.opacity=0"></td>
    <td><strong>${p.name}</strong></td>
    <td><span class="tag">${p.cat}</span></td>
    <td>${fmtPrice(p.price)}</td>
    <td>
      <button class="action-btn action-edit" onclick="openEditProduct(${i})">Edit</button>
      <button class="action-btn action-delete" onclick="deleteProduct(${i})">Delete</button>
    </td>
  </tr>`).join('');
}
function previewNewProdImg(inp) {
  if (inp.files[0]) {
    const r = new FileReader();
    r.onload = e => { const img = document.getElementById('newPImgPreview'); img.src = e.target.result; img.style.display = 'block'; inp._data = e.target.result; };
    r.readAsDataURL(inp.files[0]);
  }
}

// ============================================================
// ADD PRODUCT (UPDATED - async)
// ============================================================
async function addProduct() {
  const name     = document.getElementById('newPName').value.trim();
  const cat      = document.getElementById('newPCat').value;
  const price    = parseInt(document.getElementById('newPPrice').value);
  const oldPrice = parseInt(document.getElementById('newPOldPrice').value) || null;
  const desc     = document.getElementById('newPDesc').value.trim();
  const imgInp   = document.getElementById('newPImg');
  const img      = imgInp._data || 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80';
  if (!name || !price) { showToast('Please fill in at least the name and price.', 'error'); return; }
  const prods = getProducts();
  prods.push({ id: Date.now(), name, cat, price, oldPrice, desc, img, badge: null });
  await setProducts(prods);
  document.getElementById('newPName').value = '';
  document.getElementById('newPPrice').value = '';
  document.getElementById('newPOldPrice').value = '';
  document.getElementById('newPDesc').value = '';
  document.getElementById('newPImgPreview').style.display = 'none';
  imgInp._data = null;
  renderProductsTable();
  showToast('Product added and synced to all devices.', 'success');
}
function openEditProduct(idx) {
  const p = getProducts()[idx];
  document.getElementById('editProdIdx').value  = idx;
  document.getElementById('editName').value     = p.name;
  document.getElementById('editPrice').value    = p.price;
  document.getElementById('editOldPrice').value = p.oldPrice || '';
  document.getElementById('editDesc').value     = p.desc;
  document.getElementById('editImgPreview').style.display = 'none';
  editImgData = null;
  document.getElementById('editModal').classList.add('open');
}
function previewEditImg(inp) {
  if (inp.files[0]) {
    const r = new FileReader();
    r.onload = e => { const img = document.getElementById('editImgPreview'); img.src = e.target.result; img.style.display = 'block'; editImgData = e.target.result; };
    r.readAsDataURL(inp.files[0]);
  }
}

// ============================================================
// SAVE EDIT PRODUCT (UPDATED - async)
// ============================================================
async function saveEditProduct() {
  const idx   = parseInt(document.getElementById('editProdIdx').value);
  const prods = getProducts();
  prods[idx].name     = document.getElementById('editName').value;
  prods[idx].price    = parseInt(document.getElementById('editPrice').value);
  prods[idx].oldPrice = parseInt(document.getElementById('editOldPrice').value) || null;
  prods[idx].desc     = document.getElementById('editDesc').value;
  if (editImgData) prods[idx].img = editImgData;
  await setProducts(prods);
  closeModal('editModal');
  renderProductsTable();
  showToast('Product updated. Changes are live in the store.', 'success');
}

// ============================================================
// DELETE PRODUCT (UPDATED - async)
// ============================================================
async function deleteProduct(idx) {
  if (!confirm('Delete this product? It will be removed from the store immediately.')) return;
  const prods = getProducts(); 
  prods.splice(idx, 1); 
  await setProducts(prods);
  renderProductsTable();
  showToast('Product deleted from the store.', 'success');
}

// ============================================================
// ADMIN — NEWSLETTER
// ============================================================
function renderSubsTable() {
  const subs = getSubscribers();
  document.getElementById('nlSubCountEl').textContent = subs.length;
  const tbody = document.getElementById('subsBody');
  if (!subs.length) { tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-light);padding:2rem;">No subscribers yet.</td></tr>'; return; }
  tbody.innerHTML = subs.map((s, i) => `<tr>
    <td>${i + 1}</td>
    <td>${s.email}</td>
    <td>${s.date}</td>
    <td><button class="action-btn action-delete" onclick="removeSub(${i})">Remove</button></td>
  </tr>`).join('');
}

// ============================================================
// REMOVE SUB (UPDATED - async)
// ============================================================
async function removeSub(idx) {
  const subs = getSubscribers(); 
  subs.splice(idx, 1); 
  await setSubscribers(subs);
  renderSubsTable(); 
  showToast('Subscriber removed.');
}
function sendNewsletter() {
  const subj = document.getElementById('nlSubject').value.trim();
  const body = document.getElementById('nlBody').value.trim();
  const subs = getSubscribers();
  if (!subj || !body) { showToast('Please fill in both subject and message.', 'error'); return; }
  if (!subs.length) { showToast('There are no subscribers yet.'); return; }
  console.log(`[NEWSLETTER]\nTo: ${subs.map(s => s.email).join(', ')}\nSubject: ${subj}\n\n${body}`);
  showToast(`Newsletter sent to ${subs.length} subscriber(s).`, 'success');
  document.getElementById('nlSubject').value = '';
  document.getElementById('nlBody').value = '';
}

// ============================================================
// ADMIN — SETTINGS
// ============================================================
function loadSettingsUI() {
  const s = getSettings();
  if (s.bankName) {
    document.getElementById('setBankName').value = s.bankName;
    document.getElementById('setAccName').value  = s.accName || '';
    document.getElementById('setAccNum').value   = s.accNum  || '';
    document.getElementById('dspBankName').textContent = s.bankName;
    document.getElementById('dspAccName').textContent  = s.accName || '';
    document.getElementById('dspAccNum').textContent   = s.accNum  || '';
    document.getElementById('bankSetForm').style.display    = 'none';
    document.getElementById('bankSetDisplay').style.display = 'block';
    document.getElementById('clearBankBtn').style.display   = 'inline-block';
  } else {
    document.getElementById('bankSetForm').style.display    = 'block';
    document.getElementById('bankSetDisplay').style.display = 'none';
    document.getElementById('clearBankBtn').style.display   = 'none';
  }
  if (s.adminEmail) {
    document.getElementById('setAdminEmail').value = s.adminEmail;
    document.getElementById('dspAdminEmail').textContent = s.adminEmail;
    document.getElementById('emailSetForm').style.display    = 'none';
    document.getElementById('emailSetDisplay').style.display = 'block';
    document.getElementById('clearEmailBtn').style.display   = 'inline-block';
  } else {
    document.getElementById('emailSetForm').style.display    = 'block';
    document.getElementById('emailSetDisplay').style.display = 'none';
    document.getElementById('clearEmailBtn').style.display   = 'none';
  }
}

// ============================================================
// SAVE BANK DETAILS (UPDATED - async)
// ============================================================
async function saveBankDetails() {
  const s = getSettings();
  const name = document.getElementById('setBankName').value.trim();
  const accN = document.getElementById('setAccName').value.trim();
  const accU = document.getElementById('setAccNum').value.trim();
  if (!name || !accN || !accU) { showToast('Please fill in all bank fields.', 'error'); return; }
  s.bankName = name; s.accName = accN; s.accNum = accU;
  await setSettings(s); 
  loadSettingsUI();
  showToast('Bank details saved. Customers will see these at checkout.', 'success');
}

// ============================================================
// CLEAR BANK DETAILS (UPDATED - async)
// ============================================================
async function clearBankDetails() {
  if (!confirm('Remove bank details? Customers will see "Not configured" at checkout.')) return;
  const s = getSettings();
  delete s.bankName; delete s.accName; delete s.accNum;
  await setSettings(s); 
  loadSettingsUI();
  showToast('Bank details removed.');
}

// ============================================================
// SAVE ADMIN EMAIL (UPDATED - async)
// ============================================================
async function saveAdminEmail() {
  const email = document.getElementById('setAdminEmail').value.trim();
  if (!email) { showToast('Please enter an email.', 'error'); return; }
  const s = getSettings(); 
  s.adminEmail = email; 
  await setSettings(s);
  loadSettingsUI();
  showToast('Notification email saved.', 'success');
}

// ============================================================
// CLEAR NOTIFICATION EMAIL (UPDATED - async)
// ============================================================
async function clearNotifEmail() {
  if (!confirm('Remove notification email?')) return;
  const s = getSettings(); 
  delete s.adminEmail; 
  await setSettings(s);
  loadSettingsUI(); 
  showToast('Notification email removed.');
}
function changeAdminPassword() {
  const np1  = document.getElementById('changePwd1').value;
  const np2  = document.getElementById('changePwd2').value;
  if (!np1 || np1.length < 6) { showToast('New password must be at least 6 characters.', 'error'); return; }
  if (np1 !== np2) { showToast('New passwords do not match.', 'error'); return; }
  save('bg_custom_password', np1);
  document.getElementById('curPwd').value = '';
  document.getElementById('changePwd1').value = '';
  document.getElementById('changePwd2').value = '';
  showToast('Password updated successfully. Use your new password next time.', 'success');
}

// ============================================================
// ADMIN TAB SWITCHER
// ============================================================
function adminTab(name, el) {
  document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.admin-nav-link').forEach(l => l.classList.remove('active'));
  document.getElementById('admin-' + name).classList.add('active');
  el.classList.add('active');
  const titles = { dashboard: 'Dashboard', orders: 'Orders', products: 'Products', newsletter: 'Newsletter', settings: 'Settings' };
  document.getElementById('adminTitle').textContent = titles[name] || name;
  if (name === 'dashboard')  renderAdminDashboard();
  if (name === 'orders')     renderOrdersTable();
  if (name === 'products')   renderProductsTable();
  if (name === 'newsletter') renderSubsTable();
  if (name === 'settings')   loadSettingsUI();
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3200);
}

// ============================================================
// INIT (UPDATED - loads data from server)
// ============================================================
async function init() {
    await loadFromServer();
    updateCartCount();
    renderHomeProducts();
    console.log('🚀 Bagistrate initialized with server sync');
    console.log('💡 Run testAPI() to test connection');
    console.log('📧 Configure EmailJS for email notifications');
}

init();

document.querySelectorAll('.modal-overlay').forEach(m =>
  m.addEventListener('click', function(e) { if (e.target === this) this.classList.remove('open'); })
);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
});