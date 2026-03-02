# Popcorn Paradise - Gourmet Popcorn Website

A complete, responsive popcorn selling website with multiple flavors and a functional payment system.

## Features

### 🌟 Main Features
- **Responsive Design** - Works perfectly on desktop, tablet, and mobile devices
- **12 Different Popcorn Flavors** - From classic butter to exotic combinations
- **Interactive Shopping Cart** - Add, remove, and modify quantities
- **Complete Checkout System** - Form validation and order processing
- **Order Confirmation** - Automatic order ID generation
- **Modern UI/UX** - Clean, professional design with smooth animations

### 🎨 Design Elements
- Gradient backgrounds and modern color scheme
- Smooth hover effects and transitions
- Modal-based shopping cart and checkout
- Font Awesome icons for better visual appeal
- Google Fonts (Poppins) for typography

### 🛒 Shopping System
- Add flavors to cart with quantity management
- Real-time cart total calculation
- Cart item removal and quantity updates
- Visual cart counter in header

### 💳 Payment System
- Secure-looking checkout form (simulated)
- Credit card number formatting (spaces every 4 digits)
- Expiry date formatting (MM/YY)
- CVV validation (numbers only, max 3 digits)
- Form validation and submission handling

## File Structure

```
popcorn-website/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # Main stylesheet
├── js/
│   └── app.js          # JavaScript functionality
├── images/             # Image directory (empty for now)
└── README.md           # This file
```

## How to Use

1. **Open the website** - Simply open `index.html` in any web browser
2. **Browse flavors** - Scroll through the 12 available popcorn flavors
3. **Add to cart** - Click "Add to Cart" on any flavor
4. **View cart** - Click the shopping cart icon in the header
5. **Checkout** - Proceed to checkout and fill in your details
6. **Complete order** - Submit the form to receive your order confirmation

## Technical Details

### Technologies Used
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with flexbox and grid
- **Vanilla JavaScript** - No external frameworks required
- **Font Awesome** - Icon library
- **Google Fonts** - Typography

### JavaScript Functionality
- Dynamic flavor rendering
- Shopping cart management
- Modal handling
- Form validation and formatting
- Order processing simulation
- Notification system

### Responsive Design
- Mobile-first approach
- Breakpoints at 768px and 480px
- Flexible grid layouts
- Touch-friendly interface

## Customization

### Adding New Flavors
Edit the `flavors` array in `js/app.js`:
```javascript
{
    id: 13,
    name: "Your New Flavor",
    description: "Description of your flavor",
    price: 14.99,
    icon: "🎉"
}
```

### Styling
- Modify colors in `css/style.css`
- Update gradients and fonts as needed
- Adjust responsive breakpoints

### Payment Integration
The current system is simulated. For real payment processing:
- Integrate with Stripe, PayPal, or other payment processors
- Replace the simulated order processing with actual API calls
- Add proper error handling and security measures

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Future Enhancements

- User authentication system
- Order history and tracking
- Product reviews and ratings
- Inventory management
- Advanced search and filtering
- Multi-language support
- Social media integration

---

Built with ❤️ for popcorn lovers everywhere! 🍿