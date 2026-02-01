// config
const WHATSAPP_NUMBER = "558994127037";
const ADMIN_PASSWORD = "Frutosp1725";
const DISCOUNT_THRESHOLD = 50.00;
const DISCOUNT_AMOUNT = 6.00;


function showToast(message, type = 'info') {
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

// Estado
let products = JSON.parse(localStorage.getItem('products')) || [
    { 
        name: 'Sorvete de Massa', 
        category: 'Sorvetes', 
        price: 12.00, 
        desc: 'Escolha até 3 sabores.', 
        img: 'https://images.unsplash.com/photo-1501443762994-82bd5dace89a?w=400', 
        options: ['Morango', 'Chocolate', 'Baunilha'], 
        extras: ['Granulado', 'Calda'],
        stock: { 'Morango': 10, 'Chocolate': 10, 'Baunilha': 10 }
    },
    { 
        name: 'Picolé de Fruta', 
        category: 'Picolés', 
        price: 5.00, 
        desc: 'Picolé refrescante de fruta natural.', 
        img: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400', 
        options: ['Morango', 'Limão', 'Uva'], 
        extras: [],
        stock: { 'Morango': 20, 'Limão': 15, 'Uva': 10 }
    }
];

let neighborhoods = JSON.parse(localStorage.getItem('neighborhoods')) || [
    { name: 'Centro', fee: 5.00 },
    { name: 'Vila Nova', fee: 8.00 },
    { name: 'Zona Leste', fee: 10.00 }
];

let cart = [];
let currentProductForOptions = null;
let selectedOptions = [];
let selectedExtras = [];
let selectedQuantity = 1;
let selectedNeighborhood = '';

// elementos
const menuSection = document.getElementById('menu-section');
const adminSection = document.getElementById('admin-section');
const categoriesContainer = document.getElementById('categories-container');
const adminProductList = document.getElementById('admin-product-list');
const optionsModal = document.getElementById('options-modal');
const cartDrawer = document.getElementById('cart-drawer');

//nav

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

//adm

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

// cardapio

function renderMenu(filter = '') {
    categoriesContainer.innerHTML = '';
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
            const idx = products.indexOf(prod);
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
                    <button class="btn-add-cart" ${isOutOfStock ? 'disabled' : ''} onclick="openOptions(${idx})">
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
    select.innerHTML = '<option value="">-- Escolha um bairro --</option>';
    
    neighborhoods.forEach((neighborhood, idx) => {
        const option = document.createElement('option');
        option.value = neighborhood.name;
        option.innerText = neighborhood.name;
        select.appendChild(option);
    });
}

document.getElementById('neighborhood-select').onchange = (e) => {
    selectedNeighborhood = e.target.value;
    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    
    if (neighborhood) {
        document.getElementById('neighborhood-fee').innerText = `Taxa: R$ ${neighborhood.fee.toFixed(2)}`;
    } else {
        document.getElementById('neighborhood-fee').innerText = `Taxa: -`;
    }
    
    updateCart();
};

window.openOptions = (index) => {
    currentProductForOptions = products[index];
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

//estoque de quant

document.getElementById('btn-qty-minus').onclick = () => {
    const input = document.getElementById('qty-input');
    if (parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
};

document.getElementById('btn-qty-plus').onclick = () => {
    const input = document.getElementById('qty-input');
    if (parseInt(input.value) < 99) {
        input.value = parseInt(input.value) + 1;
    }
};

document.getElementById('qty-input').onchange = () => {
    let val = parseInt(document.getElementById('qty-input').value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > 99) val = 99;
    document.getElementById('qty-input').value = val;
};

document.getElementById('btn-close-options').onclick = () => optionsModal.classList.add('hidden');
document.getElementById('btn-close-options-alt').onclick = () => optionsModal.classList.add('hidden');

document.getElementById('btn-confirm-options').onclick = () => {
    if (selectedOptions.length === 0 && currentProductForOptions.options.length > 0) {
        showToast('Por favor, escolha pelo menos um sabor.', 'warning');
        return;
    }

    selectedQuantity = parseInt(document.getElementById('qty-input').value) || 1;

    for (let i = 0; i < selectedQuantity; i++) {
        cart.push({
            ...currentProductForOptions,
            chosenOptions: [...selectedOptions],
            chosenExtras: [...selectedExtras],
            qty: 1
        });
    }

    updateCart();
    optionsModal.classList.add('hidden');
    cartDrawer.classList.add('open');
};

//carrinho

function getDeliveryFee() {
    const neighborhood = neighborhoods.find(n => n.name === selectedNeighborhood);
    return neighborhood ? neighborhood.fee : 0;
}

function updateCart() {
    const list = document.getElementById('cart-items');
    list.innerHTML = '';
    let subtotal = 0;
    
    cart.forEach((item, idx) => {
        subtotal += item.price;
        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                <strong>${item.name}</strong>
                <span style="color: #ff6b6b; font-weight: 700;">R$ ${item.price.toFixed(2)}</span>
            </div>
            <div class="cart-item-meta">
                ${item.chosenOptions.length ? '🍨 ' + item.chosenOptions.join(', ') : ''}
                ${item.chosenExtras.length ? '<br>✨ ' + item.chosenExtras.join(', ') : ''}
            </div>
            <button class="btn-delete" onclick="removeFromCart(${idx})" style="color:#ff6b6b; border:none; background:none; cursor:pointer; font-size:0.85rem; margin-top:8px; font-weight:600;">
                🗑️ Remover
            </button>
        `;
        list.appendChild(div);
    });

    //calcular taxa de entrega e desconto
    const deliveryFee = getDeliveryFee();
    const discount = subtotal >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
    const total = subtotal + deliveryFee - discount;

    //atualizar resumo
    document.getElementById('subtotal').innerText = `R$ ${subtotal.toFixed(2)}`;
    document.getElementById('delivery-fee').innerText = `R$ ${deliveryFee.toFixed(2)}`;
    
    // mostrar/esconder desconto
    const discountRow = document.getElementById('discount-row');
    if (discount > 0) {
        discountRow.style.display = 'flex';
        document.getElementById('discount-amount').innerText = `-R$ ${discount.toFixed(2)}`;
    } else {
        discountRow.style.display = 'none';
    }
    
    document.getElementById('cart-total').innerText = `R$ ${total.toFixed(2)}`;
    document.getElementById('cart-count').innerText = cart.length;
}

window.removeFromCart = (idx) => {
    cart.splice(idx, 1);
    updateCart();
};

document.getElementById('open-cart').onclick = () => cartDrawer.classList.add('open');
document.getElementById('close-cart').onclick = () => cartDrawer.classList.remove('open');


document.getElementById('btn-finish-order').onclick = () => {
    if (cart.length === 0) {
        showToast('Carrinho vazio!', 'error');
        return;
    }
    
    const name = document.getElementById('client-name').value || 'Cliente';
    const address = document.getElementById('client-address').value || 'Não informado';
    
    if (!document.getElementById('client-name').value) {
        showToast('Por favor, digite seu nome!', 'warning');
        return;
    }
    
    if (!document.getElementById('client-address').value) {
        showToast('Por favor, digite seu endereço!', 'warning');
        return;
    }

    if (!selectedNeighborhood) {
        showToast('Por favor, selecione um bairro!', 'warning');
        return;
    }
    
    // dar baixa no estoque
    cart.forEach(item => {
        const originalProd = products.find(p => p.name === item.name);
        if (originalProd && originalProd.stock) {
            item.chosenOptions.forEach(opt => {
                if (originalProd.stock[opt] !== undefined) {
                    originalProd.stock[opt]--;
                }
            });
        }
    });
    
    localStorage.setItem('products', JSON.stringify(products));
    renderMenu();
    // mensagem que vaipara  whats
    
    const subtotal = cart.reduce((sum, item) => sum + item.price, 0);
    const deliveryFee = getDeliveryFee();
    const discount = subtotal >= DISCOUNT_THRESHOLD ? DISCOUNT_AMOUNT : 0;
    const total = subtotal + deliveryFee - discount;
    
    let msg = `*Novo Pedido - WhatsApp*\n\n`;
    msg += ` *Cliente:* ${name}\n`;
    msg += ` *Endereço:* ${address}\n`;
    msg += ` *Bairro:* ${selectedNeighborhood}\n`;
    msg += `*Data:* ${new Date().toLocaleDateString('pt-BR')}\n`;
    msg += `*Hora:* ${new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}\n`;
    msg += `\n${'═'.repeat(40)}\n\n`;
    
    cart.forEach((item, i) => {
        msg += `*${i + 1}. ${item.name}* - R$ ${item.price.toFixed(2)}\n`;
        if (item.chosenOptions.length) msg += `    Sabores: ${item.chosenOptions.join(', ')}\n`;
        if (item.chosenExtras.length) msg += `    Extras: ${item.chosenExtras.join(', ')}\n`;
        msg += `\n`;
    });
    
    msg += `${'═'.repeat(40)}\n`;
    msg += ` *Resumo do Pedido:*\n`;
    msg += `Subtotal: R$ ${subtotal.toFixed(2)}\n`;
    msg += `Taxa de Entrega (${selectedNeighborhood}): R$ ${deliveryFee.toFixed(2)}\n`;
    if (discount > 0) {
        msg += `Desconto na Entrega: -R$ ${discount.toFixed(2)} \n`;
    }
    msg += `\n*TOTAL: R$ ${total.toFixed(2)}*`;
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
    
    showToast('✅ Pedido enviado com sucesso!', 'success');
    
    // Limpar carrinho
    cart = [];
    updateCart();
    document.getElementById('client-name').value = '';
    document.getElementById('client-address').value = '';
    document.getElementById('neighborhood-select').value = '';
    selectedNeighborhood = '';
    document.getElementById('neighborhood-fee').innerText = 'Taxa: -';
    cartDrawer.classList.remove('open');
};

document.getElementById('search-input').oninput = (e) => renderMenu(e.target.value);

//adm prod

function renderAdminProducts() {
    adminProductList.innerHTML = '';
    products.forEach((p, idx) => {
        const productCard = document.createElement('div');
        productCard.className = 'product-admin-card';
        
        let stockHTML = '';
        if (p.options && p.options.length > 0) {
            stockHTML = `
                <table class="stock-table">
                    <thead>
                        <tr>
                            <th>Sabor</th>
                            <th style="text-align: center;">Estoque</th>
                            <th style="text-align: center;">Ações</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            p.options.forEach(opt => {
                const qty = p.stock && p.stock[opt] !== undefined ? p.stock[opt] : 0;
                let statusClass = 'in-stock';
                if (qty === 0) statusClass = 'out-of-stock';
                else if (qty <= 5) statusClass = 'low-stock';
                
                stockHTML += `
                    <tr>
                        <td class="flavor-name-cell">${opt}</td>
                        <td class="stock-qty-cell ${statusClass}">${qty}</td>
                        <td class="stock-controls-cell">
                            <button class="btn-qty" onclick="adjustStock(${idx}, '${opt}', -1)" title="Diminuir">−</button>
                            <button class="btn-qty" onclick="adjustStock(${idx}, '${opt}', 1)" title="Aumentar">+</button>
                        </td>
                    </tr>
                `;
            });
            
            stockHTML += `
                    </tbody>
                </table>
            `;
        } else {
            stockHTML = '<p style="color:#999; font-size:12px; margin:0; font-style:italic; text-align:center; padding:16px;">Sem sabores definidos</p>';
        }

        productCard.innerHTML = `
            <div class="product-card-header">
                <div class="product-info-admin">
                    <h4>${p.name}</h4>
                    <div class="product-badges">
                        <span class="category-badge">${p.category}</span>
                        <span class="price-badge">R$ ${p.price.toFixed(2)}</span>
                    </div>
                </div>
                <div class="product-actions">
                    <button class="btn-edit" onclick="editProduct(${idx})" title="Editar">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-delete-product" onclick="deleteProduct(${idx})" title="Deletar">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="product-card-stock">
                <h5>📊 Estoque por Sabor</h5>
                ${stockHTML}
            </div>
        `;
        
        adminProductList.appendChild(productCard);
    });
}

window.adjustStock = (idx, flavor, amount) => {
    if (!products[idx].stock) products[idx].stock = {};
    if (products[idx].stock[flavor] === undefined) products[idx].stock[flavor] = 0;
    
    products[idx].stock[flavor] = Math.max(0, products[idx].stock[flavor] + amount);
    localStorage.setItem('products', JSON.stringify(products));
    renderAdminProducts();
    renderMenu();
};

document.getElementById('product-form').onsubmit = (e) => {
    e.preventDefault();
    const idx = document.getElementById('edit-index').value;
    const options = document.getElementById('prod-options').value.split(',').map(s => s.trim()).filter(s => s);
    
    let newStock = {};
    if (idx !== "" && products[idx].stock) {
        newStock = products[idx].stock;
    }
    
    options.forEach(opt => {
        if (newStock[opt] === undefined) newStock[opt] = 0;
    });

    const newProd = {
        name: document.getElementById('prod-name').value,
        category: document.getElementById('prod-category').value,
        price: parseFloat(document.getElementById('prod-price').value),
        img: document.getElementById('prod-img').value,
        desc: document.getElementById('prod-desc').value,
        options: options,
        extras: document.getElementById('prod-extras').value.split(',').map(s => s.trim()).filter(s => s),
        stock: newStock
    };

    if (idx !== "") products[idx] = newProd;
    else products.push(newProd);

    localStorage.setItem('products', JSON.stringify(products));
    renderAdminProducts();
    renderMenu();
    document.getElementById('product-form').reset();
    document.getElementById('edit-index').value = "";
    document.getElementById('btn-cancel').classList.add('hidden');
};

window.deleteProduct = (idx) => {
    if (confirm('Tem certeza que deseja remover este produto?')) {
        products.splice(idx, 1);
        localStorage.setItem('products', JSON.stringify(products));
        renderAdminProducts();
        renderMenu();
        showToast('Produto removido com sucesso!', 'success');
    }
};

window.editProduct = (idx) => {
    const p = products[idx];
    document.getElementById('prod-name').value = p.name;
    document.getElementById('prod-category').value = p.category;
    document.getElementById('prod-price').value = p.price;
    document.getElementById('prod-img').value = p.img;
    document.getElementById('prod-desc').value = p.desc;
    document.getElementById('prod-options').value = p.options.join(', ');
    document.getElementById('prod-extras').value = p.extras.join(', ');
    document.getElementById('edit-index').value = idx;
    document.getElementById('btn-cancel').classList.remove('hidden');
    document.getElementById('tab-products').click();
    window.scrollTo(0, 0);
};

document.getElementById('btn-cancel').onclick = () => {
    document.getElementById('product-form').reset();
    document.getElementById('edit-index').value = "";
    document.getElementById('btn-cancel').classList.add('hidden');
};

//bairros dely

function renderAdminNeighborhoods() {
    const list = document.getElementById('admin-neighborhoods-list');
    list.innerHTML = '';
    
    neighborhoods.forEach((neighborhood, idx) => {
        const card = document.createElement('div');
        card.className = 'neighborhood-card';
        card.innerHTML = `
            <div class="neighborhood-info">
                <h4>${neighborhood.name}</h4>
                <p>Taxa: R$ ${neighborhood.fee.toFixed(2)}</p>
            </div>
            <div class="neighborhood-actions">
                <button class="btn-edit-neighborhood" onclick="editNeighborhood(${idx})" title="Editar">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn-delete-neighborhood" onclick="deleteNeighborhood(${idx})" title="Deletar">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        list.appendChild(card);
    });
}

document.getElementById('neighborhood-form').onsubmit = (e) => {
    e.preventDefault();
    const idx = document.getElementById('edit-neighborhood-index').value;
    
    const newNeighborhood = {
        name: document.getElementById('neighborhood-name').value,
        fee: parseFloat(document.getElementById('neighborhood-fee-input').value)
    };

    if (idx !== "") neighborhoods[idx] = newNeighborhood;
    else neighborhoods.push(newNeighborhood);

    localStorage.setItem('neighborhoods', JSON.stringify(neighborhoods));
    renderAdminNeighborhoods();
    renderNeighborhoodSelector();
    document.getElementById('neighborhood-form').reset();
    document.getElementById('edit-neighborhood-index').value = "";
    document.getElementById('btn-cancel-neighborhood').classList.add('hidden');
};

window.editNeighborhood = (idx) => {
    const n = neighborhoods[idx];
    document.getElementById('neighborhood-name').value = n.name;
    document.getElementById('neighborhood-fee-input').value = n.fee;
    document.getElementById('edit-neighborhood-index').value = idx;
    document.getElementById('btn-cancel-neighborhood').classList.remove('hidden');
};

window.deleteNeighborhood = (idx) => {
    if (confirm('Tem certeza que deseja remover este bairro?')) {
        neighborhoods.splice(idx, 1);
        localStorage.setItem('neighborhoods', JSON.stringify(neighborhoods));
        renderAdminNeighborhoods();
        renderNeighborhoodSelector();
        showToast('Bairro removido com sucesso!', 'success');
    }
};

document.getElementById('btn-cancel-neighborhood').onclick = () => {
    document.getElementById('neighborhood-form').reset();
    document.getElementById('edit-neighborhood-index').value = "";
    document.getElementById('btn-cancel-neighborhood').classList.add('hidden');
};

// Inicializar
renderMenu();
renderNeighborhoodSelector();
