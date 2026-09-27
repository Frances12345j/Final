import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../context/authContext';
import { uploadAvatar } from '../lib/avatar';

export function useAvatarPicker() {
  const { updateUser } = useAuth();
  const [uploading, setUploading] = useState(false);

  const pickAvatar = (): Promise<boolean> =>
    new Promise((resolve) => {
      Alert.alert('Profile Photo', 'Choose a photo for your profile', [
        { text: 'Take Photo', onPress: () => handlePick('camera').then(resolve) },
        { text: 'Choose from Library', onPress: () => handlePick('library').then(resolve) },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      ]);
    });

  const handlePick = async (source: 'camera' | 'library'): Promise<boolean> => {
    try {
      if (source === 'camera') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission', 'Camera access is required to take a profile photo.');
          return false;
        }
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert('Permission', 'Photo library access is required to choose a profile photo.');
          return false;
        }
      }

      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      };

      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);

      if (result.canceled || !result.assets?.length) return false;

      setUploading(true);
      const updated = await uploadAvatar(result.assets[0].uri);
      await updateUser(updated);
      Alert.alert('Photo Updated', 'Your profile photo has been updated.');
      return true;
    } catch (err: any) {
      Alert.alert('Upload Failed', err?.response?.data?.message || err?.message || 'Could not update your profile photo.');
      return false;
    } finally {
      setUploading(false);
    }
  };

  return { pickAvatar, uploading };
}