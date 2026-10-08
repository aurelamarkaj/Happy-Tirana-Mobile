import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getAdminZones } from '../../src/api/admin';
import { MapCanvas } from '../../src/components/map-canvas';
import { Body, Card, EmptyState, Notice, Screen, SectionTitle, colors } from '../../src/components/ui';
import { AdminHeader, Choice, formatLek } from '../../src/features/admin/components';

export default function AdminZones() {
  const query = useQuery({ queryKey: ['admin', 'zones'], queryFn: getAdminZones }); const [selected, setSelected] = useState('');
  useEffect(() => { if (!selected && query.data?.zones[0]) setSelected(query.data.zones[0].id); }, [query.data, selected]);
  const zone = useMemo(() => query.data?.zones.find(item => item.id === selected), [query.data, selected]);
  const center = zone?.points.length ? zone.points.reduce((sum, point) => ({ lat: sum.lat + point.lat / zone.points.length, lng: sum.lng + point.lng / zone.points.length }), { lat: 0, lng: 0 }) : null;
  return <Screen><AdminHeader back title="Zonat" subtitle="Kufijtë tariforë të shërbimit" refreshing={query.isFetching} onRefresh={() => { void query.refetch(); }} />
    <Notice>Zonat menaxhohen nga të dhënat e kontrolluara të deployment-it. API-ja e production-it lejon vetëm leximin e tyre.</Notice>
    {query.error && <Notice>Zonat nuk u ngarkuan.</Notice>}
    {query.data && !query.data.zones.length ? <EmptyState title="Nuk ka zona" message="Asnjë zonë nuk është konfiguruar." /> : null}
    {query.data?.zones.length ? <Choice value={selected} options={query.data.zones.map(item => ({ value: item.id, label: item.name }))} onChange={setSelected} /> : null}
    {zone && <><MapCanvas height={360} points={center ? [{ ...center, label: 'Z', title: zone.name, color: colors.orange }] : []} route={zone.points} /><Card><View style={s.row}><Text style={s.title}>{zone.name}</Text><Text style={[s.state, { color: zone.active ? colors.success : colors.muted }]}>{zone.active ? 'AKTIVE' : 'JOAKTIVE'}</Text></View><Body>{zone.city}</Body><View style={s.row}><View><Body>Tarifa bazë</Body><Text style={s.amount}>{formatLek(zone.transportFee)}</Text></View><View><Body>Shtesa</Body><Text style={s.amount}>{formatLek(zone.surchargeFee)}</Text></View></View><Body>{zone.isSurchargeArea ? 'Zonë me shtesë tarife' : 'Zonë standarde'} · {zone.points.length} pika</Body></Card></>}
    <SectionTitle>Të gjitha zonat</SectionTitle>{query.data?.zones.map(item => <Card key={item.id}><View style={s.row}><Text style={s.title}>{item.name}</Text><Text style={s.amount}>{formatLek(item.transportFee + (item.isSurchargeArea ? item.surchargeFee : 0))}</Text></View><Body>{item.city} · {item.active ? 'Aktive' : 'Joaktive'}</Body></Card>)}
  </Screen>;
}
const s = StyleSheet.create({ row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }, title: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 17 }, state: { fontFamily: 'Manrope_700Bold', fontSize: 10, letterSpacing: 0.6 }, amount: { color: colors.text, fontFamily: 'Manrope_700Bold', fontSize: 15 } });
