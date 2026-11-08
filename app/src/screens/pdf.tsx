// Opens just the PDF for Text book, Work book or Class note of the picked subject/course.
// Web: the PDF shows inside the page. Phone app: it opens in the phone's PDF viewer.
import React, { useMemo, useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { Button, Card, ErrorBox, Loading, Row, Screen, T } from '@/components/ui';
import { useApi } from '@/lib/useApi';
import { useLearnSpaces } from '@/lib/learnSpace';
import { useLayout } from '@/lib/useLayout';
import type { LearnDetail, LearnMaterial } from '@/lib/types';
import { colors, fonts } from '@/theme/tokens';

export type PdfKind = 'textbook' | 'workbook' | 'note';
const NAMES: Record<PdfKind, string> = { textbook: 'Text book', workbook: 'Work book', note: 'Class note' };
const TINT: Record<PdfKind, readonly [string, string]> = { textbook: colors.sky, workbook: colors.butter, note: colors.pink };

/** Which PDFs in a subject/course belong to each tile. */
function pick(materials: LearnMaterial[], kind: PdfKind) {
  const pdfs = materials.filter((m) => m.kind === 'pdf');
  if (kind === 'textbook') return pdfs.filter((m) => /textbook/i.test(`${m.title} ${m.meta ?? ''}`));
  if (kind === 'workbook') return pdfs.filter((m) => /work ?book|worksheet/i.test(`${m.title} ${m.meta ?? ''}`));
  return pdfs.filter((m) => /note/i.test(`${m.title} ${m.meta ?? ''}`) && !/textbook|work ?book|worksheet/i.test(`${m.title} ${m.meta ?? ''}`));
}
const usable = (url?: string | null) => !!url && url !== '#';

export function PdfScreen() {
  const { space, type, lesson } = useLocalSearchParams<{ space?: string; type?: PdfKind; lesson?: string }>();
  const kind: PdfKind = type === 'workbook' || type === 'note' ? type : 'textbook';
  const { selected } = useLearnSpaces();
  const key = space ?? selected?.key ?? null;
  const [t, id] = key ? key.split('-') : [null, null];
  const detail = useApi<LearnDetail>(t && id ? `/learn/${t}/${id}` : null);
  const list = useMemo(() => pick(detail.data?.materials ?? [], kind), [detail.data, kind]);
  // Class note: start on the current lesson's note (first lesson not done yet), or the one asked for.
  const startIndex = useMemo(() => {
    if (kind !== 'note' || !detail.data) return 0;
    const pos = lesson ? Number(lesson) : detail.data.syllabus.find((l) => !l.done)?.position;
    const i = list.findIndex((m) => pos != null && m.title.startsWith(`Lesson ${pos} `));
    return Math.max(0, i);
  }, [kind, detail.data, list, lesson]);
  const [chosen, setChosen] = useState<number | null>(null);
  const current = list[chosen ?? startIndex];
  const tint = TINT[kind];
  const spaceTitle = detail.data?.space.title ?? selected?.title ?? '';

  return (
    <Screen>
      <Row gap={10}>
        <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: tint[0], alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={kind === 'workbook' ? 'pencil' : kind === 'note' ? 'document-text' : 'book'} size={20} color={tint[1]} />
        </View>
        <View style={{ flex: 1 }}>
          <T v="h1" style={{ fontSize: 26 }}>{NAMES[kind]}</T>
          <T v="small" numberOfLines={1}>{[spaceTitle, current?.title !== NAMES[kind] && current?.title !== 'Textbook' ? current?.title : null].filter(Boolean).join(' · ')}</T>
        </View>
      </Row>

      {detail.loading ? <Loading /> : detail.error ? <ErrorBox message={detail.error} onRetry={detail.reload} /> : !current ? (
        <Card style={{ marginTop: 16, alignItems: 'center', gap: 10, paddingVertical: 30 }}>
          <Ionicons name="document-outline" size={36} color={colors.muted} />
          <T style={{ fontFamily: fonts.semibold }}>No {NAMES[kind].toLowerCase()} yet</T>
          <T v="small" style={{ textAlign: 'center' }}>Your teacher hasn't uploaded the {NAMES[kind].toLowerCase()} PDF for {spaceTitle || 'this subject'} yet.</T>
        </Card>
      ) : (
        <>
          {list.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 12, flexGrow: 0 }} contentContainerStyle={{ gap: 8 }}>
              {list.map((m, i) => {
                const on = i === (chosen ?? startIndex);
                return (
                  <Pressable key={m.id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setChosen(i)}
                    style={{ height: 36, paddingHorizontal: 14, borderRadius: 18, justifyContent: 'center', backgroundColor: on ? colors.ink : '#FFF' }}>
                    <T numberOfLines={1} style={{ fontSize: 13, fontFamily: on ? fonts.semibold : fonts.regular, color: on ? '#FFF' : colors.ink }}>{m.title.replace(/ · .*/, '')}</T>
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : null}
          <PdfView url={current.url} title={current.title} />
        </>
      )}
    </Screen>
  );
}

function PdfView({ url, title }: { url?: string | null; title: string }) {
  if (!usable(url)) {
    return (
      <Card style={{ marginTop: 12, alignItems: 'center', gap: 8, paddingVertical: 30 }}>
        <Ionicons name="cloud-upload-outline" size={34} color={colors.muted} />
        <T v="small" style={{ textAlign: 'center' }}>This PDF hasn't been uploaded yet.</T>
      </Card>
    );
  }
  const open = () => Linking.openURL(url!);
  // Phone browsers (Android especially) can't show a PDF inside a page, so uploaded files
  // (full https links) are shown through Google's viewer there. Desktop browsers show it directly.
  const { isPhone } = useLayout();
  const src = isPhone && /^https?:\/\//.test(url!) ? `https://docs.google.com/viewer?embedded=true&url=${encodeURIComponent(url!)}` : `${url}#view=FitH`;
  return (
    <View style={{ marginTop: 12, gap: 10 }}>
      {Platform.OS === 'web' ? (
        <View style={{ height: 640, borderRadius: 20, overflow: 'hidden', backgroundColor: '#FFF' }}>
          {React.createElement('iframe', { src, title, style: { width: '100%', height: '100%', border: 0 } })}
        </View>
      ) : null}
      <Row gap={10}>
        <Button title={Platform.OS === 'web' ? 'Full screen' : 'Open PDF'} icon="expand-outline" kind="ghost" style={{ flex: 1 }} onPress={open} />
        <Button title="Download" icon="download-outline" style={{ flex: 1 }} onPress={open} />
      </Row>
    </View>
  );
}
