// Application Configuration
const CONFIG = {
    APP_NAME: 'Card Manager',
    VERSION: '1.0.0',
    DEBUG: true, // Set to false in production
    
    // Storage keys
    STORAGE_KEYS: {
        CARDS: 'cards',
        CONFIG: 'config',
        ENCRYPTION_SALT: 'encryptionSalt'
    },
    
    // Encryption settings
    ENCRYPTION: {
        ALGORITHM: 'AES-GCM',
        KEY_LENGTH: 256,
        ITERATIONS: 100000
    }
};
