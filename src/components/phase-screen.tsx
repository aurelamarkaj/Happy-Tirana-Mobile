import { useState } from 'react';
import { useAuth } from '../auth/provider';
import { sessions } from '../auth/runtime';
import { Screen, Logo, Card, Title, Body, Button, Notice } from './ui';

export function PhaseScreen({ title, phase }: { title: string; phase: 'B' | 'C' }) {
  const { session } = useAuth();
  const [error, setError] = useState(false);
  return <Screen><Logo /><Title>{title}</Title><Card>
    <Body>{session?.account.name}</Body>
    <Body>Hyrja u krye. Ky ekran do të implementohet në fazën {phase}.</Body>
    <Button secondary title="Dil nga llogaria" onPress={() => { void sessions.logout().catch(() => setError(true)); }} />
    {error && <Notice>Pastrimi i sesionit të ruajtur dështoi. Rihap aplikacionin.</Notice>}
  </Card></Screen>;
}
