import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { useI18n } from '../../utils/i18n';

const AdminUsersList = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const res = await api.get('/admin/users');
                setUsers(res.data.users || []);
            } catch (err) {
                setError(err.response?.data?.message || 'Failed to load users');
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, []);

    const { t } = useI18n();

    if (loading) return <div>{t('app.loading')}</div>;
    if (error) return <div>{error}</div>;

    return (
        <div style={{ padding: '20px' }}>
            <h2>{t('auth.adminUsersTitle')}</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Name</th>
                        <th style={{ textAlign: 'left', padding: '8px', borderBottom: '1px solid #ccc' }}>Disability</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map((u) => (
                        <tr
                            key={u.id}
                            onClick={() => navigate(`/admin/users/${u.id}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{u.name}</td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #eee' }}>{u.learningCondition}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default AdminUsersList;