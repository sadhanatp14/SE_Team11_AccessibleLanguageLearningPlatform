/**
 * lessonSamplesTamil.js
 *
 * Static sample lesson data for Tamil language lessons.
 * Mirrors the structure and interaction count of the English lessons
 * in lessonSamples.js but teaches Tamil words and phrases.
 *
 * Each lesson includes full i18n support (english, tamil, hindi)
 * so the UI text can be rendered in the learner's preferred language
 * while the taught content remains in Tamil.
 */

const lessonSamplesTamil = {
  'lesson-greetings-tamil': {
    _id: 'lesson-greetings-tamil',
    title: 'வாழ்த்துகள்',
    titleI18n: {
      english: 'Greetings',
      tamil: 'வாழ்த்துகள்',
      hindi: 'अभिवादन',
    },
    textContent:
      'வணக்கம்! இந்தப் பாடம் தமிழில் மரியாதையுடன் ஒருவரை வாழ்த்த உதவும்.\n\nகுறிப்பு: ஒரு சொல் கடினமாக இருந்தால், அதை அசைகளாக பிரித்து வாசிக்கவும்.\n\nசிரிப்புடன் "வணக்கம்" அல்லது "ஹலோ" சொல்லுங்கள்.\n\n"நீங்கள் எப்படி இருக்கிறீர்கள்?" என்று கேட்டு "நான் நன்றாக இருக்கிறேன், நன்றி." என்று பதில் சொல்லுங்கள்.',
    textContentI18n: {
      english:
        'Vanakkam! This lesson helps you greet someone politely in Tamil.\n\nTip: If a word feels hard, break it into parts (syllables).\n\nSay "Vanakkam" or "Hello" with a smile.\n\nAsk "Neengal eppadi irukkeergal?" and respond with "Naan nandraaga irukkirein, nandri."',
      tamil:
        'வணக்கம்! இந்தப் பாடம் தமிழில் மரியாதையுடன் ஒருவரை வாழ்த்த உதவும்.\n\nகுறிப்பு: ஒரு சொல் கடினமாக இருந்தால், அதை அசைகளாக பிரித்து வாசிக்கவும்.\n\nசிரிப்புடன் "வணக்கம்" அல்லது "ஹலோ" சொல்லுங்கள்.\n\n"நீங்கள் எப்படி இருக்கிறீர்கள்?" என்று கேட்டு "நான் நன்றாக இருக்கிறேன், நன்றி." என்று பதில் சொல்லுங்கள்.',
      hindi:
        'वणक्कम! यह पाठ तमिल में शिष्ट तरीके से अभिवादन करना सिखाता है।\n\nटिप: अगर कोई शब्द कठिन लगे, तो उसे भागों में तोड़कर पढ़ें।\n\nमुस्कान के साथ "वणक्कम" या "हलो" कहें।\n\n"नींगल एप्पडि इरुक्कीर्गल?" पूछें और "नान नंद्रागा इरुक्किरेन, नंद्रि।" जवाब दें।',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/wave.svg', description: 'சிரிப்புடன் வணக்கம் சொல்லுங்கள்.' },
      { iconUrl: '/visuals/speech.svg', description: 'எளிய வாழ்த்து வாக்கியங்களைப் பயன்படுத்துங்கள்.' },
    ],
    highlights: [
      { id: 'h1', phrase: 'வணக்கம்', emphasisType: 'background', color: '#ffe7a3', position: 0 },
      { id: 'h2', phrase: 'நீங்கள் எப்படி இருக்கிறீர்கள்?', emphasisType: 'underline' },
    ],
    visualAids: [
      {
        id: 'v1',
        imageUrl: '/visuals/wave.svg',
        altText: 'Waving hand icon',
        relatedPhrase: 'வணக்கம்',
        placement: 'inline',
      },
      {
        id: 'v2',
        imageUrl: '/visuals/speech.svg',
        altText: 'Speech bubble icon',
        relatedPhrase: 'நீங்கள் எப்படி இருக்கிறீர்கள்?',
        placement: 'below',
      },
    ],
    interactions: [
      {
        id: 'greet-ta-1',
        type: 'true_false',
        question: '"வணக்கம்" என்பது நட்பான வாழ்த்தா?',
        questionI18n: {
          english: 'Is "வணக்கம்" (Vanakkam) a friendly greeting?',
          tamil: '"வணக்கம்" என்பது நட்பான வாழ்த்தா?',
          hindi: 'क्या "वणक्कम்" (Vanakkam) एक दोस्ताना अभिवादन है?',
        },
        questionImageUrl: '/images/greeting-hello.svg',
        questionAudioUrl: '/audio/greet-1-question.mp3',
        correctAnswer: 'True',
        hint: 'இது தமிழில் மிகவும் பொதுவான வாழ்த்து.',
        hintI18n: {
          english: 'This is the most common greeting in Tamil.',
          tamil: 'இது தமிழில் மிகவும் பொதுவான வாழ்த்து.',
          hindi: 'यह तमिल में सबसे आम अभिवादन है।',
        },
        explanation: '"வணக்கம்" என்பது ஒருவரை வாழ்த்தப் பயன்படும் பொதுவான, நட்பான சொல்.',
        explanationI18n: {
          english: '"வணக்கம்" (Vanakkam) is a common, friendly way to greet someone in Tamil.',
          tamil: '"வணக்கம்" என்பது ஒருவரை வாழ்த்தப் பயன்படும் பொதுவான, நட்பான சொல்.',
          hindi: '"वणक्कम்" (Vanakkam) तमिल में किसी का अभिवादन करने का सामान्य और दोस्ताना तरीका है।',
        },
        explanationAudioUrl: '/audio/greet-1-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'சிறப்பாக செய்தீர்கள்! "வணக்கம்" என்பது நட்பான வாழ்த்து.',
          correctAudioUrl: '/audio/greet-1-correct.mp3',
          incorrect: 'நல்ல முயற்சி. மீண்டும் முயற்சிப்போம்.',
          incorrectAudioUrl: '/audio/greet-1-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great job! "வணக்கம்" (Vanakkam) is a friendly greeting.',
            tamil: 'சிறப்பாக செய்தீர்கள்! "வணக்கம்" என்பது நட்பான வாழ்த்து.',
            hindi: 'बहुत बढ़िया! "வணக்கம்" (Vanakkam) एक दोस्ताना अभिवादन है।',
          },
          incorrect: {
            english: 'Good effort. Let\'s try again.',
            tamil: 'நல்ல முயற்சி. மீண்டும் முயற்சிப்போம்.',
            hindi: 'अच्छी कोशिश। चलिए फिर से कोशिश करते हैं।',
          },
        },
        position: 0,
      },
      {
        id: 'greet-ta-2',
        type: 'multiple_choice',
        question: 'நட்பான வாழ்த்தைத் தேர்ந்தெடுக்கவும்.',
        questionI18n: {
          english: 'Choose a friendly greeting.',
          tamil: 'நட்பான வாழ்த்தைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'एक दोस्ताना अभिवादन चुनें।',
        },
        questionImageUrl: '/images/greeting-options.svg',
        questionAudioUrl: '/audio/greet-2-question.mp3',
        options: ['வணக்கம்', 'பிரியாவிடை', 'பின்னர்'],
        optionsI18n: [
          { english: 'Vanakkam (Hello)', tamil: 'வணக்கம்', hindi: 'वणक्कम (नमस्ते)' },
          { english: 'Goodbye', tamil: 'பிரியாவிடை', hindi: 'अलविदा' },
          { english: 'Later', tamil: 'பின்னர்', hindi: 'बाद में' },
        ],
        correctAnswer: 0,
        hint: 'உரையாடலை தொடங்கும்போது சொல்லும் ஒரு சொல்.',
        hintI18n: {
          english: 'It is a word you say at the start of a conversation.',
          tamil: 'உரையாடலை தொடங்கும்போது சொல்லும் ஒரு சொல்.',
          hindi: 'यह वह शब्द है जो बातचीत की शुरुआत में कहा जाता है।',
        },
        explanation: '"வணக்கம்" என்பது நட்பான வாழ்த்து.',
        explanationI18n: {
          english: '"வணக்கம்" (Vanakkam) is a friendly greeting.',
          tamil: '"வணக்கம்" என்பது நட்பான வாழ்த்து.',
          hindi: '"வணக்கம்" (Vanakkam) एक दोस्ताना अभिवादन है।',
        },
        explanationAudioUrl: '/audio/greet-2-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'ஆம்! "வணக்கம்" என்பது நட்பான வாழ்த்து.',
          correctAudioUrl: '/audio/greet-2-correct.mp3',
          incorrect: 'நல்ல முயற்சி. தொடக்கத்தில் பயன்படுத்தும் வாழ்த்தைத் தேர்வுசெய்யவும்.',
          incorrectAudioUrl: '/audio/greet-2-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Yes! "வணக்கம்" (Vanakkam) is a friendly greeting.',
            tamil: 'ஆம்! "வணக்கம்" என்பது நட்பான வாழ்த்து.',
            hindi: 'हाँ! "வணக்கம்" (Vanakkam) एक दोस्ताना अभिवादन है।',
          },
          incorrect: {
            english: 'Nice try. Pick the greeting used at the start.',
            tamil: 'நல்ல முயற்சி. தொடக்கத்தில் பயன்படுத்தும் வாழ்த்தைத் தேர்வுசெய்யவும்.',
            hindi: 'अच्छी कोशिश। शुरुआत में उपयोग होने वाला अभिवादन चुनें।',
          },
        },
        position: 1,
      },
      {
        id: 'greet-ta-3',
        type: 'click',
        question: 'ஒருவரைப் பற்றி கேட்பதற்கு பயன்படுத்தும் தமிழ் வாக்கியத்தை கிளிக் செய்யவும்.',
        questionI18n: {
          english: 'Click the Tamil phrase you use to ask about someone.',
          tamil: 'ஒருவரைப் பற்றி கேட்பதற்கு பயன்படுத்தும் தமிழ் வாக்கியத்தை கிளிக் செய்யவும்.',
          hindi: 'किसी के बारे में पूछने के लिए उपयोग होने वाला तमिल वाक्य चुनें।',
        },
        questionImageUrl: '/images/asking-question.svg',
        questionAudioUrl: '/audio/greet-3-question.mp3',
        options: ['நீங்கள் எப்படி இருக்கிறீர்கள்?', 'அது எங்கே?', 'பின்னர் சந்திப்போம்'],
        optionsI18n: [
          { english: 'How are you?', tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்?', hindi: 'आप कैसे हैं?' },
          { english: 'Where is it?', tamil: 'அது எங்கே?', hindi: 'यह कहाँ है?' },
          { english: 'See you later', tamil: 'பின்னர் சந்திப்போம்', hindi: 'फिर मिलेंगे' },
        ],
        correctAnswer: 0,
        hint: 'இது நலன்/உணர்வுகளைப் பற்றிய கேள்வி.',
        hintI18n: {
          english: 'It is a question about feelings.',
          tamil: 'இது நலன்/உணர்வுகளைப் பற்றிய கேள்வி.',
          hindi: 'यह हाल-चाल (भावनाओं) के बारे में सवाल है।',
        },
        explanation: '"நீங்கள் எப்படி இருக்கிறீர்கள்?" என்று ஒருவர் நலன் கேட்கலாம்.',
        explanationI18n: {
          english: '"நீங்கள் எப்படி இருக்கிறீர்கள்?" (Neengal eppadi irukkeergal?) is used to ask about someone in Tamil.',
          tamil: '"நீங்கள் எப்படி இருக்கிறீர்கள்?" என்று ஒருவர் நலன் கேட்கலாம்.',
          hindi: '"நீங்கள் எப்படி இருக்கிறீர்கள்?" (Neengal eppadi irukkeergal?) तमिल में किसी का हाल-चाल पूछने के लिए कहा जाता है।',
        },
        explanationAudioUrl: '/audio/greet-3-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'சிறப்பாக செய்தீர்கள்! அது ஒருவரின் நலன் கேட்கும் கேள்வி.',
          correctAudioUrl: '/audio/greet-3-correct.mp3',
          incorrect: 'நல்ல முயற்சி. நலன்/உணர்வுகளைப் பற்றிய கேள்வியை முயற்சிக்கவும்.',
          incorrectAudioUrl: '/audio/greet-3-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Nice work! That question checks on someone.',
            tamil: 'சிறப்பாக செய்தீர்கள்! அது ஒருவரின் நலன் கேட்கும் கேள்வி.',
            hindi: 'बहुत अच्छा! यह किसी का हाल-चाल पूछने वाला सवाल है।',
          },
          incorrect: {
            english: 'Good effort. Try the question about feelings.',
            tamil: 'நல்ல முயற்சி. நலன்/உணர்வுகளைப் பற்றிய கேள்வியை முயற்சிக்கவும்.',
            hindi: 'अच्छी कोशिश। हाल-चाल वाला सवाल चुनें।',
          },
        },
        position: 2,
      },
      {
        id: 'greet-ta-4',
        type: 'short_answer',
        question: 'ஒரு எளிய தமிழ் வாழ்த்தை சொல்லவும் அல்லது டைப் செய்யவும்.',
        questionI18n: {
          english: 'Say or type a simple greeting in Tamil.',
          tamil: 'ஒரு எளிய தமிழ் வாழ்த்தை சொல்லவும் அல்லது டைப் செய்யவும்.',
          hindi: 'एक सरल तमिल अभिवादन बोलें या टाइप करें।',
        },
        questionImageUrl: '/images/type-greeting.svg',
        questionAudioUrl: '/audio/greet-4-question.mp3',
        correctAnswer: 'வணக்கம்',
        correctAnswerI18n: {
          english: 'Vanakkam',
          tamil: 'வணக்கம்',
          hindi: 'वणक्कम',
        },
        hint: '"வணக்கம்" என்று முயற்சிக்கவும்.',
        hintI18n: {
          english: 'Try "வணக்கம்" (Vanakkam).',
          tamil: '"வணக்கம்" என்று முயற்சிக்கவும்.',
          hindi: '"வணக்கம்" (Vanakkam) कहकर देखें।',
        },
        explanation: '"வணக்கம்" என்பது எளிய, நட்பான வாழ்த்து.',
        explanationI18n: {
          english: '"வணக்கம்" (Vanakkam) is a simple, friendly greeting in Tamil.',
          tamil: '"வணக்கம்" என்பது எளிய, நட்பான வாழ்த்து.',
          hindi: '"வணக்கம்" (Vanakkam) तमिल में एक सरल और दोस्ताना अभिवादन है।',
        },
        explanationAudioUrl: '/audio/greet-4-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 35,
        feedback: {
          correct: 'அருமையான வாழ்த்து!',
          correctAudioUrl: '/audio/greet-4-correct.mp3',
          incorrect: 'நல்ல முயற்சி. எளிய வாழ்த்து "வணக்கம்".',
          incorrectAudioUrl: '/audio/greet-4-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great greeting!',
            tamil: 'அருமையான வாழ்த்து!',
            hindi: 'बहुत अच्छा अभिवादन!',
          },
          incorrect: {
            english: 'Nice try. A simple Tamil greeting is "வணக்கம்" (Vanakkam).',
            tamil: 'நல்ல முயற்சி. எளிய வாழ்த்து "வணக்கம்".',
            hindi: 'अच्छी कोशिश। एक सरल तमिल अभिवादन "வணக்கம்" (Vanakkam) है।',
          },
        },
        position: 3,
      },
      {
        id: 'greet-ta-5',
        type: 'multiple_choice',
        question: '"நீங்கள் எப்படி இருக்கிறீர்கள்?" என்பதற்கு சிறந்த பதிலைத் தேர்ந்தெடுக்கவும்.',
        questionI18n: {
          english: 'Pick the best reply to "நீங்கள் எப்படி இருக்கிறீர்கள்?" (How are you?)',
          tamil: '"நீங்கள் எப்படி இருக்கிறீர்கள்?" என்பதற்கு சிறந்த பதிலைத் தேர்ந்தெடுக்கவும்.',
          hindi: '"நீங்கள் எப்படி இருக்கிறீர்கள்?" (आप कैसे हैं?) का सबसे अच्छा जवाब चुनें।',
        },
        questionImageUrl: '/images/responding-greeting.svg',
        questionAudioUrl: '/audio/greet-5-question.mp3',
        options: ['நான் நன்றாக இருக்கிறேன், நன்றி.', 'நீலம்.', 'வீட்டில்.'],
        optionsI18n: [
          { english: 'I am fine, thank you.', tamil: 'நான் நன்றாக இருக்கிறேன், நன்றி.', hindi: 'मैं ठीक हूँ, धन्यवाद।' },
          { english: 'Blue.', tamil: 'நீலம்.', hindi: 'नीला।' },
          { english: 'At home.', tamil: 'வீட்டில்.', hindi: 'घर पर।' },
        ],
        correctAnswer: 0,
        hint: 'இது மரியாதையான, முழுமையான பதில்.',
        hintI18n: {
          english: 'It is a polite, full reply.',
          tamil: 'இது மரியாதையான, முழுமையான பதில்.',
          hindi: 'यह एक शिष्ट और पूरा जवाब है।',
        },
        explanation: '"நான் நன்றாக இருக்கிறேன், நன்றி." என்பது மரியாதையான பதில்.',
        explanationI18n: {
          english: '"நான் நன்றாக இருக்கிறேன், நன்றி." (Naan nandraaga irukkirein, nandri) is a polite response.',
          tamil: '"நான் நன்றாக இருக்கிறேன், நன்றி." என்பது மரியாதையான பதில்.',
          hindi: '"நான் நன்றாக இருக்கிறேன், நன்றி." (Naan nandraaga irukkirein, nandri) एक शिष्ट उत्तर है।',
        },
        explanationAudioUrl: '/audio/greet-5-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 40,
        feedback: {
          correct: 'சிறந்த பதில்!',
          correctAudioUrl: '/audio/greet-5-correct.mp3',
          incorrect: 'நல்ல முயற்சி. மரியாதையான முழுப் பதிலைத் தேர்வுசெய்யவும்.',
          incorrectAudioUrl: '/audio/greet-5-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Excellent response!',
            tamil: 'சிறந்த பதில்!',
            hindi: 'बहुत बढ़िया जवाब!',
          },
          incorrect: {
            english: 'Good effort. Choose the polite full reply.',
            tamil: 'நல்ல முயற்சி. மரியாதையான முழுப் பதிலைத் தேர்வுசெய்யவும்.',
            hindi: 'अच्छी कोशिश। शिष्ट और पूरा जवाब चुनें।',
          },
        },
        position: 4,
      },
    ],
  },

  'lesson-vocabulary-tamil': {
    _id: 'lesson-vocabulary-tamil',
    title: 'அடிப்படை சொற்கள்',
    titleI18n: {
      english: 'Basic Words',
      tamil: 'அடிப்படை சொற்கள்',
      hindi: 'मूल शब्द',
    },
    textContent:
      'அன்றாட பொருட்களுக்கான எளிய தமிழ் சொற்களை கற்றுக்கொள்வோம்.\n\nகுறிப்பு: நீளமான சொற்களை அசைகளாக பிரிக்கவும்.\n\nசொல்லை சொல்லி, அந்தப் பொருளை காட்டுங்கள்.\n\nஒவ்வொரு சொல்லையும் மெதுவாக மீண்டும் சொல்லுங்கள்.',
    textContentI18n: {
      english:
        'Let\u2019s learn simple Tamil words for everyday items.\n\nTip: Break longer words into parts (syllables).\n\nSay the word and point to the item.\n\nRepeat each word slowly to build confidence.',
      tamil:
        'அன்றாட பொருட்களுக்கான எளிய தமிழ் சொற்களை கற்றுக்கொள்வோம்.\n\nகுறிப்பு: நீளமான சொற்களை அசைகளாக பிரிக்கவும்.\n\nசொல்லை சொல்லி, அந்தப் பொருளை காட்டுங்கள்.\n\nஒவ்வொரு சொல்லையும் மெதுவாக மீண்டும் சொல்லுங்கள்.',
      hindi:
        'आइए रोज़मर्रा की चीज़ों के लिए सरल तमिल शब्द सीखें।\n\nटिप: लंबे शब्दों को भागों में तोड़ें।\n\nशब्द बोलें और वस्तु की ओर इशारा करें।\n\nहर शब्द को धीरे-धीरे दोहराएँ।',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/speech.svg', description: 'ஒவ்வொரு சொல்லையும் தெளிவாக சொல்லுங்கள்.' },
      { iconUrl: '/visuals/sun.svg', description: 'உங்கள் சுற்றிலுள்ள பொருட்களுடன் பயிற்சி செய்யுங்கள்.' },
    ],
    highlights: [
      { id: 'h3', phrase: 'எளிய சொற்கள்', emphasisType: 'bold' },
      { id: 'h4', phrase: 'மீண்டும் சொல்லுங்கள்', emphasisType: 'underline' },
    ],
    visualAids: [
      {
        id: 'v3',
        imageUrl: '/visuals/sun.svg',
        altText: 'Sun icon',
        relatedPhrase: 'மீண்டும்',
        placement: 'side',
      },
    ],
    interactions: [
      {
        id: 'vocab-ta-1',
        type: 'multiple_choice',
        question: 'நீங்கள் உட்காரக்கூடிய பொருளுக்கு பொருந்தும் தமிழ் சொல் எது?',
        questionI18n: {
          english: 'Which Tamil word matches something you can sit on?',
          tamil: 'நீங்கள் உட்காரக்கூடிய பொருளுக்கு பொருந்தும் தமிழ் சொல் எது?',
          hindi: 'जिस चीज़ पर आप बैठ सकते हैं, उसका तमिल शब्द कौन सा है?',
        },
        questionImageUrl: '/images/chair.svg',
        questionAudioUrl: '/audio/vocab-1-question.mp3',
        options: ['நாற்காலி', 'ஆப்பிள்', 'மழை'],
        optionsI18n: [
          { english: 'Chair (Naarkaali)', tamil: 'நாற்காலி', hindi: 'कुर्सी (नार्कालि)' },
          { english: 'Apple (Aappil)', tamil: 'ஆப்பிள்', hindi: 'सेब (आप्पिल)' },
          { english: 'Rain (Mazhai)', tamil: 'மழை', hindi: 'बारिश (मऴै)' },
        ],
        correctAnswer: 0,
        hint: 'மெதுவாக சொல்லிப் பாருங்கள்: நாற்-கா-லி.',
        hintI18n: {
          english: 'Say it slowly: Naar-kaa-li.',
          tamil: 'மெதுவாக சொல்லிப் பாருங்கள்: நாற்-கா-லி.',
          hindi: 'धीरे-धीरे बोलकर देखें: नार्-का-लि.',
        },
        explanation: 'நாற்காலி என்பது உட்கார பயன்படும் பொருள்.',
        explanationI18n: {
          english: 'நாற்காலி (Naarkaali) is furniture you sit on — it means "chair" in Tamil.',
          tamil: 'நாற்காலி என்பது உட்கார பயன்படும் பொருள்.',
          hindi: 'நாற்காலி (Naarkaali) वह फर्नीचर है जिस पर आप बैठते हैं — तमिल में "chair" का मतलब।',
        },
        explanationAudioUrl: '/audio/vocab-1-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'ஆம்! நாற்காலியில் உட்காரலாம்.',
          correctAudioUrl: '/audio/vocab-1-correct.mp3',
          incorrect: 'நல்ல முயற்சி. உட்கார பயன்படும் பொருளைத் தேர்வுசெய்யவும்.',
          incorrectAudioUrl: '/audio/vocab-1-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Yes! நாற்காலி (Naarkaali) means chair — something you sit on.',
            tamil: 'ஆம்! நாற்காலியில் உட்காரலாம்.',
            hindi: 'हाँ! நாற்காலி (Naarkaali) मतलब कुर्सी — बैठने की चीज़।',
          },
          incorrect: {
            english: 'Good effort. Try the word for furniture you sit on.',
            tamil: 'நல்ல முயற்சி. உட்கார பயன்படும் பொருளைத் தேர்வுசெய்யவும்.',
            hindi: 'अच्छी कोशिश। बैठने वाली चीज़ का शब्द चुनें।',
          },
        },
        position: 0,
      },
      {
        id: 'vocab-ta-2',
        type: 'multiple_choice',
        question: 'நீங்கள் சாப்பிடக்கூடிய பொருளுக்கு பொருந்தும் தமிழ் சொல் எது?',
        questionI18n: {
          english: 'Which Tamil word matches something you can eat?',
          tamil: 'நீங்கள் சாப்பிடக்கூடிய பொருளுக்கு பொருந்தும் தமிழ் சொல் எது?',
          hindi: 'जिस चीज़ को आप खा सकते हैं, उसका तमिल शब्द कौन सा है?',
        },
        questionImageUrl: '/images/apple.svg',
        questionAudioUrl: '/audio/vocab-2-question.mp3',
        options: ['ஆப்பிள்', 'நாற்காலி', 'புத்தகம்'],
        optionsI18n: [
          { english: 'Apple (Aappil)', tamil: 'ஆப்பிள்', hindi: 'सेब (आप्पिल)' },
          { english: 'Chair (Naarkaali)', tamil: 'நாற்காலி', hindi: 'कुर्सी (नार्कालि)' },
          { english: 'Book (Puthagam)', tamil: 'புத்தகம்', hindi: 'किताब (पुत्तगम)' },
        ],
        correctAnswer: 0,
        hint: 'இது ஒரு பழம்.',
        hintI18n: {
          english: 'It is a fruit.',
          tamil: 'இது ஒரு பழம்.',
          hindi: 'यह एक फल है।',
        },
        explanation: 'ஆப்பிள் ஒரு சாப்பிடக்கூடிய பழம்.',
        explanationI18n: {
          english: 'ஆப்பிள் (Aappil) is a fruit you can eat — it means "apple" in Tamil.',
          tamil: 'ஆப்பிள் ஒரு சாப்பிடக்கூடிய பழம்.',
          hindi: 'ஆப்பிள் (Aappil) एक फल है जिसे आप खा सकते हैं — तमिल में "apple" का मतलब।',
        },
        explanationAudioUrl: '/audio/vocab-2-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'சரி! ஆப்பிளை சாப்பிடலாம்.',
          correctAudioUrl: '/audio/vocab-2-correct.mp3',
          incorrect: 'நல்ல முயற்சி. பழத்தைத் தேர்வுசெய்யவும்.',
          incorrectAudioUrl: '/audio/vocab-2-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Nice! ஆப்பிள் (Aappil) means apple — something you eat.',
            tamil: 'சரி! ஆப்பிளை சாப்பிடலாம்.',
            hindi: 'सही! ஆப்பிள் (Aappil) मतलब सेब — खाने की चीज़।',
          },
          incorrect: {
            english: 'Nice try. Look for the fruit.',
            tamil: 'நல்ல முயற்சி. பழத்தைத் தேர்வுசெய்யவும்.',
            hindi: 'अच्छी कोशिश। फल चुनें।',
          },
        },
        position: 1,
      },
      {
        id: 'vocab-ta-3',
        type: 'click',
        question: 'நீங்கள் படிக்கக்கூடிய பொருளின் தமிழ் சொல்லை கிளிக் செய்யவும்.',
        questionI18n: {
          english: 'Click the Tamil word for something you can read.',
          tamil: 'நீங்கள் படிக்கக்கூடிய பொருளின் தமிழ் சொல்லை கிளிக் செய்யவும்.',
          hindi: 'जिस चीज़ को आप पढ़ सकते हैं, उसका तमिल शब्द चुनें।',
        },
        questionImageUrl: '/images/book.svg',
        questionAudioUrl: '/audio/vocab-3-question.mp3',
        options: ['புத்தகம்', 'மேகம்', 'செருப்பு'],
        optionsI18n: [
          { english: 'Book (Puthagam)', tamil: 'புத்தகம்', hindi: 'किताब (पुत्तगम)' },
          { english: 'Cloud (Megam)', tamil: 'மேகம்', hindi: 'बादल (मेगम)' },
          { english: 'Shoe (Seruppu)', tamil: 'செருப்பு', hindi: 'जूता (सेरुप्पु)' },
        ],
        correctAnswer: 0,
        hint: 'இதைத் திறந்தால் வார்த்தைகளை பார்க்கலாம்.',
        hintI18n: {
          english: 'You open it to see words.',
          tamil: 'இதைத் திறந்தால் வார்த்தைகளை பார்க்கலாம்.',
          hindi: 'इसे खोलने पर शब्द दिखते हैं।',
        },
        explanation: 'புத்தகம் என்பது நீங்கள் படிக்கும் பொருள்.',
        explanationI18n: {
          english: 'புத்தகம் (Puthagam) is something you read — it means "book" in Tamil.',
          tamil: 'புத்தகம் என்பது நீங்கள் படிக்கும் பொருள்.',
          hindi: 'புத்தகம் (Puthagam) वह चीज़ है जिसे आप पढ़ते हैं — तमिल में "book" का मतलब।',
        },
        explanationAudioUrl: '/audio/vocab-3-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'சிறந்த தேர்வு! புத்தகம் படிப்பதற்கு.',
          correctAudioUrl: '/audio/vocab-3-correct.mp3',
          incorrect: 'நல்ல முயற்சி. படிக்கக்கூடிய பொருளை முயற்சிக்கவும்.',
          incorrectAudioUrl: '/audio/vocab-3-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great choice! புத்தகம் (Puthagam) means book — for reading.',
            tamil: 'சிறந்த தேர்வு! புத்தகம் படிப்பதற்கு.',
            hindi: 'बहुत अच्छा! புத்தகம் (Puthagam) मतलब किताब — पढ़ने के लिए।',
          },
          incorrect: {
            english: 'Good effort. Try the item you can read.',
            tamil: 'நல்ல முயற்சி. படிக்கக்கூடிய பொருளை முயற்சிக்கவும்.',
            hindi: 'अच्छी कोशिश। पढ़ने वाली चीज़ चुनें।',
          },
        },
        position: 2,
      },
      {
        id: 'vocab-ta-4',
        type: 'short_answer',
        question: 'நீங்கள் வாழும் இடத்துக்கான தமிழ் சொல்லை சொல்லவும் அல்லது டைப் செய்யவும்.',
        questionI18n: {
          english: 'Say or type the Tamil word for a place you live.',
          tamil: 'நீங்கள் வாழும் இடத்துக்கான தமிழ் சொல்லை சொல்லவும் அல்லது டைப் செய்யவும்.',
          hindi: 'जहाँ आप रहते हैं, उसके लिए तमिल शब्द बोलें या टाइप करें।',
        },
        questionImageUrl: '/images/home.svg',
        questionAudioUrl: '/audio/vocab-4-question.mp3',
        correctAnswer: 'வீடு',
        correctAnswerI18n: {
          english: 'Veedu (Home)',
          tamil: 'வீடு',
          hindi: 'वीडु (घर)',
        },
        hint: 'நீங்கள் தூங்கும் இடத்தை நினைத்துப் பாருங்கள்.',
        hintI18n: {
          english: 'Think about where you sleep.',
          tamil: 'நீங்கள் தூங்கும் இடத்தை நினைத்துப் பாருங்கள்.',
          hindi: 'जहाँ आप सोते हैं, उसके बारे में सोचें।',
        },
        explanation: 'வீடு என்பது நீங்கள் வாழும் இடம்.',
        explanationI18n: {
          english: 'வீடு (Veedu) means "home" — the place you live.',
          tamil: 'வீடு என்பது நீங்கள் வாழும் இடம்.',
          hindi: 'வீடு (Veedu) का मतलब "घर" है — जहाँ आप रहते हैं।',
        },
        explanationAudioUrl: '/audio/vocab-4-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 35,
        feedback: {
          correct: 'அருமையான சொல்!',
          correctAudioUrl: '/audio/vocab-4-correct.mp3',
          incorrect: 'நல்ல முயற்சி. தமிழ் சொல் "வீடு".',
          incorrectAudioUrl: '/audio/vocab-4-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great word!',
            tamil: 'அருமையான சொல்!',
            hindi: 'बहुत अच्छा शब्द!',
          },
          incorrect: {
            english: 'Nice try. The Tamil word is "வீடு" (Veedu).',
            tamil: 'நல்ல முயற்சி. தமிழ் சொல் "வீடு".',
            hindi: 'अच्छी कोशिश। तमिल शब्द "வீடு" (Veedu) है।',
          },
        },
        position: 3,
      },
      {
        id: 'vocab-ta-5',
        type: 'multiple_choice',
        question: 'உங்கள் கால்களில் அணிவதைக் குறிக்கும் தமிழ் சொல்லைத் தேர்ந்தெடுக்கவும்.',
        questionI18n: {
          english: 'Pick the Tamil word for something you wear on your feet.',
          tamil: 'உங்கள் கால்களில் அணிவதைக் குறிக்கும் தமிழ் சொல்லைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'अपने पैरों में पहनने वाली चीज़ का तमिल शब्द चुनें।',
        },
        questionImageUrl: '/images/shoe.svg',
        questionAudioUrl: '/audio/vocab-5-question.mp3',
        options: ['செருப்பு', 'இலை', 'மேகம்'],
        optionsI18n: [
          { english: 'Shoe (Seruppu)', tamil: 'செருப்பு', hindi: 'जूता (सेरुप्पु)' },
          { english: 'Leaf (Ilai)', tamil: 'இலை', hindi: 'पत्ता (इलै)' },
          { english: 'Cloud (Megam)', tamil: 'மேகம்', hindi: 'बादल (मेगम)' },
        ],
        correctAnswer: 0,
        hint: 'இதைக் காலில் அணிவார்கள்.',
        hintI18n: {
          english: 'You wear it on your feet.',
          tamil: 'இதைக் காலில் அணிவார்கள்.',
          hindi: 'इसे आप पैरों में पहनते हैं।',
        },
        explanation: 'செருப்பு காலில் அணியப்படும்.',
        explanationI18n: {
          english: 'செருப்பு (Seruppu) means "shoe" — it is worn on your foot.',
          tamil: 'செருப்பு காலில் அணியப்படும்.',
          hindi: 'செருப்பு (Seruppu) का मतलब "जूता" है — पैर में पहना जाता है।',
        },
        explanationAudioUrl: '/audio/vocab-5-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 40,
        feedback: {
          correct: 'சிறப்பு! செருப்பு காலில் அணிவார்கள்.',
          correctAudioUrl: '/audio/vocab-5-correct.mp3',
          incorrect: 'நல்ல முயற்சி. காலில் அணியக்கூடிய பொருளைத் தேர்வுசெய்யவும்.',
          incorrectAudioUrl: '/audio/vocab-5-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Excellent! செருப்பு (Seruppu) means shoe — goes on your foot.',
            tamil: 'சிறப்பு! செருப்பு காலில் அணிவார்கள்.',
            hindi: 'बहुत बढ़िया! செருப்பு (Seruppu) मतलब जूता — पैर में पहना जाता है।',
          },
          incorrect: {
            english: 'Good effort. Choose the thing you wear on your feet.',
            tamil: 'நல்ல முயற்சி. காலில் அணியக்கூடிய பொருளைத் தேர்வுசெய்யவும்.',
            hindi: 'अच्छी कोशिश। पैरों में पहनने वाली चीज़ चुनें।',
          },
        },
        position: 4,
      },
    ],
  },

  'lesson-numbers-tamil': {
    _id: 'lesson-numbers-tamil',
    title: 'எண்கள்',
    titleI18n: {
      english: 'Numbers',
      tamil: 'எண்கள்',
      hindi: 'संख्याएँ',
    },
    textContent:
      'தமிழில் ஒன்று முதல் ஐந்து வரை எண்ணுங்கள்.\n\nகுறிப்பு: சில சொற்கள் குறுகியவை, சில நீளமானவை. மெதுவாக செய்யுங்கள்.\n\nஒவ்வொரு எண்ணுக்கும் ஒரு நிறத்தை சொல்லுங்கள்.\n\nஎண்களையும் நிறங்களையும் சேர்த்து கற்றலை மகிழ்ச்சியாக்குங்கள்.',
    textContentI18n: {
      english:
        'Count from one to five in Tamil.\n\nTip: Some words are short, some are long. Take your time.\n\nName a colour for each number.\n\nMix numbers and colours to make learning fun.',
      tamil:
        'தமிழில் ஒன்று முதல் ஐந்து வரை எண்ணுங்கள்.\n\nகுறிப்பு: சில சொற்கள் குறுகியவை, சில நீளமானவை. மெதுவாக செய்யுங்கள்.\n\nஒவ்வொரு எண்ணுக்கும் ஒரு நிறத்தை சொல்லுங்கள்.\n\nஎண்களையும் நிறங்களையும் சேர்த்து கற்றலை மகிழ்ச்சியாக்குங்கள்.',
      hindi:
        'तमिल में 1 से 5 तक गिनें।\n\nटिप: कुछ शब्द छोटे होते हैं, कुछ लंबे। समय लेकर करें।\n\nहर संख्या के लिए एक रंग बताइए।\n\nसंख्याएँ और रंग मिलाकर सीखना मज़ेदार बनाइए।',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/sun.svg', description: 'நினைவில் வைக்க பிரகாசமான நிறங்களைப் பயன்படுத்துங்கள்.' },
      { iconUrl: '/visuals/wave.svg', description: 'கற்கும்போது விரல்களில் எண்ணுங்கள்.' },
    ],
    highlights: [
      { id: 'h5', phrase: 'ஒன்று முதல் ஐந்து வரை எண்ணுங்கள்', emphasisType: 'background' },
      { id: 'h6', phrase: 'நிறங்கள்', emphasisType: 'bold' },
    ],
    visualAids: [
      {
        id: 'v4',
        imageUrl: '/visuals/wave.svg',
        altText: 'Counting hand icon',
        relatedPhrase: 'எண்ணுங்கள்',
        placement: 'inline',
      },
    ],
    interactions: [
      {
        id: 'numbers-ta-1',
        type: 'click',
        question: '"இரண்டு" (2) க்கு அடுத்ததாக வரும் தமிழ் எண்ணை கிளிக் செய்யவும்.',
        questionI18n: {
          english: 'Click the Tamil number that comes after "இரண்டு" (2).',
          tamil: '"இரண்டு" (2) க்கு அடுத்ததாக வரும் தமிழ் எண்ணை கிளிக் செய்யவும்.',
          hindi: '"इरण्डु" (2) के बाद आने वाली तमिल संख्या चुनें।',
        },
        questionImageUrl: '/images/number-sequence.svg',
        questionAudioUrl: '/audio/numbers-1-question.mp3',
        options: ['ஒன்று', 'மூன்று', 'ஐந்து'],
        optionsI18n: [
          { english: 'One (Ondru)', tamil: 'ஒன்று', hindi: 'एक (ओंड्रु)' },
          { english: 'Three (Moondru)', tamil: 'மூன்று', hindi: 'तीन (मूंड्रु)' },
          { english: 'Five (Ainthu)', tamil: 'ஐந்து', hindi: 'पाँच (ऐंतु)' },
        ],
        correctAnswer: 1,
        hint: 'மேலே எண்ணுங்கள்: ஒன்று, இரண்டு, மூன்று.',
        hintI18n: {
          english: 'Count upward: Ondru (1), Irandu (2), Moondru (3).',
          tamil: 'மேலே எண்ணுங்கள்: ஒன்று, இரண்டு, மூன்று.',
          hindi: 'आगे गिनें: ओंड्रु (1), इरण्डु (2), मूंड्रु (3)।',
        },
        explanation: '"இரண்டு" (2) க்கு அடுத்த தமிழ் எண் "மூன்று" (3).',
        explanationI18n: {
          english: 'The Tamil number after "இரண்டு" (2) is "மூன்று" (3).',
          tamil: '"இரண்டு" (2) க்கு அடுத்த தமிழ் எண் "மூன்று" (3).',
          hindi: '"இரண்டு" (2) के बाद तमिल संख्या "மூன்று" (3) आती है।',
        },
        explanationAudioUrl: '/audio/numbers-1-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'சிறப்பு! "இரண்டு" க்கு பின் "மூன்று" வருகிறது.',
          correctAudioUrl: '/audio/numbers-1-correct.mp3',
          incorrect: 'நல்ல முயற்சி. ஒன்று, இரண்டு, மூன்று என்று எண்ணுங்கள்.',
          incorrectAudioUrl: '/audio/numbers-1-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great job! "மூன்று" (Moondru) comes after "இரண்டு" (Irandu).',
            tamil: 'சிறப்பு! "இரண்டு" க்கு பின் "மூன்று" வருகிறது.',
            hindi: 'बहुत बढ़िया! "இரண்டு" (Irandu) के बाद "மூன்று" (Moondru) आता है।',
          },
          incorrect: {
            english: 'Good effort. Count up: Ondru, Irandu, Moondru.',
            tamil: 'நல்ல முயற்சி. ஒன்று, இரண்டு, மூன்று என்று எண்ணுங்கள்.',
            hindi: 'अच्छी कोशिश। ओंड्रु, इरण्डु, मूंड्रु गिनें।',
          },
        },
        position: 0,
      },
      {
        id: 'numbers-ta-2',
        type: 'multiple_choice',
        question: '"நான்கு" (4) க்கு அடுத்த தமிழ் எண் எது?',
        questionI18n: {
          english: 'Which Tamil number comes after "நான்கு" (4)?',
          tamil: '"நான்கு" (4) க்கு அடுத்த தமிழ் எண் எது?',
          hindi: '"नान्गु" (4) के बाद कौन सी तमिल संख्या आती है?',
        },
        questionImageUrl: '/images/counting-4-5.svg',
        questionAudioUrl: '/audio/numbers-2-question.mp3',
        options: ['மூன்று', 'ஐந்து', 'ஆறு'],
        optionsI18n: [
          { english: 'Three (Moondru)', tamil: 'மூன்று', hindi: 'तीन (मूंड्रु)' },
          { english: 'Five (Ainthu)', tamil: 'ஐந்து', hindi: 'पाँच (ऐंतु)' },
          { english: 'Six (Aaru)', tamil: 'ஆறு', hindi: 'छह (आरु)' },
        ],
        correctAnswer: 1,
        hint: 'முன்னால் எண்ணுங்கள்: நான்கு, ஐந்து.',
        hintI18n: {
          english: 'Count forward: Naangu (4), Ainthu (5).',
          tamil: 'முன்னால் எண்ணுங்கள்: நான்கு, ஐந்து.',
          hindi: 'आगे गिनें: नान्गु (4), ऐंतु (5)।',
        },
        explanation: '"நான்கு" (4) க்கு அடுத்த தமிழ் எண் "ஐந்து" (5).',
        explanationI18n: {
          english: 'The Tamil number after "நான்கு" (4) is "ஐந்து" (5).',
          tamil: '"நான்கு" (4) க்கு அடுத்த தமிழ் எண் "ஐந்து" (5).',
          hindi: '"நான்கு" (4) के बाद तमिल संख्या "ஐந்து" (5) आती है।',
        },
        explanationAudioUrl: '/audio/numbers-2-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'சரி! "நான்கு" க்கு பின் "ஐந்து" வருகிறது.',
          correctAudioUrl: '/audio/numbers-2-correct.mp3',
          incorrect: 'நல்ல முயற்சி. நான்கு, ஐந்து என்று எண்ணிப் பாருங்கள்.',
          incorrectAudioUrl: '/audio/numbers-2-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Nice! "ஐந்து" (Ainthu) comes after "நான்கு" (Naangu).',
            tamil: 'சரி! "நான்கு" க்கு பின் "ஐந்து" வருகிறது.',
            hindi: 'सही! "நான்கு" (Naangu) के बाद "ஐந்து" (Ainthu) आता है।',
          },
          incorrect: {
            english: 'Nice try. Count forward to find Ainthu (5).',
            tamil: 'நல்ல முயற்சி. நான்கு, ஐந்து என்று எண்ணிப் பாருங்கள்.',
            hindi: 'अच्छी कोशिश। नान्गु, ऐंतु गिनकर देखें।',
          },
        },
        position: 1,
      },
      {
        id: 'numbers-ta-3',
        type: 'multiple_choice',
        question: 'மூன்று பொருட்கள் உள்ள தொகுப்பு எது?',
        questionI18n: {
          english: 'Which set has three items?',
          tamil: 'மூன்று பொருட்கள் உள்ள தொகுப்பு எது?',
          hindi: 'किस समूह में तीन वस्तुएँ हैं?',
        },
        questionImageUrl: '/images/counting-stars.svg',
        questionAudioUrl: '/audio/numbers-3-question.mp3',
        options: ['★★★', '★★', '★★★★'],
        correctAnswer: 0,
        hint: 'நட்சத்திரங்களை எண்ணுங்கள்.',
        hintI18n: {
          english: 'Count the stars.',
          tamil: 'நட்சத்திரங்களை எண்ணுங்கள்.',
          hindi: 'तारों को गिनें।',
        },
        explanation: 'மூன்று நட்சத்திரங்கள் என்றால் "மூன்று" (3) பொருட்கள்.',
        explanationI18n: {
          english: 'Three stars means "மூன்று" (Moondru) = 3 items.',
          tamil: 'மூன்று நட்சத்திரங்கள் என்றால் "மூன்று" (3) பொருட்கள்.',
          hindi: 'तीन तारे मतलब "மூன்று" (Moondru) = 3 वस्तुएँ।',
        },
        explanationAudioUrl: '/audio/numbers-3-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'சிறந்த எண்ணல்!',
          correctAudioUrl: '/audio/numbers-3-correct.mp3',
          incorrect: 'நல்ல முயற்சி. நட்சத்திரங்களை கவனமாக எண்ணுங்கள்.',
          incorrectAudioUrl: '/audio/numbers-3-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great counting!',
            tamil: 'சிறந்த எண்ணல்!',
            hindi: 'बहुत अच्छी गिनती!',
          },
          incorrect: {
            english: 'Good effort. Count the stars carefully.',
            tamil: 'நல்ல முயற்சி. நட்சத்திரங்களை கவனமாக எண்ணுங்கள்.',
            hindi: 'अच्छी कोशिश। तारों को ध्यान से गिनें।',
          },
        },
        position: 2,
      },
      {
        id: 'numbers-ta-4',
        type: 'short_answer',
        question: '"ஒன்று" (1) க்கு அடுத்த தமிழ் எண்ணை சொல்லவும் அல்லது டைப் செய்யவும்.',
        questionI18n: {
          english: 'Say or type the Tamil number after "ஒன்று" (1).',
          tamil: '"ஒன்று" (1) க்கு அடுத்த தமிழ் எண்ணை சொல்லவும் அல்லது டைப் செய்யவும்.',
          hindi: '"ओंड्रु" (1) के बाद आने वाली तमिल संख्या बोलें या टाइप करें।',
        },
        questionImageUrl: '/images/number-1-2.svg',
        questionAudioUrl: '/audio/numbers-4-question.mp3',
        correctAnswer: 'இரண்டு',
        correctAnswerI18n: {
          english: 'Irandu (Two)',
          tamil: 'இரண்டு',
          hindi: 'इरण्डु (दो)',
        },
        hint: 'எண்ணுங்கள்: ஒன்று, இரண்டு.',
        hintI18n: {
          english: 'Count: Ondru (1), Irandu (2).',
          tamil: 'எண்ணுங்கள்: ஒன்று, இரண்டு.',
          hindi: 'गिनें: ओंड्रु (1), इरण्डु (2)।',
        },
        explanation: '"ஒன்று" (1) க்கு அடுத்த தமிழ் எண் "இரண்டு" (2).',
        explanationI18n: {
          english: 'The Tamil number after "ஒன்று" (1) is "இரண்டு" (2).',
          tamil: '"ஒன்று" (1) க்கு அடுத்த தமிழ் எண் "இரண்டு" (2).',
          hindi: '"ओंड்रु" (1) के बाद तमिल संख्या "இரண்டு" (2) आती है।',
        },
        explanationAudioUrl: '/audio/numbers-4-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 35,
        feedback: {
          correct: 'ஆம்! பதில் "இரண்டு".',
          correctAudioUrl: '/audio/numbers-4-correct.mp3',
          incorrect: 'நல்ல முயற்சி. பதில் "இரண்டு".',
          incorrectAudioUrl: '/audio/numbers-4-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Yes! The answer is "இரண்டு" (Irandu).',
            tamil: 'ஆம்! பதில் "இரண்டு".',
            hindi: 'हाँ! जवाब "இரண்டு" (Irandu) है।',
          },
          incorrect: {
            english: 'Nice try. The answer is "இரண்டு" (Irandu).',
            tamil: 'நல்ல முயற்சி. பதில் "இரண்டு".',
            hindi: 'अच्छी कोशिश। जवाब "இரண்டு" (Irandu) है।',
          },
        },
        position: 3,
      },
      {
        id: 'numbers-ta-5',
        type: 'multiple_choice',
        question: '"ஒன்று" முதல் "மூன்று" வரை சரியான வரிசையைத் தேர்ந்தெடுக்கவும்.',
        questionI18n: {
          english: 'Choose the correct order from "ஒன்று" (1) to "மூன்று" (3).',
          tamil: '"ஒன்று" முதல் "மூன்று" வரை சரியான வரிசையைத் தேர்ந்தெடுக்கவும்.',
          hindi: '"ओंड्रु" (1) से "मूंड्रु" (3) तक सही क्रम चुनें।',
        },
        questionImageUrl: '/images/number-order.svg',
        questionAudioUrl: '/audio/numbers-5-question.mp3',
        options: ['ஒன்று, இரண்டு, மூன்று', 'ஒன்று, மூன்று, இரண்டு', 'இரண்டு, ஒன்று, மூன்று'],
        optionsI18n: [
          { english: 'Ondru, Irandu, Moondru (1, 2, 3)', tamil: 'ஒன்று, இரண்டு, மூன்று', hindi: 'ओंड्रु, इरण्डु, मूंड्रु (1, 2, 3)' },
          { english: 'Ondru, Moondru, Irandu (1, 3, 2)', tamil: 'ஒன்று, மூன்று, இரண்டு', hindi: 'ओंड्रु, मूंड्रु, इरण्डु (1, 3, 2)' },
          { english: 'Irandu, Ondru, Moondru (2, 1, 3)', tamil: 'இரண்டு, ஒன்று, மூன்று', hindi: 'इरण्डु, ओंड्रु, मूंड्रु (2, 1, 3)' },
        ],
        correctAnswer: 0,
        hint: '"ஒன்று" இலிருந்து தொடங்கி மேலே எண்ணுங்கள்.',
        hintI18n: {
          english: 'Start at "ஒன்று" (Ondru) and count up.',
          tamil: '"ஒன்று" இலிருந்து தொடங்கி மேலே எண்ணுங்கள்.',
          hindi: '"ओंड्रु" (Ondru) से शुरू करके आगे गिनें।',
        },
        explanation: 'சரியான வரிசை "ஒன்று, இரண்டு, மூன்று" (1, 2, 3).',
        explanationI18n: {
          english: 'The correct order is "ஒன்று, இரண்டு, மூன்று" (Ondru, Irandu, Moondru = 1, 2, 3).',
          tamil: 'சரியான வரிசை "ஒன்று, இரண்டு, மூன்று" (1, 2, 3).',
          hindi: 'सही क्रम "ஒன்று, இரண்டு, மூன்று" (ओंड्रु, इरण्डु, मूंड्रु = 1, 2, 3) है।',
        },
        explanationAudioUrl: '/audio/numbers-5-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 40,
        feedback: {
          correct: 'சிறந்த வரிசை!',
          correctAudioUrl: '/audio/numbers-5-correct.mp3',
          incorrect: 'நல்ல முயற்சி. "ஒன்று" இலிருந்து தொடங்கி எண்ணுங்கள்.',
          incorrectAudioUrl: '/audio/numbers-5-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Excellent ordering!',
            tamil: 'சிறந்த வரிசை!',
            hindi: 'बहुत अच्छा क्रम!',
          },
          incorrect: {
            english: 'Good effort. Start at "ஒன்று" (Ondru) and count up.',
            tamil: 'நல்ல முயற்சி. "ஒன்று" இலிருந்து தொடங்கி எண்ணுங்கள்.',
            hindi: 'अच्छी कोशिश। "ओंड्रु" (Ondru) से शुरू करके गिनें।',
          },
        },
        position: 4,
      },
    ],
  },
};

export default lessonSamplesTamil;
