import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Award,
  BookOpen,
  ChevronLeft,
  Gamepad2,
  Hash,
  Menu,
  Settings,
  Shuffle,
  Trash2,
  Volume2,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import ProfileSettings from '../ProfileSettings';
import SyllableModeToggle from '../common/SyllableModeToggle';
import api from '../../utils/api';
import { backendTtsLangFor, normalizePreferredLanguage, speechSynthesisLangFor } from '../../utils/languagePrefs';
import { useDyslexiaSyllableMode } from '../../utils/dyslexiaSyllableMode';
import { useI18n } from '../../utils/i18n';

import './DyslexiaView.css';
import './ADHDView.css';
import './AutismView.css';
import './GamesPage.css';

const GAME_TEXT_KEYS = {
  // Page header + meta
  'Play Games': 'learning.games.page.playGamesTitle',
  'Short games to build reading and spelling skills.': 'learning.games.page.subtitleDyslexia',
  'Short, fast games to build focus and memory.': 'learning.games.page.subtitleAdhd',
  'Calm, structured games to practice emotions, routines, and sorting.': 'learning.games.page.subtitleAutism',
  'Calm games for emotions, routines, and sorting.': 'learning.games.page.autismHeaderSubtitle',
  'Games for your learning mode are coming soon.': 'learning.games.page.comingSoonSubtitle',
  'Games list': 'learning.games.page.gamesListAria',
  'Game': 'learning.games.page.gameAria',
  'Coming soon': 'learning.games.page.comingSoonTitle',
  'We will add 3 games for ADHD and Autism next. For now, the Dyslexia games are available when you log in as a Dyslexia learner.':
    'learning.games.page.comingSoonBody',

  // Game card titles + descriptions
  'Word Jumble': 'learning.games.dyslexia.wordJumble.title',
  'Arrange letters to spell a word.': 'learning.games.dyslexia.wordJumble.desc',
  'Hear & Spell': 'learning.games.dyslexia.hearSpell.title',
  'Listen, then choose the correct spelling.': 'learning.games.dyslexia.hearSpell.desc',
  'Letter Hunt': 'learning.games.dyslexia.letterHunt.title',
  'Find b/d/p/q in a grid.': 'learning.games.dyslexia.letterHunt.desc',

  'Flip & Find': 'learning.games.adhd.flipFind.title',
  'Match word cards with picture cards.': 'learning.games.adhd.flipFind.desc',
  'Flash Match': 'learning.games.adhd.flashMatch.title',
  'Match the word to the picture before time runs out.': 'learning.games.adhd.flashMatch.desc',
  'Pattern Pop': 'learning.games.adhd.patternPop.title',
  'Choose what comes next in the pattern.': 'learning.games.adhd.patternPop.desc',

  'Mood Match': 'learning.games.autism.moodMatch.title',
  'Match the emotion word to the correct face.': 'learning.games.autism.moodMatch.desc',
  'Story Steps': 'learning.games.autism.storySteps.title',
  'Arrange pictures to build a clear routine.': 'learning.games.autism.storySteps.desc',
  'Sort It Out': 'learning.games.autism.sortItOut.title',
  'Drag objects into the right category.': 'learning.games.autism.sortItOut.desc',

  // Visual aria-labels
  'Word Builder visual': 'learning.games.visual.wordBuilder',
  'Sound match visual': 'learning.games.visual.soundMatch',
  'Letter finder visual': 'learning.games.visual.letterFinder',
  'Mood match visual': 'learning.games.visual.moodMatch',
  'Story steps visual': 'learning.games.visual.storySteps',
  'Sort it out visual': 'learning.games.visual.sortItOut',

  // Common controls / labels
  'Hint:': 'learning.games.common.hint',
  'Your word:': 'learning.games.common.yourWord',
  'Built word': 'learning.games.common.builtWord',
  'Click letters below': 'learning.games.common.clickLettersBelow',
  'Letter bank': 'learning.games.common.letterBank',
  'Undo': 'learning.games.common.undo',
  'Shuffle': 'learning.games.common.shuffle',
  'Check': 'learning.games.common.check',
  'Clear': 'learning.games.common.clear',
  'Selected': 'learning.games.common.selected',
  'Try again': 'learning.games.common.tryAgain',
  'Next round': 'learning.games.common.nextRound',
  'Options': 'learning.games.common.options',
  'Time': 'learning.interaction.timeLabel',
  'Timer': 'learning.games.common.timer',

  // Word Jumble
  'Arrange the letters to spell the word. Tip: use Undo if you make a mistake.': 'learning.games.dyslexia.wordJumble.instructions',
  'Next word': 'learning.games.dyslexia.wordJumble.nextWord',
  'Try building the word first.': 'learning.games.dyslexia.wordJumble.feedback.buildFirst',
  'Correct! Nice work.': 'learning.games.common.feedback.correctNiceWork',
  'Not quite. Try again.': 'learning.games.common.feedback.notQuiteTryAgain',

  // Hear & Spell
  'Press Play, then choose the correct spelling you heard.': 'learning.games.dyslexia.hearSpell.instructions',
  'Play': 'learning.common.play',
  'Playing…': 'learning.games.common.playing',
  'Tip: You can press Play multiple times.': 'learning.games.dyslexia.hearSpell.tip',
  'Spelling options': 'learning.games.dyslexia.hearSpell.optionsAria',
  'Next sound': 'learning.games.dyslexia.hearSpell.nextSound',
  'Pick an option first.': 'learning.games.common.feedback.pickOptionFirst',
  'Correct!': 'learning.games.common.feedback.correct',
  'Not quite — listen again and try.': 'learning.games.dyslexia.hearSpell.feedback.notQuiteListenAgain',

  // Letter Hunt
  'Find every target letter. This is especially helpful for b/d/p/q confusion.': 'learning.games.dyslexia.letterHunt.instructions',
  'Target:': 'learning.games.dyslexia.letterHunt.targetLabel',
  'Found': 'learning.games.dyslexia.letterHunt.found',
  'Letter grid': 'learning.games.dyslexia.letterHunt.gridAria',
  'Pick some letters first.': 'learning.games.dyslexia.letterHunt.feedback.pickSomeFirst',
  'Great job! You found them all.': 'learning.games.dyslexia.letterHunt.feedback.foundAll',
  'Almost. Make sure you only pick the target letter.': 'learning.games.dyslexia.letterHunt.feedback.almostOnlyTarget',

  // Memory Flip
  'Flip two cards. Match the word with the picture.': 'learning.games.adhd.flipFind.instructions',
  'Round': 'learning.games.adhd.flipFind.round',
  'Moves': 'learning.games.adhd.flipFind.moves',
  'Memory grid': 'learning.games.adhd.flipFind.gridAria',
  'Face down card': 'learning.games.adhd.flipFind.faceDown',
  'Correct match!': 'learning.games.adhd.flipFind.feedback.correctMatch',
  'Not a match. Try again.': 'learning.games.adhd.flipFind.feedback.notAMatch',
  'Great! You matched them all.': 'learning.games.adhd.flipFind.feedback.matchedAll',
  '2 pairs': 'learning.games.adhd.flipFind.round2',
  '3 pairs': 'learning.games.adhd.flipFind.round3',
  '4 pairs': 'learning.games.adhd.flipFind.round4',

  // Pattern Pop
  'Look at the pattern and choose what comes next.': 'learning.games.adhd.patternPop.instructions',
  'Pattern': 'learning.games.adhd.patternPop.patternAria',
  'Next pattern': 'learning.games.adhd.patternPop.nextPattern',

  // Flash Match (speed)
  'Match the word to the picture before the timer ends.': 'learning.games.adhd.flashMatch.instructions',
  'Tap grid': 'learning.games.adhd.flashMatch.gridAria',
  'Word prompt': 'learning.games.adhd.flashMatch.wordPromptAria',
  'Word:': 'learning.games.adhd.flashMatch.wordLabel',
  'Picture options': 'learning.games.adhd.flashMatch.pictureOptionsAria',
  "Time's up — try again.": 'learning.games.adhd.flashMatch.feedback.timesUp',

  // Mood Match
  'Match the emotion word with the correct face.': 'learning.games.autism.moodMatch.instructions',
  'Emotion word': 'learning.games.autism.moodMatch.emotionWordAria',
  'Next emotion': 'learning.games.autism.moodMatch.nextEmotion',
  'Try again. Keep going!': 'learning.games.autism.moodMatch.feedback.tryAgainKeepGoing',
  'Happy': 'learning.games.autism.moodMatch.emotions.happy',
  'Sad': 'learning.games.autism.moodMatch.emotions.sad',
  'Angry': 'learning.games.autism.moodMatch.emotions.angry',
  'Surprised': 'learning.games.autism.moodMatch.emotions.surprised',
  'Tired': 'learning.games.autism.moodMatch.emotions.tired',
  'Excited': 'learning.games.autism.moodMatch.emotions.excited',

  // Story Steps
  'Arrange the pictures in the correct order.': 'learning.games.autism.storySteps.instructions',
  'Sequence list': 'learning.games.autism.storySteps.sequenceAria',
  'Reorder controls': 'learning.games.autism.storySteps.reorderAria',
  'Up': 'learning.games.autism.storySteps.up',
  'Down': 'learning.games.autism.storySteps.down',
  'Check order': 'learning.games.autism.storySteps.checkOrder',
  'Next story': 'learning.games.autism.storySteps.nextStory',
  'Correct! Great job.': 'learning.games.autism.storySteps.feedback.correctGreatJob',
  'Not quite. Try again. Keep going!': 'learning.games.autism.storySteps.feedback.notQuiteKeepGoing',
  'Morning routine': 'learning.games.autism.storySteps.rounds.morning',
  'Snack time': 'learning.games.autism.storySteps.rounds.snack',
  'Bedtime routine': 'learning.games.autism.storySteps.rounds.bedtime',
  'Wake up': 'learning.games.autism.storySteps.steps.wake',
  'Brush teeth': 'learning.games.autism.storySteps.steps.brush',
  'Go to school': 'learning.games.autism.storySteps.steps.school',
  'Wash hands': 'learning.games.autism.storySteps.steps.wash',
  'Eat snack': 'learning.games.autism.storySteps.steps.eat',
  'Clean up': 'learning.games.autism.storySteps.steps.clean',
  'Wear pajamas': 'learning.games.autism.storySteps.steps.pjs',
  'Read a story': 'learning.games.autism.storySteps.steps.story',
  'Sleep': 'learning.games.autism.storySteps.steps.sleep',

  // Sort It Out
  'Drag each object into the correct category.': 'learning.games.autism.sortItOut.instructions',
  'Difficulty level': 'learning.games.autism.sortItOut.difficultyAria',
  'Categories': 'learning.games.autism.sortItOut.categoriesAria',
  'Place here': 'learning.games.autism.sortItOut.placeHere',
  'Placed items': 'learning.games.autism.sortItOut.placedItemsAria',
  'Click to remove': 'learning.games.autism.sortItOut.clickToRemove',
  'Objects': 'learning.games.autism.sortItOut.objects',
  'Tip: You can also tap an object, then press “Place here” on a category.': 'learning.games.autism.sortItOut.tip',
  'Check sorting': 'learning.games.autism.sortItOut.checkSorting',
  'Reset': 'learning.games.common.reset',
  'Place all objects first. Keep going!': 'learning.games.autism.sortItOut.feedback.placeAllFirst',
  'Correct! Nicely sorted.': 'learning.games.autism.sortItOut.feedback.correctSorted',
  'Some are in the wrong place. Try again.': 'learning.games.autism.sortItOut.feedback.wrongPlace',
  'Animals': 'learning.games.autism.sortItOut.categories.animals',
  'Fruits': 'learning.games.autism.sortItOut.categories.fruits',
  'Vehicles': 'learning.games.autism.sortItOut.categories.vehicles',
  'Clothes': 'learning.games.autism.sortItOut.categories.clothes',
  'Dog': 'learning.games.autism.sortItOut.items.dog',
  'Cat': 'learning.games.autism.sortItOut.items.cat',
  'Rabbit': 'learning.games.autism.sortItOut.items.rabbit',
  'Cow': 'learning.games.autism.sortItOut.items.cow',
  'Apple': 'learning.games.autism.sortItOut.items.apple',
  'Banana': 'learning.games.autism.sortItOut.items.banana',
  'Grapes': 'learning.games.autism.sortItOut.items.grapes',
  'Strawberry': 'learning.games.autism.sortItOut.items.strawberry',
  'Car': 'learning.games.autism.sortItOut.items.car',
  'Bus': 'learning.games.autism.sortItOut.items.bus',
  'Train': 'learning.games.autism.sortItOut.items.train',
  'Bike': 'learning.games.autism.sortItOut.items.bike',
  'Shirt': 'learning.games.autism.sortItOut.items.shirt',
  'Shoe': 'learning.games.autism.sortItOut.items.shoe',
  'Cap': 'learning.games.autism.sortItOut.items.cap',
  'Coat': 'learning.games.autism.sortItOut.items.coat',
};

const AutismMoodMatchVisual = ({ label = 'Mood Match visual', compact = false }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `amv_bg_${safe}`;

  return (
    <svg className={`game-visual-svg ${compact ? 'compact' : ''}`} viewBox="0 0 220 120" role="img" aria-label={label}>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="208" height="108" rx="16" fill={`url(#${bgId})`} />
      <g className="floaty a">
        <circle cx="66" cy="58" r="26" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.75)" />
        <text x="66" y="68" textAnchor="middle" fontSize="30" fontWeight="800">🙂</text>
      </g>
      <g className="floaty b">
        <circle cx="124" cy="46" r="24" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.75)" />
        <text x="124" y="55" textAnchor="middle" fontSize="28" fontWeight="800">😢</text>
      </g>
      <g className="floaty c">
        <circle cx="168" cy="70" r="22" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.75)" />
        <text x="168" y="79" textAnchor="middle" fontSize="26" fontWeight="800">😡</text>
      </g>
      <g className="sparkle" opacity="0.85">
        <circle cx="186" cy="30" r="3" fill="#60a5fa" />
        <circle cx="194" cy="40" r="2" fill="#94a3b8" />
        <circle cx="176" cy="42" r="2" fill="#22c55e" />
      </g>
    </svg>
  );
};

const AutismStoryStepsVisual = ({ label = 'Story Steps visual', compact = false }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `asv_bg_${safe}`;

  return (
    <svg className={`game-visual-svg ${compact ? 'compact' : ''}`} viewBox="0 0 220 120" role="img" aria-label={label}>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1f5f9" />
          <stop offset="1" stopColor="#e0f2fe" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="208" height="108" rx="16" fill={`url(#${bgId})`} />
      <g>
        {[
          { x: 34, y: 28, emoji: '🛏️', cls: 'a' },
          { x: 34, y: 52, emoji: '🪥', cls: 'b' },
          { x: 34, y: 76, emoji: '🏫', cls: 'c' },
        ].map((it) => (
          <g key={it.emoji} className={`floaty ${it.cls}`}>
            <rect x={it.x} y={it.y} width="152" height="18" rx="9" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.75)" />
            <text x={it.x + 14} y={it.y + 13} fontSize="12" fontWeight="800">{it.emoji}</text>
            <circle cx={it.x + 136} cy={it.y + 9} r="3" fill="rgba(59,130,246,0.55)" />
          </g>
        ))}
      </g>
      <path
        d="M64 102 C 92 88, 124 112, 152 94"
        fill="none"
        stroke="rgba(30,41,59,0.26)"
        strokeWidth="6"
        strokeLinecap="round"
        className="drawline"
        opacity="0.55"
      />
    </svg>
  );
};

const AutismSortItOutVisual = ({ label = 'Sort It Out visual', compact = false }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `aov_bg_${safe}`;

  return (
    <svg className={`game-visual-svg ${compact ? 'compact' : ''}`} viewBox="0 0 220 120" role="img" aria-label={label}>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ecfeff" />
          <stop offset="1" stopColor="#f1f5f9" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="208" height="108" rx="16" fill={`url(#${bgId})`} />
      <g>
        {[
          { x: 30, label: '🐶', cls: 'a' },
          { x: 92, label: '🍎', cls: 'b' },
          { x: 154, label: '🚗', cls: 'c' },
        ].map((b) => (
          <g key={b.label} className={`floaty ${b.cls}`}>
            <rect x={b.x} y="34" width="40" height="52" rx="12" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.75)" />
            <text x={b.x + 20} y="64" textAnchor="middle" fontSize="22" fontWeight="900">{b.label}</text>
          </g>
        ))}
      </g>
      <g className="sparkle" opacity="0.85">
        <circle cx="182" cy="26" r="3" fill="#22c55e" />
        <circle cx="194" cy="36" r="2" fill="#60a5fa" />
      </g>
    </svg>
  );
};

const WordBuilderVisual = ({ label = 'Word Builder visual', compact = false }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `wb_bg_${safe}`;
  const tileId = `wb_tile_${safe}`;

  return (
    <svg
      className={`game-visual-svg ${compact ? 'compact' : ''}`}
      viewBox="0 0 220 120"
      role="img"
      aria-label={label}
    >
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dbeafe" />
          <stop offset="1" stopColor="#fef3c7" />
        </linearGradient>
        <linearGradient id={tileId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="208" height="108" rx="16" fill={`url(#${bgId})`} />
    <g className="floaty a">
      <rect x="24" y="30" width="44" height="44" rx="12" fill={`url(#${tileId})`} stroke="rgba(148,163,184,0.8)" />
      <text x="46" y="59" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a">
        F
      </text>
    </g>
    <g className="floaty b">
      <rect x="76" y="22" width="44" height="44" rx="12" fill={`url(#${tileId})`} stroke="rgba(148,163,184,0.8)" />
      <text x="98" y="51" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a">
        R
      </text>
    </g>
    <g className="floaty c">
      <rect x="128" y="34" width="44" height="44" rx="12" fill={`url(#${tileId})`} stroke="rgba(148,163,184,0.8)" />
      <text x="150" y="63" textAnchor="middle" fontSize="20" fontWeight="900" fill="#0f172a">
        I
      </text>
    </g>
    <g className="sparkle">
      <circle cx="186" cy="30" r="4" fill="#60a5fa" />
      <circle cx="194" cy="38" r="2" fill="#f59e0b" />
      <circle cx="178" cy="42" r="2" fill="#22c55e" />
    </g>
    <path
      d="M24 92 C 62 76, 98 108, 136 92 S 198 92, 206 76"
      fill="none"
      stroke="rgba(30, 41, 59, 0.28)"
      strokeWidth="6"
      strokeLinecap="round"
      className="drawline"
    />
    </svg>
  );
};

const SoundMatchVisual = ({ label = 'Sound match visual', compact = false }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `sm_bg_${safe}`;
  const waveId = `sm_wave_${safe}`;

  return (
    <svg className={`game-visual-svg ${compact ? 'compact' : ''}`} viewBox="0 0 220 120" role="img" aria-label={label}>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e0f2fe" />
          <stop offset="1" stopColor="#ede9fe" />
        </linearGradient>
        <linearGradient id={waveId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2563eb" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="208" height="108" rx="16" fill={`url(#${bgId})`} />
    <g className="pulse">
      <circle cx="52" cy="60" r="18" fill="#ffffff" stroke="rgba(148,163,184,0.8)" />
      <path d="M48 52 L48 68 L64 60 Z" fill="#2563eb" />
    </g>
    <path
      className="wave"
      d="M84 60 C 92 32, 100 88, 108 60 S 124 60, 132 42 S 148 78, 156 60 S 172 60, 180 48"
      fill="none"
      stroke={`url(#${waveId})`}
      strokeWidth="6"
      strokeLinecap="round"
    />
    <g className="floaty note">
      <path d="M176 34 C176 26 184 22 192 22 V48 C192 58 176 60 176 50 Z" fill="#7c3aed" opacity="0.85" />
      <circle cx="188" cy="52" r="7" fill="#7c3aed" />
    </g>
    </svg>
  );
};

const LetterFinderVisual = ({ label = 'Letter finder visual', compact = false }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `lf_bg_${safe}`;

  return (
    <svg className={`game-visual-svg ${compact ? 'compact' : ''}`} viewBox="0 0 220 120" role="img" aria-label={label}>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#dcfce7" />
          <stop offset="1" stopColor="#fff7ed" />
        </linearGradient>
      </defs>
      <rect x="6" y="6" width="208" height="108" rx="16" fill={`url(#${bgId})`} />
    <g transform="translate(28,26)">
      {Array.from({ length: 5 }).map((_, r) =>
        Array.from({ length: 5 }).map((__, c) => {
          const x = c * 24;
          const y = r * 16;
          const isTarget = r === 2 && c === 3;
          return (
            <g key={`${r}-${c}`}>
              <rect
                x={x}
                y={y}
                width="20"
                height="12"
                rx="4"
                fill={isTarget ? 'rgba(59,130,246,0.25)' : 'rgba(255,255,255,0.9)'}
                stroke={isTarget ? 'rgba(59,130,246,0.8)' : 'rgba(148,163,184,0.7)'}
              />
              <text
                x={x + 10}
                y={y + 10}
                textAnchor="middle"
                fontSize="10"
                fontWeight={isTarget ? '900' : '700'}
                fill="#0f172a"
              >
                {isTarget ? 'B' : 'D'}
              </text>
            </g>
          );
        })
      )}
    </g>
    <g className="magnify" transform="translate(150,62)">
      <circle cx="0" cy="0" r="16" fill="rgba(255,255,255,0.92)" stroke="rgba(30,41,59,0.35)" strokeWidth="3" />
      <line x1="12" y1="12" x2="26" y2="26" stroke="rgba(30,41,59,0.35)" strokeWidth="5" strokeLinecap="round" />
      <text x="0" y="6" textAnchor="middle" fontSize="18" fontWeight="900" fill="#2563eb">
        B
      </text>
    </g>
    </svg>
  );
};

const WordRoundVisual = ({ word, label }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `wr_bg_${safe}`;
  const accentId = `wr_ac_${safe}`;

  const normalized = String(word || '').toLowerCase();
  const theme = (() => {
    switch (normalized) {
      case 'friend':
        return { a: '#dbeafe', b: '#fce7f3', accent: '#2563eb', kind: 'friend' };
      case 'music':
        return { a: '#e0f2fe', b: '#ede9fe', accent: '#7c3aed', kind: 'music' };
      case 'happy':
        return { a: '#fef3c7', b: '#dcfce7', accent: '#f59e0b', kind: 'happy' };
      case 'rabbit':
        return { a: '#dcfce7', b: '#e0f2fe', accent: '#16a34a', kind: 'rabbit' };
      case 'garden':
        return { a: '#dcfce7', b: '#fff7ed', accent: '#15803d', kind: 'garden' };
      default:
        return { a: '#e2e8f0', b: '#f8fafc', accent: '#334155', kind: 'generic' };
    }
  })();

  const fallbackLabel = word ? `Visual hint for ${word}` : 'Visual hint';
  const aria = label || fallbackLabel;

  return (
    <svg className="round-visual" viewBox="0 0 320 140" role="img" aria-label={aria}>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={theme.a} />
          <stop offset="1" stopColor={theme.b} />
        </linearGradient>
        <linearGradient id={accentId} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={theme.accent} stopOpacity="0.9" />
          <stop offset="1" stopColor={theme.accent} stopOpacity="0.35" />
        </linearGradient>
      </defs>

      <rect x="8" y="8" width="304" height="124" rx="18" fill={`url(#${bgId})`} />
      <path
        d="M26 106 C 76 82, 126 126, 176 100 S 260 98, 300 78"
        fill="none"
        stroke={`url(#${accentId})`}
        strokeWidth="8"
        strokeLinecap="round"
        className="drawline"
        opacity="0.55"
      />

      {theme.kind === 'friend' ? (
        <g>
          <circle cx="122" cy="64" r="18" fill="rgba(255,255,255,0.95)" stroke="rgba(148,163,184,0.75)" />
          <circle cx="198" cy="64" r="18" fill="rgba(255,255,255,0.95)" stroke="rgba(148,163,184,0.75)" />
          <path
            d="M92 112 C 104 90, 140 86, 152 112"
            fill="rgba(255,255,255,0.92)"
            stroke="rgba(148,163,184,0.75)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path
            d="M168 112 C 180 90, 216 86, 228 112"
            fill="rgba(255,255,255,0.92)"
            stroke="rgba(148,163,184,0.75)"
            strokeWidth="3"
            strokeLinejoin="round"
          />
          <path d="M156 92 C 164 84, 180 84, 188 92" fill="none" stroke="rgba(37,99,235,0.7)" strokeWidth="5" strokeLinecap="round" />
          <circle className="sparkle" cx="254" cy="38" r="4" fill="rgba(37,99,235,0.6)" />
          <circle className="sparkle" cx="266" cy="50" r="2" fill="rgba(236,72,153,0.55)" />
        </g>
      ) : null}

      {theme.kind === 'music' ? (
        <g>
          <circle cx="92" cy="70" r="20" fill="rgba(255,255,255,0.95)" stroke="rgba(148,163,184,0.75)" />
          <path d="M86 60 L86 86 L108 73 Z" fill="#2563eb" opacity="0.95" />
          <path
            className="wave"
            d="M138 70 C 148 44, 158 96, 168 70 S 190 70, 200 52 S 222 88, 232 70"
            fill="none"
            stroke="rgba(124,58,237,0.85)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          <g className="floaty note" opacity="0.9">
            <path d="M246 42 C246 34 254 30 262 30 V62 C262 72 246 74 246 64 Z" fill="#7c3aed" />
            <circle cx="258" cy="66" r="8" fill="#7c3aed" />
          </g>
        </g>
      ) : null}

      {theme.kind === 'happy' ? (
        <g>
          <circle cx="160" cy="74" r="44" fill="rgba(255,255,255,0.96)" stroke="rgba(148,163,184,0.75)" />
          <circle cx="142" cy="66" r="5" fill="#0f172a" />
          <circle cx="178" cy="66" r="5" fill="#0f172a" />
          <path d="M140 88 C 152 102, 168 102, 180 88" fill="none" stroke="rgba(245,158,11,0.95)" strokeWidth="7" strokeLinecap="round" />
          <circle className="sparkle" cx="230" cy="44" r="4" fill="rgba(245,158,11,0.65)" />
          <circle className="sparkle" cx="244" cy="56" r="2" fill="rgba(34,197,94,0.6)" />
        </g>
      ) : null}

      {theme.kind === 'rabbit' ? (
        <g>
          <ellipse cx="170" cy="90" rx="54" ry="34" fill="rgba(255,255,255,0.95)" stroke="rgba(148,163,184,0.75)" />
          <ellipse cx="144" cy="46" rx="14" ry="34" fill="rgba(255,255,255,0.95)" stroke="rgba(148,163,184,0.75)" />
          <ellipse cx="196" cy="46" rx="14" ry="34" fill="rgba(255,255,255,0.95)" stroke="rgba(148,163,184,0.75)" />
          <circle cx="156" cy="84" r="4" fill="#0f172a" />
          <circle cx="188" cy="84" r="4" fill="#0f172a" />
          <circle cx="172" cy="94" r="4" fill="#ef4444" opacity="0.85" />
          <path d="M168 98 C 172 104, 176 104, 180 98" fill="none" stroke="rgba(30,41,59,0.55)" strokeWidth="3" strokeLinecap="round" />
          <circle className="floaty a" cx="78" cy="84" r="10" fill="rgba(34,197,94,0.55)" />
          <circle className="floaty b" cx="96" cy="100" r="6" fill="rgba(34,197,94,0.45)" />
        </g>
      ) : null}

      {theme.kind === 'garden' ? (
        <g>
          <rect x="74" y="92" width="172" height="18" rx="9" fill="rgba(148,163,184,0.22)" />
          <path d="M160 100 C160 78, 148 72, 148 56" fill="none" stroke="rgba(21,128,61,0.85)" strokeWidth="6" strokeLinecap="round" />
          <path d="M160 100 C160 76, 172 70, 172 54" fill="none" stroke="rgba(21,128,61,0.85)" strokeWidth="6" strokeLinecap="round" />
          <path d="M132 64 C146 60, 150 72, 140 78 C128 76, 122 68, 132 64 Z" fill="rgba(34,197,94,0.65)" />
          <path d="M188 62 C174 58, 170 70, 180 76 C192 74, 198 66, 188 62 Z" fill="rgba(34,197,94,0.6)" />
          <circle cx="148" cy="50" r="8" fill="rgba(245,158,11,0.8)" />
          <circle cx="172" cy="48" r="8" fill="rgba(245,158,11,0.8)" />
          <circle className="sparkle" cx="248" cy="40" r="4" fill="rgba(34,197,94,0.55)" />
        </g>
      ) : null}
    </svg>
  );
};

const LetterRoundVisual = ({ letter, label }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `lr_bg_${safe}`;
  const normalized = String(letter || '').toLowerCase();
  const pairs = ['b', 'd', 'p', 'q'].filter((x) => x !== normalized);
  const aria = label || (letter ? `Target letter ${letter}` : 'Target letter');
  const accent = normalized === 'b' ? '#2563eb' : normalized === 'd' ? '#7c3aed' : normalized === 'p' ? '#16a34a' : '#f59e0b';

  return (
    <svg className="round-visual" viewBox="0 0 320 140" role="img" aria-label={aria}>
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(219,234,254,0.95)" />
          <stop offset="1" stopColor="rgba(254,243,199,0.85)" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="304" height="124" rx="18" fill={`url(#${bgId})`} />

      <g className="pulse">
        <circle cx="110" cy="78" r="44" fill="rgba(255,255,255,0.96)" stroke="rgba(148,163,184,0.75)" />
        <text x="110" y="92" textAnchor="middle" fontSize="52" fontWeight="900" fill={accent}>
          {String(letter || '').toUpperCase()}
        </text>
      </g>

      <g opacity="0.95">
        <rect x="176" y="34" width="120" height="24" rx="10" fill="rgba(255,255,255,0.78)" />
        <text x="186" y="51" fontSize="12" fontWeight="800" fill="#0f172a">
          Similar:
        </text>
      </g>

      <g transform="translate(176,66)">
        {pairs.map((p, i) => (
          <g key={p} transform={`translate(${i * 42},0)`}>
            <rect x="0" y="0" width="36" height="36" rx="12" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.75)" />
            <text x="18" y="24" textAnchor="middle" fontSize="18" fontWeight="900" fill="#334155">
              {p.toUpperCase()}
            </text>
          </g>
        ))}
      </g>

      <g className="magnify" transform="translate(268,106)">
        <circle cx="0" cy="0" r="14" fill="rgba(255,255,255,0.92)" stroke="rgba(30,41,59,0.35)" strokeWidth="3" />
        <line x1="10" y1="10" x2="22" y2="22" stroke="rgba(30,41,59,0.35)" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
};

const shuffleArray = (arr) => {
  const copy = Array.isArray(arr) ? [...arr] : [];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const joinUrl = (base, path) => {
  const baseStr = String(base || '').replace(/\/+$/, '');
  const pathStr = String(path || '');
  const normalizedPath = pathStr.startsWith('/') ? pathStr : `/${pathStr}`;
  return `${baseStr}${normalizedPath}`;
};

const speakViaBackendOrBrowser = async ({ text, speed, lang, audioRef, setIsPlaying }) => {
  if (!text) return;

  try {
    window.speechSynthesis?.cancel?.();
  } catch {
    // ignore
  }

  if (audioRef.current) {
    try {
      audioRef.current.pause();
    } catch {
      // ignore
    }
    audioRef.current = null;
  }

  setIsPlaying(true);

  try {
    const ttsUrl = joinUrl(api?.defaults?.baseURL || '/api', '/tts/speak');
    const response = await fetch(ttsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        speed: speed ?? 0.85,
        lang: backendTtsLangFor(normalizePreferredLanguage(lang || 'english')),
      }),
    });

    if (!response.ok) throw new Error('Backend TTS failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.playbackRate = speed ?? 0.85;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      audioRef.current = null;
      setIsPlaying(false);
    };
    audio.onpause = () => {
      setIsPlaying(false);
    };

    await audio.play();
    return;
  } catch {
    // Browser TTS fallback
    try {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speed ?? 0.85;
        utterance.lang = speechSynthesisLangFor(normalizePreferredLanguage(lang || 'english'));
        utterance.onend = () => setIsPlaying(false);
        window.speechSynthesis.speak(utterance);
        return;
      }
    } catch {
      // ignore
    }
  }

  setIsPlaying(false);
};

const WordBuilderGame = ({ uiText }) => {
  const WORDS = useMemo(
    () => [
      { word: 'friend', hint: 'A person you like and trust.' },
      { word: 'music', hint: 'You can listen to it.' },
      { word: 'happy', hint: 'A good feeling.' },
      { word: 'rabbit', hint: 'A small animal that hops.' },
      { word: 'garden', hint: 'A place where plants grow.' },
    ],
    []
  );

  const [round, setRound] = useState(0);
  const [target, setTarget] = useState(WORDS[0]);
  const [remaining, setRemaining] = useState([]);
  const [built, setBuilt] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const initRound = useCallback(
    (nextRound) => {
      const nextTarget = WORDS[nextRound % WORDS.length];
      const letters = String(nextTarget.word)
        .split('')
        .map((ch, idx) => ({ id: `${nextRound}-${idx}-${ch}`, ch }));

      setTarget(nextTarget);
      setRemaining(shuffleArray(letters));
      setBuilt([]);
      setFeedback('');
      setIsCorrect(false);
    },
    [WORDS]
  );

  useEffect(() => {
    initRound(0);
  }, [initRound]);

  const builtWord = useMemo(() => built.map((x) => x.ch).join(''), [built]);

  const takeLetter = (letterObj) => {
    if (!letterObj || isCorrect) return;
    setRemaining((prev) => prev.filter((x) => x.id !== letterObj.id));
    setBuilt((prev) => [...prev, letterObj]);
    setFeedback('');
  };

  const undo = () => {
    if (isCorrect) return;
    setBuilt((prev) => {
      if (!prev.length) return prev;
      const next = [...prev];
      const last = next.pop();
      setRemaining((rPrev) => [...rPrev, last]);
      return next;
    });
    setFeedback('');
  };

  const clear = () => {
    if (isCorrect) return;
    const letters = String(target.word)
      .split('')
      .map((ch, idx) => ({ id: `${round}-${idx}-${ch}`, ch }));
    setRemaining(shuffleArray(letters));
    setBuilt([]);
    setFeedback('');
  };

  const check = () => {
    const normalizedBuilt = builtWord.toLowerCase();
    const normalizedTarget = String(target.word).toLowerCase();
    if (!normalizedBuilt) {
      setFeedback('Try building the word first.');
      setIsCorrect(false);
      return;
    }
    if (normalizedBuilt === normalizedTarget) {
      setFeedback('Correct! Nice work.');
      setIsCorrect(true);
      return;
    }
    setFeedback('Not quite. Try again.');
    setIsCorrect(false);
  };

  const next = () => {
    const nextRound = round + 1;
    setRound(nextRound);
    initRound(nextRound);
  };

  return (
    <div>
      <div className="round-visual-wrap" aria-hidden="false">
        <WordRoundVisual word={target.word} label={uiText(`Visual hint for ${target.word}`)} />
      </div>
      <p className="game-instructions">
        {uiText('Arrange the letters to spell the word. Tip: use Undo if you make a mistake.')}
      </p>

      <div className="game-row">
        <strong>{uiText('Hint:')}</strong>
        <span>{uiText(target.hint)}</span>
      </div>

      <div className="game-row">
        <strong>{uiText('Your word:')}</strong>
        <div className="built-word" aria-label={uiText('Built word')}>
          {built.length ? (
            built.map((l) => (
              <span key={l.id} className="built-letter" aria-hidden="true">
                {l.ch.toUpperCase()}
              </span>
            ))
          ) : (
            <span style={{ color: '#64748b' }}>{uiText('Click letters below')}</span>
          )}
        </div>
      </div>

      <div className="game-row" aria-label={uiText('Letter bank')}>
        <div className="letter-bank">
          {remaining.map((l) => (
            <button
              key={l.id}
              type="button"
              className="game-letter"
              onClick={() => takeLetter(l)}
              aria-label={uiText(`Add letter ${l.ch}`)}
              disabled={isCorrect}
            >
              {l.ch.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="game-row">
        <button type="button" className="btn-settings" onClick={undo} disabled={!built.length || isCorrect}>
          <Trash2 size={16} aria-hidden="true" />
          <span>{uiText('Undo')}</span>
        </button>
        <button type="button" className="btn-settings" onClick={clear} disabled={isCorrect}>
          <Shuffle size={16} aria-hidden="true" />
          <span>{uiText('Shuffle')}</span>
        </button>
        <button type="button" className="btn-settings" onClick={check} disabled={isCorrect}>
          {uiText('Check')}
        </button>
        <button type="button" className="btn-settings" onClick={next} disabled={!isCorrect}>
          {uiText('Next word')}
        </button>
      </div>

      {feedback ? (
        <div className={`game-feedback ${isCorrect ? 'good' : feedback.includes('Not quite') ? 'bad' : ''}`}>{uiText(feedback)}</div>
      ) : null}
    </div>
  );
};

const SoundToWordMatchGame = ({ uiText, preferredLanguage }) => {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const ROUNDS = useMemo(
    () => [
      { word: 'friend', options: ['freind', 'friend', 'frend', 'frinde'] },
      { word: 'music', options: ['muzic', 'music', 'musick', 'muisc'] },
      { word: 'happy', options: ['hapy', 'happy', 'happi', 'happpy'] },
      { word: 'garden', options: ['gardan', 'garden', 'gardin', 'gar den'] },
    ],
    []
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [picked, setPicked] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const current = ROUNDS[roundIndex % ROUNDS.length];
  const choices = useMemo(() => shuffleArray(current.options), [current.options]);

  useEffect(() => {
    return () => {
      try {
        window.speechSynthesis?.cancel?.();
      } catch {}
      if (audioRef.current) {
        try {
          audioRef.current.pause();
        } catch {}
        audioRef.current = null;
      }
    };
  }, []);

  const play = async () => {
    setFeedback('');
    await speakViaBackendOrBrowser({
      text: current.word,
      speed: 0.85,
      lang: preferredLanguage || 'english',
      audioRef,
      setIsPlaying,
    });
  };

  const check = () => {
    if (!picked) {
      setFeedback('Pick an option first.');
      setIsCorrect(false);
      return;
    }
    if (picked === current.word) {
      setFeedback('Correct!');
      setIsCorrect(true);
      return;
    }
    setFeedback('Not quite — listen again and try.');
    setIsCorrect(false);
  };

  const next = () => {
    setRoundIndex((prev) => prev + 1);
    setPicked('');
    setFeedback('');
    setIsCorrect(false);
  };

  return (
    <div>
      <div className="round-visual-wrap" aria-hidden="false">
        <WordRoundVisual word={current.word} label={uiText(`Visual hint for ${current.word}`)} />
      </div>
      <p className="game-instructions">{uiText('Press Play, then choose the correct spelling you heard.')}</p>

      <div className="game-row">
        <button type="button" className="btn-settings" onClick={play} disabled={isPlaying}>
          <Volume2 size={16} aria-hidden="true" />
          <span>{isPlaying ? uiText('Playing…') : uiText('Play')}</span>
        </button>
        <span style={{ color: '#475569' }}>{uiText('Tip: You can press Play multiple times.')}</span>
      </div>

      <div className="choice-list" role="group" aria-label={uiText('Spelling options')}>
        {choices.map((opt) => (
          <button
            key={opt}
            type="button"
            className="choice"
            aria-pressed={picked === opt ? 'true' : 'false'}
            onClick={() => {
              setPicked(opt);
              setFeedback('');
              setIsCorrect(false);
            }}
          >
            <span style={{ fontWeight: 700 }}>{opt}</span>
            <span style={{ color: '#64748b' }}>{picked === opt ? uiText('Selected') : ''}</span>
          </button>
        ))}
      </div>

      <div className="game-row">
        <button type="button" className="btn-settings" onClick={check} disabled={isCorrect}>
          {uiText('Check')}
        </button>
        <button type="button" className="btn-settings" onClick={next} disabled={!isCorrect}>
          {uiText('Next sound')}
        </button>
      </div>

      {feedback ? (
        <div className={`game-feedback ${isCorrect ? 'good' : feedback.includes('Not quite') ? 'bad' : ''}`}>{uiText(feedback)}</div>
      ) : null}
    </div>
  );
};

const LetterConfusionFinderGame = ({ uiText }) => {
  const LETTER_POOL = useMemo(() => ['b', 'd', 'p', 'q', 'a', 'e', 'n', 'r', 't', 'o'], []);
  const TARGETS = useMemo(() => ['b', 'd', 'p', 'q'], []);

  const [round, setRound] = useState(0);
  const [target, setTarget] = useState('b');
  const [grid, setGrid] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const init = useCallback(
    (nextRound) => {
      const nextTarget = TARGETS[nextRound % TARGETS.length];
      const size = 25;

      // Start with random letters
      const base = Array.from({ length: size }).map((_, idx) => {
        const ch = LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
        return { id: `${nextRound}-${idx}`, ch, picked: false };
      });

      // Force some target letters
      const forcedCount = 6;
      const positions = shuffleArray(Array.from({ length: size }).map((_, i) => i)).slice(0, forcedCount);
      positions.forEach((pos) => {
        base[pos] = { ...base[pos], ch: nextTarget };
      });

      setTarget(nextTarget);
      setGrid(base);
      setFeedback('');
      setIsCorrect(false);
    },
    [LETTER_POOL, TARGETS]
  );

  useEffect(() => {
    init(0);
  }, [init]);

  const togglePick = (id) => {
    if (isCorrect) return;
    setGrid((prev) => prev.map((c) => (c.id === id ? { ...c, picked: !c.picked } : c)));
    setFeedback('');
  };

  const stats = useMemo(() => {
    const totalTargets = grid.filter((c) => c.ch === target).length;
    const pickedTargets = grid.filter((c) => c.picked && c.ch === target).length;
    const pickedWrong = grid.filter((c) => c.picked && c.ch !== target).length;
    return { totalTargets, pickedTargets, pickedWrong };
  }, [grid, target]);

  const check = () => {
    if (!grid.length) return;
    if (stats.pickedTargets === 0) {
      setFeedback('Pick some letters first.');
      setIsCorrect(false);
      return;
    }
    if (stats.pickedTargets === stats.totalTargets && stats.pickedWrong === 0) {
      setFeedback('Great job! You found them all.');
      setIsCorrect(true);
      return;
    }
    setFeedback('Almost. Make sure you only pick the target letter.');
    setIsCorrect(false);
  };

  const clear = () => {
    if (isCorrect) return;
    setGrid((prev) => prev.map((c) => ({ ...c, picked: false })));
    setFeedback('');
  };

  const next = () => {
    const nextRound = round + 1;
    setRound(nextRound);
    init(nextRound);
  };

  return (
    <div>
      <div className="round-visual-wrap" aria-hidden="false">
        <LetterRoundVisual letter={target} label={uiText(`Target letter ${target}`)} />
      </div>
      <p className="game-instructions">
        {uiText('Find every target letter. This is especially helpful for b/d/p/q confusion.')}
      </p>

      <div className="game-row">
        <strong>{uiText('Target:')}</strong>
        <span style={{ fontSize: 20, fontWeight: 900 }}>{target.toUpperCase()}</span>
        <span style={{ color: '#475569' }}>
          {uiText('Found')} {stats.pickedTargets}/{stats.totalTargets}
        </span>
      </div>

      <div className="letter-grid" role="grid" aria-label={uiText('Letter grid')}>
        {grid.map((cell) => (
          <button
            key={cell.id}
            type="button"
            className="grid-cell"
            aria-pressed={cell.picked ? 'true' : 'false'}
            onClick={() => togglePick(cell.id)}
            aria-label={uiText(`Letter ${cell.ch}`)}
            disabled={isCorrect}
          >
            {cell.ch.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="game-row">
        <button type="button" className="btn-settings" onClick={clear} disabled={isCorrect}>
          {uiText('Clear')}
        </button>
        <button type="button" className="btn-settings" onClick={check} disabled={isCorrect}>
          {uiText('Check')}
        </button>
        <button type="button" className="btn-settings" onClick={next} disabled={!isCorrect}>
          {uiText('Next round')}
        </button>
      </div>

      {feedback ? (
        <div className={`game-feedback ${isCorrect ? 'good' : feedback.includes('Almost') ? 'bad' : ''}`}>{uiText(feedback)}</div>
      ) : null}
    </div>
  );
};

const QuickTapRoundVisual = ({ target }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `qt_bg_${safe}`;
  const normalized = String(target || '').toLowerCase();
  const isColor = ['blue', 'red', 'green', 'yellow', 'purple', 'orange'].includes(normalized);

  const kind =
    normalized === 'cat'
      ? 'cat'
      : normalized === 'dog'
        ? 'dog'
        : normalized === 'apple'
          ? 'apple'
          : normalized === 'car'
            ? 'car'
            : normalized === 'sun'
              ? 'sun'
              : normalized === 'tree'
                ? 'tree'
                : normalized === 'book'
                  ? 'book'
                  : normalized === 'ball'
                    ? 'ball'
                    : isColor
                      ? 'color'
                      : 'spark';

  const accent =
    normalized === 'blue'
      ? '#2563eb'
      : normalized === 'red'
        ? '#dc2626'
        : normalized === 'green'
          ? '#16a34a'
          : normalized === 'yellow'
            ? '#f59e0b'
            : normalized === 'purple'
              ? '#7c3aed'
              : normalized === 'orange'
                ? '#ea580c'
                : kind === 'apple'
                  ? '#dc2626'
                  : kind === 'car'
                    ? '#2563eb'
                    : kind === 'dog'
                      ? '#7c3aed'
                      : kind === 'cat'
                        ? '#0ea5e9'
                        : '#0ea5e9';

  const Icon = () => {
    if (kind === 'cat') {
      return (
        <g transform="translate(160,72)">
          <circle cx="0" cy="0" r="30" fill="rgba(14,165,233,0.9)" />
          <path d="M-18 -10 L-30 -26 L-10 -22 Z" fill="rgba(14,165,233,0.85)" />
          <path d="M18 -10 L30 -26 L10 -22 Z" fill="rgba(14,165,233,0.85)" />
          <circle cx="-10" cy="-2" r="4" fill="#0f172a" opacity="0.85" />
          <circle cx="10" cy="-2" r="4" fill="#0f172a" opacity="0.85" />
          <path d="M-6 10 C -2 14, 2 14, 6 10" fill="none" stroke="rgba(15,23,42,0.65)" strokeWidth="4" strokeLinecap="round" />
          <path d="M-24 6 H-10" stroke="rgba(15,23,42,0.5)" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 6 H10" stroke="rgba(15,23,42,0.5)" strokeWidth="3" strokeLinecap="round" />
          <path d="M-24 14 H-12" stroke="rgba(15,23,42,0.4)" strokeWidth="3" strokeLinecap="round" />
          <path d="M24 14 H12" stroke="rgba(15,23,42,0.4)" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    }
    if (kind === 'dog') {
      return (
        <g transform="translate(160,72)">
          <circle cx="0" cy="0" r="30" fill="rgba(124,58,237,0.9)" />
          <path d="M-22 -16 C-38 -8, -34 10, -18 2" fill="rgba(124,58,237,0.75)" />
          <path d="M22 -16 C38 -8, 34 10, 18 2" fill="rgba(124,58,237,0.75)" />
          <circle cx="-10" cy="-4" r="4" fill="#0f172a" opacity="0.85" />
          <circle cx="10" cy="-4" r="4" fill="#0f172a" opacity="0.85" />
          <circle cx="0" cy="10" r="6" fill="rgba(15,23,42,0.65)" />
          <path d="M-12 16 C -2 26, 2 26, 12 16" fill="none" stroke="rgba(15,23,42,0.55)" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    }
    if (kind === 'apple') {
      return (
        <g transform="translate(160,74)">
          <circle cx="0" cy="0" r="28" fill="rgba(220,38,38,0.9)" />
          <circle cx="-10" cy="-8" r="8" fill="rgba(255,255,255,0.18)" />
          <path d="M-2 -30 C 2 -44, 16 -46, 18 -34 C 10 -34, 4 -32, -2 -30 Z" fill="rgba(22,163,74,0.9)" />
          <rect x="-2" y="-42" width="5" height="14" rx="2" fill="rgba(71,85,105,0.9)" />
        </g>
      );
    }
    if (kind === 'car') {
      return (
        <g transform="translate(160,78)">
          <rect x="-44" y="-14" width="88" height="30" rx="14" fill="rgba(37,99,235,0.9)" />
          <path d="M-26 -14 C-16 -32, 16 -32, 26 -14 Z" fill="rgba(37,99,235,0.85)" />
          <circle cx="-24" cy="18" r="10" fill="rgba(15,23,42,0.7)" />
          <circle cx="24" cy="18" r="10" fill="rgba(15,23,42,0.7)" />
          <circle cx="-24" cy="18" r="4" fill="rgba(255,255,255,0.7)" />
          <circle cx="24" cy="18" r="4" fill="rgba(255,255,255,0.7)" />
        </g>
      );
    }
    if (kind === 'sun') {
      return (
        <g transform="translate(160,72)">
          <circle cx="0" cy="0" r="22" fill="rgba(245,158,11,0.92)" />
          {Array.from({ length: 10 }).map((_, i) => (
            <path
              key={i}
              d="M0 -34 L0 -46"
              stroke="rgba(245,158,11,0.72)"
              strokeWidth="5"
              strokeLinecap="round"
              transform={`rotate(${i * 36})`}
            />
          ))}
          <circle cx="-8" cy="-4" r="3" fill="#0f172a" opacity="0.75" />
          <circle cx="8" cy="-4" r="3" fill="#0f172a" opacity="0.75" />
          <path d="M-8 10 C -2 16, 2 16, 8 10" fill="none" stroke="rgba(15,23,42,0.5)" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    }
    if (kind === 'tree') {
      return (
        <g transform="translate(160,78)">
          <path d="M0 -44 C-26 -40, -34 -14, -18 -2 C-30 10, -18 28, 0 20 C18 28, 30 10, 18 -2 C34 -14, 26 -40, 0 -44 Z" fill="rgba(34,197,94,0.82)" />
          <rect x="-8" y="18" width="16" height="30" rx="6" fill="rgba(71,85,105,0.75)" />
        </g>
      );
    }
    if (kind === 'book') {
      return (
        <g transform="translate(160,78)">
          <rect x="-44" y="-26" width="88" height="56" rx="10" fill="rgba(59,130,246,0.16)" />
          <rect x="-40" y="-22" width="40" height="48" rx="8" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.65)" />
          <rect x="0" y="-22" width="40" height="48" rx="8" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.65)" />
          <path d="M0 -22 V26" stroke="rgba(100,116,139,0.55)" strokeWidth="3" />
          <path d="M-28 -6 H-10" stroke="rgba(100,116,139,0.55)" strokeWidth="3" strokeLinecap="round" />
          <path d="M10 -6 H28" stroke="rgba(100,116,139,0.55)" strokeWidth="3" strokeLinecap="round" />
        </g>
      );
    }
    if (kind === 'ball') {
      return (
        <g transform="translate(160,74)">
          <circle cx="0" cy="0" r="26" fill="rgba(34,197,94,0.14)" />
          <circle cx="0" cy="0" r="26" fill="rgba(59,130,246,0.9)" opacity="0.92" />
          <path d="M-26 0 H26" stroke="rgba(255,255,255,0.55)" strokeWidth="4" strokeLinecap="round" />
          <path d="M0 -26 V26" stroke="rgba(255,255,255,0.35)" strokeWidth="4" strokeLinecap="round" />
          <path d="M-18 -18 C-6 -6, -6 6, -18 18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round" />
          <path d="M18 -18 C6 -6, 6 6, 18 18" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round" />
        </g>
      );
    }
    if (kind === 'color') {
      return (
        <g transform="translate(160,72)">
          <rect x="-46" y="-28" width="92" height="56" rx="16" fill="rgba(255,255,255,0.88)" stroke="rgba(148,163,184,0.65)" />
          <rect x="-38" y="-20" width="24" height="40" rx="10" fill="rgba(220,38,38,0.85)" />
          <rect x="-10" y="-20" width="24" height="40" rx="10" fill="rgba(59,130,246,0.85)" />
          <rect x="18" y="-20" width="24" height="40" rx="10" fill="rgba(34,197,94,0.85)" />
          <circle cx="0" cy="34" r="4" fill={accent} opacity="0.55" className="pulse" />
        </g>
      );
    }
    return (
      <g transform="translate(160,72)">
        <path
          d="M0 -34 L8 -10 L34 -10 L12 4 L20 28 L0 14 L-20 28 L-12 4 L-34 -10 L-8 -10 Z"
          fill={accent}
          opacity="0.78"
          className="sparkle"
        />
      </g>
    );
  };

  return (
    <svg className="round-visual" viewBox="0 0 320 140" role="img" aria-label="Tap That! visual">
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(239,246,255,0.98)" />
          <stop offset="1" stopColor="rgba(237,233,254,0.9)" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="304" height="124" rx="18" fill={`url(#${bgId})`} />
      <path
        d="M42 100 C 84 72, 112 120, 156 92 S 228 78, 286 62"
        fill="none"
        stroke={accent}
        strokeWidth="10"
        strokeLinecap="round"
        opacity={isColor ? '0.28' : '0.22'}
        className="drawline"
      />
      <Icon />
    </svg>
  );
};

const SpeedMatchRoundVisual = ({ kind }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `smr_bg_${safe}`;
  const accent = kind === 'apple' ? '#dc2626' : kind === 'car' ? '#2563eb' : kind === 'dog' ? '#7c3aed' : '#0ea5e9';

  const Icon = () => {
    if (kind === 'apple') {
      return (
        <g transform="translate(150,74)">
          <circle cx="0" cy="0" r="28" fill="rgba(220,38,38,0.9)" />
          <circle cx="-10" cy="-8" r="8" fill="rgba(255,255,255,0.18)" />
          <path d="M-2 -30 C 2 -44, 16 -46, 18 -34 C 10 -34, 4 -32, -2 -30 Z" fill="rgba(22,163,74,0.9)" />
          <rect x="-2" y="-42" width="5" height="14" rx="2" fill="rgba(71,85,105,0.9)" />
        </g>
      );
    }
    if (kind === 'car') {
      return (
        <g transform="translate(150,78)">
          <rect x="-44" y="-14" width="88" height="30" rx="14" fill="rgba(37,99,235,0.9)" />
          <path d="M-26 -14 C-16 -32, 16 -32, 26 -14 Z" fill="rgba(37,99,235,0.85)" />
          <circle cx="-24" cy="18" r="10" fill="rgba(15,23,42,0.7)" />
          <circle cx="24" cy="18" r="10" fill="rgba(15,23,42,0.7)" />
          <circle cx="-24" cy="18" r="4" fill="rgba(255,255,255,0.7)" />
          <circle cx="24" cy="18" r="4" fill="rgba(255,255,255,0.7)" />
        </g>
      );
    }
    if (kind === 'dog') {
      return (
        <g transform="translate(150,74)">
          <circle cx="0" cy="0" r="26" fill="rgba(124,58,237,0.9)" />
          <circle cx="-10" cy="-4" r="4" fill="#0f172a" opacity="0.85" />
          <circle cx="10" cy="-4" r="4" fill="#0f172a" opacity="0.85" />
          <circle cx="0" cy="8" r="5" fill="rgba(15,23,42,0.7)" />
          <path d="M-10 14 C -2 22, 2 22, 10 14" fill="none" stroke="rgba(15,23,42,0.6)" strokeWidth="4" strokeLinecap="round" />
          <path d="M-20 -20 C-34 -12, -30 4, -18 -2" fill="rgba(124,58,237,0.75)" />
          <path d="M20 -20 C34 -12, 30 4, 18 -2" fill="rgba(124,58,237,0.75)" />
        </g>
      );
    }
    return (
      <g transform="translate(150,74)">
        <circle cx="0" cy="0" r="28" fill={accent} opacity="0.85" />
      </g>
    );
  };

  return (
    <svg className="round-visual" viewBox="0 0 320 140" role="img" aria-label="Flash match visual">
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(240,249,255,0.98)" />
          <stop offset="1" stopColor="rgba(255,247,237,0.9)" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="304" height="124" rx="18" fill={`url(#${bgId})`} />
      <path
        d="M36 102 C 72 78, 110 118, 148 96 S 222 86, 286 66"
        fill="none"
        stroke={accent}
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.25"
        className="drawline"
      />
      <Icon />
    </svg>
  );
};

const PatternRoundVisual = ({ colors }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `pr_bg_${safe}`;
  const seq = Array.isArray(colors) ? colors : [];
  const toColor = (c) => (c === 'red' ? '#ef4444' : c === 'blue' ? '#3b82f6' : c === 'green' ? '#22c55e' : '#94a3b8');

  return (
    <svg className="round-visual" viewBox="0 0 320 140" role="img" aria-label="Pattern pop visual">
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(240,253,250,0.98)" />
          <stop offset="1" stopColor="rgba(239,246,255,0.9)" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="304" height="124" rx="18" fill={`url(#${bgId})`} />
      <g transform="translate(44,70)">
        {seq.slice(0, 5).map((c, i) => (
          <circle key={`${c}-${i}`} cx={i * 44} cy={0} r={14} fill={toColor(c)} opacity="0.9" />
        ))}
        <rect x={5 * 44 - 14} y={-14} width="28" height="28" rx="10" fill="rgba(255,255,255,0.85)" stroke="rgba(148,163,184,0.75)" />
        <path d="M214 -3 C214 -10, 224 -10, 224 -3 C224 4, 214 4, 214 10" fill="none" stroke="rgba(51,65,85,0.75)" strokeWidth="4" strokeLinecap="round" />
        <circle cx="219" cy="18" r="2" fill="rgba(51,65,85,0.75)" />
      </g>
    </svg>
  );
};

const MemoryFlipRoundVisual = ({ pairs }) => {
  const uid = useId();
  const safe = String(uid).replace(/[:]/g, '_');
  const bgId = `mfr_bg_${safe}`;
  const first = Array.isArray(pairs) && pairs.length ? pairs[0] : { word: 'Cat', emoji: '🐱' };
  const word = String(first.word || 'Cat');
  const emoji = String(first.emoji || '🐱');

  return (
    <svg className="round-visual" viewBox="0 0 320 140" role="img" aria-label="Memory flip visual">
      <defs>
        <linearGradient id={bgId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgba(240,249,255,0.98)" />
          <stop offset="1" stopColor="rgba(240,253,250,0.9)" />
        </linearGradient>
      </defs>
      <rect x="8" y="8" width="304" height="124" rx="18" fill={`url(#${bgId})`} />

      <g className="floaty a" transform="translate(72,34)">
        <rect x="0" y="0" width="96" height="76" rx="16" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.65)" />
        <text x="48" y="44" textAnchor="middle" fontSize="18" fontWeight="900" fill="#0f172a">
          {word.toUpperCase()}
        </text>
      </g>

      <g className="floaty b" transform="translate(172,34)">
        <rect x="0" y="0" width="96" height="76" rx="16" fill="rgba(255,255,255,0.92)" stroke="rgba(148,163,184,0.65)" />
        <text x="48" y="50" textAnchor="middle" fontSize="34">
          {emoji}
        </text>
      </g>

      <g opacity="0.55" className="sparkle">
        <circle cx="42" cy="102" r="4" fill="rgba(59,130,246,0.7)" />
        <circle cx="282" cy="106" r="3" fill="rgba(34,197,94,0.7)" />
        <circle cx="266" cy="30" r="3" fill="rgba(245,158,11,0.7)" />
      </g>
    </svg>
  );
};

const MemoryCardFlipGame = ({ uiText, buttonClassName = 'btn-settings' }) => {
  const ROUNDS = useMemo(
    () => [
      {
        title: '2 pairs',
        pairs: [
          { id: 'cat', word: 'Cat', emoji: '🐱' },
          { id: 'dog', word: 'Dog', emoji: '🐶' },
        ],
      },
      {
        title: '3 pairs',
        pairs: [
          { id: 'cat', word: 'Cat', emoji: '🐱' },
          { id: 'dog', word: 'Dog', emoji: '🐶' },
          { id: 'apple', word: 'Apple', emoji: '🍎' },
        ],
      },
      {
        title: '4 pairs',
        pairs: [
          { id: 'cat', word: 'Cat', emoji: '🐱' },
          { id: 'dog', word: 'Dog', emoji: '🐶' },
          { id: 'apple', word: 'Apple', emoji: '🍎' },
          { id: 'car', word: 'Car', emoji: '🚗' },
        ],
      },
    ],
    []
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const round = ROUNDS[roundIndex % ROUNDS.length];

  const buildDeck = useCallback((pairs) => {
    const cards = pairs.flatMap((p) => [
      { key: `${p.id}-word`, pairId: p.id, faceType: 'word', label: p.word },
      { key: `${p.id}-pic`, pairId: p.id, faceType: 'pic', label: p.emoji },
    ]);
    return shuffleArray(cards);
  }, []);

  const [deck, setDeck] = useState(() => buildDeck(round.pairs));
  const [flipped, setFlipped] = useState([]); // indices
  const [matched, setMatched] = useState(() => new Set());
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [feedback, setFeedback] = useState('');

  const gridCols = Math.max(2, Math.min(6, deck.length / 2));

  useEffect(() => {
    setDeck(buildDeck(round.pairs));
    setFlipped([]);
    setMatched(new Set());
    setLock(false);
    setMoves(0);
    setFeedback('');
  }, [buildDeck, round.pairs]);

  const isDone = matched.size === round.pairs.length;

  const flip = (idx) => {
    if (lock) return;
    if (matched.has(deck[idx]?.pairId)) return;
    if (flipped.includes(idx)) return;
    if (flipped.length >= 2) return;

    const next = [...flipped, idx];
    setFlipped(next);
    if (next.length === 2) {
      setMoves((m) => m + 1);
      const [a, b] = next;
      const ca = deck[a];
      const cb = deck[b];
      const samePair = ca?.pairId && ca.pairId === cb?.pairId;
      const differentType = ca?.faceType !== cb?.faceType;

      if (samePair && differentType) {
        setMatched((prev) => {
          const copy = new Set(prev);
          copy.add(ca.pairId);
          return copy;
        });
        setFeedback('Correct match!');
        window.setTimeout(() => setFlipped([]), 350);
        return;
      }

      setLock(true);
      setFeedback('Not a match. Try again.');
      window.setTimeout(() => {
        setFlipped([]);
        setLock(false);
      }, 850);
    }
  };

  const resetRound = () => {
    setDeck(buildDeck(round.pairs));
    setFlipped([]);
    setMatched(new Set());
    setLock(false);
    setMoves(0);
    setFeedback('');
  };

  const nextRound = () => {
    setRoundIndex((r) => r + 1);
  };

  return (
    <div>
      <div className="round-visual-wrap" aria-hidden="false">
        <MemoryFlipRoundVisual pairs={round.pairs} />
      </div>

      <p className="game-instructions">{uiText('Flip two cards. Match the word with the picture.')}</p>

      <div className="game-row" style={{ justifyContent: 'space-between' }}>
        <span style={{ color: '#475569', fontWeight: 700 }}>
          {uiText('Round')}: {uiText(round.title)}
        </span>
        <span style={{ color: '#475569' }}>
          {uiText('Moves')}: <strong>{moves}</strong>
        </span>
      </div>

      <div
        className="memory-grid"
        role="grid"
        aria-label={uiText('Memory grid')}
        style={{ '--memory-cols': gridCols }}
      >
        {deck.map((card, idx) => {
          const isFlipped = flipped.includes(idx) || matched.has(card.pairId);
          const isMatched = matched.has(card.pairId);

          return (
            <button
              key={card.key}
              type="button"
              role="gridcell"
              className={`memory-card ${isFlipped ? 'is-flipped' : ''} ${isMatched ? 'is-matched' : ''}`}
              onClick={() => flip(idx)}
              disabled={lock || isMatched}
              aria-label={
                isFlipped
                  ? uiText(`Card showing ${card.faceType === 'word' ? card.label : 'picture'}`)
                  : uiText('Face down card')
              }
            >
              <span className="memory-card-inner" aria-hidden="true">
                <span className="memory-card-face memory-card-front">
                  <span className="memory-front-mark">?</span>
                </span>
                <span className="memory-card-face memory-card-back">
                  <span className={`memory-card-label ${card.faceType}`}>{card.label}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="game-row">
        <button type="button" className={buttonClassName} onClick={resetRound}>
          {uiText('Shuffle')}
        </button>
        <button type="button" className={buttonClassName} onClick={nextRound} disabled={!isDone}>
          {uiText('Next round')}
        </button>
      </div>

      {feedback ? <div className={`game-feedback ${feedback.includes('Correct') ? 'good' : feedback.includes('Not a match') ? 'bad' : ''}`}>{uiText(feedback)}</div> : null}
      {isDone ? <div className="game-feedback good">{uiText('Great! You matched them all.')}</div> : null}
    </div>
  );
};

// eslint-disable-next-line no-unused-vars
const QuickTapWordGame = ({ uiText, buttonClassName = 'btn-settings' }) => {
  const ROUNDS = useMemo(
    () => [
      {
        target: 'Blue',
        grid: [
          ['Red', 'Dog', 'Blue'],
          ['Tree', 'Cat', 'Green'],
        ],
      },
      {
        target: 'Cat',
        grid: [
          ['Car', 'Cat', 'Sun'],
          ['Book', 'Ball', 'Dog'],
        ],
      },
      {
        target: 'Green',
        grid: [
          ['Blue', 'Green', 'Yellow'],
          ['Purple', 'Red', 'Orange'],
        ],
      },
      {
        target: 'Dog',
        grid: [
          ['Tree', 'Dog', 'Apple'],
          ['Car', 'Ball', 'Cat'],
        ],
      },
    ],
    []
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(12);
  const [timeTotal, setTimeTotal] = useState(12);
  const [timedOut, setTimedOut] = useState(false);
  const current = ROUNDS[roundIndex % ROUNDS.length];

  const startTimer = useCallback(() => {
    const seconds = 10 + Math.floor(Math.random() * 6); // 10–15
    setTimeTotal(seconds);
    setTimeLeft(seconds);
    setTimedOut(false);
  }, []);

  useEffect(() => {
    startTimer();
  }, [roundIndex, startTimer]);

  useEffect(() => {
    if (isCorrect || timedOut) return;
    if (timeLeft <= 0) {
      setTimedOut(true);
      setFeedback("Time's up — try again.");
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [isCorrect, timedOut, timeLeft]);

  const tap = (word) => {
    if (isCorrect || timedOut) return;
    if (String(word).toLowerCase() === String(current.target).toLowerCase()) {
      setFeedback('Correct! Nice work.');
      setIsCorrect(true);
      return;
    }
    setFeedback('Not quite. Try again.');
    setIsCorrect(false);
  };

  const retry = () => {
    setFeedback('');
    setIsCorrect(false);
    startTimer();
  };

  const next = () => {
    setRoundIndex((prev) => prev + 1);
    setFeedback('');
    setIsCorrect(false);
  };

  const pct = timeTotal > 0 ? Math.max(0, Math.min(100, (timeLeft / timeTotal) * 100)) : 0;

  return (
    <div>
      <div className="round-visual-wrap" aria-hidden="false">
        <QuickTapRoundVisual target={current.target} />
      </div>

      <div className="game-row" style={{ justifyContent: 'space-between' }}>
        <p className="game-instructions" style={{ margin: 0 }}>
          {uiText(`Tap the word "${current.target}"`)}
        </p>
        <div className={`timer-display ${timeLeft <= 4 ? 'low-time' : ''}`} aria-label={uiText('Timer')}>
          <span>{uiText('Time')}:</span>
          <strong>{timeLeft}s</strong>
        </div>
      </div>

      <div className="adhd-timer-bar" aria-hidden="true">
        <div className="adhd-timer-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="adhd-grid" role="grid" aria-label={uiText('Tap grid')}>
        {current.grid.flat().map((w) => (
          <button
            key={w}
            type="button"
            className="adhd-grid-cell"
            onClick={() => tap(w)}
            disabled={isCorrect || timedOut}
            aria-label={uiText(`Word ${w}`)}
          >
            {w}
          </button>
        ))}
      </div>

      <div className="game-row">
        {timedOut ? (
          <button type="button" className={buttonClassName} onClick={retry}>
            {uiText('Try again')}
          </button>
        ) : null}
        <button type="button" className={buttonClassName} onClick={next} disabled={!isCorrect}>
          {uiText('Next round')}
        </button>
      </div>

      {feedback ? <div className={`game-feedback ${isCorrect ? 'good' : feedback.includes('Not quite') ? 'bad' : ''}`}>{uiText(feedback)}</div> : null}
    </div>
  );
};

const SpeedMatchGame = ({ uiText, buttonClassName = 'btn-settings' }) => {
  const ROUNDS = useMemo(
    () => [
      { word: 'Apple', kind: 'apple', options: ['apple', 'car', 'dog'], correct: 'apple' },
      { word: 'Car', kind: 'car', options: ['dog', 'car', 'apple'], correct: 'car' },
      { word: 'Dog', kind: 'dog', options: ['car', 'dog', 'apple'], correct: 'dog' },
    ],
    []
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [picked, setPicked] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const [timeLeft, setTimeLeft] = useState(12);
  const [timeTotal, setTimeTotal] = useState(12);
  const [timedOut, setTimedOut] = useState(false);

  const current = ROUNDS[roundIndex % ROUNDS.length];
  const choices = useMemo(() => shuffleArray(current.options), [current.options]);

  const startTimer = useCallback(() => {
    const seconds = 10 + Math.floor(Math.random() * 6); // 10–15
    setTimeTotal(seconds);
    setTimeLeft(seconds);
    setTimedOut(false);
  }, []);

  useEffect(() => {
    startTimer();
  }, [roundIndex, startTimer]);

  useEffect(() => {
    if (isCorrect || timedOut) return;
    if (timeLeft <= 0) {
      setTimedOut(true);
      setFeedback("Time's up — try again.");
      return;
    }
    const id = window.setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => window.clearTimeout(id);
  }, [isCorrect, timedOut, timeLeft]);

  const pick = (opt) => {
    if (isCorrect || timedOut) return;
    setPicked(opt);
    setFeedback('');
  };

  const check = () => {
    if (timedOut) return;
    if (!picked) {
      setFeedback('Pick an option first.');
      setIsCorrect(false);
      return;
    }
    if (picked === current.correct) {
      setFeedback('Correct!');
      setIsCorrect(true);
      return;
    }
    setFeedback('Not quite. Try again.');
    setIsCorrect(false);
  };

  const retry = () => {
    setPicked('');
    setFeedback('');
    setIsCorrect(false);
    startTimer();
  };

  const next = () => {
    setRoundIndex((prev) => prev + 1);
    setPicked('');
    setFeedback('');
    setIsCorrect(false);
  };

  const pct = timeTotal > 0 ? Math.max(0, Math.min(100, (timeLeft / timeTotal) * 100)) : 0;

  return (
    <div>
      <div className="round-visual-wrap" aria-hidden="false">
        <SpeedMatchRoundVisual kind={current.kind} />
      </div>

      <div className="game-row" style={{ justifyContent: 'space-between' }}>
        <p className="game-instructions" style={{ margin: 0 }}>
          {uiText('Match the word to the picture before the timer ends.')}
        </p>
        <div className={`timer-display ${timeLeft <= 4 ? 'low-time' : ''}`} aria-label={uiText('Timer')}>
          <span>{uiText('Time')}:</span>
          <strong>{timeLeft}s</strong>
        </div>
      </div>

      <div className="adhd-timer-bar" aria-hidden="true">
        <div className="adhd-timer-bar-fill" style={{ width: `${pct}%` }} />
      </div>

      <div className="adhd-word-prompt" aria-label={uiText('Word prompt')}>
        {uiText('Word:')} <strong>{current.word}</strong>
      </div>

      <div className="choice-list" role="group" aria-label={uiText('Picture options')}>
        {choices.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`choice picture-choice ${picked === opt ? 'picked' : ''}`}
            aria-pressed={picked === opt ? 'true' : 'false'}
            onClick={() => pick(opt)}
            disabled={isCorrect || timedOut}
          >
            <span className="picture-emoji" aria-hidden="true">
              {opt === 'apple' ? '🍎' : opt === 'car' ? '🚗' : '🐶'}
            </span>
            <span style={{ color: '#64748b', fontWeight: 700 }}>{picked === opt ? uiText('Selected') : ''}</span>
          </button>
        ))}
      </div>

      <div className="game-row">
        {timedOut ? (
          <button type="button" className={buttonClassName} onClick={retry}>
            {uiText('Try again')}
          </button>
        ) : (
          <button type="button" className={buttonClassName} onClick={check} disabled={isCorrect}>
            {uiText('Check')}
          </button>
        )}
        <button type="button" className={buttonClassName} onClick={next} disabled={!isCorrect}>
          {uiText('Next round')}
        </button>
      </div>

      {feedback ? (
        <div className={`game-feedback ${isCorrect ? 'good' : feedback.includes('Not quite') || feedback.includes("Time's up") ? 'bad' : ''}`}>{uiText(feedback)}</div>
      ) : null}
    </div>
  );
};

const PatternRecallGame = ({ uiText, buttonClassName = 'btn-settings' }) => {
  const ROUNDS = useMemo(
    () => [
      { seq: ['red', 'blue', 'green', 'red', 'blue'], answer: 'green' },
      { seq: ['blue', 'green', 'blue', 'green', 'blue'], answer: 'green' },
      { seq: ['green', 'red', 'green', 'red', 'green'], answer: 'red' },
    ],
    []
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [picked, setPicked] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);
  const current = ROUNDS[roundIndex % ROUNDS.length];

  const options = useMemo(() => shuffleArray(['red', 'blue', 'green']), []);
  const toEmoji = (c) => (c === 'red' ? '🔴' : c === 'blue' ? '🔵' : '🟢');

  const choose = (opt) => {
    if (isCorrect) return;
    setPicked(opt);
    if (opt === current.answer) {
      setFeedback('Correct!');
      setIsCorrect(true);
      return;
    }
    setFeedback('Not quite. Try again.');
    setIsCorrect(false);
  };

  const next = () => {
    setRoundIndex((prev) => prev + 1);
    setPicked('');
    setFeedback('');
    setIsCorrect(false);
  };

  return (
    <div>
      <div className="round-visual-wrap" aria-hidden="false">
        <PatternRoundVisual colors={current.seq} />
      </div>

      <p className="game-instructions">{uiText('Look at the pattern and choose what comes next.')}</p>

      <div className="pattern-seq" role="group" aria-label={uiText('Pattern')}>
        {current.seq.map((c, i) => (
          <span key={`${c}-${i}`} className="pattern-dot" aria-hidden="true">
            {toEmoji(c)}
          </span>
        ))}
        <span className="pattern-missing" aria-hidden="true">
          ?
        </span>
      </div>

      <div className="choice-list" role="group" aria-label={uiText('Options')}>
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            className={`choice pattern-choice ${picked === opt ? 'picked' : ''}`}
            aria-pressed={picked === opt ? 'true' : 'false'}
            onClick={() => choose(opt)}
            disabled={isCorrect}
          >
            <span className="picture-emoji" aria-hidden="true">
              {toEmoji(opt)}
            </span>
            <span style={{ color: '#64748b', fontWeight: 700 }}>{picked === opt ? uiText('Selected') : ''}</span>
          </button>
        ))}
      </div>

      <div className="game-row">
        <button type="button" className={buttonClassName} onClick={next} disabled={!isCorrect}>
          {uiText('Next pattern')}
        </button>
      </div>

      {feedback ? <div className={`game-feedback ${isCorrect ? 'good' : feedback.includes('Not quite') ? 'bad' : ''}`}>{uiText(feedback)}</div> : null}
    </div>
  );
};

const MoodMatchGame = ({ uiText, buttonClassName = 'btn-settings' }) => {
  const EMOTIONS = useMemo(
    () => [
      { id: 'happy', word: 'Happy', face: '🙂', accent: '#166534' },
      { id: 'sad', word: 'Sad', face: '😢', accent: '#1e40af' },
      { id: 'angry', word: 'Angry', face: '😡', accent: '#991b1b' },
      { id: 'surprised', word: 'Surprised', face: '😮', accent: '#7c3aed' },
      { id: 'tired', word: 'Tired', face: '😴', accent: '#0f172a' },
      { id: 'excited', word: 'Excited', face: '🤩', accent: '#a16207' },
    ],
    []
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [picked, setPicked] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const current = EMOTIONS[roundIndex % EMOTIONS.length];
  const options = useMemo(() => {
    const distractors = shuffleArray(EMOTIONS.filter((e) => e.id !== current.id)).slice(0, 2);
    return shuffleArray([current, ...distractors]);
  }, [EMOTIONS, current]);

  const choose = (optId) => {
    if (isCorrect) return;
    setPicked(optId);
    if (optId === current.id) {
      setIsCorrect(true);
      setFeedback('Correct!');
      return;
    }
    setIsCorrect(false);
    setFeedback('Try again. Keep going!');
  };

  const next = () => {
    setRoundIndex((prev) => prev + 1);
    setPicked('');
    setFeedback('');
    setIsCorrect(false);
  };

  return (
    <div className="autism-game mood-match">
      <p className="game-instructions">{uiText('Match the emotion word with the correct face.')}</p>

      <div className="emotion-prompt" role="group" aria-label={uiText('Emotion word')}>
        <div className="emotion-word" style={{ color: current.accent }}>{uiText(current.word)}</div>
      </div>

      <div className="choice-list emotion-options" role="group" aria-label={uiText('Options')}>
        {options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            className={`choice emotion-choice ${picked === opt.id ? 'picked' : ''}`}
            aria-pressed={picked === opt.id ? 'true' : 'false'}
            title={uiText(opt.word)}
            onClick={() => choose(opt.id)}
            disabled={isCorrect}
          >
            <span className="picture-emoji" aria-hidden="true">{opt.face}</span>
            <span className="sr-only">{uiText(opt.word)}</span>
          </button>
        ))}
      </div>

      <div className="game-row">
        <button type="button" className={buttonClassName} onClick={next} disabled={!isCorrect}>
          {uiText('Next emotion')}
        </button>
      </div>

      {feedback ? <div className={`game-feedback ${isCorrect ? 'good' : 'bad'}`}>{uiText(feedback)}</div> : null}
    </div>
  );
};

const StoryStepsGame = ({ uiText, buttonClassName = 'btn-settings' }) => {
  const ROUNDS = useMemo(
    () => [
      {
        id: 'morning',
        title: 'Morning routine',
        steps: [
          { id: 'wake', text: 'Wake up', emoji: '🛏️' },
          { id: 'brush', text: 'Brush teeth', emoji: '🪥' },
          { id: 'school', text: 'Go to school', emoji: '🏫' },
        ],
      },
      {
        id: 'meal',
        title: 'Snack time',
        steps: [
          { id: 'wash', text: 'Wash hands', emoji: '🧼' },
          { id: 'eat', text: 'Eat snack', emoji: '🍎' },
          { id: 'clean', text: 'Clean up', emoji: '🧹' },
        ],
      },
      {
        id: 'bedtime',
        title: 'Bedtime routine',
        steps: [
          { id: 'pjs', text: 'Wear pajamas', emoji: '🧸' },
          { id: 'story', text: 'Read a story', emoji: '📖' },
          { id: 'sleep', text: 'Sleep', emoji: '😴' },
        ],
      },
    ],
    []
  );

  const [roundIndex, setRoundIndex] = useState(0);
  const [order, setOrder] = useState(() => shuffleArray(ROUNDS[0].steps));
  const [dragIndex, setDragIndex] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const current = ROUNDS[roundIndex % ROUNDS.length];

  useEffect(() => {
    setOrder(shuffleArray(current.steps));
    setDragIndex(null);
    setFeedback('');
    setIsCorrect(false);
  }, [current, roundIndex]);

  const move = (from, to) => {
    setOrder((prev) => {
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const check = () => {
    const ok = order.map((s) => s.id).join('|') === current.steps.map((s) => s.id).join('|');
    setIsCorrect(ok);
    setFeedback(ok ? 'Correct! Great job.' : 'Not quite. Try again. Keep going!');
  };

  const reset = () => {
    setOrder(shuffleArray(current.steps));
    setDragIndex(null);
    setFeedback('');
    setIsCorrect(false);
  };

  const nextRound = () => {
    setRoundIndex((prev) => prev + 1);
  };

  return (
    <div className="autism-game story-steps">
      <p className="game-instructions">{uiText('Arrange the pictures in the correct order.')}</p>

      <div className="sequence-list" role="list" aria-label={uiText('Sequence list')}>
        {order.map((step, idx) => (
          <div
            key={step.id}
            className={`sequence-item ${isCorrect ? 'locked' : ''}`}
            role="listitem"
            draggable={!isCorrect}
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={() => {
              if (isCorrect) return;
              if (dragIndex === null || dragIndex === idx) return;
              move(dragIndex, idx);
              setDragIndex(null);
            }}
            aria-label={uiText(`Step ${idx + 1}: ${step.text}`)}
          >
            <div className="sequence-left">
              <div className="sequence-index" aria-hidden="true">{idx + 1}</div>
              <div className="sequence-emoji" aria-hidden="true">{step.emoji}</div>
              <div className="sequence-text">{uiText(step.text)}</div>
            </div>
            <div className="sequence-actions" aria-label={uiText('Reorder controls')}>
              <button
                type="button"
                className="btn-settings sequence-move"
                onClick={() => move(idx, Math.max(0, idx - 1))}
                disabled={isCorrect || idx === 0}
              >
                {uiText('Up')}
              </button>
              <button
                type="button"
                className="btn-settings sequence-move"
                onClick={() => move(idx, Math.min(order.length - 1, idx + 1))}
                disabled={isCorrect || idx === order.length - 1}
              >
                {uiText('Down')}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="game-row">
        <button type="button" className={buttonClassName} onClick={check} disabled={isCorrect}>
          {uiText('Check order')}
        </button>
        <button type="button" className={buttonClassName} onClick={reset} disabled={isCorrect}>
          {uiText('Shuffle')}
        </button>
        <button type="button" className={buttonClassName} onClick={nextRound} disabled={!isCorrect}>
          {uiText('Next story')}
        </button>
      </div>

      {feedback ? <div className={`game-feedback ${isCorrect ? 'good' : 'bad'}`}>{uiText(feedback)}</div> : null}
    </div>
  );
};

const SortItOutGame = ({ uiText, buttonClassName = 'btn-settings' }) => {
  const CATEGORY_BANK = useMemo(
    () => [
      {
        id: 'animals',
        title: 'Animals',
        emoji: '🐾',
        items: [
          { id: 'dog', label: 'Dog', emoji: '🐶' },
          { id: 'cat', label: 'Cat', emoji: '🐱' },
          { id: 'rabbit', label: 'Rabbit', emoji: '🐰' },
          { id: 'cow', label: 'Cow', emoji: '🐮' },
        ],
      },
      {
        id: 'fruits',
        title: 'Fruits',
        emoji: '🍎',
        items: [
          { id: 'apple', label: 'Apple', emoji: '🍎' },
          { id: 'banana', label: 'Banana', emoji: '🍌' },
          { id: 'grapes', label: 'Grapes', emoji: '🍇' },
          { id: 'strawberry', label: 'Strawberry', emoji: '🍓' },
        ],
      },
      {
        id: 'vehicles',
        title: 'Vehicles',
        emoji: '🚗',
        items: [
          { id: 'car', label: 'Car', emoji: '🚗' },
          { id: 'bus', label: 'Bus', emoji: '🚌' },
          { id: 'train', label: 'Train', emoji: '🚂' },
          { id: 'bike', label: 'Bike', emoji: '🚲' },
        ],
      },
      {
        id: 'clothes',
        title: 'Clothes',
        emoji: '👕',
        items: [
          { id: 'shirt', label: 'Shirt', emoji: '👕' },
          { id: 'shoe', label: 'Shoe', emoji: '👟' },
          { id: 'cap', label: 'Cap', emoji: '🧢' },
          { id: 'coat', label: 'Coat', emoji: '🧥' },
        ],
      },
    ],
    []
  );

  const [level, setLevel] = useState(2);
  const [roundIndex, setRoundIndex] = useState(0);
  const [selectedItemId, setSelectedItemId] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isCorrect, setIsCorrect] = useState(false);

  const round = useMemo(() => {
    const count = level === 1 ? 2 : level === 2 ? 3 : 4;
    const categories = CATEGORY_BANK.slice(0, count);
    const objects = shuffleArray(
      categories.flatMap((cat) => shuffleArray(cat.items).slice(0, 2).map((it) => ({ ...it, categoryId: cat.id })))
    ).map((it) => ({ ...it, id: `${it.categoryId}:${it.id}:${roundIndex}` }));
    return { categories, objects };
  }, [CATEGORY_BANK, level, roundIndex]);

  const [placements, setPlacements] = useState({});

  useEffect(() => {
    setPlacements({});
    setSelectedItemId('');
    setFeedback('');
    setIsCorrect(false);
  }, [level, roundIndex]);

  const place = (itemId, categoryId) => {
    if (isCorrect) return;
    setPlacements((prev) => ({ ...prev, [itemId]: categoryId }));
  };

  const remove = (itemId) => {
    if (isCorrect) return;
    setPlacements((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  };

  const poolItems = round.objects.filter((o) => !placements[o.id]);
  const placedFor = (categoryId) => round.objects.filter((o) => placements[o.id] === categoryId);

  const allPlaced = round.objects.length > 0 && round.objects.every((o) => placements[o.id]);

  const check = () => {
    if (!allPlaced) {
      setFeedback('Place all objects first. Keep going!');
      setIsCorrect(false);
      return;
    }

    const ok = round.objects.every((o) => placements[o.id] === o.categoryId);
    setIsCorrect(ok);
    setFeedback(ok ? 'Correct! Nicely sorted.' : 'Some are in the wrong place. Try again.');
  };

  const reset = () => {
    setPlacements({});
    setSelectedItemId('');
    setFeedback('');
    setIsCorrect(false);
  };

  const next = () => {
    setRoundIndex((prev) => prev + 1);
  };

  return (
    <div className="autism-game sort-it-out">
      <p className="game-instructions">{uiText('Drag each object into the correct category.')}</p>

      <div className="sort-levels" role="group" aria-label={uiText('Difficulty level')}>
        {[1, 2, 3].map((lv) => (
          <button
            key={lv}
            type="button"
            className={`btn-settings sort-level-btn ${level === lv ? 'active' : ''}`}
            onClick={() => setLevel(lv)}
            disabled={isCorrect}
          >
            {uiText(`Level ${lv}`)}
          </button>
        ))}
      </div>

      <div className="sort-layout">
        <div className="sort-bins" role="group" aria-label={uiText('Categories')}>
          {round.categories.map((cat) => (
            <div
              key={cat.id}
              className="sort-bin"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData('text/plain');
                if (id) place(id, cat.id);
              }}
            >
              <div className="sort-bin-header">
                <span className="sort-bin-title">{cat.emoji} {uiText(cat.title)}</span>
                <button
                  type="button"
                  className="btn-settings sort-bin-drop"
                  onClick={() => {
                    if (!selectedItemId) return;
                    place(selectedItemId, cat.id);
                    setSelectedItemId('');
                  }}
                  disabled={!selectedItemId || isCorrect}
                >
                  {uiText('Place here')}
                </button>
              </div>
              <div className="sort-bin-items" aria-label={uiText('Placed items')}>
                {placedFor(cat.id).map((obj) => (
                  <button
                    key={obj.id}
                    type="button"
                    className="sort-item placed"
                    onClick={() => remove(obj.id)}
                    disabled={isCorrect}
                    aria-label={uiText(`Remove ${obj.label}`)}
                    title={uiText('Click to remove')}
                  >
                    <span className="sort-item-emoji" aria-hidden="true">{obj.emoji}</span>
                    <span className="sort-item-label">{uiText(obj.label)}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="sort-pool" aria-label={uiText('Objects')}>
          <div className="sort-pool-title">{uiText('Objects')}</div>
          <div className="sort-pool-items">
            {poolItems.map((obj) => (
              <button
                key={obj.id}
                type="button"
                className={`sort-item ${selectedItemId === obj.id ? 'selected' : ''}`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', obj.id);
                }}
                onClick={() => setSelectedItemId((prev) => (prev === obj.id ? '' : obj.id))}
                disabled={isCorrect}
                aria-label={uiText(`${obj.label}. Drag to a category.`)}
              >
                <span className="sort-item-emoji" aria-hidden="true">{obj.emoji}</span>
                <span className="sort-item-label">{uiText(obj.label)}</span>
              </button>
            ))}
          </div>
          <div className="sort-pool-help">{uiText('Tip: You can also tap an object, then press “Place here” on a category.')}</div>
        </div>
      </div>

      <div className="game-row">
        <button type="button" className={buttonClassName} onClick={check} disabled={isCorrect}>
          {uiText('Check sorting')}
        </button>
        <button type="button" className={buttonClassName} onClick={reset} disabled={isCorrect}>
          {uiText('Reset')}
        </button>
        <button type="button" className={buttonClassName} onClick={next} disabled={!isCorrect}>
          {uiText('Next round')}
        </button>
      </div>

      {feedback ? <div className={`game-feedback ${isCorrect ? 'good' : 'bad'}`}>{uiText(feedback)}</div> : null}
    </div>
  );
};

const GamesPage = () => {
  const { user, logout } = useAuth();
  const { preferences, updateAccessibilitySettings } = usePreferences();
  const { t, lang } = useI18n();
  const navigate = useNavigate();

  const simplifiedLayoutEnabled = Boolean(preferences?.simplifiedLayout);
  const simplifiedLayoutEnabledRef = useRef(simplifiedLayoutEnabled);
  useEffect(() => {
    simplifiedLayoutEnabledRef.current = simplifiedLayoutEnabled;
  }, [simplifiedLayoutEnabled]);

  const condition = user?.learningCondition || '';
  const isDyslexia = condition === 'dyslexia';
  const isAdhd = condition === 'adhd';
  const isAutism = condition === 'autism';
  const [syllableMode] = useDyslexiaSyllableMode(true);

  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [modalGameId, setModalGameId] = useState(null);
  const modalCloseButtonRef = useRef(null);
  const lastActiveElementRef = useRef(null);

  const uiText = useCallback(
    (normal, syllableVariant) => {
      const raw = normal === undefined || normal === null ? '' : String(normal);

      // Dynamic patterns (avoid creating thousands of literal keys)
      const levelMatch = raw.match(/^Level\s+(\d+)$/);
      if (levelMatch) {
        const rendered = t('learning.games.autism.sortItOut.level', { level: levelMatch[1] });
        if (isDyslexia && lang === 'english' && syllableMode && syllableVariant) return syllableVariant;
        return rendered;
      }

      const removeMatch = raw.match(/^Remove\s+(.+)$/);
      if (removeMatch) {
        const rendered = t('learning.games.common.remove', { item: removeMatch[1] });
        if (isDyslexia && lang === 'english' && syllableMode && syllableVariant) return syllableVariant;
        return rendered;
      }

      const dragMatch = raw.match(/^(.+)\. Drag to a category\.$/);
      if (dragMatch) {
        const rendered = t('learning.games.autism.sortItOut.dragToCategory', { item: dragMatch[1] });
        if (isDyslexia && lang === 'english' && syllableMode && syllableVariant) return syllableVariant;
        return rendered;
      }

      const cardShowingMatch = raw.match(/^Card showing\s+(.+)$/);
      if (cardShowingMatch) {
        const contentRaw = cardShowingMatch[1];
        const content = contentRaw === 'picture' ? t('learning.games.common.picture') : contentRaw;
        const rendered = t('learning.games.adhd.flipFind.cardShowing', { content });
        if (isDyslexia && lang === 'english' && syllableMode && syllableVariant) return syllableVariant;
        return rendered;
      }

      const key = GAME_TEXT_KEYS[raw];
      const translated = key ? t(key) : raw;
      const rendered = translated === key ? raw : translated;

      // Dyslexia syllable mode is only for English.
      if (isDyslexia && lang === 'english' && syllableMode && syllableVariant) return syllableVariant;
      return rendered;
    },
    [isDyslexia, lang, syllableMode, t]
  );

  const actionButtonClassName = isAdhd ? 'btn-minimal' : 'btn-settings';
  const logoutButtonClassName = isAutism ? 'btn-exit' : 'btn-logout';

  const games = useMemo(
    () => {
      if (isDyslexia) {
        return [
          {
            id: 'word-builder',
            title: uiText('Word Jumble', 'Word Jum-ble'),
            description: uiText('Arrange letters to spell a word.', 'Ar-range let-ters to spell a word.'),
            visual: <WordBuilderVisual compact label={uiText('Word Builder visual')} />,
            render: () => <WordBuilderGame uiText={(x) => uiText(x, x)} />,
          },
          {
            id: 'sound-match',
            title: uiText('Hear & Spell', 'Hear & Spell'),
            description: uiText('Listen, then choose the correct spelling.', 'Lis-ten, then choose the cor-rect spell-ing.'),
            visual: <SoundMatchVisual compact label={uiText('Sound match visual')} />,
            render: () => (
              <SoundToWordMatchGame
                uiText={(x) => uiText(x, x)}
                preferredLanguage={preferences?.preferredLanguage || preferences?.uiLanguage || 'english'}
              />
            ),
          },
          {
            id: 'letter-finder',
            title: uiText('Letter Hunt', 'Let-ter Hunt'),
            description: uiText('Find b/d/p/q in a grid.', 'Find b/d/p/q in a grid.'),
            visual: <LetterFinderVisual compact label={uiText('Letter finder visual')} />,
            render: () => <LetterConfusionFinderGame uiText={(x) => uiText(x, x)} />,
          },
        ];
      }

      if (isAdhd) {
        return [
          {
            id: 'memory-flip',
            title: uiText('Flip & Find'),
            description: uiText('Match word cards with picture cards.'),
            visual: <MemoryFlipRoundVisual pairs={[{ id: 'cat', word: 'Cat', emoji: '🐱' }, { id: 'dog', word: 'Dog', emoji: '🐶' }]} />,
            render: () => <MemoryCardFlipGame uiText={(x) => uiText(x, x)} buttonClassName={actionButtonClassName} />,
          },
          {
            id: 'speed-match',
            title: uiText('Flash Match'),
            description: uiText('Match the word to the picture before time runs out.'),
            visual: <SpeedMatchRoundVisual kind="apple" />,
            render: () => <SpeedMatchGame uiText={(x) => uiText(x, x)} buttonClassName={actionButtonClassName} />,
          },
          {
            id: 'pattern-recall',
            title: uiText('Pattern Pop'),
            description: uiText('Choose what comes next in the pattern.'),
            visual: <PatternRoundVisual colors={['red', 'blue', 'green', 'red', 'blue']} />,
            render: () => <PatternRecallGame uiText={(x) => uiText(x, x)} buttonClassName={actionButtonClassName} />,
          },
        ];
      }

      if (isAutism) {
        return [
          {
            id: 'mood-match',
            title: uiText('Mood Match'),
            description: uiText('Match the emotion word to the correct face.'),
            visual: <AutismMoodMatchVisual compact label={uiText('Mood match visual')} />,
            render: () => <MoodMatchGame uiText={(x) => uiText(x, x)} buttonClassName={actionButtonClassName} />,
          },
          {
            id: 'story-steps',
            title: uiText('Story Steps'),
            description: uiText('Arrange pictures to build a clear routine.'),
            visual: <AutismStoryStepsVisual compact label={uiText('Story steps visual')} />,
            render: () => <StoryStepsGame uiText={(x) => uiText(x, x)} buttonClassName={actionButtonClassName} />,
          },
          {
            id: 'sort-it-out',
            title: uiText('Sort It Out'),
            description: uiText('Drag objects into the right category.'),
            visual: <AutismSortItOutVisual compact label={uiText('Sort it out visual')} />,
            render: () => <SortItOutGame uiText={(x) => uiText(x, x)} buttonClassName={actionButtonClassName} />,
          },
        ];
      }

      return [];
    },
    [actionButtonClassName, isAdhd, isAutism, isDyslexia, preferences?.preferredLanguage, preferences?.uiLanguage, uiText]
  );

  const modalGame = games.find((g) => g.id === modalGameId) || null;

  useEffect(() => {
    // Ensure the container exists for preference scoping.
    // PreferencesProvider will apply preference classes automatically.
    const container = document.getElementById('learning-container');
    if (!container) return;
    container.dataset.userCondition = condition;
  }, [condition]);

  useEffect(() => {
    // Simple Mode applies a `simplified-layout` class globally to the learning container.
    // For GamesPage, we intentionally keep the layout consistent across all conditions.
    const container = document.getElementById('learning-container');
    if (!container) return;

    const ensureRemoved = () => {
      if (container.classList.contains('simplified-layout')) {
        container.classList.remove('simplified-layout');
      }
    };

    ensureRemoved();

    const observer = new MutationObserver(() => {
      ensureRemoved();
    });

    observer.observe(container, { attributes: true, attributeFilter: ['class'] });

    return () => {
      observer.disconnect();
      if (simplifiedLayoutEnabledRef.current) {
        container.classList.add('simplified-layout');
      }
    };
  }, []);

  const showGames = isDyslexia || isAdhd || isAutism;

  const closeModal = useCallback(() => {
    setModalGameId(null);
    const el = lastActiveElementRef.current;
    if (el && typeof el.focus === 'function') {
      try {
        el.focus();
      } catch {
        // ignore
      }
    }
    lastActiveElementRef.current = null;
  }, []);

  useEffect(() => {
    if (!modalGameId) return;
    lastActiveElementRef.current = document.activeElement;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') closeModal();
    };

    document.addEventListener('keydown', handleKeyDown);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus close button after paint
    const id = window.setTimeout(() => {
      try {
        modalCloseButtonRef.current?.focus?.();
      } catch {
        // ignore
      }
    }, 0);

    return () => {
      window.clearTimeout(id);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [closeModal, modalGameId]);

  return (
    <div
      id="learning-container"
      className={isAdhd ? 'adhd-view' : isAutism ? 'autism-view' : 'dyslexia-view'}
      data-user-condition={condition}
    >
      {isAdhd ? (
        <header className="top-bar">
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Gamepad2 size={22} aria-hidden="true" />
            <span>{t('learning.common.games')}</span>
          </h1>
          <div className="header-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={actionButtonClassName}
              title={t('learning.common.home')}
              aria-label={t('learning.common.home')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <BookOpen size={18} aria-hidden="true" />
              <span>{t('learning.common.home')}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={actionButtonClassName}
              title={t('learning.common.back')}
              aria-label={t('learning.common.back')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ChevronLeft size={18} aria-hidden="true" />
              <span>{t('learning.common.back')}</span>
            </button>
            <button onClick={logout} className="btn-logout">
              {t('learning.common.logout')}
            </button>
            <button
              type="button"
              onClick={() => setShowSideMenu((prev) => !prev)}
              className={actionButtonClassName}
              title={t('learning.common.menu')}
              aria-label={t('learning.common.menu')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {showSideMenu ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              <span>{t('learning.common.menu')}</span>
            </button>
          </div>
        </header>
      ) : isAutism ? (
        <header className="simple-header">
          <div className="header-left">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Gamepad2 size={22} aria-hidden="true" />
              <span>{t('learning.common.games')}</span>
            </h1>
            <div className="header-subtitle">{uiText('Calm games for emotions, routines, and sorting.')}</div>
          </div>

          <div className="header-actions">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="btn-settings"
              title={t('learning.common.home')}
              aria-label={t('learning.common.home')}
            >
              <BookOpen size={18} aria-hidden="true" />
              <span>{t('learning.common.home')}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-back"
              title={t('learning.common.back')}
              aria-label={t('learning.common.back')}
            >
              <ChevronLeft size={18} aria-hidden="true" />
              <span>{t('learning.common.back')}</span>
            </button>
            <button onClick={logout} className={logoutButtonClassName}>
              {t('learning.common.logout')}
            </button>
            <button
              type="button"
              onClick={() => setShowSideMenu((prev) => !prev)}
              className="btn-settings"
              title={t('learning.common.menu')}
              aria-label={t('learning.common.menu')}
            >
              {showSideMenu ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              <span>{t('learning.common.menu')}</span>
            </button>
          </div>
        </header>
      ) : (
        <nav className="navbar">
          <div className="nav-brand">
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Gamepad2 size={22} aria-hidden="true" />
              <span>{t('learning.common.games')}</span>
            </h1>
          </div>
          <div className="nav-menu">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className={actionButtonClassName}
              title={t('learning.common.home')}
              aria-label={t('learning.common.home')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <BookOpen size={18} aria-hidden="true" />
              <span>{t('learning.common.home')}</span>
            </button>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className={actionButtonClassName}
              title={t('learning.common.back')}
              aria-label={t('learning.common.back')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ChevronLeft size={18} aria-hidden="true" />
              <span>{t('learning.common.back')}</span>
            </button>

            {isDyslexia ? <SyllableModeToggle /> : null}

            <button onClick={logout} className={logoutButtonClassName}>
              {t('learning.common.logout')}
            </button>
            <button
              type="button"
              onClick={() => setShowSideMenu((prev) => !prev)}
              className={actionButtonClassName}
              title={t('learning.common.menu')}
              aria-label={t('learning.common.menu')}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {showSideMenu ? <X size={18} aria-hidden="true" /> : <Menu size={18} aria-hidden="true" />}
              <span>{t('learning.common.menu')}</span>
            </button>
          </div>
        </nav>
      )}

      {showSideMenu && (
        <>
          <div
            onClick={() => setShowSideMenu(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15, 23, 42, 0.35)',
              zIndex: 190,
            }}
          />
          <aside
            aria-label="Games side menu"
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              width: '300px',
              maxWidth: '88vw',
              height: '100vh',
              background: '#ffffff',
              borderLeft: '1px solid #e5e7eb',
              boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.15)',
              padding: '18px',
              zIndex: 200,
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px' }}>{t('learning.common.quickControls')}</h3>
              <button type="button" className="btn-settings" onClick={() => setShowSideMenu(false)}>
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <div style={{ display: 'grid', gap: '10px' }}>
              <button
                type="button"
                onClick={() => {
                  navigate('/progress');
                  setShowSideMenu(false);
                }}
                className={actionButtonClassName}
                style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Hash size={18} aria-hidden="true" />
                <span>{t('learning.common.progress')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  navigate('/badges');
                  setShowSideMenu(false);
                }}
                className={actionButtonClassName}
                style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Award size={18} aria-hidden="true" />
                <span>{t('learning.common.badges')}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowSettings(true);
                  setShowSideMenu(false);
                }}
                className={actionButtonClassName}
                style={{ justifyContent: 'flex-start', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Settings size={18} aria-hidden="true" />
                <span>{t('learning.common.settings')}</span>
              </button>

              <button
                type="button"
                onClick={async () => {
                  const newValue = !preferences?.simplifiedLayout;
                  await updateAccessibilitySettings({ simplifiedLayout: newValue });
                }}
                className={actionButtonClassName}
                style={{ justifyContent: 'space-between', display: 'flex', alignItems: 'center' }}
              >
                <span>{t('learning.common.simple')}</span>
                <span>{preferences?.simplifiedLayout ? t('learning.common.on') : t('learning.common.off')}</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {showSettings ? <ProfileSettings onClose={() => setShowSettings(false)} /> : null}

      <main className={`${isAdhd ? 'focused-content' : isAutism ? 'content-area-simple' : 'main-content'} games-page`}>
        <div className="games-header">
          <div>
            <h2>{uiText('Play Games', 'Play Games')}</h2>
            <p>
              {showGames
                ? isAdhd
                  ? uiText('Short, fast games to build focus and memory.', 'Short, fast games to build fo-cus and mem-o-ry.')
                  : isAutism
                    ? uiText('Calm, structured games to practice emotions, routines, and sorting.')
                  : uiText('Short games to build reading and spelling skills.', 'Short games to build read-ing and spell-ing skills.')
                : uiText('Games for your learning mode are coming soon.', 'Games for your learn-ing mode are com-ing soon.')}
            </p>
          </div>
        </div>

        {showGames ? (
          <>
            <div className="games-grid" aria-label={uiText('Games list')}>
              {games.map((g) => (
                <div
                  key={g.id}
                  className="game-card"
                  role="button"
                  tabIndex={0}
                  aria-label={`${g.title}. ${t('learning.common.play')}`}
                  onClick={(e) => {
                    // Ignore clicks on interactive children.
                    if (e.target && typeof e.target.closest === 'function' && e.target.closest('button,a,input,select,textarea')) {
                      return;
                    }
                    lastActiveElementRef.current = e.currentTarget;
                    setModalGameId(g.id);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      lastActiveElementRef.current = e.currentTarget;
                      setModalGameId(g.id);
                    }
                  }}
                >
                  <div className="game-card-visual" aria-hidden="true">
                    {g.visual}
                  </div>
                  <div className="game-card-content">
                    <h3>{g.title}</h3>
                    <p>{g.description}</p>
                    <div className="game-card-actions">
                      <button
                        type="button"
                        className="btn-settings"
                        onClick={(e) => {
                          e.stopPropagation();
                          lastActiveElementRef.current = e.currentTarget;
                          setModalGameId(g.id);
                        }}
                      >
                        <span>{t('learning.common.play')}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {modalGame ? (
              <>
                <div
                  className="game-modal-backdrop"
                  role="presentation"
                  onMouseDown={(e) => {
                    // Clicking the backdrop closes the modal.
                    if (e.target === e.currentTarget) closeModal();
                  }}
                />
                <section
                  className="game-modal"
                  role="dialog"
                  aria-modal="true"
                  aria-label={modalGame?.title || uiText('Game')}
                >
                  <div className="game-modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: 10, margin: 0 }}>
                      <Gamepad2 size={20} aria-hidden="true" />
                      <span>{modalGame?.title}</span>
                    </h3>
                    <button
                      type="button"
                      ref={modalCloseButtonRef}
                      className={`${actionButtonClassName} game-modal-close`}
                      onClick={closeModal}
                      aria-label={uiText('Close')}
                      title={uiText('Close')}
                    >
                      <X size={18} aria-hidden="true" />
                    </button>
                  </div>
                  <div className="game-modal-body" key={modalGameId}>
                    {modalGame?.render ? modalGame.render() : null}
                  </div>
                </section>
              </>
            ) : null}
          </>
        ) : (
          <section className="game-panel">
            <h3>{uiText('Coming soon')}</h3>
            <p className="game-instructions">
              {uiText('We will add 3 games for ADHD and Autism next. For now, the Dyslexia games are available when you log in as a Dyslexia learner.')}
            </p>
          </section>
        )}
      </main>
    </div>
  );
};

export default GamesPage;
