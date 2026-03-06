import React, { useState } from 'react';
import { BookOpen, Zap, SkipForward, Check } from 'lucide-react';

/**
 * PracticeSuggestion Component
 * Displays recommended practice activities when a learner scores low on a lesson.
 * Allows user to attempt practice or skip it.
 */
const PracticeSuggestion = ({
  lesson = {},
  score = 0,
  onSkip = () => {},
  onStartPractice = () => {},
  condition = 'adhd'
}) => {
  const [showingPractice, setShowingPractice] = useState(false);
  const [practiceCompleted, setPracticeCompleted] = useState(false);

  // Define practice activities for each lesson - REAL activities from the platform
  const PRACTICE_ACTIVITIES_BY_CONDITION = {
    adhd: {
      Greetings: {
        title: 'Greeting Recognition Quick Drill',
        description: 'Quick 2-minute focused practice with greetings',
        activities: [
          'Listen to 3 greetings and repeat',
          'Match greetings to contexts',
          'Time-based greeting quiz'
        ]
      },
      'Basic Words': {
        title: 'Vocabulary Focus Session',
        description: '3-minute one-step vocabulary tasks',
        activities: [
          'Review 5 key words',
          'Complete one-word fill-in blanks',
          'Single-step word matching'
        ]
      },
      Numbers: {
        title: 'Quick Number Drill',
        description: '2-minute fast-paced number practice',
        activities: [
          'Number sequence recognition',
          'Rapid number matching game',
          'Quick counting exercise'
        ]
      },
      'Audio Stories': {
        title: 'Story Re-listen Practice',
        description: 'Focused re-listen of the story at slower pace',
        activities: [
          'Listen again at 0.9x speed',
          'Answer 3 story comprehension questions',
          'Identify key characters'
        ]
      }
    },
    autism: {
      Greetings: {
        title: 'Tamil Greetings Practice',
        description: 'Calm, structured practice with Tamil greetings',
        activities: [
          'Learn 3 Tamil greetings slowly',
          'Match greetings to situations',
          'Gentle pronunciation practice'
        ]
      },
      'Basic Words': {
        title: 'English Alphabet Review',
        description: 'Structured alphabet letter practice',
        activities: [
          'Review alphabet one letter at a time',
          'Letter recognition matching',
          'Letter pronunciation drill'
        ]
      },
      Numbers: {
        title: 'Hindi Numbers Practice',
        description: 'Calm number learning 1-10 in Hindi',
        activities: [
          'Learn Hindi numbers at own pace',
          'Number sequence matching',
          'Listening and identification'
        ]
      },
      'Family Members': {
        title: 'Family Words Practice',
        description: 'Tamil family member vocabulary review',
        activities: [
          'Learn family member names',
          'Match family relationships',
          'Build simple family phrases'
        ]
      },
      'Common Actions': {
        title: 'Action Words Practice',
        description: 'Structured everyday action words',
        activities: [
          'Learn action verbs step-by-step',
          'Match actions to descriptions',
          'Practice action phrases'
        ]
      }
    },
    dyslexia: {
      Greetings: {
        title: 'Friendly Greetings Review',
        description: 'Syllable-friendly greeting practice',
        activities: [
          'Read greetings with syllable breaks',
          'Match phrases to contexts',
          'Pronunciation with spacing'
        ]
      },
      'Basic Words': {
        title: 'Everyday Objects Practice',
        description: 'Spaced-out vocabulary learning',
        activities: [
          'Review everyday objects with breaks',
          'Picture-to-word matching',
          'Read words at comfortable pace'
        ]
      },
      Numbers: {
        title: 'Number Learning Review',
        description: 'Counting and number practice',
        activities: [
          'Count and sequence numbers',
          'Match numbers to quantities',
          'Order numbers practice'
        ]
      }
    }
  };

  // Get practice activity based on lesson title and condition
  const getPracticeActivity = () => {
    const conditionKey = (condition || 'adhd').toLowerCase();
    const title = (lesson.title || '').trim();
    
    // Get condition-specific activities
    const conditionActivities = PRACTICE_ACTIVITIES_BY_CONDITION[conditionKey] || PRACTICE_ACTIVITIES_BY_CONDITION.adhd;
    
    // Find matching lesson activity
    if (conditionActivities[title]) {
      return conditionActivities[title];
    }
    
    // Fallback to generic practice if lesson not found
    return {
      title: 'Review Practice',
      description: 'Quick review of lesson content',
      activities: [
        'Review key concepts from this lesson',
        'Complete a quick quiz',
        'Practice at your own pace'
      ]
    };
  };

  const practice = getPracticeActivity();

  const handleStartPractice = () => {
    setShowingPractice(true);
    onStartPractice();
  };

  const handleCompletePractice = () => {
    setPracticeCompleted(true);
    setTimeout(() => {
      onSkip(); // After practice, user can return to dashboard
    }, 2000);
  };

  const handleSkip = () => {
    onSkip();
  };

  // Show practice completion state
  if (practiceCompleted) {
    return (
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(34, 197, 94, 0.1))',
          border: '2px solid #22c55e',
          borderRadius: '16px',
          padding: '24px',
          textAlign: 'center',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <Check size={48} style={{ color: '#22c55e' }} aria-hidden="true" />
        </div>
        <h3 style={{ margin: '0 0 8px 0', color: '#1f2937', fontSize: '18px', fontWeight: 700 }}>
          Great Practice Session!
        </h3>
        <p style={{ margin: 0, color: '#556270', fontSize: '14px' }}>
          You'll get stronger with each practice. Returning to dashboard...
        </p>
      </div>
    );
  }

  // Show active practice interface
  if (showingPractice) {
    return (
      <div
        style={{
          background: condition === 'autism' ? '#FBFBF8' : '#f0f8ff',
          border: condition === 'autism' ? '2px solid #D7DDD5' : '2px solid #dbeafe',
          borderRadius: '16px',
          padding: '24px',
          animation: 'slideUp 0.3s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <Zap size={24} style={{ color: condition === 'autism' ? '#526E7B' : '#4D86C9' }} aria-hidden="true" />
          <h3 style={{ margin: 0, color: condition === 'autism' ? '#1f2937' : '#0f172a', fontSize: '18px', fontWeight: 700 }}>
            {practice.title}
          </h3>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            {practice.activities.map((activity, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.5)',
                  borderRadius: '8px',
                  color: condition === 'autism' ? '#556270' : '#475569',
                  fontSize: '14px'
                }}
              >
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: condition === 'autism' ? '#526E7B' : '#4D86C9'
                }} aria-hidden="true" />
                {activity}
              </li>
            ))}
          </ul>
        </div>

        <button
          onClick={handleCompletePractice}
          style={{
            width: '100%',
            padding: '12px 16px',
            background: condition === 'autism' ? '#526E7B' : '#4D86C9',
            color: '#ffffff',
            border: 'none',
            borderRadius: '10px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          Complete Practice
        </button>
      </div>
    );
  }

  // Show suggestion prompt
  return (
    <div
      style={{
        background: condition === 'autism'
          ? 'linear-gradient(135deg, #FBFBF8, #F7F7F4)'
          : 'linear-gradient(135deg, #f0f8ff, #e0f2fe)',
        border: condition === 'autism' ? '2px solid #D7DDD5' : '2px solid #bfdbfe',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '20px',
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '48px',
          height: '48px',
          background: condition === 'autism' ? 'rgba(82, 110, 123, 0.1)' : 'rgba(77, 134, 201, 0.1)',
          borderRadius: '12px'
        }}>
          <BookOpen size={24} style={{ color: condition === 'autism' ? '#526E7B' : '#4D86C9' }} aria-hidden="true" />
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{
            margin: '0 0 8px 0',
            color: condition === 'autism' ? '#1f2937' : '#0f172a',
            fontSize: '16px',
            fontWeight: 700
          }}>
            Want to improve?
          </h3>
          <p style={{
            margin: '0 0 16px 0',
            color: condition === 'autism' ? '#556270' : '#475569',
            fontSize: '14px',
            lineHeight: '1.5'
          }}>
            {practice.description}
          </p>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handleStartPractice}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: condition === 'autism' ? '#526E7B' : '#4D86C9',
                color: '#ffffff',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <Zap size={16} aria-hidden="true" />
              <span>Try Practice</span>
            </button>

            <button
              onClick={handleSkip}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 16px',
                background: 'transparent',
                color: condition === 'autism' ? '#526E7B' : '#4D86C9',
                border: `2px solid ${condition === 'autism' ? '#526E7B' : '#4D86C9'}`,
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = condition === 'autism' ? 'rgba(82, 110, 123, 0.05)' : 'rgba(77, 134, 201, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <SkipForward size={16} aria-hidden="true" />
              <span>Skip</span>
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PracticeSuggestion;
