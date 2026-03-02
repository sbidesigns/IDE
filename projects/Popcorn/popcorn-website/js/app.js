// Popcorn flavors data
const flavors = [
    {
        id: 1,
        name: "Classic Butter",
        description: "The timeless classic with rich, creamy butter flavor",
        price: 8.99,
        icon: "🧈"
    },
    {
        id: 2,
        name: "Caramel Delight",
        description: "Sweet and buttery caramel popcorn that melts in your mouth",
        price: 9.99,
        icon: "🍯"
    },
    {
        id: 3,
        name: "Chocolate Lover",
        description: "Rich chocolate coating for the ultimate indulgence",
        price: 10.99,
        icon: "🍫"
    },
    {
        id: 4,
        name: "Cheese Explosion",
        description: "Sharp cheddar cheese flavor that's simply irresistible",
        price: 9.49,
        icon: "🧀"
    },
    {
        id: 5,
        name: "Spicy Jalapeño",
        description: "Bold and spicy with a perfect kick of jalapeño",
        price: 10.49,
        icon: "🌶️"
    },
    {
        id: 6,
        name: "Sweet & Salty",
        description: "The perfect balance of sweet caramel and sea salt",
        price: 9.79,
        icon: "🍿"
    },
    {
        id: 7,
        name: "White Chocolate Raspberry",
        description: "Elegant white chocolate with raspberry swirls",
        price: 11.99,
        icon: "🍓"
    },
    {
        id: 8,
        name: "S'mores Fantasy",
        description: "Campfire classic with marshmallow and chocolate",
        price: 12.99,
        icon: "🔥"
    },
    {
        id: 9,
        name: "Peanut Butter Cup",
        description: "Reese's inspired chocolate and peanut butter perfection",
        price: 11.49,
        icon: "🥜"
    },
    {
        id: 10,
        name: "Mint Chocolate Chip",
        description: "Refreshing mint with dark chocolate chips",
        price: 10.99,
        icon: "🌿"
    },
    {
        id: 11,
        name: "Maple Bacon",
        description: "Sweet maple syrup with crispy bacon bits",
        price: 13.99,
        icon: "🥓"
    },
    {
        id: 12,
        name: "Strawberry Cheesecake",
        description: "Creamy strawberry flavor with cheesecake pieces",
        price: 11.99,
        icon: "🍰"
    }
];

// Shopping cart
let cart = [];

// DOM elements
const flavorsGrid = document.getElementById('flavors-grid');
const cartCount = document.querySelector('.cart-count');
const cartModal = document.getElementById('cart-modal');
const checkoutModal = document.getElementById('checkout-modal');
const confirmationModal = document.getElementById('confirmation-modal');
const cartItems = document.getElementById('cart-items');
const cartTotal = document.getElementById('cart-total');
const checkoutForm = document.getElementById('checkout-form');
const orderId = document.getElementById('order-id');

// Initialize the app
function init() {
    renderFlavors();
    updateCartCount();
    
    // Event listeners
    document.querySelectorAll('.cart-icon').forEach(icon => {
        icon.addEventListener('click', openCart);
    });

    document.querySelectorAll('.close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal.id);
        });
    });

    document.getElementById('checkout-btn').addEventListener('click', openCheckout);
    checkoutForm.addEventListener('submit', processCheckout);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            closeModal(event.target.id);
        }
    });

    // CTA button
    document.querySelector('.cta-button').addEventListener('click', () => {
        document.getElementById('flavors').scrollIntoView({ behavior: 'smooth' });
    });
}

// Render flavors
function renderFlavors() {
    flavorsGrid.innerHTML = flavors.map(flavor => `
        <div class="flavor-card">
            <div class="flavor-image">
                <span>${flavor.icon}</span>
            </div>
            <div class="flavor-info">
                <h3 class="flavor-name">${flavor.name}</h3>
                <p class="flavor-description">${flavor.description}</p>
                <div class="flavor-price">$${flavor.price.toFixed(2)}</div>
                <button class="add-to-cart" onclick="addToCart(${flavor.id})">
                    <i class="fas fa-plus"></i> Add to Cart
                </button>
            </div>
        </div>
    `).join('');
}

// Add to cart
function addToCart(flavorId) {
    const flavor = flavors.find(f => f.id === flavorId);
    const existingItem = cart.find(item => item.id === flavorId);

    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            ...flavor,
            quantity: 1
        });
    }

    updateCartCount();
    showNotification(`${flavor.name} added to cart!`);
}

// Update cart count
function updateCartCount() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
}

// Open cart modal
function openCart() {
    renderCartItems();
    cartModal.style.display = 'block';
}

// Render cart items
function renderCartItems() {
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #666;">Your cart is empty</p>';
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">$${item.price.toFixed(2)}</div>
            </div>
            <div class="cart-item-quantity">
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                <span>${item.quantity}</span>
                <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                <button class="quantity-btn" onclick="removeFromCart(${item.id})" style="background: #ff6b6b; color: white; margin-left: 10px;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');

    updateCartTotal();
}

// Update quantity
function updateQuantity(itemId, change) {
    const item = cart.find(item => item.id === itemId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(itemId);
        } else {
            renderCartItems();
            updateCartCount();
        }
    }
}

// Remove from cart
function removeFromCart(itemId) {
    cart = cart.filter(item => item.id !== itemId);
    renderCartItems();
    updateCartCount();
    updateCartTotal();
}

// Update cart total
function updateCartTotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    cartTotal.textContent = total.toFixed(2);
}

// Open checkout modal
function openCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!');
        return;
    }
    checkoutModal.style.display = 'block';
}

// Process checkout
function processCheckout(e) {
    e.preventDefault();
    
    const formData = new FormData(checkoutForm);
    const orderData = {
        name: document.getElementById('name').value,
        email: document.getElementById('email').value,
        address: document.getElementById('address').value,
        cardNumber: document.getElementById('card-number').value,
        expiry: document.getElementById('expiry').value,
        cvv: document.getElementById('cvv').value,
        items: cart,
        total: cart.reduce((sum, item) => sum + (item.price * item.quantity), 0),
        orderId: generateOrderId()
    };

    // Simulate payment processing
    setTimeout(() => {
        orderData.timestamp = new Date().toISOString();
        
        // Store order data (in real app, this would go to a server)
        console.log('Order placed:', orderData);
        
        // Show confirmation
        orderId.textContent = orderData.orderId;
        closeModal('checkout-modal');
        confirmationModal.style.display = 'block';
        
        // Clear cart and form
        cart = [];
        updateCartCount();
        updateCartTotal();
        checkoutForm.reset();
        renderCartItems();
        
        // Clear cart from display
        cartItems.innerHTML = '<p style="text-align: center; color: #666;">Your cart is empty</p>';
    }, 1500);
}

// Generate order ID
function generateOrderId() {
    return 'POPCORN-' + Date.now().toString().slice(-8);
}

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Show notification
function showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
        font-weight: 600;
    `;
    notification.textContent = message;
    
    // Add animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(notification);
    
    // Remove notification after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Format card number input
document.getElementById('card-number').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\s/g, '').replace(/[^0-9]/gi, '');
    let formattedValue = value.match(/.{1,4}/g)?.join(' ') || value;
    e.target.value = formattedValue;
});

// Format expiry date input
document.getElementById('expiry').addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length >= 2) {
        value = value.substring(0, 2) + '/' + value.substring(2, 4);
    }
    e.target.value = value;
});

// Format CVV input
document.getElementById('cvv').addEventListener('input', function(e) {
    e.target.value = e.target.value.replace(/[^0-9]/g, '').substring(0, 3);
});

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);