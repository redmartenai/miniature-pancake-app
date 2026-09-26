import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';

import { ApiError } from '@/api/client';
import { Button, Text, TextField, useToast } from '@/ui';

import { peopleApi, type StudentRow } from './api';
import { Choice, Dialog, errorText, FilterButton } from './kit';

/** "Add student": the child, their class and one parent or guardian (who can then sign in to the parent app). */
export function AddStudentDialog({
  visible,
  classes,
  onClose,
  onDone,
}: {
  visible: boolean;
  classes: { id: string; label: string }[];
  onClose: () => void;
  onDone: (id: string) => void;
}) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const empty = {
    full_name: '',
    class_id: '',
    date_of_birth: '',
    gender: '',
    guardian_name: '',
    guardian_phone: '',
    relationship: 'father',
  };
  const [form, setForm] = useState(empty);
  const save = useMutation({
    mutationFn: () => peopleApi.addStudent(form),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t('console.people.add.done', { no: res.admission_no }));
      setForm(empty);
      onDone(res.id);
    },
  });
  const fields = save.error instanceof ApiError ? save.error : null;
  const err = (k: string) => fields?.fieldMessage(k);
  const set = (k: keyof typeof empty) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Dialog
      visible={visible}
      onClose={onClose}
      title={t('console.people.add.title')}
      subtitle={t('console.people.add.subtitle')}
      width={560}
      footer={
        <>
          <Button title={t('console.people.cancel')} variant="secondary" onPress={onClose} />
          <Button title={t('console.people.add.save')} icon="userPlus" loading={save.isPending} onPress={() => save.mutate()} />
        </>
      }>
      <TextField
        label={t('console.people.add.name')}
        value={form.full_name}
        onChangeText={set('full_name')}
        error={err('full_name')}
        autoFocus
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1, gap: 7 }}>
          <Text variant="xs" color="ink2" weight={600}>
            {t('console.people.add.class')}
          </Text>
          <FilterButton
            label={t('console.people.add.class')}
            allLabel={t('console.people.add.pickClass')}
            value={form.class_id}
            options={classes.map((c) => ({ value: c.id, label: c.label }))}
            onChange={set('class_id')}
          />
          {err('class_id') ? (
            <Text variant="xs" color="bad">
              {err('class_id')}
            </Text>
          ) : null}
        </View>
        <TextField
          label={t('console.people.add.dob')}
          placeholder="2015-03-14"
          value={form.date_of_birth}
          onChangeText={set('date_of_birth')}
          error={err('date_of_birth')}
          containerStyle={{ flex: 1 }}
        />
      </View>
      <Choice
        label={t('console.people.add.gender')}
        value={form.gender || 'unset'}
        options={[
          { value: 'female', label: t('console.people.add.female') },
          { value: 'male', label: t('console.people.add.male') },
          { value: 'other', label: t('console.people.add.other') },
        ]}
        onChange={set('gender')}
      />
      <Text variant="h4">{t('console.people.add.guardian')}</Text>
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TextField
          label={t('console.people.add.guardianName')}
          value={form.guardian_name}
          onChangeText={set('guardian_name')}
          error={err('guardian_name')}
          containerStyle={{ flex: 1 }}
        />
        <TextField
          label={t('console.people.add.phone')}
          prefix="+91"
          keyboardType="phone-pad"
          value={form.guardian_phone}
          onChangeText={set('guardian_phone')}
          error={err('guardian_phone')}
          containerStyle={{ flex: 1 }}
        />
      </View>
      <Choice
        label={t('console.people.add.relationship')}
        value={form.relationship}
        options={['father', 'mother', 'guardian'].map((r) => ({ value: r, label: t(`console.people.relationship.${r}`) }))}
        onChange={set('relationship')}
      />
      {save.error && !Object.keys(fields?.fields ?? {}).length ? (
        <Text variant="xs" color="bad">
          {errorText(save.error, t('console.people.failed'))}
        </Text>
      ) : null}
    </Dialog>
  );
}

/** Message the parents of one or more students. Each family gets its own chat with the principal. */
export function MessageParentsDialog({ students, onClose, onSent }: { students: StudentRow[]; onClose: () => void; onSent: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const qc = useQueryClient();
  const [body, setBody] = useState('');
  const send = useMutation({
    mutationFn: () =>
      peopleApi.messageParents(
        students.map((s) => s.id),
        body,
      ),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['console'] });
      toast(t('console.people.message.sent', { count: res.sent }));
      onSent();
    },
    onError: (e) => toast(errorText(e, t('console.people.failed')), 'danger'),
  });
  const to =
    students.length === 1
      ? (students[0].parent?.name ?? students[0].name)
      : t('console.people.message.families', { count: students.length });
  return (
    <Dialog
      visible
      onClose={onClose}
      title={t('console.people.message.title')}
      subtitle={t('console.people.message.to', { to })}
      footer={
        <>
          <Button title={t('console.people.cancel')} variant="secondary" onPress={onClose} />
          <Button
            title={t('console.people.message.send')}
            icon="send"
            loading={send.isPending}
            disabled={!body.trim()}
            onPress={() => send.mutate()}
          />
        </>
      }>
      <TextField
        label={t('console.people.message.body')}
        multiline
        value={body}
        onChangeText={setBody}
        autoFocus
        placeholder={t('console.people.message.placeholder')}
      />
      <Text variant="xs" color="muted">
        {t('console.people.message.note')}
      </Text>
    </Dialog>
  );
}
