const API_URL = "https://script.google.com/macros/s/AKfycbwpv4OcS_LSAiKxspnsLAtJXljbVFk9YD4s8qpYVR_bVRew4x7XfrYMbC8cDWgciKLImA/exec";
const WHATSAPP_NUMBER = "558994127037";
const ADMIN_PASSWORD = "Frutosp1725";
const DISCOUNT_THRESHOLD = 50.00;
const DISCOUNT_AMOUNT = 6.00;

let products = [];
let neighborhoods = [];
let cart = [];
let currentProductForOptions = null;
let selectedOptions = []; // { name: string, qty: number }
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

    if (!Array.isArray(productsData)) {
        console.error("Dados de produtos inválidos:", productsData);
        products = [];
    } else {
        products = productsData.map(p => {
    let rawStock = null;
    for (let key in p) {
        if (key.toLowerCase().trim() === 'stock') {
            rawStock = p[key];
            break;
        }
    }

    if (typeof rawStock === 'string') {
        try { 
            p.stock = JSON.parse(rawStock); 
        } catch(e) { 
            console.error("Erro ao ler JSON de estoque:", e);
            p.stock = {}; 
        }
    } else if (rawStock && typeof rawStock === 'object') {
        p.stock = rawStock;
    } else {
        p.stock = {};
    }

    // Processa Restrições (Sabores)
    let rawRestrictions = null;
    for (let key in p) {
        if (key.toLowerCase().trim() === 'restrictions') {
            rawRestrictions = p[key];
            break;
        }
    }
    if (typeof rawRestrictions === 'string') {
        try { 
            p.restrictions = JSON.parse(rawRestrictions); 
        } catch(e) { 
            p.restrictions = {}; 
        }
    } else if (rawRestrictions && typeof rawRestrictions === 'object') {
        p.restrictions = rawRestrictions;
    } else {
        p.restrictions = {};
    }

    let rawExtras = p.extras || p.extra || [];
    p.extras = (typeof rawExtras === 'string') ? rawExtras.split(',').map(s => s.trim()).filter(s => s) : (Array.isArray(rawExtras) ? rawExtras : []);

    let rawOptions = p.options || p.option || [];
    p.options = (typeof rawOptions === 'string') ? rawOptions.split(',').map(s => s.trim()).filter(s => s) : (Array.isArray(rawOptions) ? rawOptions : []);
    
    return p;
        });
    }

    neighborhoods = Array.isArray(neighborhoodsData) ? neighborhoodsData : [];

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
    document.getElementById('admin-neighborhoods-tab').scrollIntoView({ behavior: 'smooth' });
};

// Menu Rendering
function renderMenu(filter = '') {
    const container = document.getElementById('categories-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (!products || products.length === 0) {
        container.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>Nenhum produto encontrado.</p></div>';
        return;
    }

    const categories = [...new Set(products.map(p => p.category))];
    
    categories.forEach(cat => {
        const catProducts = products.filter(p => 
            p.category === cat && 
            (p.name || '').toLowerCase().includes((filter || '').toLowerCase())
        );
        
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
            
            let isOutOfStock = false;
            const hasOptions = prod.options && Array.isArray(prod.options) && prod.options.length > 0;
            
            if (hasOptions) {
                const stockData = prod.stock || {};
                const hasAvailableFlavor = prod.options.some(opt => {
                    const cleanOpt = opt.toString().trim();
                    const stockValue = stockData[cleanOpt];
                    return stockValue === undefined || Number(stockValue) > 0;
                });
                if (!hasAvailableFlavor) isOutOfStock = true;
            }

            const price = parseFloat(prod.price || 0).toFixed(2);
            card.innerHTML = `
                <div class="product-image" onclick="openOptions('${prod.id}')">
                    ${prod.img ? `<img src="${prod.img}" alt="${prod.name}">` : '<span>🍨</span>'}
                </div>
                <div class="product-info">
                    <div class="product-name">${prod.name || 'Sem nome'}</div>
                    <div class="product-desc" style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">${prod.desc || ''}</div>
                    <div class="product-price">R$ ${price}</div>
                    <button class="btn-add-cart" ${isOutOfStock ? 'disabled' : ''} onclick="openOptions('${prod.id}')">
                        ${isOutOfStock ? 'Indisponível' : 'Adicionar'}
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
        container.appendChild(section);
    });
}

document.getElementById('search-input').oninput = (e) => {
    renderMenu(e.target.value);
};

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
    const feeDisplay = document.getElementById('neighborhood-fee');
    if (feeDisplay) feeDisplay.innerText = neighborhood ? `Taxa: R$ ${neighborhood.fee.toFixed(2)}` : `Taxa: -`;
    updateCart();
};

function isChargePerFlavor(category) {
    if (!category) return false;
    const cat = category.toLowerCase();
    return !(cat.includes('self service') || cat.includes('self-service'));
}

// Options Modal - RESTORED ORIGINAL FLOW
function openOptions(productId) {
    const prod = products.find(p => p.id.toString() === productId.toString());
    if (!prod) return;

    currentProductForOptions = prod;
    selectedOptions = [];
    selectedExtras = [];
    selectedQuantity = 1;
    
    document.getElementById('modal-prod-name').innerText = prod.name;
    document.getElementById('qty-input').value = 1;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    const hasOptions = prod.options && prod.options.length > 0;
    
    // Original Logic: Show/Hide global qty based on options
    const globalQtyControl = document.querySelector('.qty-control');
    if (globalQtyControl) {
        if (hasOptions) globalQtyControl.style.display = 'none';
        else globalQtyControl.style.display = 'flex';
    }

    if (hasOptions) {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.innerHTML = `<label>Escolha os sabores:</label><div class="flavor-list-container"></div>`;
        const list = group.querySelector('.flavor-list-container');
        
        prod.options.forEach(opt => {
            const stockValue = (prod.stock && prod.stock[opt] !== undefined) ? prod.stock[opt] : 1;
            const isAvailable = Number(stockValue) > 0;
            const restrictions = prod.restrictions?.[opt] || { glutenFree: false, lactoseFree: false };
            
            let badgesHTML = '';
            if (restrictions.glutenFree) badgesHTML += '<span class="badge badge-gluten" style="margin-left:5px">S. Glúten</span>';
            if (restrictions.lactoseFree) badgesHTML += '<span class="badge badge-lactose" style="margin-left:5px">S. Lactose</span>';

            const item = document.createElement('div');
            item.className = 'flavor-item-row';
            item.innerHTML = `
                <div style="display:flex; flex-direction:column">
                    <span style="${!isAvailable ? 'color: #9ca3af; text-decoration: line-through;' : ''}">${opt} ${!isAvailable ? '<span class="out-of-stock-label">(Esgotado)</span>' : ''}</span>
                    <div style="display:flex; gap:4px; margin-top:2px">${badgesHTML}</div>
                </div>
                ${isAvailable ? `
                <div class="flavor-qty-control" style="display:flex; align-items:center; gap:8px;">
                    <button class="btn-flavor-qty" onclick="updateFlavorQty('${opt}', -1)">-</button>
                    <span class="flavor-qty-num" id="qty-${opt}">0</span>
                    <button class="btn-flavor-qty" onclick="updateFlavorQty('${opt}', 1)">+</button>
                </div>
                ` : ''}
            `;
            list.appendChild(item);
        });
        container.appendChild(group);
    }

    if (prod.extras && prod.extras.length > 0) {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.innerHTML = `<label>Extras (Máx. 3):</label><div class="option-list"></div>`;
        const list = group.querySelector('.option-list');
        prod.extras.forEach(extra => {
            const item = document.createElement('div');
            item.className = 'option-item';
            item.innerText = extra;
            item.onclick = () => toggleExtra(extra, item);
            list.appendChild(item);
        });
        container.appendChild(group);
        
        const deliveryOption = document.createElement('div');
        deliveryOption.className = 'extra-delivery-option';
        deliveryOption.innerHTML = `
            <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                <input type="checkbox" id="extras-separate"> Enviar extras separadamente
            </label>
        `;
        container.appendChild(deliveryOption);
    }

    optionsModal.classList.remove('hidden');
}

window.updateFlavorQty = (flavor, delta) => {
    const isSelfService = currentProductForOptions.category.toLowerCase().includes('self');
    const currentTotal = selectedOptions.reduce((acc, curr) => acc + curr.qty, 0);
    let existing = selectedOptions.find(o => o.name === flavor);
    
    if (delta > 0) {
        // Original Logic: Limit 3 flavors for Self Service
        if (isSelfService && currentTotal >= 3) {
            showToast('Limite de 3 sabores para Self Service!', 'warning');
            return;
        }
        if (!existing) {
            existing = { name: flavor, qty: 0 };
            selectedOptions.push(existing);
        }
        existing.qty++;
    } else {
        if (existing && existing.qty > 0) {
            existing.qty--;
            if (existing.qty === 0) selectedOptions = selectedOptions.filter(o => o.name !== flavor);
        }
    }
    const qtySpan = document.getElementById(`qty-${flavor}`);
    if (qtySpan) qtySpan.innerText = existing ? existing.qty : 0;
};

function toggleExtra(extra, element) {
    const idx = selectedExtras.indexOf(extra);
    if (idx > -1) {
        selectedExtras.splice(idx, 1);
        element.classList.remove('selected');
    } else {
        if (selectedExtras.length >= 3) {
            showToast('Limite de 3 extras atingido!', 'warning');
            return;
        }
        selectedExtras.push(extra);
        element.classList.add('selected');
    }
}

document.getElementById('btn-qty-minus').onclick = () => {
    if (selectedQuantity > 1) {
        selectedQuantity--;
        document.getElementById('qty-input').value = selectedQuantity;
    }
};

document.getElementById('btn-qty-plus').onclick = () => {
    selectedQuantity++;
    document.getElementById('qty-input').value = selectedQuantity;
};

document.getElementById('btn-confirm-options').onclick = () => {
    const totalFlavors = selectedOptions.reduce((sum, o) => sum + o.qty, 0);
    const hasOptions = currentProductForOptions.options.length > 0;
    
    if (hasOptions && totalFlavors === 0) {
        showToast('Selecione pelo menos um sabor!', 'warning');
        return;
    }

    const extrasSeparate = document.getElementById('extras-separate')?.checked || false;

    const cartItem = {
        id: Date.now(),
        productId: currentProductForOptions.id,
        category: currentProductForOptions.category,
        name: currentProductForOptions.name,
        price: currentProductForOptions.price,
        quantity: (hasOptions && totalFlavors > 0) ? totalFlavors : selectedQuantity,
        options: [...selectedOptions],
        extras: [...selectedExtras],
        extrasSeparate: extrasSeparate
    };

    cart.push(cartItem);
    updateCart();
    optionsModal.classList.add('hidden');
    showToast('Adicionado ao carrinho!', 'success');
};

document.getElementById('btn-close-options').onclick = () => optionsModal.classList.add('hidden');
document.getElementById('btn-close-options-alt').onclick = () => optionsModal.classList.add('hidden');

function updateCart() {
    const container = document.getElementById('cart-items');
    container.innerHTML = '';
    let subtotal = 0;

    cart.forEach(item => {
        const isSelfService = item.category && (item.category.toLowerCase().includes('self service') || item.category.toLowerCase().includes('self-service'));
        const itemTotal = isSelfService ? item.price : (item.price * item.quantity);
        subtotal += itemTotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        
        const flavorText = item.options.map(o => `${o.qty}x ${o.name}`).join(', ');
        const extrasText = item.extras.length > 0 ? ` + Extras: ${item.extras.join(', ')}${item.extrasSeparate ? ' (Separados)' : ''}` : '';

        div.innerHTML = `
            <div class="cart-item-header">
                <span>${item.name}</span>
                <span>R$ ${itemTotal.toFixed(2)}</span>
            </div>
            <div class="cart-item-details">
                ${flavorText ? `${flavorText}` : `${item.quantity} un.`}${extrasText}
            </div>
            <button class="btn-remove-item" onclick="removeFromCart(${item.id})">Remover</button>
        `;
        container.appendChild(div);
    });

    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    const deliveryFee = neighborhood ? neighborhood.fee : 0;
    
    let discount = 0;
    if (subtotal >= DISCOUNT_THRESHOLD) discount = DISCOUNT_AMOUNT;

    const total = subtotal + deliveryFee - discount;

    document.getElementById('subtotal').innerText = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('delivery-fee').innerText = `R$ ${deliveryFee.toFixed(2)}`;
    
    const discRow = document.getElementById('discount-row');
    if (discount > 0) {
        discRow.style.display = 'flex';
        document.getElementById('discount-amount').innerText = `- R$ ${discount.toFixed(2)}`;
    } else {
        discRow.style.display = 'none';
    }

    document.getElementById('cart-total').innerText = `R$ ${total.toFixed(2)}`;
    document.getElementById('cart-count').innerText = cart.reduce((sum, i) => sum + i.quantity, 0);
}

window.removeFromCart = (id) => {
    cart = cart.filter(i => i.id !== id);
    updateCart();
};

document.getElementById('open-cart').onclick = () => cartDrawer.classList.add('open');
document.getElementById('close-cart').onclick = () => cartDrawer.classList.remove('open');

document.getElementById('btn-finish-order').onclick = () => {
    if (cart.length === 0) { showToast('Seu carrinho está vazio!', 'warning'); return; }
    if (!selectedNeighborhood) { showToast('Selecione seu bairro!', 'warning'); return; }
    
    
    const name = document.getElementById('client-name').value;
    const street = document.getElementById('client-street').value;
    const number = document.getElementById('client-number').value;
    const ref = document.getElementById('client-ref').value;
    const type = document.getElementById('client-type').value;

    if (!name || !street || !number || !type) { 
        showToast('Preencha seu nome, rua, número e se é casa/apto!', 'warning'); 
        return; 
    }
    const paymentMethod = document.getElementById('payment-method').value;
const cashChange = document.getElementById('cash-change').value;

if (!paymentMethod) { 
    showToast('Selecione a forma de pagamento!', 'warning'); 
    return; 
}

    const fullAddress = `${street}, Nº ${number}${ref ? ` (Ref: ${ref})` : ''} - ${type}`;
    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    const deliveryFee = neighborhood ? neighborhood.fee : 0;
    
    let subtotal = cart.reduce((sum, i) => {
        const isSelfService = i.category && (i.category.toLowerCase().includes('self service') || i.category.toLowerCase().includes('self-service'));
        const priceToUse = isSelfService ? i.price : (i.price * i.quantity);
        return sum + priceToUse;
    }, 0);
    let discount = subtotal >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
    const total = subtotal + deliveryFee - discount;

   

let message = `*NOVO PEDIDO* 🍦\n\n`;
message += `*Cliente:* ${name}\n`;
message += `*Endereço:* ${fullAddress}\n`;
message += `*Bairro:* ${selectedNeighborhood}\n`;
message += `*Pagamento:* ${paymentMethod}${paymentMethod === 'Dinheiro' && cashChange ? ` (Troco p/ ${cashChange})` : ''}\n\n`;

message += `*ITENS:*\n`;
cart.forEach(item => {
    const flavors = item.options.map(o => `${o.qty}x ${o.name}`).join(', ');
    message += `• ${item.quantity}x ${item.name}${flavors ? ` (${flavors})` : ''}\n`;
    if (item.extras.length > 0) message += `  + Extras: ${item.extras.join(', ')}\n`;
});

message += `\n*TOTAL: R$ ${total.toFixed(2)}* ✅`;
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, '_blank');
};

// Admin Functions
function renderAdminProducts() {
    adminProductList.innerHTML = '';
    products.forEach(p => {
        let stockHTML = '';
        if (p.options && p.options.length > 0) {
            p.options.forEach(opt => {
                const isAvailable = (p.stock && p.stock[opt] !== undefined) ? Number(p.stock[opt]) > 0 : true;
                const restrictions = p.restrictions?.[opt] || { glutenFree: false, lactoseFree: false };
                
                stockHTML += `
                    <div class="admin-flavor-item">
                        <div class="admin-flavor-header">
                            <span>${opt}</span>
                            <button type="button" onclick="toggleFlavorAvailability('${p.id}', '${opt}', ${!isAvailable})" 
                                    class="btn-stock-toggle ${isAvailable ? 'available' : 'unavailable'}">
                                ${isAvailable ? 'Disponível' : 'Indisponível'}
                            </button>
                        </div>
                        <div class="admin-flavor-tags">
                            <button type="button" class="admin-tag-btn gluten ${restrictions.glutenFree ? 'on' : 'off'}" 
                                onclick="toggleFlavorRestriction('${p.id}', '${opt}', 'glutenFree')">Sem Glúten</button>
                            <button type="button" class="admin-tag-btn lactose ${restrictions.lactoseFree ? 'on' : 'off'}" 
                                onclick="toggleFlavorRestriction('${p.id}', '${opt}', 'lactoseFree')">Sem Lactose</button>
                        </div>
                    </div>`;
            });
        }
        
        const card = document.createElement('div');
        card.className = 'admin-product-card';
        card.innerHTML = `
            <div class="admin-card-header">
                <div class="admin-card-title"><h4>${p.name}</h4><span class="admin-card-meta">${p.category} • R$ ${parseFloat(p.price).toFixed(2)}</span></div>
                <div class="admin-card-actions">
                    <button onclick="editProduct('${p.id}')" class="btn-icon-edit"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct('${p.id}')" class="btn-icon-delete"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="admin-card-stock"><h5>Configurações de Sabores</h5><div class="admin-stock-list">${stockHTML}</div></div>
        `;
        adminProductList.appendChild(card);
    });
}

window.toggleFlavorAvailability = async (productId, flavor, setAvailable) => {
    const p = products.find(prod => prod.id.toString() === productId.toString());
    if (!p) return;
    if (!p.stock || typeof p.stock !== 'object') p.stock = {};
    p.stock[flavor.trim()] = setAvailable ? 1 : 0;
    renderAdminProducts(); 
    await postData({ action: 'saveProduct', data: { ...p, stock: JSON.stringify(p.stock), restrictions: JSON.stringify(p.restrictions) } });
};

window.toggleFlavorRestriction = async (productId, flavor, type) => {
    const p = products.find(prod => prod.id.toString() === productId.toString());
    if (!p) return;
    if (!p.restrictions) p.restrictions = {};
    if (!p.restrictions[flavor]) p.restrictions[flavor] = { glutenFree: false, lactoseFree: false };
    p.restrictions[flavor][type] = !p.restrictions[flavor][type];
    renderAdminProducts();
    await postData({ action: 'saveProduct', data: { ...p, stock: JSON.stringify(p.stock), restrictions: JSON.stringify(p.restrictions) } });
};

document.getElementById('product-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-index').value;
    const options = document.getElementById('prod-options').value.split(',').map(s => s.trim()).filter(s => s);
    
    let existingStock = {};
    let existingRestrictions = {};
    if (id) {
        const p = products.find(prod => prod.id.toString() === id.toString());
        if (p) {
            existingStock = (typeof p.stock === 'string') ? JSON.parse(p.stock) : p.stock;
            existingRestrictions = (typeof p.restrictions === 'string') ? JSON.parse(p.restrictions) : p.restrictions;
        }
    }

    const newStock = {};
    const newRestrictions = {};
    options.forEach(opt => {
        const cleanOpt = opt.trim();
        newStock[cleanOpt] = (existingStock[cleanOpt] !== undefined) ? existingStock[cleanOpt] : 1;
        newRestrictions[cleanOpt] = existingRestrictions[cleanOpt] || { glutenFree: false, lactoseFree: false };
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
        stock: JSON.stringify(newStock),
        restrictions: JSON.stringify(newRestrictions)
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
    if (!p) return;
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
    if (product && confirm(`Deseja remover "${product.name}"?`)) {
        if ((await postData({ action: 'deleteProduct', id: id })).status === 'success') await initializeApp();
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
                <div class="admin-card-title"><h4>${n.name}</h4><span class="admin-card-meta">Taxa: R$ ${parseFloat(n.fee).toFixed(2)}</span></div>
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
    document.getElementById('edit-neighborhood-index').value = n.id || "";
    document.getElementById('neighborhood-form-title').innerText = "Editar Bairro";
    document.getElementById('neighborhood-form').scrollIntoView({ behavior: 'smooth' });
};

window.deleteNeighborhood = async (index) => {
    const n = neighborhoods[index];
    if (n && confirm(`Remover bairro "${n.name}"?`)) {
        const result = await postData({ action: 'deleteNeighborhood', id: n.id });
        if (result.status === 'success') await initializeApp();
    }
};

document.getElementById('neighborhood-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-neighborhood-index').value;
    const name = document.getElementById('neighborhood-name').value;
    const fee = parseFloat(document.getElementById('neighborhood-fee-input').value);
    
    const result = await postData({ 
        action: 'saveNeighborhood', 
        data: { 
            id: id !== "" ? id : null,
            name, 
            fee
        } 
    });
    
    if (result.status === 'success') {
        await initializeApp();
        document.getElementById('neighborhood-form').reset();
        document.getElementById('edit-neighborhood-index').value = "";
        document.getElementById('neighborhood-form-title').innerText = "Adicionar Novo Bairro";
    }
};


window.togglePaymentDetails = () => {
    const method = document.getElementById('payment-method').value;
    document.getElementById('pix-details').style.display = (method === 'Pix') ? 'block' : 'none';
    document.getElementById('cash-details').style.display = (method === 'Dinheiro') ? 'block' : 'none';
};

