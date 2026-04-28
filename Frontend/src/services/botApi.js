import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://gogoai-7lzb.onrender.com';
const BOT_API_BASE = `${API_BASE}/api/bots`;

export const fetchMyBotsRequest = async () => {
  const response = await axios.get(`${BOT_API_BASE}/mine`, {
    withCredentials: true
  });

  return response.data?.bots || [];
};

export const fetchPublicBotsRequest = async () => {
  const response = await axios.get(`${BOT_API_BASE}/public`, {
    withCredentials: true
  });

  return response.data?.bots || [];
};

export const fetchBotByIdRequest = async (botId) => {
  const response = await axios.get(`${BOT_API_BASE}/${botId}`, {
    withCredentials: true
  });

  return response.data?.bot || null;
};

export const fetchAvatarPaletteRequest = async () => {
  const response = await axios.get(`${BOT_API_BASE}/avatar-backgrounds`, {
    withCredentials: true
  });

  return response.data?.palette || [];
};

export const fetchPrivateAccessSettingsRequest = async () => {
  const response = await axios.get(`${BOT_API_BASE}/private-access/settings`, {
    withCredentials: true
  });

  return {
    hasPassword: Boolean(response.data?.hasPassword),
    hasRecoveryAnswer: Boolean(response.data?.hasRecoveryAnswer)
  };
};

export const setupPrivateAccessRequest = async (payload) => {
  const response = await axios.post(
    `${BOT_API_BASE}/private-access/setup`,
    {
      password: payload?.password,
      recoveryAnswer: payload?.recoveryAnswer
    },
    {
      withCredentials: true
    }
  );

  return response.data || null;
};

export const verifyPrivateAccessRequest = async (password) => {
  const response = await axios.post(
    `${BOT_API_BASE}/private-access/verify`,
    { password },
    {
      withCredentials: true
    }
  );

  return response.data || null;
};

export const updatePrivateAccessPasswordRequest = async (payload) => {
  const response = await axios.patch(
    `${BOT_API_BASE}/private-access/password`,
    {
      currentPassword: payload?.currentPassword,
      recoveryAnswer: payload?.recoveryAnswer,
      newPassword: payload?.newPassword
    },
    {
      withCredentials: true
    }
  );

  return response.data || null;
};

export const updateFeaturedInPublicRequest = async (botId, featuredInPublic) => {
  const response = await axios.patch(
    `${BOT_API_BASE}/${botId}/featured`,
    {
      featuredInPublic: Boolean(featuredInPublic)
    },
    {
      withCredentials: true
    }
  );

  return response.data?.bot || null;
};

export const deleteBotRequest = async (botId) => {
  const response = await axios.delete(`${BOT_API_BASE}/${botId}`, {
    withCredentials: true
  });

  return response.data || null;
};

const appendTruthy = (formData, key, value) => {
  if (value == null) {
    return;
  }

  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === '') {
    return;
  }

  formData.append(key, normalized);
};

const isNonEmptyFileLike = (value) => {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const size = Number(value.size);
  const hasPositiveSize = Number.isFinite(size) && size > 0;
  const hasName = Boolean(String(value.name || value.fileName || '').trim());

  return hasPositiveSize && hasName;
};

export const createBotRequest = async (payload) => {
  const formData = new FormData();

  appendTruthy(formData, 'name', payload?.name);
  appendTruthy(formData, 'description', payload?.description);
  appendTruthy(formData, 'instructions', payload?.instructions);
  appendTruthy(formData, 'avatarBackground', payload?.avatarBackground);
  appendTruthy(formData, 'visibility', payload?.visibility);
  formData.append('memoryEnabled', payload?.memoryEnabled ? 'true' : 'false');

  if (isNonEmptyFileLike(payload?.avatarFile)) {
    formData.append('avatar', payload.avatarFile);
  }

  const knowledgeFiles = Array.isArray(payload?.knowledgeFiles) ? payload.knowledgeFiles : [];
  for (const file of knowledgeFiles) {
    formData.append('knowledgeFiles', file);
  }

  const response = await axios.post(BOT_API_BASE, formData, {
    withCredentials: true
  });

  return response.data?.bot || null;
};

export const updateBotRequest = async (botId, payload) => {
  const formData = new FormData();

  appendTruthy(formData, 'name', payload?.name);
  appendTruthy(formData, 'description', payload?.description);
  appendTruthy(formData, 'instructions', payload?.instructions);
  appendTruthy(formData, 'avatarBackground', payload?.avatarBackground);
  appendTruthy(formData, 'visibility', payload?.visibility);
  formData.append('memoryEnabled', payload?.memoryEnabled ? 'true' : 'false');

  if (isNonEmptyFileLike(payload?.avatarFile)) {
    formData.append('avatar', payload.avatarFile);
  }

  const knowledgeFiles = Array.isArray(payload?.knowledgeFiles) ? payload.knowledgeFiles : [];
  for (const file of knowledgeFiles) {
    formData.append('knowledgeFiles', file);
  }

  const response = await axios.patch(`${BOT_API_BASE}/${botId}`, formData, {
    withCredentials: true
  });

  return response.data?.bot || null;
};

export const previewBotResponseRequest = async (payload) => {
  const response = await axios.post(
    `${BOT_API_BASE}/preview-response`,
    {
      botId: payload?.botId,
      prompt: payload?.prompt,
      name: payload?.name,
      description: payload?.description,
      instructions: payload?.instructions
    },
    {
      withCredentials: true
    }
  );

  return response.data?.content || '';
};
