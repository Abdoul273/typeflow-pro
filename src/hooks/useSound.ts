import { useState, useEffect, useCallback } from 'react';
import { 
  SoundSettings, 
  SoundProfile, 
  getSoundSettings, 
  updateSoundSettings, 
  subscribeSoundSettings,
  previewSound
} from '../lib/audio';

export const useSound = () => {
  const [settings, setSettings] = useState<SoundSettings>(getSoundSettings);

  useEffect(() => {
    return subscribeSoundSettings((newSettings) => {
      setSettings(newSettings);
    });
  }, []);

  const update = useCallback((updates: Partial<SoundSettings>) => {
    return updateSoundSettings(updates);
  }, []);

  const toggleMute = useCallback(() => {
    return updateSoundSettings({ enabled: !settings.enabled });
  }, [settings.enabled]);

  const setVolume = useCallback((volume: number) => {
    return updateSoundSettings({ volume, enabled: volume > 0 ? true : settings.enabled });
  }, [settings.enabled]);

  const setProfile = useCallback((profile: SoundProfile) => {
    return updateSoundSettings({ profile });
  }, []);

  const preview = useCallback((type: 'key' | 'space' | 'error', targetProfile?: SoundProfile) => {
    previewSound(targetProfile || settings.profile, type, settings.volume || 0.4);
  }, [settings.profile, settings.volume]);

  return {
    settings,
    update,
    toggleMute,
    setVolume,
    setProfile,
    preview
  };
};
