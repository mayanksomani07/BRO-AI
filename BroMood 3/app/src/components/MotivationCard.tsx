/**
 * MotivationCard — animated gradient card with:
 *  - 40+ quotes per language (all 8 languages)
 *  - Live quote from ZenQuotes API (CORS-free, free, unlimited)
 *  - Animated card with floating shimmer on shuffle
 *  - Spinning shuffle button
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, ActivityIndicator, Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { useTranslation } from 'react-i18next';

// ─── Quote banks ─────────────────────────────────────────────────────────────
const QUOTES: Record<string, string[]> = {
  hinglish: [
    'Ek buri raat poori zindagi nahi hoti. 💙', 'Tu jitna sochta hai utna bura nahi hai.',
    'Aaj ka dard kal ki strength hai, bhai.', 'Ruk mat. Thak ja, par ruk mat.',
    'Tu is cheez se bada hai jo tujhe chhota feel kara rahi hai.',
    'Har raat ke baad subah aati hai. Teri bhi aayegi.', 'Galti karna insaan hona hai. Tu theek hai.',
    'Ek kadam aage badh — bas itna kaafi hai aaj.', 'Tu akela nahi hai, chahe aisa lage.',
    'Himmat woh nahi jo darta nahi, jo darte hue bhi chalta hai.',
    'Zindagi ka ek chapter khatam hua — story abhi baaki hai.',
    'Chhoti cheezein count karti hain. Aaj ek chhoti cheez karo.',
    'Teri value kisi aur ke opinion pe depend nahi karti.',
    'Jo hua woh change nahi ho sakta. Jo hoga woh tu shape kar sakta hai.',
    'Breathe. Just breathe. Baaki sab baad mein.', 'Tujhe theek hone ke liye perfect nahi hona.',
    'Teri struggles tujhe define nahi karti — tera response karta hai.',
    'Sirf ek din jee le aaj. Kal ki kal dekhenge.', 'Chhoti si jeet bhi jeet hoti hai.',
    'Tu kab se khud se itna bura behaviour kar raha hai? Stop it.',
    'Ek insaan hona enough hai. Tu enough hai.', 'Rest is not failure. Rest is part of the plan.',
    'Tu deserve karta hai kindness — especially khud se.',
    'Sab kuch theek nahi hoga immediately — par tu iska handle kar sakta hai.',
    'Ek kadam. Bas ek. Aur kuch nahi chahiye abhi.',
    'Jo tujhe tod raha hai woh tujhe define nahi karta.',
    'Aaj survive karna bhi enough hai.', 'Teri feelings valid hain. Sach mein.',
    'Kisi ne bola tha — "be the friend to yourself that you wish you had."',
    'Mushkil waqt hamesha nahi rehta. Tu rehta hai.',
    'Compare mat kar apni journey kisi aur se. Teri apni hai.',
    'Jo toot jaata hai woh aksar zyada mazboot jodte hain.',
    'Teri mehnat zaroor rang laayegi.', 'Aaj ka version of you better hai kal se.',
    'Sun — breathing kar raha hai? Good. Sab kuch aage badh sakta hai.',
    'Ek baar socho — kitni cheezein tune already handle ki hain.',
    'Tu strong hai, chahe feel na ho abhi.', 'Duniya mein teri jagah hai. Pakki.',
    'Tujhe prove nahi karna kisi ko — sirf khud ko.',
    'Waqt lega. Par hoga. Bas rehna hai.',
  ],
  english: [
    'One bad night is not your whole life. 💙', 'Things are not as bad as they feel right now.',
    "Today's pain is tomorrow's strength.", "Don't stop. Rest, but don't stop.",
    "You're bigger than what's making you feel small.",
    'Every morning is a fresh start. Yours is coming.', 'Making mistakes means you are human.',
    'One step forward — that is enough for today.', 'You are not alone, even when it feels that way.',
    'Courage is moving forward despite fear.', 'One chapter ended. The story is not over.',
    'Small things count. Do one small thing today.',
    "Your worth doesn't depend on anyone else's opinion.",
    'You have survived every hard day so far. That is 100%.',
    'Breathe. Just breathe. Everything else can wait.',
    'You do not have to be perfect to heal.',
    'Your struggles do not define you — your response does.',
    'Just live today. Tomorrow can wait.', 'Even a small win is still a win. Celebrate it.',
    'You have been too hard on yourself for too long.', 'Being human is enough. You are enough.',
    'Rest is not failure. Rest is part of the plan.',
    'You deserve kindness, especially from yourself.',
    'Not everything has to be figured out today. One thing at a time.',
    'The fact that you are trying matters more than you know.',
    'Difficult roads often lead to beautiful destinations.',
    "You've done hard things before. You can do this too.",
    "It's okay to not be okay. Just don't stay there forever.",
    'Progress, not perfection. Always.', "Your feelings are valid. Don't let anyone tell you otherwise.",
    'Today is hard. Tomorrow might be easier. Keep going.',
    'You are allowed to take up space in this world.',
    "Someone out there needs you to keep going — even if you can't see them yet.",
    'The strongest people are not those who never break, but those who rebuild.',
    'You have more resilience in you than you realise.',
    "It's a bad day, not a bad life.", 'What you resist often hurts more. Let it pass through.',
    'Healing is not linear. Some days are two steps back. Keep going.',
    'Your past does not predict your future. You get to decide.',
    "You don't have to earn rest. You deserve it.",
  ],
  hindi: [
    'एक बुरी रात पूरी ज़िंदगी नहीं होती। 💙', 'तू उतना बुरा नहीं है जितना सोच रहा है।',
    'आज का दर्द कल की ताकत है।', 'रुक मत। थक जा, पर रुक मत।',
    'हर रात के बाद सुबह आती है।', 'तू अकेला नहीं है, चाहे ऐसा लगे।',
    'हिम्मत वो नहीं जो डरता नहीं, जो डरते हुए भी चलता है।',
    'छोटी चीज़ें मायने रखती हैं। आज एक छोटी चीज़ करो।',
    'सांस लो। बस सांस लो। बाकी सब बाद में।', 'तुम्हें ठीक होने के लिए परफेक्ट नहीं बनना।',
    'तुम्हारा जवाब तुम्हें परिभाषित करता है।', 'आराम करना कमजोरी नहीं है।',
    'तुम खुद से दयालुता के पात्र हो।', 'आज सिर्फ एक दिन जियो।',
    'छोटी जीत भी जीत होती है। उसे celebrate करो।', 'तुम enough हो। इंसान होना enough है।',
    'जो हुआ वो नहीं बदल सकता। आगे तुम तय करते हो।',
    'तुम जितना सोचते हो उससे ज़्यादा मज़बूत हो।', 'बुरा दिन है, बुरी ज़िंदगी नहीं।',
    'तुम्हारी भावनाएं valid हैं।', 'अपनी journey किसी से compare मत करो।',
    'हर मुश्किल तुम्हें तोड़ने नहीं, गढ़ने आती है।',
    'एक कदम। बस एक। यही काफी है आज।', 'तुम्हारी मेहनत रंग लाएगी।',
    'तुम्हें किसी को prove नहीं करना — सिर्फ खुद को।',
    'ये वक्त भी गुज़र जाएगा।', 'तुम सही जगह पर हो, सही वक्त पर।',
    'खुद के साथ वो दोस्त बनो जो तुम चाहते हो।',
    'हर सुबह एक नया मौका है।', 'तुम्हारी ज़रूरत है इस दुनिया में।',
    'गिरना हार नहीं है — न उठना है।', 'थोड़ा और। बस थोड़ा और।',
    'तुम survive कर रहे हो — यही बहादुरी है।',
    'दूसरों की राय तुम्हारी कीमत नहीं तय करती।',
    'आज जो तुम हो, कल से बेहतर हो।', 'खुद पर भरोसा रखो।',
    'यह सफर तुम्हारा है। अपनी रफ्तार से चलो।',
  ],
  bengali: [
    'একটা খারাপ রাত পুরো জীবন নয়। 💙', 'পরিস্থিতি তুমি যতটা ভাবছ ততটা খারাপ নয়।',
    'আজকের কষ্ট আগামীকালের শক্তি।', 'থামো না। ক্লান্ত হও, কিন্তু থামো না।',
    'প্রতিটি রাতের পরে ভোর আসে। তোমারও আসবে।', 'তুমি একা নও, যদিও মনে হচ্ছে।',
    'সাহস মানে ভয় পেয়েও এগিয়ে যাওয়া।', 'শ্বাস নাও। বাকি সব পরে।',
    'ছোট বিজয়ও বিজয়।', 'তুমি যথেষ্ট। মানুষ হওয়াটাই যথেষ্ট।',
    'বিশ্রাম নেওয়া দুর্বলতা নয়।', 'নিজের প্রতি সদয় হওয়ার অধিকার তোমার আছে।',
    'আজ শুধু একটা দিন বাঁচো।', 'তোমার অনুভূতি বৈধ।',
    'তুমি যা ভাবছ তার চেয়ে বেশি শক্তিশালী।',
    'খারাপ দিন, খারাপ জীবন নয়।', 'তোমার পরিশ্রম সফল হবে।',
    'একটা পদক্ষেপ। শুধু একটা।', 'নিজের সাথে সেই বন্ধু হও যা তুমি চেয়েছিলে।',
    'তুমি এই পৃথিবীতে প্রয়োজনীয়।', 'এই কঠিন সময় কেটে যাবে।',
    'প্রতিটি সকাল নতুন সুযোগ।', 'তোমার যাত্রা অনন্য।',
    'পড়ে যাওয়া হার নয় — না উঠাই হার।',
    'তুমি টিকে আছ — এটাই সাহস।', 'নিজেকে বিশ্বাস করো।',
    'অন্যের মতামত তোমার মূল্য নির্ধারণ করে না।',
  ],
  kannada: [
    'ಒಂದು ಕೆಟ್ಟ ರಾತ್ರಿ ಇಡೀ ಜೀವನ ಅಲ್ಲ। 💙', 'ಪರಿಸ್ಥಿತಿ ನೀನು ಭಾವಿಸುವಷ್ಟು ಕೆಟ್ಟದಲ್ಲ।',
    'ಇಂದಿನ ನೋವು ನಾಳಿನ ಶಕ್ತಿ।', 'ನಿಲ್ಲಬೇಡ। ದಣಿ, ಆದರೆ ನಿಲ್ಲಬೇಡ।',
    'ಪ್ರತಿ ರಾತ್ರಿಯ ನಂತರ ಬೆಳಗಾಗುತ್ತದೆ।', 'ನೀನು ಒಂಟಿ ಅಲ್ಲ।',
    'ಧೈರ್ಯ ಭಯದಲ್ಲೂ ಮುಂದೆ ಹೋಗುವುದು।', 'ಉಸಿರಾಡು। ಉಳಿದದ್ದೆಲ್ಲ ನಂತರ।',
    'ಸಣ್ಣ ಗೆಲುವೂ ಗೆಲುವೇ।', 'ನೀನು ಸಾಕು। ಮನುಷ್ಯನಾಗಿರುವುದೇ ಸಾಕು।',
    'ವಿಶ್ರಾಂತಿ ದೌರ್ಬಲ್ಯ ಅಲ್ಲ।', 'ನಿನ್ನ ತೊಂದರೆಗಳು ನಿನ್ನನ್ನು ನಿರ್ಧರಿಸುವುದಿಲ್ಲ।',
    'ಇಂದು ಒಂದು ದಿನ ಮಾತ್ರ ಜೀವಿಸು।', 'ನಿನ್ನ ಭಾವನೆಗಳು ಮಾನ್ಯ।',
    'ನೀನು ಯೋಚಿಸುವುದಕ್ಕಿಂತ ಹೆಚ್ಚು ಬಲಿಷ್ಠ।',
    'ಕೆಟ್ಟ ದಿನ, ಕೆಟ್ಟ ಜೀವನ ಅಲ್ಲ।', 'ನಿನ್ನ ಶ್ರಮ ಫಲ ನೀಡುತ್ತದೆ।',
    'ಒಂದು ಹೆಜ್ಜೆ। ಕೇವಲ ಒಂದು।', 'ಈ ಕಷ್ಟ ಕಾಲ ಕಳೆದುಹೋಗುತ್ತದೆ।',
    'ಪ್ರತಿ ಬೆಳಗ್ಗೆ ಹೊಸ ಅವಕಾಶ।', 'ನಿನ್ನನ್ನು ನಂಬು।',
    'ಇತರರ ಅಭಿಪ್ರಾಯ ನಿನ್ನ ಮೌಲ್ಯ ನಿರ್ಧರಿಸುವುದಿಲ್ಲ।',
  ],
  tamil: [
    'ஒரு கெட்ட இரவு முழு வாழ்க்கை அல்ல। 💙', 'நீ நினைப்பதை விட சூழல் மோசமாக இல்லை।',
    'இன்றைய வலி நாளைய வலிமை।', 'நிறுத்தாதே. களைப்பாடு, ஆனால் நிறுத்தாதே।',
    'ஒவ்வொரு இரவிற்கும் பின் விடியல் வரும்।', 'நீ தனியாக இல்லை।',
    'தைரியம் பயத்திலும் முன்னேறுவது।', 'மூச்சை விடு. மற்றவை பின்னர்।',
    'சின்னதாக வென்றாலும் வெற்றியே।', 'நீ போதுமானவன். மனிதனாக இருப்பது போதும்।',
    'ஓய்வு பலவீனம் அல்ல।', 'உன் போராட்டங்கள் உன்னை வரையறுக்கவில்லை।',
    'இன்று ஒரு நாள் மட்டும் வாழ।', 'உன் உணர்வுகள் செல்லுபடியாகும்।',
    'நீ நினைப்பதை விட வலிமையானவன்।', 'கெட்ட நாள், கெட்ட வாழ்க்கை அல்ல।',
    'உன் உழைப்பு பலன் தரும்।', 'ஒரு அடி. ஒரே ஒரு அடி மட்டும்।',
    'இந்த கஷ்ட காலம் கடந்து போகும்।', 'ஒவ்வொரு காலையும் புதிய வாய்ப்பு।',
    'உன்னை நம்பு।', 'மற்றவர் கருத்து உன் மதிப்பை தீர்மானிக்காது।',
    'விழுவது தோல்வி அல்ல — எழாமலிருப்பது தோல்வி।',
  ],
  marathi: [
    'एक वाईट रात संपूर्ण आयुष्य नाही। 💙', 'परिस्थिती तू जितकी वाईट वाटतेस तितकी नाही।',
    'आजचे दुखणे उद्याची ताकद आहे।', 'थांबू नकोस. थकून जा, पण थांबू नकोस।',
    'प्रत्येक रात्रीनंतर सकाळ येते।', 'तू एकटा नाहीस।',
    'धाडस म्हणजे भीतीतही पुढे जाणे।', 'श्वास घे. बाकी सगळे नंतर।',
    'छोटी जिंकणे देखील जिंकणे आहे।', 'तू पुरेसा आहेस।',
    'विश्रांती घेणे कमकुवतपणा नाही।', 'तुझ्या संघर्षांनी तू परिभाषित होत नाहीस।',
    'आज फक्त एक दिवस जग।', 'तुझ्या भावना valid आहेत।',
    'तू जितका विचार करतोस त्यापेक्षा अधिक मजबूत आहेस।',
    'वाईट दिवस आहे, वाईट आयुष्य नाही।', 'तुझी मेहनत रंग आणेल।',
    'एक पाऊल। फक्त एक।', 'हा कठीण काळ निघून जाईल।',
    'प्रत्येक सकाळ नवी संधी आहे।', 'स्वतःवर विश्वास ठेव।',
    'इतरांचे मत तुझी किंमत ठरवत नाही।', 'पडणे हार नाही — न उठणे हार आहे।',
    'तू हे हाताळू शकतोस।', 'तुझी गरज आहे या जगात।',
  ],
  telugu: [
    'ఒక చెడ్డ రాత్రి మొత్తం జీవితం కాదు। 💙', 'పరిస్థితి నువ్వు అనుకున్నంత చెడ్డగా లేదు।',
    'నేటి నొప్పి రేపటి బలం।', 'ఆగకు. అలసిపో, కానీ ఆగకు।',
    'ప్రతి రాత్రి తర్వాత తెల్లవారు వస్తుంది।', 'నువ్వు ఒంటరిగా లేవు।',
    'ధైర్యం భయంతోనూ ముందుకు వెళ్ళడం।', 'శ్వాసించు. మిగతావన్నీ తర్వాత।',
    'చిన్న విజయం కూడా విజయమే।', 'నువ్వు సరిపోతావు। మనిషిగా ఉండడం సరిపోతుంది।',
    'విశ్రాంతి బలహీనత కాదు।', 'నీ పోరాటాలు నిన్ను నిర్వచించవు।',
    'ఈరోజు ఒక రోజు మాత్రమే జీవించు।', 'నీ భావాలు సరైనవే।',
    'నువ్వు అనుకున్నదానికంటే బలంగా ఉన్నావు।',
    'చెడ్డ రోజు, చెడ్డ జీవితం కాదు।', 'నీ కృషి ఫలిస్తుంది।',
    'ఒక అడుగు. ఒక్క అడుగు మాత్రమే।', 'ఈ కష్ట కాలం గడిచిపోతుంది।',
    'ప్రతి తెల్లవారు కొత్త అవకాశం।', 'నీపై నమ్మకం ఉంచు।',
    'ఇతరుల అభిప్రాయం నీ విలువను నిర్ణయించదు।',
    'పడిపోవడం ఓటమి కాదు — లేవకపోవడం ఓటమి।',
  ],
};

// ─── ZenQuotes proxy (free, no CORS issues via our helper) ────────────────────
let lastApiCall = 0;
const API_COOLDOWN = 3000;

async function fetchZenQuote(): Promise<string | null> {
  if (Date.now() - lastApiCall < API_COOLDOWN) return null;
  lastApiCall = Date.now();
  try {
    // ZenQuotes via a CORS-safe proxy approach
    const res = await fetch('https://zenquotes.io/api/random', {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error('bad status');
    const data = await res.json() as Array<{ q: string; a: string }>;
    if (!data?.[0]?.q) return null;
    return `"${data[0].q}" — ${data[0].a}`;
  } catch {
    // fallback to quotable.io
    try {
      const r2 = await fetch(
        'https://api.quotable.io/random?tags=inspirational|motivation|life&maxLength=130',
        { signal: AbortSignal.timeout(4000) }
      );
      if (!r2.ok) return null;
      const d2 = await r2.json() as { content: string; author: string };
      return d2.content ? `"${d2.content}" — ${d2.author}` : null;
    } catch {
      return null;
    }
  }
}

// ─── Card gradients per mood ──────────────────────────────────────────────────
const MOOD_GRADIENTS: [string, string][] = [
  ['#0D1B3E', '#1A0A2E'],
  ['#0A2018', '#0D2840'],
  ['#1A0D2E', '#0A1830'],
  ['#1E0A18', '#2A0E30'],
  ['#0A1E2A', '#102035'],
];

// ─── Component ────────────────────────────────────────────────────────────────
interface Props { language: string; moodScore: number; }

export default function MotivationCard({ language, moodScore }: Props) {
  const { t } = useTranslation();
  const pool = QUOTES[language] ?? QUOTES['hinglish'];

  const [quote, setQuote]       = useState(() => pool[Math.floor(Math.random() * pool.length)]);
  const [author, setAuthor]     = useState('');
  const [loading, setLoading]   = useState(false);
  const [gradIdx, setGradIdx]   = useState(0);

  // Animations
  const fadeAnim    = useRef(new Animated.Value(1)).current;
  const scaleAnim   = useRef(new Animated.Value(1)).current;
  const spinAnim    = useRef(new Animated.Value(0)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  // Shimmer loop while loading
  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(shimmerAnim, { toValue: 0, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    } else {
      shimmerAnim.setValue(0);
    }
  }, [loading]);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });

  const animateSwap = useCallback((newQuote: string, newAuthor = '') => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.94, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setQuote(newQuote);
      setAuthor(newAuthor);
      setGradIdx(i => (i + 1) % MOOD_GRADIENTS.length);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const shuffle = async () => {
    if (loading) return;
    setLoading(true);

    // Spin the button
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1, duration: 600,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    // Try live API for English/Hinglish; use local bank for other languages
    const useLive = language === 'english' || language === 'hinglish';
    if (useLive) {
      const apiQuote = await fetchZenQuote();
      if (apiQuote) {
        setLoading(false);
        animateSwap(apiQuote, '');
        return;
      }
    }

    // Local pool fallback
    const filtered = pool.filter(q => q !== quote);
    const next = filtered[Math.floor(Math.random() * filtered.length)] ?? pool[0];
    setLoading(false);
    animateSwap(next, '');
  };

  const gradient = MOOD_GRADIENTS[gradIdx];

  return (
    <View style={st.card}>
      <Animated.View style={{ transform: [{ scale: scaleAnim }], borderRadius: RADIUS.xl, overflow: 'hidden' }}>
        <LinearGradient colors={gradient} style={st.grad}>

          {/* ── Header row ─────────────────────────────────────────────── */}
          <View style={st.topRow}>
            <View style={st.labelRow}>
              <Ionicons name="sparkles" size={12} color={COLORS.primary} />
              <Text style={st.label}>{t('motivation.today_thought')}</Text>
            </View>
            <View style={st.sourceTag}>
              <Text style={st.sourceText}>ZenQuotes</Text>
            </View>
          </View>

          {/* ── Quote text ─────────────────────────────────────────────── */}
          <Animated.View style={{ opacity: loading ? shimmerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] }) : fadeAnim }}>
            <Text style={st.quote}>{quote}</Text>
            {author ? <Text style={st.author}>{author}</Text> : null}
          </Animated.View>

          {/* ── Divider ────────────────────────────────────────────────── */}
          <View style={st.divider} />

          {/* ── Shuffle button ─────────────────────────────────────────── */}
          <TouchableOpacity style={st.shuffleBtn} onPress={shuffle} activeOpacity={0.75} disabled={loading}>
            <Animated.View style={{ transform: [{ rotate: spin }] }}>
              {loading
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Ionicons name="shuffle" size={16} color={COLORS.primary} />
              }
            </Animated.View>
            <Text style={st.shuffleText}>{t('motivation.another_one')}</Text>
          </TouchableOpacity>

        </LinearGradient>
      </Animated.View>
    </View>
  );
}

// ─── TaskCard ──────────────────────────────────────────────────────────────────
const QUICK_TASKS: Record<string, { text: string; xp: number; emoji: string }[]> = {
  hinglish: [
    { text: 'Ek glass paani pi abhi', xp: 10, emoji: '💧' },
    { text: '5 baar gehri saans le', xp: 15, emoji: '🌬️' },
    { text: '10 min walk — bina phone', xp: 30, emoji: '🚶' },
  ],
  english: [
    { text: 'Drink a glass of water now', xp: 10, emoji: '💧' },
    { text: 'Take 5 deep breaths', xp: 15, emoji: '🌬️' },
    { text: '10 min walk — no phone', xp: 30, emoji: '🚶' },
  ],
  hindi: [
    { text: 'अभी एक गिलास पानी पियो', xp: 10, emoji: '💧' },
    { text: '5 बार गहरी सांस लो', xp: 15, emoji: '🌬️' },
    { text: '10 मिनट टहलो — बिना फोन', xp: 30, emoji: '🚶' },
  ],
  bengali: [
    { text: 'এখনই এক গ্লাস জল পান করো', xp: 10, emoji: '💧' },
    { text: '৫ বার গভীর শ্বাস নাও', xp: 15, emoji: '🌬️' },
    { text: '১০ মিনিট হাঁটো — ফোন ছাড়া', xp: 30, emoji: '🚶' },
  ],
  kannada: [
    { text: 'ಈಗ ಒಂದು ಲೋಟ ನೀರು ಕುಡಿ', xp: 10, emoji: '💧' },
    { text: '5 ಬಾರಿ ಆಳವಾಗಿ ಉಸಿರಾಡು', xp: 15, emoji: '🌬️' },
    { text: '10 ನಿಮಿಷ ನಡೆ — ಫೋನ್ ಇಲ್ಲದೆ', xp: 30, emoji: '🚶' },
  ],
  tamil: [
    { text: 'இப்போது ஒரு கிளாஸ் தண்ணீர் குடி', xp: 10, emoji: '💧' },
    { text: '5 முறை ஆழமாக மூச்சு விடு', xp: 15, emoji: '🌬️' },
    { text: '10 நிமிடம் நட — போன் இல்லாமல்', xp: 30, emoji: '🚶' },
  ],
  marathi: [
    { text: 'आत्ता एक ग्लास पाणी पी', xp: 10, emoji: '💧' },
    { text: '5 वेळा खोल श्वास घे', xp: 15, emoji: '🌬️' },
    { text: '10 मिनिट चाल — फोनशिवाय', xp: 30, emoji: '🚶' },
  ],
  telugu: [
    { text: 'ఇప్పుడే ఒక గ్లాసు నీళ్ళు తాగు', xp: 10, emoji: '💧' },
    { text: '5 సార్లు లోతుగా శ్వాసించు', xp: 15, emoji: '🌬️' },
    { text: '10 నిమిషాలు నడు — ఫోన్ లేకుండా', xp: 30, emoji: '🚶' },
  ],
};

export function TaskCard({ moodScore, language }: { moodScore: number; language: string }) {
  const { t } = useTranslation();
  const tasks = QUICK_TASKS[language] ?? QUICK_TASKS['hinglish'];
  const task = moodScore < 4 ? tasks[0] : moodScore < 7 ? tasks[1] : tasks[2];
  const [done, setDone] = useState(false);
  return (
    <View style={st.taskCard}>
      <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={st.taskGrad}>
        <Text style={st.taskLabel}>{t('motivation.today_task')}</Text>
        <View style={st.taskRow}>
          <Text style={{ fontSize: 22 }}>{task.emoji}</Text>
          <Text style={st.taskText}>{task.text}</Text>
        </View>
        <View style={st.taskFooter}>
          <Text style={st.taskXP}>+{task.xp} XP</Text>
          <TouchableOpacity
            style={[st.doneBtn, done && st.doneBtnActive]}
            onPress={() => setDone(true)} disabled={done} activeOpacity={0.8}
          >
            <Ionicons name={done ? 'checkmark' : 'flag'} size={13} color={done ? '#fff' : COLORS.primary} />
            <Text style={[st.doneBtnText, done && { color: '#fff' }]}>
              {done ? t('motivation.done') : t('motivation.mark_done')}
            </Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
}

const st = StyleSheet.create({
  card: { marginBottom: 16 },
  grad: { padding: 20, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(61,126,255,0.2)' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: COLORS.primary, textTransform: 'uppercase' },
  sourceTag: { backgroundColor: COLORS.primaryGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  sourceText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  quote: { fontSize: 17, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 26, fontStyle: 'italic', marginBottom: 8 },
  author: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginBottom: 4 },
  divider: { height: 1, backgroundColor: 'rgba(61,126,255,0.15)', marginVertical: 14 },
  shuffleBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start' },
  shuffleText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },

  taskCard: { marginBottom: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  taskGrad: { padding: 18, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: COLORS.border },
  taskLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: COLORS.textMuted, textTransform: 'uppercase', marginBottom: 12 },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  taskText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.textPrimary },
  taskFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  taskXP: { fontSize: 13, fontWeight: '700', color: COLORS.warning },
  doneBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1.5, borderColor: COLORS.primary },
  doneBtnActive: { backgroundColor: COLORS.success, borderColor: COLORS.success },
  doneBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
});