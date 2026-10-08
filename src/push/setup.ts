import * as Notifications from 'expo-notifications';
import { sessions } from '../auth/runtime';
import { canPresentNotification } from './domain';
Notifications.setNotificationHandler({ handleNotification: async () => {
  const present = canPresentNotification(sessions.getSession());
  return { shouldShowBanner: present, shouldShowList: present, shouldPlaySound: false, shouldSetBadge: false };
} });
