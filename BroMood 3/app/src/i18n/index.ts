import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import hinglish from './translations/hinglish.json';
import hindi from './translations/hindi.json';
import english from './translations/english.json';
import bengali from './translations/bengali.json';
import kannada from './translations/kannada.json';
import tamil from './translations/tamil.json';
import marathi from './translations/marathi.json';
import telugu from './translations/telugu.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      hinglish: { translation: hinglish },
      hindi: { translation: hindi },
      english: { translation: english },
      bengali: { translation: bengali },
      kannada: { translation: kannada },
      tamil: { translation: tamil },
      marathi: { translation: marathi },
      telugu: { translation: telugu },
    },
    lng: 'hinglish',
    fallbackLng: 'english',
    interpolation: { escapeValue: false },
  });

export default i18n;
