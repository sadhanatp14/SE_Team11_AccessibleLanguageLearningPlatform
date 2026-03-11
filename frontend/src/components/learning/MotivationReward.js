import React, { useMemo } from 'react';
import { Trophy, Zap, Star, TrendingUp, Flame } from 'lucide-react';

/**
 * MotivationReward Component
 * Displays positive reinforcement and achievements after lesson completion.
 * Provides immediate, clear feedback and encouragement to continue learning.
 *
 * EPIC 4.5: Motivation Through Reinforcement
 * - 4.5.1: Display positive feedback after lesson completion
 * - 4.5.2: Show small achievements clearly
 * - 4.5.3: Encourage the learner to continue learning
 * - 4.5.4: Provide immediate reinforcement without delay
 */
const MotivationReward = ({
  score = 0,
  maxScore = 100,
  lesson = {},
  condition = 'adhd',
  totalLessonsCompleted = 1,
  isFirstAttempt = true,
  hasImproved = false,
}) => {
  // Calculate normalized score percentage
  const scorePercentage = Math.round((score / maxScore) * 100);

  // Determine achievement level and motivation tier
  const achievementData = useMemo(() => {
    if (scorePercentage >= 90) {
      return {
        level: 'Perfect!',
        icon: Trophy,
        color: '#fbbf24', // amber
        bgColor: 'rgba(251, 191, 36, 0.1)',
        borderColor: '#fbbf24',
        message: 'Outstanding performance!',
        subMessage: 'You nailed this lesson!',
        badge: '⭐ Perfect Score',
        encouragement: 'You\'re on fire! Try the next lesson!'
      };
    } else if (scorePercentage >= 75) {
      return {
        level: 'Excellent!',
        icon: Star,
        color: '#10b981', // emerald
        bgColor: 'rgba(16, 185, 129, 0.1)',
        borderColor: '#10b981',
        message: 'Great work!',
        subMessage: 'You\'ve got strong skills',
        badge: '✨ Great Job',
        encouragement: 'Almost perfect! Keep going!'
      };
    } else if (scorePercentage >= 60) {
      return {
        level: 'Good!',
        icon: Zap,
        color: '#3b82f6', // blue
        bgColor: 'rgba(59, 130, 246, 0.1)',
        borderColor: '#3b82f6',
        message: 'Good effort!',
        subMessage: 'You\'re making progress',
        badge: '💪 Improving',
        encouragement: 'Try practice to strengthen weak areas'
      };
    } else if (scorePercentage >= 40) {
      return {
        level: 'Keep Trying',
        icon: Flame,
        color: '#f97316', // orange
        bgColor: 'rgba(249, 115, 22, 0.1)',
        borderColor: '#f97316',
        message: 'Nice try!',
        subMessage: 'Every attempt helps you learn',
        badge: '🚀 Keep Going',
        encouragement: 'Use practice suggestions to improve!'
      };
    } else {
      return {
        level: 'Learning Path',
        icon: TrendingUp,
        color: '#ec4899', // pink
        bgColor: 'rgba(236, 72, 153, 0.1)',
        borderColor: '#ec4899',
        message: 'You\'re learning!',
        subMessage: 'Every step counts',
        badge: '📚 Learning',
        encouragement: 'Check out practice activities to improve'
      };
    }
  }, [scorePercentage]);

  // Generate streak/milestone message
  const getMilestoneMessage = () => {
    if (totalLessonsCompleted === 1) {
      return '🎯 First lesson completed! Great start!';
    } else if (totalLessonsCompleted === 2) {
      return '🎯 You\'re on a roll! 2 lessons done!';
    } else if (totalLessonsCompleted === 3) {
      return '🎯 Amazing! 3 lessons completed!';
    } else if (totalLessonsCompleted % 5 === 0) {
      return `🔥 Incredible! ${totalLessonsCompleted} lessons completed! You're a star!`;
    } else if (hasImproved) {
      return '📈 You\'ve improved from your last attempt!';
    }
    return null;
  };

  const IconComponent = achievementData.icon;
  const milestoneMsg = getMilestoneMessage();

  // Theme-specific styling
  const getThemeStyles = () => {
    if (condition === 'autism') {
      return {
        cardBg: '#FBFBF8',
        textColor: '#1f2937',
        accentColor: '#526E7B',
        borderColor: '#D7DDD5'
      };
    } else if (condition === 'dyslexia') {
      return {
        cardBg: '#f8fafc',
        textColor: '#0f172a',
        accentColor: '#2563eb',
        borderColor: '#dbeafe'
      };
    }
    // ADHD
    return {
      cardBg: '#f0f8ff',
      textColor: '#0f172a',
      accentColor: '#4D86C9',
      borderColor: '#dbeafe'
    };
  };

  const themeStyles = getThemeStyles();

  return (
    <div style={{ animation: 'slideUp 0.4s ease-out' }}>
      {/* Achievement Badge */}
      <div
        style={{
          background: achievementData.bgColor,
          border: `2px solid ${achievementData.color}`,
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          textAlign: 'center',
          animation: 'scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '64px',
              height: '64px',
              background: achievementData.color,
              borderRadius: '50%',
              animation: 'bounce 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
            }}
          >
            <IconComponent size={36} color="#ffffff" aria-hidden="true" />
          </div>
        </div>

        <h2 style={{
          margin: '0 0 8px 0',
          fontSize: '24px',
          fontWeight: 800,
          color: achievementData.color
        }}>
          {achievementData.level}
        </h2>

        <p style={{
          margin: '0 0 12px 0',
          fontSize: '16px',
          fontWeight: 700,
          color: themeStyles.textColor
        }}>
          {achievementData.message}
        </p>

        <p style={{
          margin: '0 0 16px 0',
          fontSize: '14px',
          color: '#666',
          lineHeight: '1.5'
        }}>
          {achievementData.subMessage}
        </p>

        {/* Score Display */}
        <div style={{
          display: 'inline-block',
          background: 'rgba(255, 255, 255, 0.6)',
          padding: '10px 16px',
          borderRadius: '10px',
          marginBottom: '12px',
          fontWeight: 700,
          color: themeStyles.textColor
        }}>
          Score: {scorePercentage}%
        </div>

        {/* Achievement Badge */}
        <div style={{
          display: 'inline-block',
          background: achievementData.color,
          color: '#ffffff',
          padding: '8px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 700,
          marginLeft: '10px',
          animation: 'fadeIn 0.8s ease-out'
        }}>
          {achievementData.badge}
        </div>
      </div>

      {/* Milestone or Progress Message */}
      {milestoneMsg && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(74, 222, 128, 0.1))',
            border: '1px solid #22c55e',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '20px',
            color: '#166534',
            fontSize: '14px',
            fontWeight: 700,
            textAlign: 'center',
            animation: 'slideUp 0.6s ease-out'
          }}
        >
          {milestoneMsg}
        </div>
      )}

      {/* Encouragement Message */}
      <div
        style={{
          background: themeStyles.cardBg,
          border: `2px solid ${achievementData.color}`,
          borderRadius: '12px',
          padding: '16px',
          textAlign: 'center',
          animation: 'fadeIn 0.8s ease-out'
        }}
      >
        <p style={{
          margin: 0,
          fontSize: '15px',
          fontWeight: 700,
          color: themeStyles.textColor,
          lineHeight: '1.6'
        }}>
          🚀 {achievementData.encouragement}
        </p>
      </div>

      {/* Next Lesson Suggestion */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px 14px',
          background: 'rgba(59, 130, 246, 0.05)',
          borderLeft: `4px solid ${themeStyles.accentColor}`,
          borderRadius: '6px',
          fontSize: '13px',
          color: '#556270'
        }}
      >
        <p style={{ margin: 0, fontWeight: 600, marginBottom: '4px' }}>
          📚 What's Next?
        </p>
        <p style={{ margin: 0, fontSize: '12px' }}>
          {totalLessonsCompleted >= 3
            ? 'You\'re making excellent progress! Keep learning new lessons.'
            : `Complete more lessons to unlock achievements and build your learning streak!`}
        </p>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scaleIn {
          0% {
            opacity: 0;
            transform: scale(0.8);
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-8px);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default MotivationReward;
