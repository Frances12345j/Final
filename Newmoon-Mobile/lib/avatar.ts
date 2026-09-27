import api from './api';

export type AvatarUploadResult = {
  avatar: string | null;
  avatar_url: string | null;
};

export async function uploadAvatar(uri: string): Promise<AvatarUploadResult> {
  const name = uri.split('/').pop() || `avatar_${Date.now()}.jpg`;
  const match = /\.(\w+)$/i.exec(name);
  const type = match ? `image/${match[1]}` : 'image/jpeg';

  const formData = new FormData();
  formData.append('avatar', { uri, type, name } as any);

  const res = await api.post('/me/avatar', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  const data = res.data?.user || res.data;
  return {
    avatar: data?.avatar ?? null,
    avatar_url: data?.avatar_url ?? null,
  };
}