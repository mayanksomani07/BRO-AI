import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADIUS } from '../constants/theme';
import { useTranslation } from 'react-i18next';

// ─── Large offline quote bank — all 8 languages ────────────────────────────────
const OFFLINE_QUOTES: Record<string, string[]> = {
  hinglish: [
    'Ek buri raat poori zindagi nahi hoti. 💙',
    'Tu jitna sochta hai utna bura nahi hai situation.',
    'Aaj ka dard kal ki strength hai, bhai.',
    'Ruk mat. Thak ja, par ruk mat.',
    'Tu is cheez se bada hai jo tujhe chhota feel kara rahi hai.',
    'Mushkilon mein bhi ek cheez dhundh — woh hoti hai.',
    'Har raat ke baad subah aati hai. Teri bhi aayegi.',
    'Galti karna insaan hona hai. Tu theek hai.',
    'Ek kadam aage badh — bas itna kaafi hai aaj.',
    'Tu akela nahi hai, chahe aisa lage.',
    'Himmat woh nahi jo darta nahi, jo darte hue bhi chalta hai.',
    'Zindagi ka ek chapter khatam hua — story abhi baaki hai.',
    'Chhoti cheezein count karti hain. Aaj ek chhoti cheez karo.',
    'Teri value kisi aur ke opinion pe depend nahi karti.',
    'Jo hua woh change nahi ho sakta. Jo hoga woh tu shape kar sakta hai.',
    'Breathe. Just breathe. Baaki sab baad mein.',
    'Tujhe theek hone ke liye perfect nahi hona.',
    'Teri struggles tujhe define nahi karti — tera response karta hai.',
    'Jo log abhi successful hain woh bhi fail hue hain. Tera number aayega.',
    'Sirf ek din jee le aaj. Kal ki kal dekhenge.',
    'Chhoti si jeet bhi jeet hoti hai. Celebrate kar.',
    'Tu kab se khud se itna bura behaviour kar raha hai? Stop it.',
    'Sab theek hoga — ye sach nahi pata, par ye try karna chahta hai.',
    'Ek insaan hona enough hai. Tu enough hai.',
  ],
  english: [
    'One bad night is not your whole life. 💙',
    'Things are not as bad as they seem right now.',
    "Today's pain is tomorrow's strength.",
    "Don't stop. Rest, but don't stop.",
    "You're bigger than what's making you feel small.",
    'Even in hard times, something is worth noticing.',
    'Every morning is a fresh start. Yours is coming.',
    'Making mistakes means you are human. You are okay.',
    'One step forward — that is enough for today.',
    'You are not alone, even when it feels that way.',
    'Courage is not fearlessness — it is moving forward despite fear.',
    'One chapter ended. The story is not over.',
    'Small things count. Do one small thing today.',
    "Your worth doesn't depend on anyone else's opinion.",
    'You have survived every hard day so far. That is 100%.',
    'Breathe. Just breathe. Everything else can wait.',
    'You do not have to be perfect to heal.',
    'Your struggles do not define you — your response does.',
    'The strongest people are not those who never break, but those who rebuild.',
    'Just live today. Tomorrow can wait.',
    'Even a small win is still a win. Celebrate it.',
    'You have been too hard on yourself for too long. Stop.',
    'Being human is enough. You are enough.',
    'Rest is not failure. Rest is part of the plan.',
    'You deserve kindness, especially from yourself.',
  ],
  hindi: [
    'एक बुरी रात पूरी ज़िंदगी नहीं होती। 💙',
    'तू उतना बुरा नहीं है जितना सोच रहा है।',
    'आज का दर्द कल की ताकत है।',
    'रुक मत। थक जा, पर रुक मत।',
    'हर रात के बाद सुबह आती है।',
    'तू अकेला नहीं है, चाहे ऐसा लगे।',
    'हिम्मत वो नहीं जो डरता नहीं, जो डरते हुए भी चलता है।',
    'छोटी चीज़ें मायने रखती हैं। आज एक छोटी चीज़ करो।',
    'सांस लो। बस सांस लो। बाकी सब बाद में।',
    'तुम्हें ठीक होने के लिए परफेक्ट नहीं बनना।',
    'तुम अपने संघर्षों से परिभाषित नहीं होते — तुम्हारा जवाब तुम्हें परिभाषित करता है।',
    'आराम करना कमजोरी नहीं है — यह योजना का हिस्सा है।',
    'तुम खुद से दयालुता के पात्र हो।',
    'जो हुआ वो नहीं बदल सकता। जो आगे होगा, वो तुम तय कर सकते हो।',
    'आज सिर्फ एक दिन जियो। कल की कल देखेंगे।',
    'छोटी जीत भी जीत होती है। उसे celebrate करो।',
    'तुम enough हो। बस हो। इंसान होना enough है।',
  ],
  bengali: [
    'একটা খারাপ রাত পুরো জীবন নয়। 💙',
    'পরিস্থিতি তুমি যতটা ভাবছ ততটা খারাপ নয়।',
    'আজকের কষ্ট আগামীকালের শক্তি।',
    'থামো না। ক্লান্ত হও, কিন্তু থামো না।',
    'প্রতিটি রাতের পরে ভোর আসে। তোমারও আসবে।',
    'তুমি একা নও, যদিও মনে হচ্ছে।',
    'সাহস মানে ভয় না পাওয়া নয় — ভয় পেয়েও এগিয়ে যাওয়া।',
    'একটু একটু করে এগিয়ে যাও। আজকের জন্য এটুকুই যথেষ্ট।',
    'শ্বাস নাও। শুধু শ্বাস নাও। বাকি সব পরে।',
    'ছোট বিজয়ও বিজয়। তা উদযাপন করো।',
    'তুমি যথেষ্ট। শুধু মানুষ হওয়াটাই যথেষ্ট।',
    'বিশ্রাম নেওয়া দুর্বলতা নয় — এটি পরিকল্পনার অংশ।',
    'নিজের প্রতি সদয় হওয়ার অধিকার তোমার আছে।',
    'আজ শুধু একটা দিন বাঁচো। কাল পরে দেখা যাবে।',
  ],
  kannada: [
    'ಒಂದು ಕೆಟ್ಟ ರಾತ್ರಿ ಇಡೀ ಜೀವನ ಅಲ್ಲ। 💙',
    'ಪರಿಸ್ಥಿತಿ ನೀನು ಭಾವಿಸುವಷ್ಟು ಕೆಟ್ಟದಲ್ಲ।',
    'ಇಂದಿನ ನೋವು ನಾಳಿನ ಶಕ್ತಿ।',
    'ನಿಲ್ಲಬೇಡ। ದಣಿ, ಆದರೆ ನಿಲ್ಲಬೇಡ।',
    'ಪ್ರತಿ ರಾತ್ರಿಯ ನಂತರ ಬೆಳಗಾಗುತ್ತದೆ। ನಿನ್ನದೂ ಬರುತ್ತದೆ।',
    'ನೀನು ಒಂಟಿ ಅಲ್ಲ, ಹಾಗೆ ಅನಿಸಿದರೂ ಸರಿ।',
    'ಧೈರ್ಯ ಅಂದರೆ ಭಯವಿಲ್ಲದಿರುವುದಲ್ಲ — ಭಯದಲ್ಲೂ ಮುಂದೆ ಹೋಗುವುದು।',
    'ಉಸಿರಾಡು। ಉಳಿದದ್ದೆಲ್ಲ ನಂತರ।',
    'ಸಣ್ಣ ಗೆಲುವೂ ಗೆಲುವೇ। ಅದನ್ನು ಆಚರಿಸು।',
    'ನೀನು ಸಾಕು। ಮನುಷ್ಯನಾಗಿರುವುದೇ ಸಾಕು।',
    'ವಿಶ್ರಾಂತಿ ದೌರ್ಬಲ್ಯ ಅಲ್ಲ — ಅದು ಯೋಜನೆಯ ಭಾಗ।',
    'ನಿನ್ನ ತೊಂದರೆಗಳು ನಿನ್ನನ್ನು ವ್ಯಾಖ್ಯಾನಿಸುವುದಿಲ್ಲ — ನಿನ್ನ ಪ್ರತಿಕ್ರಿಯೆ ಮಾಡುತ್ತದೆ।',
  ],
  tamil: [
    'ஒரு கெட்ட இரவு முழு வாழ்க்கை அல்ல। 💙',
    'நீ நினைப்பதை விட சூழல் மோசமாக இல்லை।',
    'இன்றைய வலி நாளைய வலிமை।',
    'நிறுத்தாதே. களைப்பாடு, ஆனால் நிறுத்தாதே।',
    'ஒவ்வொரு இரவிற்கும் பின் விடியல் வரும். உனக்கும் வரும்।',
    'நீ தனியாக இல்லை, அப்படி தோன்றினாலும்.',
    'தைரியம் என்பது பயமற்றிருப்பது அல்ல — பயத்திலும் முன்னேறுவது।',
    'மூச்சை விடு. மற்றவை பின்னர் பார்க்கலாம்।',
    'சின்னதாக வென்றாலும் வெற்றியே. கொண்டாடு।',
    'நீ போதுமானவன். மனிதனாக இருப்பது போதும்.',
    'ஓய்வு பலவீனம் அல்ல — அது திட்டத்தின் ஒரு பகுதி।',
    'இன்று ஒரு நாள் மட்டும் வாழ். நாளை பார்க்கலாம்.',
  ],
  marathi: [
    'एक वाईट रात संपूर्ण आयुष्य नाही। 💙',
    'परिस्थिती तू जितकी वाईट वाटतेस तितकी नाही।',
    'आजचे दुखणे उद्याची ताकद आहे।',
    'थांबू नकोस. थकून जा, पण थांबू नकोस।',
    'प्रत्येक रात्रीनंतर सकाळ येते. तुझीही येईल।',
    'तू एकटा नाहीस, जरी असे वाटले तरी।',
    'धाडस म्हणजे भीती नसणे नाही — भीतीतही पुढे जाणे।',
    'श्वास घे. बाकी सगळे नंतर।',
    'छोटी जिंकणे देखील जिंकणे आहे. साजरी कर।',
    'तू पुरेसा आहेस. माणूस असणे पुरेसे आहे।',
    'विश्रांती घेणे कमकुवतपणा नाही — ती योजनेचा भाग आहे।',
    'आज फक्त एक दिवस जग. उद्याचे उद्या बघू।',
    'तुझ्या संघर्षांनी तू परिभाषित होत नाहीस — तुझ्या प्रतिसादाने होतो।',
  ],
  telugu: [
    'ఒక చెడ్డ రాత్రి మొత్తం జీవితం కాదు। 💙',
    'పరిస్థితి నువ్వు అనుకున్నంత చెడ్డగా లేదు।',
    'నేటి నొప్పి రేపటి బలం।',
    'ఆగకు. అలసిపో, కానీ ఆగకు।',
    'ప్రతి రాత్రి తర్వాత తెల్లవారు వస్తుంది. నీకూ వస్తుంది।',
    'నువ్వు ఒంటరిగా లేవు, అలా అనిపించినా కూడా।',
    'ధైర్యం అంటే భయపడకపోవడం కాదు — భయంతోనూ ముందుకు వెళ్ళడం।',
    'శ్వాసించు. మిగతావన్నీ తర్వాత।',
    'చిన్న విజయం కూడా విజయమే. దాన్ని జరుపుకో।',
    'నువ్వు సరిపోతావు. మనిషిగా ఉండడం సరిపోతుంది।',
    'విశ్రాంతి బలహీనత కాదు — అది ప్రణాళికలో భాగం।',
    'ఈరోజు ఒక రోజు మాత్రమే జీవించు. రేపటి విషయం రేపు చూద్దాం।',
  ],
};

// ─── API quota management ──────────────────────────────────────────────────────
let lastApiCall = 0;
const API_COOLDOWN_MS = 2000;

async function fetchQuoteFromApi(): Promise<string | null> {
  const now = Date.now();
  if (now - lastApiCall < API_COOLDOWN_MS) return null;
  lastApiCall = now;

  try {
    const res = await fetch(
      'https://api.quotable.io/random?tags=inspirational|motivation|success|life&maxLength=120',
      { signal: AbortSignal.timeout(4000) }
    );
    if (!res.ok) return null;
    const data = await res.json() as { content: string; author: string };
    if (!data.content) return null;
    return `"${data.content}" — ${data.author}`;
  } catch {
    return null;
  }
}

// ─── Component ─────────────────────────────────────────────────────────────────
interface Props { language: string; moodScore: number; }

export default function MotivationCard({ language, moodScore }: Props) {
  const { t } = useTranslation();
  const pool = OFFLINE_QUOTES[language] ?? OFFLINE_QUOTES['hinglish'];
  const [quote, setQuote] = useState(() => pool[Math.floor(Math.random() * pool.length)]);
  const [loading, setLoading] = useState(false);
  const opacity = useRef(new Animated.Value(1)).current;

  const animateSwap = (newQuote: string) => {
    Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
      setQuote(newQuote);
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    });
  };

  const nextQuote = async () => {
    if (loading) return;
    setLoading(true);

    // Try the API first (offline pool as fallback for all languages)
    const apiQuote = await fetchQuoteFromApi();

    if (apiQuote) {
      animateSwap(apiQuote);
    } else {
      // Use offline pool — pick a different quote than current
      const filtered = pool.filter(q => q !== quote);
      const next = filtered[Math.floor(Math.random() * filtered.length)] ?? pool[0];
      animateSwap(next);
    }
    setLoading(false);
  };

  return (
    <View style={st.card}>
      <LinearGradient colors={['#0D1B3E', '#0A1228']} style={st.grad}>
        <View style={st.topRow}>
          <Text style={st.label}>
            {t('motivation.today_thought')}
          </Text>
          <View style={[st.apiBadge, { opacity: loading ? 1 : 0.4 }]}>
            <Ionicons name="sparkles" size={10} color={COLORS.primary} />
            <Text style={st.apiText}>Quotable</Text>
          </View>
        </View>
        <Animated.Text style={[st.quote, { opacity }]}>
          {quote}
        </Animated.Text>
        <TouchableOpacity style={st.nextBtn} onPress={nextQuote} activeOpacity={0.7} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color={COLORS.textMuted} style={{ marginRight: 4 }} />
            : <Ionicons name="refresh" size={13} color={COLORS.textMuted} />
          }
          <Text style={st.nextText}>
            {t('motivation.another_one')}
          </Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
}

// ─── TaskCard (used in HomeScreen) ────────────────────────────────────────────
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
};

export function TaskCard({ moodScore, language }: { moodScore: number; language: string }) {
  const { t } = useTranslation();
  const tasks = QUICK_TASKS[language] ?? QUICK_TASKS['hinglish'];
  const task = moodScore < 4 ? tasks[0] : moodScore < 7 ? tasks[1] : tasks[2];
  const [done, setDone] = useState(false);
  return (
    <View style={st.taskCard}>
      <LinearGradient colors={[COLORS.card, COLORS.surfaceElevated]} style={st.taskGrad}>
        <Text style={st.taskLabel}>
          {t('motivation.today_task')}
        </Text>
        <View style={st.taskRow}>
          <Text style={{ fontSize: 22 }}>{task.emoji}</Text>
          <Text style={st.taskText}>{task.text}</Text>
        </View>
        <View style={st.taskFooter}>
          <Text style={st.taskXP}>+{task.xp} XP</Text>
          <TouchableOpacity style={[st.doneBtn, done && st.doneBtnActive]} onPress={() => setDone(true)} disabled={done} activeOpacity={0.8}>
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
  card: { marginBottom: 16, borderRadius: RADIUS.xl, overflow: 'hidden' },
  grad: { padding: 20, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: 'rgba(61,126,255,0.2)' },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5, color: COLORS.primary + '80', textTransform: 'uppercase' },
  apiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.primaryGlow, paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  apiText: { fontSize: 9, fontWeight: '700', color: COLORS.primary },
  quote: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 25, fontStyle: 'italic', marginBottom: 14 },
  nextBtn: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nextText: { fontSize: 12, color: COLORS.textMuted },

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
