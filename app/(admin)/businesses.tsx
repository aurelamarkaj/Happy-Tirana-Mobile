import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { createAdminBusiness, createAdminCategory, deleteAdminBusiness, getAdminBusinesses, getAdminCategories, resetAdminBusinessPassword, updateAdminBusiness } from '../../src/api/admin';
import type { AdminBusiness, EntityStatus } from '../../src/contracts/admin';
import { Body, Button, Card, EmptyState, Notice, Screen, SectionTitle, colors } from '../../src/components/ui';
import { AdminHeader, Choice, Field, statusLabel } from '../../src/features/admin/components';

type Form = { name: string; legalName: string; phone: string; email: string; password: string; addressText: string; googleMapsUrl: string; category: string; status: EntityStatus; description: string };
const empty: Form = { name: '', legalName: '', phone: '', email: '', password: '', addressText: '', googleMapsUrl: '', category: '', status: 'ACTIVE', description: '' };
const states: Array<{ value: EntityStatus; label: string }> = [{ value: 'ACTIVE', label: 'Aktiv' }, { value: 'INACTIVE', label: 'Jo aktiv' }, { value: 'SUSPENDED', label: 'Pezulluar' }];

export default function AdminBusinesses() {
  const router = useRouter();
  const client = useQueryClient(); const [q, setQ] = useState(''); const [form, setForm] = useState<Form | null>(null); const [editing, setEditing] = useState<AdminBusiness | null>(null); const [category, setCategory] = useState(''); const [confirm, setConfirm] = useState<string | null>(null);
  const businesses = useQuery({ queryKey: ['admin', 'businesses'], queryFn: getAdminBusinesses });
  const categories = useQuery({ queryKey: ['admin', 'categories'], queryFn: getAdminCategories });
  const refresh = async () => { await Promise.all([client.invalidateQueries({ queryKey: ['admin', 'businesses'] }), client.invalidateQueries({ queryKey: ['admin', 'categories'] })]); };
  const save = useMutation({ mutationFn: async (value: Form) => {
    if (!value.name.trim() || !value.phone.trim() || !value.email.trim() || !value.addressText.trim() || !value.category) throw new Error('FILL_REQUIRED');
    if (!editing && value.password.length < 6) throw new Error('PASSWORD');
    const input = { name: value.name.trim(), legalName: value.legalName.trim(), phone: value.phone.trim(), email: value.email.trim(), addressText: value.addressText.trim(), googleMapsUrl: value.googleMapsUrl.trim(), category: value.category, status: value.status, description: value.description.trim() };
    if (editing) { await updateAdminBusiness(editing.id, input); if (value.password) await resetAdminBusinessPassword(editing.id, value.password); }
    else await createAdminBusiness({ ...input, password: value.password });
  }, onSuccess: async () => { setForm(null); setEditing(null); await refresh(); } });
  const remove = useMutation({ mutationFn: deleteAdminBusiness, onSuccess: async () => { setConfirm(null); await refresh(); } });
  const addCategory = useMutation({ mutationFn: createAdminCategory, onSuccess: async () => { setCategory(''); await refresh(); } });
  const list = useMemo(() => (businesses.data?.businesses ?? []).filter(item => `${item.name} ${item.phone} ${item.email ?? ''} ${item.addressText}`.toLowerCase().includes(q.trim().toLowerCase())), [businesses.data, q]);
  function edit(item: AdminBusiness) { setEditing(item); setForm({ name: item.name, legalName: item.legalName ?? '', phone: item.phone, email: item.email ?? '', password: '', addressText: item.addressText, googleMapsUrl: item.lat != null && item.lng != null ? `https://www.google.com/maps?q=${item.lat},${item.lng}` : '', category: item.category ?? '', status: item.status, description: item.description ?? '' }); }
  return <Screen><AdminHeader back title="Bizneset" subtitle="Llogaritë, kategoritë dhe kredencialet" refreshing={businesses.isFetching} onRefresh={() => { void refresh(); }} />
    <Button title={form ? 'Mbyll formularin' : 'Krijo biznes'} secondary={!!form} onPress={() => { setEditing(null); setForm(form ? null : { ...empty, category: categories.data?.categories.find(item => item.active)?.name ?? '' }); }} />
    {form && <BusinessForm form={form} setForm={setForm} categories={categories.data?.categories.filter(item => item.active || item.name === form.category).map(item => item.name) ?? []} editing={!!editing} busy={save.isPending} onSave={() => save.mutate(form)} />}
    {(save.error || remove.error) && <Notice>{save.error instanceof Error && save.error.message === 'FILL_REQUIRED' ? 'Plotëso të gjitha fushat e detyrueshme.' : save.error instanceof Error && save.error.message === 'PASSWORD' ? 'Fjalëkalimi duhet të ketë të paktën 6 karaktere.' : 'Veprimi nuk u krye. Kontrollo të dhënat dhe provo përsëri.'}</Notice>}
    <SectionTitle detail="Përdoret te krijimi i biznesit">Kategoritë</SectionTitle><Card><Field label="Kategori e re" value={category} onChangeText={setCategory} placeholder="P.sh. Restorant" /><Button title="Shto kategorinë" disabled={category.trim().length < 2 || addCategory.isPending} onPress={() => addCategory.mutate(category.trim())} /><View style={s.tags}>{categories.data?.categories.map(item => <Text key={item.id} style={s.tag}>{item.name} · {item.businessCount}</Text>)}</View></Card>
    <SectionTitle detail={`${list.length} rezultate`}>Lista</SectionTitle><Field label="Kërko biznes" value={q} onChangeText={setQ} placeholder="Emër, telefon, email ose adresë" />
    {!businesses.isLoading && !list.length ? <EmptyState title="Nuk ka biznese" message="Krijo biznesin e parë ose ndrysho kërkimin." /> : null}
    {list.map(item => <Card key={item.id}><View style={s.row}><Text style={s.title}>{item.name}</Text><Text style={s.status}>{statusLabel[item.status]}</Text></View><Body>{item.category ?? 'Pa kategori'} · {item.phone}</Body><Body>{item.email ?? 'Pa email'}</Body><Body>{item.addressText}</Body><Body>{item.orderCount} porosi</Body><View style={s.actions}><Button secondary title="Porositë" onPress={() => router.push({ pathname: '/(admin)/business-orders', params: { id: item.id } })} /><Button secondary title="Ndrysho" onPress={() => edit(item)} />{confirm === item.id ? <><Button secondary title="Jo" onPress={() => setConfirm(null)} /><Button title="Po, fshi" disabled={remove.isPending} onPress={() => remove.mutate(item.id)} /></> : <Button secondary title="Fshi" onPress={() => setConfirm(item.id)} />}</View></Card>)}
  </Screen>;
}

function BusinessForm({ form, setForm, categories, editing, busy, onSave }: { form: Form; setForm: (value: Form) => void; categories: string[]; editing: boolean; busy: boolean; onSave: () => void }) {
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm({ ...form, [key]: value });
  return <Card><Text style={s.formTitle}>{editing ? 'Ndrysho biznesin' : 'Biznes i ri'}</Text><Field label="Emri *" value={form.name} onChangeText={v => set('name', v)} /><Field label="Emri ligjor" value={form.legalName} onChangeText={v => set('legalName', v)} /><Field label="Telefoni *" value={form.phone} onChangeText={v => set('phone', v)} keyboardType="phone-pad" /><Field label="Email *" value={form.email} onChangeText={v => set('email', v)} keyboardType="email-address" /><Field label={editing ? 'Fjalëkalim i ri (opsional)' : 'Fjalëkalimi *'} value={form.password} onChangeText={v => set('password', v)} secureTextEntry /><Field label="Adresa *" value={form.addressText} onChangeText={v => set('addressText', v)} /><Field label="Link Google Maps" value={form.googleMapsUrl} onChangeText={v => set('googleMapsUrl', v)} placeholder="https://maps.app.goo.gl/..." /><Text style={s.label}>Kategoria *</Text><Choice value={form.category} options={categories.map(value => ({ value, label: value }))} onChange={v => set('category', v)} /><Text style={s.label}>Statusi</Text><Choice value={form.status} options={states} onChange={v => set('status', v)} /><Field label="Përshkrimi" value={form.description} onChangeText={v => set('description', v)} multiline /><Button title={busy ? 'Duke ruajtur...' : 'Ruaj biznesin'} disabled={busy} onPress={onSave} /></Card>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 17 }, status: { color: colors.orangeDark, fontFamily: 'Manrope_600SemiBold', fontSize: 11, backgroundColor: colors.orangeSoft, borderRadius: 14, paddingHorizontal: 9, paddingVertical: 5 }, tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, tag: { color: colors.muted, backgroundColor: colors.soft, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7, fontFamily: 'Manrope_600SemiBold', fontSize: 11 }, formTitle: { color: colors.text, fontFamily: 'Manrope_800ExtraBold', fontSize: 20 }, label: { color: colors.text, fontFamily: 'Manrope_600SemiBold', fontSize: 13 } });
