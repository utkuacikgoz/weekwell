import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/Button';
import { Screen } from '../components/Layout';
import { NavBar } from '../components/NavBar';
import { Text } from '../components/Text';
import { useStore } from '../state/store';
import { MIN_TOUCH, color, radius, space, type as typeScale } from '../theme/tokens';

/**
 * Passwordless sign-in (only in builds connected to the Weekwell API).
 * Shown once, right before the first plan is built, so the week can be saved.
 */
export default function SignIn() {
  const { startSignIn, verifySignIn } = useStore();
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    const res = await startSignIn(email.trim());
    setBusy(false);
    if (res.ok) {
      setDevCode(res.devCode ?? null);
      setStep('code');
    } else {
      setError(res.reason === 'invalid' ? 'That doesn’t look like an email address.' : res.reason === 'rate_limited' ? 'Too many codes requested. Wait a few minutes and try again.' : 'We couldn’t reach Weekwell. Check your connection and try again.');
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const res = await verifySignIn(email.trim(), code.trim());
    setBusy(false);
    if (res === 'ok') router.replace('/generating');
    else setError(res === 'invalid' ? 'That code didn’t work. Check it, or send a new one.' : 'We couldn’t reach Weekwell. Check your connection and try again.');
  };

  return (
    <Screen
      footer={
        step === 'email' ? (
          <Button label="Send code" onPress={() => void send()} busy={busy} disabled={!/^\S+@\S+\.\S+$/u.test(email.trim())} testID="send-code" />
        ) : (
          <>
            <Button label="Sign in and plan my week" onPress={() => void verify()} busy={busy} disabled={!/^\d{6}$/u.test(code.trim())} testID="verify-code" />
            <Button label="Send a new code" kind="secondary" onPress={() => void send()} disabled={busy} />
          </>
        )
      }
    >
      <NavBar backLabel="Review" onBack={() => (step === 'code' ? setStep('email') : router.back())} />
      <Text variant="title" accessibilityRole="header">{step === 'email' ? 'Save your week' : 'Check your email'}</Text>
      <Text tone="muted" style={{ marginTop: space.s, marginBottom: space.l }}>
        {step === 'email'
          ? 'We’ll email you a 6-digit code. No password needed. We use your email only to sign you in.'
          : `We sent a code to ${email.trim()}. It expires in 10 minutes.`}
      </Text>
      {step === 'email' ? (
        <View style={styles.field}>
          <Text variant="label">Email</Text>
          <TextInput
            testID="email-input"
            accessibilityLabel="Email address"
            value={email}
            onChangeText={setEmail}
            onSubmitEditing={() => void send()}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            placeholder="you@example.com"
            placeholderTextColor={color.inkMuted}
            style={styles.input}
          />
        </View>
      ) : (
        <View style={styles.field}>
          <Text variant="label">6-digit code</Text>
          <TextInput
            testID="code-input"
            accessibilityLabel="Six-digit code"
            value={code}
            onChangeText={(t) => setCode(t.replace(/\D/gu, '').slice(0, 6))}
            onSubmitEditing={() => void verify()}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoComplete="one-time-code"
            maxLength={6}
            style={[styles.input, styles.code]}
          />
          {devCode ? (
            <Text variant="caption" tone="muted" testID="dev-code">
              Development build: your code is {devCode}
            </Text>
          ) : null}
        </View>
      )}
      {error ? (
        <Text tone="warning" accessibilityLiveRegion="polite" style={{ marginTop: space.m }} testID="sign-in-error">
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  field: { gap: space.s },
  input: { ...typeScale.body, minHeight: MIN_TOUCH + 8, borderWidth: 1.5, borderColor: color.control, borderRadius: radius.control, paddingHorizontal: space.m - 4, backgroundColor: color.raised, color: color.ink },
  code: { ...typeScale.title, letterSpacing: 8, textAlign: 'center' },
});
