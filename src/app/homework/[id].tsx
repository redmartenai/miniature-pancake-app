import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ApiError } from '@/api/client';
import { api } from '@/api/endpoints';
import { dueText } from '@/features/family/homework';
import { useFamily } from '@/features/family/useFamily';
import { formatDate } from '@/lib/format';
import { newClientId } from '@/lib/ids';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';
import { Banner, Button, Card, EmptyState, Icon, LoadingCards, Pill, Screen, Text, useToast } from '@/ui';

type Picked = { uri: string; name: string; type: string };

async function toFormData(studentId: string, photos: Picked[], clientId: string) {
  const form = new FormData();
  form.append('student_id', studentId);
  form.append('client_id', clientId);
  for (const photo of photos) {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(photo.uri)).blob();
      form.append('photos', blob, photo.name);
    } else {
      // React Native's FormData accepts file descriptors of this shape.
      form.append('photos', { uri: photo.uri, name: photo.name, type: photo.type } as unknown as Blob);
    }
  }
  return form;
}

export default function HomeworkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const toast = useToast();
  const queryClient = useQueryClient();
  const family = useFamily();
  const studentId = family.selected?.id;
  const [photos, setPhotos] = useState<Picked[]>([]);
  const query = useQuery({
    queryKey: ['homework', studentId],
    queryFn: () => api.homework(studentId as string),
    enabled: !!studentId,
  });
  const item = query.data?.items.find((h) => h.id === id);

  const upload = useMutation({
    mutationFn: async () => api.submitHomework(id, await toFormData(studentId as string, photos, newClientId())),
    onSuccess: () => {
      setPhotos([]);
      toast(t('homework.submitted'));
      void queryClient.invalidateQueries({ queryKey: ['homework', studentId] });
      void queryClient.invalidateQueries({ queryKey: ['summary', studentId] });
    },
    onError: (error) => toast(error instanceof ApiError ? error.message : t('common.somethingWrong'), 'danger'),
  });

  const pick = async (source: 'camera' | 'library') => {
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.7, allowsMultipleSelection: source === 'library', selectionLimit: 10 };
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) return;
    }
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled) return;
    const next = result.assets.map((asset, index) => ({
      uri: asset.uri,
      name: asset.fileName ?? `page-${Date.now()}-${index}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    }));
    setPhotos((current) => [...current, ...next].slice(0, 10));
  };

  if (query.isLoading) {
    return (
      <Screen edges={[]}>
        <LoadingCards count={2} />
      </Screen>
    );
  }
  if (!item) {
    return (
      <Screen edges={[]}>
        <EmptyState icon="book-outline" title={t('homework.none')} />
      </Screen>
    );
  }

  const due = dueText(item, t);
  const submission = item.submission;
  const canSubmit = item.accepts_photos && (!submission || submission.status === 'redo' || submission.status === 'submitted');

  return (
    <Screen
      edges={[]}
      footer={
        photos.length ? (
          <Button
            title={upload.isPending ? t('homework.uploading') : submission ? t('homework.resubmit') : t('homework.submit')}
            icon="cloud-upload-outline"
            onPress={() => upload.mutate()}
            loading={upload.isPending}
            size="lg"
            fullWidth
          />
        ) : undefined
      }>
      <Stack.Screen options={{ title: item.subject.name }} />
      <Card>
        <View style={styles.row}>
          <Pill label={item.subject.name} tone="primary" />
          <Pill label={due.text} tone={due.tone} />
        </View>
        <Text variant="title" style={styles.title}>
          {item.title}
        </Text>
        {item.description ? <Text variant="body">{item.description}</Text> : null}
        <Text variant="caption" style={styles.meta}>
          {item.assigned_by ? `${t('homework.assignedBy', { name: item.assigned_by })} · ` : ''}
          {formatDate(item.assigned_on)} → {formatDate(item.due_date, { weekday: true })}
        </Text>
      </Card>

      {submission ? (
        <Card>
          <View style={styles.row}>
            <Text variant="subheading" style={styles.flex}>
              {submission.status === 'reviewed' ? t('homework.reviewed') : submission.status === 'redo' ? t('homework.redo') : t('homework.submitted')}
            </Text>
            <Text variant="caption">{formatDate(submission.submitted_at)}</Text>
          </View>
          {submission.teacher_remark ? (
            <View style={styles.remark}>
              <Banner tone={submission.status === 'redo' ? 'warning' : 'success'} icon="chatbox-ellipses-outline" title={t('homework.remark')} message={submission.teacher_remark} />
            </View>
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
            {submission.photos.map((uri) => (
              <Image key={uri} source={{ uri }} style={[styles.thumb, { borderColor: colors.border }]} contentFit="cover" accessibilityLabel="Submitted page" />
            ))}
          </ScrollView>
        </Card>
      ) : null}

      {canSubmit ? (
        <Card>
          <Text variant="subheading">{photos.length ? t('homework.photosSelected', { count: photos.length }) : submission ? t('homework.resubmit') : t('homework.submit')}</Text>
          {photos.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbs}>
              {photos.map((photo) => (
                <View key={photo.uri}>
                  <Image source={{ uri: photo.uri }} style={[styles.thumb, { borderColor: colors.border }]} contentFit="cover" />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Remove photo"
                    onPress={() => setPhotos((list) => list.filter((p) => p.uri !== photo.uri))}
                    style={[styles.remove, { backgroundColor: colors.ink }]}>
                    <Icon name="close" size={14} rawColor={colors.bg} />
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}
          <View style={[styles.row, styles.actions]}>
            {Platform.OS !== 'web' ? <Button title={t('homework.camera')} icon="camera-outline" variant="secondary" onPress={() => pick('camera')} style={styles.flex} /> : null}
            <Button title={t('homework.gallery')} icon="images-outline" variant="secondary" onPress={() => pick('library')} style={styles.flex} />
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  flex: { flex: 1 },
  title: { marginTop: spacing.sm, marginBottom: spacing.xs },
  meta: { marginTop: spacing.sm },
  remark: { marginTop: spacing.sm },
  thumbs: { gap: spacing.xs, paddingTop: spacing.sm },
  thumb: { width: 96, height: 128, borderRadius: radius.sm, borderWidth: 1 },
  remove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  actions: { marginTop: spacing.sm, flexWrap: 'nowrap' },
});
