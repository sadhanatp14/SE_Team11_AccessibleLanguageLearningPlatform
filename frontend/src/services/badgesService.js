import api from '../utils/api';

export const getBadges = async () => {
  const res = await api.get('/badges');
  return res.data;
};
