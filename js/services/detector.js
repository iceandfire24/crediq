/**
 * Detector Service
 * Detects card network and issuing bank from card number (BIN)
 * Requirements: 1.10, 1.11, 17.1, 17.2, 17.3, 17.4, 17.7, 17.11
 */

// Card network detection patterns (BIN-based)
const NETWORK_PATTERNS = {
  'Visa': /^4/,
  'Mastercard': /^(5[1-5]|2[2-7])/,
  'American Express': /^3[47]/,
  'RuPay': /^(508[5-9]|6069|607[0-9]|608[0-4]|6521|6522|817[2-9]|818[0-9]|819[0-2])/,
  'Diners Club': /^(36|38|30[0-5])/,
  'Discover': /^(6011|65|64[4-9]|622)/
};

// BIN prefixes for major Indian banks (6-digit BIN prefixes where known)
// Based on publicly known BIN ranges for Indian banks
const BANK_BINS = {
  'HDFC Bank': [
    '400666', '400895', '401200', '401201', '401202', '401203',
    '404610', '404611', '404612', '404613', '404614', '404615',
    '414366', '414367', '414368', '414369', '414370',
    '438857', '438858', '438859', '438860',
    '452204', '452205', '452206', '452207',
    '508528', '508529', '508530', '508531',
    '524048', '524049', '524050', '524051',
    '540611', '540612', '540613', '540614',
    '546406', '546407', '546408', '546409',
    '552252', '552253', '552254', '552255',
    '607000', '607001', '607002', '607003', '607004', '607005'
  ],
  'ICICI Bank': [
    '400428', '400429', '400430', '400431',
    '414346', '414347', '414348', '414349',
    '426523', '426524', '426525', '426526',
    '437748', '437749', '437750', '437751',
    '461800', '461801', '461802', '461803',
    '508534', '508535', '508536', '508537',
    '524642', '524643', '524644', '524645',
    '540716', '540717', '540718', '540719',
    '549138', '549139', '549140', '549141',
    '607106', '607107', '607108', '607109'
  ],
  'State Bank of India': [
    '400152', '400153', '400154', '400155',
    '404244', '404245', '404246', '404247',
    '406040', '406041', '406042', '406043',
    '436532', '436533', '436534', '436535',
    '508505', '508506', '508507', '508508',
    '607094', '607095', '607096', '607097', '607098', '607099',
    '652150', '652151', '652152', '652153'
  ],
  'Axis Bank': [
    '400062', '400063', '400064', '400065',
    '415483', '415484', '415485', '415486',
    '436082', '436083', '436084', '436085',
    '508522', '508523', '508524', '508525',
    '524661', '524662', '524663', '524664',
    '540762', '540763', '540764', '540765',
    '607083', '607084', '607085', '607086'
  ],
  'Kotak Mahindra Bank': [
    '400440', '400441', '400442', '400443',
    '414790', '414791', '414792', '414793',
    '508538', '508539', '508540', '508541',
    '524056', '524057', '524058', '524059',
    '540724', '540725', '540726', '540727',
    '607110', '607111', '607112', '607113'
  ],
  'HSBC': [
    '400115', '400116', '400117', '400118',
    '414290', '414291', '414292', '414293',
    '524060', '524061', '524062', '524063',
    '540728', '540729', '540730', '540731'
  ],
  'Citibank': [
    '400516', '400517', '400518', '400519',
    '414720', '414721', '414722', '414723',
    '524064', '524065', '524066', '524067',
    '540732', '540733', '540734', '540735',
    '549142', '549143', '549144', '549145'
  ],
  'Standard Chartered': [
    '400520', '400521', '400522', '400523',
    '414724', '414725', '414726', '414727',
    '524068', '524069', '524070', '524071',
    '540736', '540737', '540738', '540739'
  ],
  'Yes Bank': [
    '400524', '400525', '400526', '400527',
    '414728', '414729', '414730', '414731',
    '508542', '508543', '508544', '508545',
    '524072', '524073', '524074', '524075',
    '607114', '607115', '607116', '607117'
  ],
  'IndusInd Bank': [
    '400528', '400529', '400530', '400531',
    '414732', '414733', '414734', '414735',
    '508546', '508547', '508548', '508549',
    '524076', '524077', '524078', '524079',
    '607118', '607119', '607120', '607121'
  ]
};

// Default color themes per bank (Req 17.7)
const DEFAULT_BANK_COLORS = {
  'HDFC Bank': '#004C8F',
  'ICICI Bank': '#F37021',
  'State Bank of India': '#22409A',
  'Axis Bank': '#800000',
  'Kotak Mahindra Bank': '#ED232A',
  'HSBC': '#DB0011',
  'Citibank': '#056DAE',
  'Standard Chartered': '#0072BC',
  'Yes Bank': '#00529B',
  'IndusInd Bank': '#C8102E',
  'Unknown': '#64748b'
};

// Slug map for logo file names
const NETWORK_LOGO_SLUGS = {
  'Visa': 'visa',
  'Mastercard': 'mastercard',
  'American Express': 'amex',
  'RuPay': 'rupay',
  'Diners Club': 'diners',
  'Discover': 'discover'
};

const BANK_LOGO_SLUGS = {
  'HDFC Bank': 'hdfc',
  'ICICI Bank': 'icici',
  'State Bank of India': 'sbi',
  'Axis Bank': 'axis',
  'Kotak Mahindra Bank': 'kotak',
  'HSBC': 'hsbc',
  'Citibank': 'citibank',
  'Standard Chartered': 'sc',
  'Yes Bank': 'yes',
  'IndusInd Bank': 'indusind'
};

class DetectorService {
  /**
   * Detect card network from card number using BIN patterns
   * @param {string} cardNumber - Card number (may contain spaces/dashes)
   * @returns {string} Network name or 'Unknown'
   */
  detectNetwork(cardNumber) {
    const digits = String(cardNumber || '').replace(/\D/g, '');
    if (!digits) return 'Unknown';

    for (const [network, pattern] of Object.entries(NETWORK_PATTERNS)) {
      if (pattern.test(digits)) {
        return network;
      }
    }

    return 'Unknown';
  }

  /**
   * Detect issuing bank from card number using BIN prefix matching
   * @param {string} cardNumber - Card number (may contain spaces/dashes)
   * @returns {string} Bank name or 'Unknown'
   */
  detectBank(cardNumber) {
    const digits = String(cardNumber || '').replace(/\D/g, '');
    if (digits.length < 6) return 'Unknown';

    const bin6 = digits.substring(0, 6);

    for (const [bank, bins] of Object.entries(BANK_BINS)) {
      if (bins.includes(bin6)) {
        return bank;
      }
    }

    return 'Unknown';
  }

  /**
   * Get logo path for a card network (Req 17.1, 17.3)
   * @param {string} network - Network name
   * @returns {string} Path to logo image
   */
  getNetworkLogo(network) {
    const slug = Object.prototype.hasOwnProperty.call(NETWORK_LOGO_SLUGS, network)
      ? NETWORK_LOGO_SLUGS[network]
      : null;
    if (!slug) return 'assets/icons/placeholder.svg';
    return `assets/logos/networks/${slug}.svg`;
  }

  /**
   * Get logo path for a bank (Req 17.2, 17.4)
   * @param {string} bank - Bank name
   * @returns {string} Path to logo image
   */
  getBankLogo(bank) {
    const slug = Object.prototype.hasOwnProperty.call(BANK_LOGO_SLUGS, bank)
      ? BANK_LOGO_SLUGS[bank]
      : null;
    if (!slug) return 'assets/icons/placeholder.svg';
    return `assets/logos/banks/${slug}.svg`;
  }

  /**
   * Get default color theme for a bank (Req 17.7)
   * @param {string} bank - Bank name
   * @returns {string} Hex color string
   */
  getBankColor(bank) {
    const color = Object.prototype.hasOwnProperty.call(DEFAULT_BANK_COLORS, bank)
      ? DEFAULT_BANK_COLORS[bank]
      : null;
    return typeof color === 'string' ? color : DEFAULT_BANK_COLORS['Unknown'];
  }
}

// Export singleton instance
const detectorService = new DetectorService();

// ES module export
export { DetectorService, detectorService, NETWORK_PATTERNS, BANK_BINS, DEFAULT_BANK_COLORS };

// CommonJS compat
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DetectorService, detectorService, NETWORK_PATTERNS, BANK_BINS, DEFAULT_BANK_COLORS };
}
