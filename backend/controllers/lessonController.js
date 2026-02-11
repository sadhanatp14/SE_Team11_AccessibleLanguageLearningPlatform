const Lesson = require('../models/Lesson');
const { searchLessonIdsByEmbedding } = require('../services/vectorSearch');

/**
 * Lesson Controller
 * -----------------
 * Read-only lesson APIs used by the learning UI.
 * Includes:
 * - ID-based lesson fetch with computed `highlights`/`visualAids`
 * - Search endpoint with vector-search first and text-search fallback
 */

/**
 * @typedef {Object} LessonVisual
 * @property {string} iconUrl
 * @property {string} description
 */

/**
 * @typedef {Object} LessonPayload
 * @property {string} _id
 * @property {string} title
 * @property {string} textContent
 * @property {string} audioUrl
 * @property {LessonVisual[]} visuals
 * @property {string} embeddingId
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} LessonResponse
 * @property {boolean} success
 * @property {LessonPayload} lesson
 */

/**
 * @typedef {Object} LessonSearchResponse
 * @property {boolean} success
 * @property {string} query
 * @property {LessonPayload[]} lessons
 * @property {number} count
 */

const searchLessons = async (req, res) => {
  const query = (req.query.q || '').trim();

  if (!query) {
    return res.status(400).json({
      success: false,
      message: 'Query parameter "q" is required',
    });
  }

  try {
    let lessons = [];

    // Prefer semantic/vector search when configured; it returns embeddingIds ordered by relevance.
    const embeddingMatches = await searchLessonIdsByEmbedding(query);

    if (Array.isArray(embeddingMatches) && embeddingMatches.length > 0) {
      const lessonDocs = await Lesson.find({
        embeddingId: { $in: embeddingMatches },
      }).limit(20);

      const lessonMap = new Map(
        lessonDocs.map((lesson) => [lesson.embeddingId, lesson])
      );

      lessons = embeddingMatches
        .map((embeddingId) => lessonMap.get(embeddingId))
        .filter(Boolean)
        .slice(0, 20);
    } else {
      // Text search fallback when vector DB is not configured.
      lessons = await Lesson.find(
        { $text: { $search: query } },
        { score: { $meta: 'textScore' } }
      )
        .sort({ score: { $meta: 'textScore' } })
        .limit(20);
    }

    return res.json({
      success: true,
      query,
      lessons,
      count: lessons.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error searching lessons',
      error: error.message,
    });
  }
};

const getLessonById = async (req, res) => {
  try {
    const lesson = await Lesson.findById(req.params.id);

    if (!lesson) {
      return res.status(404).json({
        success: false,
        message: 'Lesson not found',
      });
    }

    const lessonObj = lesson.toObject();
    const textContent = lessonObj.textContent || '';
    const textLower = textContent.toLowerCase();

    // Normalize highlights by ensuring a safe `position` exists within text bounds.
    const highlights = (lessonObj.highlights || [])
      .map((item) => {
        if (!item.phrase) return null;
        const phraseLower = item.phrase.toLowerCase();
        const position =
          typeof item.position === 'number'
            ? item.position
            : textLower.indexOf(phraseLower);
        if (position < 0) return null;
        if (position + item.phrase.length > textContent.length) return null;
        return { ...item, position };
      })
      .filter(Boolean)
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

    // Only return visual aids that actually match phrases in the content.
    const visualAids = (lessonObj.visualAids || [])
      .filter((item) => {
        if (!item.relatedPhrase) return false;
        return textLower.includes(item.relatedPhrase.toLowerCase());
      })
      .sort((a, b) => a.relatedPhrase.localeCompare(b.relatedPhrase));

    return res.json({
      success: true,
      lesson: {
        ...lessonObj,
        highlights,
        visualAids,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error fetching lesson',
      error: error.message,
    });
  }
};

module.exports = {
  getLessonById,
  searchLessons,
};
