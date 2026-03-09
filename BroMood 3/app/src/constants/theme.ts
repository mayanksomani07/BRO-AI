export const COLORS = {
  // Backgrounds
  background: '#080B14',
  surface: '#0F1422',
  surfaceElevated: '#161C2E',
  card: '#1A2135',
  cardHover: '#1F2840',

  // Brand
  primary: '#3D7EFF',
  primaryLight: '#5B96FF',
  primaryDark: '#2461E8',
  primaryGlow: 'rgba(61, 126, 255, 0.2)',

  // Accents
  accent: '#FF6B6B',
  accentGlow: 'rgba(255, 107, 107, 0.2)',
  success: '#2DD4A8',
  successGlow: 'rgba(45, 212, 168, 0.2)',
  warning: '#FFB347',
  warningGlow: 'rgba(255, 179, 71, 0.2)',
  danger: '#FF4757',
  dangerGlow: 'rgba(255, 71, 87, 0.2)',

  // Mood colors (1–10)
  moodCritical: '#FF2D55',    // 1–3
  moodLow: '#FF9F0A',         // 3–5
  moodMedium: '#FFD60A',      // 5–7
  moodGood: '#32D74B',        // 7–9
  moodExcellent: '#0A84FF',   // 9–10

  // Text
  textPrimary: '#F0F4FF',
  textSecondary: '#A0AABF',
  textMuted: '#5C6580',
  textInverse: '#080B14',

  // UI
  border: 'rgba(255,255,255,0.07)',
  borderFocus: 'rgba(61, 126, 255, 0.4)',
  shadow: 'rgba(0, 0, 0, 0.6)',
  overlay: 'rgba(8, 11, 20, 0.85)',

  // Emergency
  emergency: '#FF2D55',
  emergencyGlow: 'rgba(255, 45, 85, 0.3)',
};

export const FONTS = {
  // Heading
  heading: 'Poppins-Bold',
  headingMedium: 'Poppins-SemiBold',
  headingRegular: 'Poppins-Medium',

  // Body
  body: 'Inter-Regular',
  bodyMedium: 'Inter-Medium',
  bodySemiBold: 'Inter-SemiBold',
  bodyBold: 'Inter-Bold',
};

export const SIZES = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
};

export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
};

export function getMoodColor(score: number): string {
  if (score < 3) return COLORS.moodCritical;
  if (score < 5) return COLORS.moodLow;
  if (score < 7) return COLORS.moodMedium;
  if (score < 9) return COLORS.moodGood;
  return COLORS.moodExcellent;
}

export function getMoodLabel(score: number, lang = 'hinglish'): string {
  const labels: Record<string, string[]> = {
    hinglish: [
      '', 'Bahut bura', 'Bura', 'Thoda theek nahi',
      'Meh', 'Theek thak', 'Achha', 'Kaafi achha',
      'Bahut achha', 'Zabardast', 'Legend!'
    ],
    english: [
      '', 'Very bad', 'Bad', 'Not great',
      'Meh', 'Okay', 'Good', 'Pretty good',
      'Very good', 'Amazing', 'Legendary!'
    ],
  };
  const set = labels[lang] || labels.english;
  return set[Math.round(score)] || 'Unknown';
}
