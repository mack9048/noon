import { Alert, Platform } from 'react-native';

export function say(msg: string) {
  if (Platform.OS === 'web') window.alert(msg); else Alert.alert('Noon Learn', msg);
}

export function confirmBox(msg: string): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(msg));
  return new Promise((ok) => Alert.alert('Noon Learn', msg, [{ text: 'Cancel', style: 'cancel', onPress: () => ok(false) }, { text: 'Yes', style: 'destructive', onPress: () => ok(true) }]));
}
