let Audio: any = null;
try {
  Audio = require('expo-av').Audio;
} catch (error) {
  console.log('expo-av native module not found. Audio will be disabled until cache is cleared.');
}

let shutterSound: any = null;

export const loadShutterSound = async () => {
  if (!Audio) return;
  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sounds/shutter.mp3'),
      { volume: 1.0 }
    );
    shutterSound = sound;
  } catch (error) {
    console.log('Shutter sound file not found yet. Please add assets/sounds/shutter.mp3');
  }
};

export const playShutterSound = async () => {
  if (!shutterSound) return;
  try {
    await shutterSound.replayAsync(); // Plays from start
  } catch (error) {
    console.log('Failed to play shutter sound', error);
  }
};

export const unloadShutterSound = async () => {
  if (shutterSound) {
    await shutterSound.unloadAsync();
  }
};
