import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EVENTS, captureEvent } from '@/lib/analytics';
import {
  cancelAllScheduledNotifications,
  NOTIFICATIONS_ENABLED_STORAGE_KEY,
  requestNotificationPermissions,
  rescheduleNotifications,
} from '@/lib/notifications';

export function useNotificationsSetting() {
  const [enabled, setEnabled] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const readValue = useCallback(async () => {
    // #region agent log
    fetch('http://127.0.0.1:7874/ingest/7cda9f39-7330-4a7a-82e2-d6f5bd886520',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a1c528'},body:JSON.stringify({sessionId:'a1c528',runId:'pre-fix-2',hypothesisId:'H1',location:'hooks/useNotificationsSetting.ts:readValue:start',message:'begin reading reminders setting',data:{enabled_before:enabled,loaded_before:loaded},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    const value = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_STORAGE_KEY);
    // #region agent log
    fetch('http://127.0.0.1:7874/ingest/7cda9f39-7330-4a7a-82e2-d6f5bd886520',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a1c528'},body:JSON.stringify({sessionId:'a1c528',runId:'pre-fix-2',hypothesisId:'H1',location:'hooks/useNotificationsSetting.ts:readValue:storage',message:'read reminders setting from storage',data:{stored_value:value},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    setEnabled(value === 'true');
    setLoaded(true);
    // #region agent log
    fetch('http://127.0.0.1:7874/ingest/7cda9f39-7330-4a7a-82e2-d6f5bd886520',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a1c528'},body:JSON.stringify({sessionId:'a1c528',runId:'pre-fix-2',hypothesisId:'H1',location:'hooks/useNotificationsSetting.ts:readValue:applied',message:'applied reminders state from storage',data:{next_enabled:value==='true',loaded_after:true},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // #region agent log
    console.log('[DBG-a1c528] H1 readValue applied', { storedValue: value, nextEnabled: value === 'true' });
    // #endregion
  }, []);

  useEffect(() => {
    readValue();
  }, [readValue]);

  useFocusEffect(
    useCallback(() => {
      readValue();
    }, [readValue])
  );

  useEffect(() => {
    // #region agent log
    fetch('http://127.0.0.1:7874/ingest/7cda9f39-7330-4a7a-82e2-d6f5bd886520',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a1c528'},body:JSON.stringify({sessionId:'a1c528',runId:'pre-fix-2',hypothesisId:'H2',location:'hooks/useNotificationsSetting.ts:stateEffect',message:'reminders hook state changed',data:{enabled,loaded},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // #region agent log
    console.log('[DBG-a1c528] H2 hook state', { enabled, loaded });
    // #endregion
  }, [enabled, loaded]);

  const toggle = useCallback(async () => {
    const nextEnabled = !enabled;
    // #region agent log
    fetch('http://127.0.0.1:7874/ingest/7cda9f39-7330-4a7a-82e2-d6f5bd886520',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a1c528'},body:JSON.stringify({sessionId:'a1c528',runId:'pre-fix-2',hypothesisId:'H4',location:'hooks/useNotificationsSetting.ts:toggle:start',message:'user toggled reminders',data:{enabled_before:enabled,next_enabled:nextEnabled},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // #region agent log
    console.log('[DBG-a1c528] H4 toggle start', { enabledBefore: enabled, nextEnabled });
    // #endregion

    if (nextEnabled) {
      const granted = await requestNotificationPermissions();
      if (!granted) {
        setEnabled(false);
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_STORAGE_KEY, 'false');
        return;
      }
    }

    setEnabled(nextEnabled);
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_STORAGE_KEY, nextEnabled ? 'true' : 'false');
    // #region agent log
    fetch('http://127.0.0.1:7874/ingest/7cda9f39-7330-4a7a-82e2-d6f5bd886520',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'a1c528'},body:JSON.stringify({sessionId:'a1c528',runId:'pre-fix-2',hypothesisId:'H4',location:'hooks/useNotificationsSetting.ts:toggle:stored',message:'stored reminders setting after toggle',data:{stored_value:nextEnabled?'true':'false'},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    // #region agent log
    console.log('[DBG-a1c528] H4 toggle stored', { storedValue: nextEnabled ? 'true' : 'false' });
    // #endregion

    if (nextEnabled) {
      await rescheduleNotifications();
    } else {
      await cancelAllScheduledNotifications();
    }

    captureEvent(EVENTS.NOTIFICATIONS_TOGGLED, { enabled: nextEnabled });
  }, [enabled]);

  return { enabled, loaded, toggle };
}
