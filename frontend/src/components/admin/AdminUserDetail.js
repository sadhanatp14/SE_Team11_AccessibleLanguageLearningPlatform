import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useI18n } from '../../utils/i18n';

const AdminUserDetail = () => {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUser = async () => {
            try {
                const res = await api.get(`/admin/users/${id}`);
                setData(res.data);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load user');
            } finally {
                setLoading(false);
            }
        };

        fetchUser();
    }, [id]);

    const { t } = useI18n();

    if (loading) return <div>{t('app.loading')}</div>;
    if (error) return <div>{error}</div>;

    const { user, summary, interactions } = data;

    return (
        <div style={{ padding: '20px' }}>
            <button onClick={() => navigate(-1)}>{t('auth.adminBack')}</button>
            <h2>{user.name}</h2>
            <p><strong>Disability:</strong> {user.learningCondition}</p>
            <h3>Progress Summary</h3>
            <p>Total lessons: {summary.totalLessons}</p>
            <p>Completed: {summary.completedCount}</p>
            <p>Remaining: {summary.remaining}</p>
            <ul>
                {summary.completedLessons.map((l) => (
                    <li key={l.lessonId}>
                        {l.title} {l.completedAt ? `(${new Date(l.completedAt).toLocaleString()})` : ''}
                    </li>
                ))}
            </ul>
            <h3>Quiz Attempts / Interactions</h3>
            {interactions.length === 0 ? (
                <p>{t('auth.adminNoQuizAttempts')}</p>
            ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Lesson ID</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Interaction</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Attempts</th>
                            <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Correct</th>
                        </tr>
                    </thead>
                    <tbody>
                        {interactions.map((i) => (
                            <tr key={`${i.lessonId}-${i.interactionId}`}>
                                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{i.lessonId}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{i.interactionId}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{i.attempts}</td>
                                <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{i.isCorrect ? 'Yes' : 'No'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    );
};

export default AdminUserDetail;
