// Join an institution: type its code, or search its name and pick it from the list.
// The right code joins at once; picking from the list sends a request the office approves.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { T } from './ui';
import { api } from '@/lib/api';
import type { User } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

export type Institution = { id: number; name: string; place: string | null; logo_url: string | null };
export type InstitutionChoice = { text: string; picked: Institution | null };
export const emptyChoice: InstitutionChoice = { text: '', picked: null };
export const choiceReady = (c: InstitutionChoice) => !!c.picked || c.text.trim().length >= 4;

/** Sends the choice. Returns the user when they joined, or the institution name when a request was sent. */
export async function joinInstitution(c: InstitutionChoice): Promise<{ user?: User; requested?: string }> {
  const r = await api.post<any>('/auth/join-tenant', c.picked ? { tenant_id: c.picked.id } : { code: c.text.trim() });
  return r?.requested ? { requested: r.institution } : { user: r as User };
}

export function InstitutionPicker({ value, onChange }: { value: InstitutionChoice; onChange: (c: InstitutionChoice) => void }) {
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!open) return;
    let live = true;
    setLoading(true);
    const t = setTimeout(() => {
      api.get<Institution[]>(`/institutions?q=${encodeURIComponent(value.text.trim())}`)
        .then((r) => { if (live) setList(r); }).catch(() => { if (live) setList([]); }).finally(() => { if (live) setLoading(false); });
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [value.text, open]);

  if (value.picked) {
    const p = value.picked;
    return (
      <View style={{ gap: 6 }}>
        <T v="small" style={{ fontFamily: fonts.medium }}>Institution</T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderColor: colors.violet, borderRadius: 16, padding: 10, backgroundColor: '#FBFAFF' }}>
          <Logo i={p} />
          <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.semibold }} numberOfLines={1}>{p.name}</T>{p.place ? <T v="small" numberOfLines={1}>{p.place}</T> : null}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Change institution" onPress={() => { onChange(emptyChoice); setOpen(true); }}
            style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={18} color={colors.ink} />
          </Pressable>
        </View>
        <T v="small">The office will approve your request. Have the code? Tap × and type it to join at once.</T>
      </View>
    );
  }

  return (
    <View style={{ gap: 6, zIndex: 10 }}>
      <T v="small" style={{ fontFamily: fonts.medium }}>Institution code or name</T>
      <View style={{ flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 16, borderWidth: 1.5, borderColor: open ? colors.violet : colors.line, backgroundColor: '#FFF', paddingHorizontal: 12, gap: 8 }}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={value.text} onChangeText={(text) => { onChange({ text, picked: null }); setOpen(true); }} onFocus={() => setOpen(true)}
          placeholder="e.g. NOON01 or the institution's name" placeholderTextColor={colors.muted} autoCapitalize="none" autoCorrect={false} maxLength={80}
          accessibilityLabel="Institution code or name" style={{ flex: 1, fontFamily: fonts.regular, fontSize: 15, color: colors.ink, outlineStyle: 'none' } as any} />
        <Pressable accessibilityRole="button" accessibilityLabel={open ? 'Hide the list' : 'Show all institutions'} onPress={() => setOpen(!open)}>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={colors.ink} />
        </Pressable>
      </View>
      {open ? (
        <View style={{ borderRadius: 16, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#FFF', maxHeight: 260, overflow: 'hidden' }}>
          {loading && !list.length ? <T v="small" style={{ padding: 12 }}>Searching…</T>
            : !list.length ? <T v="small" style={{ padding: 12 }}>No institution found. If you have a code, type it above.</T>
            : (
              <View style={{ maxHeight: 260, overflow: 'scroll' as any }}>
                {list.map((i) => (
                  <Pressable key={i.id} accessibilityRole="button" accessibilityLabel={`Choose ${i.name}`} onPress={() => { onChange({ text: i.name, picked: i }); setOpen(false); }}
                    style={({ hovered, pressed }: any) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: hovered || pressed ? '#F4F1FF' : '#FFF', borderBottomWidth: 1, borderBottomColor: '#F1F3F6' })}>
                    <Logo i={i} />
                    <View style={{ flex: 1 }}><T style={{ fontFamily: fonts.medium }} numberOfLines={1}>{i.name}</T>{i.place ? <T v="small" numberOfLines={1}>{i.place}</T> : null}</View>
                  </Pressable>
                ))}
              </View>
            )}
        </View>
      ) : null}
    </View>
  );
}

/** Shown after a join request was sent. */
export function RequestSent({ name }: { name: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: colors.mint[0], borderRadius: 16, padding: 14 }}>
      <Ionicons name="checkmark-circle" size={24} color={colors.mint[1]} />
      <View style={{ flex: 1 }}>
        <T style={{ fontFamily: fonts.semibold, color: colors.mint[1] }}>Request sent to {name}</T>
        <T v="small" style={{ color: colors.mint[1] }}>The office will check and approve it. Once approved, log in again to see your institution.</T>
      </View>
    </View>
  );
}

function Logo({ i }: { i: Institution }) {
  return i.logo_url
    ? <Image source={{ uri: i.logo_url }} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.bg }} resizeMode="contain" />
    : <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.sky[0], alignItems: 'center', justifyContent: 'center' }}><Ionicons name="school-outline" size={18} color={colors.sky[1]} /></View>;
}
