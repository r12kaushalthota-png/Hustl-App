/**
 * Hustl Branding System
 * Single source of truth for all brand assets, logos, and visual identity
 */

// Hustl Brand Assets
export const HustlBrand = {
  // Main logo assets
  logo: {
    icon: require('../assets/images/image.png'),
    wordmark: require('../assets/images/image.png'),
    full: require('../assets/images/image.png'),
  },
  
  // Brand colors
  colors: {
    primary: '#0021A5', // UF Blue
    secondary: '#FA4616', // UF Orange
    gradient: {
      welcome: ['#6B46C1', '#8B5CF6', '#EC4899', '#F97316'],
      button: ['#F97316', '#3B82F6'],
      referral: ['#3B82F6', '#8B5CF6', '#EC4899'],
    }
  },

  // Logo component props
  iconSize: {
    small: 24,
    medium: 32,
    large: 48,
    xlarge: 64,
  }
};

// University Assets and Data
export const Universities = {
  uf: {
    id: 'uf',
    name: 'University of Florida',
    shortName: 'UF',
    logo: require('../assets/images/Florida_Gators_gator_logo.png'),
    colors: {
      primary: '#0021A5',
      secondary: '#FA4616',
    },
    enabled: true,
  },
  ucf: {
    id: 'ucf',
    name: 'University of Central Florida',
    shortName: 'UCF',
    logo: require('../assets/images/ucf_university-of-central-florida-logo.jpg'),
    colors: {
      primary: '#FFD700',
      secondary: '#000000',
    },
    enabled: false,
  },
  usf: {
    id: 'usf',
    name: 'University of South Florida',
    shortName: 'USF',
    logo: require('../assets/images/UniversityOfSouthFlorida-logo-350x350.jpg'),
    colors: {
      primary: '#006747',
      secondary: '#FFD700',
    },
    enabled: false,
  },
  fsu: {
    id: 'fsu',
    name: 'Florida State University',
    shortName: 'FSU',
    logo: require('../assets/images/Florida_State_Seminoles_logo.png'),
    colors: {
      primary: '#782F40',
      secondary: '#CEB888',
    },
    enabled: false,
  },
};

// Get all universities as array
export const UniversityList = Object.values(Universities);

// Helper functions
export const BrandingUtils = {
  // Direct access to Universities object
  Universities,

  /**
   * Get university by ID
   */
  getUniversity: (id: string) => {
    return Universities[id as keyof typeof Universities] || Universities.uf;
  },

  /**
   * Get enabled universities only
   */
  getEnabledUniversities: () => {
    return UniversityList.filter(uni => uni.enabled);
  },

  /**
   * Get university logo source
   */
  getUniversityLogo: (id: string) => {
    const university = BrandingUtils.getUniversity(id);
    return university.logo;
  },

  /**
   * Get Hustl logo for specific size
   */
  getHustlIcon: () => {
    return HustlBrand.logo.icon;
  },

  /**
   * Get brand gradient colors
   */
  getBrandGradient: (type: 'welcome' | 'button' | 'referral') => {
    return HustlBrand.colors.gradient[type];
  },
};

export default HustlBrand;