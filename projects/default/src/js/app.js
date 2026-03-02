// Product data
const products = [
    {
        id: 1,
        name: "Classic Butter",
        description: "Traditional butter popcorn with perfect salt balance",
        price: 8.99,
        image: "https://picsum.photos/seed/butter-popcorn/300/250.jpg"
    },
    {
        id: 2,
        name: "Caramel Delight",
        description: "Sweet caramel coating with a hint of sea salt",
        price: 9.99,
        image: "https://picsum.photos/seed/caramel-popcorn/300/250.jpg"
    },
    {
        id: 3,
        name: "Chocolate Drizzle",
        description: "Rich chocolate drizzle over buttery popcorn",
        price: 10.99,
        image: "https://picsum.photos/seed/chocolate-popcorn/300/250.jpg"
    },
    {
        id: 4,
        name: "Spicy Jalapeño",
        description: "Bold jalapeño flavor with a kick of heat",
        price: 9.49,
        image: "https://picsum.photos/seed/jalapeno-popcorn/300/250.jpg"
    },
    {
        id: 5,
        name: "White Cheddar",
        description: "Creamy white cheddar cheese coating",
        price: 9.79,
        image: "https://picsum.photos/seed/cheddar-popcorn/300/250.jpg"
    },
    {
        id: 6,
        name: "Truffle Garlic",
        description: "Luxurious truffle oil with roasted garlic",
        price: 12.99,
        image: "https://picsum.photos/seed/truffle-popcorn/300/250.jpg"
    },
    {
        id: 7,
        name: "Sweet & Salty",
        description: "Perfect blend of caramel and sea salt",
        price: 8.49,
        image: "https://picsum.photos/seed/sweet-salty-popcorn/300/250.jpg"
    },
    {
        id: 8,
        name: "BBQ Bacon",
        description: "Smoky BBQ flavor with crispy bacon bits",
        price: 11.49,
        image: "https://picsum.photos/seed/bbq-popcorn/300/250.jpg"
    },
    {
        id: 9,
        name: "Mint Chocolate",
        description: "Refreshing mint with rich dark chocolate",
        price: 10.49,
        image: "https://picsum.photos/seed/mint-chocolate-popcorn/300/250.jpg"
    }
];

// Shopping cart
let cart = [];

// DOM elements
const productsGrid = document.getElementById('products-grid');
const cartCount = document.querySelector('.cart-count');
const cartModal = document.getElementById('cart-modal');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');
const clearCartBtn = document.getElementById('clear-cart-btn');
const closeModal = document.querySelector('.close');
const cartBtn = document.querySelector('.cart-btn');

// Initialize the app
function init() {
    renderProducts();
    updateCartCount();
    loadCartFromStorage();
    attachEventListeners();
}

// Render products
function renderProducts() {
    productsGrid.innerHTML = products.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image">
            <div class="product-info">
                <h3 class="product-name">${product.name}</h3>
                <p class="product-description">${product.description}</p>
                <div class="product-price">$${product.price.toFixed(2)}</div>
                <div class="product-actions">
                    <div class="quantity-control">
                        <button class="quantity-btn" onclick="decreaseQuantity(${product.id})">-</button>
                        <span class="quantity" id="quantity-${product.id}">1</span>
                        <button class="quantity-btn" onclick="increaseQuantity(${product.id})">+</button>
                    </div>
                    <button class="add-to-cart" onclick="addToCart(${product.id})">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// Quantity controls
function increaseQuantity(productId) {
    const quantityElement = document.getElementById(`quantity-${productId}`);
    let quantity = parseInt(quantityElement.textContent);
    quantity++;
    quantityElement.textContent = quantity;
}

function decreaseQuantity(productId) {
    const quantityElement = document.getElementById(`quantity-${productId}`);
    let quantity = parseInt(quantityElement.textContent);
    if (quantity > 1) {
        quantity--;
        quantityElement.textContent = quantity;
    }
}

// Add to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const quantity = parseInt(document.getElementById(`quantity-${productId}`).textContent);
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({
            ...product,
            quantity: quantity
        });
    }
    
    updateCartCount();
    saveCartToStorage();
    showNotification(`${product.name} added to cart!`);
    
    // Reset quantity for this product
    document.getElementById(`quantity-${productId}`).textContent = '1';
}

// Update cart count
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

// Show cart modal
function showCart() {
    cartModal.style.display = 'block';
    renderCartItems();
    updateCartTotal();
}

// Hide cart modal
function hideCart() {
    cartModal.style.display = 'none';
}

// Render cart items
function renderCartItems() {
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #666; padding: 2rem;">Your cart is empty</p>';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)} each</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity - 1})">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateCartQuantity(${item.id}, ${item.quantity + 1})">+</button>
            </div>
            <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
            <button class="quantity-btn" onclick="removeFromCart(${item.id})" style="color: #dc3545;">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
}

// Update cart quantity
function updateCartQuantity(productId, newQuantity) {
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = newQuantity;
        renderCartItems();
        updateCartTotal();
        updateCartCount();
        saveCartToStorage();
    }
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    renderCartItems();
    updateCartTotal();
    updateCartCount();
    saveCartToStorage();
}

// Update cart total
function updateCartTotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = total.toFixed(2);
}

// Clear cart
function clearCart() {
    cart = [];
    updateCartCount();
    renderCartItems();
    updateCartTotal();
    saveCartToStorage();
    showNotification('Cart cleared!');
}

// Checkout
function checkout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!');
        return;
    }

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    // Simulate checkout process
    showNotification(`Checkout successful! ${itemCount} items for $${total.toFixed(2)}`);
    
    // Clear cart after successful checkout
    setTimeout(() => {
        clearCart();
        hideCart();
    }, 2000);
}

// Save cart to localStorage
function saveCartToStorage() {
    localStorage.setItem('popcornCart', JSON.stringify(cart));
}

// Load cart from localStorage
function loadCartFromStorage() {
    const savedCart = localStorage.getItem('popcornCart');
    if (savedCart) {
        cart = JSON.parse(savedCart);
        updateCartCount();
    }
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background-color: #ff6b35;
        color: white;
        padding: 15px 20px;
        border-radius: 5px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        animation: slideIn 0.3s ease;
    `;

    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    document.body.appendChild(notification);

    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Attach event listeners
function attachEventListeners() {
    // Cart button
    cartBtn.addEventListener('click', showCart);
    
    // Modal controls
    closeModal.addEventListener('click', hideCart);
    checkoutBtn.addEventListener('click', checkout);
    clearCartBtn.addEventListener('click', clearCart);
    
    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === cartModal) {
            hideCart();
        }
    });

    // Contact form
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            showNotification('Message sent successfully!');
            contactForm.reset();
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);