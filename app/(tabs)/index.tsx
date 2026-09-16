import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { getGoogleAIApiKey } from '@/services/googleai';

export default function IndexRedirect() {
  const [checked, setChecked] = useState(false);
  const [hasKey, setHasKey] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const key = await getGoogleAIApiKey();
        if (mounted) setHasKey(!!key && key.trim().length > 0);
      } catch {
        if (mounted) setHasKey(false);
      } finally {
        if (mounted) setChecked(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (!checked) return null;

  return <Redirect href={hasKey ? '/scan' : '/onboarding'} />;
}