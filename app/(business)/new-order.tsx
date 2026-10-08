import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Linking, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Body, Button, Card, Notice, Screen, SectionTitle, colors } from '../../src/components/ui';
import { BusinessHeader, inputStyle } from '../../src/features/business/components';
import LocationMap from '../../src/features/business/location-map';
import { useBusinessAction, useBusinessData } from '../../src/features/business/hooks';
import { businessError, isCurrentRequest } from '../../src/features/business/domain';
import { createOrder, getOrderWindow, previewLocation, quoteOrder, type LocationPreview } from '../../src/api/business';
import { businessOrderFormSchema, businessQuoteSchema, emptyBusinessForm, type BusinessFormOutput, type BusinessFormValues } from '../../src/contracts/business-order';
import type { BusinessOrderQuote } from '../../src/contracts/business';
import { formatLek } from '../../src/features/rider/domain';
import { sessions } from '../../src/auth/runtime';

const fields: Array<{ name: keyof BusinessFormValues; label: string; keyboard?: 'phone-pad' | 'number-pad' | 'decimal-pad'; multiline?: boolean }> = [
  { name: 'customerName', label: 'Emri i klientit (opsional)' }, { name: 'customerPhone', label: 'Telefoni i klientit', keyboard: 'phone-pad' },
  { name: 'googleMapsUrl', label: 'Linku i Google Maps' }, { name: 'readyMinutes', label: 'Gati për sa minuta? (0–180)', keyboard: 'number-pad' },
  { name: 'orderValue', label: 'Vlera e porosisë (ALL)', keyboard: 'decimal-pad' }, { name: 'productDescription', label: 'Përshkrimi (opsional)', multiline: true },
];
export default function NewOrder() {
  const { dashboard, window } = useBusinessData();
  const form = useForm<BusinessFormValues, unknown, BusinessFormOutput>({ resolver: zodResolver(businessOrderFormSchema), defaultValues: emptyBusinessForm });
  const [preview, setPreview] = useState<LocationPreview | null>(null); const [quote, setQuote] = useState<BusinessOrderQuote | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  const current = useRef({ revision: 0, url: '' }); const locked = useRef(false); const mounted = useRef(true);
  const create = useBusinessAction(createOrder);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; current.current.revision++; }; }, []);
  useEffect(() => { const sub = form.watch((values, info) => {
    if (info.name === 'googleMapsUrl') { current.current = { revision: current.current.revision + 1, url: values.googleMapsUrl?.trim() ?? '' }; setPreview(null); setQuote(null); setError(''); setSuccess(''); }
  }); return () => sub.unsubscribe(); }, [form]);
  async function resolveLocation(withQuote: boolean) {
    if (locked.current) return;
    const parsed = businessQuoteSchema.shape.googleMapsUrl.safeParse(form.getValues('googleMapsUrl'));
    if (!parsed.success) { form.setError('googleMapsUrl', { message: parsed.error.issues[0]?.message }); return; }
    const request = { revision: current.current.revision, url: parsed.data }; current.current.url = parsed.data;
    const token = sessions.getSession()?.account.token;
    const valid = () => mounted.current && token === sessions.getSession()?.account.token && isCurrentRequest(request, current.current);
    locked.current = true; setBusy(true); setError(''); setSuccess('');
    try {
      if (withQuote) {
        if (!preview) return;
        const result = await quoteOrder({ googleMapsUrl: parsed.data, lat: preview.lat, lng: preview.lng, addressText: preview.addressText });
        if (valid()) {
          setQuote(result.quote);
          setPreview({ lat: result.quote.lat, lng: result.quote.lng, addressText: result.quote.addressText, originalUrl: parsed.data });
        }
      } else {
        setPreview(null); setQuote(null);
        const result = await previewLocation(parsed.data);
        if (valid()) setPreview(result.location);
      }
    } catch (e) { if (valid()) setError(businessError(e)); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  async function submit(values: BusinessFormOutput) {
    if (locked.current || !quote || !preview || values.googleMapsUrl !== current.current.url) return;
    locked.current = true; setBusy(true); setError(''); setSuccess('');
    const token = sessions.getSession()?.account.token;
    try {
      // Recheck the authoritative operating window immediately before creating.
      const freshWindow = await getOrderWindow();
      if (!freshWindow.isOpen) { setError('Pranimi i porosive është mbyllur.'); return; }
      if (!mounted.current || token !== sessions.getSession()?.account.token) return;
      const result = await create.mutateAsync({ ...values, lat: quote.lat, lng: quote.lng, addressText: quote.addressText });
      if (mounted.current && token === sessions.getSession()?.account.token) {
        form.reset(emptyBusinessForm); current.current = { revision: current.current.revision + 1, url: '' }; setPreview(null); setQuote(null);
        setSuccess(result.offeredRiders.length ? `Porosia ${result.order.code} u krijua dhe iu dërgua ${result.offeredRiders.length} motorristëve.` : `Porosia ${result.order.code} u krijua. Oferta do të dërgohet më ${new Date(result.dispatchScheduledFor).toLocaleString('sq-AL')}.`);
      }
    } catch (e) { if (mounted.current && token === sessions.getSession()?.account.token) setError(businessError(e)); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  }
  const value = Number(form.watch('orderValue').replace(',', '.'));
  const allowed = !!window.data?.isOpen && !window.error && !!dashboard.data && !dashboard.error;
  return <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><Screen>
    <BusinessHeader title="Porosi e re" titleStyle={local.pageTitle} refreshing={window.isFetching || dashboard.isFetching} refresh={() => { void window.refetch(); void dashboard.refetch(); }} />
    <View style={local.progress}><View style={[local.progressStep, local.progressActive]}><Text style={local.progressNumber}>1</Text><Text style={local.progressText}>Të dhënat</Text></View><View style={[local.progressLine, preview && local.progressLineDone]} /><View style={[local.progressStep, preview && local.progressActive]}><Text style={local.progressNumber}>2</Text><Text style={local.progressText}>Lokacioni</Text></View><View style={[local.progressLine, quote && local.progressLineDone]} /><View style={[local.progressStep, quote && local.progressActive]}><Text style={local.progressNumber}>3</Text><Text style={local.progressText}>Konfirmimi</Text></View></View>
    <Body>{window.data ? window.data.isOpen ? 'Pranimi është i hapur · 07:00–22:59' : 'Pranimi i porosive është mbyllur.' : 'Po kontrollohet orari...'}</Body>
    {(window.error || dashboard.error) && <Notice>{businessError(window.error || dashboard.error)}</Notice>}
    {!!success && <Body>{success}</Body>}{!!error && <Notice>{error}</Notice>}
    <Card><SectionTitle detail="Fushat me * janë të detyrueshme">Të dhënat e klientit dhe porosisë</SectionTitle>{fields.map(item => <View key={item.name} style={{ gap: 8 }}><Text style={local.fieldLabel}>{item.label}{['customerPhone', 'googleMapsUrl', 'readyMinutes', 'orderValue'].includes(item.name) ? ' *' : ''}</Text><Controller control={form.control} name={item.name} render={({ field, fieldState }) => <>
      <TextInput accessibilityLabel={item.label} value={field.value} onBlur={field.onBlur} onChangeText={value => field.onChange(item.name === 'orderValue' ? value.replace(/[^\d.,-]/g, '') : value)} editable={!busy} autoCapitalize={item.name === 'googleMapsUrl' ? 'none' : 'sentences'} autoCorrect={item.name !== 'googleMapsUrl'} keyboardType={item.keyboard ?? 'default'} multiline={item.multiline} placeholder={item.name === 'googleMapsUrl' ? 'https://maps.app.goo.gl/…' : item.name === 'readyMinutes' ? 'Minuta' : item.name === 'orderValue' ? 'Vlera që motoristi paguan biznesit' : undefined} placeholderTextColor={colors.muted} style={[inputStyle, item.multiline && { minHeight: 96, textAlignVertical: 'top' }]} />
      {item.name === 'readyMinutes' && <View style={local.minutes}>{[0, 5, 10, 15, 20, 30].map(minute => <Pressable key={minute} onPress={() => form.setValue('readyMinutes', String(minute), { shouldValidate: true })} style={[local.minute, field.value === String(minute) && local.minuteActive]}><Text style={[local.minuteText, field.value === String(minute) && local.minuteTextActive]}>{minute} min</Text></Pressable>)}</View>}
      {fieldState.error && <Notice>{fieldState.error.message}</Notice>}</>} /></View>)}
      <Button secondary title={busy ? 'Po përpunohet...' : 'Shiko vendndodhjen'} disabled={busy || !allowed} onPress={() => { void resolveLocation(false); }} />
    </Card>
    {preview && <Card><SectionTitle detail="Kontrollo që pika të jetë destinacioni i klientit">Vendndodhja e dorëzimit</SectionTitle><Body>{preview.addressText}</Body><LocationMap location={preview} />
      <Button secondary title="Hap Google Maps" onPress={() => { void Linking.openURL(current.current.url).catch(() => setError('Google Maps nuk u hap.')); }} />
      <Button title="Llogarit transportin" disabled={busy || !allowed} onPress={() => { void resolveLocation(true); }} />
    </Card>}
    {quote && <Card><SectionTitle detail="Tarifa llogaritet sipas distancës rrugore">Përmbledhja e pagesës</SectionTitle><Body>Zona: {quote.zoneName} · {quote.distanceKm.toFixed(3)} km</Body><View style={local.quoteGrid}><View style={local.quoteItem}><Body>Tarifa bazë</Body><Text style={local.quoteValue}>{formatLek(quote.baseFee)}</Text></View><View style={local.quoteItem}><Body>Metra mbi 3 km</Body><Text style={local.quoteValue}>{formatLek(quote.extraDistanceFee)}</Text></View></View>
      {quote.ringSurchargeApplied && <Body>Shtesë unaze: {formatLek(quote.ringSurchargeFee)}</Body>}
      <Body>Vlera e porosisë: {Number.isFinite(value) ? formatLek(value) : 'Plotëso vlerën'}</Body>
      <Body>Tarifa e transportit: {formatLek(quote.finalTransportFee)}{quote.transportFeeOverridden ? ' (tarifë e përcaktuar)' : ''}</Body>
      <Body>Tarifa përfundimtare konfirmohet gjatë krijimit të porosisë.</Body>
      <Button title={busy ? 'Po krijohet...' : 'Krijo porosinë'} disabled={busy || !allowed} onPress={() => { void form.handleSubmit(submit)(); }} />
    </Card>}
  </Screen></KeyboardAvoidingView>;
}
const local = StyleSheet.create({
  pageTitle: { fontSize: 29, lineHeight: 38 },
  progress: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  progressStep: { alignItems: 'center', gap: 4, opacity: 0.42 }, progressActive: { opacity: 1 },
  progressNumber: { width: 28, height: 28, borderRadius: 14, textAlign: 'center', textAlignVertical: 'center', backgroundColor: colors.orange, color: colors.white, fontFamily: 'Manrope_700Bold', fontSize: 12 },
  progressText: { fontFamily: 'Manrope_600SemiBold', color: colors.text, fontSize: 12, lineHeight: 17 },
  progressLine: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: 8, marginBottom: 17 }, progressLineDone: { backgroundColor: colors.orange },
  minutes: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, minute: { borderWidth: 1, borderColor: colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.white }, minuteActive: { borderColor: colors.orange, backgroundColor: colors.orangeSoft }, minuteText: { fontFamily: 'Manrope_600SemiBold', color: colors.muted, fontSize: 12 }, minuteTextActive: { color: colors.orangeDark },
  quoteGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, quoteItem: { flex: 1, minWidth: 130, backgroundColor: colors.soft, padding: 12, borderRadius: 14, gap: 3 }, quoteValue: { fontFamily: 'Manrope_700Bold', color: colors.text, fontSize: 15 },
  fieldLabel: { fontFamily: 'Manrope_500Medium', color: colors.muted, fontSize: 15, lineHeight: 22 },
});
