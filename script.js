const API_URL = "https://script.google.com/macros/s/AKfycbwEov8R9ezCTRfav64cILQmKWESOmiFtDF-s20YKOmrFPydO9Wf-q4dYJ1SsuxqiXCY2A/exec";
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
        showToast('Carregando dados...', 'info');
        const response = await fetch(`${API_URL}?action=${action}`);
        if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
        const data = await response.json();
        return data;
    } catch (error) {
        showToast(`Erro ao carregar: ${error.message}`, 'error');
        return [];
    }
}

async function postData(payload) {
    try {
        showToast('Salvando...', 'info');
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (result.status === 'success') showToast(result.message, 'success');
        else showToast(result.message, 'error');
        return result;
    } catch (error) {
        showToast(`Erro: ${error.message}`, 'error');
        return { status: 'error', message: error.message };
    }
}

async function initializeApp() {
    const [productsData, neighborhoodsData] = await Promise.all([
        fetchData('getProducts'),
        fetchData('getNeighborhoods')
    ]);

    products = productsData.map(p => {
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
    toast.style.cssText = `
        position: fixed; bottom: 20px; right: 20px; padding: 15px 25px;
        border-radius: 8px; color: white; font-weight: bold; z-index: 9999;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15); transition: all 0.3s ease;
        transform: translateY(100px); opacity: 0;
    `;
    
    const colors = { info: '#2196f3', success: '#4caf50', error: '#f44336', warning: '#ff9800' };
    toast.style.backgroundColor = colors[type] || colors.info;
    toast.innerText = message;
    document.body.appendChild(toast);
    
    setTimeout(() => { toast.style.transform = 'translateY(0)'; toast.style.opacity = '1'; }, 10);
    setTimeout(() => {
        toast.style.transform = 'translateY(100px)'; toast.style.opacity = '0';
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
        categoriesContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum produto encontrado.</p>';
        return;
    }
    const categories = [...new Set(products.map(p => p.category))];
    
    categories.forEach(cat => {
        const catProducts = products.filter(p => p.category === cat && p.name.toLowerCase().includes(filter.toLowerCase()));
        if (catProducts.length === 0) return;

        const section = document.createElement('div');
        section.className = 'category-section';
        
        const title = document.createElement('h2');
        title.className = 'category-title';
        title.innerText = cat;
        section.appendChild(title);
        
        const grid = document.createElement('div');
        grid.className = 'product-grid';
        
        catProducts.forEach(prod => {
            const card = document.createElement('div');
            card.className = 'product-card';
            
            const totalStock = prod.stock ? Object.values(prod.stock).reduce((a, b) => a + b, 0) : 1;
            const isOutOfStock = totalStock <= 0;

            card.innerHTML = `
                <img src="${prod.img || 'https://via.placeholder.com/250x200'}" class="product-img" alt="${prod.name}">
                <div class="product-info">
                    <h3>${prod.name}</h3>
                    <p>${prod.desc || ''}</p>
                    <div class="product-price">R$ ${parseFloat(prod.price).toFixed(2)}</div>
                    <button class="btn-add-cart" ${isOutOfStock ? 'disabled' : ''} onclick="openOptions('${prod.id}')">
                        ${isOutOfStock ? '❌ Esgotado' : '🛒 Escolher'}
                    </button>
                </div>
            `;
            grid.appendChild(card);
        });
        
        section.appendChild(grid);
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
    select.innerHTML = '<option value="">-- Escolha um bairro --</option>';
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

    if (currentProductForOptions.options && currentProductForOptions.options.length > 0) {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.innerHTML = '<h4>Escolha os Sabores:</h4>';
        const list = document.createElement('div');
        list.className = 'option-list';
        
        currentProductForOptions.options.forEach(opt => {
            const stockQty = (currentProductForOptions.stock && currentProductForOptions.stock[opt] !== undefined) 
                ? currentProductForOptions.stock[opt] 
                : 10;
            
            const item = document.createElement('div');
            item.className = `option-item ${stockQty <= 0 ? 'disabled' : ''}`;
            item.innerText = opt;
            
            item.onclick = () => {
                if (stockQty <= 0) return;
                item.classList.toggle('selected');
                if (item.classList.contains('selected')) selectedOptions.push(opt);
                else selectedOptions = selectedOptions.filter(o => o !== opt);
            };
            list.appendChild(item);
        });
        group.appendChild(list);
        container.appendChild(group);
    }

    if (currentProductForOptions.extras && currentProductForOptions.extras.length > 0) {
        const group = document.createElement('div');
        group.className = 'option-group';
        group.innerHTML = '<h4>Complementos:</h4>';
        const list = document.createElement('div');
        list.className = 'option-list';
        currentProductForOptions.extras.forEach(ext => {
            const item = document.createElement('div');
            item.className = 'option-item';
            item.innerText = ext;
            item.onclick = () => {
                item.classList.toggle('selected');
                if (item.classList.contains('selected')) selectedExtras.push(ext);
                else selectedExtras = selectedExtras.filter(e => e !== ext);
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
    const input = document.getElementById('qty-input');
    if (parseInt(input.value) > 1) input.value = parseInt(input.value) - 1;
};

document.getElementById('btn-qty-plus').onclick = () => {
    const input = document.getElementById('qty-input');
    if (parseInt(input.value) < 99) input.value = parseInt(input.value) + 1;
};

document.getElementById('btn-confirm-options').onclick = () => {
    if (selectedOptions.length === 0 && currentProductForOptions.options && currentProductForOptions.options.length > 0) {
        showToast('Por favor, escolha pelo menos um sabor.', 'warning');
        return;
    }
    
    selectedQuantity = parseInt(document.getElementById('qty-input').value) || 1;
    
    cart.push({
        ...currentProductForOptions,
        chosenOptions: [...selectedOptions],
        chosenExtras: [...selectedExtras],
        qty: selectedQuantity,
        totalPrice: currentProductForOptions.price * selectedQuantity
    });
    
    updateCart();
    optionsModal.classList.add('hidden');
    cartDrawer.classList.add('open');
};

// Cart Logic
function updateCart() {
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach((item, idx) => {
        subtotal += item.totalPrice;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${item.qty}x ${item.name}</strong>
                <span>R$ ${item.totalPrice.toFixed(2)}</span>
            </div>
            <div style="font-size:0.8rem; color:#666;">
                ${item.chosenOptions.length ? '🍨 ' + item.chosenOptions.join(', ') : ''}
                ${item.chosenExtras.length ? ' ✨' + item.chosenExtras.join(', ') : ''}
            </div>
            <button onclick="removeFromCart(${idx})" style="color:red; border:none; background:none; cursor:pointer; font-size:0.8rem; margin-top:5px;">
                <i class="fas fa-trash"></i> Remover
            </button>
        `;
        list.appendChild(div);
    });
    
    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    const deliveryFee = neighborhood ? neighborhood.fee : 0;
    const discount = subtotal >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
    const total = subtotal + deliveryFee - discount;
    
    document.getElementById('subtotal').innerText = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('delivery-fee').innerText = `R$ ${deliveryFee.toFixed(2)}`;
    
    const discountRow = document.getElementById('discount-row');
    if (discount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('discount-amount').innerText = `-R$ ${discount.toFixed(2)}`;
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
    if (cart.length === 0) { showToast('Carrinho vazio!', 'error'); return; }
    const name = document.getElementById('client-name').value;
    const address = document.getElementById('client-address').value;
    
    if (!name || !address || !selectedNeighborhood) { 
        showToast('Preencha todos os dados de entrega!', 'warning'); 
        return; 
    }
    
    const stockUpdates = [];
    cart.forEach(item => {
        item.chosenOptions.forEach(flavor => {
            stockUpdates.push({ productId: item.id, flavor: flavor, qty: item.qty });
        });
    });

    try {
        await postData({ action: 'updateStockByFlavor', updates: stockUpdates });
    } catch (e) { console.error(e); }

    let msg = `*Novo Pedido*\n\n*Cliente:* ${name}\n*Endereço:* ${address}\n*Bairro:* ${selectedNeighborhood}\n\n`;
    cart.forEach(item => {
        msg += `*${item.qty}x ${item.name}* - R$ ${item.totalPrice.toFixed(2)}\n`;
        if (item.chosenOptions.length) msg += ` Sabores: ${item.chosenOptions.join(', ')}\n`;
        if (item.chosenExtras.length) msg += ` Extras: ${item.chosenExtras.join(', ')}\n`;
        msg += `\n`;
    });
    
    const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    const deliveryFee = neighborhood ? neighborhood.fee : 0;
    const discount = subtotal >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
    msg += `*Total: R$ ${(subtotal + deliveryFee - discount).toFixed(2)}*`;

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    
    cart = [];
    updateCart();
    cartDrawer.classList.remove('open');
    await initializeApp();
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
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:5px; background:#f9f9f9; padding:5px; border-radius:4px;">
                        <span>${opt}</span>
                        <div style="display:flex; align-items:center; gap:10px;">
                            <button onclick="adjustStock('${p.id}', '${opt}', -1)" style="padding:2px 8px;">-</button>
                            <strong style="min-width:20px; text-align:center;">${qty}</strong>
                            <button onclick="adjustStock('${p.id}', '${opt}', 1)" style="padding:2px 8px;">+</button>
                        </div>
                    </div>`;
            });
        } else {
            stockHTML = '<p style="color:#999; font-size:12px; text-align:center;">Sem sabores definidos</p>';
        }

        const card = document.createElement('div');
        card.className = 'product-admin-card';
        card.style.cssText = 'background:white; border:1px solid #ddd; border-radius:8px; padding:15px; margin-bottom:15px;';
        card.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:start; margin-bottom:10px;">
                <div>
                    <h4 style="margin:0;">${p.name}</h4>
                    <small>${p.category} | R$ ${parseFloat(p.price).toFixed(2)}</small>
                </div>
                <div>
                    <button onclick="editProduct('${p.id}')" style="color:blue; border:none; background:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct('${p.id}')" style="color:red; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div style="border-top:1px solid #eee; padding-top:10px;">
                <h5 style="margin:0 0 10px 0;">Estoque:</h5>
                ${stockHTML}
            </div>
        `;
        adminProductList.appendChild(card);
    });
}

window.adjustStock = async (productId, flavor, amount) => {
    const p = products.find(prod => prod.id.toString() === productId.toString());
    if (!p) return;
    if (!p.stock) p.stock = {};
    p.stock[flavor] = Math.max(0, (p.stock[flavor] || 0) + amount);
    
    await postData({ action: 'saveProduct', data: { ...p, stock: JSON.stringify(p.stock) } });
    await initializeApp();
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
    }
};

window.editProduct = (id) => {
    const p = products.find(prod => prod.id.toString() === id.toString());
    if (!p) return;
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-img').value = p.img;
    document.getElementById('prod-desc').value = p.desc;
    document.getElementById('prod-options').value = p.options.join(', ');
    document.getElementById('prod-extras').value = p.extras.join(', ');
    document.getElementById('edit-index').value = p.id;
    document.getElementById('product-form-title').innerText = "Editar Produto";
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteProduct = async (id) => {
    if (confirm('Deseja remover este produto?')) {
        await postData({ action: 'deleteProduct', id: id });
        await initializeApp();
    }
};

// Neighborhood Admin
function renderAdminNeighborhoods() {
    const list = document.getElementById('admin-neighborhoods-list');
    list.innerHTML = '';
    neighborhoods.forEach(n => {
        const div = document.createElement('div');
        div.style.cssText = 'display:flex; justify-content:space-between; background:white; padding:10px; border-radius:8px; margin-bottom:10px; border:1px solid #ddd;';
        div.innerHTML = `
            <div>
                <strong>${n.name}</strong><br>
                <small>Taxa: R$ ${parseFloat(n.fee).toFixed(2)}</small>
            </div>
            <div>
                <button onclick="editNeighborhood('${n.id}')" style="color:blue; border:none; background:none; cursor:pointer;"><i class="fas fa-edit"></i></button>
                <button onclick="deleteNeighborhood('${n.id}')" style="color:red; border:none; background:none; cursor:pointer;"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(div);
    });
}

document.getElementById('neighborhood-form').onsubmit = async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-neighborhood-index').value;
    const neighborhoodData = {
        id: id || null,
        name: document.getElementById('neighborhood-name').value,
        fee: parseFloat(document.getElementById('neighborhood-fee-input').value)
    };
    const result = await postData({ action: 'saveNeighborhood', data: neighborhoodData });
    if (result.status === 'success') {
        await initializeApp();
        document.getElementById('neighborhood-form').reset();
        document.getElementById('edit-neighborhood-index').value = "";
        document.getElementById('neighborhood-form-title').innerText = "Adicionar Novo Bairro";
    }
};

window.editNeighborhood = (id) => {
    const n = neighborhoods.find(hood => hood.id.toString() === id.toString());
    if (!n) return;
    document.getElementById('neighborhood-name').value = n.name;
    document.getElementById('neighborhood-fee-input').value = n.fee;
    document.getElementById('edit-neighborhood-index').value = n.id;
    document.getElementById('neighborhood-form-title').innerText = "Editar Bairro";
};

window.deleteNeighborhood = async (id) => {
    if (confirm('Deseja remover este bairro?')) {
        await postData({ action: 'deleteNeighborhood', id: id });
        await initializeApp();
    }
};
