
export interface RemedyData {
  name: string;
  scientificName: string;
  description: {
    en: string;
    hi: string;
    kn: string;
  };
  howItHelps: {
    en: string;
    hi: string;
    kn: string;
  };
  preparation: {
    en: string;
    hi: string;
    kn: string;
  };
  tags: string[]; // for fuzzy matching
}

export const remedyBank: Record<string, RemedyData> = {
  cough: {
    name: "Tulsi (Holy Basil)",
    scientificName: "Ocimum tenuiflorum",
    description: {
      en: "Tulsi is known as the 'Queen of Herbs' for its extensive medicinal properties.",
      hi: "तुलसी को इसके व्यापक औषधीय गुणों के लिए 'जड़ी-बूटियों की रानी' के रूप में जाना जाता है।",
      kn: "ತುಳಸಿಯು ಅದರ ವ್ಯಾಪಕವಾದ ಔಷಧೀಯ ಗುಣಗಳಿಗಾಗಿ 'ಗಿಡಮೂಲಿಕೆಗಳ ರಾಣಿ' ಎಂದು ಕರೆಯಲ್ಪಡುತ್ತದೆ."
    },
    howItHelps: {
      en: "Relieves persistent cough, clears respiratory pathways, and boosts immunity.",
      hi: "लगातार खांसी से राहत देता है, श्वसन मार्ग को साफ करता है और प्रतिरक्षा को बढ़ाता है।",
      kn: "ನಿರಂತರ ಕೆಮ್ಮನ್ನು ನಿವಾರಿಸುತ್ತದೆ, ಉಸಿರಾಟದ ಮಾರ್ಗಗಳನ್ನು ಸ್ವಚ್ಛಗೊಳಿಸುತ್ತದೆ ಮತ್ತು ರೋಗನಿರೋಧಕ ಶಕ್ತಿಯನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ."
    },
    preparation: {
      en: "Boil 5-10 leaves in water to make tea. Add honey for better results.",
      hi: "चाय बनाने के लिए 5-10 पत्तियों को पानी में उबालें। बेहतर परिणामों के लिए शहद मिलाएं।",
      kn: "ಚಹಾ ತಯಾರಿಸಲು 5-10 ಎಲೆಗಳನ್ನು ನೀರಿನಲ್ಲಿ ಕುದಿಸಿ. ಉತ್ತಮ ಫಲಿತಾಂಶಕ್ಕಾಗಿ ಜೇನುತುಪ್ಪವನ್ನು ಸೇರಿಸಿ."
    },
    tags: ["cough", "cold", "fever", "throat", "immunity", "khansi", "sardi", "kemmu"]
  },
  skin: {
    name: "Aloevera",
    scientificName: "Aloe barbadensis miller",
    description: {
      en: "Aloe Vera is a succulent plant known for its soothing and healing properties for the skin.",
      hi: "एलोवेरा एक रसीला पौधा है जो त्वचा के लिए अपने सुखदायक और उपचार गुणों के लिए जाना जाता है।",
      kn: "ಲೋಳೆಸರವು ಚರ್ಮಕ್ಕಾಗಿ ಅದರ ಹಿತವಾದ ಮತ್ತು ಗುಣಪಡಿಸುವ ಗುಣಲಕ್ಷಣಗಳಿಗೆ ಹೆಸರುವಾಸಿಯಾದ ಸಸ್ಯವಾಗಿದೆ."
    },
    howItHelps: {
      en: "Treats burns, moisturizes skin, and reduces inflammation or acne.",
      hi: "जलन का इलाज करता है, त्वचा को मॉइस्चराइज़ करता है और सूजन या मुँहासे को कम करता।",
      kn: "ಸುಟ್ಟಗಾಯಗಳನ್ನು ಗುಣಪಡಿಸುತ್ತದೆ, ಚರ್ಮವನ್ನು ತೇವಗೊಳಿಸುತ್ತದೆ ಮತ್ತು ಉರಿಯೂತ ಅಥವಾ ಮೊಡವೆಗಳನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ."
    },
    preparation: {
      en: "Apply fresh gel directly from the leaf to the affected skin area.",
      hi: "पत्ती से सीधे ताज़ा जेल प्रभावित त्वचा क्षेत्र पर लगाएं।",
      kn: "ಎಲೆಯಿಂದ ನೇರವಾಗಿ ತಾಜಾ ಜೆಲ್ ಅನ್ನು ಪೀಡಿತ ಚರ್ಮದ ಪ್ರದೇಶಕ್ಕೆ ಹಚ್ಚಿ."
    },
    tags: ["skin", "burn", "acne", "moisturizer", "rash", "itchness", "tvacha", "chay"]
  },
  digestion: {
    name: "Ginger (Adrak)",
    scientificName: "Zingiber officinale",
    description: {
      en: "Ginger is a flowering plant whose rhizome is widely used as a spice and a folk medicine.",
      hi: "अदरक एक फूल वाला पौधा है जिसकी जड़ का व्यापक रूप से मसाले और लोक औषधि के रूप में उपयोग किया जाता है।",
      kn: "ಶುಂಠಿಯು ಒಂದು ಹೂಬಿಡುವ ಸಸ್ಯವಾಗಿದ್ದು ಇದರ ಬೇರನ್ನು ಸಾಂಬಾರ ಪದಾರ್ಥವಾಗಿ ಮತ್ತು ಜನಪದ ಔಷಧಿಯಾಗಿ ವ್ಯಾಪಕವಾಗಿ ಬಳಸಲಾಗುತ್ತದೆ."
    },
    howItHelps: {
      en: "Aids digestion, reduces nausea, and helps with gas or bloating.",
      hi: "पाचन में मदद करता है, मतली कम करता है और गैस या सूजन में मदद करता है।",
      kn: "ಜೀರ್ಣಕ್ರಿಯೆಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ, ವಾಕರಿಕೆ ಕಡಿಮೆ ಮಾಡುತ್ತದೆ ಮತ್ತು ಗ್ಯಾಸ್ ಅಥವಾ ಉಬ್ಬುವಿಕೆಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ."
    },
    preparation: {
      en: "Grate a small piece into tea or chew a small slice with salt after meals.",
      hi: "चाय में थोड़ा सा कद्दूकस करके डालें या भोजन के बाद नमक के साथ एक छोटा टुकड़ा चबाएं।",
      kn: "ಚಹಾಕ್ಕೆ ಸಣ್ಣ ತುಂಡನ್ನು ತುರಿದು ಸೇರಿಸಿ ಅಥವಾ ಊಟದ ನಂತರ ಉಪ್ಪಿನೊಂದಿಗೆ ಸಣ್ಣ ತುಂಡನ್ನು ಅಗಿಯಿರಿ."
    },
    tags: ["digestion", "nausea", "gas", "bloating", "stomach", "pachana", "adrak"]
  },
  stress: {
    name: "Ashwagandha",
    scientificName: "Withania somnifera",
    description: {
      en: "An ancient medicinal herb known as an adaptogen that helps the body manage stress.",
      hi: "एक प्राचीन औषधीय जड़ी-बूटी जिसे एडेप्टोजेन के रूप में जाना जाता है जो शरीर को तनाव प्रबंधित करने में मदद करती है।",
      kn: "ಒತ್ತಡವನ್ನು ನಿಭಾಯಿಸಲು ಸಹಾಯ ಮಾಡುವ ಪುರಾತನ ಔಷಧೀಯ ಗಿಡಮೂಲಿಕೆಯಾಗಿದೆ."
    },
    howItHelps: {
      en: "Reduces anxiety, improves sleep, and boosts overall energy levels.",
      hi: "चिंता कम करता है, नींद में सुधार करता है और समग्र ऊर्जा के स्तर को बढ़ाता है।",
      kn: "ಆತಂಕವನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ, ನಿದ್ರೆಯನ್ನು ಸುಧಾರಿಸುತ್ತದೆ ಮತ್ತು ಒಟ್ಟಾರೆ ಶಕ್ತಿಯ ಮಟ್ಟವನ್ನು ಹೆಚ್ಚಿಸುತ್ತದೆ."
    },
    preparation: {
      en: "Mix 1/2 teaspoon of powder in warm milk before bedtime.",
      hi: "सोने से पहले गर्म दूध में 1/2 चम्मच पाउडर मिलाएं।",
      kn: "ಮಲಗುವ ಮುನ್ನ ಬೆಚ್ಚಗಿನ ಹಾಲಿನಲ್ಲಿ 1/2 ಟೀಸ್ಪೂನ್ ಪುಡಿಯನ್ನು ಬೆರೆಸಿ."
    },
    tags: ["stress", "anxiety", "sleep", "insomnia", "energy", "fatigue", "tanaav", "nidde"]
  },
  fever: {
    name: "Amruta Balli (Guduchi)",
    scientificName: "Tinospora cordifolia",
    description: {
      en: "A universal herb that helps boost immunity and treat chronic fevers.",
      hi: "एक सार्वभौमिक जड़ी-बूटी जो प्रतिरक्षा बढ़ाने और पुराने बुखार के इलाज में मदद करती है।",
      kn: "ರೋಗನಿರೋಧಕ ಶಕ್ತಿಯನ್ನು ಹೆಚ್ಚಿಸಲು ಮತ್ತು ದೀರ್ಘಕಾಲದ ಜ್ವರಕ್ಕೆ ಸಹಾಯ ಮಾಡುವ ಒಂದು ಗಿಡಮೂಲಿಕೆ."
    },
    howItHelps: {
      en: "Reduces body temperature during fever and strengthens the immune system.",
      hi: "बुखार के दौरान शरीर के तापमान को कम करता है और प्रतिरक्षा प्रणाली को मजबूत करता है।",
      kn: "ಜ್ವರದ ಸಮಯದಲ್ಲಿ ದೇಹದ ಉಷ್ಣತೆಯನ್ನು ಕಡಿಮೆ ಮಾಡುತ್ತದೆ ಮತ್ತು ರೋಗನಿರೋಧಕ ಶಕ್ತಿಯನ್ನು ಬಲಪಡಿಸುತ್ತದೆ."
    },
    preparation: {
      en: "Boil the stem in water to make a decoction (Kashaya) and drink twice daily.",
      hi: "काढ़ा बनाने के लिए तने को पानी में उबालें और दिन में दो बार पियें।",
      kn: "ಕಷಾಯ ತಯಾರಿಸಲು ಕಾಂಡವನ್ನು ನೀರಿನಲ್ಲಿ ಕುದಿಸಿ ಮತ್ತು ದಿನಕ್ಕೆ ಎರಡು ಬಾರಿ ಕುಡಿಯಿರಿ."
    },
    tags: ["fever", "feverish", "immunity", "infection", "jwara", "bukhaar"]
  }
};
