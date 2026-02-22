import type { MoodType } from './mood-analyzer';
import type { Language } from './language-context';

export interface ContextualMessage {
  title: string;
  message: string;
  context: string;
}

const HINGLISH_CONTEXTUAL: Record<string, ContextualMessage[]> = {
  sad: [
    { title: "Bhai, tu akela nahi hai", message: "Zindagi mein ups and downs aate hain, lekin tu strong hai. Ek deep breath le aur yaad rakh — ye waqt bhi guzar jaayega.", context: "sadness" },
    { title: "Ruk mat, chal te reh", message: "Haar maanna asaan hai, lekin tu fighter hai bhai. Choti choti cheezein bhi matter karti hain — ek cup chai pi aur relax kar.", context: "sadness" },
    { title: "Tera time aayega", message: "Abhi mushkil lag raha hai, lekin har raat ke baad subah aati hai. Tu deserve karta hai khushi, aur wo milegi.", context: "sadness" },
  ],
  stressed: [
    { title: "Bhai, phone rakh aur gehri saans le", message: "Stress lena normal hai, lekin apne aap ko mat kha. 5 minute break le — walk kar ya gaana sun. Tu handle kar lega.", context: "stress" },
    { title: "Ek kaam ek waqt", message: "Sab kuch ek saath nahi karna hai bhai. Priority set kar, pehle important cheez kar. Baaki baad mein hoga.", context: "overwhelm" },
    { title: "Tension mat le yaar", message: "Soch ke dekh — 1 saal baad ye baat yaad bhi nahi rahegi. Abhi ke liye chill kar aur focus kar.", context: "stress" },
  ],
  anxious: [
    { title: "Sab theek hoga bhai", message: "Anxiety bolti hai ki sab kharaab hoga, lekin wo jhooth bolti hai. Tu safe hai, tu strong hai. Ek baar 4-7-8 breathing try kar.", context: "anxiety" },
    { title: "Darr ke aage jeet hai", message: "Bhai, darr lagna normal hai. Lekin tera past batata hai ki tu mushkilon se nikla hai. Is baar bhi niklega.", context: "anxiety" },
    { title: "Abhi is moment mein reh", message: "Future ki chinta mat kar yaar. Abhi tu safe hai, is moment ko feel kar. Deep breath — inhale 4 sec, hold 4 sec, exhale 4 sec.", context: "anxiety" },
  ],
  neutral: [
    { title: "Aaj kuch naya try kar", message: "Bhai, routine se break le. Koi nayi cheez seekh, ya kisi purane dost ko call kar. Life mein thoda adventure chahiye!", context: "routine" },
    { title: "Small wins matter karte hain", message: "Aaj tune check-in kiya — ye bhi ek win hai. Apne aap ko credit de, chhoti cheezein bhi important hain.", context: "progress" },
  ],
  calm: [
    { title: "Nice! Ye peace enjoy kar", message: "Bhai, calm feel karna ek blessing hai. Is moment ko capture kar apne dil mein. Tu sahi track pe hai.", context: "peace" },
    { title: "Shaant mann, strong mann", message: "Jab mann shaant hota hai, tab best decisions aate hain. Is energy ko use kar kuch creative karne mein.", context: "peace" },
  ],
  happy: [
    { title: "Yaar, ye energy zabardast hai!", message: "Happy feel kar raha hai? Awesome! Is energy ko spread kar — kisi ko compliment de ya apni favourite cheez kar.", context: "happiness" },
    { title: "Khush reh, khush rakh", message: "Bhai, teri khushi contagious hai. Ye moment yaad rakh jab kabhi low feel ho — tu deserve karta hai ye happiness.", context: "happiness" },
  ],
  lateNight: [
    { title: "Bhai, so ja yaar", message: "Raat ke 2 baje phone pe kya kar raha hai? Neend health ke liye zaroori hai. Screen band kar aur rest kar.", context: "lateNight" },
    { title: "Kal ki subah nayi hogi", message: "Late night overthinking se kuch nahi hoga bhai. Kal fresh mind se sochna. Abhi apne aap ko rest de.", context: "lateNight" },
  ],
  earlyMorning: [
    { title: "Good morning bhai!", message: "Subah subah check-in kar raha hai — great habit! Aaj ka din tera hai. Ek positive intention set kar aur shuruaat kar.", context: "morning" },
    { title: "Nayi subah, nayi energy", message: "Bhai, har subah ek fresh start hai. Kal jo bhi hua, aaj naya hai. Apne liye kuch achha kar aaj.", context: "morning" },
  ],
  frequentCheckin: [
    { title: "Bhai, tu aware hai — ye powerful hai", message: "Bar bar check-in karna dikhata hai ki tu apni feelings ko samajhna chahta hai. Ye self-awareness ka sign hai, proud hona chahiye.", context: "awareness" },
    { title: "Consistent hona strength hai", message: "Tu regularly apne mood track kar raha hai — ye discipline hai. Is data se tujhe patterns samajh aayenge. Keep going!", context: "consistency" },
  ],
};

const HINDI_CONTEXTUAL: Record<string, ContextualMessage[]> = {
  sad: [
    { title: "आप अकेले नहीं हैं", message: "जिंदगी में उतार-चढ़ाव आते हैं, लेकिन आप मजबूत हैं। एक गहरी सांस लें — ये वक्त भी गुजर जाएगा।", context: "sadness" },
    { title: "रुकें नहीं, चलते रहें", message: "हार मानना आसान है, लेकिन आप लड़ाकू हैं। छोटी-छोटी चीजें भी मायने रखती हैं।", context: "sadness" },
  ],
  stressed: [
    { title: "फोन रखें और गहरी सांस लें", message: "तनाव लेना सामान्य है, लेकिन खुद को मत खाइए। 5 मिनट का ब्रेक लें — टहलें या गाना सुनें।", context: "stress" },
  ],
  anxious: [
    { title: "सब ठीक होगा", message: "चिंता कहती है कि सब खराब होगा, लेकिन ये झूठ है। आप सुरक्षित हैं, आप मजबूत हैं।", context: "anxiety" },
  ],
  neutral: [
    { title: "आज कुछ नया करें", message: "रूटीन से ब्रेक लें। कोई नई चीज सीखें, या किसी पुराने दोस्त को कॉल करें।", context: "routine" },
  ],
  calm: [
    { title: "इस शांति का आनंद लें", message: "शांत महसूस करना एक आशीर्वाद है। इस पल को अपने दिल में संजोएं।", context: "peace" },
  ],
  happy: [
    { title: "ये ऊर्जा शानदार है!", message: "खुश हैं? बहुत बढ़िया! इस ऊर्जा को फैलाएं — किसी की तारीफ करें।", context: "happiness" },
  ],
  lateNight: [
    { title: "सो जाइए", message: "रात के इस वक्त फोन पर क्या कर रहे हैं? नींद स्वास्थ्य के लिए जरूरी है।", context: "lateNight" },
  ],
  earlyMorning: [
    { title: "सुप्रभात!", message: "सुबह-सुबह चेक-इन कर रहे हैं — बहुत अच्छी आदत! आज का दिन आपका है।", context: "morning" },
  ],
  frequentCheckin: [
    { title: "आप जागरूक हैं", message: "बार-बार चेक-इन करना दिखाता है कि आप अपनी भावनाओं को समझना चाहते हैं।", context: "awareness" },
  ],
};

const ENGLISH_CONTEXTUAL: Record<string, ContextualMessage[]> = {
  sad: [
    { title: "You're Not Alone", message: "Life has ups and downs, but you're strong. Take a deep breath — this too shall pass.", context: "sadness" },
    { title: "Keep Moving Forward", message: "Giving up is easy, but you're a fighter. Small things matter — have a cup of tea and relax.", context: "sadness" },
  ],
  stressed: [
    { title: "Put the Phone Down & Breathe", message: "Stress is normal, but don't let it consume you. Take a 5-minute break — walk or listen to music.", context: "stress" },
  ],
  anxious: [
    { title: "Everything Will Be Okay", message: "Anxiety tells you everything will go wrong, but it lies. You're safe and strong. Try 4-7-8 breathing.", context: "anxiety" },
  ],
  neutral: [
    { title: "Try Something New Today", message: "Break from routine. Learn something new or call an old friend. Life needs a little adventure!", context: "routine" },
  ],
  calm: [
    { title: "Enjoy This Peace", message: "Feeling calm is a blessing. Capture this moment in your heart. You're on the right track.", context: "peace" },
  ],
  happy: [
    { title: "This Energy Is Amazing!", message: "Feeling happy? Awesome! Spread this energy — give someone a compliment or do your favorite thing.", context: "happiness" },
  ],
  lateNight: [
    { title: "Time to Rest", message: "It's late — what are you doing on your phone? Sleep is essential for health. Turn off the screen and rest.", context: "lateNight" },
  ],
  earlyMorning: [
    { title: "Good Morning!", message: "Checking in early — great habit! Today is your day. Set a positive intention and get started.", context: "morning" },
  ],
  frequentCheckin: [
    { title: "You're Self-Aware", message: "Checking in frequently shows you want to understand your feelings. This self-awareness is powerful.", context: "awareness" },
  ],
};

const MESSAGE_BANKS: Record<string, Record<string, ContextualMessage[]>> = {
  hinglish: HINGLISH_CONTEXTUAL,
  hindi: HINDI_CONTEXTUAL,
  english: ENGLISH_CONTEXTUAL,
  bengali: ENGLISH_CONTEXTUAL,
  kannada: ENGLISH_CONTEXTUAL,
  tamil: ENGLISH_CONTEXTUAL,
  telugu: ENGLISH_CONTEXTUAL,
};

export function getContextualMessage(
  mood: MoodType,
  language: Language,
  hour: number,
  checkinCountToday: number,
): ContextualMessage {
  const bank = MESSAGE_BANKS[language] || HINGLISH_CONTEXTUAL;

  if (hour >= 0 && hour < 5) {
    const lateNight = bank.lateNight;
    if (lateNight && lateNight.length > 0) {
      return lateNight[Math.floor(Math.random() * lateNight.length)];
    }
  }

  if (hour >= 5 && hour < 8) {
    const morning = bank.earlyMorning;
    if (morning && morning.length > 0) {
      return morning[Math.floor(Math.random() * morning.length)];
    }
  }

  if (checkinCountToday >= 3) {
    const frequent = bank.frequentCheckin;
    if (frequent && frequent.length > 0) {
      return frequent[Math.floor(Math.random() * frequent.length)];
    }
  }

  const moodMessages = bank[mood];
  if (moodMessages && moodMessages.length > 0) {
    return moodMessages[Math.floor(Math.random() * moodMessages.length)];
  }

  const neutral = bank.neutral;
  if (neutral && neutral.length > 0) {
    return neutral[Math.floor(Math.random() * neutral.length)];
  }

  return { title: "You matter", message: "Take a moment to breathe. You're doing great.", context: "default" };
}

export function getBroAISystemPrompt(language: Language, currentMood?: MoodType): string {
  const langInstructions: Record<Language, string> = {
    hinglish: "Respond in Hinglish (a natural mix of Hindi and English, using Roman script). Use words like 'bhai', 'yaar', 'chill', 'tension mat le'. Be warm, casual, and supportive like a close Indian friend.",
    hindi: "Respond in Hindi (Devanagari script). Be warm and supportive like a close friend.",
    english: "Respond in English. Be warm, casual, and supportive like a close friend.",
    bengali: "Respond in Bengali (Bangla script). Be warm and supportive.",
    kannada: "Respond in Kannada (Kannada script). Be warm and supportive.",
    tamil: "Respond in Tamil (Tamil script). Be warm and supportive.",
    telugu: "Respond in Telugu (Telugu script). Be warm and supportive.",
  };

  const moodContext = currentMood ? `The user is currently feeling ${currentMood}. Be extra sensitive and supportive about this.` : '';

  return `You are BroAI — a supportive, empathetic, and relatable mental wellness companion designed for young Indian users (18-30 age group). Your personality:

1. You talk like a caring older brother/sister ("bro") who genuinely cares
2. You understand Indian culture, daily struggles (work pressure, family expectations, relationship issues, career anxiety, exam stress)
3. You NEVER diagnose or prescribe medication — you're a supportive friend, not a doctor
4. If someone seems in crisis, gently suggest professional help and mention helplines (iCall: 9152987821, Vandrevala Foundation: 1860-2662-345)
5. Keep responses concise (2-4 sentences usually) unless the user wants to talk more
6. Use appropriate humor when it helps lighten the mood, but be serious when needed
7. Suggest practical coping techniques: breathing exercises, grounding (5-4-3-2-1), journaling, physical activity
8. Celebrate small wins and validate feelings
9. Never be preachy or lecture-like — be conversational

${langInstructions[language]}

${moodContext}

Remember: You're not a therapist. You're a supportive bro who listens, validates, and gently guides. If someone needs professional help, recommend it warmly.`;
}
