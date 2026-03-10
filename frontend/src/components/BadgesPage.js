import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, BadgeCheck, Circle, ChevronLeft, Star, Sparkles, Target, Repeat, Medal, Rocket } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePreferences } from '../context/PreferencesContext';
import { useI18n } from '../utils/i18n';
import { getBadges } from '../services/badgesService';

const iconFor = (key) => {
  switch (key) {
    case 'award':
      return Award;
    case 'check':
      return BadgeCheck;
    case 'star':
      return Star;
    case 'sparkles':
      return Sparkles;
    case 'target':
      return Target;
    case 'repeat':
      return Repeat;
    case 'medal':
      return Medal;
    case 'rocket':
      return Rocket;
    default:
      return Circle;
  }
};

const BadgesPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { preferences, applyPreferences } = usePreferences();
  const { t } = useI18n();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!preferences) return;
    applyPreferences(document.getElementById('learning-container'));
  }, [preferences, applyPreferences]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const result = await getBadges();
        if (!mounted) return;
        if (result?.success) {
          setData(result);
        } else {
          setError(t('badges.loadError'));
        }
      } catch (e) {
        if (!mounted) return;
        setError(t('badges.loadError'));
      } finally {
        mounted && setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [t]);

  const badges = useMemo(() => (Array.isArray(data?.badges) ? data.badges : []), [data]);
  const earned = useMemo(() => badges.filter((b) => b.earned), [badges]);
  const locked = useMemo(() => badges.filter((b) => !b.earned), [badges]);

  const containerClass = user?.learningCondition === 'autism' ? 'autism-view badges-page motion-enabled' : 'dyslexia-view badges-page motion-enabled';

  const BadgeCard = ({ badge, variant }) => {
    const Icon = iconFor(badge.icon);
    const isEarned = !!badge.earned;

    return (
      <div
        style={{
          background: 'var(--bg-secondary)',
          border: `1px solid ${isEarned ? 'rgba(34,197,94,0.35)' : 'var(--border-color)'}`,
          borderRadius: '14px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: '40px 1fr',
          gap: '12px',
          opacity: isEarned ? 1 : 0.85,
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            display: 'grid',
            placeItems: 'center',
            background: isEarned ? 'rgba(34,197,94,0.12)' : 'var(--bg-tertiary)',
            border: isEarned ? '1px solid rgba(34,197,94,0.25)' : '1px solid var(--border-color)',
          }}
          aria-hidden="true"
        >
          <Icon size={20} />
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', alignItems: 'baseline' }}>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--text-primary)' }}>{badge.name}</h3>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 800,
                borderRadius: '999px',
                padding: '3px 10px',
                background: isEarned ? 'rgba(34,197,94,0.12)' : 'var(--bg-tertiary)',
                border: isEarned ? '1px solid rgba(34,197,94,0.25)' : '1px solid var(--border-color)',
                color: isEarned ? '#166534' : 'var(--text-secondary)',
              }}
            >
              {isEarned ? t('badges.earned') : t('badges.locked')}
            </span>
          </div>
          <p style={{ margin: '6px 0 10px 0', color: 'var(--text-secondary)' }}>{badge.description}</p>

          {variant !== 'earnedOnly' && !isEarned ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-secondary)' }}>
                <span>{t('badges.progress')}</span>
                <span>{badge.current}/{badge.target}</span>
              </div>
              <div style={{ height: '10px', background: 'var(--bg-tertiary)', borderRadius: '999px', overflow: 'hidden', marginTop: '6px' }}>
                <div style={{ height: '100%', width: `${badge.progress || 0}%`, background: 'var(--accent-color)' }} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <div id="learning-container" className={containerClass} data-user-condition={user?.learningCondition || ''}>
      <nav className={user?.learningCondition === 'autism' ? 'simple-header' : 'navbar'}>
        <div className={user?.learningCondition === 'autism' ? 'header-left' : 'nav-brand'}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Award size={22} aria-hidden="true" />
            <span>{t('badges.title')}</span>
          </h1>
        </div>
        <div className={user?.learningCondition === 'autism' ? 'header-actions' : 'nav-menu'}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className={user?.learningCondition === 'autism' ? 'btn-settings' : 'btn-settings'}
            title={t('badges.back')}
            aria-label={t('badges.back')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            <ChevronLeft size={18} aria-hidden="true" />
            <span>{t('badges.back')}</span>
          </button>
        </div>
      </nav>

      <main className={user?.learningCondition === 'autism' ? 'main-layout' : 'main-content'}>
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '22px 18px' }}>
          {loading ? (
            <p>{t('badges.loading')}</p>
          ) : error ? (
            <div>
              <p className="is-error">{error}</p>
              <button type="button" onClick={() => window.location.reload()}>{t('app.retry')}</button>
            </div>
          ) : (
            <>
              <section style={{ marginBottom: '18px' }}>
                <h2 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>{t('badges.earnedTitle')} ({earned.length})</h2>
                {earned.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)' }}>{t('badges.noneEarned')}</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                    {earned.map((b) => (
                      <BadgeCard key={b.id} badge={b} variant="earnedOnly" />
                    ))}
                  </div>
                )}
              </section>

              <section>
                <h2 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>{t('badges.lockedTitle')} ({locked.length})</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
                  {locked.map((b) => (
                    <BadgeCard key={b.id} badge={b} />
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default BadgesPage;
