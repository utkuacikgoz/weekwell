import { RETAILERS, RETAILER_LABEL } from '@weekwell/domain';
import { View } from 'react-native';
import { BudgetControl } from '../../components/BudgetControl';
import { ChoiceGroup } from '../../components/Segmented';
import { StepScreen } from '../../components/StepScreen';
import { Text } from '../../components/Text';
import { STORE_COPY } from '../../copy';
import { useStore } from '../../state/store';
import { space } from '../../theme/tokens';

export default function StoreAndBudget() {
  const { data, setDraft, analytics } = useStore();
  const selected = data.draft.retailer;
  return (
    <StepScreen
      step="store"
      title="Where do you shop, and what’s the budget?"
      canContinue={selected !== null}
      onContinue={() => selected && analytics?.track('store_selected', { retailer: selected })}
    >
      <ChoiceGroup
        label="Store"
        columns={1}
        value={selected ?? ('' as never)}
        onChange={(r) => setDraft({ retailer: r })}
        options={RETAILERS.map((r) => ({ value: r, label: RETAILER_LABEL[r], detail: STORE_COPY[r].detail, testID: `store-${r}` }))}
      />
      <View style={{ marginTop: space.s }}>
        <Text variant="label">Weekly grocery budget</Text>
        <BudgetControl value={data.draft.weeklyBudget} householdSize={data.draft.householdSize} onChange={(weeklyBudget) => setDraft({ weeklyBudget })} />
      </View>
    </StepScreen>
  );
}
