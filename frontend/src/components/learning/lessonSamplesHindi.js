/**
 * lessonSamplesHindi.js
 *
 * Static sample lesson data for Hindi language lessons.
 * Mirrors the structure and interaction count of the English lessons
 * in lessonSamples.js but teaches Hindi words and phrases.
 *
 * Each lesson includes full i18n support (english, tamil, hindi)
 * so the UI text can be rendered in the learner's preferred language
 * while the taught content remains in Hindi.
 */

const lessonSamplesHindi = {
  'lesson-greetings-hindi': {
    _id: 'lesson-greetings-hindi',
    title: 'अभिवादन',
    titleI18n: {
      english: 'Greetings',
      tamil: 'வாழ்த்துகள்',
      hindi: 'अभिवादन',
    },
    textContent:
      'नमस्ते! यह पाठ आपको शिष्ट तरीके से अभिवादन करना सिखाता है।\n\nटिप: अगर कोई शब्द कठिन लगे, तो उसे भागों में तोड़कर पढ़ें।\n\nमुस्कान के साथ "नमस्ते" या "नमस्कार" कहें।\n\n"आप कैसे हैं?" पूछें और "मैं ठीक हूँ, धन्यवाद।" जवाब दें।',
    textContentI18n: {
      english:
        'Namaste! This lesson helps you greet someone politely in Hindi.\n\nTip: If a word feels hard, break it into parts.\n\nSay "Namaste" or "Namaskar" with a smile.\n\nAsk "Aap kaise hain?" and respond with "Main theek hoon, dhanyavaad."',
      tamil:
        'நமஸ்தே! இந்தப் பாடம் இந்தியில் மரியாதையுடன் வாழ்த்த உதவும்.\n\nகுறிப்பு: ஒரு சொல் கடினமாக இருந்தால், அதை பிரித்து வாசிக்கவும்.\n\nசிரிப்புடன் "நமஸ்தே" அல்லது "நமஸ்கார்" சொல்லுங்கள்.\n\n"ஆப் கைசே ஹைன்?" என்று கேட்டு "மைன் தீக் ஹூன், தன்யவாத்." என்று பதில் சொல்லுங்கள்.',
      hindi:
        'नमस्ते! यह पाठ आपको शिष्ट तरीके से अभिवादन करना सिखाता है।\n\nटिप: अगर कोई शब्द कठिन लगे, तो उसे भागों में तोड़कर पढ़ें।\n\nमुस्कान के साथ "नमस्ते" या "नमस्कार" कहें।\n\n"आप कैसे हैं?" पूछें और "मैं ठीक हूँ, धन्यवाद।" जवाब दें।',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/wave.svg', description: 'मुस्कान के साथ नमस्ते कहें।' },
      { iconUrl: '/visuals/speech.svg', description: 'सरल अभिवादन वाक्यों का उपयोग करें।' },
    ],
    highlights: [
      { id: 'h1', phrase: 'नमस्ते', emphasisType: 'background', color: '#ffe7a3', position: 0 },
      { id: 'h2', phrase: 'आप कैसे हैं?', emphasisType: 'underline' },
    ],
    visualAids: [
      {
        id: 'v1',
        imageUrl: '/visuals/wave.svg',
        altText: 'Waving hand icon',
        relatedPhrase: 'नमस्ते',
        placement: 'inline',
      },
      {
        id: 'v2',
        imageUrl: '/visuals/speech.svg',
        altText: 'Speech bubble icon',
        relatedPhrase: 'आप कैसे हैं?',
        placement: 'below',
      },
    ],
    interactions: [
      {
        id: 'greet-hi-1',
        type: 'true_false',
        question: 'क्या "नमस्ते" एक दोस्ताना अभिवादन है?',
        questionI18n: {
          english: 'Is "नमस्ते" (Namaste) a friendly greeting?',
          tamil: '"நமஸ்தே" (Namaste) என்பது நட்பான வாழ்த்தா?',
          hindi: 'क्या "नमस्ते" एक दोस्ताना अभिवादन है?',
        },
        questionImageUrl: '/images/greeting-hello.svg',
        questionAudioUrl: '/audio/greet-1-question.mp3',
        correctAnswer: 'True',
        hint: 'यह शब्द भारत में सबसे आम अभिवादन है।',
        hintI18n: {
          english: 'This is the most common greeting in India.',
          tamil: 'இது இந்தியாவில் மிகவும் பொதுவான வாழ்த்து.',
          hindi: 'यह शब्द भारत में सबसे आम अभिवादन है।',
        },
        explanation: '"नमस्ते" किसी का अभिवादन करने का सामान्य और दोस्ताना तरीका है।',
        explanationI18n: {
          english: '"नमस्ते" (Namaste) is a common, friendly way to greet someone in Hindi.',
          tamil: '"நமஸ்தே" (Namaste) என்பது இந்தியில் ஒருவரை வாழ்த்தப் பயன்படும் பொதுவான, நட்பான சொல்.',
          hindi: '"नमस्ते" किसी का अभिवादन करने का सामान्य और दोस्ताना तरीका है।',
        },
        explanationAudioUrl: '/audio/greet-1-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'बहुत बढ़िया! "नमस्ते" एक दोस्ताना अभिवादन है।',
          correctAudioUrl: '/audio/greet-1-correct.mp3',
          incorrect: 'अच्छी कोशिश। चलिए फिर से कोशिश करते हैं।',
          incorrectAudioUrl: '/audio/greet-1-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great job! "नमस्ते" (Namaste) is a friendly greeting.',
            tamil: 'சிறப்பாக செய்தீர்கள்! "நமஸ்தே" என்பது நட்பான வாழ்த்து.',
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
        id: 'greet-hi-2',
        type: 'multiple_choice',
        question: 'एक दोस्ताना अभिवादन चुनें।',
        questionI18n: {
          english: 'Choose a friendly greeting.',
          tamil: 'நட்பான வாழ்த்தைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'एक दोस्ताना अभिवादन चुनें।',
        },
        questionImageUrl: '/images/greeting-options.svg',
        questionAudioUrl: '/audio/greet-2-question.mp3',
        options: ['नमस्ते', 'अलविदा', 'बाद में'],
        optionsI18n: [
          { english: 'Namaste (Hello)', tamil: 'நமஸ்தே (வணக்கம்)', hindi: 'नमस्ते' },
          { english: 'Goodbye', tamil: 'பிரியாவிடை', hindi: 'अलविदा' },
          { english: 'Later', tamil: 'பின்னர்', hindi: 'बाद में' },
        ],
        correctAnswer: 0,
        hint: 'यह वह शब्द है जो बातचीत की शुरुआत में कहा जाता है।',
        hintI18n: {
          english: 'It is a word you say at the start of a conversation.',
          tamil: 'உரையாடலை தொடங்கும்போது சொல்லும் ஒரு சொல்.',
          hindi: 'यह वह शब्द है जो बातचीत की शुरुआत में कहा जाता है।',
        },
        explanation: '"नमस्ते" एक दोस्ताना अभिवादन है।',
        explanationI18n: {
          english: '"नमस्ते" (Namaste) is a friendly greeting.',
          tamil: '"நமஸ்தே" என்பது நட்பான வாழ்த்து.',
          hindi: '"नमस्ते" एक दोस्ताना अभिवादन है।',
        },
        explanationAudioUrl: '/audio/greet-2-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'हाँ! "नमस्ते" एक दोस्ताना अभिवादन है।',
          correctAudioUrl: '/audio/greet-2-correct.mp3',
          incorrect: 'अच्छी कोशिश। शुरुआत में उपयोग होने वाला अभिवादन चुनें।',
          incorrectAudioUrl: '/audio/greet-2-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Yes! "नमस्ते" (Namaste) is a friendly greeting.',
            tamil: 'ஆம்! "நமஸ்தே" என்பது நட்பான வாழ்த்து.',
            hindi: 'हाँ! "नमस्ते" एक दोस्ताना अभिवादन है।',
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
        id: 'greet-hi-3',
        type: 'click',
        question: 'किसी का हाल-चाल पूछने के लिए कौन सा वाक्य उपयोग करें?',
        questionI18n: {
          english: 'Click the phrase you use to ask about someone.',
          tamil: 'ஒருவரைப் பற்றி கேட்பதற்கு பயன்படுத்தும் வாக்கியத்தை கிளிக் செய்யவும்.',
          hindi: 'किसी का हाल-चाल पूछने के लिए कौन सा वाक्य उपयोग करें?',
        },
        questionImageUrl: '/images/asking-question.svg',
        questionAudioUrl: '/audio/greet-3-question.mp3',
        options: ['आप कैसे हैं?', 'यह कहाँ है?', 'फिर मिलेंगे'],
        optionsI18n: [
          { english: 'How are you?', tamil: 'நீங்கள் எப்படி இருக்கிறீர்கள்?', hindi: 'आप कैसे हैं?' },
          { english: 'Where is it?', tamil: 'அது எங்கே?', hindi: 'यह कहाँ है?' },
          { english: 'See you later', tamil: 'பின்னர் சந்திப்போம்', hindi: 'फिर मिलेंगे' },
        ],
        correctAnswer: 0,
        hint: 'यह हाल-चाल (भावनाओं) के बारे में सवाल है।',
        hintI18n: {
          english: 'It is a question about feelings.',
          tamil: 'இது நலன்/உணர்வுகளைப் பற்றிய கேள்வி.',
          hindi: 'यह हाल-चाल (भावनाओं) के बारे में सवाल है।',
        },
        explanation: '"आप कैसे हैं?" किसी का हाल-चाल पूछने के लिए कहा जाता है।',
        explanationI18n: {
          english: '"आप कैसे हैं?" (Aap kaise hain?) is used to ask about someone.',
          tamil: '"ஆப் கைசே ஹைன்?" என்று ஒருவர் நலன் கேட்கலாம்.',
          hindi: '"आप कैसे हैं?" किसी का हाल-चाल पूछने के लिए कहा जाता है।',
        },
        explanationAudioUrl: '/audio/greet-3-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'बहुत अच्छा! यह किसी का हाल-चाल पूछने वाला सवाल है।',
          correctAudioUrl: '/audio/greet-3-correct.mp3',
          incorrect: 'अच्छी कोशिश। हाल-चाल वाला सवाल चुनें।',
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
        id: 'greet-hi-4',
        type: 'short_answer',
        question: 'एक सरल अभिवादन बोलें या टाइप करें।',
        questionI18n: {
          english: 'Say or type a simple greeting in Hindi.',
          tamil: 'ஒரு எளிய இந்தி வாழ்த்தை சொல்லவும் அல்லது டைப் செய்யவும்.',
          hindi: 'एक सरल अभिवादन बोलें या टाइप करें।',
        },
        questionImageUrl: '/images/type-greeting.svg',
        questionAudioUrl: '/audio/greet-4-question.mp3',
        correctAnswer: 'नमस्ते',
        correctAnswerI18n: {
          english: 'Namaste',
          tamil: 'நமஸ்தே',
          hindi: 'नमस्ते',
        },
        hint: '"नमस्ते" कहकर देखें।',
        hintI18n: {
          english: 'Try "नमस्ते" (Namaste).',
          tamil: '"நமஸ்தே" என்று முயற்சிக்கவும்.',
          hindi: '"नमस्ते" कहकर देखें।',
        },
        explanation: '"नमस्ते" एक सरल और दोस्ताना अभिवादन है।',
        explanationI18n: {
          english: '"नमस्ते" (Namaste) is a simple, friendly greeting.',
          tamil: '"நமஸ்தே" என்பது எளிய, நட்பான வாழ்த்து.',
          hindi: '"नमस्ते" एक सरल और दोस्ताना अभिवादन है।',
        },
        explanationAudioUrl: '/audio/greet-4-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 35,
        feedback: {
          correct: 'बहुत अच्छा अभिवादन!',
          correctAudioUrl: '/audio/greet-4-correct.mp3',
          incorrect: 'अच्छी कोशिश। एक सरल अभिवादन "नमस्ते" है।',
          incorrectAudioUrl: '/audio/greet-4-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great greeting!',
            tamil: 'அருமையான வாழ்த்து!',
            hindi: 'बहुत अच्छा अभिवादन!',
          },
          incorrect: {
            english: 'Nice try. A simple greeting is "नमस्ते" (Namaste).',
            tamil: 'நல்ல முயற்சி. எளிய வாழ்த்து "நமஸ்தே".',
            hindi: 'अच्छी कोशिश। एक सरल अभिवादन "नमस्ते" है।',
          },
        },
        position: 3,
      },
      {
        id: 'greet-hi-5',
        type: 'multiple_choice',
        question: '"आप कैसे हैं?" का सबसे अच्छा जवाब चुनें।',
        questionI18n: {
          english: 'Pick the best reply to "आप कैसे हैं?" (How are you?)',
          tamil: '"ஆப் கைசே ஹைன்?" (நீங்கள் எப்படி இருக்கிறீர்கள்?) என்பதற்கு சிறந்த பதிலைத் தேர்ந்தெடுக்கவும்.',
          hindi: '"आप कैसे हैं?" का सबसे अच्छा जवाब चुनें।',
        },
        questionImageUrl: '/images/responding-greeting.svg',
        questionAudioUrl: '/audio/greet-5-question.mp3',
        options: ['मैं ठीक हूँ, धन्यवाद।', 'नीला।', 'घर पर।'],
        optionsI18n: [
          { english: 'I am fine, thank you.', tamil: 'நான் நன்றாக இருக்கிறேன், நன்றி.', hindi: 'मैं ठीक हूँ, धन्यवाद।' },
          { english: 'Blue.', tamil: 'நீலம்.', hindi: 'नीला।' },
          { english: 'At home.', tamil: 'வீட்டில்.', hindi: 'घर पर।' },
        ],
        correctAnswer: 0,
        hint: 'यह एक शिष्ट और पूरा जवाब है।',
        hintI18n: {
          english: 'It is a polite, full reply.',
          tamil: 'இது மரியாதையான, முழுமையான பதில்.',
          hindi: 'यह एक शिष्ट और पूरा जवाब है।',
        },
        explanation: '"मैं ठीक हूँ, धन्यवाद।" एक शिष्ट उत्तर है।',
        explanationI18n: {
          english: '"मैं ठीक हूँ, धन्यवाद।" (Main theek hoon, dhanyavaad) is a polite response.',
          tamil: '"மைன் தீக் ஹூன், தன்யவாத்." என்பது மரியாதையான பதில்.',
          hindi: '"मैं ठीक हूँ, धन्यवाद।" एक शिष्ट उत्तर है।',
        },
        explanationAudioUrl: '/audio/greet-5-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 40,
        feedback: {
          correct: 'बहुत बढ़िया जवाब!',
          correctAudioUrl: '/audio/greet-5-correct.mp3',
          incorrect: 'अच्छी कोशिश। शिष्ट और पूरा जवाब चुनें।',
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

  'lesson-vocabulary-hindi': {
    _id: 'lesson-vocabulary-hindi',
    title: 'मूल शब्द',
    titleI18n: {
      english: 'Basic Words',
      tamil: 'அடிப்படை சொற்கள்',
      hindi: 'मूल शब्द',
    },
    textContent:
      'आइए रोज़मर्रा की चीज़ों के लिए सरल हिन्दी शब्द सीखें।\n\nटिप: लंबे शब्दों को भागों में तोड़ें।\n\nशब्द बोलें और वस्तु की ओर इशारा करें।\n\nहर शब्द को धीरे-धीरे दोहराएँ।',
    textContentI18n: {
      english:
        'Let\u2019s learn simple Hindi words for everyday items.\n\nTip: Break longer words into parts.\n\nSay the word and point to the item.\n\nRepeat each word slowly to build confidence.',
      tamil:
        'அன்றாட பொருட்களுக்கான எளிய இந்தி சொற்களை கற்றுக்கொள்வோம்.\n\nகுறிப்பு: நீளமான சொற்களை பிரிக்கவும்.\n\nசொல்லை சொல்லி, பொருளை காட்டுங்கள்.\n\nஒவ்வொரு சொல்லையும் மெதுவாக மீண்டும் சொல்லுங்கள்.',
      hindi:
        'आइए रोज़मर्रा की चीज़ों के लिए सरल हिन्दी शब्द सीखें।\n\nटिप: लंबे शब्दों को भागों में तोड़ें।\n\nशब्द बोलें और वस्तु की ओर इशारा करें।\n\nहर शब्द को धीरे-धीरे दोहराएँ।',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/speech.svg', description: 'हर शब्द को स्पष्ट रूप से बोलें।' },
      { iconUrl: '/visuals/sun.svg', description: 'अपने आसपास की वस्तुओं से अभ्यास करें।' },
    ],
    highlights: [
      { id: 'h3', phrase: 'सरल शब्द', emphasisType: 'bold' },
      { id: 'h4', phrase: 'दोहराएँ', emphasisType: 'underline' },
    ],
    visualAids: [
      {
        id: 'v3',
        imageUrl: '/visuals/sun.svg',
        altText: 'Sun icon',
        relatedPhrase: 'दोहराएँ',
        placement: 'side',
      },
    ],
    interactions: [
      {
        id: 'vocab-hi-1',
        type: 'multiple_choice',
        question: 'जिस चीज़ पर आप बैठ सकते हैं, उसका हिन्दी शब्द कौन सा है?',
        questionI18n: {
          english: 'Which Hindi word matches something you can sit on?',
          tamil: 'நீங்கள் உட்காரக்கூடிய பொருளுக்கு பொருந்தும் இந்தி சொல் எது?',
          hindi: 'जिस चीज़ पर आप बैठ सकते हैं, उसका हिन्दी शब्द कौन सा है?',
        },
        questionImageUrl: '/images/chair.svg',
        questionAudioUrl: '/audio/vocab-1-question.mp3',
        options: ['कुर्सी', 'सेब', 'बारिश'],
        optionsI18n: [
          { english: 'Chair (Kursi)', tamil: 'நாற்காலி (குர்சி)', hindi: 'कुर्सी' },
          { english: 'Apple (Seb)', tamil: 'ஆப்பிள் (சேப்)', hindi: 'सेब' },
          { english: 'Rain (Baarish)', tamil: 'மழை (பாரிஷ்)', hindi: 'बारिश' },
        ],
        correctAnswer: 0,
        hint: 'धीरे-धीरे बोलकर देखें: कुर-सी।',
        hintI18n: {
          english: 'Say it slowly: Kur-si.',
          tamil: 'மெதுவாக சொல்லிப் பாருங்கள்: குர்-சி.',
          hindi: 'धीरे-धीरे बोलकर देखें: कुर-सी।',
        },
        explanation: 'कुर्सी वह फर्नीचर है जिस पर आप बैठते हैं।',
        explanationI18n: {
          english: 'कुर्सी (Kursi) is furniture you sit on — it means "chair" in Hindi.',
          tamil: 'குர்சி என்பது உட்கார பயன்படும் பொருள் — இந்தியில் "chair" என்று பொருள்.',
          hindi: 'कुर्सी वह फर्नीचर है जिस पर आप बैठते हैं।',
        },
        explanationAudioUrl: '/audio/vocab-1-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'हाँ! कुर्सी पर आप बैठ सकते हैं।',
          correctAudioUrl: '/audio/vocab-1-correct.mp3',
          incorrect: 'अच्छी कोशिश। बैठने वाली चीज़ का शब्द चुनें।',
          incorrectAudioUrl: '/audio/vocab-1-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Yes! कुर्सी (Kursi) means chair — something you sit on.',
            tamil: 'ஆம்! குர்சி (Kursi) என்பது நாற்காலி — உட்காரலாம்.',
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
        id: 'vocab-hi-2',
        type: 'multiple_choice',
        question: 'जिस चीज़ को आप खा सकते हैं, उसका हिन्दी शब्द कौन सा है?',
        questionI18n: {
          english: 'Which Hindi word matches something you can eat?',
          tamil: 'நீங்கள் சாப்பிடக்கூடிய பொருளுக்கு பொருந்தும் இந்தி சொல் எது?',
          hindi: 'जिस चीज़ को आप खा सकते हैं, उसका हिन्दी शब्द कौन सा है?',
        },
        questionImageUrl: '/images/apple.svg',
        questionAudioUrl: '/audio/vocab-2-question.mp3',
        options: ['सेब', 'कुर्सी', 'किताब'],
        optionsI18n: [
          { english: 'Apple (Seb)', tamil: 'ஆப்பிள் (சேப்)', hindi: 'सेब' },
          { english: 'Chair (Kursi)', tamil: 'நாற்காலி (குர்சி)', hindi: 'कुर्सी' },
          { english: 'Book (Kitaab)', tamil: 'புத்தகம் (கிதாப்)', hindi: 'किताब' },
        ],
        correctAnswer: 0,
        hint: 'यह एक फल है।',
        hintI18n: {
          english: 'It is a fruit.',
          tamil: 'இது ஒரு பழம்.',
          hindi: 'यह एक फल है।',
        },
        explanation: 'सेब एक फल है जिसे आप खा सकते हैं।',
        explanationI18n: {
          english: 'सेब (Seb) is a fruit you can eat — it means "apple" in Hindi.',
          tamil: 'சேப் (Seb) ஒரு சாப்பிடக்கூடிய பழம் — இந்தியில் "apple" என்று பொருள்.',
          hindi: 'सेब एक फल है जिसे आप खा सकते हैं।',
        },
        explanationAudioUrl: '/audio/vocab-2-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'सही! सेब खाया जा सकता है।',
          correctAudioUrl: '/audio/vocab-2-correct.mp3',
          incorrect: 'अच्छी कोशिश। फल चुनें।',
          incorrectAudioUrl: '/audio/vocab-2-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Nice! सेब (Seb) means apple — something you eat.',
            tamil: 'சரி! சேப் (Seb) என்பது ஆப்பிள் — சாப்பிடலாம்.',
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
        id: 'vocab-hi-3',
        type: 'click',
        question: 'जिस चीज़ को आप पढ़ सकते हैं, उसका हिन्दी शब्द चुनें।',
        questionI18n: {
          english: 'Click the Hindi word for something you can read.',
          tamil: 'நீங்கள் படிக்கக்கூடிய பொருளின் இந்தி சொல்லை கிளிக் செய்யவும்.',
          hindi: 'जिस चीज़ को आप पढ़ सकते हैं, उसका हिन्दी शब्द चुनें।',
        },
        questionImageUrl: '/images/book.svg',
        questionAudioUrl: '/audio/vocab-3-question.mp3',
        options: ['किताब', 'बादल', 'जूता'],
        optionsI18n: [
          { english: 'Book (Kitaab)', tamil: 'புத்தகம் (கிதாப்)', hindi: 'किताब' },
          { english: 'Cloud (Baadal)', tamil: 'மேகம் (பாதல்)', hindi: 'बादल' },
          { english: 'Shoe (Joota)', tamil: 'செருப்பு (ஜூதா)', hindi: 'जूता' },
        ],
        correctAnswer: 0,
        hint: 'इसे खोलने पर शब्द दिखते हैं।',
        hintI18n: {
          english: 'You open it to see words.',
          tamil: 'இதைத் திறந்தால் வார்த்தைகளை பார்க்கலாம்.',
          hindi: 'इसे खोलने पर शब्द दिखते हैं।',
        },
        explanation: 'किताब वह चीज़ है जिसे आप पढ़ते हैं।',
        explanationI18n: {
          english: 'किताब (Kitaab) is something you read — it means "book" in Hindi.',
          tamil: 'கிதாப் (Kitaab) என்பது நீங்கள் படிக்கும் பொருள் — இந்தியில் "book" என்று பொருள்.',
          hindi: 'किताब वह चीज़ है जिसे आप पढ़ते हैं।',
        },
        explanationAudioUrl: '/audio/vocab-3-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'बहुत अच्छा! किताब पढ़ने के लिए होती है।',
          correctAudioUrl: '/audio/vocab-3-correct.mp3',
          incorrect: 'अच्छी कोशिश। पढ़ने वाली चीज़ चुनें।',
          incorrectAudioUrl: '/audio/vocab-3-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great choice! किताब (Kitaab) means book — for reading.',
            tamil: 'சிறந்த தேர்வு! கிதாப் (Kitaab) என்பது புத்தகம் — படிப்பதற்கு.',
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
        id: 'vocab-hi-4',
        type: 'short_answer',
        question: 'जहाँ आप रहते हैं, उसके लिए हिन्दी शब्द बोलें या टाइप करें।',
        questionI18n: {
          english: 'Say or type the Hindi word for a place you live.',
          tamil: 'நீங்கள் வாழும் இடத்துக்கான இந்தி சொல்லை சொல்லவும் அல்லது டைப் செய்யவும்.',
          hindi: 'जहाँ आप रहते हैं, उसके लिए हिन्दी शब्द बोलें या टाइप करें।',
        },
        questionImageUrl: '/images/home.svg',
        questionAudioUrl: '/audio/vocab-4-question.mp3',
        correctAnswer: 'घर',
        correctAnswerI18n: {
          english: 'Ghar (Home)',
          tamil: 'கர் (வீடு)',
          hindi: 'घर',
        },
        hint: 'जहाँ आप सोते हैं, उसके बारे में सोचें।',
        hintI18n: {
          english: 'Think about where you sleep.',
          tamil: 'நீங்கள் தூங்கும் இடத்தை நினைத்துப் பாருங்கள்.',
          hindi: 'जहाँ आप सोते हैं, उसके बारे में सोचें।',
        },
        explanation: 'घर वह जगह है जहाँ आप रहते हैं।',
        explanationI18n: {
          english: 'घर (Ghar) means "home" — the place you live.',
          tamil: 'கர் (Ghar) என்பது "வீடு" — நீங்கள் வாழும் இடம்.',
          hindi: 'घर वह जगह है जहाँ आप रहते हैं।',
        },
        explanationAudioUrl: '/audio/vocab-4-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 35,
        feedback: {
          correct: 'बहुत अच्छा शब्द!',
          correctAudioUrl: '/audio/vocab-4-correct.mp3',
          incorrect: 'अच्छी कोशिश। सरल शब्द "घर" है।',
          incorrectAudioUrl: '/audio/vocab-4-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great word!',
            tamil: 'அருமையான சொல்!',
            hindi: 'बहुत अच्छा शब्द!',
          },
          incorrect: {
            english: 'Nice try. The Hindi word is "घर" (Ghar).',
            tamil: 'நல்ல முயற்சி. இந்தி சொல் "கர்" (Ghar).',
            hindi: 'अच्छी कोशिश। सरल शब्द "घर" है।',
          },
        },
        position: 3,
      },
      {
        id: 'vocab-hi-5',
        type: 'multiple_choice',
        question: 'अपने पैरों में पहनने वाली चीज़ का हिन्दी शब्द चुनें।',
        questionI18n: {
          english: 'Pick the Hindi word for something you wear on your feet.',
          tamil: 'உங்கள் கால்களில் அணிவதைக் குறிக்கும் இந்தி சொல்லைத் தேர்ந்தெடுக்கவும்.',
          hindi: 'अपने पैरों में पहनने वाली चीज़ का हिन्दी शब्द चुनें।',
        },
        questionImageUrl: '/images/shoe.svg',
        questionAudioUrl: '/audio/vocab-5-question.mp3',
        options: ['जूता', 'पत्ता', 'बादल'],
        optionsI18n: [
          { english: 'Shoe (Joota)', tamil: 'செருப்பு (ஜூதா)', hindi: 'जूता' },
          { english: 'Leaf (Patta)', tamil: 'இலை (பத்தா)', hindi: 'पत्ता' },
          { english: 'Cloud (Baadal)', tamil: 'மேகம் (பாதல்)', hindi: 'बादल' },
        ],
        correctAnswer: 0,
        hint: 'इसे आप पैरों में पहनते हैं।',
        hintI18n: {
          english: 'You wear it on your feet.',
          tamil: 'இதைக் காலில் அணிவார்கள்.',
          hindi: 'इसे आप पैरों में पहनते हैं।',
        },
        explanation: 'जूता पैर में पहना जाता है।',
        explanationI18n: {
          english: 'जूता (Joota) means "shoe" — it is worn on your foot.',
          tamil: 'ஜூதா (Joota) என்பது "செருப்பு" — காலில் அணியப்படும்.',
          hindi: 'जूता पैर में पहना जाता है।',
        },
        explanationAudioUrl: '/audio/vocab-5-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 40,
        feedback: {
          correct: 'बहुत बढ़िया! जूता पैर में पहना जाता है।',
          correctAudioUrl: '/audio/vocab-5-correct.mp3',
          incorrect: 'अच्छी कोशिश। पहनने वाली चीज़ चुनें।',
          incorrectAudioUrl: '/audio/vocab-5-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Excellent! जूता (Joota) means shoe — goes on your foot.',
            tamil: 'சிறப்பு! ஜூதா (Joota) என்பது செருப்பு — காலில் அணிவார்கள்.',
            hindi: 'बहुत बढ़िया! जूता पैर में पहना जाता है।',
          },
          incorrect: {
            english: 'Good effort. Choose the thing you wear on your feet.',
            tamil: 'நல்ல முயற்சி. காலில் அணியக்கூடிய பொருளைத் தேர்வுசெய்யவும்.',
            hindi: 'अच्छी कोशिश। पहनने वाली चीज़ चुनें।',
          },
        },
        position: 4,
      },
    ],
  },

  'lesson-numbers-hindi': {
    _id: 'lesson-numbers-hindi',
    title: 'संख्याएँ',
    titleI18n: {
      english: 'Numbers',
      tamil: 'எண்கள்',
      hindi: 'संख्याएँ',
    },
    textContent:
      'एक से पाँच तक गिनें।\n\nटिप: कुछ शब्द छोटे होते हैं, कुछ लंबे। समय लेकर करें।\n\nहर संख्या के लिए एक रंग बताइए।\n\nसंख्याएँ और रंग मिलाकर सीखना मज़ेदार बनाइए।',
    textContentI18n: {
      english:
        'Count from one to five in Hindi.\n\nTip: Some words are short, some are long. Take your time.\n\nName a colour for each number.\n\nMix numbers and colours to make learning fun.',
      tamil:
        'இந்தியில் 1 முதல் 5 வரை எண்ணுங்கள்.\n\nகுறிப்பு: சில சொற்கள் குறுகியவை, சில நீளமானவை. மெதுவாக செய்யுங்கள்.\n\nஒவ்வொரு எண்ணுக்கும் ஒரு நிறத்தை சொல்லுங்கள்.\n\nஎண்களையும் நிறங்களையும் சேர்த்து கற்றலை மகிழ்ச்சியாக்குங்கள்.',
      hindi:
        'एक से पाँच तक गिनें।\n\nटिप: कुछ शब्द छोटे होते हैं, कुछ लंबे। समय लेकर करें।\n\nहर संख्या के लिए एक रंग बताइए।\n\nसंख्याएँ और रंग मिलाकर सीखना मज़ेदार बनाइए।',
    },
    audioUrl: '',
    visuals: [
      { iconUrl: '/visuals/sun.svg', description: 'याद रखने के लिए चमकीले रंग इस्तेमाल करें।' },
      { iconUrl: '/visuals/wave.svg', description: 'सीखते समय उँगलियों पर गिनें।' },
    ],
    highlights: [
      { id: 'h5', phrase: 'एक से पाँच तक गिनें', emphasisType: 'background' },
      { id: 'h6', phrase: 'रंग', emphasisType: 'bold' },
    ],
    visualAids: [
      {
        id: 'v4',
        imageUrl: '/visuals/wave.svg',
        altText: 'Counting hand icon',
        relatedPhrase: 'गिनें',
        placement: 'inline',
      },
    ],
    interactions: [
      {
        id: 'numbers-hi-1',
        type: 'click',
        question: '"दो" (2) के बाद कौन सी हिन्दी संख्या आती है?',
        questionI18n: {
          english: 'Click the Hindi number that comes after "दो" (2).',
          tamil: '"தோ" (2) க்கு அடுத்ததாக வரும் இந்தி எண்ணை கிளிக் செய்யவும்.',
          hindi: '"दो" (2) के बाद कौन सी हिन्दी संख्या आती है?',
        },
        questionImageUrl: '/images/number-sequence.svg',
        questionAudioUrl: '/audio/numbers-1-question.mp3',
        options: ['एक', 'तीन', 'पाँच'],
        optionsI18n: [
          { english: 'One (Ek)', tamil: 'ஒன்று (ஏக்)', hindi: 'एक' },
          { english: 'Three (Teen)', tamil: 'மூன்று (தீன்)', hindi: 'तीन' },
          { english: 'Five (Paanch)', tamil: 'ஐந்து (பாஞ்ச்)', hindi: 'पाँच' },
        ],
        correctAnswer: 1,
        hint: 'आगे गिनें: एक, दो, तीन।',
        hintI18n: {
          english: 'Count upward: Ek (1), Do (2), Teen (3).',
          tamil: 'மேலே எண்ணுங்கள்: ஏக் (1), தோ (2), தீன் (3).',
          hindi: 'आगे गिनें: एक, दो, तीन।',
        },
        explanation: '"दो" (2) के बाद "तीन" (3) आता है।',
        explanationI18n: {
          english: 'The Hindi number after "दो" (2) is "तीन" (3).',
          tamil: '"தோ" (2) க்கு அடுத்த இந்தி எண் "தீன்" (3).',
          hindi: '"दो" (2) के बाद "तीन" (3) आता है।',
        },
        explanationAudioUrl: '/audio/numbers-1-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'बहुत बढ़िया! "दो" के बाद "तीन" आता है।',
          correctAudioUrl: '/audio/numbers-1-correct.mp3',
          incorrect: 'अच्छी कोशिश। एक, दो, तीन गिनें।',
          incorrectAudioUrl: '/audio/numbers-1-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Great job! "तीन" (Teen) comes after "दो" (Do).',
            tamil: 'சிறப்பு! "தோ" (Do) க்கு பின் "தீன்" (Teen) வருகிறது.',
            hindi: 'बहुत बढ़िया! "दो" के बाद "तीन" आता है।',
          },
          incorrect: {
            english: 'Good effort. Count up: Ek, Do, Teen.',
            tamil: 'நல்ல முயற்சி. ஏக், தோ, தீன் என்று எண்ணுங்கள்.',
            hindi: 'अच्छी कोशिश। एक, दो, तीन गिनें।',
          },
        },
        position: 0,
      },
      {
        id: 'numbers-hi-2',
        type: 'multiple_choice',
        question: '"चार" (4) के बाद कौन सी हिन्दी संख्या आती है?',
        questionI18n: {
          english: 'Which Hindi number comes after "चार" (4)?',
          tamil: '"சார்" (4) க்கு அடுத்த இந்தி எண் எது?',
          hindi: '"चार" (4) के बाद कौन सी हिन्दी संख्या आती है?',
        },
        questionImageUrl: '/images/counting-4-5.svg',
        questionAudioUrl: '/audio/numbers-2-question.mp3',
        options: ['तीन', 'पाँच', 'छह'],
        optionsI18n: [
          { english: 'Three (Teen)', tamil: 'மூன்று (தீன்)', hindi: 'तीन' },
          { english: 'Five (Paanch)', tamil: 'ஐந்து (பாஞ்ச்)', hindi: 'पाँच' },
          { english: 'Six (Chhah)', tamil: 'ஆறு (சஹ்)', hindi: 'छह' },
        ],
        correctAnswer: 1,
        hint: 'आगे गिनें: चार, पाँच।',
        hintI18n: {
          english: 'Count forward: Chaar (4), Paanch (5).',
          tamil: 'முன்னால் எண்ணுங்கள்: சார் (4), பாஞ்ச் (5).',
          hindi: 'आगे गिनें: चार, पाँच।',
        },
        explanation: '"चार" (4) के बाद "पाँच" (5) आता है।',
        explanationI18n: {
          english: 'The Hindi number after "चार" (4) is "पाँच" (5).',
          tamil: '"சார்" (4) க்கு அடுத்த இந்தி எண் "பாஞ்ச்" (5).',
          hindi: '"चार" (4) के बाद "पाँच" (5) आता है।',
        },
        explanationAudioUrl: '/audio/numbers-2-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 25,
        feedback: {
          correct: 'सही! "चार" के बाद "पाँच" आता है।',
          correctAudioUrl: '/audio/numbers-2-correct.mp3',
          incorrect: 'अच्छी कोशिश। चार, पाँच गिनकर देखें।',
          incorrectAudioUrl: '/audio/numbers-2-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Nice! "पाँच" (Paanch) comes after "चार" (Chaar).',
            tamil: 'சரி! "சார்" (Chaar) க்கு பின் "பாஞ்ச்" (Paanch) வருகிறது.',
            hindi: 'सही! "चार" के बाद "पाँच" आता है।',
          },
          incorrect: {
            english: 'Nice try. Count forward to find Paanch (5).',
            tamil: 'நல்ல முயற்சி. சார், பாஞ்ச் என்று எண்ணிப் பாருங்கள்.',
            hindi: 'अच्छी कोशिश। चार, पाँच गिनकर देखें।',
          },
        },
        position: 1,
      },
      {
        id: 'numbers-hi-3',
        type: 'multiple_choice',
        question: 'किस समूह में तीन वस्तुएँ हैं?',
        questionI18n: {
          english: 'Which set has three items?',
          tamil: 'மூன்று பொருட்கள் உள்ள தொகுப்பு எது?',
          hindi: 'किस समूह में तीन वस्तुएँ हैं?',
        },
        questionImageUrl: '/images/counting-stars.svg',
        questionAudioUrl: '/audio/numbers-3-question.mp3',
        options: ['★★★', '★★', '★★★★'],
        correctAnswer: 0,
        hint: 'तारों को गिनें।',
        hintI18n: {
          english: 'Count the stars.',
          tamil: 'நட்சத்திரங்களை எண்ணுங்கள்.',
          hindi: 'तारों को गिनें।',
        },
        explanation: 'तीन तारे मतलब "तीन" (3) वस्तुएँ।',
        explanationI18n: {
          english: 'Three stars means "तीन" (Teen) = 3 items.',
          tamil: 'மூன்று நட்சத்திரங்கள் என்றால் "தீன்" (Teen) = 3 பொருட்கள்.',
          hindi: 'तीन तारे मतलब "तीन" (3) वस्तुएँ।',
        },
        explanationAudioUrl: '/audio/numbers-3-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 30,
        feedback: {
          correct: 'बहुत अच्छी गिनती!',
          correctAudioUrl: '/audio/numbers-3-correct.mp3',
          incorrect: 'अच्छी कोशिश। तारों को ध्यान से गिनें।',
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
        id: 'numbers-hi-4',
        type: 'short_answer',
        question: '"एक" (1) के बाद आने वाली हिन्दी संख्या बोलें या टाइप करें।',
        questionI18n: {
          english: 'Say or type the Hindi number after "एक" (1).',
          tamil: '"ஏக்" (1) க்கு அடுத்த இந்தி எண்ணை சொல்லவும் அல்லது டைப் செய்யவும்.',
          hindi: '"एक" (1) के बाद आने वाली हिन्दी संख्या बोलें या टाइप करें।',
        },
        questionImageUrl: '/images/number-1-2.svg',
        questionAudioUrl: '/audio/numbers-4-question.mp3',
        correctAnswer: 'दो',
        correctAnswerI18n: {
          english: 'Do (Two)',
          tamil: 'தோ (இரண்டு)',
          hindi: 'दो',
        },
        hint: 'गिनें: एक, दो।',
        hintI18n: {
          english: 'Count: Ek (1), Do (2).',
          tamil: 'எண்ணுங்கள்: ஏக் (1), தோ (2).',
          hindi: 'गिनें: एक, दो।',
        },
        explanation: '"एक" (1) के बाद "दो" (2) आता है।',
        explanationI18n: {
          english: 'The Hindi number after "एक" (1) is "दो" (2).',
          tamil: '"ஏக்" (1) க்கு அடுத்த இந்தி எண் "தோ" (2).',
          hindi: '"एक" (1) के बाद "दो" (2) आता है।',
        },
        explanationAudioUrl: '/audio/numbers-4-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 35,
        feedback: {
          correct: 'हाँ! जवाब "दो" है।',
          correctAudioUrl: '/audio/numbers-4-correct.mp3',
          incorrect: 'अच्छी कोशिश। जवाब "दो" है।',
          incorrectAudioUrl: '/audio/numbers-4-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Yes! The answer is "दो" (Do).',
            tamil: 'ஆம்! பதில் "தோ" (Do).',
            hindi: 'हाँ! जवाब "दो" है।',
          },
          incorrect: {
            english: 'Nice try. The answer is "दो" (Do).',
            tamil: 'நல்ல முயற்சி. பதில் "தோ" (Do).',
            hindi: 'अच्छी कोशिश। जवाब "दो" है।',
          },
        },
        position: 3,
      },
      {
        id: 'numbers-hi-5',
        type: 'multiple_choice',
        question: '"एक" से "तीन" तक सही क्रम चुनें।',
        questionI18n: {
          english: 'Choose the correct order from "एक" (1) to "तीन" (3).',
          tamil: '"ஏக்" (1) முதல் "தீன்" (3) வரை சரியான வரிசையைத் தேர்ந்தெடுக்கவும்.',
          hindi: '"एक" से "तीन" तक सही क्रम चुनें।',
        },
        questionImageUrl: '/images/number-order.svg',
        questionAudioUrl: '/audio/numbers-5-question.mp3',
        options: ['एक, दो, तीन', 'एक, तीन, दो', 'दो, एक, तीन'],
        optionsI18n: [
          { english: 'Ek, Do, Teen (1, 2, 3)', tamil: 'ஏக், தோ, தீன் (1, 2, 3)', hindi: 'एक, दो, तीन' },
          { english: 'Ek, Teen, Do (1, 3, 2)', tamil: 'ஏக், தீன், தோ (1, 3, 2)', hindi: 'एक, तीन, दो' },
          { english: 'Do, Ek, Teen (2, 1, 3)', tamil: 'தோ, ஏக், தீன் (2, 1, 3)', hindi: 'दो, एक, तीन' },
        ],
        correctAnswer: 0,
        hint: '"एक" से शुरू करके आगे गिनें।',
        hintI18n: {
          english: 'Start at "एक" (Ek) and count up.',
          tamil: '"ஏக்" (Ek) இலிருந்து தொடங்கி மேலே எண்ணுங்கள்.',
          hindi: '"एक" से शुरू करके आगे गिनें।',
        },
        explanation: 'सही क्रम "एक, दो, तीन" (1, 2, 3) है।',
        explanationI18n: {
          english: 'The correct order is "एक, दो, तीन" (Ek, Do, Teen = 1, 2, 3).',
          tamil: 'சரியான வரிசை "ஏக், தோ, தீன்" (1, 2, 3).',
          hindi: 'सही क्रम "एक, दो, तीन" (1, 2, 3) है।',
        },
        explanationAudioUrl: '/audio/numbers-5-explanation.mp3',
        maxAttempts: 3,
        timeLimitSeconds: 40,
        feedback: {
          correct: 'बहुत अच्छा क्रम!',
          correctAudioUrl: '/audio/numbers-5-correct.mp3',
          incorrect: 'अच्छी कोशिश। "एक" से शुरू करके गिनें।',
          incorrectAudioUrl: '/audio/numbers-5-incorrect.mp3',
        },
        feedbackI18n: {
          correct: {
            english: 'Excellent ordering!',
            tamil: 'சிறந்த வரிசை!',
            hindi: 'बहुत अच्छा क्रम!',
          },
          incorrect: {
            english: 'Good effort. Start at "एक" (Ek) and count up.',
            tamil: 'நல்ல முயற்சி. "ஏக்" (Ek) இலிருந்து தொடங்கி எண்ணுங்கள்.',
            hindi: 'अच्छी कोशिश। "एक" से शुरू करके गिनें।',
          },
        },
        position: 4,
      },
    ],
  },
};

export default lessonSamplesHindi;
