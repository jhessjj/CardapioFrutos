const API_URL = "https://script.google.com/macros/s/AKfycby6h6lQ5rZeRTntZkErmcjvY3e7Bo5I9DK65fwRTYuUZRiJfbZCpeUoVL-INpmC9QS_5g/exec";
const WHATSAPP_NUMBER = "558994127037";
const ADMIN_PASSWORD = "Frutosp1725";
const DISCOUNT_THRESHOLD = 50.00;
const DISCOUNT_AMOUNT = 6.00;

let products = [];
let neighborhoods = [];
let cart = [];
let currentProductForOptions = null;
let selectedOptions = [];
let selectedExtras = [];
let selectedQuantity = 1;
let selectedNeighborhood = '';

// DOM Elements
const menuSection = document.getElementById('menu-section');
const adminSection = document.getElementById('admin-section');
const categoriesContainer = document.getElementById('categories-container');
const adminProductList = document.getElementById('admin-product-list');
const optionsModal = document.getElementById('options-modal');
const cartDrawer = document.getElementById('cart-drawer');

// Communication Functions
async function fetchData(action) {
    try {
        const response = await fetch(`${API_URL}?action=${action}`);
        if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        showToast(`Erro ao carregar: ${error.message}`, 'error');
        return [];
    }
}

async function postData(payload) {
    try {
        showToast('Processando...', 'info');
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status === 'success') showToast(result.message, 'success');
        else showToast(result.message, 'error');
        return result;
    } catch (error) {
        console.error('Erro no postData:', error);
        showToast(`Erro ao salvar. Verifique a conexão.`, 'error');
        return { status: 'error', message: error.message };
    }
}

async function initializeApp() {
    const [productsData, neighborhoodsData] = await Promise.all([
        fetchData('getProducts'),
        fetchData('getNeighborhoods')
    ]);

    products = productsData.map((p, index) => {
        // Normaliza campos que podem vir com nomes diferentes da planilha
        if (p.extra && !p.extras) p.extras = p.extra;
        if (p.option && !p.options) p.options = p.option;

        if (typeof p.stock === 'string') {
            try { p.stock = JSON.parse(p.stock); } catch(e) { p.stock = {}; }
        }
        return p;
    });
    neighborhoods = neighborhoodsData;

    renderMenu();
    renderNeighborhoodSelector();
    if (!adminSection.classList.contains('hidden')) {
        renderAdminProducts();
        renderAdminNeighborhoods();
    }
}

document.addEventListener('DOMContentLoaded', initializeApp);

function showToast(message, type = 'info') {
    const existing = document.querySelectorAll('.toast');
    existing.forEach(t => t.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Navigation
document.getElementById('btn-view-menu').onclick = () => {
    menuSection.classList.remove('hidden');
    adminSection.classList.add('hidden');
    document.getElementById('btn-view-menu').classList.add('active');
    document.getElementById('btn-view-admin').classList.remove('active');
};

document.getElementById('btn-view-admin').onclick = () => {
    const pass = prompt('Digite a senha de administrador:');
    if (pass === ADMIN_PASSWORD) {
        menuSection.classList.add('hidden');
        adminSection.classList.remove('hidden');
        document.getElementById('btn-view-admin').classList.add('active');
        document.getElementById('btn-view-menu').classList.remove('active');
        renderAdminProducts();
        renderAdminNeighborhoods();
    } else if (pass !== null) {
        alert('Senha incorreta!');
    }
};

document.getElementById('btn-logout').onclick = () => {
    adminSection.classList.add('hidden');
    menuSection.classList.remove('hidden');
    document.getElementById('btn-view-menu').classList.add('active');
    document.getElementById('btn-view-admin').classList.remove('active');
};

// Admin Tabs
document.getElementById('tab-products').onclick = () => {
    document.getElementById('admin-products-tab').classList.add('active');
    document.getElementById('admin-neighborhoods-tab').classList.remove('active');
    document.getElementById('tab-products').classList.add('active');
    document.getElementById('tab-neighborhoods').classList.remove('active');
};

document.getElementById('tab-neighborhoods').onclick = () => {
    document.getElementById('admin-neighborhoods-tab').classList.add('active');
    document.getElementById('admin-products-tab').classList.remove('active');
    document.getElementById('tab-neighborhoods').classList.add('active');
    document.getElementById('tab-products').classList.remove('active');
};

// Menu Rendering
function renderMenu(filter = '') {
    categoriesContainer.innerHTML = '';
    if (!products || products.length === 0) {
        categoriesContainer.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>Nenhum produto encontrado.</p></div>';
        return;
    }
    const categories = [...new Set(products.map(p => p.category))];
    
    categories.forEach(cat => {
        const catProducts = products.filter(p => p.category === cat && p.name.toLowerCase().includes(filter.toLowerCase()));
        if (catProducts.length === 0) return;

        const section = document.createElement('div');
        section.className = 'category-section';
        
        section.innerHTML = `
            <h2 class="category-title">${cat}</h2>
            <div class="product-grid"></div>
        `;
        
        const grid = section.querySelector('.product-grid');
        
        catProducts.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            // Se não houver sabores definidos ou o objeto de estoque estiver totalmente vazio {}, 
            // permitimos a venda (consideramos disponível por padrão).
            // O bloqueio só acontece se houver sabores e TODOS estiverem com valor 0.
            let isOutOfStock = false;
            if (prod.options && prod.options.length > 0) {
                const hasStockData = prod.stock && Object.keys(prod.stock).length > 0;
                if (hasStockData) {
                    const totalStock = Object.values(prod.stock).reduce((a, b) => a + (Number(b) || 0), 0);
                    if (totalStock <= 0) isOutOfStock = true;
                }
            }

            card.innerHTML = `
                <div class="product-image">
                    ${prod.img ? `<img src="${prod.img}" alt="${prod.name}">` : '<span>🍨</span>'}
                </div>
                <div class="product-info">
                    <div class="product-name">${prod.name}</div>
                    <div class="product-price">R$ ${parseFloat(prod.price).toFixed(2)}</div>
                    <button class="btn-add-cart" ${isOutOfStock ? 'disabled' : ''} onclick="openOptions('${prod.id}')">
                        ${isOutOfStock ? 'Indisponível' : 'Adicionar'}
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
        
        categoriesContainer.appendChild(section);
    });
}

// Search
document.getElementById('search-input').oninput = (e) => {
    renderMenu(e.target.value);
};

// Neighborhoods
function renderNeighborhoodSelector() {
    const select = document.getElementById('neighborhood-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Escolha seu bairro --</option>';
    neighborhoods.forEach(n => {
        const option = document.createElement('option');
        option.value = n.name;
        option.innerText = n.name;
        select.appendChild(option);
    });
}

document.getElementById('neighborhood-select').onchange = (e) => {
    selectedNeighborhood = e.target.value;
    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    document.getElementById('neighborhood-fee').innerText = neighborhood ? `Taxa: R$ ${neighborhood.fee.toFixed(2)}` : `Taxa: -`;
    updateCart();
};

// Helper para verificar se cobra por sabor
function isChargePerFlavor(category) {
    if (!category) return false;
    const cat = category.toLowerCase();
    
    // O Self Service é a única exceção onde o preço é fixo independente dos sabores
    if (cat.includes('self service') || cat.includes('self-service')) {
        return false;
    }
    
    // Para todas as outras categorias (Picolés, Potes de 1L, 1.5L, Copos, etc), 
    // se o produto tem opções de sabores, cada sabor selecionado deve ser cobrado individualmente.
    return true;
}

// Options Modal
window.openOptions = (productId) => {
    currentProductForOptions = products.find(p => p.id.toString() === productId.toString());
    
    if (!currentProductForOptions) {
        showToast('Produto não encontrado!', 'error');
        return;
    }

    selectedOptions = [];
    selectedExtras = [];
    selectedQuantity = 1;
    
    document.getElementById('modal-prod-name').innerText = currentProductForOptions.name;
    document.getElementById('qty-input').value = 1;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    if (currentProductForOptions.options && currentProductForOptions.options.length > 0) {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.innerHTML = `<label>Sabores</label>`;
        const list = document.createElement('div');
        list.className = 'option-list';
        
        currentProductForOptions.options.forEach(opt => {
            // Se o sabor não existir no objeto stock, assumimos que tem estoque (disponível por padrão)
            // Só bloqueia se o valor estiver explicitamente como 0
            const stockValue = currentProductForOptions.stock ? currentProductForOptions.stock[opt] : undefined;
            const stockQty = stockValue !== undefined ? Number(stockValue) : 999;
            
            const item = document.createElement('div');
            const isOut = stockQty <= 0;
            item.className = `option-item ${isOut ? 'disabled' : ''}`;
            item.innerHTML = `
                <span>${opt}</span> 
                ${isOut ? '<small class="out-of-stock">Esgotado</small>' : (stockQty <= 5 ? `<small class="low-stock">Últimas ${stockQty}</small>` : '')}
            `;
            
            if (!isOut) {
                item.onclick = () => {
                    item.classList.toggle('selected');
                    if (item.classList.contains('selected')) {
                        selectedOptions.push(opt);
                    } else {
                        selectedOptions = selectedOptions.filter(o => o !== opt);
                    }
                };
            }
            list.appendChild(item);
        });
        
        group.appendChild(list);
        container.appendChild(group);
    }

    if (currentProductForOptions.extras && currentProductForOptions.extras.length > 0) {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.innerHTML = `<label>Extras</label>`;
        const list = document.createElement('div');
        list.className = 'option-list';
        
        currentProductForOptions.extras.forEach(extra => {
            const item = document.createElement('div');
            item.className = 'option-item';
            item.innerText = extra;
            item.onclick = () => {
                item.classList.toggle('selected');
                if (item.classList.contains('selected')) {
                    selectedExtras.push(extra);
                } else {
                    selectedExtras = selectedExtras.filter(e => e !== extra);
                }
            };
            list.appendChild(item);
        });
        
        group.appendChild(list);
        container.appendChild(group);
    }

    optionsModal.classList.remove('hidden');
};

document.getElementById('btn-close-options').onclick = () => optionsModal.classList.add('hidden');
document.getElementById('btn-close-options-alt').onclick = () => optionsModal.classList.add('hidden');

document.getElementById('btn-qty-minus').onclick = () => {
    selectedQuantity = Math.max(1, selectedQuantity - 1);
    document.getElementById('qty-input').value = selectedQuantity;
};

document.getElementById('btn-qty-plus').onclick = () => {
    selectedQuantity++;
    document.getElementById('qty-input').value = selectedQuantity;
};

document.getElementById('btn-confirm-options').onclick = () => {
    if (currentProductForOptions.options && currentProductForOptions.options.length > 0 && selectedOptions.length === 0) {
        showToast('Selecione pelo menos um sabor!', 'warning');
        return;
    }

    const chargePerFlavor = isChargePerFlavor(currentProductForOptions.category);
    // Se cobrar por sabor, a quantidade final é o número de sabores. Se não, é a quantidade do seletor.
    const finalQty = chargePerFlavor ? selectedOptions.length : selectedQuantity;
    
    const item = {
        id: currentProductForOptions.id,
        name: currentProductForOptions.name,
        category: currentProductForOptions.category,
        price: currentProductForOptions.price,
        qty: finalQty,
        chosenOptions: [...selectedOptions],
        chosenExtras: [...selectedExtras],
        totalPrice: currentProductForOptions.price * finalQty
    };

    cart.push(item);
    updateCart();
    optionsModal.classList.add('hidden');
    showToast(`${currentProductForOptions.name} adicionado ao carrinho!`, 'success');
};

// Cart Logic
function updateCart() {
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    let subtotal = 0;
    
    if (cart.length === 0) {
        list.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-basket"></i><p>Seu carrinho está vazio</p></div>';
    } else {
        cart.forEach((item, idx) => {
            subtotal += item.totalPrice;
            const div = document.createElement('div');
            div.className = 'cart-item';
            div.innerHTML = `
                <div class="cart-item-info">
                    <div class="cart-item-header">
                        <strong>${item.qty}x ${item.name}</strong>
                        <span class="cart-item-price">R$ ${item.totalPrice.toFixed(2)}</span>
                    </div>
                    <div class="cart-item-details">
                        ${item.chosenOptions.length ? '<span>🍨 Sabores: ' + item.chosenOptions.join(', ') + '</span>' : ''}
                        ${item.chosenExtras.length ? '<span>✨ Extras: ' + item.chosenExtras.join(', ') + '</span>' : ''}
                    </div>
                    <button class="btn-remove-item" onclick="removeFromCart(${idx})">
                        <i class="fas fa-trash-alt"></i> Remover
                    </button>
                </div>
            `;
            list.appendChild(div);
        });
    }
    
    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    const deliveryFee = neighborhood ? neighborhood.fee : 0;
    const discount = subtotal >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
    const total = subtotal + deliveryFee - discount;
    
    document.getElementById('subtotal').innerText = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('delivery-fee').innerText = `R$ ${deliveryFee.toFixed(2)}`;
    
    const discountRow = document.getElementById('discount-row');
    if (discount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('discount-amount').innerText = `- R$ ${discount.toFixed(2)}`;
    } else {
        discountRow.style.display = 'none';
    }
    
    document.getElementById('cart-total').innerText = `R$ ${total.toFixed(2)}`;
    document.getElementById('cart-count').innerText = cart.reduce((acc, item) => acc + item.qty, 0);
}

window.removeFromCart = (idx) => {
    cart.splice(idx, 1);
    updateCart();
};

document.getElementById('open-cart').onclick = () => cartDrawer.classList.add('open');
document.getElementById('close-cart').onclick = () => cartDrawer.classList.remove('open');

document.getElementById('btn-finish-order').onclick = async () => {
    if (cart.length === 0) { 
        showToast('Seu carrinho está vazio!', 'error'); 
        return; 
    }
    
    const name = document.getElementById('client-name').value.trim();
    const address = document.getElementById('client-address').value.trim();
    
    if (!name || !address || !selectedNeighborhood) { 
        showToast('Por favor, preencha seu nome, endereço e selecione o bairro!', 'warning'); 
        return; 
    }

    let msg = `🍦 *Novo Pedido - Frutos de Goiás*\n\n`;
    msg += `👤 *Cliente:* ${name}\n`;
    msg += `📍 *Endereço:* ${address}\n`;
    msg += `🏘️ *Bairro:* ${selectedNeighborhood}\n\n`;
    msg += `🛒 *Itens:*\n`;
    
    cart.forEach(item => {
        msg += `• *${item.qty}x ${item.name}* (R$ ${item.totalPrice.toFixed(2)})\n`;
        if (item.chosenOptions && item.chosenOptions.length) msg += `  _Sabores: ${item.chosenOptions.join(', ')}_\n`;
        if (item.chosenExtras && item.chosenExtras.length) msg += `  _Extras: ${item.chosenExtras.join(', ')}_\n`;
    });
    
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    const deliveryFee = neighborhood ? neighborhood.fee : 0;
    const discount = subtotal >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
    const totalGeral = (subtotal + deliveryFee - discount);
    
    msg += `\n💰 *Subtotal:* R$ ${subtotal.toFixed(2)}`;
    msg += `\n🚚 *Entrega:* R$ ${deliveryFee.toFixed(2)}`;
    if (discount > 0) msg += `\n🎁 *Desconto:* -R$ ${discount.toFixed(2)}`;
    msg += `\n\n⭐ *TOTAL: R$ ${totalGeral.toFixed(2)}*`;

    try {
        const stockUpdates = [];
        cart.forEach(item => {
            if (item.chosenOptions && item.chosenOptions.length > 0) {
                const chargePerFlavor = isChargePerFlavor(item.category || "");
                item.chosenOptions.forEach(flavor => {
                    // Se cobra por sabor, cada sabor desconta 1. Se não (self service), divide a quantidade total entre os sabores.
                    const qtyToDiscount = chargePerFlavor ? 1 : (item.qty / item.chosenOptions.length);
                    stockUpdates.push({ productId: item.id, flavor: flavor, qty: qtyToDiscount });
                });
            }
        });

        if (stockUpdates.length > 0) {
            postData({ action: 'updateStockByFlavor', updates: stockUpdates });
        }
    } catch (e) { 
        console.error("Erro ao processar estoque:", e); 
    }

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    const newWindow = window.open(whatsappUrl, '_blank');
    if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
        window.location.href = whatsappUrl;
    }
    
    cart = [];
    updateCart();
    if (cartDrawer) cartDrawer.classList.remove('open');
    showToast('Pedido enviado com sucesso!', 'success');
    setTimeout(() => initializeApp(), 2000);
};

// Admin Functions
function renderAdminProducts() {
    adminProductList.innerHTML = '';
    products.forEach(p => {
        let stockHTML = '';
        if (p.options && p.options.length > 0) {
            p.options.forEach(opt => {
                const qty = (p.stock && p.stock[opt] !== undefined) ? p.stock[opt] : 0;
                stockHTML += `
                    <div class="admin-stock-item">
                        <span>${opt}</span>
                        <div class="admin-stock-controls">
                            <button onclick="adjustStock('${p.id}', '${opt}', -1)" class="btn-stock-minus">−</button>
                            <span class="stock-qty-badge">${qty}</span>
                            <button onclick="adjustStock('${p.id}', '${opt}', 1)" class="btn-stock-plus">+</button>
                        </div>
                    </div>`;
            });
        } else {
            stockHTML = '<p class="no-options-msg">Sem sabores definidos</p>';
        }

        const card = document.createElement('div');
        card.className = 'admin-product-card';
        card.innerHTML = `
            <div class="admin-card-header">
                <div class="admin-card-title">
                    <h4>${p.name}</h4>
                    <span class="admin-card-meta">${p.category} • R$ ${parseFloat(p.price).toFixed(2)}</span>
                </div>
                <div class="admin-card-actions">
                    <button onclick="editProduct('${p.id}')" class="btn-icon-edit"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct('${p.id}')" class="btn-icon-delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="admin-card-stock">
                <h5>Controle de Estoque</h5>
                <div class="admin-stock-list">${stockHTML}</div>
            </div>
        `;
        adminProductList.appendChild(card);
    });
}

window.adjustStock = async (productId, flavor, amount) => {
    const p = products.find(prod => prod.id.toString() === productId.toString());
    if (!p) {
        showToast('Produto não encontrado!', 'error');
        return;
    }
    
    if (!p.stock) p.stock = {};
    p.stock[flavor] = Math.max(0, (p.stock[flavor] || 0) + amount);
    
    renderAdminProducts(); 
    const result = await postData({ action: 'saveProduct', data: { ...p, stock: JSON.stringify(p.stock) } });
};

document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-index').value;
    const options = document.getElementById('prod-options').value.split(',').map(s => s.trim()).filter(s => s);
    
    let existingStock = {};
    if (id) {
        const p = products.find(prod => prod.id.toString() === id.toString());
        if (p && p.stock) existingStock = p.stock;
    }
    
    options.forEach(opt => {
        if (existingStock[opt] === undefined) existingStock[opt] = 0;
    });

    const productData = {
        id: id || null,
        name: document.getElementById('prod-name').value,
        category: document.getElementById('prod-category').value,
        price: parseFloat(document.getElementById('prod-price').value),
        img: document.getElementById('prod-img').value,
        desc: document.getElementById('prod-desc').value,
        options: options,
        extras: document.getElementById('prod-extras').value.split(',').map(s => s.trim()).filter(s => s),
        stock: JSON.stringify(existingStock)
    };

    const result = await postData({ action: 'saveProduct', data: productData });
    if (result.status === 'success') {
        await initializeApp();
        document.getElementById('product-form').reset();
        document.getElementById('edit-index').value = "";
        document.getElementById('product-form-title').innerText = "Adicionar Novo Produto";
        document.getElementById('btn-cancel').classList.add('hidden');
    }
};

window.editProduct = (id) => {
    const p = products.find(prod => prod.id.toString() === id.toString());
    if (!p) {
        showToast('Produto não encontrado!', 'error');
        return;
    }
    
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-img').value = p.img || '';
    document.getElementById('prod-desc').value = p.desc || '';
    document.getElementById('prod-options').value = (p.options || []).join(', ');
    document.getElementById('prod-extras').value = (p.extras || []).join(', ');
    document.getElementById('edit-index').value = p.id;
    document.getElementById('product-form-title').innerText = "Editar Produto";
    document.getElementById('btn-cancel').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

document.getElementById('btn-cancel').onclick = () => {
    document.getElementById('product-form').reset();
    document.getElementById('edit-index').value = "";
    document.getElementById('product-form-title').innerText = "Adicionar Novo Produto";
    document.getElementById('btn-cancel').classList.add('hidden');
};

window.deleteProduct = async (id) => {
    const product = products.find(p => p.id.toString() === id.toString());
    if (!product) {
        showToast('Produto não encontrado!', 'error');
        return;
    }
    
    if (confirm(`Deseja remover "${product.name}" permanentemente?`)) {
        const result = await postData({ action: 'deleteProduct', id: id });
        if (result.status === 'success') {
            await initializeApp();
        }
    }
};

function renderAdminNeighborhoods() {
    const list = document.getElementById('admin-neighborhoods-list');
    list.innerHTML = '';
    neighborhoods.forEach((n, index) => {
        const div = document.createElement('div');
        div.className = 'admin-neighborhood-card';
        div.innerHTML = `
            <div class="admin-card-header">
                <div class="admin-card-title">
                    <h4>${n.name}</h4>
                    <span class="admin-card-meta">Taxa: R$ ${parseFloat(n.fee).toFixed(2)}</span>
                </div>
                <div class="admin-card-actions">
                    <button onclick="editNeighborhood(${index})" class="btn-icon-edit"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteNeighborhood(${index})" class="btn-icon-delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

window.editNeighborhood = (index) => {
    const n = neighborhoods[index];
    if (!n) return;
    document.getElementById('neighborhood-name').value = n.name;
    document.getElementById('neighborhood-fee-input').value = n.fee;
    document.getElementById('edit-neighborhood-index').value = index;
    document.getElementById('neighborhood-form-title').innerText = "Editar Bairro";
};

window.deleteNeighborhood = async (index) => {
    const n = neighborhoods[index];
    if (!n) return;
    
    if (confirm(`Deseja remover "${n.name}" permanentemente?`)) {
        await postData({ action: 'deleteNeighborhood', index: index });
        await initializeApp();
    }
};

document.getElementById('neighborhood-form').onsubmit = async (e) => {
    e.preventDefault();
    const index = document.getElementById('edit-neighborhood-index').value;
    const name = document.getElementById('neighborhood-name').value;
    const fee = parseFloat(document.getElementById('neighborhood-fee-input').value);

    const result = await postData({ 
        action: 'saveNeighborhood', 
        data: { name, fee, index: index ? parseInt(index) : null }
    });

    if (result.status === 'success') {
        await initializeApp();
        document.getElementById('neighborhood-form').reset();
        document.getElementById('edit-neighborhood-index').value = "";
        document.getElementById('neighborhood-form-title').innerText = "Adicionar Novo Bairro";
    }
};
