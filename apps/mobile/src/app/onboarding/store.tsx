import { RETAILERS } from '@weekwell/domain';
import { ChoiceRow } from '../../components/ChoiceRow';
import { StepScreen } from '../../components/StepScreen';
import { STORE_COPY } from '../../copy';
import { useStore } from '../../state/store';

export default function StoreStep() {
  const { data, setDraft, analytics } = useStore();
  const selected = data.draft.retailer;
  return (
    <StepScreen
      step="store"
      title="Where do you shop?"
      intro="We plan around what this store sells and estimate prices for it."
      canContinue={selected !== null}
      onContinue={() => selected && analytics?.track('store_selected', { retailer: selected })}
    >
      {RETAILERS.map((r) => (
        <ChoiceRow key={r} testID={`store-${r}`} label={STORE_COPY[r].label} detail={STORE_COPY[r].detail} selected={selected === r} onPress={() => setDraft({ retailer: r })} />
      ))}
    </StepScreen>
  );
}
