import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const LANGUAGE_KEYS = ['en', 'ta', 'hi'];

const languageLabel = {
  en: 'English',
  ta: 'Tamil',
  hi: 'Hindi',
};

const LESSON_LIBRARY = {
  dyslexia: [
    {
      id: 1,
      title: 'Greetings',
      description: 'Learn "Hello", "Hi", and friendly phrases',
      apiId: 'lesson-greetings',
      language: 'en',
    },
    {
      id: 2,
      title: 'Basic Words',
      description: 'Everyday objects, people, and actions',
      apiId: 'lesson-vocabulary',
      language: 'en',
    },
    {
      id: 3,
      title: 'Numbers',
      description: 'Count, match, and order numbers',
      apiId: 'lesson-numbers',
      language: 'en',
    },
    {
      id: 4,
      title: 'Tamil Foundations: Everyday Greetings',
      description: 'Practice greetings and polite words in Tamil',
      apiId: 'lesson-tamil-essentials',
      language: 'ta',
    },
    {
      id: 5,
      title: 'Hindi Foundations: Everyday Greetings',
      description: 'Practice greetings and polite words in Hindi',
      apiId: 'lesson-hindi-essentials',
      language: 'hi',
    },
  ],
  adhd: [
    {
      id: 1,
      title: 'Greetings',
      description: 'Focused practice with friendly greeting words',
      language: 'en',
    },
    {
      id: 2,
      title: 'Basic Words',
      description: 'Short vocabulary tasks with one-step focus',
      language: 'en',
    },
    {
      id: 3,
      title: 'Numbers',
      description: 'Quick number recognition and quiz exercises',
      language: 'en',
    },
    {
      id: 4,
      title: 'Audio Stories',
      description: 'Listen and learn through guided mini stories',
      language: 'en',
    },
    {
      id: 5,
      title: 'Tamil Foundations: Everyday Greetings',
      description: 'Focused greeting and polite-word practice in Tamil',
      language: 'ta',
    },
    {
      id: 6,
      title: 'Hindi Foundations: Everyday Greetings',
      description: 'Focused greeting and polite-word practice in Hindi',
      language: 'hi',
    },
  ],
  autism: [
    {
      id: 1,
      title: 'Greetings',
      description: 'Learn basic Tamil greetings',
      language: 'ta',
    },
    {
      id: 2,
      title: 'Basic Words',
      description: 'Learn English alphabet letters',
      language: 'en',
    },
    {
      id: 3,
      title: 'Numbers',
      description: 'Learn Hindi numbers 1 to 10',
      language: 'hi',
    },
    {
      id: 4,
      title: 'Family Members',
      description: 'Learn Tamil words for family members',
      language: 'ta',
    },
    {
      id: 5,
      title: 'Common Actions',
      description: 'Learn everyday action words',
      language: 'en',
    },
  ],
};

const labelByCondition = {
  dyslexia: 'Dyslexia',
  adhd: 'ADHD',
  autism: 'Autism',
};

const themeByCondition = {
  dyslexia: {
    pageBg: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
    heroBg: '#ffffff',
    heroBorder: '#dbeafe',
    heroTitle: '#0f172a',
    heroText: '#475569',
    cardBorder: '#e2e8f0',
    buttonBg: '#2563eb',
  },
  adhd: {
    pageBg: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)',
    heroBg: '#ffffff',
    heroBorder: '#dbeafe',
    heroTitle: '#0f172a',
    heroText: '#475569',
    cardBorder: '#e2e8f0',
    buttonBg: '#2563eb',
  },
  autism: {
    pageBg: 'linear-gradient(180deg, #F7F7F4 0%, #ECEFEA 100%)',
    heroBg: '#FBFBF8',
    heroBorder: '#D7DDD5',
    heroTitle: '#1f2937',
    heroText: '#556270',
    cardBorder: '#D7DDD5',
    buttonBg: '#526E7B',
  },
};

const LessonLibraryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [selectedLanguage, setSelectedLanguage] = useState('en');

  const condition = String(user?.learningCondition || 'dyslexia').toLowerCase();
  const lessons = useMemo(() => LESSON_LIBRARY[condition] || LESSON_LIBRARY.dyslexia, [condition]);
  const conditionLabel = labelByCondition[condition] || 'Learning';
  const theme = themeByCondition[condition] || themeByCondition.dyslexia;

  const languageAvailability = useMemo(() => {
    const availability = { en: 0, ta: 0, hi: 0 };
    lessons.forEach((lesson) => {
      const key = lesson.language || 'en';
      if (availability[key] !== undefined) {
        availability[key] += 1;
      }
    });
    return availability;
  }, [lessons]);

  const filteredLessons = useMemo(() => {
    const safeSelectedLanguage = LANGUAGE_KEYS.includes(selectedLanguage) ? selectedLanguage : 'en';
    return lessons.filter((lesson) => (lesson.language || 'en') === safeSelectedLanguage);
  }, [lessons, selectedLanguage]);

  React.useEffect(() => {
    if (languageAvailability[selectedLanguage] > 0) return;
    const firstAvailable = LANGUAGE_KEYS.find((key) => languageAvailability[key] > 0) || 'en';
    setSelectedLanguage(firstAvailable);
  }, [languageAvailability, selectedLanguage]);

  const handleOpenLesson = (lesson) => {
    if (condition === 'dyslexia') {
      navigate(`/lessons/${lesson.apiId}`);
      return;
    }

    navigate('/dashboard', {
      state: {
        openCondition: condition,
        openLessonId: lesson.id,
      },
    });
  };

  return (
    <div
      style={{
        background: theme.pageBg,
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <div style={{ marginBottom: '16px' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #cbd5e1',
              background: '#fff',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>Back to Dashboard</span>
          </button>
        </div>

        <section
          style={{
            background: theme.heroBg,
            border: `1px solid ${theme.heroBorder}`,
            borderRadius: '14px',
            padding: '18px 20px',
            marginBottom: '18px',
          }}
        >
          <h2 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px', color: theme.heroTitle }}>
            <BookOpen size={20} aria-hidden="true" />
            <span>{conditionLabel} Lesson Library</span>
          </h2>
          <p style={{ margin: 0, color: theme.heroText }}>
            Choose any lesson you want and start learning directly from this page.
          </p>

          <div style={{ marginTop: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {LANGUAGE_KEYS.map((langKey) => {
              const isSelected = selectedLanguage === langKey;
              const isDisabled = languageAvailability[langKey] === 0;

              return (
                <button
                  key={`language-filter-${langKey}`}
                  type="button"
                  onClick={() => setSelectedLanguage(langKey)}
                  disabled={isDisabled}
                  aria-pressed={isSelected}
                  style={{
                    border: isSelected ? `2px solid ${theme.buttonBg}` : '1px solid #cbd5e1',
                    background: isSelected ? '#ffffff' : '#ffffff',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: 800,
                    color: isSelected ? theme.buttonBg : theme.heroTitle,
                    boxShadow: isSelected ? '0 2px 10px rgba(37, 99, 235, 0.12)' : 'none',
                  }}
                >
                  <span>{languageLabel[langKey] || langKey}</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      background: isSelected ? theme.buttonBg : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#0f172a',
                      borderRadius: '999px',
                      padding: '2px 8px',
                    }}
                    aria-label={`${languageAvailability[langKey]} lessons`}
                  >
                    {languageAvailability[langKey]}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '1200px' }}>
          {filteredLessons.map((lesson, index) => (
            <article
              key={`${condition}-library-${lesson.id}`}
              style={{
                background: condition === 'autism' ? '#FBFBF8' : '#ffffff',
                border: `1px solid ${theme.cardBorder}`,
                borderRadius: '14px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
              }}
            >
              <div style={{ fontSize: '12px', color: condition === 'autism' ? '#556270' : '#64748b', fontWeight: 600 }}>Lesson {index + 1}</div>
              <h3 style={{ margin: 0, fontSize: '18px', color: condition === 'autism' ? '#1f2937' : '#000' }}>{lesson.title}</h3>
              <p style={{ margin: 0, color: condition === 'autism' ? '#556270' : '#475569', flex: 1 }}>{lesson.description}</p>
              <button
                type="button"
                onClick={() => handleOpenLesson(lesson)}
                style={{
                  marginTop: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  border: 'none',
                  background: theme.buttonBg,
                  color: '#ffffff',
                  borderRadius: '10px',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  fontWeight: 700,
                  fontSize: '14px',
                  transition: 'background-color 0.2s ease, transform 0.2s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.9';
                  e.currentTarget.style.transform = 'scale(1.02)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <span>Start Lesson</span>
                <ArrowRight size={16} aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LessonLibraryPage;
