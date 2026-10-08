import { Linking } from 'react-native';
import { Body, Button, Card, Title } from '../components/ui';
import { usePush } from './provider';
export function PushCard() {
  const { status, enabled, request } = usePush(); if (!enabled) return null;
  const messages = { idle: 'Lejo njoftimet për ofertat dhe përditësimet e porosive.', working: 'Po aktivizohen njoftimet...', registered: 'Njoftimet janë aktivizuar.', denied: 'Leja për njoftime nuk është dhënë. Aktivizoje te cilësimet e pajisjes.', disabled: 'Njoftimet nuk janë aktivizuar.', pending: 'Njoftimet ende nuk janë të disponueshme.', error: 'Njoftimet nuk u aktivizuan. Kontrollo internetin dhe provo përsëri.' };
  return <Card><Title>Njoftimet</Title><Body>{messages[status]}</Body>
    {status !== 'registered' && <Button title="Lejo njoftimet / Riprovo" disabled={status === 'working'} onPress={request} />}
    {status === 'denied' && <Button secondary title="Cilësimet e pajisjes" onPress={() => { void Linking.openSettings().catch(() => undefined); }} />}
  </Card>;
}
