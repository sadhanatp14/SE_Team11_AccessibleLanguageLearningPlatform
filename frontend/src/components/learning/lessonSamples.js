const lessonSamples = {
  'lesson-greetings': {
    _id: 'lesson-greetings',
    title: 'Greetings',
    titleI18n: {
      english: 'Greetings',
      tamil: 'வாழ்த்துகள்',
      hindi: 'अभिवादन',
    },
    textContent:
      'Hello (Hel-lo)! This lesson helps you greet someone politely.\n\nTip: If a word feels hard, break it into parts (syllables).\n\nSay "Hello" (Hel-lo) or "Hi" with a smile.\n\nAsk "How are you?" and respond with "I am good, thank you."',
    textContentI18n: {
      english:
        'Hello (Hel-lo)! This lesson helps you greet someone politely.\n\nTip: If a word feels hard, break it into parts (syllables).\n\nSay "Hello" (Hel-lo) or "Hi" with a smile.\n\nAsk "How are you?" and respond with "I am good, thank you."',
      tamil:
        'வணக்கம்! இந்தப் பாடம் மரியாதையுடன் ஒருவரை வாழ்த்த உதவும்.\n\nகுறிப்பு: ஒரு சொல் கடினமாக இருந்தால், அதை அசைகளாக பிரித்து வாசிக்கவும்.\n\nசிரிப்புடன் "வணக்கம்" அல்லது "ஹாய்" சொல்லுங்கள்.\n\n"நீங்கள் எப்படி இருக்கிறீர்கள்?" என்று கேட்டு "நான் நன்றாக இருக்கிறேன், நன்றி." என்று பதில் சொல்லுங்கள்.',
      hindi:
        'नमस्ते! यह पाठ आपको शिष्ट तरीके से अभिवादन करना सिखाता है।\n\nटिप: अगर कोई शब्द कठिन लगे, तो उसे भागों (syllables) में तोड़कर पढ़ें।\n\nमुस्कान के साथ "नमस्ते" या "हाय" कहें।\n\n"आप कैसे हैं?" पूछें और "मैं ठीक हूँ, धन्यवाद।" जवाब दें।',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/wave.svg', description: 'Wave hello (Hel-lo) with a friendly smile.' },
      { iconUrl: '/visuals/speech.svg', description: 'Use simple greeting phrases.' },
    ],
    highlights: [
      { id: 'h1', phrase: 'Hello', emphasisType: 'background', color: '#ffe7a3', position: 0 },
      { id: 'h2', phrase: 'How are you?', emphasisType: 'underline' },
    ],
    visualAids: [
      {
        id: 'v1',
        imageUrl: '/visuals/wave.svg',
        altText: 'Waving hand icon',
        relatedPhrase: 'Hello',
        placement: 'inline',
      },
      {
        id: 'v2',
        imageUrl: '/visuals/speech.svg',
        altText: 'Speech bubble icon',
        relatedPhrase: 'How are you?',
        placement: 'below',
      },
    ],
    interactions: [
      {
        id: 'greet-1',
        type: 'true_false',
        question: 'Is "Hello" a friendly greeting?',
        questionI18n: {
          english: 'Is "Hello" a friendly greeting?',
          tamil: '"வணக்கம்" என்பது நட்பான வாழ்த்தா?',
          hindi: 'क्या "नमस्ते" एक दोस्ताना अभिवादन है?',
        },
        questionImageUrl: '/images/greeting-hello.svg',
        questionAudioUrl: '/audio/greet-1-question.mp3',
        correctAnswer: 'True',
        hint: 'Try reading it as Hel-lo when you say it.',
        hintI18n: {
          english: 'Try reading it as Hel-lo when you say it.',
          tamil: 'சொல்லும்போது அசைகளாக பிரித்து மெதுவாக சொல்லிப் பார்க்கவும்.',
          hindi: 'बोलते समय इसे भागों में तोड़कर धीरे-धीरे कहें।',
        },
        explanation: '"Hello" (Hel-lo) is a common, friendly way to greet someone.',
        explanationI18n: {
          english: '"Hello" (Hel-lo) is a common, friendly way to greet someone.',
          tamil: '"வணக்கம்" என்பது ஒருவரை வாழ்த்த பயன்படும் பொதுவான, நட்பான சொல்.',
          hindi: '"नमस्ते" किसी का अभिवादन करने का सामान्य और दोस्ताना तरीका है।',
        },
        explanationAudioUrl: '/audio/greet-1-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'Great job! "Hello" (Hel-lo) is a friendly greeting.',
          correctAudioUrl: '/audio/greet-1-correct.mp3',
          incorrect: 'Good effort. Let\'s try again.',
          incorrectAudioUrl: '/audio/greet-1-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great job! "Hello" (Hel-lo) is a friendly greeting.',
            tamil: 'சிறப்பாக செய்தீர்கள்! "வணக்கம்" என்பது நட்பான வாழ்த்து.',
            hindi: 'बहुत बढ़िया! "नमस्ते" एक दोस्ताना अभिवादन है।',
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
        id: 'greet-2',
        type: 'multiple_choice',
        question: 'Choose a friendly greeting.',
        questionI18n: {
          english: 'Choose a friendly greeting.',
          tamil: 'நட்பான வாழ்த்தைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'एक दोस्ताना अभिवादन चुनें।',
        },
        questionImageUrl: '/images/greeting-options.svg',
        questionAudioUrl: '/audio/greet-2-question.mp3',
        options: ['Hello', 'Goodbye', 'Later'],
        optionsI18n: [
          { english: 'Hello', tamil: 'வணக்கம்', hindi: 'नमस्ते' },
          { english: 'Goodbye', tamil: 'பிரியாவிடை', hindi: 'अलविदा' },
          { english: 'Later', tamil: 'பின்னர்', hindi: 'बाद में' },
        ],
        correctAnswer: 0,
        hint: 'It is a word you say at the start (Hel-lo).',
        hintI18n: {
          english: 'It is a word you say at the start (Hel-lo).',
          tamil: 'உரையாடலை தொடங்கும்போது சொல்லும் ஒரு சொல்.',
          hindi: 'यह बातचीत की शुरुआत में कहा जाने वाला शब्द है।',
        },
        explanation: '"Hello" (Hel-lo) is a friendly greeting.',
        explanationI18n: {
          english: '"Hello" (Hel-lo) is a friendly greeting.',
          tamil: '"வணக்கம்" என்பது நட்பான வாழ்த்து.',
          hindi: '"नमस्ते" एक दोस्ताना अभिवादन है।',
        },
        explanationAudioUrl: '/audio/greet-2-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'Yes! "Hello" (Hel-lo) is a friendly greeting.',
          correctAudioUrl: '/audio/greet-2-correct.mp3',
          incorrect: 'Nice try. Let\'s pick a greeting used at the start.',
          incorrectAudioUrl: '/audio/greet-2-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Yes! "Hello" (Hel-lo) is a friendly greeting.',
            tamil: 'ஆம்! "வணக்கம்" என்பது நட்பான வாழ்த்து.',
            hindi: 'हाँ! "नमस्ते" एक दोस्ताना अभिवादन है।',
          },
          incorrect: {
            english: 'Nice try. Let\'s pick a greeting used at the start.',
            tamil: 'நல்ல முயற்சி. தொடக்கத்தில் பயன்படுத்தும் வாழ்த்தைத் தேர்வுசெய்யவும்.',
            hindi: 'अच्छी कोशिश। शुरुआत में उपयोग होने वाला अभिवादन चुनें।',
          },
        },
        position: 1,
      },
      {
        id: 'greet-3',
        type: 'click',
        question: 'Click the phrase you use to ask about someone.',
        questionI18n: {
          english: 'Click the phrase you use to ask about someone.',
          tamil: 'ஒருவரைப் பற்றி கேட்பதற்கு பயன்படுத்தும் வாக்கியத்தை கிளிக் செய்யவும்.',
          hindi: 'किसी के बारे में पूछने के लिए उपयोग होने वाला वाक्य चुनें।',
        },
        questionImageUrl: '/images/asking-question.svg',
        questionAudioUrl: '/audio/greet-3-question.mp3',
        options: ['How are you?', 'Where is it?', 'See you later'],
        optionsI18n: [
          { english: 'How are you?', tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்?', hindi: 'आप कैसे हैं?' },
          { english: 'Where is it?', tamil: 'அது எங்கே?', hindi: 'यह कहाँ है?' },
          { english: 'See you later', tamil: 'பின்னர் சந்திப்போம்', hindi: 'फिर मिलेंगे' },
        ],
        correctAnswer: 0,
        hint: 'It is a question about feelings.',
        hintI18n: {
          english: 'It is a question about feelings.',
          tamil: 'இது நலன்/உணர்வுகளைப் பற்றிய கேள்வி.',
          hindi: 'यह हाल-चाल (भावनाओं) के बारे में सवाल है।',
        },
        explanation: '"How are you?" is used to ask about someone.',
        explanationI18n: {
          english: '"How are you?" is used to ask about someone.',
          tamil: '"நீங்கள் எப்படி இருக்கிறீர்கள்?" என்று ஒருவர் நலன் கேட்கலாம்.',
          hindi: '"आप कैसे हैं?" किसी का हाल-चाल पूछने के लिए कहा जाता है।',
        },
        explanationAudioUrl: '/audio/greet-3-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Nice work! That question checks on someone.',
          correctAudioUrl: '/audio/greet-3-correct.mp3',
          incorrect: 'Good effort. Try the question about feelings.',
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
        id: 'greet-4',
        type: 'short_answer',
        question: 'Say or type a simple greeting.',
        questionI18n: {
          english: 'Say or type a simple greeting.',
          tamil: 'ஒரு எளிய வாழ்த்தை சொல்லவும் அல்லது டைப் செய்யவும்.',
          hindi: 'एक सरल अभिवादन बोलें या टाइप करें।',
        },
        questionImageUrl: '/images/type-greeting.svg',
        questionAudioUrl: '/audio/greet-4-question.mp3',
        correctAnswer: 'Hello',
        correctAnswerI18n: {
          english: 'Hello',
          tamil: 'வணக்கம்',
          hindi: 'नमस्ते',
        },
        hint: 'Try "Hello" (Hel-lo).',
        hintI18n: {
          english: 'Try "Hello" (Hel-lo).',
          tamil: '"வணக்கம்" என்று முயற்சிக்கவும்.',
          hindi: '"नमस्ते" कहकर देखें।',
        },
        explanation: '"Hello" (Hel-lo) is a simple, friendly greeting.',
        explanationI18n: {
          english: '"Hello" (Hel-lo) is a simple, friendly greeting.',
          tamil: '"வணக்கம்" என்பது எளிய, நட்பான வாழ்த்து.',
          hindi: '"नमस्ते" एक सरल और दोस्ताना अभिवादन है।',
        },
        explanationAudioUrl: '/audio/greet-4-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 35,
        feedback: {
          correct: 'Great greeting!',
          correctAudioUrl: '/audio/greet-4-correct.mp3',
          incorrect: 'Nice try. A simple greeting is "Hello" (Hel-lo).',
          incorrectAudioUrl: '/audio/greet-4-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great greeting!',
            tamil: 'அருமையான வாழ்த்து!',
            hindi: 'बहुत अच्छा अभिवादन!',
          },
          incorrect: {
            english: 'Nice try. A simple greeting is "Hello" (Hel-lo).',
            tamil: 'நல்ல முயற்சி. எளிய வாழ்த்து "வணக்கம்".',
            hindi: 'अच्छी कोशिश। एक सरल अभिवादन "नमस्ते" है।',
          },
        },
        position: 3,
      },
      {
        id: 'greet-5',
        type: 'multiple_choice',
        question: 'Pick the best reply to "How are you?"',
        questionI18n: {
          english: 'Pick the best reply to "How are you?"',
          tamil: '"நீங்கள் எப்படி இருக்கிறீர்கள்?" என்பதற்கு சிறந்த பதிலைத் தேர்ந்தெடுக்கவும்.',
          hindi: '"आप कैसे हैं?" का सबसे अच्छा जवाब चुनें।',
        },
        questionImageUrl: '/images/responding-greeting.svg',
        questionAudioUrl: '/audio/greet-5-question.mp3',
        options: ['I am good, thank you.', 'Blue.', 'At home.'],
        optionsI18n: [
          { english: 'I am good, thank you.', tamil: 'நான் நன்றாக இருக்கிறேன், நன்றி.', hindi: 'मैं ठीक हूँ, धन्यवाद।' },
          { english: 'Blue.', tamil: 'நீலம்.', hindi: 'नीला।' },
          { english: 'At home.', tamil: 'வீட்டில்.', hindi: 'घर पर।' },
        ],
        correctAnswer: 0,
        hint: 'It is a polite, full reply.',
        hintI18n: {
          english: 'It is a polite, full reply.',
          tamil: 'இது மரியாதையான, முழுமையான பதில்.',
          hindi: 'यह एक शिष्ट और पूरा जवाब है।',
        },
        explanation: '"I am good, thank you." is a polite response.',
        explanationI18n: {
          english: '"I am good, thank you." is a polite response.',
          tamil: '"நான் நன்றாக இருக்கிறேன், நன்றி." என்பது மரியாதையான பதில்.',
          hindi: '"मैं ठीक हूँ, धन्यवाद।" एक शिष्ट उत्तर है।',
        },
        explanationAudioUrl: '/audio/greet-5-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 40,
        feedback: {
          correct: 'Excellent response!',
          correctAudioUrl: '/audio/greet-5-correct.mp3',
          incorrect: 'Good effort. Choose the polite full reply.',
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
  'lesson-vocabulary': {
    _id: 'lesson-vocabulary',
    title: 'Basic Words',
    titleI18n: {
      english: 'Basic Words',
      tamil: 'அடிப்படை சொற்கள்',
      hindi: 'मूल शब्द',
    },
    textContent:
      'Let’s learn simple words for everyday items.\n\nTip: Break longer words into parts (syllables), like ap-ple.\n\nSay the word and point to the item.\n\nRe-peat each word slowly to build con-fi-dence.',
    textContentI18n: {
      english:
        'Let\u2019s learn simple words for everyday items.\n\nTip: Break longer words into parts (syllables), like ap-ple.\n\nSay the word and point to the item.\n\nRe-peat each word slowly to build con-fi-dence.',
      tamil:
        'அன்றாட பொருட்களுக்கான எளிய சொற்களை கற்றுக்கொள்வோம்.\n\nகுறிப்பு: நீளமான சொற்களை அசைகளாக பிரிக்கவும்.\n\nசொல்லி, அந்தப் பொருளை காட்டுங்கள்.\n\nஒவ்வொரு சொல்லையும் மெதுவாக மீண்டும் சொல்லுங்கள்.',
      hindi:
        'आइए रोज़मर्रा की चीज़ों के लिए सरल शब्द सीखें।\n\nटिप: लंबे शब्दों को भागों (syllables) में तोड़ें।\n\nशब्द बोलें और वस्तु की ओर इशारा करें।\n\nहर शब्द को धीरे-धीरे दोहराएँ।',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/speech.svg', description: 'Speak each word clearly.' },
      { iconUrl: '/visuals/sun.svg', description: 'Practice with objects around you.' },
    ],
    highlights: [
      { id: 'h3', phrase: 'simple words', emphasisType: 'bold' },
      { id: 'h4', phrase: 'Repeat', emphasisType: 'underline' },
    ],
    visualAids: [
      {
        id: 'v3',
        imageUrl: '/visuals/sun.svg',
        altText: 'Sun icon',
        relatedPhrase: 'Repeat',
        placement: 'side',
      },
    ],
    interactions: [
      {
        id: 'vocab-1',
        type: 'multiple_choice',
        question: 'Which word matches something you can sit on?',
        questionI18n: {
          english: 'Which word matches something you can sit on?',
          tamil: 'நீங்கள் உட்காரக்கூடிய பொருளுக்கு பொருந்தும் சொல் எது?',
          hindi: 'जिस चीज़ पर आप बैठ सकते हैं, उसका शब्द कौन सा है?',
        },
        questionImageUrl: '/images/chair.svg',
        questionAudioUrl: '/audio/vocab-1-question.mp3',
        options: ['Chair', 'Apple', 'Rain'],
        optionsI18n: [
          { english: 'Chair', tamil: 'நாற்காலி', hindi: 'कुर्सी' },
          { english: 'Apple', tamil: 'ஆப்பிள்', hindi: 'सेब' },
          { english: 'Rain', tamil: 'மழை', hindi: 'बारिश' },
        ],
        correctAnswer: 0,
        hint: 'Say it slowly: chair (one beat).',
        hintI18n: {
          english: 'Say it slowly: chair (one beat).',
          tamil: 'மெதுவாக சொல்லிப் பாருங்கள்.',
          hindi: 'धीरे-धीरे बोलकर देखें।',
        },
        explanation: 'A chair is furniture you sit on.',
        explanationI18n: {
          english: 'A chair is furniture you sit on.',
          tamil: 'நாற்காலி என்பது உட்கார பயன்படும் பொருள்.',
          hindi: 'कुर्सी वह फर्नीचर है जिस पर आप बैठते हैं।',
        },
        explanationAudioUrl: '/audio/vocab-1-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'Yes! A chair is something you can sit on.',
          correctAudioUrl: '/audio/vocab-1-correct.mp3',
          incorrect: 'Good effort. Try the word for furniture you sit on.',
          incorrectAudioUrl: '/audio/vocab-1-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Yes! A chair is something you can sit on.',
            tamil: 'ஆம்! நாற்காலியில் உட்காரலாம்.',
            hindi: 'हाँ! कुर्सी पर आप बैठ सकते हैं।',
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
        id: 'vocab-2',
        type: 'multiple_choice',
        question: 'Which word matches something you can eat?',
        questionI18n: {
          english: 'Which word matches something you can eat?',
          tamil: 'நீங்கள் சாப்பிடக்கூடிய பொருளுக்கு பொருந்தும் சொல் எது?',
          hindi: 'जिस चीज़ को आप खा सकते हैं, उसका शब्द कौन सा है?',
        },
        questionImageUrl: '/images/apple.svg',
        questionAudioUrl: '/audio/vocab-2-question.mp3',
        options: ['Apple', 'Chair', 'Book'],
        optionsI18n: [
          { english: 'Apple', tamil: 'ஆப்பிள்', hindi: 'सेब' },
          { english: 'Chair', tamil: 'நாற்காலி', hindi: 'कुर्सी' },
          { english: 'Book', tamil: 'புத்தகம்', hindi: 'किताब' },
        ],
        correctAnswer: 0,
        hint: 'It is a fruit. Try: ap-ple.',
        hintI18n: {
          english: 'It is a fruit. Try: ap-ple.',
          tamil: 'இது ஒரு பழம்.',
          hindi: 'यह एक फल है।',
        },
        explanation: 'An apple (ap-ple) is a fruit you can eat.',
        explanationI18n: {
          english: 'An apple (ap-ple) is a fruit you can eat.',
          tamil: 'ஆப்பிள் ஒரு சாப்பிடக்கூடிய பழம்.',
          hindi: 'सेब एक फल है जिसे आप खा सकते हैं।',
        },
        explanationAudioUrl: '/audio/vocab-2-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'Nice! An apple is something you can eat.',
          correctAudioUrl: '/audio/vocab-2-correct.mp3',
          incorrect: 'Nice try. Look for the fruit.',
          incorrectAudioUrl: '/audio/vocab-2-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Nice! An apple is something you can eat.',
            tamil: 'சரி! ஆப்பிளை சாப்பிடலாம்.',
            hindi: 'सही! सेब खाया जा सकता है।',
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
        id: 'vocab-3',
        type: 'click',
        question: 'Click the word for something you can read.',
        questionI18n: {
          english: 'Click the word for something you can read.',
          tamil: 'நீங்கள் படிக்கக்கூடிய பொருளின் சொல்லை கிளிக் செய்யவும்.',
          hindi: 'जिस चीज़ को आप पढ़ सकते हैं, उसका शब्द चुनें।',
        },
        questionImageUrl: '/images/book.svg',
        questionAudioUrl: '/audio/vocab-3-question.mp3',
        options: ['Book', 'Cloud', 'Shoe'],
        optionsI18n: [
          { english: 'Book', tamil: 'புத்தகம்', hindi: 'किताब' },
          { english: 'Cloud', tamil: 'மேகம்', hindi: 'बादल' },
          { english: 'Shoe', tamil: 'செருப்பு', hindi: 'जूता' },
        ],
        correctAnswer: 0,
        hint: 'You open it to see words. Say: book (one beat).',
        hintI18n: {
          english: 'You open it to see words. Say: book (one beat).',
          tamil: 'இதைத் திறந்தால் வார்த்தைகளை பார்க்கலாம்.',
          hindi: 'इसे खोलने पर शब्द दिखते हैं।',
        },
        explanation: 'A book is something you read.',
        explanationI18n: {
          english: 'A book is something you read.',
          tamil: 'புத்தகம் என்பது நீங்கள் படிக்கும் பொருள்.',
          hindi: 'किताब वह चीज़ है जिसे आप पढ़ते हैं।',
        },
        explanationAudioUrl: '/audio/vocab-3-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Great choice! A book is for reading.',
          correctAudioUrl: '/audio/vocab-3-correct.mp3',
          incorrect: 'Good effort. Try the item you can read.',
          incorrectAudioUrl: '/audio/vocab-3-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great choice! A book is for reading.',
            tamil: 'சிறந்த தேர்வு! புத்தகம் படிப்பதற்கு.',
            hindi: 'बहुत अच्छा! किताब पढ़ने के लिए होती है।',
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
        id: 'vocab-4',
        type: 'short_answer',
        question: 'Say or type a simple word for a place you live.',
        questionI18n: {
          english: 'Say or type a simple word for a place you live.',
          tamil: 'நீங்கள் வாழும் இடத்துக்கான எளிய சொல்லை சொல்லவும் அல்லது டைப் செய்யவும்.',
          hindi: 'जहाँ आप रहते हैं, उसके लिए एक सरल शब्द बोलें या टाइप करें।',
        },
        questionImageUrl: '/images/home.svg',
        questionAudioUrl: '/audio/vocab-4-question.mp3',
        correctAnswer: 'Home',
        correctAnswerI18n: {
          english: 'Home',
          tamil: 'வீடு',
          hindi: 'घर',
        },
        hint: 'Think about where you sleep. Say: home (one beat).',
        hintI18n: {
          english: 'Think about where you sleep. Say: home (one beat).',
          tamil: 'நீங்கள் தூங்கும் இடத்தை நினைத்துப் பாருங்கள்.',
          hindi: 'जहाँ आप सोते हैं, उसके बारे में सोचें।',
        },
        explanation: 'Home is the place you live.',
        explanationI18n: {
          english: 'Home is the place you live.',
          tamil: 'வீடு என்பது நீங்கள் வாழும் இடம்.',
          hindi: 'घर वह जगह है जहाँ आप रहते हैं।',
        },
        explanationAudioUrl: '/audio/vocab-4-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 35,
        feedback: {
          correct: 'Great word!',
          correctAudioUrl: '/audio/vocab-4-correct.mp3',
          incorrect: 'Nice try. A simple word is "Home".',
          incorrectAudioUrl: '/audio/vocab-4-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great word!',
            tamil: 'அருமையான சொல்!',
            hindi: 'बहुत अच्छा शब्द!',
          },
          incorrect: {
            english: 'Nice try. A simple word is "Home".',
            tamil: 'நல்ல முயற்சி. எளிய சொல் "வீடு".',
            hindi: 'अच्छी कोशिश। सरल शब्द "घर" है।',
          },
        },
        position: 3,
      },
      {
        id: 'vocab-5',
        type: 'multiple_choice',
        question: 'Pick the word that means something you wear on your feet.',
        questionI18n: {
          english: 'Pick the word that means something you wear on your feet.',
          tamil: 'உங்கள் கால்களில் அணிவதைக் குறிக்கும் சொல்லைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'अपने पैरों में पहनने वाली चीज़ का शब्द चुनें।',
        },
        questionImageUrl: '/images/shoe.svg',
        questionAudioUrl: '/audio/vocab-5-question.mp3',
        options: ['Shoe', 'Leaf', 'Cloud'],
        optionsI18n: [
          { english: 'Shoe', tamil: 'செருப்பு', hindi: 'जूता' },
          { english: 'Leaf', tamil: 'இலை', hindi: 'पत्ता' },
          { english: 'Cloud', tamil: 'மேகம்', hindi: 'बादल' },
        ],
        correctAnswer: 0,
        hint: 'You wear it with socks. Say: shoe (one beat).',
        hintI18n: {
          english: 'You wear it with socks. Say: shoe (one beat).',
          tamil: 'இதைக் காலில் அணிவார்கள்.',
          hindi: 'इसे आप पैरों में पहनते हैं।',
        },
        explanation: 'A shoe is worn on your foot.',
        explanationI18n: {
          english: 'A shoe is worn on your foot.',
          tamil: 'செருப்பு காலில் அணியப்படும்.',
          hindi: 'जूता पैर में पहना जाता है।',
        },
        explanationAudioUrl: '/audio/vocab-5-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 40,
        feedback: {
          correct: 'Excellent! A shoe goes on your foot.',
          correctAudioUrl: '/audio/vocab-5-correct.mp3',
          incorrect: 'Good effort. Choose the thing you wear.',
          incorrectAudioUrl: '/audio/vocab-5-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Excellent! A shoe goes on your foot.',
            tamil: 'சிறப்பு! செருப்பு காலில் அணிவார்கள்.',
            hindi: 'बहुत बढ़िया! जूता पैर में पहना जाता है।',
          },
          incorrect: {
            english: 'Good effort. Choose the thing you wear.',
            tamil: 'நல்ல முயற்சி. அணியக்கூடிய பொருளைத் தேர்வுசெய்யவும்.',
            hindi: 'अच्छी कोशिश। पहनने वाली चीज़ चुनें।',
          },
        },
        position: 4,
      },
    ],
  },
  'lesson-numbers': {
    _id: 'lesson-numbers',
    title: 'Numbers',
    titleI18n: {
      english: 'Numbers',
      tamil: 'எண்கள்',
      hindi: 'संख्याएँ',
    },
    textContent:
      'Count from one to five.\n\nTip: Some words are short, some are long. Take your time.\n\nName a color for each number.\n\nMix num-bers and colors to make learning fun.',
    textContentI18n: {
      english:
        'Count from one to five.\n\nTip: Some words are short, some are long. Take your time.\n\nName a color for each number.\n\nMix num-bers and colors to make learning fun.',
      tamil:
        '1 முதல் 5 வரை எண்ணுங்கள்.\n\nகுறிப்பு: சில சொற்கள் குறுகியவை, சில நீளமானவை. மெதுவாக செய்யுங்கள்.\n\nஒவ்வொரு எண்ணுக்கும் ஒரு நிறத்தை சொல்லுங்கள்.\n\nஎண்களையும் நிறங்களையும் சேர்த்து கற்றலை மகிழ்ச்சியாக்குங்கள்.',
      hindi:
        '1 से 5 तक गिनें।\n\nटिप: कुछ शब्द छोटे होते हैं, कुछ लंबे। समय लेकर करें।\n\nहर संख्या के लिए एक रंग बताइए।\n\nसंख्याएँ और रंग मिलाकर सीखना मज़ेदार बनाइए।',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/sun.svg', description: 'Use bright colors to remember.' },
      { iconUrl: '/visuals/wave.svg', description: 'Count on your fingers as you learn.' },
    ],
    highlights: [
      { id: 'h5', phrase: 'Count from one to five', emphasisType: 'background' },
      { id: 'h6', phrase: 'colors', emphasisType: 'bold' },
    ],
    visualAids: [
      {
        id: 'v4',
        imageUrl: '/visuals/wave.svg',
        altText: 'Counting hand icon',
        relatedPhrase: 'Count',
        placement: 'inline',
      },
    ],
    interactions: [
      {
        id: 'numbers-1',
        type: 'click',
        question: 'Click the number that comes after 2.',
        questionI18n: {
          english: 'Click the number that comes after 2.',
          tamil: '2க்கு அடுத்ததாக வரும் எண்ணை கிளிக் செய்யவும்.',
          hindi: '2 के बाद आने वाली संख्या चुनें।',
        },
        questionImageUrl: '/images/number-sequence.svg',
        questionAudioUrl: '/audio/numbers-1-question.mp3',
        options: ['1', '3', '5'],
        correctAnswer: 1,
        hint: 'Count upward: 1, 2, 3.',
        hintI18n: {
          english: 'Count upward: 1, 2, 3.',
          tamil: 'மேலே எண்ணுங்கள்: 1, 2, 3.',
          hindi: 'आगे गिनें: 1, 2, 3।',
        },
        explanation: 'The number after 2 is 3.',
        explanationI18n: {
          english: 'The number after 2 is 3.',
          tamil: '2க்கு அடுத்த எண் 3.',
          hindi: '2 के बाद 3 आता है।',
        },
        explanationAudioUrl: '/audio/numbers-1-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'Great job! 3 comes after 2.',
          correctAudioUrl: '/audio/numbers-1-correct.mp3',
          incorrect: 'Good effort. Count up: 1, 2, 3.',
          incorrectAudioUrl: '/audio/numbers-1-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great job! 3 comes after 2.',
            tamil: 'சிறப்பு! 2க்கு பின் 3 வருகிறது.',
            hindi: 'बहुत बढ़िया! 2 के बाद 3 आता है।',
          },
          incorrect: {
            english: 'Good effort. Count up: 1, 2, 3.',
            tamil: 'நல்ல முயற்சி. 1, 2, 3 என்று எண்ணுங்கள்.',
            hindi: 'अच्छी कोशिश। 1, 2, 3 गिनें।',
          },
        },
        position: 0,
      },
      {
        id: 'numbers-2',
        type: 'multiple_choice',
        question: 'Which number comes after 4?',
        questionI18n: {
          english: 'Which number comes after 4?',
          tamil: '4க்கு அடுத்த எண் எது?',
          hindi: '4 के बाद कौन सी संख्या आती है?',
        },
        questionImageUrl: '/images/counting-4-5.svg',
        questionAudioUrl: '/audio/numbers-2-question.mp3',
        options: ['3', '5', '6'],
        correctAnswer: 1,
        hint: 'Count forward: 4, 5.',
        hintI18n: {
          english: 'Count forward: 4, 5.',
          tamil: 'முன்னால் எண்ணுங்கள்: 4, 5.',
          hindi: 'आगे गिनें: 4, 5।',
        },
        explanation: 'The number after 4 is 5.',
        explanationI18n: {
          english: 'The number after 4 is 5.',
          tamil: '4க்கு அடுத்த எண் 5.',
          hindi: '4 के बाद 5 आता है।',
        },
        explanationAudioUrl: '/audio/numbers-2-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'Nice! 5 comes after 4.',
          correctAudioUrl: '/audio/numbers-2-correct.mp3',
          incorrect: 'Nice try. Count forward to find 5.',
          incorrectAudioUrl: '/audio/numbers-2-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Nice! 5 comes after 4.',
            tamil: 'சரி! 4க்கு பின் 5 வருகிறது.',
            hindi: 'सही! 4 के बाद 5 आता है।',
          },
          incorrect: {
            english: 'Nice try. Count forward to find 5.',
            tamil: 'நல்ல முயற்சி. 4, 5 என்று எண்ணிப் பாருங்கள்.',
            hindi: 'अच्छी कोशिश। 4, 5 गिनकर देखें।',
          },
        },
        position: 1,
      },
      {
        id: 'numbers-3',
        type: 'multiple_choice',
        question: 'Which set has three items?',
        questionI18n: {
          english: 'Which set has three items?',
          tamil: 'மூன்று பொருட்கள் உள்ள தொகுப்பு எது?',
          hindi: 'किस समूह में तीन वस्तुएँ हैं?',
        },
        questionImageUrl: '/images/counting-stars.svg',
        questionAudioUrl: '/audio/numbers-3-question.mp3',
        options: ['***', '**', '****'],
        correctAnswer: 0,
        hint: 'Count the stars.',
        hintI18n: {
          english: 'Count the stars.',
          tamil: 'நட்சத்திரங்களை எண்ணுங்கள்.',
          hindi: 'तारों को गिनें।',
        },
        explanation: 'Three stars means 3 items.',
        explanationI18n: {
          english: 'Three stars means 3 items.',
          tamil: 'மூன்று நட்சத்திரங்கள் என்றால் 3 பொருட்கள்.',
          hindi: 'तीन तारे मतलब 3 वस्तुएँ।',
        },
        explanationAudioUrl: '/audio/numbers-3-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Great counting!',
          correctAudioUrl: '/audio/numbers-3-correct.mp3',
          incorrect: 'Good effort. Count the stars carefully.',
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
        id: 'numbers-4',
        type: 'short_answer',
        question: 'Say or type the number after 1.',
        questionImageUrl: '/images/number-1-2.svg',
        questionAudioUrl: '/audio/numbers-4-question.mp3',
        correctAnswer: '2',
        hint: 'Count: 1, 2.',
        explanation: 'The number after 1 is 2.',
        explanationAudioUrl: '/audio/numbers-4-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 35,
        feedback: {
          correct: 'Yes! The answer is 2.',
          correctAudioUrl: '/audio/numbers-4-correct.mp3',
          incorrect: 'Nice try. The answer is 2.',
          incorrectAudioUrl: '/audio/numbers-4-incorrect.mp3',
        },
        position: 3,
      },
      {
        id: 'numbers-5',
        type: 'multiple_choice',
        question: 'Choose the correct order from 1 to 3.',
        questionI18n: {
          english: 'Choose the correct order from 1 to 3.',
          tamil: '1 முதல் 3 வரை சரியான வரிசையைத் தேர்ந்தெடுக்கவும்.',
          hindi: '1 से 3 तक सही क्रम चुनें।',
        },
        questionImageUrl: '/images/number-order.svg',
        questionAudioUrl: '/audio/numbers-5-question.mp3',
        options: ['1, 2, 3', '1, 3, 2', '2, 1, 3'],
        correctAnswer: 0,
        hint: 'Start at 1 and count up.',
        hintI18n: {
          english: 'Start at 1 and count up.',
          tamil: '1 இலிருந்து தொடங்கி மேலே எண்ணுங்கள்.',
          hindi: '1 से शुरू करके आगे गिनें।',
        },
        explanation: 'The correct order is 1, 2, 3.',
        explanationI18n: {
          english: 'The correct order is 1, 2, 3.',
          tamil: 'சரியான வரிசை 1, 2, 3.',
          hindi: 'सही क्रम 1, 2, 3 है।',
        },
        explanationAudioUrl: '/audio/numbers-5-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 40,
        feedback: {
          correct: 'Excellent ordering!',
          correctAudioUrl: '/audio/numbers-5-correct.mp3',
          incorrect: 'Good effort. Start at 1 and count up.',
          incorrectAudioUrl: '/audio/numbers-5-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Excellent ordering!',
            tamil: 'சிறந்த வரிசை!',
            hindi: 'बहुत अच्छा क्रम!',
          },
          incorrect: {
            english: 'Good effort. Start at 1 and count up.',
            tamil: 'நல்ல முயற்சி. 1 இலிருந்து தொடங்கி எண்ணுங்கள்.',
            hindi: 'अच्छी कोशिश। 1 से शुरू करके गिनें।',
          },
        },
        position: 4,
      },
    ],
  },

  'lesson-tamil-essentials': {
    _id: 'lesson-tamil-essentials',
    title: 'Tamil Essentials',
    titleI18n: {
      english: 'Tamil Essentials',
      tamil: 'தமிழ் அடிப்படைகள்',
      hindi: 'तमिल की मूल बातें',
    },
    textContent:
      'In this lesson you will practice a few useful Tamil words.

Try reading slowly and clearly:
- “வணக்கம்” (Vanakkam) = Hello
- “நன்றி” (Nandri) = Thank you
- “தயவு செய்து” (Thayavu seithu) = Please
- “ஆம்” (Aam) = Yes
- “இல்லை” (Illai) = No',
    textContentI18n: {
      english:
        'In this lesson you will practice a few useful Tamil words.

Try reading slowly and clearly:
- “வணக்கம்” (Vanakkam) = Hello
- “நன்றி” (Nandri) = Thank you
- “தயவு செய்து” (Thayavu seithu) = Please
- “ஆம்” (Aam) = Yes
- “இல்லை” (Illai) = No',
      tamil:
        'இந்தப் பாடத்தில் சில பயனுள்ள தமிழ் சொற்களைப் பயிற்சி செய்வோம்.

மெதுவாகவும் தெளிவாகவும் வாசிக்க முயற்சிக்கவும்:
- “வணக்கம்” (Vanakkam) = Hello
- “நன்றி” (Nandri) = Thank you
- “தயவு செய்து” (Thayavu seithu) = Please
- “ஆம்” (Aam) = Yes
- “இல்லை” (Illai) = No',
      hindi:
        'इस पाठ में आप कुछ उपयोगी तमिल शब्दों का अभ्यास करेंगे।

धीरे और साफ़ पढ़ने की कोशिश करें:
- “வணக்கம்” (Vanakkam) = Hello
- “நன்றி” (Nandri) = Thank you
- “தயவு செய்து” (Thayavu seithu) = Please
- “ஆம்” (Aam) = Yes
- “இல்லை” (Illai) = No',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/wave.svg', description: 'Practice “வணக்கம்” (Vanakkam) as a greeting.' },
      { iconUrl: '/visuals/speech.svg', description: 'Say “நன்றி” (Nandri) to say thank you.' },
    ],
    highlights: [
      { id: 'ta-h1', phrase: 'வணக்கம்', emphasisType: 'background', color: '#fde68a', position: 0 },
      { id: 'ta-h2', phrase: 'நன்றி', emphasisType: 'underline' },
    ],
    visualAids: [
      { id: 'ta-v1', imageUrl: '/visuals/wave.svg', altText: 'Waving hand icon', relatedPhrase: 'வணக்கம்', placement: 'inline' },
      { id: 'ta-v2', imageUrl: '/visuals/speech.svg', altText: 'Speech bubble icon', relatedPhrase: 'நன்றி', placement: 'below' },
    ],
    interactions: [
      {
        id: 'ta-1',
        type: 'multiple_choice',
        question: 'வணக்கம் means…',
        questionI18n: {
          english: 'வணக்கம் means…',
          tamil: '“வணக்கம்” என்றால்…',
          hindi: '“வணக்கம்” का अर्थ है…',
        },
        questionImageUrl: '/images/greeting-hello.svg',
        questionAudioUrl: '',
        options: ['Hello', 'Thank you', 'Goodbye'],
        optionsI18n: [
          { english: 'Hello', tamil: 'Hello', hindi: 'Hello' },
          { english: 'Thank you', tamil: 'Thank you', hindi: 'Thank you' },
          { english: 'Goodbye', tamil: 'Goodbye', hindi: 'Goodbye' },
        ],
        correctAnswer: 0,
        hint: 'It is used to greet someone.',
        hintI18n: {
          english: 'It is used to greet someone.',
          tamil: 'இது ஒருவரை வாழ்த்த பயன்படுத்தப்படுகிறது.',
          hindi: 'यह किसी को अभिवादन करने के लिए इस्तेमाल होता है।',
        },
        explanation: '“வணக்கம்” is a common Tamil greeting (Hello).',
        explanationI18n: {
          english: '“வணக்கம்” is a common Tamil greeting (Hello).',
          tamil: '“வணக்கம்” என்பது பொதுவான தமிழ் வாழ்த்து (Hello).',
          hindi: '“வணக்கம்” एक सामान्य तमिल अभिवादन है (Hello)।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Great! வணக்கம் = Hello.',
          incorrect: 'Try again. Think: greeting.',
        },
        feedbackI18n: {
          correct: { english: 'Great! வணக்கம் = Hello.', tamil: 'சரி! வணக்கம் = Hello.', hindi: 'बहुत अच्छा! वணக்கம் = Hello.' },
          incorrect: { english: 'Try again. Think: greeting.', tamil: 'மீண்டும் முயற்சி. வாழ்த்து என்று நினையுங்கள்.', hindi: 'फिर से कोशिश करें। अभिवादन सोचें।' },
        },
        position: 0,
      },
      {
        id: 'ta-2',
        type: 'multiple_choice',
        question: 'Choose “Thank you” in Tamil.',
        questionI18n: {
          english: 'Choose “Thank you” in Tamil.',
          tamil: 'தமிழில் “Thank you” என்பதைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'तमिल में “Thank you” चुनें।',
        },
        questionImageUrl: '/images/greeting-options.svg',
        questionAudioUrl: '',
        options: ['வணக்கம்', 'நன்றி', 'இல்லை'],
        optionsI18n: [
          { english: 'வணக்கம்', tamil: 'வணக்கம்', hindi: 'वणக்கம்' },
          { english: 'நன்றி', tamil: 'நன்றி', hindi: 'नन्द्री' },
          { english: 'இல்லை', tamil: 'இல்லை', hindi: 'इल्लै' },
        ],
        correctAnswer: 1,
        hint: 'You say it after someone helps you.',
        hintI18n: {
          english: 'You say it after someone helps you.',
          tamil: 'யாராவது உதவிய பிறகு இதை சொல்வீர்கள்.',
          hindi: 'जब कोई आपकी मदद करे, तब आप यह कहते हैं।',
        },
        explanation: 'நன்றி means Thank you.',
        explanationI18n: {
          english: 'நன்றி means Thank you.',
          tamil: 'நன்றி என்றால் Thank you.',
          hindi: 'நன்றி का मतलब Thank you है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Nice! நன்றி = Thank you.',
          incorrect: 'Good try. Look for the word used for thanks.',
        },
        feedbackI18n: {
          correct: { english: 'Nice! நன்றி = Thank you.', tamil: 'சிறப்பு! நன்றி = Thank you.', hindi: 'अच्छा! नன்றி = Thank you.' },
          incorrect: { english: 'Good try. Look for the word used for thanks.', tamil: 'நல்ல முயற்சி. நன்றி சொல்லும் சொல்லைப் பாருங்கள்.', hindi: 'अच्छी कोशिश। धन्यवाद वाले शब्द को देखें।' },
        },
        position: 1,
      },
      {
        id: 'ta-3',
        type: 'true_false',
        question: '“ஆம்” means “Yes”.',
        questionI18n: {
          english: '“ஆம்” means “Yes”.',
          tamil: '“ஆம்” என்றால் “Yes”.',
          hindi: '“ஆம்” का मतलब “Yes” है।',
        },
        questionImageUrl: '/images/responding-greeting.svg',
        questionAudioUrl: '',
        correctAnswer: 'True',
        hint: 'Yes = agree.',
        hintI18n: {
          english: 'Yes = agree.',
          tamil: 'Yes = சம்மதம்.',
          hindi: 'Yes = सहमत होना।',
        },
        explanation: 'ஆம் is used to say Yes.',
        explanationI18n: {
          english: 'ஆம் is used to say Yes.',
          tamil: 'ஆம் என்பது Yes சொல்லப் பயன்படும்.',
          hindi: 'ஆம் का उपयोग Yes कहने के लिए होता है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 2,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'Correct!',
          incorrect: 'Try again.',
        },
        feedbackI18n: {
          correct: { english: 'Correct!', tamil: 'சரி!', hindi: 'सही!' },
          incorrect: { english: 'Try again.', tamil: 'மீண்டும் முயற்சி.', hindi: 'फिर से कोशिश करें।' },
        },
        position: 2,
      },
      {
        id: 'ta-4',
        type: 'click',
        question: 'Click the polite word you add when asking for something.',
        questionI18n: {
          english: 'Click the polite word you add when asking for something.',
          tamil: 'எதையாவது கேட்கும்போது மரியாதையாக சேர்க்கும் சொல்லை கிளிக் செய்யவும்.',
          hindi: 'कुछ माँगते समय जो विनम्र शब्द जोड़ते हैं, उसे चुनें।',
        },
        questionImageUrl: '/images/asking-question.svg',
        questionAudioUrl: '',
        options: ['தயவு செய்து', 'நன்றி', 'பிரியாவிடை'],
        optionsI18n: [
          { english: 'தயவு செய்து', tamil: 'தயவு செய்து', hindi: 'कृपया' },
          { english: 'நன்றி', tamil: 'நன்றி', hindi: 'धन्यवाद' },
          { english: 'பிரியாவிடை', tamil: 'பிரியாவிடை', hindi: 'अलविदा' },
        ],
        correctAnswer: 0,
        hint: 'It is like “Please”.',
        hintI18n: {
          english: 'It is like “Please”.',
          tamil: 'இது “Please” போல.',
          hindi: 'यह “Please” जैसा है।',
        },
        explanation: 'தயவு செய்து is used to say Please.',
        explanationI18n: {
          english: 'தயவு செய்து is used to say Please.',
          tamil: 'தயவு செய்து என்பது Please சொல்லப் பயன்படும்.',
          hindi: 'தயவு செய்து का उपयोग Please कहने के लिए होता है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Well done!',
          incorrect: 'Try again. Pick the polite request word.',
        },
        feedbackI18n: {
          correct: { english: 'Well done!', tamil: 'சிறப்பு!', hindi: 'बहुत बढ़िया!' },
          incorrect: { english: 'Try again. Pick the polite request word.', tamil: 'மீண்டும் முயற்சி. மரியாதை கேட்கும் சொல்லைத் தேர்ந்தெடுக்கவும்.', hindi: 'फिर से कोशिश करें। विनम्र अनुरोध वाला शब्द चुनें।' },
        },
        position: 3,
      },
      {
        id: 'ta-5',
        type: 'multiple_choice',
        question: 'Which one means “No” in Tamil?',
        questionI18n: {
          english: 'Which one means “No” in Tamil?',
          tamil: 'தமிழில் “No” என்றால் எது?',
          hindi: 'तमिल में “No” कौन सा है?',
        },
        questionImageUrl: '/images/type-greeting.svg',
        questionAudioUrl: '',
        options: ['ஆம்', 'இல்லை', 'நன்றி'],
        optionsI18n: [
          { english: 'ஆம்', tamil: 'ஆம்', hindi: 'हाँ' },
          { english: 'இல்லை', tamil: 'இல்லை', hindi: 'नहीं' },
          { english: 'நன்றி', tamil: 'நன்றி', hindi: 'धन्यवाद' },
        ],
        correctAnswer: 1,
        hint: 'Not yes.',
        hintI18n: {
          english: 'Not yes.',
          tamil: 'ஆம் அல்ல.',
          hindi: 'हाँ नहीं।',
        },
        explanation: 'இல்லை is used to say No.',
        explanationI18n: {
          english: 'இல்லை is used to say No.',
          tamil: 'இல்லை என்பது No சொல்லப் பயன்படும்.',
          hindi: 'इल्लै का उपयोग No कहने के लिए होता है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Correct! இல்லை = No.',
          incorrect: 'Almost. Look for the opposite of ஆம்.',
        },
        feedbackI18n: {
          correct: { english: 'Correct! இல்லை = No.', tamil: 'சரி! இல்லை = No.', hindi: 'सही! इल्लै = No.' },
          incorrect: { english: 'Almost. Look for the opposite of ஆம்.', tamil: 'கிட்டத்தட்ட. ஆம் என்பதின் எதிர்ச்சொல்லை பாருங்கள்.', hindi: 'लगभग। हाँ के विपरीत शब्द देखें।' },
        },
        position: 4,
      },
      {
        id: 'ta-6',
        type: 'multiple_choice',
        question: 'Pick a greeting you can use any time.',
        questionI18n: {
          english: 'Pick a greeting you can use any time.',
          tamil: 'எப்போது வேண்டுமானாலும் பயன்படுத்தக்கூடிய வாழ்த்தைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'ऐसा अभिवादन चुनें जो आप कभी भी कह सकते हैं।',
        },
        questionImageUrl: '/images/greeting-options.svg',
        questionAudioUrl: '',
        options: ['வணக்கம்', 'பிரியாவிடை', 'நன்றி'],
        optionsI18n: [
          { english: 'வணக்கம்', tamil: 'வணக்கம்', hindi: 'नमस्ते' },
          { english: 'பிரியாவிடை', tamil: 'பிரியாவிடை', hindi: 'अलविदा' },
          { english: 'நன்றி', tamil: 'நன்றி', hindi: 'धन्यवाद' },
        ],
        correctAnswer: 0,
        hint: 'It is “Hello”.',
        hintI18n: {
          english: 'It is “Hello”.',
          tamil: 'இது “Hello”.',
          hindi: 'यह “Hello” है।',
        },
        explanation: 'வணக்கம் is a general greeting.',
        explanationI18n: {
          english: 'வணக்கம் is a general greeting.',
          tamil: 'வணக்கம் என்பது பொதுவான வாழ்த்து.',
          hindi: 'वணக்கம் एक सामान्य अभिवादन है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Great greeting choice!',
          incorrect: 'Try again. Pick the greeting word.',
        },
        feedbackI18n: {
          correct: { english: 'Great greeting choice!', tamil: 'சிறந்த தேர்வு!', hindi: 'बहुत बढ़िया!' },
          incorrect: { english: 'Try again. Pick the greeting word.', tamil: 'மீண்டும் முயற்சி. வாழ்த்து சொல்லைத் தேர்ந்தெடுக்கவும்.', hindi: 'फिर से कोशिश करें। अभिवादन वाला शब्द चुनें।' },
        },
        position: 5,
      },
    ],
  },

  'lesson-hindi-essentials': {
    _id: 'lesson-hindi-essentials',
    title: 'Hindi Essentials',
    titleI18n: {
      english: 'Hindi Essentials',
      tamil: 'இந்தி அடிப்படைகள்',
      hindi: 'हिंदी की मूल बातें',
    },
    textContent:
      'In this lesson you will practice a few useful Hindi words.

Try reading slowly and clearly:
- “नमस्ते” (Namaste) = Hello
- “धन्यवाद” (Dhanyavaad) = Thank you
- “कृपया” (Kripya) = Please
- “हाँ” (Haan) = Yes
- “नहीं” (Nahin) = No',
    textContentI18n: {
      english:
        'In this lesson you will practice a few useful Hindi words.

Try reading slowly and clearly:
- “नमस्ते” (Namaste) = Hello
- “धन्यवाद” (Dhanyavaad) = Thank you
- “कृपया” (Kripya) = Please
- “हाँ” (Haan) = Yes
- “नहीं” (Nahin) = No',
      tamil:
        'இந்தப் பாடத்தில் சில பயனுள்ள இந்தி சொற்களைப் பயிற்சி செய்வோம்.

மெதுவாகவும் தெளிவாகவும் வாசிக்க முயற்சிக்கவும்:
- “नमस्ते” (Namaste) = Hello
- “धन्यवाद” (Dhanyavaad) = Thank you
- “कृपया” (Kripya) = Please
- “हाँ” (Haan) = Yes
- “नहीं” (Nahin) = No',
      hindi:
        'इस पाठ में आप कुछ उपयोगी हिंदी शब्दों का अभ्यास करेंगे।

धीरे और साफ़ पढ़ने की कोशिश करें:
- “नमस्ते” (Namaste) = Hello
- “धन्यवाद” (Dhanyavaad) = Thank you
- “कृपया” (Kripya) = Please
- “हाँ” (Haan) = Yes
- “नहीं” (Nahin) = No',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/hello.svg', description: 'Practice “नमस्ते” (Namaste) as a greeting.' },
      { iconUrl: '/visuals/speech.svg', description: 'Say “धन्यवाद” (Dhanyavaad) to say thank you.' },
    ],
    highlights: [
      { id: 'hi-h1', phrase: 'नमस्ते', emphasisType: 'background', color: '#ddd6fe', position: 0 },
      { id: 'hi-h2', phrase: 'धन्यवाद', emphasisType: 'underline' },
    ],
    visualAids: [
      { id: 'hi-v1', imageUrl: '/visuals/hello.svg', altText: 'Hello icon', relatedPhrase: 'नमस्ते', placement: 'inline' },
      { id: 'hi-v2', imageUrl: '/visuals/speech.svg', altText: 'Speech bubble icon', relatedPhrase: 'धन्यवाद', placement: 'below' },
    ],
    interactions: [
      {
        id: 'hi-1',
        type: 'multiple_choice',
        question: 'नमस्ते means…',
        questionI18n: {
          english: 'नमस्ते means…',
          tamil: '“नमस्ते” என்றால்…',
          hindi: '“नमस्ते” का अर्थ है…',
        },
        questionImageUrl: '/images/greeting-hello.svg',
        questionAudioUrl: '',
        options: ['Hello', 'Thank you', 'Good night'],
        optionsI18n: [
          { english: 'Hello', tamil: 'Hello', hindi: 'Hello' },
          { english: 'Thank you', tamil: 'Thank you', hindi: 'Thank you' },
          { english: 'Good night', tamil: 'Good night', hindi: 'Good night' },
        ],
        correctAnswer: 0,
        hint: 'It is used to greet someone.',
        hintI18n: {
          english: 'It is used to greet someone.',
          tamil: 'இது ஒருவரை வாழ்த்த பயன்படுத்தப்படுகிறது.',
          hindi: 'यह अभिवादन करने के लिए उपयोग होता है।',
        },
        explanation: 'नमस्ते is a common Hindi greeting (Hello).',
        explanationI18n: {
          english: 'नमस्ते is a common Hindi greeting (Hello).',
          tamil: 'नमस्ते என்பது பொதுவான இந்தி வாழ்த்து (Hello).',
          hindi: 'नमस्ते एक सामान्य हिंदी अभिवादन है (Hello)।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Great! नमस्ते = Hello.',
          incorrect: 'Try again. Think: greeting.',
        },
        feedbackI18n: {
          correct: { english: 'Great! नमस्ते = Hello.', tamil: 'சரி! नमस्ते = Hello.', hindi: 'बहुत बढ़िया! नमस्ते = Hello.' },
          incorrect: { english: 'Try again. Think: greeting.', tamil: 'மீண்டும் முயற்சி. வாழ்த்து என்று நினையுங்கள்.', hindi: 'फिर से कोशिश करें। अभिवादन सोचें।' },
        },
        position: 0,
      },
      {
        id: 'hi-2',
        type: 'multiple_choice',
        question: 'Choose “Thank you” in Hindi.',
        questionI18n: {
          english: 'Choose “Thank you” in Hindi.',
          tamil: 'இந்தியில் “Thank you” என்பதைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'हिंदी में “Thank you” चुनें।',
        },
        questionImageUrl: '/images/greeting-options.svg',
        questionAudioUrl: '',
        options: ['धन्यवाद', 'नमस्ते', 'नहीं'],
        optionsI18n: [
          { english: 'धन्यवाद', tamil: 'धन्यवाद', hindi: 'धन्यवाद' },
          { english: 'नमस्ते', tamil: 'नमस्ते', hindi: 'नमस्ते' },
          { english: 'नहीं', tamil: 'नहीं', hindi: 'नहीं' },
        ],
        correctAnswer: 0,
        hint: 'You say it after someone helps you.',
        hintI18n: {
          english: 'You say it after someone helps you.',
          tamil: 'யாராவது உதவிய பிறகு இதை சொல்வீர்கள்.',
          hindi: 'जब कोई आपकी मदद करे, तब आप यह कहते हैं।',
        },
        explanation: 'धन्यवाद means Thank you.',
        explanationI18n: {
          english: 'धन्यवाद means Thank you.',
          tamil: 'धन्यवाद என்றால் Thank you.',
          hindi: 'धन्यवाद का मतलब Thank you है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Nice! धन्यवाद = Thank you.',
          incorrect: 'Good try. Pick the word used for thanks.',
        },
        feedbackI18n: {
          correct: { english: 'Nice! धन्यवाद = Thank you.', tamil: 'சிறப்பு! धन्यवाद = Thank you.', hindi: 'अच्छा! धन्यवाद = Thank you.' },
          incorrect: { english: 'Good try. Pick the word used for thanks.', tamil: 'நல்ல முயற்சி. நன்றி சொல்லும் சொல்லைப் பாருங்கள்.', hindi: 'अच्छी कोशिश। धन्यवाद वाले शब्द को देखें।' },
        },
        position: 1,
      },
      {
        id: 'hi-3',
        type: 'true_false',
        question: '“हाँ” means “Yes”.',
        questionI18n: {
          english: '“हाँ” means “Yes”.',
          tamil: '“हाँ” என்றால் “Yes”.',
          hindi: '“हाँ” का मतलब “Yes” है।',
        },
        questionImageUrl: '/images/responding-greeting.svg',
        questionAudioUrl: '',
        correctAnswer: 'True',
        hint: 'Yes = agree.',
        hintI18n: {
          english: 'Yes = agree.',
          tamil: 'Yes = சம்மதம்.',
          hindi: 'Yes = सहमत होना।',
        },
        explanation: 'हाँ is used to say Yes.',
        explanationI18n: {
          english: 'हाँ is used to say Yes.',
          tamil: 'हाँ என்பது Yes சொல்லப் பயன்படும்.',
          hindi: 'हाँ का उपयोग Yes कहने के लिए होता है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 2,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'Correct!',
          incorrect: 'Try again.',
        },
        feedbackI18n: {
          correct: { english: 'Correct!', tamil: 'சரி!', hindi: 'सही!' },
          incorrect: { english: 'Try again.', tamil: 'மீண்டும் முயற்சி.', hindi: 'फिर से कोशिश करें।' },
        },
        position: 2,
      },
      {
        id: 'hi-4',
        type: 'click',
        question: 'Click the polite word you add when asking for something.',
        questionI18n: {
          english: 'Click the polite word you add when asking for something.',
          tamil: 'எதையாவது கேட்கும்போது மரியாதையாக சேர்க்கும் சொல்லை கிளிக் செய்யவும்.',
          hindi: 'कुछ माँगते समय जो विनम्र शब्द जोड़ते हैं, उसे चुनें।',
        },
        questionImageUrl: '/images/asking-question.svg',
        questionAudioUrl: '',
        options: ['कृपया', 'धन्यवाद', 'अलविदा'],
        optionsI18n: [
          { english: 'कृपया', tamil: 'कृपया', hindi: 'कृपया' },
          { english: 'धन्यवाद', tamil: 'धन्यवाद', hindi: 'धन्यवाद' },
          { english: 'अलविदा', tamil: 'अलविदा', hindi: 'अलविदा' },
        ],
        correctAnswer: 0,
        hint: 'It is like “Please”.',
        hintI18n: {
          english: 'It is like “Please”.',
          tamil: 'இது “Please” போல.',
          hindi: 'यह “Please” जैसा है।',
        },
        explanation: 'कृपया is used to say Please.',
        explanationI18n: {
          english: 'कृपया is used to say Please.',
          tamil: 'कृपया என்பது Please சொல்லப் பயன்படும்.',
          hindi: 'कृपया का उपयोग Please कहने के लिए होता है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Well done!',
          incorrect: 'Try again. Pick the polite request word.',
        },
        feedbackI18n: {
          correct: { english: 'Well done!', tamil: 'சிறப்பு!', hindi: 'बहुत बढ़िया!' },
          incorrect: { english: 'Try again. Pick the polite request word.', tamil: 'மீண்டும் முயற்சி. மரியாதை கேட்கும் சொல்லைத் தேர்ந்தெடுக்கவும்.', hindi: 'फिर से कोशिश करें। विनम्र अनुरोध वाला शब्द चुनें।' },
        },
        position: 3,
      },
      {
        id: 'hi-5',
        type: 'multiple_choice',
        question: 'Which one means “No” in Hindi?',
        questionI18n: {
          english: 'Which one means “No” in Hindi?',
          tamil: 'இந்தியில் “No” என்றால் எது?',
          hindi: 'हिंदी में “No” कौन सा है?',
        },
        questionImageUrl: '/images/type-greeting.svg',
        questionAudioUrl: '',
        options: ['हाँ', 'नहीं', 'धन्यवाद'],
        optionsI18n: [
          { english: 'हाँ', tamil: 'हाँ', hindi: 'हाँ' },
          { english: 'नहीं', tamil: 'नहीं', hindi: 'नहीं' },
          { english: 'धन्यवाद', tamil: 'धन्यवाद', hindi: 'धन्यवाद' },
        ],
        correctAnswer: 1,
        hint: 'Not yes.',
        hintI18n: {
          english: 'Not yes.',
          tamil: 'ஆம் அல்ல.',
          hindi: 'हाँ नहीं।',
        },
        explanation: 'नहीं is used to say No.',
        explanationI18n: {
          english: 'नहीं is used to say No.',
          tamil: 'नहीं என்பது No சொல்லப் பயன்படும்.',
          hindi: 'नहीं का उपयोग No कहने के लिए होता है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Correct! नहीं = No.',
          incorrect: 'Almost. Look for the opposite of हाँ.',
        },
        feedbackI18n: {
          correct: { english: 'Correct! नहीं = No.', tamil: 'சரி! नहीं = No.', hindi: 'सही! नहीं = No.' },
          incorrect: { english: 'Almost. Look for the opposite of हाँ.', tamil: 'கிட்டத்தட்ட. हाँ என்பதின் எதிர்ச்சொல்லை பாருங்கள்.', hindi: 'लगभग। हाँ के विपरीत शब्द देखें।' },
        },
        position: 4,
      },
      {
        id: 'hi-6',
        type: 'multiple_choice',
        question: 'Pick a greeting you can use any time.',
        questionI18n: {
          english: 'Pick a greeting you can use any time.',
          tamil: 'எப்போது வேண்டுமானாலும் பயன்படுத்தக்கூடிய வாழ்த்தைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'ऐसा अभिवादन चुनें जो आप कभी भी कह सकते हैं।',
        },
        questionImageUrl: '/images/greeting-options.svg',
        questionAudioUrl: '',
        options: ['नमस्ते', 'अलविदा', 'धन्यवाद'],
        optionsI18n: [
          { english: 'नमस्ते', tamil: 'नमस्ते', hindi: 'नमस्ते' },
          { english: 'अलविदा', tamil: 'अलविदा', hindi: 'अलविदा' },
          { english: 'धन्यवाद', tamil: 'धन्यवाद', hindi: 'धन्यवाद' },
        ],
        correctAnswer: 0,
        hint: 'It is “Hello”.',
        hintI18n: {
          english: 'It is “Hello”.',
          tamil: 'இது “Hello”.',
          hindi: 'यह “Hello” है।',
        },
        explanation: 'नमस्ते is a general greeting.',
        explanationI18n: {
          english: 'नमस्ते is a general greeting.',
          tamil: 'नमस्ते என்பது பொதுவான வாழ்த்து.',
          hindi: 'नमस्ते एक सामान्य अभिवादन है।',
        },
        explanationAudioUrl: '',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'Great greeting choice!',
          incorrect: 'Try again. Pick the greeting word.',
        },
        feedbackI18n: {
          correct: { english: 'Great greeting choice!', tamil: 'சிறந்த தேர்வு!', hindi: 'बहुत बढ़िया!' },
          incorrect: { english: 'Try again. Pick the greeting word.', tamil: 'மீண்டும் முயற்சி. வாழ்த்து சொல்லைத் தேர்ந்தெடுக்கவும்.', hindi: 'फिर से कोशिश करें। अभिवादन वाला शब्द चुनें।' },
        },
        position: 5,
      },
    ],
  },
};

export default lessonSamples;
