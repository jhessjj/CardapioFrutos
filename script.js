
const API_URL = "https://script.google.com/macros/s/AKfycbw-nbvasKXo_zqUbV-eeXYlawZbXIhKre8IGTZ4rKBAi1s9Cwa6QiEPO74xcZH4PZhjAA/exec";

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

const menuSection = document.getElementById('menu-section');
const adminSection = document.getElementById('admin-section');
const categoriesContainer = document.getElementById('categories-container');
const adminProductList = document.getElementById('admin-product-list');
const optionsModal = document.getElementById('options-modal');
const cartDrawer = document.getElementById('cart-drawer');

// FUNÇÕES DE COMUNICAÇÃO COM O SHEETS
async function fetchData(action) {
    try {
        showToast('Carregando dados...', 'info');
        const response = await fetch(`${API_URL}?action=${action}`);
        if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
        const data = await response.json();
        document.querySelector('.toast.toast-info')?.remove();
        return data;
    } catch (error) {
        showToast(`Erro ao carregar: ${error.message}`, 'error');
        return [];
    }
}

async function postData(payload) {
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        return await response.json();
    } catch (error) {
        console.error('Erro ao enviar dados:', error);
        return { status: 'error', message: error.message };
    }
}

async function initializeApp() {
    const [productsData, neighborhoodsData] = await Promise.all([
        fetchData('getProducts'),
        fetchData('getNeighborhoods')
    ]);

    // Converter string de estoque (JSON) para objeto
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
    document.querySelectorAll('.toast').forEach(t => t.remove());
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

// NAVEGAÇÃO
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

// ABAS DO ADMIN
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


function renderMenu(filter = '') {
    categoriesContainer.innerHTML = '';
    if (!products || products.length === 0) {
        categoriesContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Nenhum produto encontrado.</p>';
        return;
    }
    const categories = [...new Set(products.map(p => p.category))];
    
    categories.forEach((cat, catIndex) => {
        const catProducts = products.filter(p => p.category === cat && p.name.toLowerCase().includes(filter.toLowerCase()));
        if (catProducts.length === 0) return;

        const section = document.createElement('div');
        section.className = 'category-section';
        section.style.animationDelay = `${catIndex * 0.1}s`;
        
        const title = document.createElement('h2');
        title.className = 'category-title';
        title.innerText = cat;
        section.appendChild(title);
        
        const grid = document.createElement('div');
        grid.className = 'product-grid';
        
        catProducts.forEach((prod, prodIndex) => {
            const card = document.createElement('div');
            card.className = 'product-card';
            card.style.animationDelay = `${prodIndex * 0.05}s`;
            
            const totalStock = prod.stock ? Object.values(prod.stock).reduce((a, b) => a + b, 0) : 1;
            const isOutOfStock = totalStock <= 0;

            card.innerHTML = `
                <img src="${prod.img || 'https://via.placeholder.com/250x200'}" class="product-img" alt="${prod.name}">
                <div class="product-info">
                    <h3>${prod.name}</h3>
                    <p>${prod.desc}</p>
                    <div class="product-price">R$ ${prod.price.toFixed(2)}</div>
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

function renderNeighborhoodSelector() {
    const select = document.getElementById('neighborhood-select');
    if (!select) return;
    select.innerHTML = '<option value="">-- Escolha um bairro --</option>';
    if(neighborhoods) {
        neighborhoods.forEach(neighborhood => {
            const option = document.createElement('option');
            option.value = neighborhood.name;
            option.innerText = neighborhood.name;
            select.appendChild(option);
        });
    }
}

document.getElementById('neighborhood-select').onchange = (e) => {
    selectedNeighborhood = e.target.value;
    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    document.getElementById('neighborhood-fee').innerText = neighborhood ? `Taxa: R$ ${neighborhood.fee.toFixed(2)}` : `Taxa: -`;
    updateCart();
};


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
        const title = document.createElement('h4');
        title.innerText = 'Escolha os Sabores:';
        group.appendChild(title);
        const list = document.createElement('div');
        list.className = 'option-list';
        
        currentProductForOptions.options.forEach(opt => {
            const stockQty = (currentProductForOptions.stock && currentProductForOptions.stock[opt] !== undefined) 
                ? currentProductForOptions.stock[opt] 
                : 10;
            
            const item = document.createElement('div');
            item.className = `option-item ${stockQty <= 0 ? 'disabled' : ''}`;
            item.innerHTML = `${opt}`;
            
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
        const title = document.createElement('h4');
        title.innerText = 'Complementos:';
        group.appendChild(title);
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

function updateCart() {
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach((item, idx) => {
        subtotal += item.totalPrice;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <strong>${item.qty}x ${item.name}</strong>
                <span style="color: #ff6b6b; font-weight: 700;">R$ ${item.totalPrice.toFixed(2)}</span>
            </div>
            <div class="cart-item-meta">
                ${item.chosenOptions.length ? '🍨 ' + item.chosenOptions.join(', ') : ''}
                ${item.chosenExtras.length ? ' ✨' + item.chosenExtras.join(', ') : ''}
            </div>
            <button class="btn-delete" onclick="removeFromCart(${idx})" style="color:#ff6b6b; border:none; background:none; cursor:pointer; font-size:0.85rem; margin-top:8px; font-weight:600;">
                🗑️ Remover
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
            stockUpdates.push({
                productId: item.id,
                flavor: flavor,
                qty: item.qty
            });
        });
    });

    try {
        await postData({ action: 'updateStockByFlavor', updates: stockUpdates });
    } catch (e) { console.error(e); }

    // WHATSAPP MESSAGE
    let msg = `*Novo Pedido*\n\n*Cliente:* ${name}\n*Endereço:* ${address}\n*Bairro:* ${selectedNeighborhood}\n\n`;
    cart.forEach(item => {
        msg += `*${item.qty}x ${item.name}* - R$ ${item.totalPrice.toFixed(2)}\n`;
        if (item.chosenOptions.length) msg += ` Sabores: ${item.chosenOptions.join(', ')}\n`;
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
            stockHTML = '<p style="color:#999; font-size:12px; margin:0; font-style:italic; text-align:center; padding:16px;">Sem sabores definidos</p>';
        }

        const card = document.createElement('div');
        card.className = 'product-admin-card';
        card.innerHTML = `
            <div class="product-card-header">
                <div class="product-info-admin">
                    <h4>${p.name}</h4>
                    <div class="product-badges">
                        <span class="category-badge">${p.category}</span>
                        <span class="price-badge">R$ ${p.price.toFixed(2)}</span>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn-edit" onclick="editProduct('${p.id}')" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-product" onclick="deleteProduct('${p.id}')" title="Deletar"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="product-card-stock">
                <h5>📊 Estoque por Sabor</h5>
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
    
    showToast('Salvando estoque...', 'info');
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

    await postData({ action: 'saveProduct', data: productData });
    await initializeApp();
    document.getElementById('product-form').reset();
    document.getElementById('edit-index').value = "";
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
    document.getElementById('tab-products').click();
};

// BAIRROS (SHEETS)
function renderAdminNeighborhoods() {
    const list = document.getElementById('admin-neighborhoods-list');
    if (!list) return;
    list.innerHTML = '';
    neighborhoods.forEach(n => {
        const card = document.createElement('div');
        card.className = 'neighborhood-card';
        card.innerHTML = `
            <div class="neighborhood-info">
                <h4>${n.name}</h4>
                <p>Taxa: R$ ${n.fee.toFixed(2)}</p>
            </div>
            <div class="neighborhood-actions">
                <button onclick="editNeighborhood('${n.id}')"><i class="fas fa-edit"></i></button>
                <button onclick="deleteNeighborhood('${n.id}')"><i class="fas fa-trash"></i></button>
            </div>
        `;
        list.appendChild(card);
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
    await postData({ action: 'saveNeighborhood', data: neighborhoodData });
    await initializeApp();
    document.getElementById('neighborhood-form').reset();
    document.getElementById('edit-neighborhood-index').value = "";
};

window.editNeighborhood = (id) => {
    const n = neighborhoods.find(hood => hood.id.toString() === id.toString());
    if (!n) return;
    document.getElementById('neighborhood-name').value = n.name;
    document.getElementById('neighborhood-fee-input').value = n.fee;
    document.getElementById('edit-neighborhood-index').value = n.id;
};

window.deleteNeighborhood = async (id) => {
    if (confirm('Deseja remover este bairro?')) {
        await postData({ action: 'deleteNeighborhood', id: id });
        await initializeApp();
    }
};

window.deleteProduct = async (id) => {
    if (confirm('Deseja remover este produto?')) {
        await postData({ action: 'deleteProduct', id: id });
        await initializeApp();
    }
};
