/**
 * Audio Generator Script for Lesson Questions
 * 
 * This script generates all required audio files for lesson questions
 * using the TTS service endpoint.
 * 
 * Usage: node generate-audio-files.js
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');

// Configuration
// Backend TTS endpoint is exposed at POST /api/tts/speak
const TTS_SERVICE_URL = 'http://localhost:5002/api/tts/speak';
const OUTPUT_DIR = path.join(__dirname, 'frontend', 'public', 'audio');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Audio content for all lessons
const audioContent = {
  // Greetings Lesson
  'greet-1-question': 'Is Hello a friendly greeting?',
  'greet-1-explanation': 'Hello is a common, friendly way to greet someone.',
  'greet-1-correct': 'Great job! Hello is a friendly greeting.',
  'greet-1-incorrect': 'Good effort. Let\'s try again.',

  'greet-2-question': 'Choose a friendly greeting.',
  'greet-2-explanation': 'Hello is a friendly greeting.',
  'greet-2-correct': 'Yes! Hello is a friendly greeting.',
  'greet-2-incorrect': 'Nice try. Let\'s pick a greeting used at the start.',

  'greet-3-question': 'Click the phrase you use to ask about someone.',
  'greet-3-explanation': 'How are you? is used to ask about someone.',
  'greet-3-correct': 'Nice work! That question checks on someone.',
  'greet-3-incorrect': 'Good effort. Try the question about feelings.',

  'greet-4-question': 'Say or type a simple greeting.',
  'greet-4-explanation': 'Hello is a simple, friendly greeting.',
  'greet-4-correct': 'Great greeting!',
  'greet-4-incorrect': 'Nice try. A simple greeting is Hello.',

  'greet-5-question': 'Pick the best reply to How are you?',
  'greet-5-explanation': 'I am good, thank you is a polite response.',
  'greet-5-correct': 'Excellent response!',
  'greet-5-incorrect': 'Good effort. Choose the polite full reply.',

  // Vocabulary Lesson
  'vocab-1-question': 'Which word matches something you can sit on?',
  'vocab-1-explanation': 'A chair is furniture you sit on.',
  'vocab-1-correct': 'Yes! A chair is something you can sit on.',
  'vocab-1-incorrect': 'Good effort. Try the word for furniture you sit on.',

  'vocab-2-question': 'Which word matches something you can eat?',
  'vocab-2-explanation': 'An apple is a fruit you can eat.',
  'vocab-2-correct': 'Nice! An apple is something you can eat.',
  'vocab-2-incorrect': 'Nice try. Look for the fruit.',

  'vocab-3-question': 'Click the word for something you can read.',
  'vocab-3-explanation': 'A book is something you read.',
  'vocab-3-correct': 'Great choice! A book is for reading.',
  'vocab-3-incorrect': 'Good effort. Try the item you can read.',

  'vocab-4-question': 'Say or type a simple word for a place you live.',
  'vocab-4-explanation': 'Home is the place you live.',
  'vocab-4-correct': 'Great word!',
  'vocab-4-incorrect': 'Nice try. A simple word is Home.',

  'vocab-5-question': 'Pick the word that means something you wear on your feet.',
  'vocab-5-explanation': 'A shoe is worn on your foot.',
  'vocab-5-correct': 'Excellent! A shoe goes on your foot.',
  'vocab-5-incorrect': 'Good effort. Choose the thing you wear.',

  // Numbers Lesson
  'numbers-1-question': 'Click the number that comes after 2.',
  'numbers-1-explanation': 'The number after 2 is 3.',
  'numbers-1-correct': 'Great job! 3 comes after 2.',
  'numbers-1-incorrect': 'Good effort. Count up: 1, 2, 3.',

  'numbers-2-question': 'Which number comes after 4?',
  'numbers-2-explanation': 'The number after 4 is 5.',
  'numbers-2-correct': 'Nice! 5 comes after 4.',
  'numbers-2-incorrect': 'Nice try. Count forward to find 5.',

  'numbers-3-question': 'Which set has three items?',
  'numbers-3-explanation': 'Three stars means 3 items.',
  'numbers-3-correct': 'Great counting!',
  'numbers-3-incorrect': 'Good effort. Count the stars carefully.',

  'numbers-4-question': 'Say or type the number after 1.',
  'numbers-4-explanation': 'The number after 1 is 2.',
  'numbers-4-correct': 'Yes! The answer is 2.',
  'numbers-4-incorrect': 'Nice try. The answer is 2.',

  'numbers-5-question': 'Choose the correct order from 1 to 3.',
  'numbers-5-explanation': 'The correct order is 1, 2, 3.',
  'numbers-5-correct': 'Excellent ordering!',
  'numbers-5-incorrect': 'Good effort. Start at 1 and count up.',

  // Section Narrations
  'greet-s1-narration': 'Hello! This section shows how to greet politely.',
  'greet-s2-narration': 'Say Hello or Hi with a smile. Ask How are you?',
  'vocab-s1-narration': 'Let\'s learn simple words for everyday items.',
  'vocab-s2-narration': 'Practice words for people and places you see daily.',
  'vocab-s3-narration': 'Say simple action words like eat, walk, and read.',
  'num-s1-narration': 'Count from one to five. Name a color for each number.',
  'num-s2-narration': 'Match numbers with the correct number of objects.',
  'num-s3-narration': 'Say the next number after 1, 2, and 3.',
};

/**
 * Generate audio file using TTS service
 */
async function generateAudioFile(filename, text) {
  try {
    console.log(`Generating: ${filename}.mp3`);
    
    const response = await axios.post(TTS_SERVICE_URL, {
      text,
      speed: 1.0,
    }, {
      responseType: 'arraybuffer'
    });

    const outputPath = path.join(OUTPUT_DIR, `${filename}.mp3`);
    fs.writeFileSync(outputPath, response.data);
    
    console.log(`✓ Created: ${filename}.mp3`);
    return true;
  } catch (error) {
    console.error(`✗ Failed: ${filename}.mp3 - ${error.message}`);
    return false;
  }
}

/**
 * Generate all audio files
 */
async function generateAllAudio() {
  console.log('Starting audio generation...\n');
  console.log(`Total files to generate: ${Object.keys(audioContent).length}\n`);

  let successCount = 0;
  let failCount = 0;

  for (const [filename, text] of Object.entries(audioContent)) {
    const success = await generateAudioFile(filename, text);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Add delay to avoid overwhelming the TTS service
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n=== Audio Generation Complete ===');
  console.log(`✓ Successful: ${successCount}`);
  console.log(`✗ Failed: ${failCount}`);
  console.log(`Total: ${successCount + failCount}`);
}

// Run the generator
if (require.main === module) {
  generateAllAudio()
    .then(() => {
      console.log('\nAll audio files generated successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nError generating audio files:', error);
      process.exit(1);
    });
}

module.exports = { generateAllAudio, audioContent };
