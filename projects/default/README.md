# Premium Popcorn Website

A complete e-commerce website for selling gourmet popcorn with full purchase features.

## Features

### 🛒 Shopping Cart Features
- Add products to cart with quantity selection
- Real-time cart updates and persistent storage
- Cart modal with item management
- Quantity increase/decrease controls
- Remove individual items from cart
- Clear entire cart functionality
- Running total calculation

### 🎨 Website Features
- Responsive design for all devices
- Modern, clean UI with popcorn theme
- Hero section with call-to-action
- Product showcase with 9 different popcorn varieties
- About section with company information
- Contact form with validation
- Social media integration
- Smooth scrolling navigation
- Interactive notifications

### 📱 User Experience
- Intuitive navigation
- Visual feedback for user actions
- Mobile-friendly responsive design
- Accessible color scheme and typography
- Loading animations and transitions

## Project Structure

```
src/
├── index.html          # Main HTML file
├── styles/
│   └── main.css        # CSS styling
├── js/
│   └── app.js          # JavaScript functionality
├── data/
│   └── products.json   # Product data
└── components/         # Component directory (ready for expansion)
```

## Product Categories

- **Classic**: Traditional butter flavor
- **Sweet**: Caramel, chocolate, and sweet varieties
- **Spicy**: Bold and heat-infused flavors
- **Cheese**: Various cheese coatings
- **Gourmet**: Premium and luxury flavors
- **Savory**: BBQ, bacon, and savory combinations

## How to Use

1. **Browse Products**: View all available popcorn varieties
2. **Add to Cart**: Select quantity and add items to cart
3. **Manage Cart**: View, modify quantities, or remove items
4. **Checkout**: Complete purchase with one-click checkout
5. **Contact**: Reach out via the contact form

## Technical Features

### Shopping Cart Functionality
- **Local Storage**: Cart persists between sessions
- **Real-time Updates**: Instant cart count updates
- **Item Management**: Add, remove, and modify quantities
- **Total Calculation**: Automatic price calculations

### Responsive Design
- **Mobile First**: Optimized for mobile devices
- **Flexible Grid**: Adapts to different screen sizes
- **Touch-friendly**: Large buttons and easy navigation
- **Accessibility**: Proper contrast and readable fonts

### Interactive Elements
- **Smooth Animations**: CSS transitions and hover effects
- **Modal System**: Shopping cart modal with overlay
- **Notifications**: Toast-style notifications for user feedback
- **Form Validation**: Contact form with client-side validation

## Customization

### Adding New Products
1. Update `src/data/products.json` with new product data
2. Product fields:
   - `id`: Unique identifier
   - `name`: Product name
   - `description`: Product description
   - `price`: Price in USD
   - `image`: Image URL (using picsum.photos for demo)
   - `category`: Product category
   - `featured`: Whether to feature on homepage

### Styling Customization
- **Colors**: Modify CSS variables in `main.css`
- **Fonts**: Update font-family properties
- **Layout**: Adjust grid templates and flexbox
- **Animations**: Modify CSS keyframes and transitions

### Functionality Extensions
- **User Accounts**: Add authentication system
- **Payment Integration**: Connect to payment processors
- **Order Management**: Add order tracking
- **Reviews System**: Add customer reviews
- **Search Functionality**: Add product search

## Browser Compatibility

- **Chrome**: Full support
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support
- **Mobile Browsers**: Full support

## Future Enhancements

1. **User Authentication**: Login/register system
2. **Payment Processing**: Stripe/PayPal integration
3. **Order History**: Save and track customer orders
4. **Wishlist**: Save favorite products
5. **Reviews & Ratings**: Customer feedback system
6. **Admin Panel**: Product management interface
7. **Analytics**: User behavior tracking
8. **Email Notifications**: Order confirmations

## Development Notes

- The website uses vanilla JavaScript for maximum compatibility
- CSS Grid and Flexbox for responsive layout
- Font Awesome icons for UI elements
- Picsum Photos for placeholder images
- Local storage for cart persistence

## License

This project is open source and available under the MIT License.