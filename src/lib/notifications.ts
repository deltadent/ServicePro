import { supabase } from '@/integrations/supabase/client';

const PUBLIC_VAPID_KEY = 'YOUR_PUBLIC_VAPID_KEY';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function subscribeToPushNotifications() {
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY),
      });

      await supabase.from('push_subscriptions').insert([{ subscription }]);
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
    }
  }
}

export async function sendNotification(title: string, body: string) {
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('subscription');

  if (error) {
    console.error('Error fetching push subscriptions:', error);
    return;
  }

  const notification = {
    title,
    body,
  };

  for (const { subscription } of subscriptions) {
    // This would typically be handled by a serverless function
    // For now, we'll just log the notification
    console.log('Sending notification to:', subscription);
    console.log('Notification:', notification);
  }
}
