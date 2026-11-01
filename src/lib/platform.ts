import { Capacitor } from '@capacitor/core';
import type { Phase, Settings } from '../types';

export const isNative = Capacitor.isNativePlatform();
export const isAndroid = Capacitor.getPlatform() === 'android';
export const isDesktop = typeof window !== 'undefined' && Boolean(window.pomogrove);
export const platformName = isDesktop ? 'Windows' : isNative ? 'Android' : 'Web';

const NOTIFICATION_ID = 7301;
let channelReady = false;

export async function requestNotifications(): Promise<boolean> {
  if (isDesktop) return true;
  if (isNative) {
    try {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      let permission = await LocalNotifications.checkPermissions();
      if (permission.display !== 'granted') {
        permission = await LocalNotifications.requestPermissions();
      }
      return permission.display === 'granted';
    } catch {
      return false;
    }
  }
  if (typeof Notification === 'undefined') return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

async function ensureChannel(): Promise<void> {
  if (channelReady || !isNative) return;
  const { LocalNotifications } = await import('@capacitor/local-notifications');
  try {
    await LocalNotifications.createChannel({
      id: 'pomodoro',
      name: '番茄计时',
      description: '专注与休息结束提醒',
      importance: 5,
      visibility: 1,
      vibration: true,
      lights: true,
      lightColor: '#E4573D',
    });
  } catch {
    /* channel may already exist */
  }
  channelReady = true;
}

export function phaseNotificationText(
  finished: Phase,
  minutes: number,
  settings: Settings,
): { title: string; body: string } {
  if (finished === 'focus') {
    return {
      title: '一颗番茄成熟了',
      body: `专注 ${minutes} 分钟完成。${
        settings.autoStartBreaks ? '休息已经为你开始，去放松一下吧。' : '起身走走，休息一下吧。'
      }`,
    };
  }
  return {
    title: '休息结束，回来种番茄吧',
    body: settings.autoStartFocus
      ? '下一段专注已经自动开始，保持节奏。'
      : '准备好后，回到番茄小园开始下一段专注。',
  };
}

export async function scheduleEndNotification(
  endAt: number,
  finished: Phase,
  minutes: number,
  settings: Settings,
): Promise<void> {
  if (!settings.notifications) return;
  if (isNative) {
    const granted = await requestNotifications();
    if (!granted) return;
    await ensureChannel();
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    const text = phaseNotificationText(finished, minutes, settings);
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: NOTIFICATION_ID,
            title: text.title,
            body: text.body,
            channelId: 'pomodoro',
            smallIcon: 'ic_stat_pomodoro',
            iconColor: '#E4573D',
            autoCancel: true,
            schedule: { at: new Date(endAt), allowWhileIdle: true },
          },
        ],
      });
    } catch {
      /* notification is a bonus, never block the timer */
    }
  }
}

export async function cancelEndNotification(): Promise<void> {
  if (!isNative) return;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] });
  } catch {
    /* nothing scheduled */
  }
}

export async function notifyNow(title: string, body: string): Promise<void> {
  if (isDesktop && window.pomogrove) {
    await window.pomogrove.notify({ title, body });
    return;
  }
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: './favicon.svg', tag: 'pomogrove' });
  } catch {
    /* some browsers only allow service-worker notifications */
  }
}

export async function hapticSuccess(settings: Settings): Promise<void> {
  if (!settings.vibration) return;
  if (isNative) {
    try {
      const { Haptics, NotificationType } = await import('@capacitor/haptics');
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      /* haptics unavailable */
    }
    return;
  }
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    navigator.vibrate([18, 60, 18]);
  }
}

export async function hapticTap(settings: Settings): Promise<void> {
  if (!settings.vibration || !isNative) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    /* haptics unavailable */
  }
}

export async function configureNativeUi(dark: boolean): Promise<void> {
  if (!isNative) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    await StatusBar.setBackgroundColor({ color: dark ? '#0F1713' : '#F7F1E7' });
  } catch {
    /* status bar not available */
  }
}

export async function hideSplash(): Promise<void> {
  if (!isNative) return;
  try {
    const { SplashScreen } = await import('@capacitor/splash-screen');
    await SplashScreen.hide();
  } catch {
    /* splash already hidden */
  }
}

export async function onBackButton(callback: () => boolean): Promise<() => void> {
  if (!isNative) return () => undefined;
  try {
    const { App } = await import('@capacitor/app');
    const handle = await App.addListener('backButton', () => {
      const handled = callback();
      if (!handled) {
        void App.minimizeApp();
      }
    });
    return () => {
      void handle.remove();
    };
  } catch {
    return () => undefined;
  }
}
