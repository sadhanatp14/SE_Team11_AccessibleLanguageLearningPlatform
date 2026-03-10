import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Award, BookOpen, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useI18n } from '../../utils/i18n';
import api from '../../utils/api';
import { resolveUiLanguageFromPreferences } from '../../utils/languagePrefs';
import { pickI18nString } from '../../utils/lessonI18n';
import { getDyslexiaLessonDescription, getDyslexiaLessonTitle, useDyslexiaSyllableMode } from '../../utils/dyslexiaSyllableMode';
import SyllableModeToggle from '../common/SyllableModeToggle';

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
      titleI18n: {
        tamil: 'வணக்கங்கள்',
        hindi: 'अभिवादन',
      },
      description: 'Learn "Hello", "Hi", and friendly phrases',
      descriptionI18n: {
        tamil: '"Hello", "Hi" மற்றும் நட்பான சொற்றொடர்களைக் கற்றுக்கொள்ளுங்கள்',
        hindi: '"Hello", "Hi" और दोस्ताना वाक्यांश सीखें',
      },
      apiId: 'lesson-greetings',
      language: 'en',
    },
    {
      id: 2,
      title: 'Basic Words',
      titleI18n: {
        tamil: 'அடிப்படை சொற்கள்',
        hindi: 'मूल शब्द',
      },
      description: 'Everyday objects, people, and actions',
      descriptionI18n: {
        tamil: 'அன்றாட பொருட்கள், மனிதர்கள் மற்றும் செயல்கள்',
        hindi: 'रोज़मर्रा की वस्तुएँ, लोग और क्रियाएँ',
      },
      apiId: 'lesson-vocabulary',
      language: 'en',
    },
    {
      id: 3,
      title: 'Numbers',
      titleI18n: {
        tamil: 'எண்கள்',
        hindi: 'संख्याएँ',
      },
      description: 'Count, match, and order numbers',
      descriptionI18n: {
        tamil: 'எண்களை எண்ணவும், பொருத்தவும், வரிசைப்படுத்தவும்',
        hindi: 'संख्याएँ गिनें, मिलाएँ और क्रम में रखें',
      },
      apiId: 'lesson-numbers',
      language: 'en',
    },
    {
      id: 4,
      title: 'Tamil Foundations: Everyday Greetings',
      titleI18n: {
        tamil: 'தமிழ் அடித்தளம்: தினசரி வணக்கங்கள்',
        hindi: 'तमिल आधार: दैनिक अभिवादन',
      },
      description: 'Practice greetings and polite words in Tamil',
      descriptionI18n: {
        tamil: 'தமிழில் வணக்கங்களும் மரியாதைச் சொற்களும் பயிற்சி செய்யுங்கள்',
        hindi: 'तमिल में अभिवादन और शिष्ट शब्दों का अभ्यास करें',
      },
      apiId: 'lesson-tamil-essentials',
      language: 'ta',
    },
    {
      id: 5,
      title: 'Hindi Foundations: Everyday Greetings',
      titleI18n: {
        tamil: 'இந்தி அடித்தளம்: தினசரி வணக்கங்கள்',
        hindi: 'हिंदी आधार: दैनिक अभिवादन',
      },
      description: 'Practice greetings and polite words in Hindi',
      descriptionI18n: {
        tamil: 'இந்தியில் வணக்கங்களும் மரியாதைச் சொற்களும் பயிற்சி செய்யுங்கள்',
        hindi: 'हिंदी में अभिवादन और शिष्ट शब्दों का अभ्यास करें',
      },
      apiId: 'lesson-hindi-essentials',
      language: 'hi',
    },
  ],
  adhd: [
    {
      id: 1,
      title: 'Greetings',
      titleI18n: {
        tamil: 'வணக்கங்கள்',
        hindi: 'अभिवादन',
      },
      description: 'Focused practice with friendly greeting words',
      descriptionI18n: {
        tamil: 'நட்பான வணக்கச் சொற்களுடன் கவனம் செலுத்திய பயிற்சி',
        hindi: 'दोस्ताना अभिवादन शब्दों के साथ केंद्रित अभ्यास',
      },
      language: 'en',
    },
    {
      id: 2,
      title: 'Basic Words',
      titleI18n: {
        tamil: 'அடிப்படை சொற்கள்',
        hindi: 'मूल शब्द',
      },
      description: 'Short vocabulary tasks with one-step focus',
      descriptionI18n: {
        tamil: 'ஒரே படி கவனத்துடன் குறுகிய சொற்களஞ்சியப் பயிற்சிகள்',
        hindi: 'एक-चरण फोकस के साथ छोटे शब्दावली कार्य',
      },
      language: 'en',
    },
    {
      id: 3,
      title: 'Numbers',
      titleI18n: {
        tamil: 'எண்கள்',
        hindi: 'संख्याएँ',
      },
      description: 'Quick number recognition and quiz exercises',
      descriptionI18n: {
        tamil: 'விரைவு எண் அடையாளம் காணுதல் மற்றும் வினா பயிற்சிகள்',
        hindi: 'तेज़ संख्या पहचान और क्विज़ अभ्यास',
      },
      language: 'en',
    },
    {
      id: 4,
      title: 'Audio Stories',
      titleI18n: {
        tamil: 'ஆடியோ கதைகள்',
        hindi: 'ऑडियो कहानियाँ',
      },
      description: 'Listen and learn through guided mini stories',
      descriptionI18n: {
        tamil: 'வழிகாட்டப்பட்ட சிறு கதைகள் மூலம் கேட்டு கற்றுக்கொள்ளுங்கள்',
        hindi: 'निर्देशित छोटी कहानियों से सुनकर सीखें',
      },
      language: 'en',
    },
    {
      id: 5,
      title: 'Tamil Foundations: Everyday Greetings',
      titleI18n: {
        tamil: 'தமிழ் அடித்தளம்: தினசரி வணக்கங்கள்',
        hindi: 'तमिल आधार: दैनिक अभिवादन',
      },
      description: 'Focused greeting and polite-word practice in Tamil',
      descriptionI18n: {
        tamil: 'தமிழில் வணக்கங்கள் மற்றும் மரியாதைச் சொற்கள் மீது கவனப் பயிற்சி',
        hindi: 'तमिल में अभिवादन और शिष्ट शब्दों का केंद्रित अभ्यास',
      },
      language: 'ta',
    },
    {
      id: 6,
      title: 'Hindi Foundations: Everyday Greetings',
      titleI18n: {
        tamil: 'இந்தி அடித்தளம்: தினசரி வணக்கங்கள்',
        hindi: 'हिंदी आधार: दैनिक अभिवादन',
      },
      description: 'Focused greeting and polite-word practice in Hindi',
      descriptionI18n: {
        tamil: 'இந்தியில் வணக்கங்கள் மற்றும் மரியாதைச் சொற்கள் மீது கவனப் பயிற்சி',
        hindi: 'हिंदी में अभिवादन और शिष्ट शब्दों का केंद्रित अभ्यास',
      },
      language: 'hi',
    },
  ],
  autism: [
    {
      id: 1,
      title: 'Greetings',
      titleI18n: {
        tamil: 'வணக்கங்கள்',
        hindi: 'अभिवादन',
      },
      description: 'Learn basic greetings step by step',
      descriptionI18n: {
        tamil: 'அடிப்படை வணக்கங்களை படிப்படியாக கற்றுக்கொள்ளுங்கள்',
        hindi: 'बुनियादी अभिवादन चरण-दर-चरण सीखें',
      },
      language: 'ta',
    },
    {
      id: 2,
      title: 'Basic Words',
      titleI18n: {
        tamil: 'அடிப்படை சொற்கள்',
        hindi: 'मूल शब्द',
      },
      description: 'Learn basic words step by step',
      descriptionI18n: {
        tamil: 'அடிப்படை சொற்களை படிப்படியாக கற்றுக்கொள்ளுங்கள்',
        hindi: 'बुनियादी शब्द चरण-दर-चरण सीखें',
      },
      language: 'en',
    },
    {
      id: 3,
      title: 'Numbers',
      titleI18n: {
        tamil: 'எண்கள்',
        hindi: 'संख्याएँ',
      },
      description: 'Learn numbers 1 to 10',
      descriptionI18n: {
        tamil: '1 முதல் 10 வரை எண்களை கற்றுக்கொள்ளுங்கள்',
        hindi: '1 से 10 तक संख्याएँ सीखें',
      },
      language: 'hi',
    },
    {
      id: 4,
      title: 'Family Members',
      titleI18n: {
        tamil: 'குடும்ப உறுப்பினர்கள்',
        hindi: 'परिवार के सदस्य',
      },
      description: 'Learn words for family members',
      descriptionI18n: {
        tamil: 'குடும்ப உறுப்பினர்களுக்கான சொற்களை கற்றுக்கொள்ளுங்கள்',
        hindi: 'परिवार के सदस्यों के लिए शब्द सीखें',
      },
      language: 'ta',
    },
    {
      id: 5,
      title: 'Common Actions',
      titleI18n: {
        tamil: 'அன்றாட செயல்கள்',
        hindi: 'सामान्य क्रियाएँ',
      },
      description: 'Learn everyday action words',
      descriptionI18n: {
        tamil: 'அன்றாட செயல் சொற்களை கற்றுக்கொள்ளுங்கள்',
        hindi: 'रोज़मर्रा की क्रिया शब्द सीखें',
      },
      language: 'en',
    },
  ],
};

const labelByCondition = {
  dyslexia: 'Dyslexia',
  adhd: 'ADHD',
  autism: 'Autism',
};

const LessonLibraryPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences } = usePreferences();
  const { t } = useI18n();

  const uiLanguage = useMemo(() => resolveUiLanguageFromPreferences(preferences), [preferences]);
  const [syllableMode] = useDyslexiaSyllableMode(true);

  const [selectedLanguage, setSelectedLanguage] = useState('en');
  const [completedLessonKeys, setCompletedLessonKeys] = useState([]);

  const condition = String(user?.learningCondition || 'dyslexia').toLowerCase();
  const lessons = useMemo(() => LESSON_LIBRARY[condition] || LESSON_LIBRARY.dyslexia, [condition]);
  const applyDyslexiaSyllables = condition === 'dyslexia' && Boolean(syllableMode) && uiLanguage === 'english';
  const conditionLabel = useMemo(() => {
    if (condition === 'dyslexia') return t('learning.library.condition.dyslexia');
    if (condition === 'adhd') return t('learning.library.condition.adhd');
    if (condition === 'autism') return t('learning.library.condition.autism');
    return labelByCondition[condition] || t('learning.library.condition.learning');
  }, [condition, t]);

  const containerClassName = useMemo(() => {
    const classes = ['lesson-library', 'motion-enabled'];

    if (preferences?.contrastTheme && preferences.contrastTheme !== 'default') {
      classes.push(`theme-${preferences.contrastTheme}`);
    }

    if (preferences?.fontFamily && preferences.fontFamily !== 'default') {
      classes.push(`font-${preferences.fontFamily}`);
    }

    if (preferences?.fontSize) {
      classes.push(`font-${preferences.fontSize}`);
    }

    if (preferences?.letterSpacing) {
      classes.push(`letter-spacing-${preferences.letterSpacing}`);
    }

    if (preferences?.wordSpacing) {
      classes.push(`word-spacing-${preferences.wordSpacing}`);
    }

    if (preferences?.lineHeight) {
      classes.push(`line-height-${preferences.lineHeight}`);
    }

    const supportsDistractionFree = condition === 'autism' || condition === 'adhd';
    if (preferences?.distractionFreeMode && supportsDistractionFree) {
      classes.push('distraction-free');
    }

    if (preferences?.reduceAnimations && preferences?.distractionFreeMode && supportsDistractionFree) {
      classes.push('reduce-animations');
    }

    return classes.join(' ');
  }, [condition, preferences?.contrastTheme, preferences?.distractionFreeMode, preferences?.fontFamily, preferences?.fontSize, preferences?.letterSpacing, preferences?.lineHeight, preferences?.reduceAnimations, preferences?.wordSpacing]);

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

  const preferredUiLanguageKey = useMemo(() => {
    const uiLang = resolveUiLanguageFromPreferences(preferences);
    if (uiLang === 'tamil') return 'ta';
    if (uiLang === 'hindi') return 'hi';
    return 'en';
  }, [preferences]);

  const languageLabelByKey = useMemo(() => {
    return {
      en: t('settings.langEnglish'),
      ta: t('settings.langTamil'),
      hi: t('settings.langHindi'),
    };
  }, [t]);

  const filteredLessons = useMemo(() => {
    const safeSelectedLanguage = LANGUAGE_KEYS.includes(selectedLanguage) ? selectedLanguage : 'en';
    return lessons.filter((lesson) => (lesson.language || 'en') === safeSelectedLanguage);
  }, [lessons, selectedLanguage]);

  useEffect(() => {
    let mounted = true;

    const loadCompleted = async () => {
      try {
        const res = await api.get('/users/completed-lessons');
        if (!mounted) return;
        if (res?.data?.success && Array.isArray(res.data.completedLessons)) {
          setCompletedLessonKeys(res.data.completedLessons);
        } else {
          setCompletedLessonKeys([]);
        }
      } catch (e) {
        mounted && setCompletedLessonKeys([]);
      }
    };

    loadCompleted();
    return () => {
      mounted = false;
    };
  }, []);

  const completedLessonKeySet = useMemo(() => {
    return new Set(completedLessonKeys.filter((k) => typeof k === 'string'));
  }, [completedLessonKeys]);

  const completionKeyForLesson = (lesson) => {
    if (condition === 'dyslexia') {
      return lesson?.apiId ? `sample-${lesson.apiId}` : '';
    }
    if (condition === 'adhd') {
      return lesson?.id ? `adhd-lesson-${lesson.id}` : '';
    }
    if (condition === 'autism') {
      return lesson?.id ? `autism-lesson-${lesson.id}` : '';
    }
    return '';
  };

  useEffect(() => {
    if (languageAvailability[selectedLanguage] > 0) return;
    const firstAvailable = LANGUAGE_KEYS.find((key) => languageAvailability[key] > 0) || 'en';
    setSelectedLanguage(firstAvailable);
  }, [languageAvailability, selectedLanguage]);

  // When the user changes their Language preference, sync the library filter.
  useEffect(() => {
    if (!preferredUiLanguageKey) return;
    if (languageAvailability[preferredUiLanguageKey] > 0) {
      setSelectedLanguage(preferredUiLanguageKey);
      return;
    }
    const firstAvailable = LANGUAGE_KEYS.find((key) => languageAvailability[key] > 0) || 'en';
    setSelectedLanguage(firstAvailable);
  }, [languageAvailability, preferredUiLanguageKey]);

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

  const renderLibraryText = (baseText, i18n) => {
    return pickI18nString(uiLanguage, baseText, i18n);
  };

  const renderLessonTitle = (lesson) => {
    const base = renderLibraryText(lesson?.title, lesson?.titleI18n);
    if (!applyDyslexiaSyllables) return base;
    return lesson?.apiId ? getDyslexiaLessonTitle(lesson.apiId, base) : base;
  };

  const renderLessonDescription = (lesson) => {
    const base = renderLibraryText(lesson?.description, lesson?.descriptionI18n);
    if (!applyDyslexiaSyllables) return base;
    return lesson?.apiId ? getDyslexiaLessonDescription(lesson.apiId, base) : base;
  };

  return (
    <div
      id="learning-container"
      className={containerClassName}
      data-user-condition={condition}
      style={{
        background: 'linear-gradient(135deg, var(--app-gradient-start) 0%, var(--app-gradient-end) 100%)',
        padding: '24px',
      }}
    >
      <div style={{ maxWidth: '980px', margin: '0 auto' }}>
        <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              borderRadius: '10px',
              padding: '10px 14px',
              cursor: 'pointer',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            <span>{t('learning.common.backToDashboard')}</span>
          </button>

          {condition === 'dyslexia' ? <SyllableModeToggle /> : null}
        </div>

        <section
          style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '14px',
            padding: '18px 20px',
            marginBottom: '18px',
          }}
        >
          <h2 style={{ margin: '0 0 6px 0', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <BookOpen size={20} aria-hidden="true" />
            <span>{conditionLabel}: {t('learning.common.openAllLessons')}</span>
          </h2>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            {t('learning.common.useOpenAllLessons')}
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
                    border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    opacity: isDisabled ? 0.5 : 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontWeight: 800,
                    color: isSelected ? 'var(--accent-color)' : 'var(--text-primary)',
                    boxShadow: isSelected ? '0 2px 10px rgba(15, 23, 42, 0.10)' : 'none',
                  }}
                >
                  <span>{languageLabelByKey[langKey] || languageLabel[langKey] || langKey}</span>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 800,
                      background: isSelected ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                      color: isSelected ? 'var(--bg-secondary)' : 'var(--text-primary)',
                      borderRadius: '999px',
                      padding: '2px 8px',
                    }}
                    aria-label={`${languageAvailability[langKey]} lessons`}
                  >
                    {String(languageAvailability[langKey] ?? 0)}
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
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
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
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>{t('learning.library.lessonNumber', { number: index + 1 })}</div>
                {completedLessonKeySet.has(completionKeyForLesson(lesson)) ? (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      fontSize: '12px',
                      fontWeight: 800,
                      padding: '4px 10px',
                      borderRadius: '999px',
                      background: 'rgba(34, 197, 94, 0.12)',
                      color: '#166534',
                    }}
                    aria-label={t('badges.completed')}
                    title={t('badges.completed')}
                  >
                    <Award size={14} aria-hidden="true" />
                    <span>{t('badges.completed')}</span>
                  </div>
                ) : null}
              </div>
              <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>{renderLessonTitle(lesson)}</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', flex: 1 }}>{renderLessonDescription(lesson)}</p>
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
                  background: 'var(--accent-color)',
                  color: 'var(--bg-secondary)',
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
                <span>{t('learning.common.startLesson')}</span>
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
