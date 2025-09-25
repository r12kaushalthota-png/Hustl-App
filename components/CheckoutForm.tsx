import { Platform } from 'react-native';

// Platform-specific imports
const CheckoutForm = Platform.select({
  web: () => require('./CheckoutForm.web').default,
  default: () => require('./CheckoutForm.native').default,
})();

export default CheckoutForm;