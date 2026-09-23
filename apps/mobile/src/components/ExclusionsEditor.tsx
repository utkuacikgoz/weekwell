import {
  PRESET_EXCLUSIONS,
  checkFeasibility,
  exclusionMatchesNothing,
  parseCustomExclusion,
  PRESET_EXCLUSION_LABEL,
  type MaxMinutes,
} from '@weekwell/domain';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { MIN_TOUCH, color, radius, space, type as typeScale } from '../theme/tokens';
import { Banner } from './Banner';
import { Button } from './Button';
import { ChoiceRow } from './ChoiceRow';
import { SectionLabel } from './Layout';
import { Text } from './Text';

/**
 * Exclusions: none, presets, and custom words. Conflicts that would leave too
 * few meals are shown here, before generation (constraints).
 */
export function ExclusionsEditor({ value, onChange, maxMinutes }: { value: string[]; onChange: (v: string[]) => void; maxMinutes: MaxMinutes }) {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const presets = value.filter((v) => (PRESET_EXCLUSIONS as readonly string[]).includes(v));
  const custom = value.filter((v) => !(PRESET_EXCLUSIONS as readonly string[]).includes(v));
  const feasibility = checkFeasibility({ exclusions: value, maxMinutes });

  const toggle = (term: string) => onChange(value.includes(term) ? value.filter((v) => v !== term) : [...value, term]);
  const add = () => {
    const parsed = parseCustomExclusion(input, value);
    if (!parsed.ok) {
      setError(parsed.message);
      return;
    }
    setError(null);
    setInput('');
    onChange([...value, parsed.term]);
  };

  return (
    <View>
      <ChoiceRow testID="exclusion-none" mode="radio" label="No exclusions" selected={value.length === 0} onPress={() => onChange([])} />
      {PRESET_EXCLUSIONS.map((p) => (
        <ChoiceRow key={p} testID={`exclusion-${p}`} mode="checkbox" label={PRESET_EXCLUSION_LABEL[p]} selected={presets.includes(p)} onPress={() => toggle(p)} />
      ))}

      <SectionLabel>Something else</SectionLabel>
      <View style={styles.addRow}>
        <TextInput
          testID="exclusion-input"
          accessibilityLabel="Add an ingredient to exclude"
          placeholder="e.g. mushrooms"
          placeholderTextColor={color.inkMuted}
          value={input}
          onChangeText={(t) => {
            setInput(t);
            if (error) setError(null);
          }}
          onSubmitEditing={add}
          returnKeyType="done"
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={40}
          style={styles.input}
        />
        <View style={{ width: 88 }}>
          <Button label="Add" kind="secondary" onPress={add} disabled={input.trim().length < 2} testID="exclusion-add" />
        </View>
      </View>
      {error ? (
        <Text variant="meta" tone="warning" accessibilityLiveRegion="polite" style={{ marginTop: space.xs }}>
          {error}
        </Text>
      ) : null}
      {custom.map((term) => (
        <View key={term} style={styles.customRow}>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">No {term}</Text>
            {exclusionMatchesNothing(term) ? (
              <Text variant="meta" tone="muted">None of our current recipes use “{term}”.</Text>
            ) : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${term}`} onPress={() => toggle(term)} style={styles.remove}>
            <Text variant="bodyStrong" tone="accent" style={{ textDecorationLine: 'underline' }}>Remove</Text>
          </Pressable>
        </View>
      ))}

      {!feasibility.ok ? (
        <Banner tone="warning" title="Not enough meals for a full week" testID="feasibility-warning">
          <Text>{feasibility.message}</Text>
          {feasibility.suggestions.map((s) => (
            <Text key={s}>• {s}</Text>
          ))}
        </Banner>
      ) : null}
      <Text variant="meta" tone="muted" style={{ marginTop: space.m }}>
        We check every ingredient against these words. If you have an allergy, always read package labels.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  addRow: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  input: {
    ...typeScale.body,
    flex: 1,
    minWidth: 0,
    width: '100%',
    minHeight: MIN_TOUCH + 8,
    borderWidth: 1.5,
    borderColor: color.control,
    borderRadius: radius.control,
    paddingHorizontal: space.m - 4,
    backgroundColor: color.raised,
    color: color.ink,
  },
  customRow: { minHeight: MIN_TOUCH + 12, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: color.divider, paddingVertical: space.s },
  remove: { minHeight: MIN_TOUCH, minWidth: MIN_TOUCH, justifyContent: 'center', alignItems: 'flex-end' },
});
