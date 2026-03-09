/**
 * NotificationEngine — Context-aware notification message selection
 * Supports all 8 Indian languages + Hinglish
 */

import { MoodSnapshot } from './MoodEngine';
import { TriggerAction } from './TriggerEngine';
import { AppLanguage } from '../store/userStore';

export type NotificationContext =
  | 'breakup'
  | 'doomscroll_latenight'
  | 'social_withdrawal'
  | 'career_failure'
  | 'general_low'
  | 'improving'
  | 'emergency'
  | 'celebrate';

export interface PushNotification {
  title: string;
  body: string;
  data: Record<string, unknown>;
}

const MESSAGES: Record<NotificationContext, Record<AppLanguage, string>> = {
  breakup: {
    hinglish: 'Bhai, phone rakh aur gehri saans le. Tu isse kahin behtar deserve karta hai 💙',
    hindi: 'भाई, फ़ोन रख और गहरी सांस ले। तू इससे कहीं बेहतर deserve करता है 💙',
    english: 'Put the phone down and breathe, bro. You deserve so much better than this 💙',
    bengali: 'ভাই, ফোন রাখো এবং গভীর শ্বাস নাও। তুমি এর চেয়ে অনেক ভালো deserve করো 💙',
    kannada: 'ಭಾಯ್, ಫೋನ್ ಇಳಿಸಿ ಆಳವಾಗಿ ಉಸಿರಾಡು. ನೀನು ಇದಕ್ಕಿಂತ ಬಹಳ ಉತ್ತಮ deserve ಮಾಡ್ತೀಯ 💙',
    tamil: 'பாய், போனை வை, ஆழமா மூச்சு விடு. நீ இதை விட மிகவும் நல்லதை deserve செய்கிறாய் 💙',
    marathi: 'भाऊ, फोन ठेव आणि खोल श्वास घे. तू यापेक्षा खूप चांगल्याला deserve करतोस 💙',
    telugu: 'బ్రో, ఫోన్ పెట్టు, లోతుగా శ్వాస తీసుకో. నువ్వు దీని కంటే చాలా మంచిది deserve చేస్తావు 💙',
  },
  doomscroll_latenight: {
    hinglish: 'Bhai, 3 baj gaye. So ja yaar. Kal subah uthkar sab theek lagega, promise 🌙',
    hindi: 'भाई, 3 बज गए। सो जा यार। कल सुबह उठकर सब ठीक लगेगा, promise 🌙',
    english: "It's late, bro. Sleep. Everything looks better in the morning, I promise 🌙",
    bengali: 'ভাই, রাত হয়ে গেছে। ঘুমাও বন্ধু। সকালে সব ঠিক মনে হবে, promise 🌙',
    kannada: 'ಭಾಯ್, ತಡ ಆಗ್ತಿದೆ. ಮಲಕ್ಕೋ ಗೆಳೆಯ. ಬೆಳಗ್ಗೆ ಎಲ್ಲಾ ಸರಿ ಆಗ್ತದೆ 🌙',
    tamil: 'பாய், இரவு ஆச்சு. தூங்கு மச்சான். காலையில் எல்லாம் நல்லா தெரியும் 🌙',
    marathi: 'भाऊ, उशीर झाला. झोप रे. उद्या सकाळी सगळं बरं वाटेल, promise 🌙',
    telugu: 'బ్రో, ఆలస్యమైంది. పడుకో నేస్తం. పొద్దున్న అన్నీ బాగుంటాయి, promise 🌙',
  },
  social_withdrawal: {
    hinglish: 'Kaafi time ho gaya baat nahi ki. Sab theek hai? Main hoon na. 🤝',
    hindi: 'काफी समय हो गया बात नहीं की। सब ठीक है? मैं हूँ ना। 🤝',
    english: "It's been a while. Everything okay? I'm here for you, bro. 🤝",
    bengali: 'অনেকদিন কথা হয়নি। সব ঠিক আছে? আমি আছি তো। 🤝',
    kannada: 'ತುಂಬಾ ದಿನ ಆಯ್ತು ಮಾತಾಡಿ. ಎಲ್ಲಾ ಸರಿಯಾಗಿದೆಯಾ? ನಾನಿದ್ದೀನಿ. 🤝',
    tamil: 'நாளாச்சு பேசி. எல்லாம் சரியா இருக்கா? நான் இருக்கேன் மச்சான். 🤝',
    marathi: 'बराच वेळ झाला बोलून. सगळं ठीक आहे का? मी आहे रे. 🤝',
    telugu: 'చాలా కాలమైంది మాట్లాడి. అన్నీ బాగున్నాయా? నేనున్నాను. 🤝',
  },
  career_failure: {
    hinglish: 'Ek failure = end of life nahi hota bhai. Tu sirf ek step peeche hai, not out of the game 💪',
    hindi: 'एक failure = life का end नहीं होता भाई। तू सिर्फ एक step पीछे है, game से बाहर नहीं 💪',
    english: "One failure doesn't end the game, bro. You're just one step back, not out 💪",
    bengali: 'একটা failure মানে শেষ না ভাই। তুমি শুধু একধাপ পিছে আছো, খেলা শেষ হয়নি 💪',
    kannada: 'ಒಂದು failure = game over ಅಲ್ಲ ಭಾಯ್. ನೀನು ಒಂದು ಹೆಜ್ಜೆ ಹಿಂದಿದ್ದೀಯ, ಅಷ್ಟೆ 💪',
    tamil: 'ஒரு தோல்வி = முடிவு இல்லை மச்சான். ஒரு ஸ்டெப் பின்னால இருக்க, game over இல்ல 💪',
    marathi: 'एक failure म्हणजे सगळं संपलं नाही भाऊ. तू फक्त एक पाऊल मागे आहेस 💪',
    telugu: 'ఒక failure = game over కాదు బ్రో. నువ్వు ఒక step వెనకున్నావు, అంతే 💪',
  },
  general_low: {
    hinglish: 'Aaj ka din bhaari raha kya? Ek gehri saans le. Bas itna kaafi hai abhi 💙',
    hindi: 'आज का दिन भारी रहा क्या? एक गहरी सांस ले। बस इतना काफी है अभी 💙',
    english: "Tough day? Take one deep breath. That's enough for now 💙",
    bengali: 'আজকের দিনটা কঠিন ছিল? একটা গভীর শ্বাস নাও। এখনকে জন্য এটুকুই যথেষ্ট 💙',
    kannada: 'ಇವತ್ತು ಕಷ್ಟ ಅನ್ನಿಸ್ತಿದೆಯಾ? ಒಂದು ಆಳವಾದ ಉಸಿರು ತಗೋ. ಈಗ ಇಷ್ಟೇ ಸಾಕು 💙',
    tamil: 'இன்னைக்கு கஷ்டமா இருந்துச்சா? ஒரு ஆழமான மூச்சு விடு. இப்போ இது போதும் 💙',
    marathi: 'आजचा दिवस जड गेला का? एक खोल श्वास घे. आत्ता इतकं पुरेसं आहे 💙',
    telugu: 'ఈరోజు కష్టంగా అనిపించిందా? ఒక లోతైన శ్వాస తీసుకో. ఇప్పుడు ఇది చాలు 💙',
  },
  improving: {
    hinglish: 'Bhai, notice kiya — tu better ho raha hai. Teri mehnat dikh rahi hai. Proud hoon 🔥',
    hindi: 'भाई, notice किया — तू better हो रहा है। तेरी मेहनत दिख रही है। Proud हूँ 🔥',
    english: "Noticed you're doing better, bro. Your effort is showing. So proud of you 🔥",
    bengali: 'ভাই, লক্ষ্য করলাম — তুমি ভালো হচ্ছো। তোমার পরিশ্রম দেখা যাচ্ছে। Proud আছি 🔥',
    kannada: 'ಭಾಯ್, ಗಮನಿಸಿದೆ — ನೀನು ಉತ್ತಮವಾಗ್ತಿದ್ದೀಯ. ನಿನ್ನ ಪ್ರಯತ್ನ ಕಾಣ್ತಿದೆ. Proud ಆಗ್ತೀನಿ 🔥',
    tamil: 'மச்சான், கவனிச்சேன் — நீ better ஆகுற. உன் உழைப்பு தெரியுது. Proud ஆ இருக்கேன் 🔥',
    marathi: 'भाऊ, लक्षात आलं — तू बरा होतोयस. तुझी मेहनत दिसतेय. अभिमान आहे 🔥',
    telugu: 'బ్రో, గమనించాను — నువ్వు బెటర్ అవుతున్నావు. నీ కష్టం కనిపిస్తోంది. Proud గా ఉన్నాను 🔥',
  },
  emergency: {
    hinglish: 'Yaar, tu akela nahi hai. Abhi call kar iCall: 9152987821 — free, abhi 💙',
    hindi: 'यार, तू अकेला नहीं है। अभी call कर iCall: 9152987821 — free, अभी 💙',
    english: "You're not alone. Call iCall now: 9152987821 — free, available now 💙",
    bengali: 'বন্ধু, তুমি একা নও। এখনই call করো iCall: 9152987821 — free, এখনই 💙',
    kannada: 'ಗೆಳೆಯ, ನೀನು ಒಂಟಿಯಲ್ಲ. ಈಗ call ಮಾಡು iCall: 9152987821 — free, ಈಗಲೇ 💙',
    tamil: 'நண்பா, நீ தனியா இல்ல. இப்பவே call பண்ணு iCall: 9152987821 — free 💙',
    marathi: 'मित्रा, तू एकटा नाहीस. आत्ता call कर iCall: 9152987821 — free, आत्ता 💙',
    telugu: 'నేస్తం, నువ్వు ఒంటరి కాదు. ఇప్పుడే call చేయి iCall: 9152987821 — free 💙',
  },
  celebrate: {
    hinglish: '🏆 Bhai, tu legend ban raha hai! 5 din se mood aasman par hai. Chalte reh! 🚀',
    hindi: '🏆 भाई, तू legend बन रहा है! 5 दिनों से mood आसमान पर है। चलते रह! 🚀',
    english: "🏆 You're becoming a legend, bro! 5 days of improvement streak. Keep going! 🚀",
    bengali: '🏆 ভাই, তুমি legend হচ্ছো! ৫ দিন ধরে mood উপরে। চালিয়ে যাও! 🚀',
    kannada: '🏆 ಭಾಯ್, ನೀನು legend ಆಗ್ತಿದ್ದೀಯ! ೫ ದಿನ streak. ಮುಂದೆ ಹೋಗು! 🚀',
    tamil: '🏆 மச்சான், நீ legend ஆகுற! 5 நாள் streak. தொடர்ந்து போ! 🚀',
    marathi: '🏆 भाऊ, तू legend होतोयस! ५ दिवस streak. चालू राहा! 🚀',
    telugu: '🏆 బ్రో, నువ్వు legend అవుతున్నావు! 5 రోజుల streak. కొనసాగించు! 🚀',
  },
};

function getLanguage(): AppLanguage {
  try {
    const { useUserStore } = require('../store/userStore');
    return useUserStore.getState().language;
  } catch {
    return 'hinglish';
  }
}

function inferContext(snapshot: MoodSnapshot): NotificationContext {
  // Check detected themes from journal sentiment
  const themes = (snapshot as any).detectedThemes as string[] | undefined;
  if (themes) {
    if (themes.includes('breakup')) return 'breakup';
    if (themes.includes('career_failure')) return 'career_failure';
    if (themes.includes('self_harm') || snapshot.urgencyFlag) return 'emergency';
  }

  const hour = new Date().getHours();
  if (hour >= 22 || hour <= 5) return 'doomscroll_latenight';
  if (snapshot.signals.socialWithdrawal < 4) return 'social_withdrawal';
  if (snapshot.trendSlope > 0.3) return 'improving';
  return 'general_low';
}

export const NotificationEngine = {
  buildNotification(action: TriggerAction, snapshot: MoodSnapshot): PushNotification {
    const lang = getLanguage();
    let context: NotificationContext;

    switch (action) {
      case 'SEND_EMERGENCY_NOTIFICATION':
        context = 'emergency';
        break;
      case 'SEND_CELEBRATION_NOTIFICATION':
        context = 'celebrate';
        break;
      default:
        context = inferContext(snapshot);
    }

    const body = MESSAGES[context][lang] ?? MESSAGES[context]['hinglish'];
    return {
      title: 'BroMood',
      body,
      data: { screen: 'Chat', context },
    };
  },
};
