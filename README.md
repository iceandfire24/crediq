# Card Manager

An offline-first web application for securely managing credit and debit card information locally. Built with vanilla HTML, CSS, and JavaScript - no backend required.

## Features

- **Offline-First**: Works completely offline using browser local storage
- **Secure**: Client-side encryption for sensitive data (card numbers, CVVs)
- **Card Management**: Add, view, edit, and delete cards with validation
- **Smart Detection**: Automatic card network and bank detection
- **Search & Filter**: Find cards quickly by name, bank, network, or tags
- **Payment Reminders**: Configurable notifications for bill due dates
- **Statistics**: Track total fees, credit limits, and card portfolio analytics
- **Calendar View**: Visualize statement cycles and payment due dates
- **Data Export/Import**: Encrypted backup and restore functionality
- **Customizable**: Dark/light themes, date formats, and bank color themes
- **Responsive**: Works on desktop, tablet, and mobile devices

## Technology Stack

- HTML5
- CSS3 (Grid, Flexbox, Custom Properties)
- Vanilla JavaScript (ES6+)
- Web Crypto API (AES-GCM encryption)
- Local Storage API

## Browser Requirements

- Chrome 60+ / Edge 79+
- Firefox 57+
- Safari 11+
- Mobile browsers with Web Crypto API support

## Getting Started

### Installation

1. Clone or download this repository
2. Open `index.html` in your browser
3. Set up your master password on first launch

That's it! No build tools or npm install required.

### Development

Simply edit the files and refresh your browser. The app uses vanilla JavaScript with no build step.

### Deployment

Deploy as a static website to any hosting platform:

**GitHub Pages:**
1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. Select main branch as source

**Netlify:**
1. Drag and drop the project folder to Netlify
2. Or connect your Git repository

**Vercel:**
1. Import your Git repository
2. Deploy with default settings

## Security

- All card numbers and CVVs are encrypted using AES-GCM before storage
- Master password never stored, only derived encryption key in session storage
- No data ever sent to external servers
- Works completely offline
- HTTPS required for production use

**Important:** This app stores sensitive financial data. Always:
- Use a strong master password
- Access only over HTTPS in production
- Export backups regularly
- Never share your export files or master password

## Project Structure

```
card-manager/
├── index.html              # Main entry point
├── css/
│   ├── main.css           # Global styles
│   ├── components.css     # Component styles
│   ├── layouts.css        # Responsive layouts
│   └── themes.css         # Dark/light themes
├── js/
│   ├── app.js             # Application initialization
│   ├── config.js          # Configuration
│   ├── router.js          # Client-side routing
│   ├── models/            # Data models
│   ├── services/          # Business logic
│   ├── controllers/       # Controllers
│   └── views/             # UI views
├── assets/
│   ├── logos/             # Network and bank logos
│   └── icons/             # UI icons
└── data/
    └── bankColors.json    # Default bank colors
```

## Usage

### Adding a Card

1. Click the "+" button
2. Enter card details (name, number, CVV, expiry are required)
3. Optionally add billing dates, fees, and tags
4. Card network and bank are detected automatically
5. Click "Save"

### Viewing Cards

- Browse all cards on the home page
- Click any card to view full details
- Use search to find specific cards
- Filter by network, bank, or tags
- Sort by name, expiry, or age

### Payment Reminders

1. Add statement date and due date when adding a card
2. Enable notifications toggle
3. Choose reminder period (7, 3, 1 days before, or same day)
4. View upcoming reminders on home page

### Export/Import

**Export:**
1. Go to Settings
2. Click "Export Data"
3. Enter a password
4. Download encrypted file

**Import:**
1. Go to Settings
2. Click "Import Data"
3. Select your export file
4. Enter the password

## Supported Card Networks

- Visa
- Mastercard
- American Express
- RuPay
- Diners Club
- Discover

## Supported Indian Banks

HDFC Bank, ICICI Bank, State Bank of India, Axis Bank, Kotak Mahindra Bank, HSBC, Citibank, Standard Chartered, Yes Bank, IndusInd Bank, and more.

## Contributing

This is a learning project. Feel free to fork and experiment!

## License

MIT License - See LICENSE file for details

## Privacy

This application:
- Stores all data locally in your browser
- Never sends data to any server
- Never uses analytics or tracking
- Never shares your information

Your data never leaves your device.

## Support

- Report bugs: [Create an issue]
- Questions: [Discussions]
- Documentation: See `/docs` folder (coming soon)

## Roadmap

- [ ] PWA support with service worker
- [ ] React migration
- [ ] Advanced charts and analytics
- [ ] Multi-currency support
- [ ] Receipt attachments
- [ ] Accessibility improvements (WCAG 2.1 AA)
- [ ] Internationalization (i18n)

## Version

Current Version: 1.0.0

---

**⚠️ Disclaimer:** This application is for personal use only. Always keep your card information secure and never share your master password or export files.
