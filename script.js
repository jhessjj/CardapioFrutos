const API_URL = "https://script.google.com/macros/s/AKfycbxlvzgRkSrFvWGgJxvrYOn0UmuJztOEbwhJtqFx7nyPUh4IQBp9uxZwUqcCJdi6pnaJxg/exec";
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

    products = productsData.map(p => {
        // Normalização de campos para garantir compatibilidade com a planilha
        // Verifica se 'extra' ou 'extras' existe e garante que seja um array
        let rawExtras = p.extras || p.extra || [];
        if (typeof rawExtras === 'string') {
            p.extras = rawExtras.split(',').map(s => s.trim()).filter(s => s);
        } else {
            p.extras = Array.isArray(rawExtras) ? rawExtras : [];
        }

        let rawOptions = p.options || p.option || [];
        if (typeof rawOptions === 'string') {
            p.options = rawOptions.split(',').map(s => s.trim()).filter(s => s);
        } else {
            p.options = Array.isArray(rawOptions) ? rawOptions : [];
        }
        
        if (typeof p.stock === 'string') {
            try { p.stock = JSON.parse(p.stock); } catch(e) { p.stock = {}; }
        } else if (!p.stock) {
            p.stock = {};
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
    document.getElementById('admin-neighborhoods-tab').scrollIntoView({ behavior: 'smooth' });
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
            
            let isOutOfStock = false;
            if (prod.options && prod.options.length > 0) {
                const hasStockData = prod.stock && Object.keys(prod.stock).length > 0;
                if (hasStockData) {
                    const totalStock = Object.values(prod.stock).reduce((a, b) => a + (Number(b) || 0), 0);
                    if (totalStock <= 0) isOutOfStock = true;
                }
            }

            card.innerHTML = `
                <div class="product-image" onclick="openOptions('${prod.id}')">
                    ${prod.img ? `<img src="${prod.img}" alt="${prod.name}">` : '<span>🍨</span>'}
                </div>
                <div class="product-info">
                    <div class="product-name">${prod.name}</div>
                    <div class="product-desc" style="font-size: 11px; color: #6b7280; margin-bottom: 8px;">${prod.desc || ''}</div>
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
    // Se for self-service, o preço é fixo (não cobra por sabor)
    return !(cat.includes('self service') || cat.includes('self-service'));
}

// Options Modal
window.openOptions = (productId) => {
    currentProductForOptions = products.find(p => p.id.toString() === productId.toString());
    if (!currentProductForOptions) return;

    selectedOptions = [];
    selectedExtras = [];
    selectedQuantity = 1;
    
    document.getElementById('modal-prod-name').innerText = currentProductForOptions.name;
    document.getElementById('qty-input').value = 1;
    
    const container = document.getElementById('options-container');
    container.innerHTML = '';

    const hasOptions = currentProductForOptions.options && currentProductForOptions.options.length > 0;
    
    // Mostra/Esconde o seletor de quantidade global
    const globalQtyControl = document.querySelector('.qty-control');
    if (globalQtyControl) {
        if (hasOptions) globalQtyControl.style.display = 'none';
        else globalQtyControl.style.display = 'flex';
    }

    // Sabores
    if (hasOptions) {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.innerHTML = `<label>Escolha os Sabores</label>`;
        const list = document.createElement('div');
        list.className = 'flavor-list-container';
        
        currentProductForOptions.options.forEach(opt => {
            // Verifica estoque individual do sabor
            const stockValue = (currentProductForOptions.stock && currentProductForOptions.stock[opt] !== undefined) ? currentProductForOptions.stock[opt] : 1;
            const isAvailable = Number(stockValue) > 0;
            
            const item = document.createElement('div');
            item.className = 'flavor-item-row';
            item.style = "display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee;";
            item.innerHTML = `
                <span style="${!isAvailable ? 'text-decoration: line-through; opacity: 0.5;' : ''}">${opt}</span>
                ${isAvailable ? `
                <div class="flavor-qty-controls" style="display: flex; align-items: center; gap: 10px;">
                    <button type="button" onclick="updateFlavorQty('${opt}', -1)" class="btn-flavor-qty">-</button>
                    <span id="qty-${opt}" class="flavor-qty-num">0</span>
                    <button type="button" onclick="updateFlavorQty('${opt}', 1)" class="btn-flavor-qty">+</button>
                </div>
                ` : '<span class="out-of-stock-label" style="color: red; font-size: 10px;">ESGOTADO</span>'}
            `;
            list.appendChild(item);
        });
        group.appendChild(list);
        container.appendChild(group);
    }

    // Extras
    if (currentProductForOptions.extras && currentProductForOptions.extras.length > 0) {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.innerHTML = `<label>Extras (Opcional)</label>`;
        const list = document.createElement('div');
        list.className = 'option-list';
        list.style = "display: flex; flex-wrap: wrap; gap: 8px; margin-top: 10px;";
        
        currentProductForOptions.extras.forEach(extra => {
            const item = document.createElement('div');
            item.className = 'option-item';
            item.innerText = extra;
            item.style = "padding: 8px 12px; border: 1px solid #ddd; border-radius: 20px; cursor: pointer; font-size: 14px;";
            item.onclick = () => {
                item.classList.toggle('selected');
                if (item.classList.contains('selected')) {
                    item.style.backgroundColor = '#ff6b00';
                    item.style.color = 'white';
                    item.style.borderColor = '#ff6b00';
                } else {
                    item.style.backgroundColor = 'transparent';
                    item.style.color = 'inherit';
                    item.style.borderColor = '#ddd';
                }
                const idx = selectedExtras.indexOf(extra);
                if (idx > -1) selectedExtras.splice(idx, 1);
                else selectedExtras.push(extra);
            };
            list.appendChild(item);
        });
        group.appendChild(list);
        container.appendChild(group);
    }
    optionsModal.classList.remove('hidden');
};

window.updateFlavorQty = (flavor, delta) => {
    const isSelfService = currentProductForOptions.category.toLowerCase().includes('self');
    const currentTotal = selectedOptions.reduce((acc, curr) => acc + curr.qty, 0);
    let existing = selectedOptions.find(o => o.name === flavor);
    
    if (delta > 0) {
        // Trava de até 3 sabores para Self Service
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

document.getElementById('btn-qty-plus').onclick = () => {
    selectedQuantity++;
    document.getElementById('qty-input').value = selectedQuantity;
};

document.getElementById('btn-qty-minus').onclick = () => {
    if (selectedQuantity > 1) {
        selectedQuantity--;
        document.getElementById('qty-input').value = selectedQuantity;
    }
};

window.closeOptions = () => optionsModal.classList.add('hidden');
document.getElementById('btn-close-options').onclick = closeOptions;
document.getElementById('btn-close-options-alt').onclick = closeOptions;

document.getElementById('btn-confirm-options').onclick = () => {
    const hasOptions = currentProductForOptions.options && currentProductForOptions.options.length > 0;
    if (hasOptions && selectedOptions.length === 0) {
        showToast('Por favor, selecione pelo menos um sabor!', 'warning');
        return;
    }
    
    let qty = 1;
    if (hasOptions) {
        qty = 1; 
    } else {
        qty = parseInt(document.getElementById('qty-input').value) || 1;
    }
    
    let unitPrice = parseFloat(currentProductForOptions.price);
    const chargePerFlavor = isChargePerFlavor(currentProductForOptions.category);
    
    // Se NÃO for self-service, multiplica o preço pela quantidade total de sabores
    if (chargePerFlavor && selectedOptions.length > 0) {
        const totalFlavors = selectedOptions.reduce((acc, curr) => acc + curr.qty, 0);
        unitPrice = unitPrice * totalFlavors;
    }

    cart.push({
        id: Date.now(),
        productId: currentProductForOptions.id,
        name: currentProductForOptions.name,
        price: unitPrice,
        quantity: qty,
        options: [...selectedOptions],
        extras: [...selectedExtras]
    });
    updateCart();
    closeOptions();
    showToast('Adicionado ao carrinho!', 'success');
};

// Cart Logic
function updateCart() {
    const cartItems = document.getElementById('cart-items');
    cartItems.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach(item => {
        const totalItemPrice = item.price * item.quantity;
        subtotal += totalItemPrice;
        const div = document.createElement('div');
        div.className = 'cart-item';
        const flavorText = item.options.map(o => `${o.qty}x ${o.name}`).join(', ');
        const extraText = item.extras.length > 0 ? ` + ${item.extras.join(', ')}` : '';
        div.innerHTML = `
            <div class="cart-item-header">
                <span>${item.quantity}x ${item.name}</span>
                <span>R$ ${totalItemPrice.toFixed(2)}</span>
            </div>
            <div class="cart-item-details">${flavorText}${extraText}</div>
            <button class="btn-remove-item" onclick="removeFromCart(${item.id})">Remover</button>
        `;
        cartItems.appendChild(div);
    });

    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    const deliveryFee = neighborhood ? neighborhood.fee : 0;
    let discount = (subtotal >= DISCOUNT_THRESHOLD) ? DISCOUNT_AMOUNT : 0;
    const total = subtotal + deliveryFee - discount;

    const subtotalDisplay = document.getElementById('subtotal');
    if (subtotalDisplay) subtotalDisplay.innerText = `R$ ${subtotal.toFixed(2)}`;
    
    const feeDisplay = document.getElementById('delivery-fee');
    if (feeDisplay) feeDisplay.innerText = `R$ ${deliveryFee.toFixed(2)}`;
    
    const discountDisplay = document.getElementById('discount-amount');
    if (discountDisplay) discountDisplay.innerText = `- R$ ${discount.toFixed(2)}`;
    
    const totalDisplay = document.getElementById('cart-total');
    if (totalDisplay) totalDisplay.innerText = `R$ ${total.toFixed(2)}`;
    
    const countDisplay = document.getElementById('cart-count');
    if (countDisplay) countDisplay.innerText = cart.reduce((acc, item) => acc + item.quantity, 0);
}

window.removeFromCart = (id) => { cart = cart.filter(item => item.id !== id); updateCart(); };
document.getElementById('open-cart').onclick = () => cartDrawer.classList.add('open');
document.getElementById('close-cart').onclick = () => cartDrawer.classList.remove('open');

document.getElementById('btn-finish-order').onclick = () => {
    if (cart.length === 0) { showToast('Seu carrinho está vazio!', 'warning'); return; }
    if (!selectedNeighborhood) { showToast('Selecione seu bairro!', 'warning'); return; }
    const name = document.getElementById('client-name').value;
    const address = document.getElementById('client-address').value;
    if (!name || !address) { showToast('Preencha seu nome e endereço!', 'warning'); return; }

    let message = `*Novo Pedido - Frutos do Brasil*\n\n*Cliente:* ${name}\n*Endereço:* ${address}\n*Bairro:* ${selectedNeighborhood}\n\n*Itens:*\n`;
    cart.forEach(item => {
        const flavorText = item.options.map(o => `${o.qty}x ${o.name}`).join(', ');
        message += `• ${item.quantity}x ${item.name} (${flavorText})\n`;
        if (item.extras.length > 0) message += `  Extras: ${item.extras.join(', ')}\n`;
    });
    message += `\n*Total:* ${document.getElementById('cart-total').innerText}`;
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
                stockHTML += `
                    <div class="admin-stock-item">
                        <span>${opt}</span>
                        <button type="button" onclick="toggleFlavorAvailability('${p.id}', '${opt}', ${!isAvailable})" 
                                class="btn-stock-toggle ${isAvailable ? 'available' : 'unavailable'}">
                            ${isAvailable ? 'Disponível' : 'Indisponível'}
                        </button>
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
            <div class="admin-card-stock"><h5>Disponibilidade</h5><div class="admin-stock-list">${stockHTML}</div></div>
        `;
        adminProductList.appendChild(card);
    });
}

window.toggleFlavorAvailability = async (productId, flavor, setAvailable) => {
    const p = products.find(prod => prod.id.toString() === productId.toString());
    if (!p) return;
    if (!p.stock) p.stock = {};
    p.stock[flavor] = setAvailable ? 1 : 0;
    renderAdminProducts(); 
    // Envia o objeto de estoque completo para persistir na planilha
    await postData({ action: 'saveProduct', data: { ...p, stock: JSON.stringify(p.stock) } });
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
    options.forEach(opt => { if (existingStock[opt] === undefined) existingStock[opt] = 1; });
    
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
