export const colors = {
  primary: {
    teal: '#14B8A6',
    purple: '#8B5CF6',
  },
  background: {
    light: '#FFFFFF',
    dark: '#000000',
  },
  surface: {
    light: '#F5F5F5',
    dark: '#1A1A1A',
  },
  text: {
    primary: {
      light: '#000000',
      dark: '#FFFFFF',
    },
    secondary: {
      light: '#666666',
      dark: '#999999',
    },
  },
  border: {
    light: '#E5E5E5',
    dark: '#333333',
  },
  overlay: 'rgba(0, 0, 0, 0.5)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const typography = {
  heading: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 24,
    lineHeight: 32,
  },
  subheading: {
    fontFamily: 'Poppins-SemiBold',
    fontSize: 18,
    lineHeight: 24,
  },
  body: {
    fontFamily: 'Inter',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    fontFamily: 'Inter',
    fontSize: 14,
    lineHeight: 20,
  },
  button: {
    fontFamily: 'Inter',
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const minTapTarget = 44;

export const shadows = {
  small: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medium: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  large: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
