import { Linking, Platform } from 'react-native';
import { Body, Button, Card, Title } from '../components/ui';
import { useRiderGps } from './provider';
export function GpsCard() {
  const { state, needed, busy, requestForeground, requestBackground } = useRiderGps();
  return <Card><Title>GPS live</Title><Body>{state.message}</Body>
    {state.sentAt && <Body>Dërgimi i fundit: {new Date(state.sentAt).toLocaleTimeString('sq-AL')}</Body>}
    {state.mode === 'background' && <Body>Aktiv edhe kur aplikacioni është në background.</Body>}
    {state.mode === 'foreground' && <Body>Aktiv vetëm me aplikacionin të hapur.</Body>}
    {needed && <>
      {state.mode === 'stopped' && <Button title="Lejo GPS / Riprovo" disabled={busy} onPress={() => { void requestForeground(); }} />}
      {state.mode !== 'background' && <><Body>Për GPS me ekran të kyçur, lejo vendndodhjen gjatë gjithë kohës te cilësimet. Vendndodhja i dërgohet administratorit vetëm kur je online ose ke dërgesa aktive. Në Android shfaqet njoftim i vazhdueshëm.</Body><Button secondary title="Lejo GPS në background" disabled={busy} onPress={() => { void requestBackground(); }} /></>}
      {Platform.OS !== 'web' && <Button secondary title="Cilësimet e pajisjes" onPress={() => { void Linking.openSettings().catch(() => undefined); }} />}
    </>}
  </Card>;
}
